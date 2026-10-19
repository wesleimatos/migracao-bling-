// Padrão do pdv-para-bling (src/main/bling/cliente.ts): fila, 350 ms entre chamadas, timeout de
// 30 s, nova tentativa no 429 e renovação do token. Aqui o limite diário do Bling para o envio.
import type { CredenciaisBling } from './credenciais.ts'
import { ErroAutorizacao, renovarToken, type Fetch, type Tokens } from './oauth.ts'

export const URL_API = 'https://api.bling.com.br/Api/v3'

/** Falha de rede ou do servidor do Bling: o envio para e continua depois de onde parou. */
export class ErroBlingRede extends Error {}
/** Acabaram as 120.000 chamadas do dia: o envio para e continua amanhã. */
export class ErroBlingLimiteDiario extends ErroBlingRede {}
/** Acesso perdido (refresh token vencido ou revogado): precisa conectar de novo. */
export class ErroBlingDesconectado extends Error {}
/** O Bling recusou o registro (validação etc.): fica anotado e o envio segue para o próximo. */
export class ErroBlingApi extends Error {
  readonly status: number
  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.status = status
  }
}

export type Consulta = Record<string, string | number | (string | number)[] | undefined>

export interface OpcoesCliente {
  fetch?: Fetch
  /** Intervalo mínimo entre chamadas (o limite do Bling é 3 por segundo). */
  intervaloMs?: number
  agora?: () => number
  esperar?: (ms: number) => Promise<void>
}

interface ErroResposta {
  error?: { type?: string; message?: string; description?: string; period?: string; fields?: { msg?: string; element?: string }[] }
  period?: string
}

const RENOVAR_ANTES_MS = 2 * 60 * 1000
const TENTATIVAS_429 = 4

