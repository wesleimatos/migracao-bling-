import type { Planilha } from '../planilhas/ler.ts'
import { chaveCategoria, NIVEIS, temCodigo } from './categorias.ts'
import type { IndiceFornecedores } from './fornecedores.ts'
import { anotador, type Mapa, type Problema, type Resultado } from './tipos.ts'
import { digitos, gtinValido, numero } from './validar.ts'

/** Grupos de produtos que já existem no Bling (decisão do Weslei: CST 60 → COM ST, o resto → SEM ST). */
export type GrupoFiscal = 'COM ST' | 'SEM ST'

/** Campos fixos de todo produto (decisões do Weslei e padrão do cadastro do Bling). */
/** Origem 2 = Estrangeira, adquirida no mercado interno. */
export const ORIGEM_SEM_SINALIZACAO = 2

export const PADRAO_PRODUTO = { tipo: 'P', formato: 'S', unidade: 'UN', condicao: 1, tipoProducao: 'T', freteGratis: false } as const

export interface Produto {
  codigo: string
  linha: number
  nome: string
  situacao: 'A' | 'I'
  preco: number
  custo: number
  gtin: string
  descricaoCurta: string
  observacoes: string
  ncm: string
  cest: string
  /** 0 a 8; null quando o Superus não tem. */
  origem: number | null
  grupoFiscal: GrupoFiscal
  /** Chave da categoria (nível:código) mais funda; null se não tiver. */
  categoria: string | null
  /** Saldo que vai para o Bling (negativo vira 0). */
  estoque: number
  /** Saldo do Superus como veio. */
  estoqueSuperus: number
  /** Fornecedor principal do cadastro do produto. */
  fornecedor: { codigo: string; codNoFornecedor: string } | null
}

export interface ContextoProdutos {
  /** Chaves das categorias montadas (para avisar categoria inexistente). */
  categorias?: Set<string>
  fornecedores?: IndiceFornecedores
}

