import type { Lote } from '../../src/bling/envio.ts'
import { mapaPadrao } from '../../src/regras/campos.ts'
import { conferir, type Fonte } from '../../src/regras/conferencia.ts'
import { TIPOS, type Tipo } from '../../src/regras/tipos.ts'
import { cnpj, gtin, planilha } from './planilha.ts'

// Planilhas de exemplo com as mesmas colunas das consultas do Superus (dados inventados).

export const C1 = cnpj('123456780001')
export const C2 = cnpj('876543210001')
export const G1 = gtin('789100010010')
export const G2 = gtin('789100010011')

export const ARVORE = planilha([
  { COD_SETOR: '10', SETOR: 'PAPELARIA', COD_GRUPO: '20', GRUPO: 'ESCOLAR', COD_SUBGRUPO: '30', SUBGRUPO: 'CANETAS', COD_CATEGORIA: '40', CATEGORIA: 'GEL' },
  { COD_SETOR: '10', SETOR: 'PAPELARIA', COD_GRUPO: '20', GRUPO: 'ESCOLAR', COD_SUBGRUPO: '31', SUBGRUPO: 'LAPIS', COD_CATEGORIA: '', CATEGORIA: '' },
  { COD_SETOR: '11', SETOR: 'GERAL', COD_GRUPO: '', GRUPO: '', COD_SUBGRUPO: '', SUBGRUPO: '', COD_CATEGORIA: '', CATEGORIA: '' },
  // Mesmo número (20) em outro nível não pode se confundir com o grupo 20.
  { COD_SETOR: '20', SETOR: 'FESTA', COD_GRUPO: '0', GRUPO: '', COD_SUBGRUPO: '0', SUBGRUPO: '', COD_CATEGORIA: '0', CATEGORIA: '' }
])

const forn = (o: Record<string, string>) => ({
  CODIGO: '', RAZAO: '', NOME: '', CNPJ: '', CPF: '', IE: '', TIPOPESSOA: 'J', LOGRADOURO: '', ENDERECO: '', COMPLEMENTO: '',
  BAIRRO: '', CIDADE: '', ESTADO: 'MG', CEP: '', EMAIL: '', TODOS_TELEFONES: '', PRODUTOS_ATIVOS: '0', ...o
})
export const FORNECEDORES = planilha([
  forn({ CODIGO: '1', RAZAO: 'ALFA LTDA', NOME: 'ALFA', CNPJ: C1, IE: '0012345678901', LOGRADOURO: 'RUA A', ENDERECO: 'RUA A, 199-GALPAO 1', COMPLEMENTO: 'GALPAO 1', BAIRRO: 'CENTRO', CIDADE: 'BELO HORIZONTE', CEP: '30000-000', EMAIL: 'a@a.com', TODOS_TELEFONES: 'COMERCIAL  3133334444 / Comercial 31 99999-8888' }),
  forn({ CODIGO: '2', RAZAO: 'ALFA LTDA', NOME: 'ALFA', CNPJ: C1, LOGRADOURO: 'RUA A', ENDERECO: 'RUA A, SN-', PRODUTOS_ATIVOS: '5' }),
  forn({ CODIGO: '3', RAZAO: 'BETA ME', NOME: 'BETA', CNPJ: C2, IE: 'ISENTO', LOGRADOURO: 'AV B', ENDERECO: 'AV B, KM 66,5 - LADO A, SN', CIDADE: 'SAO PAULO', ESTADO: 'SP', TODOS_TELEFONES: '(11) 3333-444', PRODUTOS_ATIVOS: '1' }),
  forn({ CODIGO: '4', RAZAO: 'JOSE DA SILVA', CPF: '529.982.247-25', TIPOPESSOA: 'F' }),
  forn({ CODIGO: '5', RAZAO: 'ERRADO SA', CNPJ: '11.222.333/0001-82' })
])