export function montarConsulta(q: Consulta = {}): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)))
    else p.append(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

function mensagemDeErro(json: ErroResposta, status: number): string {
  const e = json.error
  const campos = (e?.fields ?? []).map((f) => [f.element, f.msg].filter(Boolean).join(': ')).filter(Boolean)
  return [e?.description || e?.message || `Erro ${status} no Bling`, ...campos].join(' — ')
}

export class BlingCliente {
  private readonly credenciais: CredenciaisBling
  private readonly f: Fetch
  private readonly intervaloMs: number
  private readonly agora: () => number
  private readonly esperar: (ms: number) => Promise<void>
  private ultimaRequisicao = 0
  private fila: Promise<unknown> = Promise.resolve()
  private renovando: Promise<Tokens> | null = null
  /** Quantas chamadas foram feitas (para o relatório e para estimar o tempo). */
  chamadas = 0

  constructor(credenciais: CredenciaisBling, opcoes: OpcoesCliente = {}) {
    this.credenciais = credenciais
    this.f = opcoes.fetch ?? fetch
    this.intervaloMs = opcoes.intervaloMs ?? 350
    this.agora = opcoes.agora ?? Date.now
    this.esperar = opcoes.esperar ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  }

  get conectado(): boolean {
    return this.credenciais.app() !== null && this.credenciais.tokens() !== null
  }

  get<T>(caminho: string, consulta?: Consulta): Promise<T> {
    return this.requisitar<T>('GET', caminho + montarConsulta(consulta))
  }

  post<T>(caminho: string, corpo?: unknown): Promise<T> {
    return this.requisitar<T>('POST', caminho, corpo)
  }

  patch<T>(caminho: string, corpo?: unknown): Promise<T> {
    return this.requisitar<T>('PATCH', caminho, corpo)
  }

  delete<T>(caminho: string): Promise<T> {
    return this.requisitar<T>('DELETE', caminho)
  }

  /** Todas as páginas de uma listagem (100 por página). */
  async listarTudo<T>(caminho: string, consulta: Consulta = {}): Promise<T[]> {
    const tudo: T[] = []
    for (let pagina = 1; ; pagina++) {
      const { data } = await this.get<{ data: T[] }>(caminho, { ...consulta, pagina, limite: 100 })
      tudo.push(...data)
      if (data.length < 100) return tudo
    }
  }

  /** Chamadas saem uma de cada vez, respeitando o intervalo. */
  private requisitar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const tarefa = this.fila.then(() => this.executar<T>(metodo, caminho, corpo))
    this.fila = tarefa.catch(() => undefined)
    return tarefa
  }

  private async executar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    let renovou = false
    for (let tentativa = 0; ; tentativa++) {
      const token = await this.tokenValido()
      const espera = this.ultimaRequisicao + this.intervaloMs - this.agora()
      if (espera > 0) await this.esperar(espera)
      this.ultimaRequisicao = this.agora()
      this.chamadas++

      let r: Response
      try {
        r = await this.f(URL_API + caminho, {
          method: metodo,
          headers: {
            Authorization: `Bearer ${token.acesso}`,
            Accept: 'application/json',
            ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {})
          },
          body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
          signal: AbortSignal.timeout(30_000)
        })
      } catch (e) {
        throw new ErroBlingRede(`Sem conexão com o Bling (${(e as Error).message}).`)
      }

      if (r.status === 401 && !renovou) {
        renovou = true
        await this.renovar(token)
        continue
      }
      const texto = await r.text()
      let json = {} as ErroResposta & T
      try {
        if (texto) json = JSON.parse(texto)
      } catch {
        // Página de erro em HTML (proxy do Bling fora do ar etc.): segue só com o status.
      }
      if (r.status === 429) {
        if ((json.error?.period ?? json.period) === 'day') throw new ErroBlingLimiteDiario('Acabou o limite de chamadas do dia no Bling (120.000). O envio continua amanhã.')
        if (tentativa < TENTATIVAS_429) {
          await this.esperar(1000 * 2 ** tentativa)
          continue
        }
        throw new ErroBlingRede('O Bling pediu para esperar (limite por segundo) e não liberou.')
      }
      if (r.status >= 500) throw new ErroBlingRede(`O Bling está fora do ar (HTTP ${r.status}).`)
      if (r.status === 401) throw new ErroBlingDesconectado('O Bling recusou o acesso. Conecte de novo na tela "Bling".')
      if (!r.ok) throw new ErroBlingApi(mensagemDeErro(json, r.status), r.status)
      return json as T
    }
  }

  private async tokenValido(): Promise<Tokens> {
    const t = this.credenciais.tokens()
    if (!t) throw new ErroBlingDesconectado('O app não está conectado ao Bling.')
    if (t.expiraEm - RENOVAR_ANTES_MS > this.agora()) return t
    return this.renovar(t)
  }

  /** Uma renovação por vez, mesmo com várias chamadas pedindo ao mesmo tempo. */
  private renovar(atual: Tokens): Promise<Tokens> {
    if (!this.renovando) {
      this.renovando = this.fazerRenovacao(atual).finally(() => {
        this.renovando = null
      })
    }
    return this.renovando
  }

  private async fazerRenovacao(atual: Tokens): Promise<Tokens> {
    const app = this.credenciais.app()
    if (!app) throw new ErroBlingDesconectado('O app não está conectado ao Bling.')
    try {
      const novos = await renovarToken(this.f, app.clientId, app.clientSecret, atual.renovacao, this.agora())
      this.credenciais.gravarTokens(novos)
      return novos
    } catch (e) {
      // 400/401: refresh token vencido ou revogado. 429/5xx/rede: tenta de novo mais tarde.
      if (e instanceof ErroAutorizacao && e.status !== undefined && e.status < 500 && e.status !== 429) {
        this.credenciais.limparTokens()
        throw new ErroBlingDesconectado('O acesso ao Bling venceu. Conecte de novo na tela "Bling".')
      }
      throw new ErroBlingRede(`Sem conexão com o Bling (${(e as Error).message}).`)
    }
  }
}
