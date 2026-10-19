import { ErroZip, lerZip } from './zip.ts'

/** Primeira aba do XLSX como linhas de texto (uma célula por posição; vazias viram ''). */
export function lerXlsx(buf: Buffer): string[][] {
  const zip = lerZip(buf)
  const texto = (nome: string) => zip.get(nome)?.toString('utf8')
  const caminho = caminhoPrimeiraAba(texto)
  const aba = texto(caminho)
  if (aba === undefined) throw new ErroZip(`Aba não encontrada no XLSX (${caminho}).`)
  const compartilhados = textosCompartilhados(texto('xl/sharedStrings.xml') ?? '')
  return linhasDaAba(aba, compartilhados)
}

function caminhoPrimeiraAba(texto: (nome: string) => string | undefined): string {
  const livro = texto('xl/workbook.xml')
  const rels = texto('xl/_rels/workbook.xml.rels')
  const id = livro && /<sheet\b[^>]*\br:id="([^"]+)"/.exec(livro)?.[1]
  if (id && rels) {
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      if (atributo(m[0], 'Id') !== id) continue
      const alvo = atributo(m[0], 'Target') ?? ''
      return alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo}`
    }
  }
  return 'xl/worksheets/sheet1.xml'
}

function textosCompartilhados(xml: string): string[] {
  const lista: string[] = []
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    // Texto com formatação vem em pedaços (<r><t>); a leitura fonética (<rPh>) não faz parte do texto.
    const corpo = m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
    lista.push([...corpo.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificar(t[1])).join(''))
  }
  return lista
}

function linhasDaAba(xml: string, compartilhados: string[]): string[][] {
  const linhas: string[][] = []
  for (const linha of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const numero = Number(atributo(linha[1], 'r') ?? linhas.length + 1)
    const celulas: string[] = []
    let proxima = 0
    for (const c of (linha[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atributo(c[1], 'r')
      const col = ref ? coluna(ref) : proxima
      celulas[col] = valor(atributo(c[1], 't'), c[2] ?? '', compartilhados)
      proxima = col + 1
    }
    while (linhas.length < numero - 1) linhas.push([])
    linhas.push(Array.from(celulas, (v) => v ?? ''))
  }
  return linhas
}

function valor(tipo: string | undefined, corpo: string, compartilhados: string[]): string {
  if (tipo === 'inlineStr') {
    return [...corpo.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificar(t[1])).join('').trim()
  }
  const v = /<v>([\s\S]*?)<\/v>/.exec(corpo)?.[1]
  if (v === undefined) return ''
  if (tipo === 's') return (compartilhados[Number(v)] ?? '').trim()
  if (tipo === 'str' || tipo === 'e' || tipo === 'b') return decodificar(v).trim()
  return numeroLimpo(v)
}

/** Número como o Excel mostraria: sem notação científica e sem resto de ponto flutuante (1.6500000000000001 → 1.65). */
export function numeroLimpo(v: string): string {
  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)) return v.trim()
  const n = Number(v)
  if (Number.isInteger(n)) return Number.isSafeInteger(n) ? String(n) : BigInt(Math.round(n)).toString()
  return String(Number(n.toFixed(10)))
}

/** Índice da coluna a partir da referência da célula ("A1" → 0, "AB12" → 27). */
function coluna(ref: string): number {
  let n = 0
  for (const ch of ref) {
    const c = ch.charCodeAt(0)
    if (c < 65 || c > 90) break
    n = n * 26 + (c - 64)
  }
  return n - 1
}

function atributo(tag: string, nome: string): string | undefined {
  return new RegExp(`\\b${nome}="([^"]*)"`).exec(tag)?.[1]
}

function decodificar(s: string): string {
  return s
    .replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (_, e: string) => {
      if (e === 'lt') return '<'
      if (e === 'gt') return '>'
      if (e === 'amp') return '&'
      if (e === 'quot') return '"'
      if (e === 'apos') return "'"
      return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
    })
    .replace(/_x([0-9a-fA-F]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
}
