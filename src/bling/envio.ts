import type { Banco } from '../banco.ts'
import type { Categoria } from '../regras/categorias.ts'
import type { Conta } from '../regras/contas.ts'
import type { Fornecedor } from '../regras/fornecedores.ts'
import type { Produto } from '../regras/produtos.ts'
import type { Vinculo } from '../regras/vinculos.ts'
import { type Catalogos, depositoEscolhido, idGrupo, idTipoFornecedor, type Ligacoes, pendenciasBling } from './catalogos.ts'
import { type BlingCliente, ErroBlingApi, ErroBlingDesconectado, ErroBlingRede } from './cliente.ts'
import { payloadCategoria, payloadConta, payloadEstoque, payloadFornecedor, payloadProduto, payloadVinculo, type SemCampos } from './payloads.ts'

export type Modo = 'teste' | 'completo'

/** Ordem do envio (brief): cada etapa depende das anteriores. */
export const ETAPAS = ['categorias', 'fornecedores', 'produtos', 'vinculos', 'estoque', 'contas'] as const
export type Etapa = (typeof ETAPAS)[number]

export const NOMES_ETAPA: Record<Etapa, string> = {
  categorias: 'Categorias',
  fornecedores: 'Fornecedores',
  produtos: 'Produtos',
  vinculos: 'Produtos × fornecedores',
  estoque: 'Estoque (balanço)',
  contas: 'Contas a pagar'
}

/** O que vai para o Bling, já conferido (vem da conferência das planilhas). */
export interface Lote {
  categorias: Categoria[]
  fornecedores: Fornecedor[]
  produtos: Produto[]
  vinculos: Vinculo[]
  contas: Conta[]
}

export type Status = 'enviando' | 'enviado' | 'pulado' | 'erro'

export interface EstadoEnvio {
  rodando: boolean
  modo: Modo | null
  etapa: Etapa | null
  feitos: number
  total: number
  /** Por que parou (pausa, falta de conexão, limite do dia, fim). */
  mensagem: string | null
  inicio: number | null
}

export interface Contagem {
  total: number
  enviado: number
  pulado: number
  erro: number
  pendente: number
}

/** Erro do próprio envio (falta um registro de que este depende): fica anotado e segue. */
class ErroDependencia extends Error {}
class Pausa extends Error {}

type Resultado = { status: 'enviado' | 'pulado'; id: number; mensagem?: string }

/** Chave de cada registro na tabela local (a mesma em toda nova tentativa). */
const CHAVES: Record<Etapa, (r: never) => string> = {
  categorias: (c: Categoria) => c.chave,
  fornecedores: (f: Fornecedor) => f.chave,
  produtos: (p: Produto) => p.codigo,
  vinculos: (v: Vinculo) => `${v.produto}|${v.fornecedor}`,
  estoque: (p: Produto) => p.codigo,
  contas: (c: Conta) => c.chave
}

/** Registros de cada etapa: o estoque são os produtos com saldo a lançar. */
export function registrosDaEtapa(lote: Lote, etapa: Etapa): unknown[] {
  return etapa === 'estoque' ? lote.produtos.filter((p) => p.estoque > 0) : lote[etapa]
}

/**
 * Amostra do envio de teste (brief, Etapa 4): 5 produtos ativos com GTIN, fornecedor, categoria e
 * estoque (misturando COM ST e SEM ST), as categorias acima deles, os fornecedores deles e 2 contas.
 */
