import type { Planilha } from '../planilhas/ler.ts'
import { anotador, type Mapa, type Problema, type Resultado } from './tipos.ts'

export const NIVEIS = ['setor', 'grupo', 'subgrupo', 'categoria'] as const

/** Uma categoria do Bling, vinda de um setor, grupo, subgrupo ou categoria do Superus. */
export interface Categoria {
  /** "nível:código" (o mesmo número pode existir em níveis diferentes). */
  chave: string
  nivel: number
  codigo: string
  descricao: string
  /** Chave da categoria-pai; null no setor. */
  pai: string | null
}

/** Chave da categoria pelo nível e código do Superus. */
export const chaveCategoria = (nivel: number, codigo: string): string => `${nivel}:${codigo}`

/** Código preenchido no Superus (0 quer dizer "sem"). */
export const temCodigo = (c: string): boolean => c !== '' && c !== '0'

/** Árvore do Superus (setor → grupo → subgrupo → categoria) virando categorias do Bling, pai antes do filho. */
export function montarCategorias(p: Planilha, mapa: Mapa): Resultado<Categoria> {
  const problemas: Problema[] = []
  const anota = anotador(problemas)
  const nos = new Map<string, Categoria & { linha: number }>()
  const v = (l: Record<string, string>, campo: string) => (mapa[campo] ? (l[mapa[campo]] ?? '').trim() : '')

  p.linhas.forEach((l, i) => {
    const linha = p.numeros[i]
    let pai: string | null = null
    NIVEIS.forEach((nome, nivel) => {
      const codigo = v(l, `cod${nome[0].toUpperCase()}${nome.slice(1)}`)
      if (!temCodigo(codigo)) return
      const chave = chaveCategoria(nivel, codigo)
      const descricao = v(l, nome)
      const existente = nos.get(chave)
      if (!descricao) {
        if (!existente) anota.erro('sem-nome', linha, codigo, `${nome} ${codigo} sem nome.`)
      } else if (existente && existente.descricao !== descricao) {
        anota.erro('nome-diferente', linha, codigo, `${nome} ${codigo} aparece como "${existente.descricao}" e "${descricao}".`)
      } else if (existente && existente.pai !== pai) {
        anota.erro('pai-diferente', linha, codigo, `${nome} ${codigo} aparece em dois lugares da árvore.`)
      } else if (!existente) {
        nos.set(chave, { chave, nivel, codigo, descricao, pai, linha })
      }
      pai = chave
    })
  })

  const registros = [...nos.values()]
    .sort((a, b) => a.nivel - b.nivel || a.descricao.localeCompare(b.descricao, 'pt-BR'))
    .map(({ linha: _, ...c }) => c)
  const porNivel = (n: number) => registros.filter((c) => c.nivel === n).length
  return {
    registros,
    problemas,
    totais: [
      { rotulo: 'Linhas na planilha', valor: p.linhas.length },
      { rotulo: 'Categorias a criar no Bling', valor: registros.length },
      ...['Setores', 'Grupos', 'Subgrupos', 'Categorias (4º nível)'].map((rotulo, i) => ({ rotulo, valor: porNivel(i) }))
    ]
  }
}
