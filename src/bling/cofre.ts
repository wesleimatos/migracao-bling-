import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Cifra o Client Secret e os tokens do Bling antes de gravar no banco (AES-256-GCM).
 * A chave fica num arquivo separado na pasta de dados (chmod 600), fora do banco e do Git.
 */
export class Cofre {
  private readonly chave: Buffer

  constructor(pasta: string) {
    const arquivo = join(pasta, 'chave-cofre')
    if (!existsSync(arquivo)) writeFileSync(arquivo, randomBytes(32), { mode: 0o600 })
    this.chave = readFileSync(arquivo)
  }

  cifrar(texto: string): string {
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', this.chave, iv)
    const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()])
    return Buffer.concat([iv, c.getAuthTag(), dados]).toString('base64')
  }

  decifrar(cifrado: string): string {
    const b = Buffer.from(cifrado, 'base64')
    const d = createDecipheriv('aes-256-gcm', this.chave, b.subarray(0, 12))
    d.setAuthTag(b.subarray(12, 28))
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')
  }
}
