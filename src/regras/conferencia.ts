import type { Planilha } from '../planilhas/ler.ts'
import { type Campo, faltando } from './campos.ts'
import { montarCategorias } from './categorias.ts'
import { montarContas } from './contas.ts'
import { indiceFornecedores, montarFornecedores } from './fornecedores.ts'
import { montarProdutos } from './produtos.ts'
import type { Mapa, Resultado, Tipo } from './tipos.ts'
import { montarVinculos } from './vinculos.ts'

export interface Fonte {
  planilha: Planilha | null
  mapa: Mapa
}

export interface ConferenciaTipo {
  tipo: Tipo
  /** Campos obrigatórios sem coluna ligada (a conferência dessa planilha não roda). */
  faltando: Campo[]
  /** O que falta para conferir (ex.: outra planilha), em português. */
  pendencia: string | null
  resultado: Resultado<unknown> | null
}

/**
 * Confere todas as planilhas juntas, na ordem do envio: produtos precisam das categorias e dos
 * fornecedores; vínculos e contas precisam dos fornecedores.
 */
export function conferir(fontes: Record<Tipo, Fonte>): Record<Tipo, ConferenciaTipo> {
  const pronta = (t: Tipo) => fontes[t].planilha !== null && faltando(t, fontes[t].mapa).length === 0
  const base = (tipo: Tipo, pendencia: string | null = null): ConferenciaTipo => ({
    tipo,
    faltando: fontes[tipo].planilha ? faltando(tipo, fontes[tipo].mapa) : [],
    pendencia: fontes[tipo].planilha ? pendencia : 'Planilha ainda não enviada.',
    resultado: null
  })

  const categorias = base('categorias')
  if (pronta('categorias')) categorias.resultado = montarCategorias(fontes.categorias.planilha!, fontes.categorias.mapa)

  const fornecedores = base('fornecedores')
  const resForn = pronta('fornecedores') ? montarFornecedores(fontes.fornecedores.planilha!, fontes.fornecedores.mapa) : null
  fornecedores.resultado = resForn
  const indice = resForn ? indiceFornecedores(resForn.registros) : undefined

  const produtos = base('produtos')
  const resProd = pronta('produtos')
    ? montarProdutos(fontes.produtos.planilha!, fontes.produtos.mapa, {
        categorias: categorias.resultado ? new Set(categorias.resultado.registros.map((c) => (c as { chave: string }).chave)) : undefined,
        fornecedores: indice
      })
    : null
  produtos.resultado = resProd

  // Vínculos: a planilha 67 é opcional; sem ela, vale o fornecedor principal de cada produto.
  const vinculos: ConferenciaTipo = {
    tipo: 'vinculos',
    faltando: fontes.vinculos.planilha ? faltando('vinculos', fontes.vinculos.mapa) : [],
    pendencia: !resProd || !indice ? 'Precisa das planilhas de produtos e de fornecedores.' : null,
    resultado: null
  }
  if (resProd && indice && vinculos.faltando.length === 0) {
    vinculos.resultado = montarVinculos(fontes.vinculos.planilha, fontes.vinculos.mapa, resProd.registros, indice)
  }

  const contas = base('contas', indice ? null : 'Precisa da planilha de fornecedores.')
  if (pronta('contas') && indice) contas.resultado = montarContas(fontes.contas.planilha!, fontes.contas.mapa, indice)

  return { categorias, fornecedores, produtos, vinculos, contas }
}
