import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Banco } from './banco.ts'

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000
const MAX_TENTATIVAS = 5
export const TAMANHO_MINIMO_SENHA = 10

/** Senha guardada com scrypt: "scrypt$N$r$p$sal$hash" (sal e hash em base64). */
export function hashSenha(senha: string): string {
  const sal = randomBytes(16)
  const hash = scryptSync(senha, sal, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$16384$8$1$${sal.toString('base64')}$${hash.toString('base64')}`
}

export function conferirSenha(senha: string, guardada: string): boolean {
  const [alg, n, r, p, sal, hash] = guardada.split('$')
  if (alg !== 'scrypt') return false
  const esperado = Buffer.from(hash, 'base64')
  const obtido = scryptSync(senha, Buffer.from(sal, 'base64'), esperado.length, { N: Number(n), r: Number(r), p: Number(p) })
  return timingSafeEqual(esperado, obtido)
}

const resumo = (token: string) => createHash('sha256').update(token).digest('hex')

/** Login de um usuário só (o Weslei): senha criada no primeiro acesso, sessões e limite de tentativas. */
export class Acesso {
  private readonly banco: Banco
  private readonly agora: () => number

  constructor(banco: Banco, agora: () => number = Date.now) {
    this.banco = banco
    this.agora = agora
  }

  get temSenha(): boolean {
    return this.banco.db.prepare('SELECT 1 FROM usuario WHERE id = 1').get() !== undefined
  }

  criarSenha(senha: string): void {
    if (this.temSenha) throw new Error('A senha já foi criada.')
    if (senha.length < TAMANHO_MINIMO_SENHA) throw new Error(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`)
    this.banco.db.prepare('INSERT INTO usuario (id, senha) VALUES (1, ?)').run(hashSenha(senha))
  }

  /** Confere a senha, contando as erradas por IP. Devolve o token da sessão ou null. */
  entrar(senha: string, ip: string): string | null {
    if (this.bloqueado(ip)) return null
    const r = this.banco.db.prepare('SELECT senha FROM usuario WHERE id = 1').get() as { senha: string } | undefined
    if (!r || !conferirSenha(senha, r.senha)) {
      this.banco.db.prepare('INSERT INTO tentativas (ip, quando) VALUES (?, ?)').run(ip, this.agora())
      return null
    }
    this.banco.db.prepare('DELETE FROM tentativas WHERE ip = ?').run(ip)
    const token = randomBytes(32).toString('base64url')
    this.banco.db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(this.agora())
    this.banco.db.prepare('INSERT INTO sessoes (token, expira_em) VALUES (?, ?)').run(resumo(token), this.agora() + DURACAO_SESSAO_MS)
    return token
  }

  bloqueado(ip: string): boolean {
    const r = this.banco.db
      .prepare('SELECT COUNT(*) AS n FROM tentativas WHERE ip = ? AND quando > ?')
      .get(ip, this.agora() - JANELA_TENTATIVAS_MS) as { n: number }
    return r.n >= MAX_TENTATIVAS
  }

  valida(token: string | undefined): boolean {
    if (!token) return false
    const r = this.banco.db.prepare('SELECT expira_em FROM sessoes WHERE token = ?').get(resumo(token)) as { expira_em: number } | undefined
    return r !== undefined && r.expira_em > this.agora()
  }

  sair(token: string | undefined): void {
    if (token) this.banco.db.prepare('DELETE FROM sessoes WHERE token = ?').run(resumo(token))
  }
}

export function lerCookies(req: IncomingMessage): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const i = parte.indexOf('=')
    if (i > 0) cookies[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim())
  }
  return cookies
}

/** Atrás do proxy da VPS (CONFIAR_PROXY=1), o IP e o protocolo vêm dos cabeçalhos X-Forwarded-*. */
export function origemDaRequisicao(req: IncomingMessage, confiarProxy: boolean) {
  const cab = (nome: string) => String(req.headers[nome] ?? '').split(',')[0].trim()
  return {
    ip: (confiarProxy && cab('x-forwarded-for')) || req.socket.remoteAddress || '',
    https: confiarProxy && cab('x-forwarded-proto') === 'https',
    host: (confiarProxy && cab('x-forwarded-host')) || String(req.headers.host ?? '')
  }
}
