import type { Banco } from '../banco.ts'
import type { GrupoFiscal } from '../regras/produtos.ts'
import type { BlingCliente } from './cliente.ts'

/** Cadastros que o Weslei cria no Bling e que o envio usa (lidos do Bling e guardados no banco). */
export interface Catalogos {
  lidoEm: string
  depositos: { id: number; descricao: string; padrao: boolean }[]
  grupos: { id: number; nome: string }[]
  tiposContato: { id: number; descricao: string }[]
  categoriasDespesa: { id: number; descricao: string }[]
  formasPagamento: { id: number; descricao: string }[]
}

/** O que o Weslei escolheu na tela: depósito do estoque e ligações das contas a pagar. */
export interface Ligacoes {
  deposito: number | null
  /** Nome da categoria no Superus → id da categoria de despesa no Bling. */
  categorias: Record<string, number>
  /** Nome da forma de pagamento no Superus → id da forma no Bling. */
  formas: Record<string, number>
}

export async function lerCatalogos(cliente: BlingCliente): Promise<Catalogos> {
  const depositos = await cliente.listarTudo<{ id: number; descricao: string; padrao?: boolean; situacao?: number }>('/depositos')
  const grupos = await cliente.listarTudo<{ id: number; nome: string }>('/grupos-produtos')
  const { data: tiposContato } = await cliente.get<{ data: { id: number; descricao: string }[] }>('/contatos/tipos')
  const categorias = await cliente.listarTudo<{ id: number; descricao: string; tipo?: number }>('/categorias/receitas-despesas', { tipo: 0 })
  const formas = await cliente.listarTudo<{ id: number; descricao: string; situacao?: number }>('/formas-pagamentos')
  return {
    lidoEm: new Date().toISOString(),
    depositos: depositos.filter((d) => d.situacao !== 0).map((d) => ({ id: d.id, descricao: d.descricao, padrao: !!d.padrao })),
    grupos: grupos.map((g) => ({ id: g.id, nome: g.nome })),
    tiposContato: tiposContato.map((t) => ({ id: t.id, descricao: t.descricao })),
    // Despesa (1) ou receita e despesa (3).
    categoriasDespesa: categorias.filter((c) => c.tipo === undefined || c.tipo === 1 || c.tipo === 3).map((c) => ({ id: c.id, descricao: c.descricao })),
    formasPagamento: formas.filter((f) => f.situacao !== 0).map((f) => ({ id: f.id, descricao: f.descricao }))
  }
}

const igual = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase()

export function idGrupo(c: Catalogos, grupo: GrupoFiscal): number | null {
  return c.grupos.find((g) => igual(g.nome, grupo))?.id ?? null
}

export function idTipoFornecedor(c: Catalogos): number | null {
  return c.tiposContato.find((t) => igual(t.descricao, 'Fornecedor'))?.id ?? null
}

/** Depósito escolhido; sem escolha, o "Geral" ou o padrão do Bling. */
export function depositoEscolhido(c: Catalogos, l: Ligacoes): number | null {
  if (l.deposito && c.depositos.some((d) => d.id === l.deposito)) return l.deposito
  return (c.depositos.find((d) => igual(d.descricao, 'Geral')) ?? c.depositos.find((d) => d.padrao))?.id ?? null
}

export function lerCatalogosSalvos(banco: Banco): Catalogos | null {
  const c = banco.lerConfig('bling.catalogos')
  return c ? (JSON.parse(c) as Catalogos) : null
}

export function lerLigacoes(banco: Banco): Ligacoes {
  const l = banco.lerConfig('ligacoes')
  return l ? (JSON.parse(l) as Ligacoes) : { deposito: null, categorias: {}, formas: {} }
}

/** O que falta no Bling para o envio funcionar (vazio = pronto). */
export function pendenciasBling(c: Catalogos | null, l: Ligacoes): string[] {
  if (!c) return ['Ler os cadastros do Bling (botão "Atualizar" na tela Bling).']
  const p: string[] = []
  for (const g of ['SEM ST', 'COM ST'] as const) if (!idGrupo(c, g)) p.push(`Criar no Bling o grupo de produtos "${g}".`)
  if (!idTipoFornecedor(c)) p.push('O Bling não tem o tipo de contato "Fornecedor".')
  if (!depositoEscolhido(c, l)) p.push('Escolher o depósito do estoque.')
  return p
}
