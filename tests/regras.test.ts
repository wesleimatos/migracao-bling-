import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapaPadrao } from '../src/regras/campos.ts'
import { montarCategorias } from '../src/regras/categorias.ts'
import { conferir, type Fonte } from '../src/regras/conferencia.ts'
import { montarContas } from '../src/regras/contas.ts'
import { indiceFornecedores, montarFornecedores, numeroEndereco, separarTelefones } from '../src/regras/fornecedores.ts'
import { montarProdutos } from '../src/regras/produtos.ts'
import type { Problema, Tipo } from '../src/regras/tipos.ts'
import { montarVinculos } from '../src/regras/vinculos.ts'
import { ARVORE, C1, C2, FORNECEDORES, G1, G2, PRODUTOS } from './util/exemplos.ts'
import { planilha } from './util/planilha.ts'

const regras = (ps: Problema[]) => ps.map((p) => `${p.nivel}:${p.regra}:${p.codigo}`).sort()
const total = (totais: { rotulo: string; valor: number }[], rotulo: string) => totais.find((t) => t.rotulo === rotulo)?.valor

describe('categorias', () => {
  it('monta a árvore com pai antes do filho e chave por nível', () => {
    const r = montarCategorias(ARVORE, mapaPadrao('categorias', ARVORE.colunas))
    assert.deepEqual(
      r.registros.map((c) => [c.chave, c.descricao, c.pai]),
      [
        ['0:20', 'FESTA', null],
        ['0:11', 'GERAL', null],
        ['0:10', 'PAPELARIA', null],
        ['1:20', 'ESCOLAR', '0:10'],
        ['2:30', 'CANETAS', '1:20'],
        ['2:31', 'LAPIS', '1:20'],
        ['3:40', 'GEL', '2:30']
      ]
    )
    assert.deepEqual(r.problemas, [])
    assert.equal(total(r.totais, 'Categorias a criar no Bling'), 7)
  })

  it('acusa o mesmo código com nomes diferentes', () => {
    const p = planilha([
      { COD_SETOR: '1', SETOR: 'CASA' },
      { COD_SETOR: '1', SETOR: 'LAR' }
    ])
    const r = montarCategorias(p, mapaPadrao('categorias', p.colunas))
    assert.deepEqual(regras(r.problemas), ['erro:nome-diferente:1'])
    assert.equal(r.registros.length, 1)
  })
})

describe('fornecedores', () => {
  const r = montarFornecedores(FORNECEDORES, mapaPadrao('fornecedores', FORNECEDORES.colunas))
  const porCodigo = (c: string) => r.registros.find((f) => f.codigos.includes(c))!

  it('junta CNPJ repetido: fica o cadastro com mais produtos, com todos os códigos', () => {
    const alfa = porCodigo('1')
    assert.equal(alfa.codigo, '2')
    assert.deepEqual(alfa.codigos, ['2', '1'])
    assert.equal(r.registros.length, 3)
    assert.equal(total(r.totais, 'Cadastros juntados por CPF/CNPJ repetido'), 1)
  })

  it('documento inválido não vai; CPF vira pessoa física', () => {
    assert.ok(!r.registros.some((f) => f.codigos.includes('5')))
    assert.equal(porCodigo('4').tipo, 'F')
    assert.equal(porCodigo('4').numeroDocumento, '52998224725')
    assert.deepEqual(regras(r.problemas), ['aviso:documento-repetido:2', 'aviso:telefone-incompleto:3', 'erro:documento-invalido:5'])
  })

  it('IE isento e IE com dígitos', () => {
    assert.equal(porCodigo('3').indicadorIe, 2)
    assert.equal(porCodigo('3').ie, '')
  })

  it('o cadastro que fica herda o que só o outro tinha (IE, telefones, e-mail)', () => {
    const alfa = porCodigo('1')
    assert.equal(alfa.ie, '0012345678901')
    assert.equal(alfa.indicadorIe, 1)
    assert.equal(alfa.email, 'a@a.com')
    assert.equal(alfa.celular, '31 99999-8888')
    assert.equal(alfa.endereco.numero, 'S/N')
  })

  it('número do endereço e telefones', () => {
    assert.equal(numeroEndereco('RUA A, 199-GALPAO 1'), '199')
    assert.equal(numeroEndereco('RUA A, SN-'), 'S/N')
    assert.equal(numeroEndereco('AV B, KM 66,5 - LADO A, SN'), 'S/N')
    assert.equal(numeroEndereco('RUA SEM VIRGULA'), 'S/N')
    assert.deepEqual(separarTelefones('COMERCIAL  3133334444 / Comercial 31 99999-8888 / 31 3222-1111'), {
      telefone: '3133334444 / 31 3222-1111',
      celular: '31 99999-8888',
      incompletos: []
    })
    assert.deepEqual(separarTelefones('(11) 3333-444').incompletos, ['(11) 3333-444'])
  })
})