export function montarProdutos(p: Planilha, mapa: Mapa, ctx: ContextoProdutos = {}): Resultado<Produto> {
  const problemas: Problema[] = []
  const anota = anotador(problemas)
  const v = (l: Record<string, string>, campo: string) => (mapa[campo] ? (l[mapa[campo]] ?? '').trim() : '')
  const registros: Produto[] = []
  const codigos = new Set<string>()
  const donoGtin = new Map<string, string>()

  p.linhas.forEach((l, i) => {
    const linha = p.numeros[i]
    const codigo = v(l, 'codigo')
    const nome = v(l, 'nome')
    if (!codigo) return anota.erro('sem-codigo', linha, '', 'Produto sem código.')
    if (codigos.has(codigo)) return anota.erro('codigo-repetido', linha, codigo, `Código ${codigo} repetido na planilha: só o primeiro vai.`)
    codigos.add(codigo)
    if (!nome) return anota.erro('sem-nome', linha, codigo, 'Produto sem descrição.')
    const situacao = v(l, 'inativo').toUpperCase() === 'S' ? 'I' : 'A'

    // Código de barras: só GTIN válido vai no campo; os outros códigos ficam nas observações.
    const ean = digitos(v(l, 'ean'))
    const gtin = gtinValido(ean) ? ean : ''
    if (ean && !gtin && ean !== codigo) anota.aviso('ean-interno', linha, codigo, `EAN ${ean} não é um GTIN válido: vai nas observações.`)
    if (gtin) {
      const dono = donoGtin.get(gtin)
      if (dono) anota.aviso('gtin-repetido', linha, codigo, `GTIN ${gtin} também está no produto ${dono}.`)
      else donoGtin.set(gtin, codigo)
    }
    const extras = [...new Set([ean, ...v(l, 'todosEans').split('/')].map((t) => t.trim()).filter(Boolean))]
      .filter((t) => t !== gtin && t !== codigo)
    const observacoes = extras.length ? `Outros códigos de barras: ${extras.join(', ')}` : ''

    const preco = numero(v(l, 'preco'))
    const custo = numero(v(l, 'custo'))
    if (Number.isNaN(preco)) anota.aviso('preco-invalido', linha, codigo, `Preço "${v(l, 'preco')}" não é número: vai 0.`)
    if (Number.isNaN(custo)) anota.aviso('custo-invalido', linha, codigo, `Custo "${v(l, 'custo')}" não é número: vai 0.`)
    const pv = Number.isNaN(preco) ? 0 : preco
    const cu = Number.isNaN(custo) ? 0 : custo
    if (situacao === 'A') {
      if (pv <= 0) anota.aviso('preco-zerado', linha, codigo, 'Preço de venda zerado.')
      if (cu <= 0) anota.aviso('custo-zerado', linha, codigo, 'Custo zerado.')
      if (pv > 0 && cu > pv) anota.aviso('custo-maior', linha, codigo, `Custo (${cu}) maior que a venda (${pv}).`)
    }

    // Fiscal: NCM com 8 dígitos, CEST com 7, origem no 1º dígito do CST de ICMS.
    const ncmBruto = digitos(v(l, 'ncm'))
    const ncm = ncmBruto.length === 8 && !/^0+$/.test(ncmBruto) ? ncmBruto : ''
    if (!ncm) anota.aviso('ncm-invalido', linha, codigo, `NCM "${v(l, 'ncm')}" inválido: vai sem NCM.`)
    const cestBruto = digitos(v(l, 'cest'))
    const cest = cestBruto.length === 7 ? cestBruto : ''
    if (cestBruto && !cest) anota.aviso('cest-invalido', linha, codigo, `CEST "${v(l, 'cest')}" inválido: vai sem CEST.`)
    const cstIcms = digitos(v(l, 'cstIcms'))
    const cst = cstIcms.length === 3 ? cstIcms.slice(1) : cstIcms
    // Sem sinalização no Superus (origem 0 ou CST vazio) vai como 2, Estrangeira adquirida no mercado
    // interno (decisão do Weslei no envio de teste, 19/10/2026). Origens marcadas (1 a 8) ficam.
    const marcada = cstIcms.length === 3 ? Number(cstIcms[0]) : 0
    const origem = marcada >= 1 && marcada <= 8 ? marcada : ORIGEM_SEM_SINALIZACAO
    if (marcada > 8) anota.aviso('origem-invalida', linha, codigo, `Origem ${cstIcms[0]} inválida: vai com origem ${ORIGEM_SEM_SINALIZACAO}.`)
    const grupoFiscal: GrupoFiscal = cst === '60' ? 'COM ST' : 'SEM ST'
    if (!cst) anota.aviso('sem-cst', linha, codigo, 'Sem CST de ICMS: vai para SEM ST.')
    else if (cst !== '00' && cst !== '60') anota.aviso('cst-especial', linha, codigo, `CST ${cst}: vai para SEM ST (conferir com a contadora).`)

    // Categoria: o nível mais fundo preenchido.
    let categoria: string | null = null
    NIVEIS.forEach((nome, nivel) => {
      const cod = v(l, `cod${nome[0].toUpperCase()}${nome.slice(1)}`)
      if (temCodigo(cod)) categoria = chaveCategoria(nivel, cod)
    })
    if (categoria && ctx.categorias && !ctx.categorias.has(categoria)) {
      anota.aviso('categoria-inexistente', linha, codigo, `Categoria ${categoria} não está na árvore: vai sem categoria.`)
      categoria = null
    } else if (!categoria) anota.aviso('sem-categoria', linha, codigo, 'Sem categoria.')

    const estoqueBruto = numero(v(l, 'estoque'))
    const estoqueSuperus = Number.isNaN(estoqueBruto) ? 0 : estoqueBruto
    if (Number.isNaN(estoqueBruto)) anota.aviso('estoque-invalido', linha, codigo, `Estoque "${v(l, 'estoque')}" não é número: vai 0.`)
    if (estoqueSuperus < 0) anota.aviso('estoque-negativo', linha, codigo, `Estoque ${estoqueSuperus}: entra zerado.`)

    const codFornecedor = v(l, 'codFornecedor')
    let fornecedor: Produto['fornecedor'] = null
    if (temCodigo(codFornecedor)) {
      if (ctx.fornecedores && !ctx.fornecedores.porCodigo.has(codFornecedor)) {
        anota.aviso('fornecedor-inexistente', linha, codigo, `Fornecedor ${codFornecedor} não está na planilha de fornecedores: vai sem fornecedor.`)
      } else fornecedor = { codigo: codFornecedor, codNoFornecedor: v(l, 'codNoFornecedor') }
    }

    const descricaoWeb = v(l, 'descricaoWeb')
    registros.push({
      codigo,
      linha,
      nome,
      situacao,
      preco: pv,
      custo: cu,
      gtin,
      descricaoCurta: descricaoWeb,
      observacoes,
      ncm,
      cest,
      origem,
      grupoFiscal,
      categoria,
      estoque: Math.max(0, estoqueSuperus),
      estoqueSuperus,
      fornecedor
    })
  })

  const soma = (f: (p: Produto) => number) => registros.reduce((s, p) => s + f(p), 0)
  const conta = (f: (p: Produto) => boolean) => registros.filter(f).length
  return {
    registros,
    problemas,
    totais: [
      { rotulo: 'Linhas na planilha', valor: p.linhas.length },
      { rotulo: 'Produtos a criar no Bling', valor: registros.length },
      { rotulo: 'Ativos', valor: conta((p) => p.situacao === 'A') },
      { rotulo: 'Inativos', valor: conta((p) => p.situacao === 'I') },
      { rotulo: 'Grupo SEM ST', valor: conta((p) => p.grupoFiscal === 'SEM ST') },
      { rotulo: 'Grupo COM ST', valor: conta((p) => p.grupoFiscal === 'COM ST') },
      { rotulo: 'Com GTIN', valor: conta((p) => p.gtin !== '') },
      { rotulo: 'Estoque no Superus: soma dos positivos', valor: soma((p) => Math.max(0, p.estoqueSuperus)), formato: 'un' },
      { rotulo: 'Estoque no Superus: soma dos negativos', valor: soma((p) => Math.min(0, p.estoqueSuperus)), formato: 'un' },
      { rotulo: 'Estoque que vai para o Bling (negativos zerados)', valor: soma((p) => p.estoque), formato: 'un' },
      { rotulo: 'Valor do estoque no custo', valor: soma((p) => p.estoque * p.custo), formato: 'reais' },
      { rotulo: 'Produtos com estoque a lançar', valor: conta((p) => p.estoque > 0) }
    ]
  }
}
