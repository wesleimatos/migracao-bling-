import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { Banco } from '../src/banco.ts'
import { BlingCliente, ErroBlingApi, ErroBlingDesconectado, ErroBlingLimiteDiario, ErroBlingRede, montarConsulta } from '../src/bling/cliente.ts'
import { Cofre } from '../src/bling/cofre.ts'
import { CLIENT_ID_PADRAO, CredenciaisBling } from '../src/bling/credenciais.ts'
import { trocarCodigo, urlAutorizacao } from '../src/bling/oauth.ts'

let pasta: string
let banco: Banco
let credenciais: CredenciaisBling

beforeEach(() => {
  pasta = mkdtempSync(join(tmpdir(), 'bling-'))
  banco = new Banco(pasta)
  credenciais = new CredenciaisBling(banco, new Cofre(pasta))
  credenciais.gravarApp(CLIENT_ID_PADRAO, 'segredo-de-teste')
  credenciais.gravarTokens({ acesso: 'A1', renovacao: 'R1', expiraEm: Date.now() + 3_600_000 })
})

afterEach(() => {
  banco.fechar()
  rmSync(pasta, { recursive: true, force: true })
})

/** fetch falso que responde em sequência e guarda as chamadas. */
function respostas(...lista: (Response | Error)[]) {
  const chamadas: { url: string; init: RequestInit }[] = []
  const f = (async (url: string | URL, init: RequestInit = {}) => {
    chamadas.push({ url: String(url), init })
    const r = lista.shift()
    if (!r) throw new Error('sem resposta preparada')
    if (r instanceof Error) throw r
    return r
  }) as typeof fetch
  return { f, chamadas }
}
const json = (status: number, dados: unknown) => new Response(JSON.stringify(dados), { status })

