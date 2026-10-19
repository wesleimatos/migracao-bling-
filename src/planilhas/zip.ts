import { inflateRawSync } from 'node:zlib'

/** Erro de leitura do arquivo compactado (XLSX corrompido ou que não é XLSX). */
export class ErroZip extends Error {}

const ASSINATURA_FIM = 0x06054b50
const ASSINATURA_CENTRAL = 0x02014b50
const ASSINATURA_LOCAL = 0x04034b50

/** Lê todos os arquivos de um ZIP (o XLSX é um ZIP de XMLs). Só o que o XLSX usa: guardado ou deflate. */
export function lerZip(buf: Buffer): Map<string, Buffer> {
  const fim = acharFim(buf)
  const total = buf.readUInt16LE(fim + 10)
  let p = buf.readUInt32LE(fim + 16)
  const arquivos = new Map<string, Buffer>()
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== ASSINATURA_CENTRAL) throw new ErroZip('Índice do arquivo compactado danificado.')
    const metodo = buf.readUInt16LE(p + 10)
    const tamanho = buf.readUInt32LE(p + 20)
    const tamNome = buf.readUInt16LE(p + 28)
    const tamExtra = buf.readUInt16LE(p + 30)
    const tamComentario = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const nome = buf.toString('utf8', p + 46, p + 46 + tamNome)
    p += 46 + tamNome + tamExtra + tamComentario

    if (buf.readUInt32LE(local) !== ASSINATURA_LOCAL) throw new ErroZip(`Arquivo "${nome}" danificado.`)
    const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const dados = buf.subarray(inicio, inicio + tamanho)
    if (metodo === 0) arquivos.set(nome, dados)
    else if (metodo === 8) arquivos.set(nome, inflateRawSync(dados))
    else throw new ErroZip(`Compactação ${metodo} não suportada em "${nome}".`)
  }
  return arquivos
}

function acharFim(buf: Buffer): number {
  // O registro final fica nos últimos 22 bytes, mais um comentário de até 64 KB.
  const limite = Math.max(0, buf.length - 22 - 0xffff)
  for (let i = buf.length - 22; i >= limite; i--) {
    if (buf.readUInt32LE(i) === ASSINATURA_FIM) return i
  }
  throw new ErroZip('Não é um arquivo XLSX válido.')
}
