/** As planilhas que o app recebe, na ordem de envio para o Bling. */
export const TIPOS = ['categorias', 'fornecedores', 'produtos', 'vinculos', 'contas'] as const
export type Tipo = (typeof TIPOS)[number]

export const NOMES_TIPO: Record<Tipo, string> = {
  categorias: 'Categorias de produtos',
  fornecedores: 'Fornecedores',
  produtos: 'Produtos e estoque',
  vinculos: 'Produtos × fornecedores',
  contas: 'Contas a pagar em aberto'
}

/** Coluna do Superus escolhida para cada campo (chave do campo → nome da coluna; '' = nenhuma). */
export type Mapa = Record<string, string>

/** Problema achado na conferência. Erro: não vai para o Bling. Aviso: vai, mas vale conferir. */
export interface Problema {
  nivel: 'erro' | 'aviso'
  regra: string
  /** Linha na planilha do Superus. */
  linha: number
  /** Código do registro no Superus (produto, fornecedor, conta...). */
  codigo: string
  mensagem: string
}

export interface Total {
  rotulo: string
  valor: number
  /** Formato de exibição: quantidade (padrão), unidades com casas ou dinheiro. */
  formato?: 'qtd' | 'un' | 'reais'
}

/** Resultado da conferência de uma planilha: o que vai para o Bling, os problemas e os totais. */
export interface Resultado<T> {
  registros: T[]
  problemas: Problema[]
  totais: Total[]
}

/** Junta os problemas com cara de lista (para quem monta a conferência). */
export function anotador(problemas: Problema[]) {
  return {
    erro: (regra: string, linha: number, codigo: string, mensagem: string) =>
      problemas.push({ nivel: 'erro', regra, linha, codigo, mensagem }),
    aviso: (regra: string, linha: number, codigo: string, mensagem: string) =>
      problemas.push({ nivel: 'aviso', regra, linha, codigo, mensagem })
  }
}
