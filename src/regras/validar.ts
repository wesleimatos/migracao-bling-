/** Só os dígitos do texto. */
export const digitos = (s: string): string => s.replace(/\D/g, '')

export function cnpjValido(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = pesos.reduce((s, p, i) => s + p * Number(base[i]), 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13])
}

export function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false
  for (const n of [9, 10]) {
    const s = [...d.slice(0, n)].reduce((a, x, i) => a + Number(x) * (n + 1 - i), 0)
    if (((s * 10) % 11) % 10 !== Number(d[n])) return false
  }
  return true
}

/** GTIN-8, 12, 13 ou 14 com dígito verificador certo. */
export function gtinValido(d: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(d)) return false
  const corpo = d.slice(0, -1)
  const soma = [...corpo].reverse().reduce((s, x, i) => s + Number(x) * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (soma % 10)) % 10 === Number(d.at(-1))
}

/**
 * Número de planilha: "1234.56" (XLSX), "1.234,56" ou "1234,56" (CSV brasileiro).
 * Vazio vira 0; texto que não é número vira NaN.
 */
export function numero(s: string): number {
  const t = s.trim().replace(/^R\$\s*/, '')
  if (t === '') return 0
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(normal) ? Number(normal) : NaN
}

/**
 * Data no formato do Bling (AAAA-MM-DD). Aceita DD/MM/AAAA, DD/MM/AA, AAAA-MM-DD (com ou sem hora)
 * e o número de série do Excel. Data que não existe (31/02) vira null.
 */
export function dataIso(s: string): string | null {
  const t = s.trim()
  let a: number, m: number, d: number
  let r: RegExpExecArray | null
  if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(\s.*)?$/.exec(t))) {
    ;[d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])]
    if (a < 100) a += 2000
  } else if ((r = /^(\d{4})-(\d{2})-(\d{2})([ T].*)?$/.exec(t))) {
    ;[a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])]
  } else if (/^\d{5}(\.\d+)?$/.test(t) && Number(t) > 20000 && Number(t) < 80000) {
    // Série do Excel: dias desde 30/12/1899.
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86_400_000)
    return dt.toISOString().slice(0, 10)
  } else return null
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

/** Tamanho da inscrição estadual (só dígitos) em cada UF. */
export const TAMANHO_IE: Record<string, number[]> = {
  AC: [13], AL: [9], AP: [9], AM: [9], BA: [8, 9], CE: [9], DF: [13], ES: [9], GO: [9], MA: [9],
  MT: [11], MS: [9], MG: [13], PA: [9], PB: [9], PR: [10], PE: [9, 14], PI: [9], RJ: [8], RN: [9, 10],
  RS: [10], RO: [9, 14], RR: [9], SC: [9], SP: [12], SE: [9], TO: [9, 11]
}