export function loteDeTeste(lote: Lote): Lote {
  const bons = lote.produtos.filter((p) => p.situacao === 'A' && p.gtin && p.categoria && p.fornecedor && p.estoque > 0)
  const quaisquer = lote.produtos.filter((p) => p.situacao === 'A')
  const escolher = (lista: Produto[], grupo: string, n: number) => lista.filter((p) => p.grupoFiscal === grupo).slice(0, n)
  let produtos = [...escolher(bons, 'SEM ST', 3), ...escolher(bons, 'COM ST', 2)]
  for (const p of [...bons, ...quaisquer]) if (produtos.length < 5 && !produtos.includes(p)) produtos.push(p)
  produtos = produtos.slice(0, 5)
  const codigos = new Set(produtos.map((p) => p.codigo))

  const vinculos = lote.vinculos.filter((v) => codigos.has(v.produto))
  const doFornecedor = new Set(vinculos.map((v) => v.fornecedor))
  const contas = [...lote.contas.filter((c) => doFornecedor.has(c.fornecedor)), ...lote.contas].filter((c, i, a) => a.indexOf(c) === i).slice(0, 2)
  for (const c of contas) doFornecedor.add(c.fornecedor)

  const porChave = new Map(lote.categorias.map((c) => [c.chave, c]))
  const precisa = new Set<string>()
  for (const p of produtos) {
    for (let k = p.categoria; k && !precisa.has(k); k = porChave.get(k)?.pai ?? null) precisa.add(k)
  }
  return {
    categorias: lote.categorias.filter((c) => precisa.has(c.chave)),
    fornecedores: lote.fornecedores.filter((f) => doFornecedor.has(f.chave)),
    produtos,
    vinculos,
    contas
  }
}

/** Fila de envio para o Bling: etapa por etapa, gravando cada registro (não repete e retoma de onde parou). */
export class Envio {
  private readonly banco: Banco
  private readonly cliente: BlingCliente
  private parar = false
  estado: EstadoEnvio = { rodando: false, modo: null, etapa: null, feitos: 0, total: 0, mensagem: null, inicio: null }

  constructor(banco: Banco, cliente: BlingCliente) {
    this.banco = banco
    this.cliente = cliente
  }

  // ---------- tabela local ----------

  item(modo: Modo, etapa: Etapa, chave: string) {
    return this.banco.db.prepare('SELECT status, bling_id, mensagem FROM itens WHERE modo = ? AND tipo = ? AND chave = ?').get(modo, etapa, chave) as
      | { status: Status; bling_id: number | null; mensagem: string | null }
      | undefined
  }

  private marcar(modo: Modo, etapa: Etapa, chave: string, status: Status, id: number | null, mensagem: string | null) {
    this.banco.db
      .prepare(
        `INSERT INTO itens (modo, tipo, chave, status, bling_id, mensagem, tentativas, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (modo, tipo, chave) DO UPDATE SET status = excluded.status, bling_id = excluded.bling_id,
           mensagem = excluded.mensagem, tentativas = tentativas + excluded.tentativas, atualizado_em = excluded.atualizado_em`
      )
      .run(modo, etapa, chave, status, id, mensagem, status === 'enviando' ? 1 : 0, new Date().toISOString())
  }

  /** Id no Bling de um registro já enviado (ou que já existia). */
  private idDe(modo: Modo, etapa: Etapa, chave: string): number | null {
    const i = this.item(modo, etapa, chave)
    return i && (i.status === 'enviado' || i.status === 'pulado') ? i.bling_id : null
  }

  contagem(modo: Modo, lote: Lote): Record<Etapa, Contagem> {
    const saida = {} as Record<Etapa, Contagem>
    for (const etapa of ETAPAS) {
      const chaves = new Set((registrosDaEtapa(lote, etapa) as never[]).map((r) => CHAVES[etapa](r)))
      const c: Contagem = { total: chaves.size, enviado: 0, pulado: 0, erro: 0, pendente: 0 }
      const linhas = this.banco.db.prepare('SELECT chave, status FROM itens WHERE modo = ? AND tipo = ?').all(modo, etapa) as { chave: string; status: Status }[]
      const status = new Map(linhas.map((l) => [l.chave, l.status]))
      for (const k of chaves) {
        const s = status.get(k)
        if (s === 'enviado' || s === 'pulado' || s === 'erro') c[s]++
        else c.pendente++
      }
      saida[etapa] = c
    }
    return saida
  }

