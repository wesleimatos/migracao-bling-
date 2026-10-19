import type { Planilha } from '../planilhas/ler.ts'
import type { IndiceFornecedores } from './fornecedores.ts'
import type { Produto } from './produtos.ts'
import { anotador, type Mapa, type Problema, type Resultado } from './tipos.ts'
import { numero } from './validar.ts'

/** Ligação produto × fornecedor no Bling (código do produto no fornecedor e custo). */
export interface Vinculo {
  produto: string
  /** Chave do fornecedor (CPF/CNPJ), já juntando cadastros repetidos. */
  fornecedor: string
  codigoNoFornecedor: string
  precoCusto: number
  /** Fornecedor principal do produto no Superus. */
  padrao: boolean
  linha: number
}

/**
 * Da planilha 67, quando vier; sem ela, do fornecedor principal do cadastro de produtos.
 * O mesmo par produto × fornecedor só vai uma vez.
 */
export function montarVinculos(
  p: Planilha | null,
  mapa: Mapa,
  produtos: Produto[],
  fornecedores: IndiceFornecedores
): Resultado<Vinculo> {
  const problemas: Problema[] = []
  const anota = anotador(problemas)
  const porCodigo = new Map(produtos.map((x) => [x.codigo, x]))
  const pares = new Map<string, Vinculo>()
  const incluir = (vin: Vinculo) => {
    const k = `${vin.produto}|${vin.fornecedor}`
    if (!pares.has(k)) pares.set(k, vin)
  }

  if (p) {
    const v = (l: Record<string, string>, campo: string) => (mapa[campo] ? (l[mapa[campo]] ?? '').trim() : '')
    p.linhas.forEach((l, i) => {
      const linha = p.numeros[i]
      const cp = v(l, 'codProduto')
      const cf = v(l, 'codFornecedor')
      const produto = porCodigo.get(cp)
      const fornecedor = fornecedores.porCodigo.get(cf)
      if (!produto) return anota.erro('produto-inexistente', linha, cp, `Produto ${cp} não está na planilha de produtos.`)
      if (!fornecedor) return anota.erro('fornecedor-inexistente', linha, cp, `Fornecedor ${cf} não está na planilha de fornecedores.`)
      const custo = numero(v(l, 'custo'))
      incluir({
        produto: cp,
        fornecedor,
        codigoNoFornecedor: v(l, 'codNoFornecedor'),
        precoCusto: v(l, 'custo') === '' || Number.isNaN(custo) ? produto.custo : custo,
        padrao: produto.fornecedor !== null && fornecedores.porCodigo.get(produto.fornecedor.codigo) === fornecedor,
        linha
      })
    })
  }
  // O fornecedor principal do produto sempre entra (mesmo que a planilha 67 não traga).
  for (const x of produtos) {
    const fornecedor = x.fornecedor && fornecedores.porCodigo.get(x.fornecedor.codigo)
    if (!fornecedor) continue
    incluir({ produto: x.codigo, fornecedor, codigoNoFornecedor: x.fornecedor!.codNoFornecedor, precoCusto: x.custo, padrao: true, linha: x.linha })
  }

  const registros = [...pares.values()]
  return {
    registros,
    problemas,
    totais: [
      { rotulo: 'Linhas na planilha', valor: p?.linhas.length ?? 0 },
      { rotulo: 'Ligações a criar no Bling', valor: registros.length },
      { rotulo: 'Produtos com fornecedor', valor: new Set(registros.map((x) => x.produto)).size }
    ]
  }
}