const prod = (o: Record<string, string>) => ({
  CODPRODUTO: '', DESCRICAO: '', DESCRICAOWEB: '', INATIVO: 'N', EAN: '', TODOSEANS: '', PRECOVENDA: '10', CUSTO: '4', ESTOQUE: '0',
  NCM: '96081000', CEST: '', CSTICMS: '000', CODSETOR: '0', CODGRUPO: '0', CODSUBGRUPO: '0', CODCATEGORIA: '0', CODFORNECEDOR: '', SKUREFFORNECEDOR: '', ...o
})
export const PRODUTOS = planilha([
  prod({ CODPRODUTO: '100', DESCRICAO: 'CANETA GEL AZUL', EAN: G1, TODOSEANS: `${G1} / ${G2} / 100`, CSTICMS: '060', CEST: '1900100', CODSETOR: '10', CODGRUPO: '20', CODSUBGRUPO: '30', CODCATEGORIA: '40', ESTOQUE: '12', CODFORNECEDOR: '2', SKUREFFORNECEDOR: 'AL-1' }),
  prod({ CODPRODUTO: '101', DESCRICAO: 'LAPIS PRETO', EAN: '101', TODOSEANS: '101', CSTICMS: '090', CODSETOR: '10', CODGRUPO: '20', CODSUBGRUPO: '31', ESTOQUE: '-3', PRECOVENDA: '0' }),
  prod({ CODPRODUTO: '102', DESCRICAO: 'PRODUTO VELHO', INATIVO: 'S', EAN: '445566', CSTICMS: '100', NCM: '00000000', CODSETOR: '1', ESTOQUE: '2', CUSTO: '20', PRECOVENDA: '15', CODFORNECEDOR: '3' }),
  prod({ CODPRODUTO: '100', DESCRICAO: 'REPETIDO' })
])

const conta = (o: Record<string, string>) => ({
  CODFORNECEDOR: '', CNPJFORNECEDOR: '', DOCUMENTO: '', EMISSAO: '', VENCIMENTO: '', VALOR: '', PARCELA: '', HISTORICO: '', PLANOCONTAS: '', FORMAPAGAMENTO: '', ...o
})
export const CONTAS = planilha([
  conta({ CODFORNECEDOR: '1', DOCUMENTO: 'NF 10', EMISSAO: '01/10/2026', VENCIMENTO: '05/11/2026', VALOR: '1.500,00', PARCELA: '1/2', HISTORICO: 'COMPRA', PLANOCONTAS: 'MERCADORIAS', FORMAPAGAMENTO: 'BOLETO' }),
  conta({ CODFORNECEDOR: '1', DOCUMENTO: 'NF 10', VENCIMENTO: '05/12/2026', VALOR: '1500', PARCELA: '2/2', PLANOCONTAS: 'MERCADORIAS', FORMAPAGAMENTO: 'PIX' }),
  conta({ CNPJFORNECEDOR: C2, DOCUMENTO: 'NF 11', VENCIMENTO: '46331', VALOR: '99.9' }),
  conta({ CODFORNECEDOR: '1', DOCUMENTO: 'NF 10', VENCIMENTO: '05/12/2026', VALOR: '1500', PARCELA: '2/2' }),
  conta({ CODFORNECEDOR: '77', DOCUMENTO: 'NF 12', VENCIMENTO: '05/11/2026', VALOR: '10' }),
  conta({ CODFORNECEDOR: '3', DOCUMENTO: 'NF 13', VENCIMENTO: '31/02/2026', VALOR: '10' }),
  conta({ CODFORNECEDOR: '3', DOCUMENTO: 'NF 14', VENCIMENTO: '05/11/2026', VALOR: '0' })
])

/** Lote pronto para o envio, montado pela conferência a partir das planilhas de exemplo. */
export function loteExemplo(): Lote {
  const planilhas: Partial<Record<Tipo, ReturnType<typeof planilha>>> = { categorias: ARVORE, fornecedores: FORNECEDORES, produtos: PRODUTOS, contas: CONTAS }
  const fontes = Object.fromEntries(
    TIPOS.map((t) => [t, { planilha: planilhas[t] ?? null, mapa: planilhas[t] ? mapaPadrao(t, planilhas[t]!.colunas) : {} }])
  ) as Record<Tipo, Fonte>
  const c = conferir(fontes)
  return {
    categorias: c.categorias.resultado!.registros,
    fornecedores: c.fornecedores.resultado!.registros,
    produtos: c.produtos.resultado!.registros,
    vinculos: c.vinculos.resultado!.registros,
    contas: c.contas.resultado!.registros
  } as Lote
}