  /** Registros com erro (ou com aviso, como "criado sem IE"), para o relatório. */
  ocorrencias(modo: Modo): { etapa: Etapa; chave: string; status: Status; mensagem: string }[] {
    return (
      this.banco.db
        .prepare(`SELECT tipo, chave, status, mensagem FROM itens WHERE modo = ? AND mensagem IS NOT NULL ORDER BY status = 'erro' DESC, tipo, chave`)
        .all(modo) as { tipo: Etapa; chave: string; status: Status; mensagem: string }[]
    ).map((r) => ({ etapa: r.tipo, chave: r.chave, status: r.status, mensagem: r.mensagem }))
  }

  /** Há registros de teste criados no Bling e ainda não apagados. */
  temTestes(): boolean {
    return this.banco.db.prepare(`SELECT 1 FROM itens WHERE modo = 'teste' AND status IN ('enviado', 'enviando') LIMIT 1`).get() !== undefined
  }

  testesCriados(): { etapa: Etapa; chave: string; id: number }[] {
    return (
      this.banco.db.prepare(`SELECT tipo, chave, bling_id FROM itens WHERE modo = 'teste' AND status = 'enviado' ORDER BY tipo, chave`).all() as {
        tipo: Etapa
        chave: string
        bling_id: number
      }[]
    ).map((r) => ({ etapa: r.tipo, chave: r.chave, id: r.bling_id }))
  }

  // ---------- envio ----------

  pausar(): void {
    if (this.estado.rodando) this.parar = true
  }

  /** Confere se dá para começar (a tela chama antes de soltar o envio em segundo plano). */
  verificar(modo: Modo, catalogos: Catalogos | null, ligacoes: Ligacoes): void {
    if (this.estado.rodando) throw new Error('Já tem um envio em andamento.')
    if (modo === 'completo' && this.temTestes()) throw new Error('Apague os registros de teste antes do envio completo.')
    const pendencias = pendenciasBling(catalogos, ligacoes)
    if (pendencias.length) throw new Error(pendencias.join(' '))
  }

  /**
   * Envia (ou continua) o lote. Erro do Bling num registro fica anotado e o envio segue;
   * falta de conexão, acesso vencido ou limite do dia param tudo (continua depois de onde parou).
   */
  async enviar(modo: Modo, lote: Lote, catalogos: Catalogos | null, ligacoes: Ligacoes): Promise<void> {
    this.verificar(modo, catalogos, ligacoes)
    const cat = catalogos!
    const dados = modo === 'teste' ? loteDeTeste(lote) : lote
    this.parar = false
    this.estado = { rodando: true, modo, etapa: null, feitos: 0, total: 0, mensagem: null, inicio: Date.now() }
    try {
      await this.categorias(modo, dados)
      await this.fornecedores(modo, dados, idTipoFornecedor(cat))
      await this.produtos(modo, dados, cat)
      await this.vinculos(modo, dados)
      await this.estoque(modo, dados, depositoEscolhido(cat, ligacoes)!)
      await this.contas(modo, dados, ligacoes)
      this.estado.mensagem = 'Envio terminado.'
    } catch (e) {
      this.estado.mensagem = e instanceof Pausa ? 'Pausado. Clique em continuar para seguir de onde parou.' : (e as Error).message
      if (!(e instanceof Pausa || e instanceof ErroBlingRede || e instanceof ErroBlingDesconectado)) console.error(e)
    } finally {
      this.estado.rodando = false
      this.estado.etapa = null
    }
  }

  /** Passa por todos os registros da etapa, pulando os que já foram. */
  private async etapa<T>(modo: Modo, etapa: Etapa, registros: T[], fazer: (r: T, interrompido: boolean) => Promise<Resultado>) {
    const chave = CHAVES[etapa] as (r: T) => string
    this.estado.etapa = etapa
    this.estado.total = registros.length
    this.estado.feitos = 0
    for (const r of registros) {
      const k = chave(r)
      const antes = this.item(modo, etapa, k)
      if (antes?.status === 'enviado' || antes?.status === 'pulado') {
        this.estado.feitos++
        continue
      }
      if (this.parar) throw new Pausa()
      // "enviando" que ficou de uma vez anterior: a chamada pode ter criado o registro no Bling.
      const interrompido = antes?.status === 'enviando'
      this.marcar(modo, etapa, k, 'enviando', null, null)
      try {
        const res = await fazer(r, interrompido)
        this.marcar(modo, etapa, k, res.status, res.id, res.mensagem ?? null)
      } catch (e) {
        if (e instanceof ErroBlingApi || e instanceof ErroDependencia) this.marcar(modo, etapa, k, 'erro', null, e.message)
        else throw e
      }
      this.estado.feitos++
    }
  }

