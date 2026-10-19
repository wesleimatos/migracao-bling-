// Modo nuvem (decisão do Weslei, 19/10/2026): o Claude da nuvem roda o envio por comandos, sem o
// app instalado. Usa as mesmas regras e a mesma fila do app. Ver docs/EXECUCAO-NUVEM.md.
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Banco } from './banco.ts'
import { lerCatalogos, lerCatalogosSalvos, lerLigacoes, type Ligacoes, pendenciasBling } from './bling/catalogos.ts'
import { BlingCliente } from './bling/cliente.ts'
import { Cofre } from './bling/cofre.ts'
import { CLIENT_ID_PADRAO, CredenciaisBling } from './bling/credenciais.ts'
import { ETAPAS, Envio, type Modo, loteDeTeste, NOMES_ETAPA } from './bling/envio.ts'
import { extrairCodigo, trocarCodigo, urlAutorizacao } from './bling/oauth.ts'
import { formatar } from './html.ts'
import { loteDaConferencia, mapaValido } from './montagem.ts'
import { lerPlanilha } from './planilhas/ler.ts'
import { conferir, type Fonte } from './regras/conferencia.ts'
import type { Conta } from './regras/contas.ts'
import { NOMES_TIPO, type Tipo, TIPOS } from './regras/tipos.ts'

const pasta = process.env.DADOS ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dados')
const banco = new Banco(pasta)
const credenciais = new CredenciaisBling(banco, new Cofre(pasta))
const cliente = new BlingCliente(credenciais)
const envio = new Envio(banco, cliente)

function conferencia() {
  const fontes = Object.fromEntries(
    TIPOS.map((t) => {
      const p = banco.arquivo(t) ? lerPlanilha(banco.conteudo(t)) : null
      return [t, { planilha: p, mapa: mapaValido(banco, t, p) }]
    })
  ) as Record<Tipo, Fonte>
  return conferir(fontes)
}

function lote() {
  const l = loteDaConferencia(conferencia())
  if (!l) throw new Error('Faltam as planilhas de categorias, fornecedores e produtos (comando "planilha").')
  return l
}

function exigirSecret(): string {
  const s = process.env.BLING_CLIENT_SECRET?.trim()
  if (!s) throw new Error('Falta a variável BLING_CLIENT_SECRET no ambiente da nuvem (o Weslei cadastra nas configurações; nunca pelo chat).')
  return s
}

function imprimirContagem(modo: Modo) {
  const l = lote()
  const c = envio.contagem(modo, modo === 'teste' ? loteDeTeste(l) : l)
  console.log(`Etapa                       Total  Enviados  Já existiam  Erros  Faltam`)
  for (const e of ETAPAS) {
    const x = c[e]
    console.log(`${NOMES_ETAPA[e].padEnd(26)} ${formatar(x.total).padStart(6)} ${formatar(x.enviado).padStart(9)} ${formatar(x.pulado).padStart(12)} ${formatar(x.erro).padStart(6)} ${formatar(x.pendente).padStart(7)}`)
  }
}

