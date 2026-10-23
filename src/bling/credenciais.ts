import type { Banco } from '../banco.ts'
import type { Cofre } from './cofre.ts'
import type { Tokens } from './oauth.ts'

/** Client ID do app novo na central do Bling (não é segredo; o Weslei passou em 23/10/2026, depois de excluir o app de 19/10). */
export const CLIENT_ID_PADRAO = 'f926deb48f139e78e616726cc453c358af3d5307'

/** App (Client ID e Secret) e tokens do Bling no banco, com o Secret e os tokens cifrados. */
export class CredenciaisBling {
  private readonly banco: Banco
  private readonly cofre: Cofre

  constructor(banco: Banco, cofre: Cofre) {
    this.banco = banco
    this.cofre = cofre
  }

  get clientId(): string {
    return this.banco.lerConfig('bling.clientId') ?? CLIENT_ID_PADRAO
  }

  get temSecret(): boolean {
    return this.banco.lerConfig('bling.clientSecret') !== null
  }

  app(): { clientId: string; clientSecret: string } | null {
    const secret = this.banco.lerConfig('bling.clientSecret')
    return secret ? { clientId: this.clientId, clientSecret: this.cofre.decifrar(secret) } : null
  }

  /** Trocar o app desconecta (os tokens são do app antigo). Secret em branco mantém o atual. */
  gravarApp(clientId: string, clientSecret: string): void {
    this.banco.gravarConfig('bling.clientId', clientId.trim())
    if (clientSecret.trim()) this.banco.gravarConfig('bling.clientSecret', this.cofre.cifrar(clientSecret.trim()))
    this.limparTokens()
  }

  tokens(): Tokens | null {
    const c = this.banco.lerConfig('bling.tokens')
    if (!c) return null
    try {
      return JSON.parse(this.cofre.decifrar(c)) as Tokens
    } catch {
      return null
    }
  }

  gravarTokens(t: Tokens): void {
    this.banco.gravarConfig('bling.tokens', this.cofre.cifrar(JSON.stringify(t)))
  }

  limparTokens(): void {
    this.banco.gravarConfig('bling.tokens', null)
  }
}
