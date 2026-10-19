// Mesmo fluxo do pdv-para-bling (src/main/bling/oauth.ts); aqui o retorno vem para a rota
// /bling/callback do próprio app (https://migra.focosaas.com.br/bling/callback).

// Com "www", igual ao link de convite que o próprio Bling gera (evita redirecionamento no POST do token).
export const URL_AUTORIZAR = 'https://www.bling.com.br/Api/v3/oauth/authorize'
export const URL_TOKEN = 'https://www.bling.com.br/Api/v3/oauth/token'

export type Fetch = typeof fetch

export interface Tokens {
  acesso: string
  renovacao: string
  /** Epoch ms em que o token de acesso expira. */
  expiraEm: number
}

export class ErroAutorizacao extends Error {
  /** Status HTTP quando o Bling respondeu; ausente em erros locais. */
  readonly status?: number
  constructor(mensagem: string, status?: number) {
    super(mensagem)
    this.status = status
  }
}

export function urlAutorizacao(clientId: string, estado: string): string {
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, state: estado })
  return `${URL_AUTORIZAR}?${q}`
}

interface RespostaToken {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: { message?: string; description?: string }
  error_description?: string
}

async function pedirToken(f: Fetch, clientId: string, secret: string, corpo: Record<string, string>, agora: number): Promise<Tokens> {
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64')
  let r: Response
  try {
    r = await f(URL_TOKEN, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(corpo).toString(),
      signal: AbortSignal.timeout(30_000)
    })
  } catch (e) {
    throw new ErroAutorizacao(`Sem conexão com o Bling (${(e as Error).message}).`)
  }
  const json = (await r.json().catch(() => ({}))) as RespostaToken
  if (!r.ok || !json.access_token || !json.refresh_token) {
    const msg = json.error?.description || json.error?.message || json.error_description || `HTTP ${r.status}`
    throw new ErroAutorizacao(`O Bling recusou a autorização: ${msg}`, r.status)
  }
  return { acesso: json.access_token, renovacao: json.refresh_token, expiraEm: agora + (json.expires_in ?? 21600) * 1000 }
}

export function trocarCodigo(f: Fetch, clientId: string, secret: string, codigo: string, agora = Date.now()) {
  return pedirToken(f, clientId, secret, { grant_type: 'authorization_code', code: codigo }, agora)
}

export function renovarToken(f: Fetch, clientId: string, secret: string, renovacao: string, agora = Date.now()) {
  return pedirToken(f, clientId, secret, { grant_type: 'refresh_token', refresh_token: renovacao }, agora)
}

/** Código e state do endereço que o navegador mostra depois de autorizar (ou o código puro). */
export function extrairCodigo(texto: string): { codigo: string; estado: string | null } {
  const t = texto.trim()
  if (/^https?:\/\//i.test(t)) {
    const u = new URL(t)
    const codigo = u.searchParams.get('code')
    if (!codigo) throw new ErroAutorizacao('O endereço não tem o código de autorização (code=...).')
    return { codigo, estado: u.searchParams.get('state') }
  }
  if (!/^[\w-]{8,}$/.test(t)) throw new ErroAutorizacao('Código de autorização inválido.')
  return { codigo: t, estado: null }
}
