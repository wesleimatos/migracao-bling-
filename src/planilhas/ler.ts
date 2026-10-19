import { lerCsv } from './csv.ts'
import { lerXlsx } from './xlsx.ts'

/** Uma planilha lida: o cabeçalho e as linhas como objetos coluna → texto. */
export interface Planilha {
  colunas: string[]
  linhas: Record<string, string>[]
  /** Número da linha na planilha original (para o Weslei achar no Excel). */
  numeros: number[]
}

/** Lê XLSX ou CSV (pelo conteúdo, não pelo nome). A primeira linha preenchida é o cabeçalho. */
export function lerPlanilha(buf: Buffer): Planilha {
  const ehXlsx = buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50
  const brutas = ehXlsx ? lerXlsx(buf) : lerCsv(buf)
  const vazia = (l: string[]) => l.every((v) => v === '')
  const iCab = brutas.findIndex((l) => !vazia(l))
  if (iCab < 0) return { colunas: [], linhas: [], numeros: [] }

  const colunas: string[] = []
  for (const nome of brutas[iCab]) {
    let n = nome || `COLUNA ${colunas.length + 1}`
    for (let k = 2; colunas.includes(n); k++) n = `${nome} (${k})`
    colunas.push(n)
  }
  const linhas: Record<string, string>[] = []
  const numeros: number[] = []
  brutas.slice(iCab + 1).forEach((l, i) => {
    if (vazia(l)) return
    linhas.push(Object.fromEntries(colunas.map((c, j) => [c, l[j] ?? ''])))
    numeros.push(iCab + i + 2)
  })
  return { colunas, linhas, numeros }
}
