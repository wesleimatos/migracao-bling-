import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { Banco } from '../src/banco.ts'
import { criarApp } from '../src/servidor.ts'
import { cnpj, gtin, xlsx } from './util/planilha.ts'

let pasta: string
let banco: Banco
let servidor: Server
let base: string
let cookie = ''

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'migracao-'))
  banco = new Banco(pasta)
  servidor = createServer(criarApp(banco))
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`
  const r = await fetch(`${base}/entrar`, {
    method: 'POST',
    body: new URLSearchParams({ senha: 'senha-de-teste-1', confirmar: 'senha-de-teste-1' }),
    redirect: 'manual'
  })
  cookie = (r.headers.get('set-cookie') ?? '').split(';')[0]
})

after(() => {
  servidor.close()
  banco.fechar()
  rmSync(pasta, { recursive: true, force: true })
})

/** fetch já com a sessão de quem entrou. */
const ir = (caminho: string, init: RequestInit = {}) =>
  fetch(base + caminho, { redirect: 'manual', ...init, headers: { Cookie: cookie, ...(init.headers as Record<string, string>) } })
const enviar = (tipo: string, arquivo: Buffer, nome = `${tipo}.xlsx`) =>
  ir(`/planilhas/${tipo}`, {
    method: 'POST',
    body: arquivo,
    headers: { 'X-Nome-Arquivo': encodeURIComponent(nome), Accept: 'application/json' }
  })
const texto = async (caminho: string) => (await ir(caminho)).text()

describe('login', () => {
  it('sem sessão, tudo leva para a tela de entrar (e JSON recebe 401)', async () => {
    const r = await fetch(`${base}/conferencia`, { redirect: 'manual' })
    assert.equal(r.status, 303)
    assert.equal(r.headers.get('location'), '/entrar')
    assert.equal((await fetch(`${base}/envio/estado`, { headers: { Accept: 'application/json' } })).status, 401)
    assert.match(await (await fetch(`${base}/entrar`)).text(), /Entrar/)
  })

  it('cookie da sessão é HttpOnly e SameSite', async () => {
    const r = await fetch(`${base}/entrar`, { method: 'POST', body: new URLSearchParams({ senha: 'senha-de-teste-1' }), redirect: 'manual' })
    assert.equal(r.status, 303)
    assert.match(r.headers.get('set-cookie') ?? '', /HttpOnly; SameSite=Lax; Path=\/; Max-Age=43200/)
  })

  it('senha errada várias vezes bloqueia por 15 minutos', async () => {
    const tentar = (senha: string) => fetch(`${base}/entrar`, { method: 'POST', body: new URLSearchParams({ senha }), redirect: 'manual' })
    for (let i = 0; i < 4; i++) assert.match(await (await tentar('errada')).text(), /Senha errada/)
    assert.match(await (await tentar('errada')).text(), /Muitas tentativas/)
    assert.equal((await tentar('senha-de-teste-1')).status, 401)
    banco.db.prepare('DELETE FROM tentativas').run()
  })

  it('recusa formulário enviado de outro site ou com origem escondida; aceita o do próprio app', async () => {
    for (const Origin of ['https://site-ruim.com', 'null']) {
      assert.equal((await ir('/planilhas/produtos/apagar', { method: 'POST', headers: { Origin } })).status, 403)
    }
    assert.equal((await ir('/planilhas/produtos/apagar', { method: 'POST', headers: { Origin: base } })).status, 303)
  })
})

describe('telas da Etapa 1', () => {
  it('início mostra as 5 planilhas faltando', async () => {
    const t = await texto('/')
    for (const nome of ['Categorias de produtos', 'Fornecedores', 'Produtos e estoque', 'Contas a pagar em aberto']) assert.match(t, new RegExp(nome))
    assert.match(t, /falta enviar/)
  })

  it('recebe a planilha, guarda fora do Git e confere', async () => {
    const r = await enviar(
      'categorias',
      xlsx([
        ['COD_SETOR', 'SETOR', 'COD_GRUPO', 'GRUPO', 'COD_SUBGRUPO', 'SUBGRUPO', 'COD_CATEGORIA', 'CATEGORIA'],
        [10, 'PAPELARIA', 20, 'ESCOLAR', null, null, null, null],
        [11, 'GERAL', null, null, null, null, null, null]
      ]),
      'árvore 48.xlsx'
    )
    assert.deepEqual(await r.json(), { ok: true, linhas: 2, colunas: 8 })
    assert.equal(banco.arquivo('categorias')?.nome, 'árvore 48.xlsx')
    const t = await texto('/conferencia/categorias')
    assert.match(t, /Categorias a criar no Bling/)
    assert.match(t, /Nenhum problema encontrado/)
  })

  it('recusa arquivo que não é planilha', async () => {
    const r = await enviar('produtos', Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))
    assert.equal(r.status, 400)
    assert.match((await r.json()).erro, /Não consegui ler/)
    assert.equal(banco.arquivo('produtos'), null)
  })

  it('ligação de colunas: vem preenchida, salva e muda a conferência', async () => {
    const C1 = cnpj('123456780001')
    await enviar(
      'fornecedores',
      xlsx([
        ['COD', 'RAZAO', 'CNPJ'],
        ['1', 'ALFA LTDA', C1]
      ])
    )
    // "COD" não é uma coluna padrão: o código fica sem ligação e a conferência espera.
    assert.match(await texto('/colunas/fornecedores'), /<option value="">— nenhuma —<\/option>/)
    assert.match(await texto('/conferencia/fornecedores'), /Faltam colunas obrigatórias: Código/)

    const salvar = await ir('/colunas/fornecedores', {
      method: 'POST',
      body: new URLSearchParams({ codigo: 'COD', razao: 'RAZAO', cnpj: 'CNPJ' })
    })
    assert.equal(salvar.status, 303)
    assert.equal(salvar.headers.get('location'), '/conferencia/fornecedores')
    assert.match(await texto('/colunas/fornecedores'), /<option value="COD" selected>/)
    assert.match(await texto('/conferencia/fornecedores'), /Fornecedores a criar no Bling/)
  })

  it('conferência de produtos com avisos e lista para o Excel', async () => {
    await enviar(
      'produtos',
      xlsx([
        ['CODPRODUTO', 'DESCRICAO', 'INATIVO', 'EAN', 'PRECOVENDA', 'CUSTO', 'ESTOQUE', 'NCM', 'CSTICMS', 'CODSETOR'],
        [1, 'CANETA', 'N', gtin('789100010010'), 10, 4, 5, '96081000', '060', 10],
        [2, 'LAPIS "HB"; PRETO', 'N', '2', 0, 1, -2, '96091000', '090', 10]
      ])
    )
    const t = await texto('/conferencia/produtos')
    assert.match(t, /Produtos a criar no Bling/)
    assert.match(t, /Estoque negativo \(entra zerado\)/)
    assert.match(t, /R\$\s?20,00/)

    const r = await ir('/conferencia/produtos/problemas.csv')
    assert.match(r.headers.get('content-type') ?? '', /text\/csv/)
    const bytes = Buffer.from(await r.arrayBuffer())
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'BOM para o Excel abrir com acento')
    const csv = bytes.toString('utf8', 3)
    assert.ok(csv.startsWith('"Nível";"Regra";"Linha";"Código";"Mensagem"'))
    assert.match(csv, /"aviso";"Preço de venda zerado";"3";"2"/)
  })

  it('apagar a planilha e página que não existe', async () => {
    const r = await ir('/planilhas/produtos/apagar', { method: 'POST' })
    assert.equal(r.status, 303)
    assert.equal(banco.arquivo('produtos'), null)
    assert.equal((await ir('/nada')).status, 404)
    assert.equal((await ir('/colunas/outra')).status, 404)
  })
})
