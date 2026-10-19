import type { Categoria } from '../regras/categorias.ts'
import type { Conta } from '../regras/contas.ts'
import type { Fornecedor } from '../regras/fornecedores.ts'
import { PADRAO_PRODUTO, type Produto } from '../regras/produtos.ts'
import type { Vinculo } from '../regras/vinculos.ts'

/** No envio de teste, tudo o que é criado no Bling leva esta marca (para conferir e apagar depois). */
export const MARCA_TESTE = 'TESTE'

/** Tira campos vazios: o Bling valida "" como valor (e-mail vazio é inválido, por exemplo). */
export function limpo<T>(v: T): T {
  if (Array.isArray(v)) return v.map(limpo) as T
  if (v && typeof v === 'object') {
    const saida: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) {
      const y = limpo(x)
      if (y === '' || y === null || y === undefined) continue
      if (typeof y === 'object' && !Array.isArray(y) && Object.keys(y as object).length === 0) continue
      saida[k] = y
    }
    return saida as T
  }
  return v
}

const nomeTeste = (teste: boolean, nome: string) => (teste ? `${MARCA_TESTE} - ${nome}` : nome)
const codigoTeste = (teste: boolean, codigo: string) => (teste ? `${MARCA_TESTE}-${codigo}` : codigo)

export function payloadCategoria(c: Categoria, idPai: number | null, teste: boolean) {
  return limpo({ descricao: nomeTeste(teste, c.descricao), categoriaPai: idPai ? { id: idPai } : null })
}

export function payloadFornecedor(f: Fornecedor, idTipoFornecedor: number | null, teste: boolean, comIe = true) {
  return limpo({
    nome: nomeTeste(teste, f.nome),
    codigo: codigoTeste(teste, f.codigo),
    situacao: 'A',
    tipo: f.tipo,
    numeroDocumento: f.numeroDocumento,
    fantasia: f.fantasia,
    ie: comIe ? f.ie : '',
    indicadorIe: comIe ? f.indicadorIe : null,
    email: f.email,
    telefone: f.telefone,
    celular: f.celular,
    endereco: { geral: f.endereco },
    tiposContato: idTipoFornecedor ? [{ id: idTipoFornecedor }] : null
  })
}

export function payloadProduto(p: Produto, ids: { categoria: number | null; grupo: number | null }, teste: boolean) {
  return limpo({
    nome: nomeTeste(teste, p.nome),
    codigo: codigoTeste(teste, p.codigo),
    preco: p.preco,
    ...PADRAO_PRODUTO,
    situacao: p.situacao,
    gtin: p.gtin,
    descricaoCurta: p.descricaoCurta,
    observacoes: p.observacoes,
    categoria: ids.categoria ? { id: ids.categoria } : null,
    tributacao: {
      origem: p.origem,
      ncm: p.ncm,
      cest: p.cest,
      // Tipo do item (SPED) "00" = Mercadoria para Revenda (pedido do Weslei no envio de teste).
      spedTipoItem: '00',
      grupoProduto: ids.grupo ? { id: ids.grupo } : null
    }
  })
}

export function payloadVinculo(v: Vinculo, idProduto: number, idFornecedor: number) {
  return limpo({
    produto: { id: idProduto },
    fornecedor: { id: idFornecedor },
    codigo: v.codigoNoFornecedor,
    precoCusto: v.precoCusto,
    padrao: v.padrao
  })
}

/** Balanço: define o saldo do produto no depósito (repetir não soma). */
export function payloadEstoque(p: Produto, idProduto: number, idDeposito: number) {
  return limpo({
    produto: { id: idProduto },
    deposito: { id: idDeposito },
    operacao: 'B',
    quantidade: p.estoque,
    custo: p.custo,
    observacoes: 'Saldo inicial: migração do Superus'
  })
}

export function payloadConta(c: Conta, ids: { contato: number; categoria: number | null; forma: number | null }, teste: boolean) {
  return limpo({
    situacao: 1,
    vencimento: c.vencimento,
    vencimentoOriginal: c.vencimento,
    valor: c.valor,
    contato: { id: ids.contato },
    dataEmissao: c.dataEmissao,
    competencia: c.dataEmissao ?? c.vencimento,
    numeroDocumento: c.numeroDocumento,
    historico: teste ? nomeTeste(true, c.historico || 'conta a pagar') : c.historico,
    categoria: ids.categoria ? { id: ids.categoria } : null,
    formaPagamento: ids.forma ? { id: ids.forma } : null
  })
}
