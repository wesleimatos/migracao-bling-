import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { Banco } from '../src/banco.ts'
import { type Catalogos, lerCatalogos, type Ligacoes } from '../src/bling/catalogos.ts'
import { BlingCliente } from '../src/bling/cliente.ts'
import { Cofre } from '../src/bling/cofre.ts'
import { CLIENT_ID_PADRAO, CredenciaisBling } from '../src/bling/credenciais.ts'
import { Envio, type Lote, loteDeTeste } from '../src/bling/envio.ts'
import { blingFalso } from './util/bling-falso.ts'
import { C1, C2, loteExemplo } from './util/exemplos.ts'

let pasta: string
let banco: Banco
let bling: ReturnType<typeof blingFalso>
let envio: Envio
let catalogos: Catalogos
let lote: Lote
const ligacoes: Ligacoes = { deposito: null, categorias: { MERCADORIAS: 61 }, formas: { BOLETO: 71 } }
const posts = () => bling.chamadas.filter((c) => c.startsWith('POST'))

beforeEach(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'envio-'))
  banco = new Banco(pasta)
  const credenciais = new CredenciaisBling(banco, new Cofre(pasta))
  credenciais.gravarApp(CLIENT_ID_PADRAO, 'segredo')
  credenciais.gravarTokens({ acesso: 'A', renovacao: 'R', expiraEm: Date.now() + 3_600_000 })
  bling = blingFalso()
  const cliente = new BlingCliente(credenciais, { fetch: bling.f, intervaloMs: 0, esperar: async () => {} })
  envio = new Envio(banco, cliente)
  catalogos = await lerCatalogos(cliente)
  bling.chamadas.length = 0
  lote = loteExemplo()
})

afterEach(() => {
  banco.fechar()
  rmSync(pasta, { recursive: true, force: true })
})