describe('cliente do Bling', () => {
  it('monta listas como chave[]=a&chave[]=b', () => {
    assert.equal(montarConsulta({ 'codigos[]': ['A', 'B'], pagina: 1, vazio: undefined }), '?codigos%5B%5D=A&codigos%5B%5D=B&pagina=1')
  })

  it('renova o token no 401 e repete a chamada', async () => {
    const { f, chamadas } = respostas(json(401, {}), json(200, { access_token: 'A2', refresh_token: 'R2', expires_in: 21600 }), json(200, { data: [] }))
    const c = new BlingCliente(credenciais, { fetch: f, intervaloMs: 0 })
    assert.deepEqual(await c.get('/produtos'), { data: [] })
    assert.equal(chamadas[1].url, 'https://www.bling.com.br/Api/v3/oauth/token')
    assert.equal((chamadas[2].init.headers as Record<string, string>).Authorization, 'Bearer A2')
    assert.equal(credenciais.tokens()?.renovacao, 'R2')
  })

  it('renova antes de vencer e desconecta quando o Bling recusa a renovação', async () => {
    credenciais.gravarTokens({ acesso: 'A1', renovacao: 'R1', expiraEm: Date.now() + 1000 })
    const { f } = respostas(json(400, { error: { description: 'invalid_grant' } }))
    const c = new BlingCliente(credenciais, { fetch: f, intervaloMs: 0 })
    await assert.rejects(c.get('/produtos'), ErroBlingDesconectado)
    assert.equal(credenciais.tokens(), null)
  })

  it('429 por segundo: espera 1 s, 2 s... e tenta de novo', async () => {
    const esperas: number[] = []
    const { f } = respostas(json(429, { error: { period: 'second' } }), json(429, {}), json(200, { data: { id: 5 } }))
    const c = new BlingCliente(credenciais, { fetch: f, intervaloMs: 0, esperar: async (ms) => void esperas.push(ms) })
    assert.deepEqual(await c.post('/produtos', {}), { data: { id: 5 } })
    assert.deepEqual(esperas, [1000, 2000])
  })

  it('429 do limite diário para o envio', async () => {
    const { f } = respostas(json(429, { error: { type: 'TOO_MANY_REQUESTS', limit: 120000, period: 'day' } }))
    const c = new BlingCliente(credenciais, { fetch: f, intervaloMs: 0 })
    await assert.rejects(c.get('/produtos'), ErroBlingLimiteDiario)
  })

  it('erro do Bling vira mensagem com os campos; 5xx e queda de rede viram erro de rede', async () => {
    const { f } = respostas(
      json(400, { error: { description: 'Não foi possível salvar', fields: [{ element: 'gtin', msg: 'GTIN inválido' }] } }),
      new Response('<html>502</html>', { status: 502 }),
      new TypeError('fetch failed')
    )
    const c = new BlingCliente(credenciais, { fetch: f, intervaloMs: 0 })
    await assert.rejects(c.post('/produtos', {}), (e: Error) => e instanceof ErroBlingApi && e.message === 'Não foi possível salvar — gtin: GTIN inválido')
    await assert.rejects(c.get('/produtos'), ErroBlingRede)
    await assert.rejects(c.get('/produtos'), /Sem conexão/)
  })

  it('respeita o intervalo entre chamadas', async () => {
    let agora = 10_000
    const esperas: number[] = []
    const { f } = respostas(json(200, {}), json(200, {}))
    const c = new BlingCliente(credenciais, { fetch: f, agora: () => agora, esperar: async (ms) => void esperas.push(ms) })
    credenciais.gravarTokens({ acesso: 'A1', renovacao: 'R1', expiraEm: 10 ** 12 })
    await c.get('/a')
    agora += 100
    await c.get('/b')
    assert.deepEqual(esperas, [250])
  })

  it('lista todas as páginas', async () => {
    const pagina = (n: number) => json(200, { data: Array.from({ length: n }, (_, i) => ({ id: i })) })
    const { f, chamadas } = respostas(pagina(100), pagina(3))
    const c = new BlingCliente(credenciais, { fetch: f, intervaloMs: 0 })
    assert.equal((await c.listarTudo('/categorias/produtos')).length, 103)
    assert.match(chamadas[1].url, /pagina=2&limite=100/)
  })
})

describe('autorização e segredos', () => {
  it('link de autorização com state e troca do código com Basic', async () => {
    const u = new URL(urlAutorizacao('abc', 'xyz'))
    assert.equal(u.origin + u.pathname, 'https://www.bling.com.br/Api/v3/oauth/authorize')
    assert.equal(u.searchParams.get('state'), 'xyz')
    const { f, chamadas } = respostas(json(200, { access_token: 'A', refresh_token: 'R', expires_in: 60 }))
    const t = await trocarCodigo(f, 'id', 'sec', 'COD123', 1000)
    assert.deepEqual(t, { acesso: 'A', renovacao: 'R', expiraEm: 61_000 })
    assert.equal((chamadas[0].init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from('id:sec').toString('base64')}`)
    assert.equal(chamadas[0].init.body, 'grant_type=authorization_code&code=COD123')
  })

  it('Client Secret e tokens ficam cifrados no banco', () => {
    const bruto = JSON.stringify(banco.db.prepare('SELECT * FROM config').all())
    assert.ok(!bruto.includes('segredo-de-teste'))
    assert.ok(!bruto.includes('"R1"'))
    assert.equal(credenciais.app()?.clientSecret, 'segredo-de-teste')
    // A mesma chave vale depois de reiniciar o app.
    assert.equal(new CredenciaisBling(banco, new Cofre(pasta)).app()?.clientSecret, 'segredo-de-teste')
  })

  it('Secret em branco mantém o atual; trocar o app desconecta', () => {
    credenciais.gravarApp(CLIENT_ID_PADRAO, '')
    assert.equal(credenciais.app()?.clientSecret, 'segredo-de-teste')
    assert.equal(credenciais.tokens(), null)
  })
})
