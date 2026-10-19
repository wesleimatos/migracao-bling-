import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import type { Planilha } from '../src/planilhas/ler.ts'
import { Banco } from '../src/banco.ts'
import { criarApp } from '../src/servidor.ts'
import { blingFalso } from './util/bling-falso.ts'
import { ARVORE, CONTAS, FORNECEDORES, PRODUTOS } from './util/exemplos.ts'
import { xlsx } from './util/planilha.ts'

let pasta: string
let banco: Banco
let servidor: Server
let base: string
let cookie = ''
const bling = blingFalso()

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'telas-'))
  banco = new Banco(pasta)
  servidor = createServer(criarApp(banco, { fetch: bling.f, intervaloMs: 0, esperar: async () => {} }))
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`
  const r = await fetch(`${base}/entrar`, { method: 'POST', body: new URLSearchParams({ codigo: readFileSync(join(pasta, 'codigo-primeiro-acesso'), 'utf8'), senha: 'senha-de-teste-1', confirmar: 'senha-de-teste-1' }), redirect: 'manual' })
  cookie = (r.headers.get('set-cookie') ?? '').split(';')[0]
})

after(() => {
  servidor.close()
  banco.fechar()
  rmSync(pasta, { recursive: true, force: true })
})

const ir = (caminho: string, init: RequestInit = {}) =>
  fetch(base + caminho, { redirect: 'manual', ...init, headers: { Cookie: cookie, ...(init.headers as Record<string, string>) } })
const texto = async (caminho: string) => (await ir(caminho)).text()
const form = (caminho: string, dados: Record<string, string> = {}) => ir(caminho, { method: 'POST', body: new URLSearchParams(dados) })
const comoXlsx = (p: Planilha) => xlsx([p.colunas, ...p.linhas.map((l) => p.colunas.map((c) => l[c]))])
async function esperarFim() {
  for (let i = 0; i < 200; i++) {
    const e = (await (await ir('/envio/estado', { headers: { Accept: 'application/json' } })).json()) as { rodando: boolean }
    if (!e.rodando) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('o envio não terminou')
}

describe('do Bling desconectado até o envio completo', () => {
  it('envio mostra o que falta', async () => {
    const t = await texto('/envio')
    assert.match(t, /Planilha de produtos e estoque pronta/)
    assert.match(t, /Conectar o app ao Bling/)
  })

  it('planilhas sobem', async () => {
    for (const [tipo, p] of [['categorias', ARVORE], ['fornecedores', FORNECEDORES], ['produtos', PRODUTOS], ['contas', CONTAS]] as const) {
      const r = await ir(`/planilhas/${tipo}`, { method: 'POST', body: comoXlsx(p), headers: { 'X-Nome-Arquivo': `${tipo}.xlsx`, Accept: 'application/json' } })
      assert.equal(r.status, 200)
    }
  })

  it('salva o Client Secret cifrado e conecta pelo OAuth com state', async () => {
    assert.equal((await form('/bling/app', { clientId: 'meu-id', clientSecret: 'meu-segredo' })).status, 303)
    assert.ok(!JSON.stringify(banco.db.prepare('SELECT * FROM config').all()).includes('meu-segredo'))

    const r = await ir('/bling/conectar')
    const destino = new URL(r.headers.get('location')!)
    assert.equal(destino.host, 'www.bling.com.br')
    assert.equal(destino.searchParams.get('client_id'), 'meu-id')
    const estado = destino.searchParams.get('state')!

    // State errado é recusado (e o certo deixa de valer depois de uma tentativa).
    const ruim = await ir(`/bling/callback?code=ABC&state=outro`)
    assert.match(decodeURIComponent(ruim.headers.get('location')!), /Autorização inválida/)
    const novo = new URL((await ir('/bling/conectar')).headers.get('location')!).searchParams.get('state')!
    assert.notEqual(novo, estado)
    const ok = await ir(`/bling/callback?code=ABC&state=${novo}`)
    assert.match(decodeURIComponent(ok.headers.get('location')!), /Conectado ao Bling/)

    const t = await texto('/bling')
    assert.match(t, /conectado/)
    assert.match(t, /✓<\/span> Grupo de produtos &#34;COM ST&#34;/)
    assert.match(t, /<option value="1" selected>Geral \(padrão\)/)
    assert.match(t, /Bling pronto para o envio/)
  })

  it('liga as categorias e formas das contas', async () => {
    const t = await texto('/ligacoes')
    assert.match(t, /MERCADORIAS/)
    assert.match(t, /BOLETO/)
    await form('/ligacoes', { catNome0: 'MERCADORIAS', cat0: '61', formaNome0: 'BOLETO', forma0: '71', formaNome1: 'PIX', forma1: '72' })
    assert.match(await texto('/ligacoes'), /<option value="72" selected>Pix/)
  })

  it('teste: envia marcado TESTE, bloqueia o completo e apaga', async () => {
    assert.equal((await form('/envio/teste')).status, 303)
    await esperarFim()
    assert.ok(bling.db.produtos.length > 0 && bling.db.produtos.every((p) => String(p.codigo).startsWith('TESTE-')))
    assert.match(await texto('/relatorio?modo=teste'), /Relatório do teste/)

    const bloqueado = await form('/envio/completo')
    assert.equal(bloqueado.status, 400)
    assert.match(await bloqueado.text(), /Apague os registros de teste/)

    const apagar = await form('/envio/apagar-testes')
    assert.match(decodeURIComponent(apagar.headers.get('location')!), /Apagados \d+ registros de teste/)
    assert.equal(bling.db.produtos.length, 0)
  })

  it('completo: envia tudo e o relatório mostra os números', async () => {
    assert.equal((await form('/envio/completo')).status, 303)
    await esperarFim()
    assert.equal(bling.db.produtos.length, 3)
    assert.equal(bling.db.contas.length, 3)
    const t = await texto('/relatorio')
    assert.match(t, /Relatório do envio/)
    assert.match(t, /Envio terminado|Enviados/)
    const csv = await (await ir('/relatorio.csv')).text()
    assert.match(csv, /"Etapa";"Registro";"Situação";"Mensagem"/)
  })
})
