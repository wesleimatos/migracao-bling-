import { crc32, deflateRawSync } from 'node:zlib'
import type { Planilha } from '../../src/planilhas/ler.ts'

/** Planilha já lida, para testar as regras sem passar por arquivo. */
export function planilha(linhas: Record<string, string>[], colunas = Object.keys(linhas[0] ?? {})): Planilha {
  return {
    colunas,
    linhas: linhas.map((l) => Object.fromEntries(colunas.map((c) => [c, l[c] ?? '']))),
    numeros: linhas.map((_, i) => i + 2)
  }
}

/** ZIP mínimo (guardado ou deflate), só para montar XLSX de teste. */
export function zip(arquivos: Record<string, string>, comprimir = true): Buffer {
  const locais: Buffer[] = []
  const centrais: Buffer[] = []
  let offset = 0
  for (const [nome, texto] of Object.entries(arquivos)) {
    const bruto = Buffer.from(texto, 'utf8')
    const dados = comprimir ? deflateRawSync(bruto) : bruto
    const nomeBuf = Buffer.from(nome, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(comprimir ? 8 : 0, 8)
    local.writeUInt32LE(crc32(bruto), 14)
    local.writeUInt32LE(dados.length, 18)
    local.writeUInt32LE(bruto.length, 22)
    local.writeUInt16LE(nomeBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(comprimir ? 8 : 0, 10)
    central.writeUInt32LE(crc32(bruto), 16)
    central.writeUInt32LE(dados.length, 20)
    central.writeUInt32LE(bruto.length, 24)
    central.writeUInt16LE(nomeBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    locais.push(local, nomeBuf, dados)
    centrais.push(central, nomeBuf)
    offset += 30 + nomeBuf.length + dados.length
  }
  const tamCentral = centrais.reduce((s, b) => s + b.length, 0)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(Object.keys(arquivos).length, 8)
  fim.writeUInt16LE(Object.keys(arquivos).length, 10)
  fim.writeUInt32LE(tamCentral, 12)
  fim.writeUInt32LE(offset, 16)
  return Buffer.concat([...locais, ...centrais, fim])
}

/** Célula de teste: texto vai como texto compartilhado; number como número; { inline } como texto embutido. */
export type Celula = string | number | { inline: string } | null

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** XLSX de uma aba, no formato que o Excel e as consultas do Superus geram. */
export function xlsx(linhas: Celula[][], comprimir = true): Buffer {
  const compartilhados: string[] = []
  const letra = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : letra(Math.floor(i / 26) - 1) + letra(i % 26))
  const corpo = linhas
    .map((linha, r) => {
      const celulas = linha
        .map((v, c) => {
          const ref = `${letra(c)}${r + 1}`
          if (v === null) return ''
          if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`
          if (typeof v === 'object') return `<c r="${ref}" t="inlineStr"><is><t>${xmlEsc(v.inline)}</t></is></c>`
          compartilhados.push(v)
          return `<c r="${ref}" t="s"><v>${compartilhados.length - 1}</v></c>`
        })
        .join('')
      return `<row r="${r + 1}">${celulas}</row>`
    })
    .join('')
  return zip(
    {
      '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      'xl/workbook.xml':
        '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Aba" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':
        '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/sharedStrings.xml': `<?xml version="1.0"?><sst>${compartilhados.map((s) => `<si><t>${xmlEsc(s)}</t></si>`).join('')}</sst>`,
      'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet><sheetData>${corpo}</sheetData></worksheet>`
    },
    comprimir
  )
}

/** CNPJ válido a partir de 12 dígitos (para fornecedores de teste). */
export function cnpj(base: string): string {
  const dv = (b: string) => {
    const pesos = b.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = pesos.reduce((s, p, i) => s + p * Number(b[i]), 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  const d13 = base + dv(base)
  return d13 + dv(d13)
}

/** GTIN-13 válido a partir de 12 dígitos. */
export function gtin(base: string): string {
  const soma = [...base].reverse().reduce((s, x, i) => s + Number(x) * (i % 2 === 0 ? 3 : 1), 0)
  return base + ((10 - (soma % 10)) % 10)
}