  private async categorias(modo: Modo, lote: Lote) {
    // As que já existem no Bling (mesmo nome e mesmo pai) são usadas, não criadas de novo.
    const existentes = new Map<string, number>()
    if (lote.categorias.length) {
      for (const c of await this.cliente.listarTudo<{ id: number; descricao: string; categoriaPai?: { id?: number } }>('/categorias/produtos')) {
        existentes.set(`${c.descricao.trim().toUpperCase()}|${c.categoriaPai?.id ?? 0}`, c.id)
      }
    }
    const teste = modo === 'teste'
    await this.etapa(modo, 'categorias', lote.categorias, async (c) => {
      const idPai = c.pai ? this.idDe(modo, 'categorias', c.pai) : null
      if (c.pai && !idPai) throw new ErroDependencia(`A categoria-pai ${c.pai} não foi para o Bling.`)
      const corpo = payloadCategoria(c, idPai, teste)
      const achada = existentes.get(`${corpo.descricao.trim().toUpperCase()}|${idPai ?? 0}`)
      if (achada) return { status: 'pulado', id: achada }
      const { data } = await this.cliente.post<{ data: { id: number } }>('/categorias/produtos', corpo)
      existentes.set(`${corpo.descricao.trim().toUpperCase()}|${idPai ?? 0}`, data.id)
      return { status: 'enviado', id: data.id }
    })
  }

  private async fornecedores(modo: Modo, lote: Lote, idTipo: number | null) {
    const teste = modo === 'teste'
    await this.etapa(modo, 'fornecedores', lote.fornecedores, async (f) => {
      if (f.numeroDocumento) {
        const { data } = await this.cliente.get<{ data: { id: number }[] }>('/contatos', { numeroDocumento: f.numeroDocumento, criterio: 1, limite: 1 })
        if (data[0]) return { status: 'pulado', id: data[0].id }
      }
      // O que o Bling recusar (IE fora do padrão, telefone incompleto no Superus) sai e fica anotado.
      let comIe = true
      let comFone = true
      const notas: string[] = []
      for (;;) {
        try {
          const { data } = await this.cliente.post<{ data: { id: number } }>('/contatos', payloadFornecedor(f, idTipo, teste, comIe, comFone))
          return { status: 'enviado', id: data.id, mensagem: notas.length ? notas.join(' ') : undefined }
        } catch (e) {
          if (!(e instanceof ErroBlingApi)) throw e
          if (comIe && f.indicadorIe && /inscri[cç][aã]o estadual|\bie\b/i.test(e.message)) {
            comIe = false
            notas.push(`Criado sem IE: o Bling recusou a IE ${f.ie} (${e.message}).`)
          } else if (comFone && (f.telefone || f.celular) && /fone|celular/i.test(e.message)) {
            comFone = false
            notas.push(`Criado sem telefone: o Bling recusou ${[f.telefone, f.celular].filter(Boolean).join(' / ')}.`)
          } else throw e
        }
      }
    })
  }