describe('produtos', () => {
  const forn = montarFornecedores(FORNECEDORES, mapaPadrao('fornecedores', FORNECEDORES.colunas))
  const cats = montarCategorias(ARVORE, mapaPadrao('categorias', ARVORE.colunas))
  const r = montarProdutos(PRODUTOS, mapaPadrao('produtos', PRODUTOS.colunas), {
    categorias: new Set(cats.registros.map((c) => c.chave)),
    fornecedores: indiceFornecedores(forn.registros)
  })
  const p = (c: string) => r.registros.find((x) => x.codigo === c)!

  it('grupo fiscal pelo CST e origem pelo 1º dígito', () => {
    assert.equal(p('100').grupoFiscal, 'COM ST')
    assert.equal(p('101').grupoFiscal, 'SEM ST')
    assert.equal(p('102').origem, 1)
    assert.equal(p('100').origem, 0)
  })

  it('GTIN válido no campo; outros códigos nas observações (menos o próprio código)', () => {
    assert.equal(p('100').gtin, G1)
    assert.equal(p('100').observacoes, `Outros códigos de barras: ${G2}`)
    assert.equal(p('101').gtin, '')
    assert.equal(p('101').observacoes, '')
    assert.equal(p('102').observacoes, 'Outros códigos de barras: 445566')
  })

  it('categoria mais funda, estoque negativo zerado e inativo', () => {
    assert.equal(p('100').categoria, '3:40')
    assert.equal(p('101').categoria, '2:31')
    assert.equal(p('102').categoria, null)
    assert.equal(p('101').estoque, 0)
    assert.equal(p('101').estoqueSuperus, -3)
    assert.equal(p('102').situacao, 'I')
    assert.deepEqual(p('100').fornecedor, { codigo: '2', codNoFornecedor: 'AL-1' })
  })

  it('problemas e totais', () => {
    assert.deepEqual(regras(r.problemas), [
      'aviso:categoria-inexistente:102',
      'aviso:cst-especial:101',
      'aviso:ean-interno:102',
      'aviso:estoque-negativo:101',
      'aviso:ncm-invalido:102',
      'aviso:preco-zerado:101',
      'erro:codigo-repetido:100'
    ])
    assert.equal(r.registros.length, 3)
    assert.equal(total(r.totais, 'Estoque no Superus: soma dos positivos'), 14)
    assert.equal(total(r.totais, 'Estoque no Superus: soma dos negativos'), -3)
    assert.equal(total(r.totais, 'Estoque que vai para o Bling (negativos zerados)'), 14)
    assert.equal(total(r.totais, 'Valor do estoque no custo'), 12 * 4 + 2 * 20)
  })

  it('vínculos: sem a planilha 67, o fornecedor principal; com ela, junta sem repetir o par', () => {
    const indice = indiceFornecedores(forn.registros)
    const so = montarVinculos(null, {}, r.registros, indice)
    assert.deepEqual(so.registros.map((v) => [v.produto, v.fornecedor, v.codigoNoFornecedor, v.padrao]), [
      ['100', C1, 'AL-1', true],
      ['102', C2, '', true]
    ])
    const p67 = planilha([
      { CODPRODUTO: '100', CODFORNECEDOR: '1', SKUREFFORNECEDOR: 'X', CUSTO: '3.5' },
      { CODPRODUTO: '101', CODFORNECEDOR: '3', SKUREFFORNECEDOR: 'B-9', CUSTO: '' },
      { CODPRODUTO: '999', CODFORNECEDOR: '3', SKUREFFORNECEDOR: '', CUSTO: '' }
    ])
    const com = montarVinculos(p67, mapaPadrao('vinculos', p67.colunas), r.registros, indice)
    // O fornecedor 1 foi juntado ao 2 (mesmo CNPJ): o par 100 × ALFA vai uma vez só, como padrão.
    assert.deepEqual(com.registros.map((v) => [v.produto, v.fornecedor, v.padrao]), [
      ['100', C1, true],
      ['101', C2, false],
      ['102', C2, true]
    ])
    assert.deepEqual(regras(com.problemas), ['erro:produto-inexistente:999'])
  })
})

