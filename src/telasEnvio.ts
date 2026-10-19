import type { Catalogos, Ligacoes } from './bling/catalogos.ts'
import { depositoEscolhido, idGrupo, idTipoFornecedor } from './bling/catalogos.ts'
import { type Contagem, ETAPAS, type Etapa, type EstadoEnvio, type Modo, NOMES_ETAPA } from './bling/envio.ts'
import { esc, formatar, pagina } from './html.ts'
import { TAMANHO_MINIMO_SENHA } from './seguranca.ts'

/** Aviso que volta na URL depois de uma ação (?ok=... ou ?erro=...). */
export function alerta(url: URL): string {
  const ok = url.searchParams.get('ok')
  const erro = url.searchParams.get('erro')
  if (ok) return `<div class="alerta ok">${esc(ok)}</div>`
  if (erro) return `<div class="alerta erro">${esc(erro)}</div>`
  return ''
}

const sim = (v: boolean, texto: string) => `<span class="etiqueta ${v ? 'ok' : 'erro'}">${v ? '✓' : '✗'}</span> ${esc(texto)}`

export function telaEntrar(criar: boolean, mensagem: string): string {
  const corpo = criar
    ? `<p>Primeiro acesso: crie a senha do app (pelo menos ${TAMANHO_MINIMO_SENHA} caracteres). Só você vai usar.</p>
       <label class="campo"><span>Código de primeiro acesso</span><input type="text" name="codigo" autocomplete="off" required></label>
       <p class="ajuda">Peça o código à sessão VPS (está no arquivo <code>codigo-primeiro-acesso</code>, na pasta de dados do app). Ele só vale uma vez.</p>
       <label class="campo"><span>Senha nova</span><input type="password" name="senha" autocomplete="new-password" required minlength="${TAMANHO_MINIMO_SENHA}"></label>
       <label class="campo"><span>Repita a senha</span><input type="password" name="confirmar" autocomplete="new-password" required></label>
       <button class="botao">Criar senha e entrar</button>`
    : `<label class="campo"><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required autofocus></label>
       <button class="botao">Entrar</button>`
  return pagina(
    criar ? 'Criar senha' : 'Entrar',
    '',
    `${mensagem ? `<div class="alerta erro">${esc(mensagem)}</div>` : ''}<form method="post" action="/entrar" class="cartao">${corpo}</form>`,
    false
  )
}

export interface DadosBling {
  clientId: string
  temSecret: boolean
  conectado: boolean
  expiraEm: number | null
  catalogos: Catalogos | null
  ligacoes: Ligacoes
  pendencias: string[]
}