const comandos: Record<string, (args: string[]) => Promise<void> | void> = {
  /** planilha <tipo> <arquivo>: guarda a planilha do Superus (tipos: categorias, fornecedores, produtos, vinculos, contas). */
  planilha([tipo, arquivo]) {
    if (!(TIPOS as readonly string[]).includes(tipo)) throw new Error(`Tipo desconhecido: ${tipo}. Use: ${TIPOS.join(', ')}.`)
    const conteudo = readFileSync(arquivo)
    const p = lerPlanilha(conteudo)
    banco.guardarArquivo(tipo as Tipo, arquivo.split('/').at(-1)!, conteudo, p.linhas.length)
    console.log(`${NOMES_TIPO[tipo as Tipo]}: ${formatar(p.linhas.length)} linhas, ${p.colunas.length} colunas.`)
  },

  /** conferir: totais, erros e avisos de cada planilha. */
  conferir() {
    for (const [t, c] of Object.entries(conferencia())) {
      console.log(`\n== ${NOMES_TIPO[t as Tipo]}`)
      if (c.faltando.length) console.log(`   Faltam colunas: ${c.faltando.map((f) => f.rotulo).join(', ')}`)
      if (!c.resultado) {
        console.log(`   ${c.pendencia ?? ''}`)
        continue
      }
      for (const x of c.resultado.totais) console.log(`   ${x.rotulo}: ${formatar(x.valor, x.formato)}`)
      const grupos = new Map<string, number>()
      for (const p of c.resultado.problemas) grupos.set(`${p.nivel} ${p.regra}`, (grupos.get(`${p.nivel} ${p.regra}`) ?? 0) + 1)
      for (const [k, n] of grupos) console.log(`   ${k}: ${formatar(n)}`)
    }
  },

  /** autorizar: guarda o app (Secret do ambiente) e mostra o link para o Weslei autorizar no Bling. */
  autorizar() {
    credenciais.gravarApp(process.env.BLING_CLIENT_ID?.trim() || credenciais.clientId || CLIENT_ID_PADRAO, exigirSecret())
    const estado = randomBytes(24).toString('base64url')
    banco.gravarConfig('oauth.estado', JSON.stringify({ estado, expira: Date.now() + 30 * 60_000 }))
    console.log(urlAutorizacao(credenciais.clientId, estado))
  },

  /** conectar <endereço colado pelo Weslei>: troca o código pelo acesso e lê os cadastros do Bling. */
  async conectar([endereco]) {
    const { codigo, estado } = extrairCodigo(endereco ?? '')
    const salvo = JSON.parse(banco.lerConfig('oauth.estado') ?? 'null') as { estado: string; expira: number } | null
    if (estado && salvo && estado !== salvo.estado) throw new Error('Esse endereço é de outra autorização. Gere o link de novo (comando "autorizar").')
    const app = credenciais.app() ?? { clientId: credenciais.clientId, clientSecret: exigirSecret() }
    credenciais.gravarTokens(await trocarCodigo(fetch, app.clientId, app.clientSecret, codigo))
    banco.gravarConfig('oauth.estado', null)
    await comandos.catalogos([])
  },

  /** catalogos: lê de novo os cadastros do Bling (grupos, depósitos, categorias de despesa, formas). */
  async catalogos() {
    const c = await lerCatalogos(cliente)
    banco.gravarConfig('bling.catalogos', JSON.stringify(c))
    console.log(`Conectado. Depósitos: ${c.depositos.map((d) => d.descricao).join(', ')}. Grupos: ${c.grupos.map((g) => g.nome).join(', ')}.`)
    console.log(`Categorias de despesa: ${c.categoriasDespesa.length}. Formas de pagamento: ${c.formasPagamento.length}.`)
    const p = pendenciasBling(c, lerLigacoes(banco))
    console.log(p.length ? `Falta: ${p.join(' ')}` : 'Bling pronto para o envio.')
  },

  /** ligar-contas: liga categorias e formas das contas pelo nome igual; lista as que sobraram. */
  ligarContas() {
    const c = lerCatalogosSalvos(banco)
    if (!c) throw new Error('Leia os cadastros do Bling primeiro (comando "catalogos").')
    const contas = lote().contas as Conta[]
    const l: Ligacoes = lerLigacoes(banco)
    const igual = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase()
    const sobrou: string[] = []
    for (const nome of new Set(contas.map((x) => x.categoria).filter(Boolean))) {
      const achada = c.categoriasDespesa.find((x) => igual(x.descricao, nome))
      if (achada) l.categorias[nome] = achada.id
      else if (!l.categorias[nome]) sobrou.push(`categoria "${nome}"`)
    }
    for (const nome of new Set(contas.map((x) => x.formaPagamento).filter(Boolean))) {
      const achada = c.formasPagamento.find((x) => igual(x.descricao, nome))
      if (achada) l.formas[nome] = achada.id
      else if (!l.formas[nome]) sobrou.push(`forma "${nome}"`)
    }
    banco.gravarConfig('ligacoes', JSON.stringify(l))
    console.log(sobrou.length ? `Sem par no Bling (vão em branco): ${sobrou.join(', ')}` : 'Todas as categorias e formas das contas estão ligadas.')
  },

  /** ligar <categoria|forma> <nome no Superus> <id no Bling>: ligação feita à mão. */
  ligar([qual, nome, id]) {
    const l = lerLigacoes(banco)
    if (qual === 'categoria') l.categorias[nome] = Number(id)
    else if (qual === 'forma') l.formas[nome] = Number(id)
    else throw new Error('Use: ligar categoria|forma "<nome no Superus>" <id no Bling>')
    banco.gravarConfig('ligacoes', JSON.stringify(l))
  },

  /** enviar <teste|completo>: envia (ou continua) e mostra o andamento a cada 30 s. */
  async enviar([modo]) {
    if (modo !== 'teste' && modo !== 'completo') throw new Error('Use: enviar teste | enviar completo')
    const timer = setInterval(() => {
      const e = envio.estado
      if (e.etapa) console.log(`[${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] ${NOMES_ETAPA[e.etapa]}: ${formatar(e.feitos)} de ${formatar(e.total)}`)
    }, 30_000)
    try {
      await envio.enviar(modo, lote(), lerCatalogosSalvos(banco), lerLigacoes(banco))
    } finally {
      clearInterval(timer)
    }
    console.log(envio.estado.mensagem)
    imprimirContagem(modo)
  },

  /** apagar-testes: remove do Bling o que o envio de teste criou. */
  async apagarTestes() {
    const r = await envio.apagarTestes()
    console.log(`Apagados: ${r.apagados}.${r.falhas.length ? ` Não deu para apagar: ${r.falhas.join('; ')}` : ''}`)
  },

  /** relatorio <teste|completo>: contagem, erros e avisos; grava a lista completa em dados/. */
  relatorio([modo = 'completo']) {
    const m = modo === 'teste' ? 'teste' : 'completo'
    imprimirContagem(m)
    const ocorrencias = envio.ocorrencias(m)
    for (const o of ocorrencias.slice(0, 40)) console.log(`${o.status === 'erro' ? 'ERRO ' : 'aviso'} ${NOMES_ETAPA[o.etapa]} ${o.chave}: ${o.mensagem}`)
    if (ocorrencias.length > 40) console.log(`... e mais ${ocorrencias.length - 40}.`)
    const arquivo = join(pasta, `relatorio-${m}.csv`)
    const campo = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
    const linhas = [['Etapa', 'Registro', 'Situação', 'Mensagem'], ...ocorrencias.map((o) => [NOMES_ETAPA[o.etapa], o.chave, o.status === 'erro' ? 'erro' : 'aviso', o.mensagem])]
    writeFileSync(arquivo, '\ufeff' + linhas.map((l) => l.map(campo).join(';')).join('\r\n'))
    console.log(`Lista completa: ${arquivo}`)
  }
}

const [comando, ...args] = process.argv.slice(2)
const nome = (comando ?? '').replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
if (!comandos[nome]) {
  console.log('Comandos: planilha, conferir, autorizar, conectar, catalogos, ligar-contas, ligar, enviar, apagar-testes, relatorio')
  process.exit(1)
}
try {
  await comandos[nome](args)
} catch (e) {
  console.error(`Erro: ${(e as Error).message}`)
  process.exitCode = 1
} finally {
  banco.fechar()
}