describe('envio completo', () => {
  it('manda tudo na ordem do brief, com os ids certos ligando cada parte', async () => {
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(envio.estado.mensagem, 'Envio terminado.')
    const ordem = posts().map((c) => c.replace('POST ', ''))
    assert.deepEqual([...new Set(ordem)], ['/categorias/produtos', '/contatos', '/produtos', '/produtos/fornecedores', '/estoques', '/contas/pagar'])
    assert.equal(bling.db.categorias.length, 7)
    assert.equal(bling.db.contatos.length, 3)
    assert.equal(bling.db.produtos.length, 3)
    assert.equal(bling.db.vinculos.length, 2)
    assert.equal(bling.db.contas.length, 3)

    // Categoria do 4º nível pendurada no subgrupo certo.
    const gel = bling.db.categorias.find((c) => c.descricao === 'GEL')!
    const canetas = bling.db.categorias.find((c) => c.descricao === 'CANETAS')!
    assert.equal(gel.categoriaPai?.id, canetas.id)

    // Produto com categoria, grupo fiscal, origem, unidade UN e os outros códigos nas observações.
    const caneta = bling.db.produtos.find((p) => p.codigo === '100')!
    assert.deepEqual(caneta.categoria, { id: gel.id })
    assert.deepEqual(caneta.tributacao, { origem: 2, ncm: '96081000', cest: '1900100', spedTipoItem: '00', grupoProduto: { id: 51 } })
    assert.equal(caneta.unidade, 'UN')
    assert.equal(caneta.situacao, 'A')
    assert.match(String(caneta.observacoes), /Outros códigos de barras/)
    assert.deepEqual((bling.db.produtos.find((p) => p.codigo === '101')!.tributacao as { grupoProduto: unknown }).grupoProduto, { id: 52 })
    assert.equal(bling.db.produtos.find((p) => p.codigo === '102')!.situacao, 'I')

    // Fornecedor como contato do tipo Fornecedor, com endereço e sem campos vazios.
    const alfa = bling.db.contatos.find((c) => c.numeroDocumento === C1)!
    assert.deepEqual(alfa.tiposContato, [{ id: 8 }])
    assert.equal(alfa.codigo, '2')
    assert.equal((alfa.endereco as { geral: { numero: string } }).geral.numero, 'S/N')
    assert.ok(!('ie' in bling.db.contatos.find((c) => c.numeroDocumento === C2)!))

    // Estoque como balanço no depósito Geral (negativo não vai; inativo com saldo vai).
    assert.deepEqual(
      bling.db.estoques.map((e) => [e.operacao, e.quantidade, e.deposito]),
      [
        ['B', 12, { id: 1 }],
        ['B', 2, { id: 1 }]
      ]
    )

    // Contas com a categoria e a forma ligadas na tela; a forma não ligada (PIX) fica anotada.
    const parcela1 = bling.db.contas.find((c) => c.vencimento === '2026-11-05' && c.valor === 1500)!
    assert.deepEqual(parcela1.categoria, { id: 61 })
    assert.deepEqual(parcela1.formaPagamento, { id: 71 })
    assert.ok(envio.ocorrencias('completo').some((o) => o.etapa === 'contas' && /forma "PIX"/.test(o.mensagem)))
  })

  it('rodar de novo não cria nada (tudo já foi)', async () => {
    await envio.enviar('completo', lote, catalogos, ligacoes)
    bling.chamadas.length = 0
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.deepEqual(posts(), [])
    const c = envio.contagem('completo', lote)
    assert.equal(c.produtos.enviado, 3)
    assert.equal(c.produtos.pendente, 0)
  })

  it('usa o que já existe no Bling em vez de duplicar', async () => {
    bling.db.produtos.push({ id: 9, codigo: '101', nome: 'LAPIS CRIADO A MAO' })
    bling.db.contatos.push({ id: 8, numeroDocumento: C2, nome: 'BETA JA CADASTRADA' })
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(bling.db.produtos.length, 3)
    assert.equal(bling.db.contatos.length, 3)
    assert.equal(envio.item('completo', 'produtos', '101')?.status, 'pulado')
    assert.equal(envio.item('completo', 'fornecedores', C2)?.bling_id, 8)
  })

  it('cai a internet no meio: para e continua de onde parou, sem duplicar', async () => {
    let quedas = 0
    bling.falhas.push((m, c) => (m === 'POST' && c === '/produtos' && bling.db.produtos.length === 1 && quedas++ === 0 ? 'rede' : undefined))
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.match(envio.estado.mensagem ?? '', /Sem conexão/)
    assert.equal(bling.db.produtos.length, 1)
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(envio.estado.mensagem, 'Envio terminado.')
    assert.equal(bling.db.produtos.length, 3)
    assert.equal(bling.db.contas.length, 3)
  })

  it('chamada que criou no Bling mas a resposta se perdeu: confere antes de criar de novo', async () => {
    let primeira = true
    bling.falhas.push((m, c, corpo) => {
      if (m !== 'POST' || c !== '/produtos/fornecedores' || !primeira) return undefined
      primeira = false
      bling.db.vinculos.push({ id: 777, ...corpo })
      return 'rede'
    })
    await envio.enviar('completo', lote, catalogos, ligacoes)
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(bling.db.vinculos.length, 2)
    assert.equal(bling.db.vinculos.filter((v) => v.id === 777).length, 1)
  })

  it('o Bling recusa um registro: anota o erro, segue com os outros e reenvia depois', async () => {
    let recusa = true
    bling.falhas.push((m, c, corpo) =>
      recusa && m === 'POST' && c === '/produtos' && corpo.codigo === '101'
        ? new Response(JSON.stringify({ error: { description: 'NCM inválido' } }), { status: 400 })
        : undefined
    )
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(envio.estado.mensagem, 'Envio terminado.')
    assert.equal(bling.db.produtos.length, 2)
    assert.deepEqual(envio.contagem('completo', lote).produtos, { total: 3, enviado: 2, pulado: 0, erro: 1, pendente: 0 })
    assert.deepEqual(
      envio.ocorrencias('completo').filter((o) => o.status === 'erro').map((o) => [o.etapa, o.chave, o.mensagem]),
      [['produtos', '101', 'NCM inválido']]
    )
    recusa = false
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(bling.db.produtos.length, 3)
    assert.equal(envio.contagem('completo', lote).produtos.erro, 0)
  })

  it('IE recusada: o fornecedor vai sem IE e fica anotado', async () => {
    lote.fornecedores = lote.fornecedores.map((f) => (f.numeroDocumento === C1 ? { ...f, ie: '999', indicadorIe: 1 } : f))
    await envio.enviar('completo', lote, catalogos, ligacoes)
    const alfa = bling.db.contatos.find((c) => c.numeroDocumento === C1)!
    assert.ok(!('ie' in alfa))
    assert.match(envio.item('completo', 'fornecedores', C1)?.mensagem ?? '', /Criado sem IE/)
  })

  it('telefone recusado: o fornecedor vai sem telefone (junto com IE recusada) e fica anotado', async () => {
    lote.fornecedores = lote.fornecedores.map((f) => (f.numeroDocumento === C1 ? { ...f, ie: '999', indicadorIe: 1, telefone: '(31) 3234-612' } : f))
    await envio.enviar('completo', lote, catalogos, ligacoes)
    const alfa = bling.db.contatos.find((c) => c.numeroDocumento === C1)!
    assert.ok(!('ie' in alfa) && !('telefone' in alfa))
    assert.match(envio.item('completo', 'fornecedores', C1)?.mensagem ?? '', /Criado sem IE.*Criado sem telefone: o Bling recusou \(31\) 3234-612/)
  })

  it('GTIN e CEST recusados: o produto vai sem eles, com os originais nas observações', async () => {
    lote.produtos = lote.produtos.map((p) => (p.codigo === '101' ? { ...p, gtin: '7890000000000', cest: '9999999' } : p))
    await envio.enviar('completo', lote, catalogos, ligacoes)
    const p = bling.db.produtos.find((x) => x.codigo === '101')!
    assert.ok(!('gtin' in p) && !('cest' in (p.tributacao as object)))
    assert.match(String(p.observacoes), /GTIN do Superus recusado pelo Bling: 7890000000000\nCEST do Superus recusado pelo Bling: 9999999/)
    assert.equal(envio.contagem('completo', lote).produtos.erro, 0)
  })

  it('produto na lixeira do Bling (situação E) não conta como existente: é criado de novo', async () => {
    bling.db.produtos.push({ id: 9001, codigo: '101', situacao: 'E' })
    await envio.enviar('completo', lote, catalogos, ligacoes)
    const ativos = bling.db.produtos.filter((x) => x.codigo === '101' && x.situacao !== 'E')
    assert.equal(ativos.length, 1)
    assert.equal(envio.item('completo', 'produtos', '101')?.status, 'enviado')
    assert.notEqual(envio.item('completo', 'produtos', '101')?.bling_id, 9001)
  })

  it('pausar no meio e continuar depois', async () => {
    bling.falhas.push((m, c) => {
      if (m === 'POST' && c === '/produtos') envio.pausar()
      return undefined
    })
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.match(envio.estado.mensagem ?? '', /Pausado/)
    assert.equal(bling.db.produtos.length, 1)
    bling.falhas.length = 0
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(bling.db.produtos.length, 3)
  })

  it('não começa sem o que precisa no Bling', async () => {
    const semGrupo = { ...catalogos, grupos: catalogos.grupos.filter((g) => g.nome !== 'COM ST') }
    await assert.rejects(envio.enviar('completo', lote, semGrupo, ligacoes), /grupo de produtos "COM ST"/)
    await assert.rejects(envio.enviar('completo', lote, null, ligacoes), /Ler os cadastros do Bling/)
    assert.deepEqual(bling.chamadas, [])
  })

  it('limite do dia: para e avisa', async () => {
    bling.falhas.push((m, c) => (m === 'POST' && c === '/contatos' ? new Response(JSON.stringify({ error: { period: 'day', limit: 120000 } }), { status: 429 }) : undefined))
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.match(envio.estado.mensagem ?? '', /limite de chamadas do dia/)
    assert.equal(bling.db.categorias.length, 7)
    assert.equal(bling.db.contatos.length, 0)
  })
})

