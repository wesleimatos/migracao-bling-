import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Banco } from './banco.ts'
import { lerCatalogos, lerCatalogosSalvos, lerLigacoes, pendenciasBling } from './bling/catalogos.ts'
import { BlingCliente, type OpcoesCliente } from './bling/cliente.ts'
import { Cofre } from './bling/cofre.ts'
import { CredenciaisBling } from './bling/credenciais.ts'
import { Envio, type Lote, loteDeTeste, type Modo, NOMES_ETAPA } from './bling/envio.ts'
import { trocarCodigo, urlAutorizacao } from './bling/oauth.ts'
import { esc, formatar, pagina } from './html.ts'
import { lerPlanilha, type Planilha } from './planilhas/ler.ts'
import { CAMPOS } from './regras/campos.ts'
import { conferir, type ConferenciaTipo, type Fonte } from './regras/conferencia.ts'
import { loteDaConferencia, mapaValido } from './montagem.ts'
import type { Conta } from './regras/contas.ts'
import { type Mapa, NOMES_TIPO, type Problema, type Tipo, TIPOS } from './regras/tipos.ts'
import { Acesso, lerCookies, origemDaRequisicao } from './seguranca.ts'
import { alerta, andamento, telaBling, telaEntrar, telaEnvio, telaLigacoes, telaRelatorio } from './telasEnvio.ts'

const LIMITE_ARQUIVO = 60 * 1024 * 1024

/** De onde vem cada planilha no Superus. */
const ORIGEM: Record<Tipo, string> = {
  categorias: 'Consulta 48 "MIGRACAO ARVORE CATEGORIAS".',
  fornecedores: 'Consulta 64 "FORNECEDORES COMPLETO".',
  produtos: 'Consulta 62 "CADASTRO COMPLETO OIAPOQUE" (o estoque vem junto).',
  vinculos: 'Consulta 67. Opcional: sem ela, vale o fornecedor principal de cada produto.',
  contas: 'Consulta 65, só as contas em aberto.'
}

/** Nome de cada regra da conferência na tela. */
const ROTULOS: Record<string, string> = {
  'sem-codigo': 'Sem código',
  'codigo-repetido': 'Código repetido',
  'sem-nome': 'Sem nome',
  'nome-diferente': 'Mesmo código com nomes diferentes',
  'pai-diferente': 'Mesmo código em dois lugares da árvore',
  'documento-invalido': 'CPF/CNPJ inválido',
  'sem-documento': 'Sem CPF/CNPJ',
  'documento-repetido': 'CPF/CNPJ repetido (juntados)',
  'ie-fora-do-padrao': 'IE fora do padrão da UF',
  'telefone-incompleto': 'Telefone que parece incompleto',
  'telefone-sobrando': 'Número que não coube no Bling',
  'ean-interno': 'EAN que não é GTIN (vai nas observações)',
  'gtin-repetido': 'GTIN em mais de um produto',
  'preco-invalido': 'Preço que não é número',
  'custo-invalido': 'Custo que não é número',
  'preco-zerado': 'Preço de venda zerado',
  'custo-zerado': 'Custo zerado',
  'custo-maior': 'Custo maior que a venda',
  'ncm-invalido': 'NCM inválido (vai sem NCM)',
  'cest-invalido': 'CEST inválido (vai sem CEST)',
  'origem-invalida': 'Origem inválida',
  'sem-cst': 'Sem CST de ICMS (vai para SEM ST)',
  'cst-especial': 'CST 90, 41, 20... (vai para SEM ST)',
  'categoria-inexistente': 'Categoria que não está na árvore',
  'sem-categoria': 'Sem categoria',
  'estoque-invalido': 'Estoque que não é número',
  'estoque-negativo': 'Estoque negativo (entra zerado)',
  'fornecedor-inexistente': 'Fornecedor que não está na planilha de fornecedores',
  'produto-inexistente': 'Produto que não está na planilha de produtos',
  'valor-invalido': 'Valor zerado, negativo ou inválido',
  'vencimento-invalido': 'Vencimento inválido',
  'emissao-invalida': 'Emissão inválida',
  'conta-repetida': 'Conta repetida'
}

