/**
 * Bling falso em memória: responde às rotas que o envio usa e guarda o que foi criado.
 * Cada chamada fica registrada ("POST /produtos") para conferir ordem e quantidade.
 */
export function blingFalso() {
  let proximo = 1000
  const novoId = () => ++proximo
  const db = {
    categorias: [] as { id: number; descricao: string; categoriaPai?: { id: number } }[],
    contatos: [] as Record<string, unknown>[],
    produtos: [] as Record<string, unknown>[],
    vinculos: [] as Record<string, unknown>[],
    estoques: [] as Record<string, unknown>[],
    contas: [] as Record<string, unknown>[]
  }
  const chamadas: string[] = []
  /** Regras para simular falhas: devolve uma resposta para interromper a rota normal. */
  const falhas: ((metodo: string, caminho: string, corpo: Record<string, unknown>) => Response | 'rede' | undefined)[] = []
  const tokens = { pedidos: 0 }

  const json = (status: number, dados: unknown) => new Response(status === 204 ? null : JSON.stringify(dados), { status })
  const erro = (status: number, description: string) => json(status, { error: { type: 'VALIDATION_ERROR', message: 'Erro', description } })
  const lista = <T>(itens: T[], u: URL) => {
    const pagina = Number(u.searchParams.get('pagina') ?? 1)
    const limite = Number(u.searchParams.get('limite') ?? 100)
    return json(200, { data: itens.slice((pagina - 1) * limite, pagina * limite) })
  }
  const remover = (arr: { id?: unknown }[], id: number) => {
    const i = arr.findIndex((x) => x.id === id)
    if (i < 0) return erro(404, 'Não encontrado')
    arr.splice(i, 1)
    return json(204, null)
  }

  const f = (async (url: string | URL, init: RequestInit = {}) => {
    const u = new URL(String(url))
    const metodo = init.method ?? 'GET'
    const caminho = u.pathname.replace('/Api/v3', '')
    if (caminho === '/oauth/token') {
      tokens.pedidos++
      return json(200, { access_token: `A${tokens.pedidos}`, refresh_token: `R${tokens.pedidos}`, expires_in: 21600 })
    }
    chamadas.push(`${metodo} ${caminho}`)
    const corpo = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    for (const regra of falhas) {
      const r = regra(metodo, caminho, corpo)
      if (r === 'rede') throw new TypeError('fetch failed')
      if (r) return r
    }
    const q = u.searchParams
    let m: RegExpExecArray | null
    if (metodo === 'GET' && caminho === '/depositos') return lista([{ id: 1, descricao: 'Geral', padrao: true, situacao: 1 }, { id: 2, descricao: 'Loja 2', padrao: false, situacao: 1 }], u)
    if (metodo === 'GET' && caminho === '/grupos-produtos') return lista([{ id: 51, nome: 'COM ST' }, { id: 52, nome: 'SEM ST' }], u)
    if (metodo === 'GET' && caminho === '/contatos/tipos') return json(200, { data: [{ id: 7, descricao: 'Cliente' }, { id: 8, descricao: 'Fornecedor' }] })
    if (metodo === 'GET' && caminho === '/categorias/receitas-despesas') return lista([{ id: 61, descricao: 'Compra de mercadorias', tipo: 1 }, { id: 62, descricao: 'Vendas', tipo: 2 }], u)
    if (metodo === 'GET' && caminho === '/formas-pagamentos') return lista([{ id: 71, descricao: 'Boleto', situacao: 1 }, { id: 72, descricao: 'Pix', situacao: 1 }], u)

    if (metodo === 'GET' && caminho === '/categorias/produtos') return lista(db.categorias, u)
    if (metodo === 'POST' && caminho === '/categorias/produtos') {
      const c = { id: novoId(), descricao: String(corpo.descricao), ...(corpo.categoriaPai ? { categoriaPai: corpo.categoriaPai as { id: number } } : {}) }
      db.categorias.push(c)
      return json(201, { data: { id: c.id } })
    }
    if (metodo === 'GET' && caminho === '/contatos') {
      const doc = q.get('numeroDocumento')
      return lista(db.contatos.filter((c) => !doc || c.numeroDocumento === doc), u)
    }
    if (metodo === 'POST' && caminho === '/contatos') {
      if (corpo.ie === '999') return erro(400, 'Inscrição estadual inválida')
      const c = { id: novoId(), ...corpo }
      db.contatos.push(c)
      return json(201, { data: { id: c.id } })
    }
    if (metodo === 'GET' && caminho === '/produtos') {
      const codigos = q.getAll('codigos[]')
      return lista(db.produtos.filter((p) => codigos.includes(String(p.codigo))).map((p) => ({ id: p.id, codigo: p.codigo })), u)
    }
    if (metodo === 'POST' && caminho === '/produtos') {
      if (db.produtos.some((p) => p.codigo === corpo.codigo)) return erro(400, 'Já existe um produto com este código')
      const p = { id: novoId(), ...corpo }
      db.produtos.push(p)
      return json(201, { data: { id: p.id } })
    }
    if (metodo === 'GET' && caminho === '/produtos/fornecedores') {
      const idp = Number(q.get('idProduto'))
      const idf = Number(q.get('idFornecedor'))
      return lista(db.vinculos.filter((v) => (v.produto as { id: number }).id === idp && (v.fornecedor as { id: number }).id === idf), u)
    }
    if (metodo === 'POST' && caminho === '/produtos/fornecedores') {
      const v = { id: novoId(), ...corpo }
      db.vinculos.push(v)
      return json(201, { data: { id: v.id } })
    }
    if (metodo === 'POST' && caminho === '/estoques') {
      const e = { id: novoId(), ...corpo }
      db.estoques.push(e)
      return json(201, { data: { id: e.id } })
    }
    if (metodo === 'GET' && caminho === '/contas/pagar') {
      const idc = Number(q.get('idContato'))
      const venc = q.get('dataVencimentoInicial')
      return lista(db.contas.filter((c) => (c.contato as { id: number }).id === idc && c.vencimento === venc), u)
    }
    if (metodo === 'POST' && caminho === '/contas/pagar') {
      const c = { id: novoId(), ...corpo }
      db.contas.push(c)
      return json(201, { data: { id: c.id } })
    }
    if (metodo === 'DELETE' && (m = /^\/contas\/pagar\/(\d+)$/.exec(caminho))) return remover(db.contas, Number(m[1]))
    if (metodo === 'DELETE' && (m = /^\/produtos\/fornecedores\/(\d+)$/.exec(caminho))) return remover(db.vinculos, Number(m[1]))
    if (metodo === 'PATCH' && (m = /^\/produtos\/(\d+)\/situacoes$/.exec(caminho))) {
      const p = db.produtos.find((x) => x.id === Number(m![1]))
      if (!p) return erro(404, 'Não encontrado')
      p.situacao = corpo.situacao
      return json(204, null)
    }
    if (metodo === 'DELETE' && (m = /^\/produtos\/(\d+)$/.exec(caminho))) {
      // Como no Bling: só remove produto que já está "Excluído".
      const p = db.produtos.find((x) => x.id === Number(m![1]))
      if (p && p.situacao !== 'E') return erro(400, 'O produto precisa estar com situação Excluído')
      if (p) db.estoques = db.estoques.filter((e) => (e.produto as { id: number }).id !== p.id)
      return remover(db.produtos, Number(m[1]))
    }
    if (metodo === 'DELETE' && (m = /^\/contatos\/(\d+)$/.exec(caminho))) return remover(db.contatos, Number(m[1]))
    if (metodo === 'DELETE' && (m = /^\/categorias\/produtos\/(\d+)$/.exec(caminho))) {
      if (db.categorias.some((c) => c.categoriaPai?.id === Number(m![1]))) return erro(400, 'A categoria tem subcategorias')
      return remover(db.categorias, Number(m[1]))
    }
    return erro(404, `Rota falsa não existe: ${metodo} ${caminho}`)
  }) as typeof fetch

  return { f, db, chamadas, falhas, tokens }
}