  private async produtos(modo: Modo, lote: Lote, cat: Catalogos) {
    const teste = modo === 'teste'
    const codigoNoBling = (p: Produto) => (teste ? `TESTE-${p.codigo}` : p.codigo)
    // Procura de 100 em 100 os que ainda não foram, para não criar produto que já existe.
    const existentes = new Map<string, number>()
    const faltam = lote.produtos.filter((p) => {
      const s = this.item(modo, 'produtos', p.codigo)?.status
      return s !== 'enviado' && s !== 'pulado'
    })
    for (let i = 0; i < faltam.length; i += 100) {
      const codigos = faltam.slice(i, i + 100).map(codigoNoBling)
      const { data } = await this.cliente.get<{ data: { id: number; codigo?: string; situacao?: string }[] }>('/produtos', { 'codigos[]': codigos, criterio: 5, limite: 100 })
      // Produto na lixeira do Bling (situação E) não conta: o do Superus é criado de novo.
      for (const p of data) if (p.codigo && p.situacao !== 'E') existentes.set(p.codigo, p.id)
    }
    const grupos = { 'SEM ST': idGrupo(cat, 'SEM ST'), 'COM ST': idGrupo(cat, 'COM ST') }
    await this.etapa(modo, 'produtos', lote.produtos, async (p) => {
      const achado = existentes.get(codigoNoBling(p))
      if (achado) return { status: 'pulado', id: achado }
      const categoria = p.categoria ? this.idDe(modo, 'categorias', p.categoria) : null
      // GTIN fora do GS1 ou CEST inválido: o produto vai sem ele, com o original nas observações.
      const sem: SemCampos = {}
      const notas: string[] = []
      if (p.categoria && !categoria) notas.push(`Criado sem categoria: a categoria ${p.categoria} não foi para o Bling.`)
      for (;;) {
        try {
          const { data } = await this.cliente.post<{ data: { id: number } }>('/produtos', payloadProduto(p, { categoria, grupo: grupos[p.grupoFiscal] }, teste, sem))
          return { status: 'enviado', id: data.id, mensagem: notas.length ? notas.join(' ') : undefined }
        } catch (e) {
          if (!(e instanceof ErroBlingApi)) throw e
          if (!sem.gtin && p.gtin && /gtin/i.test(e.message)) {
            sem.gtin = true
            notas.push(`Criado sem GTIN: o Bling recusou ${p.gtin} (está nas observações).`)
          } else if (!sem.cest && p.cest && /cest/i.test(e.message)) {
            sem.cest = true
            notas.push(`Criado sem CEST: o Bling recusou ${p.cest} (está nas observações).`)
          } else throw e
        }
      }
    })
  }

  private async vinculos(modo: Modo, lote: Lote) {
    await this.etapa(modo, 'vinculos', lote.vinculos, async (v, interrompido) => {
      const idProduto = this.idDe(modo, 'produtos', v.produto)
      const idFornecedor = this.idDe(modo, 'fornecedores', v.fornecedor)
      if (!idProduto) throw new ErroDependencia(`O produto ${v.produto} não foi para o Bling.`)
      if (!idFornecedor) throw new ErroDependencia(`O fornecedor ${v.fornecedor} não foi para o Bling.`)
      // Produto que já existia (ou chamada interrompida): a ligação pode já estar lá.
      if (interrompido || this.item(modo, 'produtos', v.produto)?.status === 'pulado') {
        const { data } = await this.cliente.get<{ data: { id: number }[] }>('/produtos/fornecedores', { idProduto, idFornecedor })
        if (data[0]) return { status: 'pulado', id: data[0].id }
      }
      const { data } = await this.cliente.post<{ data: { id: number } }>('/produtos/fornecedores', payloadVinculo(v, idProduto, idFornecedor))
      return { status: 'enviado', id: data.id }
    })
  }

  private async estoque(modo: Modo, lote: Lote, idDeposito: number) {
    await this.etapa(modo, 'estoque', registrosDaEtapa(lote, 'estoque') as Produto[], async (p) => {
      const idProduto = this.idDe(modo, 'produtos', p.codigo)
      if (!idProduto) throw new ErroDependencia(`O produto ${p.codigo} não foi para o Bling.`)
      const { data } = await this.cliente.post<{ data: { id: number } }>('/estoques', payloadEstoque(p, idProduto, idDeposito))
      return { status: 'enviado', id: data.id }
    })
  }