class ErroHttp extends Error {
  readonly status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export interface OpcoesApp extends OpcoesCliente {
  /** Atrás do proxy da VPS: IP, HTTPS e host vêm dos cabeçalhos X-Forwarded-*. */
  confiarProxy?: boolean
}

/** O app: login, planilhas, ligação de colunas, conferência, conexão com o Bling, envio e relatório. */
export function criarApp(banco: Banco, opcoes: OpcoesApp = {}) {
  const acesso = new Acesso(banco)
  acesso.prepararPrimeiroAcesso()
  const credenciais = new CredenciaisBling(banco, new Cofre(banco.pasta))
  const cliente = new BlingCliente(credenciais, opcoes)
  const envio = new Envio(banco, cliente)
  const lidas = new Map<Tipo, { recebidoEm: string; planilha: Planilha }>()
  let ultima: { chave: string; valor: Record<Tipo, ConferenciaTipo> } | null = null

  function planilha(tipo: Tipo): Planilha | null {
    const a = banco.arquivo(tipo)
    if (!a) return null
    const cache = lidas.get(tipo)
    if (cache?.recebidoEm === a.recebidoEm) return cache.planilha
    const p = lerPlanilha(banco.conteudo(tipo))
    lidas.set(tipo, { recebidoEm: a.recebidoEm, planilha: p })
    return p
  }

  const mapa = (tipo: Tipo, p: Planilha | null): Mapa => mapaValido(banco, tipo, p)

  function conferencia(): Record<Tipo, ConferenciaTipo> {
    const fontes = Object.fromEntries(
      TIPOS.map((t) => {
        const p = planilha(t)
        return [t, { planilha: p, mapa: mapa(t, p) }]
      })
    ) as Record<Tipo, Fonte>
    const chave = JSON.stringify(TIPOS.map((t) => [banco.arquivo(t)?.recebidoEm ?? '', fontes[t].mapa]))
    if (ultima?.chave !== chave) ultima = { chave, valor: conferir(fontes) }
    return ultima.valor
  }

  /** O que vai para o Bling, a partir da conferência; e o que ainda falta para poder enviar. */
  function lote(): { lote: Lote | null; faltam: string[] } {
    const c = conferencia()
    const faltam: string[] = []
    for (const t of ['categorias', 'fornecedores', 'produtos'] as const) {
      if (!c[t].resultado) faltam.push(`Planilha de ${NOMES_TIPO[t].toLowerCase()} pronta na <a href="/conferencia">conferência</a>.`)
    }
    if (!cliente.conectado) faltam.push('Conectar o app ao Bling na tela <a href="/bling">Bling</a>.')
    else for (const p of pendenciasBling(lerCatalogosSalvos(banco), lerLigacoes(banco))) faltam.push(`${esc(p)} (tela <a href="/bling">Bling</a>)`)
    return { lote: loteDaConferencia(c), faltam }
  }

  function comecar(modo: Modo): void {
    const { lote: l, faltam } = lote()
    if (!l || faltam.length) throw new ErroHttp(400, 'Ainda falta preparar o envio (veja a lista na tela).')
    const catalogos = lerCatalogosSalvos(banco)
    const ligacoes = lerLigacoes(banco)
    try {
      envio.verificar(modo, catalogos, ligacoes)
    } catch (e) {
      throw new ErroHttp(400, (e as Error).message)
    }
    void envio.enviar(modo, l, catalogos, ligacoes)
  }

  async function atualizarCatalogos(): Promise<void> {
    banco.gravarConfig('bling.catalogos', JSON.stringify(await lerCatalogos(cliente)))
  }

  return async function atender(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const rota = `${req.method} ${url.pathname}`
      const origem = origemDaRequisicao(req, !!opcoes.confiarProxy)
      const sessao = lerCookies(req).sessao
      let m: RegExpExecArray | null

      // Entrar (única página aberta sem login).
      if (rota === 'GET /entrar') return html(res, telaEntrar(!acesso.temSenha, ''))
      if (rota === 'POST /entrar') {
        const form = new URLSearchParams((await corpo(req, 64 * 1024)).toString('utf8'))
        const senha = form.get('senha') ?? ''
        if (!acesso.temSenha) {
          if (senha !== form.get('confirmar')) return html(res, telaEntrar(true, 'As duas senhas não são iguais.'), 400)
          try {
            acesso.criarSenha(senha, form.get('codigo') ?? '', origem.ip)
          } catch (e) {
            return html(res, telaEntrar(true, (e as Error).message), 400)
          }
        }
        const token = acesso.entrar(senha, origem.ip)
        if (!token) {
          const msg = acesso.bloqueado(origem.ip) ? 'Muitas tentativas erradas. Espere 15 minutos.' : 'Senha errada.'
          return html(res, telaEntrar(false, msg), 401)
        }
        res.setHeader('Set-Cookie', `sessao=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${origem.https ? '; Secure' : ''}`)
        return redirecionar(res, '/')
      }
      if (!acesso.valida(sessao)) {
        if (req.headers.accept?.includes('application/json')) return json(res, 401, { erro: 'Entre de novo.' })
        return redirecionar(res, '/entrar')
      }
      // Formulário de outro site não pode agir em nome do Weslei ("null" = origem escondida, também recusa).
      const origin = req.headers.origin
      if (req.method === 'POST' && origin && hostDe(origin) !== origem.host) throw new ErroHttp(403, 'Pedido de outro site recusado.')
      if (rota === 'POST /sair') {
        acesso.sair(sessao)
        res.setHeader('Set-Cookie', 'sessao=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
        return redirecionar(res, '/entrar')
      }

      if (rota === 'GET /') return html(res, telaInicio(banco, conferencia()))
      if (rota === 'GET /planilhas') return html(res, telaPlanilhas(banco))
      if ((m = /^POST \/planilhas\/(\w+)$/.exec(rota))) return await receberPlanilha(req, res, banco, tipoDa(m[1]), lidas)
      if ((m = /^POST \/planilhas\/(\w+)\/apagar$/.exec(rota))) {
        banco.apagarArquivo(tipoDa(m[1]))
        return redirecionar(res, '/planilhas')
      }
      if ((m = /^GET \/colunas\/(\w+)$/.exec(rota))) {
        const tipo = tipoDa(m[1])
        const p = planilha(tipo)
        return html(res, telaColunas(tipo, p, mapa(tipo, p)))
      }
      if ((m = /^POST \/colunas\/(\w+)$/.exec(rota))) {
        const tipo = tipoDa(m[1])
        const form = new URLSearchParams((await corpo(req, 1024 * 1024)).toString('utf8'))
        banco.guardarMapa(tipo, Object.fromEntries(CAMPOS[tipo].map(({ chave }) => [chave, form.get(chave) ?? ''])))
        return redirecionar(res, `/conferencia/${tipo}`)
      }
      if (rota === 'GET /conferencia') return html(res, telaConferencia(banco, conferencia()))
      if ((m = /^GET \/conferencia\/(\w+)$/.exec(rota))) {
        const tipo = tipoDa(m[1])
        return html(res, telaConferenciaTipo(banco, conferencia()[tipo]))
      }
      if ((m = /^GET \/conferencia\/(\w+)\/problemas\.csv$/.exec(rota))) {
        const tipo = tipoDa(m[1])
        return csv(res, `problemas-${tipo}.csv`, conferencia()[tipo].resultado?.problemas ?? [])
      }

      // ---------- Bling ----------
      if (rota === 'GET /bling') {
        const catalogos = lerCatalogosSalvos(banco)
        const ligacoes = lerLigacoes(banco)
        return html(
          res,
          telaBling(
            {
              clientId: credenciais.clientId,
              temSecret: credenciais.temSecret,
              conectado: cliente.conectado,
              expiraEm: credenciais.tokens()?.expiraEm ?? null,
              catalogos,
              ligacoes,
              pendencias: cliente.conectado ? pendenciasBling(catalogos, ligacoes) : []
            },
            alerta(url)
          )
        )
      }
      if (rota === 'POST /bling/app') {
        const form = new URLSearchParams((await corpo(req, 64 * 1024)).toString('utf8'))
        const clientId = (form.get('clientId') ?? '').trim()
        if (!clientId) throw new ErroHttp(400, 'Informe o Client ID.')
        credenciais.gravarApp(clientId, form.get('clientSecret') ?? '')
        return redirecionar(res, `/bling?ok=${encodeURIComponent('App salvo. Agora clique em "Conectar ao Bling".')}`)
      }
      if (rota === 'GET /bling/conectar') {
        if (!credenciais.temSecret) return redirecionar(res, `/bling?erro=${encodeURIComponent('Salve o Client Secret primeiro.')}`)
        const estado = randomBytes(24).toString('base64url')
        banco.gravarConfig('oauth.estado', JSON.stringify({ estado, expira: Date.now() + 10 * 60_000 }))
        return redirecionar(res, urlAutorizacao(credenciais.clientId, estado))
      }
      if (rota === 'GET /bling/callback') {
        const salvo = JSON.parse(banco.lerConfig('oauth.estado') ?? 'null') as { estado: string; expira: number } | null
        banco.gravarConfig('oauth.estado', null)
        const codigo = url.searchParams.get('code')
        if (!codigo || !salvo || salvo.expira < Date.now() || url.searchParams.get('state') !== salvo.estado) {
          return redirecionar(res, `/bling?erro=${encodeURIComponent('Autorização inválida ou vencida. Clique em "Conectar ao Bling" de novo.')}`)
        }
        const app = credenciais.app()!
        try {
          credenciais.gravarTokens(await trocarCodigo(opcoes.fetch ?? fetch, app.clientId, app.clientSecret, codigo))
          await atualizarCatalogos()
        } catch (e) {
          return redirecionar(res, `/bling?erro=${encodeURIComponent((e as Error).message)}`)
        }
        return redirecionar(res, `/bling?ok=${encodeURIComponent('Conectado ao Bling.')}`)
      }
      if (rota === 'POST /bling/catalogos') {
        try {
          await atualizarCatalogos()
        } catch (e) {
          return redirecionar(res, `/bling?erro=${encodeURIComponent((e as Error).message)}`)
        }
        return redirecionar(res, `/bling?ok=${encodeURIComponent('Cadastros do Bling atualizados.')}`)
      }
      if (rota === 'POST /bling/deposito') {
        const form = new URLSearchParams((await corpo(req, 64 * 1024)).toString('utf8'))
        banco.gravarConfig('ligacoes', JSON.stringify({ ...lerLigacoes(banco), deposito: Number(form.get('deposito')) || null }))
        return redirecionar(res, `/bling?ok=${encodeURIComponent('Depósito salvo.')}`)
      }

      // ---------- Ligações das contas a pagar ----------
      if (rota === 'GET /ligacoes' || rota === 'POST /ligacoes') {
        const contas = (conferencia().contas.resultado?.registros ?? []) as Conta[]
        const distintos = (f: (c: Conta) => string) => [...new Set(contas.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
        const categorias = distintos((c) => c.categoria)
        const formas = distintos((c) => c.formaPagamento)
        if (req.method === 'POST') {
          const form = new URLSearchParams((await corpo(req, 1024 * 1024)).toString('utf8'))
          const ler = (campo: string, nomes: string[]) =>
            Object.fromEntries(nomes.map((n, i) => [form.get(`${campo}Nome${i}`) ?? n, Number(form.get(`${campo}${i}`))]).filter(([, id]) => id))
          banco.gravarConfig('ligacoes', JSON.stringify({ ...lerLigacoes(banco), categorias: ler('cat', categorias), formas: ler('forma', formas) }))
          return redirecionar(res, `/ligacoes?ok=${encodeURIComponent('Ligações salvas.')}`)
        }
        return html(res, telaLigacoes(categorias, formas, lerCatalogosSalvos(banco), lerLigacoes(banco), alerta(url)))
      }

      // ---------- Envio ----------
      if (rota === 'GET /envio') {
        const { lote: l, faltam } = lote()
        const contas = l?.contas ?? []
        const ligacoes = lerLigacoes(banco)
        // Sem ligação a conta vai sem categoria/forma (fica anotado): é aviso, não impede o envio.
        const semLigacao = contas.some((c) => (c.categoria && !ligacoes.categorias[c.categoria]) || (c.formaPagamento && !ligacoes.formas[c.formaPagamento]))
        return html(
          res,
          telaEnvio(
            {
              faltam,
              estado: envio.estado,
              teste: l ? envio.contagem('teste', loteDeTeste(l)) : null,
              completo: l ? envio.contagem('completo', l) : null,
              temTestes: envio.temTestes(),
              testesCriados: envio.testesCriados().length
            },
            alerta(url) + (semLigacao && l ? `<div class="alerta aviso">Há contas com categoria ou forma de pagamento sem ligação. <a href="/ligacoes">Ligar agora</a>.</div>` : '')
          )
        )
      }
      if (rota === 'GET /envio/estado') return json(res, 200, { rodando: envio.estado.rodando, html: andamento(envio.estado) })
      if ((m = /^POST \/envio\/(teste|completo)$/.exec(rota))) {
        comecar(m[1] as Modo)
        return redirecionar(res, '/envio')
      }
      if (rota === 'POST /envio/pausar') {
        envio.pausar()
        return redirecionar(res, '/envio')
      }
      if (rota === 'POST /envio/apagar-testes') {
        try {
          const r = await envio.apagarTestes()
          const msg = r.falhas.length ? `Apagados ${r.apagados}; não deu para apagar: ${r.falhas.join('; ')}` : `Apagados ${r.apagados} registros de teste do Bling.`
          return redirecionar(res, `/envio?${r.falhas.length ? 'erro' : 'ok'}=${encodeURIComponent(msg)}`)
        } catch (e) {
          return redirecionar(res, `/envio?erro=${encodeURIComponent((e as Error).message)}`)
        }
      }

      // ---------- Relatório ----------
      if (rota === 'GET /relatorio' || rota === 'GET /relatorio.csv') {
        const modo: Modo = url.searchParams.get('modo') === 'teste' ? 'teste' : 'completo'
        const { lote: l } = lote()
        const ocorrencias = envio.ocorrencias(modo)
        if (rota === 'GET /relatorio.csv') {
          return csvLinhas(res, `relatorio-${modo}.csv`, [
            ['Etapa', 'Registro', 'Situação', 'Mensagem'],
            ...ocorrencias.map((o) => [NOMES_ETAPA[o.etapa], o.chave, o.status === 'erro' ? 'erro' : 'aviso', o.mensagem])
          ])
        }
        const contagem = l ? envio.contagem(modo, modo === 'teste' ? loteDeTeste(l) : l) : null
        return html(res, telaRelatorio(modo, contagem, ocorrencias))
      }

      throw new ErroHttp(404, 'Página não encontrada.')
    } catch (e) {
      const status = e instanceof ErroHttp ? e.status : 500
      if (status === 500) console.error(e)
      const mensagem = e instanceof ErroHttp ? e.message : 'Erro inesperado. Veja o registro do servidor.'
      if (req.headers.accept?.includes('application/json')) return json(res, status, { erro: mensagem })
      html(res, pagina('Algo deu errado', '', `<div class="cartao"><p>${esc(mensagem)}</p><a class="botao leve" href="/">Voltar ao início</a></div>`), status)
    }
  }
}

function hostDe(origin: string): string | null {
  try {
    return new URL(origin).host
  } catch {
    return null
  }
}

function tipoDa(nome: string): Tipo {
  if (!(TIPOS as readonly string[]).includes(nome)) throw new ErroHttp(404, 'Planilha desconhecida.')
  return nome as Tipo
}

async function receberPlanilha(req: IncomingMessage, res: ServerResponse, banco: Banco, tipo: Tipo, lidas: Map<Tipo, unknown>) {
  const conteudo = await corpo(req, LIMITE_ARQUIVO)
  const nome = decodeURIComponent(String(req.headers['x-nome-arquivo'] ?? 'planilha'))
  let p: Planilha
  try {
    p = lerPlanilha(conteudo)
  } catch (e) {
    throw new ErroHttp(400, `Não consegui ler o arquivo: ${(e as Error).message}`)
  }
  if (p.colunas.length === 0) throw new ErroHttp(400, 'A planilha está vazia.')
  banco.guardarArquivo(tipo, nome, conteudo, p.linhas.length)
  lidas.delete(tipo)
  json(res, 200, { ok: true, linhas: p.linhas.length, colunas: p.colunas.length })
}

async function corpo(req: IncomingMessage, limite: number): Promise<Buffer> {
  const partes: Buffer[] = []
  let total = 0
  for await (const parte of req) {
    total += (parte as Buffer).length
    if (total > limite) throw new ErroHttp(413, `Arquivo grande demais (máximo ${limite / 1024 / 1024} MB).`)
    partes.push(parte as Buffer)
  }
  return Buffer.concat(partes)
}

const SEGURANCA = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // same-origin: o navegador manda a origem certa nos formulários do próprio app (com no-referrer ela vira "null").
  'Referrer-Policy': 'same-origin',
  'Cache-Control': 'no-store'
}

function html(res: ServerResponse, conteudo: string, status = 200) {
  res.writeHead(status, { ...SEGURANCA, 'Content-Type': 'text/html; charset=utf-8' }).end(conteudo)
}

function json(res: ServerResponse, status: number, dados: unknown) {
  res.writeHead(status, { ...SEGURANCA, 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(dados))
}

function redirecionar(res: ServerResponse, para: string) {
  res.writeHead(303, { ...SEGURANCA, Location: para }).end()
}

/** Lista de problemas para abrir no Excel. */
function csv(res: ServerResponse, nome: string, problemas: Problema[]) {
  csvLinhas(res, nome, [['Nível', 'Regra', 'Linha', 'Código', 'Mensagem'], ...problemas.map((p) => [p.nivel, ROTULOS[p.regra] ?? p.regra, p.linha, p.codigo, p.mensagem])])
}

/** CSV para o Excel: UTF-8 com BOM (acentos certos) e ponto e vírgula. */
function csvLinhas(res: ServerResponse, nome: string, linhas: unknown[][]) {
  const campo = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
  res
    .writeHead(200, { ...SEGURANCA, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nome}"` })
    .end('\ufeff' + linhas.map((l) => l.map(campo).join(';')).join('\r\n'))
}

// ---------- Telas ----------

function contagem(c: ConferenciaTipo) {
  const ps = c.resultado?.problemas ?? []
  return { erros: ps.filter((p) => p.nivel === 'erro').length, avisos: ps.filter((p) => p.nivel === 'aviso').length }
}

function situacao(banco: Banco, c: ConferenciaTipo): string {
  if (!banco.arquivo(c.tipo)) {
    return c.tipo === 'vinculos' && c.resultado ? '<span class="etiqueta ok">pelo cadastro de produtos</span>' : '<span class="etiqueta neutro">falta enviar</span>'
  }
  if (c.faltando.length) return `<span class="etiqueta erro">faltam ${c.faltando.length} colunas</span>`
  if (!c.resultado) return `<span class="etiqueta neutro">${esc(c.pendencia ?? 'aguardando')}</span>`
  const { erros, avisos } = contagem(c)
  return [
    erros ? `<span class="etiqueta erro">${formatar(erros)} erros</span>` : '',
    avisos ? `<span class="etiqueta aviso">${formatar(avisos)} avisos</span>` : '',
    !erros && !avisos ? '<span class="etiqueta ok">tudo certo</span>' : ''
  ].join(' ')
}

function telaInicio(banco: Banco, conf: Record<Tipo, ConferenciaTipo>): string {
  const linhas = TIPOS.map((t) => {
    const a = banco.arquivo(t)
    const registros = conf[t].resultado?.registros.length
    return `<tr>
      <td><strong>${esc(NOMES_TIPO[t])}</strong><div class="ajuda">${esc(a?.nome ?? '')}</div></td>
      <td class="n">${a ? formatar(a.linhas) : '–'}</td>
      <td class="n">${registros !== undefined ? formatar(registros) : '–'}</td>
      <td>${situacao(banco, conf[t])}</td>
      <td><div class="acoes">${a ? `<a href="/colunas/${t}">Colunas</a>` : ''} ${conf[t].resultado ? `<a href="/conferencia/${t}">Conferência</a>` : ''}</div></td>
    </tr>`
  }).join('')
  return pagina(
    'Início',
    '/',
    `<div class="cartao">
      <h2>Como usar</h2>
      <ol>
        <li><a href="/planilhas">Envie as planilhas</a> exportadas do Superus.</li>
        <li>Confira a ligação das colunas de cada uma (já vem preenchida).</li>
        <li>Veja a <a href="/conferencia">conferência</a>: erros, avisos e os totais para bater com o Superus.</li>
      </ol>
      <p class="ajuda">Etapa 1: nada é enviado ao Bling ainda.</p>
    </div>
    <div class="cartao rolagem"><table>
      <tr><th>Planilha</th><th class="n">Linhas</th><th class="n">Vão para o Bling</th><th>Situação</th><th></th></tr>
      ${linhas}
    </table></div>`
  )
}

function telaPlanilhas(banco: Banco): string {
  const cartoes = TIPOS.map((t) => {
    const a = banco.arquivo(t)
    const info = a
      ? `<p><span class="etiqueta ok">recebida</span> ${esc(a.nome)} · ${formatar(a.linhas)} linhas · ${esc(new Date(a.recebidoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</p>`
      : '<p><span class="etiqueta neutro">falta enviar</span></p>'
    return `<div class="cartao">
      <h2>${esc(NOMES_TIPO[t])}</h2>
      <p class="ajuda">${esc(ORIGEM[t])}</p>
      ${info}
      <div class="acoes">
        <label class="botao leve">${a ? 'Trocar arquivo' : 'Escolher arquivo'}<input type="file" accept=".xlsx,.csv" data-tipo="${t}" hidden></label>
        ${a ? `<a class="botao leve" href="/colunas/${t}">Ligar colunas</a>
        <form method="post" action="/planilhas/${t}/apagar" onsubmit="return confirm('Tirar esta planilha do app?')"><button class="botao perigo">Tirar</button></form>` : ''}
        <span class="ajuda" id="estado-${t}"></span>
      </div>
    </div>`
  }).join('')
  return pagina(
    'Planilhas',
    '/planilhas',
    `<p class="ajuda">XLSX ou CSV, como saem do Superus. Os arquivos ficam só no servidor do app.</p>
    ${cartoes}
    <script>
      for (const input of document.querySelectorAll('input[type=file]')) {
        input.addEventListener('change', async () => {
          const arquivo = input.files[0]
          if (!arquivo) return
          const estado = document.getElementById('estado-' + input.dataset.tipo)
          estado.textContent = 'Enviando e lendo ' + arquivo.name + '...'
          const r = await fetch('/planilhas/' + input.dataset.tipo, {
            method: 'POST', body: arquivo,
            headers: { 'X-Nome-Arquivo': encodeURIComponent(arquivo.name), Accept: 'application/json' }
          })
          const dados = await r.json().catch(() => ({}))
          if (r.ok) location.reload()
          else estado.textContent = dados.erro || 'Não deu certo. Tente de novo.'
        })
      }
    </script>`
  )
}

function telaColunas(tipo: Tipo, p: Planilha | null, mapa: Mapa): string {
  if (!p) {
    return pagina(`Colunas: ${NOMES_TIPO[tipo]}`, '/planilhas', `<div class="cartao"><p>Envie a planilha primeiro.</p><a class="botao" href="/planilhas">Ir para planilhas</a></div>`)
  }
  // Até 3 exemplos de cada coluna, para o Weslei reconhecer o conteúdo.
  const exemplos: Record<string, string> = {}
  for (const c of p.colunas) {
    exemplos[c] = [...new Set(p.linhas.map((l) => l[c]).filter(Boolean))].slice(0, 3).join(' · ')
  }
  const linhas = CAMPOS[tipo].map((campo) => {
    const opcoes = ['', ...p.colunas]
      .map((c) => `<option value="${esc(c)}"${c === mapa[campo.chave] ? ' selected' : ''}>${c ? esc(c) : '— nenhuma —'}</option>`)
      .join('')
    return `<tr>
      <td><strong>${esc(campo.rotulo)}</strong>${campo.obrigatorio ? ' <span class="etiqueta erro">obrigatório</span>' : ''}${campo.ajuda ? `<div class="ajuda">${esc(campo.ajuda)}</div>` : ''}</td>
      <td><select name="${campo.chave}">${opcoes}</select><div class="exemplo" data-exemplo="${campo.chave}">${esc(exemplos[mapa[campo.chave]] ?? '')}</div></td>
    </tr>`
  }).join('')
  return pagina(
    `Colunas: ${NOMES_TIPO[tipo]}`,
    '/planilhas',
    `<p class="ajuda">Para cada campo, a coluna do Superus que traz a informação. Já vem preenchido; confira os exemplos.</p>
    <form method="post" class="cartao rolagem">
      <table><tr><th>Campo</th><th>Coluna do Superus e exemplos</th></tr>${linhas}</table>
      <p class="acoes"><button class="botao">Salvar e conferir</button> <a class="botao leve" href="/planilhas">Voltar</a></p>
    </form>
    <script>
      const exemplos = ${JSON.stringify(exemplos).replace(/</g, '\\u003c')}
      for (const s of document.querySelectorAll('select')) {
        s.addEventListener('change', () => { document.querySelector('[data-exemplo="' + s.name + '"]').textContent = exemplos[s.value] || '' })
      }
    </script>`
  )
}

function blocoTotais(c: ConferenciaTipo): string {
  if (!c.resultado) return ''
  return `<div class="grade">${c.resultado.totais
    .map((t) => `<div class="cartao"><div class="numero">${formatar(t.valor, t.formato)}</div><div class="rotulo">${esc(t.rotulo)}</div></div>`)
    .join('')}</div>`
}

function telaConferencia(banco: Banco, conf: Record<Tipo, ConferenciaTipo>): string {
  const blocos = TIPOS.map((t) => {
    const c = conf[t]
    return `<div class="cartao">
      <div class="acoes" style="justify-content: space-between"><h2>${esc(NOMES_TIPO[t])}</h2><div>${situacao(banco, c)}</div></div>
      ${c.resultado ? blocoTotais(c) + `<a class="botao leve" href="/conferencia/${t}">Ver erros e avisos</a>` : `<p class="ajuda">${esc(c.faltando.length ? `Faltam colunas: ${c.faltando.map((f) => f.rotulo).join(', ')}.` : c.pendencia ?? '')}</p>`}
    </div>`
  }).join('')
  return pagina('Conferência', '/conferencia', `<p class="ajuda">Os totais servem para bater com o Superus antes de enviar.</p>${blocos}`)
}

function telaConferenciaTipo(banco: Banco, c: ConferenciaTipo): string {
  const titulo = `Conferência: ${NOMES_TIPO[c.tipo]}`
  if (!c.resultado) {
    const motivo = c.faltando.length
      ? `Faltam colunas obrigatórias: ${c.faltando.map((f) => f.rotulo).join(', ')}. <a href="/colunas/${c.tipo}">Ligar colunas</a>.`
      : esc(c.pendencia ?? '')
    return pagina(titulo, '/conferencia', `<div class="cartao"><p>${motivo}</p></div>`)
  }
  const grupos = new Map<string, Problema[]>()
  for (const p of c.resultado.problemas) grupos.set(`${p.nivel}|${p.regra}`, [...(grupos.get(`${p.nivel}|${p.regra}`) ?? []), p])
  const ordem = [...grupos.entries()].sort(([a, x], [b, y]) => (a.startsWith('erro') === b.startsWith('erro') ? y.length - x.length : a.startsWith('erro') ? -1 : 1))
  const lista = ordem
    .map(([k, ps]) => {
      const [nivel, regra] = k.split('|')
      const mostrar = ps.slice(0, 100)
      return `<details>
        <summary><span class="etiqueta ${nivel}">${nivel === 'erro' ? 'erro' : 'aviso'}</span> <strong>${esc(ROTULOS[regra] ?? regra)}</strong> <span class="ajuda">${formatar(ps.length)}</span></summary>
        <div class="rolagem"><table><tr><th class="n">Linha</th><th>Código</th><th>O que houve</th></tr>
        ${mostrar.map((p) => `<tr><td class="n">${p.linha}</td><td>${esc(p.codigo)}</td><td>${esc(p.mensagem)}</td></tr>`).join('')}
        </table>${ps.length > mostrar.length ? `<p class="ajuda">Mostrando ${mostrar.length} de ${formatar(ps.length)}. A lista completa está no arquivo.</p>` : ''}</div>
      </details>`
    })
    .join('')
  return pagina(
    titulo,
    '/conferencia',
    `${blocoTotais(c)}
    <div class="cartao">
      <div class="acoes" style="justify-content: space-between"><h2>Erros e avisos</h2>
        <div class="acoes">${situacao(banco, c)} <a class="botao leve" href="/conferencia/${c.tipo}/problemas.csv">Baixar lista (Excel)</a> <a class="botao leve" href="/colunas/${c.tipo}">Colunas</a></div></div>
      <p class="ajuda">Erro: não vai para o Bling. Aviso: vai, mas vale conferir.</p>
      ${lista || '<p>Nenhum problema encontrado.</p>'}
    </div>`
  )
}
