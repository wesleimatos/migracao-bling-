/** CSV como linhas de texto. Aceita UTF-8 (com ou sem BOM) e ANSI/Windows-1252; separador ; , ou tab. */
export function lerCsv(buf: Buffer): string[][] {
  const texto = decodificar(buf)
  const sep = separador(texto)
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else if (ch === '"') aspas = false
      else campo += ch
    } else if (ch === '"' && campo === '') aspas = true
    else if (ch === sep) {
      linha.push(campo.trim())
      campo = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo.trim())
      linhas.push(linha)
      linha = []
      campo = ''
    } else campo += ch
  }
  if (campo !== '' || linha.length) {
    linha.push(campo.trim())
    linhas.push(linha)
  }
  return linhas
}

export function decodificar(buf: Buffer): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.toString('utf8', 3)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

/** O separador que mais aparece na primeira linha, fora de aspas. */
function separador(texto: string): string {
  const fim = texto.search(/\r|\n/)
  const primeira = (fim < 0 ? texto : texto.slice(0, fim)).replace(/"[^"]*"/g, '')
  const contar = (s: string) => primeira.split(s).length - 1
  return [';', ',', '\t'].reduce((melhor, s) => (contar(s) > contar(melhor) ? s : melhor))
}