describe('envio de teste', () => {
  it('amostra: produtos com GTIN, fornecedor e estoque, as categorias acima deles e até 2 contas', () => {
    const t = loteDeTeste(lote)
    assert.deepEqual(t.produtos.map((p) => p.codigo), ['100', '101'])
    assert.deepEqual(t.categorias.map((c) => c.chave).sort(), ['0:10', '1:20', '2:30', '2:31', '3:40'])
    assert.deepEqual(t.fornecedores.map((f) => f.chave), [C1])
    assert.equal(t.contas.length, 2)
  })

  it('cria tudo marcado "TESTE", bloqueia o completo e apaga tudo depois', async () => {
    await envio.enviar('teste', lote, catalogos, ligacoes)
    assert.equal(envio.estado.mensagem, 'Envio terminado.')
    assert.ok(bling.db.produtos.every((p) => String(p.codigo).startsWith('TESTE-') && String(p.nome).startsWith('TESTE - ')))
    assert.ok(bling.db.categorias.every((c) => c.descricao.startsWith('TESTE - ')))
    assert.ok(bling.db.contas.every((c) => String(c.historico).startsWith('TESTE - ')))
    assert.ok(envio.temTestes())
    await assert.rejects(envio.enviar('completo', lote, catalogos, ligacoes), /Apague os registros de teste/)

    const r = await envio.apagarTestes()
    assert.deepEqual(r.falhas, [])
    assert.deepEqual(
      [bling.db.categorias, bling.db.contatos, bling.db.produtos, bling.db.vinculos, bling.db.estoques, bling.db.contas].map((x) => x.length),
      [0, 0, 0, 0, 0, 0]
    )
    assert.ok(!envio.temTestes())

    // Depois de apagar, o completo sai limpo (sem nada com "TESTE").
    await envio.enviar('completo', lote, catalogos, ligacoes)
    assert.equal(bling.db.produtos.length, 3)
    assert.ok(bling.db.produtos.every((p) => !String(p.codigo).startsWith('TESTE')))
  })

  it('não apaga o que já existia no Bling antes do teste', async () => {
    bling.db.contatos.push({ id: 5, numeroDocumento: C1, nome: 'ALFA DE VERDADE' })
    await envio.enviar('teste', lote, catalogos, ligacoes)
    await envio.apagarTestes()
    assert.deepEqual(bling.db.contatos.map((c) => c.id), [5])
  })
})