export function telaBling(d: DadosBling, aviso: string): string {
  const c = d.catalogos
  const dep = c ? depositoEscolhido(c, d.ligacoes) : null
  const cadastros = c
    ? `<div class="cartao">
        <div class="acoes" style="justify-content: space-between"><h2>Cadastros lidos do Bling</h2>
          <form method="post" action="/bling/catalogos"><button class="botao leve">Atualizar</button></form></div>
        <p class="ajuda">Lidos em ${esc(new Date(c.lidoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}.</p>
        <ul>
          <li>${sim(!!idGrupo(c, 'SEM ST'), 'Grupo de produtos "SEM ST"')}</li>
          <li>${sim(!!idGrupo(c, 'COM ST'), 'Grupo de produtos "COM ST"')}</li>
          <li>${sim(!!idTipoFornecedor(c), 'Tipo de contato "Fornecedor"')}</li>
          <li>${formatar(c.categoriasDespesa.length)} categorias de despesa e ${formatar(c.formasPagamento.length)} formas de pagamento (para as contas a pagar)</li>
        </ul>
        <form method="post" action="/bling/deposito" class="acoes">
          <label class="campo" style="margin:0"><span>Depósito do estoque</span>
            <select name="deposito">${c.depositos.map((x) => `<option value="${x.id}"${x.id === dep ? ' selected' : ''}>${esc(x.descricao)}${x.padrao ? ' (padrão)' : ''}</option>`).join('')}</select></label>
          <button class="botao leve">Salvar depósito</button>
        </form>
      </div>`
    : d.conectado
      ? `<div class="cartao"><form method="post" action="/bling/catalogos"><button class="botao">Ler os cadastros do Bling</button></form></div>`
      : ''
  return pagina(
    'Bling',
    '/bling',
    `${aviso}
    <div class="cartao">
      <h2>1. App "Migração" do Bling</h2>
      <form method="post" action="/bling/app">
        <label class="campo"><span>Client ID</span><input type="text" name="clientId" value="${esc(d.clientId)}" required></label>
        <label class="campo"><span>Client Secret ${d.temSecret ? '(já guardado; deixe em branco para manter)' : ''}</span>
          <input type="password" name="clientSecret" autocomplete="off" ${d.temSecret ? 'placeholder="••••••••"' : 'required'}></label>
        <p class="ajuda">O Secret é digitado só aqui e fica cifrado no servidor. Nunca mande por chat.</p>
        <button class="botao leve">Salvar</button>
      </form>
    </div>
    <div class="cartao">
      <h2>2. Conexão</h2>
      <p>${d.conectado ? `<span class="etiqueta ok">conectado</span> O acesso se renova sozinho.` : '<span class="etiqueta neutro">não conectado</span>'}</p>
      ${d.temSecret ? `<a class="botao${d.conectado ? ' leve' : ''}" href="/bling/conectar">${d.conectado ? 'Conectar de novo' : 'Conectar ao Bling'}</a>` : '<p class="ajuda">Salve o Client Secret primeiro.</p>'}
      <p class="ajuda">Abre o Bling para você autorizar; depois volta para cá.</p>
    </div>
    ${cadastros}
    ${d.pendencias.length ? `<div class="cartao"><h2>Falta para enviar</h2><ul>${d.pendencias.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : d.conectado ? '<div class="alerta ok">Bling pronto para o envio.</div>' : ''}`
  )
}

export function telaLigacoes(categorias: string[], formas: string[], c: Catalogos | null, l: Ligacoes, aviso: string): string {
  if (!c) return pagina('Ligar contas a pagar', '/envio', `<div class="cartao"><p>Conecte o Bling e leia os cadastros primeiro.</p><a class="botao" href="/bling">Ir para Bling</a></div>`)
  const linhas = (nomes: string[], opcoes: { id: number; descricao: string }[], campo: string, atual: Record<string, number>) =>
    nomes
      .map(
        (n, i) => `<tr><td>${esc(n)}<input type="hidden" name="${campo}Nome${i}" value="${esc(n)}"></td>
        <td><select name="${campo}${i}"><option value="">— deixar em branco —</option>${opcoes
          .map((o) => `<option value="${o.id}"${atual[n] === o.id ? ' selected' : ''}>${esc(o.descricao)}</option>`)
          .join('')}</select></td></tr>`
      )
      .join('')
  return pagina(
    'Ligar contas a pagar',
    '/envio',
    `${aviso}<p class="ajuda">Cada categoria e forma de pagamento do Superus com a do Bling. Crie no Bling as que faltarem e clique em "Atualizar" na tela Bling.</p>
    <form method="post" class="cartao rolagem">
      <h2>Categorias (plano de contas)</h2>
      ${categorias.length ? `<table><tr><th>No Superus</th><th>No Bling</th></tr>${linhas(categorias, c.categoriasDespesa, 'cat', l.categorias)}</table>` : '<p class="ajuda">As contas não têm categoria.</p>'}
      <h2 style="margin-top:16px">Formas de pagamento</h2>
      ${formas.length ? `<table><tr><th>No Superus</th><th>No Bling</th></tr>${linhas(formas, c.formasPagamento, 'forma', l.formas)}</table>` : '<p class="ajuda">As contas não têm forma de pagamento.</p>'}
      <p><button class="botao">Salvar</button></p>
    </form>`
  )
}

function tabelaContagem(contagem: Record<Etapa, Contagem>): string {
  return `<div class="rolagem"><table>
    <tr><th>Etapa</th><th class="n">Total</th><th class="n">Enviados</th><th class="n">Já existiam</th><th class="n">Erros</th><th class="n">Faltam</th></tr>
    ${ETAPAS.map((e) => {
      const c = contagem[e]
      return `<tr><td>${esc(NOMES_ETAPA[e])}</td><td class="n">${formatar(c.total)}</td><td class="n">${formatar(c.enviado)}</td><td class="n">${formatar(c.pulado)}</td>
        <td class="n">${c.erro ? `<span class="etiqueta erro">${formatar(c.erro)}</span>` : '0'}</td><td class="n">${formatar(c.pendente)}</td></tr>`
    }).join('')}
  </table></div>`
}

/** Tempo aproximado: uma chamada a cada 350 ms, mais as consultas para não duplicar. */
export function tempoEstimado(contagem: Record<Etapa, Contagem>): string {
  const chamadas = ETAPAS.reduce((s, e) => s + contagem[e].pendente + contagem[e].erro, 0) + contagem.fornecedores.pendente + Math.ceil(contagem.produtos.pendente / 100)
  const min = Math.ceil((chamadas * 0.35) / 60)
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`
}

export interface DadosEnvio {
  faltam: string[]
  estado: EstadoEnvio
  teste: Record<Etapa, Contagem> | null
  completo: Record<Etapa, Contagem> | null
  temTestes: boolean
  testesCriados: number
}

export function telaEnvio(d: DadosEnvio, aviso: string): string {
  const pode = d.faltam.length === 0 && !d.estado.rodando
  const progresso = `<div class="cartao" id="progresso">
      <h2>Andamento</h2>
      <div id="andamento">${andamento(d.estado)}</div>
      <form method="post" action="/envio/pausar"><button class="botao perigo" id="pausar"${d.estado.rodando ? '' : ' hidden'}>Pausar</button></form>
    </div>`
  return pagina(
    'Envio para o Bling',
    '/envio',
    `${aviso}
    ${d.faltam.length ? `<div class="cartao"><h2>Antes de enviar</h2><ul>${d.faltam.map((f) => `<li>${f}</li>`).join('')}</ul></div>` : ''}
    ${progresso}
    <div class="cartao">
      <h2>1. Envio de teste</h2>
      <p class="ajuda">Alguns registros de cada tipo, com código e nome começando por "TESTE", para conferir no Bling. Depois de aprovado, apague.</p>
      ${d.teste ? tabelaContagem(d.teste) : ''}
      <div class="acoes">
        <form method="post" action="/envio/teste"><button class="botao"${pode ? '' : ' disabled'}>${d.temTestes ? 'Enviar teste de novo / continuar' : 'Enviar teste'}</button></form>
        ${d.testesCriados ? `<form method="post" action="/envio/apagar-testes" onsubmit="return confirm('Apagar do Bling os ${d.testesCriados} registros de teste?')"><button class="botao perigo"${d.estado.rodando ? ' disabled' : ''}>Apagar testes do Bling</button></form>` : ''}
        <a href="/relatorio?modo=teste">Relatório do teste</a>
      </div>
    </div>
    <div class="cartao">
      <h2>2. Envio completo</h2>
      ${d.completo ? `${tabelaContagem(d.completo)}<p class="ajuda">Tempo aproximado do que falta: ${tempoEstimado(d.completo)}. Se parar, continua de onde parou, sem duplicar.</p>` : ''}
      ${d.temTestes ? '<p class="alerta aviso">Apague os registros de teste antes do envio completo.</p>' : ''}
      <div class="acoes">
        <form method="post" action="/envio/completo" onsubmit="return confirm('Começar (ou continuar) o envio completo para o Bling?')"><button class="botao"${pode && !d.temTestes ? '' : ' disabled'}>Começar / continuar envio completo</button></form>
        <a href="/relatorio?modo=completo">Relatório</a>
      </div>
    </div>
    <script>
      async function atualizar() {
        const r = await fetch('/envio/estado', { headers: { Accept: 'application/json' } }).catch(() => null)
        if (!r || !r.ok) return
        const d = await r.json()
        document.getElementById('andamento').innerHTML = d.html
        document.getElementById('pausar').hidden = !d.rodando
        if (!d.rodando && window.rodava) location.reload()
        window.rodava = d.rodando
      }
      window.rodava = ${d.estado.rodando}
      setInterval(atualizar, 2000)
    </script>`
  )
}

/** Trecho do andamento (também devolvido em /envio/estado para a tela se atualizar sozinha). */
export function andamento(e: EstadoEnvio): string {
  if (e.rodando && e.etapa) {
    const pct = e.total ? Math.round((e.feitos / e.total) * 100) : 0
    return `<p><span class="etiqueta aviso">enviando ${e.modo === 'teste' ? 'teste' : 'completo'}</span> ${esc(NOMES_ETAPA[e.etapa])}: ${formatar(e.feitos)} de ${formatar(e.total)}</p>
      <div class="barra"><div style="width:${pct}%"></div></div>`
  }
  if (e.rodando) return '<p><span class="etiqueta aviso">preparando</span> Lendo o que já existe no Bling...</p>'
  return e.mensagem ? `<p>${esc(e.mensagem)}</p>` : '<p class="ajuda">Nenhum envio em andamento.</p>'
}

export function telaRelatorio(modo: Modo, contagem: Record<Etapa, Contagem> | null, ocorrencias: { etapa: Etapa; chave: string; status: string; mensagem: string }[]): string {
  const erros = ocorrencias.filter((o) => o.status === 'erro')
  const avisos = ocorrencias.filter((o) => o.status !== 'erro')
  const lista = (titulo: string, itens: typeof ocorrencias, classe: string) =>
    itens.length
      ? `<details${classe === 'erro' ? ' open' : ''}><summary><span class="etiqueta ${classe}">${formatar(itens.length)}</span> <strong>${titulo}</strong></summary>
        <div class="rolagem"><table><tr><th>Etapa</th><th>Registro</th><th>O que houve</th></tr>
        ${itens.slice(0, 300).map((o) => `<tr><td>${esc(NOMES_ETAPA[o.etapa])}</td><td>${esc(o.chave)}</td><td>${esc(o.mensagem)}</td></tr>`).join('')}
        </table>${itens.length > 300 ? `<p class="ajuda">Mostrando 300 de ${formatar(itens.length)}. A lista completa está no arquivo.</p>` : ''}</div></details>`
      : ''
  return pagina(
    modo === 'teste' ? 'Relatório do teste' : 'Relatório do envio',
    '/relatorio',
    `<div class="acoes" style="margin-bottom:12px"><a class="botao leve" href="/relatorio?modo=${modo === 'teste' ? 'completo' : 'teste'}">Ver ${modo === 'teste' ? 'envio completo' : 'teste'}</a>
      <a class="botao leve" href="/relatorio.csv?modo=${modo}">Baixar lista (Excel)</a></div>
    <div class="cartao">${contagem ? tabelaContagem(contagem) : '<p>As planilhas ainda não estão prontas.</p>'}</div>
    <div class="cartao"><h2>Erros e avisos</h2>
      ${lista('Erros (não foram para o Bling)', erros, 'erro')}${lista('Avisos (foram, mas vale conferir)', avisos, 'aviso')}
      ${ocorrencias.length ? '' : '<p>Nenhum erro ou aviso.</p>'}
      ${erros.length ? `<form method="post" action="/envio/${modo}"><button class="botao">Reenviar só os erros</button></form>` : ''}
    </div>`
  )
}
