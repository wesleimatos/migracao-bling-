import type { Planilha } from '../planilhas/ler.ts'
import type { IndiceFornecedores } from './fornecedores.ts'
import { anotador, type Mapa, type Problema, type Resultado } from './tipos.ts'
import { dataIso, digitos, numero } from './validar.ts'

/** Conta a pagar em aberto. Cada parcela do Superus é uma conta. */
export interface Conta {
  linha: number
  /** Chave do fornecedor (CPF/CNPJ). */
  fornecedor: string
  numeroDocumento: string
  dataEmissao: string | null
  vencimento: string
  valor: number
  historico: string
  /** Nomes do Superus; o Weslei liga cada um a uma categoria/forma do Bling na tela. */
  categoria: string
  formaPagamento: string
}

export function montarContas(p: Planilha, mapa: Mapa, fornecedores: IndiceFornecedores): Resultado<Conta> {
  const problemas: Problema[] = []
  const anota = anotador(problemas)
  const v = (l: Record<string, string>, campo: string) => (mapa[campo] ? (l[mapa[campo]] ?? '').trim() : '')
  const registros: Conta[] = []
  const vistas = new Map<string, number>()

  p.linhas.forEach((l, i) => {
    const linha = p.numeros[i]
    const documento = v(l, 'documento')
    const ref = documento || `linha ${linha}`
    const cod = v(l, 'codFornecedor')
    const doc = digitos(v(l, 'cnpjFornecedor'))
    const fornecedor = fornecedores.porCodigo.get(cod) ?? (doc ? fornecedores.porDocumento.get(doc) : undefined)
    if (!fornecedor) return anota.erro('fornecedor-inexistente', linha, ref, `Fornecedor ${cod || doc || '(vazio)'} não está na planilha de fornecedores.`)

    const valor = numero(v(l, 'valor'))
    if (!(valor > 0)) return anota.erro('valor-invalido', linha, ref, `Valor "${v(l, 'valor')}" zerado, negativo ou inválido.`)
    const vencimento = dataIso(v(l, 'vencimento'))
    if (!vencimento) return anota.erro('vencimento-invalido', linha, ref, `Vencimento "${v(l, 'vencimento')}" inválido.`)
    const emissaoTexto = v(l, 'emissao')
    const dataEmissao = emissaoTexto ? dataIso(emissaoTexto) : null
    if (emissaoTexto && !dataEmissao) anota.aviso('emissao-invalida', linha, ref, `Emissão "${emissaoTexto}" inválida: vai sem emissão.`)

    const parcela = v(l, 'parcela')
    const chave = `${fornecedor}|${documento}|${vencimento}|${parcela}|${valor}`
    const primeira = vistas.get(chave)
    if (primeira !== undefined) {
      return anota.erro('conta-repetida', linha, ref, `Igual à da linha ${primeira} (fornecedor, documento, parcela, vencimento e valor): só a primeira vai.`)
    }
    vistas.set(chave, linha)

    registros.push({
      linha,
      fornecedor,
      numeroDocumento: documento,
      dataEmissao,
      vencimento,
      valor,
      historico: [v(l, 'historico'), parcela ? `Parcela ${parcela}` : ''].filter(Boolean).join(' - '),
      categoria: v(l, 'categoria'),
      formaPagamento: v(l, 'formaPagamento')
    })
  })

  const somaPlanilha = p.linhas.reduce((s, l) => s + (numero(v(l, 'valor')) || 0), 0)
  return {
    registros,
    problemas,
    totais: [
      { rotulo: 'Linhas na planilha', valor: p.linhas.length },
      { rotulo: 'Soma de todas as linhas', valor: somaPlanilha, formato: 'reais' },
      { rotulo: 'Contas a criar no Bling', valor: registros.length },
      { rotulo: 'Soma das contas a criar', valor: registros.reduce((s, c) => s + c.valor, 0), formato: 'reais' },
      { rotulo: 'Categorias diferentes', valor: new Set(registros.map((c) => c.categoria).filter(Boolean)).size },
      { rotulo: 'Formas de pagamento diferentes', valor: new Set(registros.map((c) => c.formaPagamento).filter(Boolean)).size }
    ]
  }
}
