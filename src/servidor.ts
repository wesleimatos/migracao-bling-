import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Banco } from './banco.ts'
import { esc, formatar, pagina } from './html.ts'
import { lerPlanilha, type Planilha } from './planilhas/ler.ts'
import { CAMPOS, mapaPadrao } from './regras/campos.ts'
import { conferir, type ConferenciaTipo, type Fonte } from './regras/conferencia.ts'
import { type Mapa, NOMES_TIPO, type Problema, type Tipo, TIPOS } from './regras/tipos.ts'

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

/** O app (Etapa 1): planilhas, ligação de colunas e conferência com totais. Ainda sem o Bling. */
export function criarApp(banco: Banco) {
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

  /** Ligação que vale: a salva (se a coluna ainda existe na planilha) e, no resto, a padrão. */
  function mapa(tipo: Tipo, p: Planilha | null): Mapa {
    const colunas = p?.colunas ?? []
    const salvo = banco.mapaSalvo(tipo)
    const padrao = mapaPadrao(tipo, colunas)
    return Object.fromEntries(
      CAMPOS[tipo].map(({ chave }) => {
        const s = salvo[chave]
        return [chave, s !== undefined && (s === '' || colunas.includes(s)) ? s : padrao[chave]]
      })
    )
  }

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

  return async function atender(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const rota = `${req.method} ${url.pathname}`
      let m: RegExpExecArray | null
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
  'Referrer-Policy': 'no-referrer',
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

/** Lista de problemas para abrir no Excel (UTF-8 com BOM e ponto e vírgula). */
function csv(res: ServerResponse, nome: string, problemas: Problema[]) {
  const campo = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
  const linhas = [['Nível', 'Regra', 'Linha', 'Código', 'Mensagem'], ...problemas.map((p) => [p.nivel, ROTULOS[p.regra] ?? p.regra, p.linha, p.codigo, p.mensagem])]
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