describe('contas a pagar', () => {
  const indice = indiceFornecedores(montarFornecedores(FORNECEDORES, mapaPadrao('fornecedores', FORNECEDORES.colunas)).registros)
  const conta = (o: Record<string, string>) => ({ CODFORNECEDOR: '', CNPJFORNECEDOR: '', DOCUMENTO: '', EMISSAO: '', VENCIMENTO: '', VALOR: '', PARCELA: '', HISTORICO: '', PLANOCONTAS: '', FORMAPAGAMENTO: '', ...o })
  const p = planilha([
    conta({ CODFORNECEDOR: '1', DOCUMENTO: 'NF 10', EMISSAO: '01/10/2026', VENCIMENTO: '05/11/2026', VALOR: '1.500,00', PARCELA: '1/2', HISTORICO: 'COMPRA', PLANOCONTAS: 'MERCADORIAS', FORMAPAGAMENTO: 'BOLETO' }),
    conta({ CODFORNECEDOR: '1', DOCUMENTO: 'NF 10', VENCIMENTO: '05/12/2026', VALOR: '1500', PARCELA: '2/2' }),
    conta({ CNPJFORNECEDOR: C2, DOCUMENTO: 'NF 11', VENCIMENTO: '46331', VALOR: '99.9' }),
    conta({ CODFORNECEDOR: '1', DOCUMENTO: 'NF 10', VENCIMENTO: '05/12/2026', VALOR: '1500', PARCELA: '2/2' }),
    conta({ CODFORNECEDOR: '77', DOCUMENTO: 'NF 12', VENCIMENTO: '05/11/2026', VALOR: '10' }),
    conta({ CODFORNECEDOR: '3', DOCUMENTO: 'NF 13', VENCIMENTO: '31/02/2026', VALOR: '10' }),
    conta({ CODFORNECEDOR: '3', DOCUMENTO: 'NF 14', VENCIMENTO: '05/11/2026', VALOR: '0' })
  ])
  const r = montarContas(p, mapaPadrao('contas', p.colunas), indice)

  it('acha o fornecedor pelo código ou pelo CNPJ e converte datas e valores', () => {
    assert.deepEqual(
      r.registros.map((c) => [c.fornecedor, c.numeroDocumento, c.dataEmissao, c.vencimento, c.valor, c.historico]),
      [
        [C1, 'NF 10', '2026-10-01', '2026-11-05', 1500, 'COMPRA - Parcela 1/2'],
        [C1, 'NF 10', null, '2026-12-05', 1500, 'Parcela 2/2'],
        [C2, 'NF 11', null, '2026-11-05', 99.9, '']
      ]
    )
  })

  it('erros: repetida, fornecedor que não existe, vencimento e valor inválidos', () => {
    assert.deepEqual(regras(r.problemas), [
      'erro:conta-repetida:NF 10',
      'erro:fornecedor-inexistente:NF 12',
      'erro:valor-invalido:NF 14',
      'erro:vencimento-invalido:NF 13'
    ])
    assert.equal(total(r.totais, 'Soma das contas a criar'), 3099.9)
  })
})

describe('conferência completa', () => {
  it('diz o que falta quando uma planilha não veio', () => {
    const fontes = Object.fromEntries(
      (['categorias', 'fornecedores', 'produtos', 'vinculos', 'contas'] as Tipo[]).map((t) => [t, { planilha: null, mapa: {} }])
    ) as Record<Tipo, Fonte>
    fontes.produtos = { planilha: PRODUTOS, mapa: mapaPadrao('produtos', PRODUTOS.colunas) }
    const c = conferir(fontes)
    assert.equal(c.produtos.resultado?.registros.length, 3)
    assert.equal(c.categorias.pendencia, 'Planilha ainda não enviada.')
    assert.equal(c.vinculos.pendencia, 'Precisa das planilhas de produtos e de fornecedores.')
    assert.equal(c.contas.resultado, null)
  })

  it('não confere sem as colunas obrigatórias', () => {
    const p = planilha([{ X: '1' }])
    const fontes = Object.fromEntries(
      (['categorias', 'fornecedores', 'produtos', 'vinculos', 'contas'] as Tipo[]).map((t) => [t, { planilha: null, mapa: {} }])
    ) as Record<Tipo, Fonte>
    fontes.categorias = { planilha: p, mapa: mapaPadrao('categorias', p.colunas) }
    const c = conferir(fontes)
    assert.deepEqual(c.categorias.faltando.map((f) => f.chave), ['codSetor', 'setor'])
    assert.equal(c.categorias.resultado, null)
  })
})