  private async contas(modo: Modo, lote: Lote, ligacoes: Ligacoes) {
    await this.etapa(modo, 'contas', lote.contas, async (c, interrompido) => {
      const contato = this.idDe(modo, 'fornecedores', c.fornecedor)
      if (!contato) throw new ErroDependencia(`O fornecedor ${c.fornecedor} não foi para o Bling.`)
      if (interrompido) {
        const { data } = await this.cliente.get<{ data: { id: number; valor: number }[] }>('/contas/pagar', {
          idContato: contato,
          situacao: 1,
          dataVencimentoInicial: c.vencimento,
          dataVencimentoFinal: c.vencimento
        })
        const achada = data.find((x) => Math.abs(x.valor - c.valor) < 0.005)
        if (achada) return { status: 'pulado', id: achada.id }
      }
      const categoria = c.categoria ? (ligacoes.categorias[c.categoria] ?? null) : null
      const forma = c.formaPagamento ? (ligacoes.formas[c.formaPagamento] ?? null) : null
      const { data } = await this.cliente.post<{ data: { id: number } }>('/contas/pagar', payloadConta(c, { contato, categoria, forma }, modo === 'teste'))
      const faltou = [c.categoria && !categoria ? `categoria "${c.categoria}"` : '', c.formaPagamento && !forma ? `forma "${c.formaPagamento}"` : ''].filter(Boolean)
      return { status: 'enviado', id: data.id, mensagem: faltou.length ? `Criada sem ${faltou.join(' e ')} (não ligada na tela).` : undefined }
    })
  }

  // ---------- apagar testes ----------

  /** Apaga do Bling o que o envio de teste criou, na ordem inversa (contas antes dos fornecedores etc.). */
  async apagarTestes(): Promise<{ apagados: number; falhas: string[] }> {
    if (this.estado.rodando) throw new Error('Espere o envio terminar ou pause antes de apagar os testes.')
    const criados = this.testesCriados()
    const ordem: Etapa[] = ['contas', 'vinculos', 'estoque', 'produtos', 'fornecedores', 'categorias']
    const nivel = (chave: string) => Number(chave.split(':')[0])
    let apagados = 0
    const falhas: string[] = []
    for (const etapa of ordem) {
      const lista = criados.filter((c) => c.etapa === etapa).sort((a, b) => (etapa === 'categorias' ? nivel(b.chave) - nivel(a.chave) : 0))
      for (const c of lista) {
        try {
          await this.apagar(etapa, c.id)
          this.banco.db.prepare(`DELETE FROM itens WHERE modo = 'teste' AND tipo = ? AND chave = ?`).run(etapa, c.chave)
          apagados++
        } catch (e) {
          if (!(e instanceof ErroBlingApi)) throw e
          falhas.push(`${NOMES_ETAPA[etapa]} ${c.chave}: ${e.message}`)
        }
      }
    }
    if (!falhas.length) this.banco.db.prepare(`DELETE FROM itens WHERE modo = 'teste'`).run()
    return { apagados, falhas }
  }

  private async apagar(etapa: Etapa, id: number): Promise<void> {
    const rota: Record<Etapa, string | null> = {
      contas: `/contas/pagar/${id}`,
      vinculos: `/produtos/fornecedores/${id}`,
      estoque: null, // o lançamento sai junto com o produto
      produtos: `/produtos/${id}`,
      fornecedores: `/contatos/${id}`,
      categorias: `/categorias/produtos/${id}`
    }
    const caminho = rota[etapa]
    if (!caminho) return
    try {
      await this.cliente.delete(caminho)
    } catch (e) {
      if (e instanceof ErroBlingApi && e.status === 404) return // já não existe
      if (!(e instanceof ErroBlingApi) || etapa !== 'produtos') throw e
      // O Bling pode pedir que o produto vá para "Excluído" antes de remover.
      await this.cliente.patch(`/produtos/${id}/situacoes`, { situacao: 'E' })
      await this.cliente.delete(caminho)
    }
  }
}
