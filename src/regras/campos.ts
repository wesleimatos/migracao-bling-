import type { Mapa, Tipo } from './tipos.ts'

/** Um campo que o app precisa, e os nomes de coluna do Superus que costumam trazer ele. */
export interface Campo {
  chave: string
  rotulo: string
  obrigatorio?: boolean
  ajuda?: string
  /** Nomes de coluna procurados, em ordem (comparados sem acento, espaço ou pontuação). */
  colunas: string[]
}

/** Campos de cada planilha. As colunas padrão são as das consultas do Superus (docs/MAPEAMENTO-*.md). */
export const CAMPOS: Record<Tipo, Campo[]> = {
  categorias: [
    { chave: 'codSetor', rotulo: 'Código do setor', obrigatorio: true, colunas: ['COD_SETOR', 'CODSETOR'] },
    { chave: 'setor', rotulo: 'Setor', obrigatorio: true, colunas: ['SETOR'] },
    { chave: 'codGrupo', rotulo: 'Código do grupo', colunas: ['COD_GRUPO', 'CODGRUPO'] },
    { chave: 'grupo', rotulo: 'Grupo', colunas: ['GRUPO'] },
    { chave: 'codSubgrupo', rotulo: 'Código do subgrupo', colunas: ['COD_SUBGRUPO', 'CODSUBGRUPO'] },
    { chave: 'subgrupo', rotulo: 'Subgrupo', colunas: ['SUBGRUPO'] },
    { chave: 'codCategoria', rotulo: 'Código da categoria', colunas: ['COD_CATEGORIA', 'CODCATEGORIA'] },
    { chave: 'categoria', rotulo: 'Categoria', colunas: ['CATEGORIA'] }
  ],
  fornecedores: [
    { chave: 'codigo', rotulo: 'Código', obrigatorio: true, colunas: ['CODIGO', 'CODFORNECEDOR'] },
    { chave: 'razao', rotulo: 'Razão social / nome', obrigatorio: true, colunas: ['RAZAO', 'RAZAOSOCIAL'] },
    { chave: 'fantasia', rotulo: 'Nome fantasia', colunas: ['NOME', 'FANTASIA', 'NOMEFANTASIA'] },
    { chave: 'cnpj', rotulo: 'CNPJ', colunas: ['CNPJ'] },
    { chave: 'cpf', rotulo: 'CPF', colunas: ['CPF'] },
    { chave: 'tipoPessoa', rotulo: 'Tipo de pessoa (J/F)', ajuda: 'Só usado quando não há documento.', colunas: ['TIPOPESSOA'] },
    { chave: 'ie', rotulo: 'Inscrição estadual', colunas: ['IE', 'INSCRICAOESTADUAL'] },
    { chave: 'logradouro', rotulo: 'Logradouro', colunas: ['LOGRADOURO'] },
    { chave: 'endereco', rotulo: 'Endereço com número', ajuda: 'O número sai daqui: depois da última vírgula e antes do "-".', colunas: ['ENDERECO'] },
    { chave: 'complemento', rotulo: 'Complemento', colunas: ['COMPLEMENTO'] },
    { chave: 'bairro', rotulo: 'Bairro', colunas: ['BAIRRO'] },
    { chave: 'cidade', rotulo: 'Cidade', colunas: ['CIDADE', 'MUNICIPIO'] },
    { chave: 'uf', rotulo: 'UF', colunas: ['ESTADO', 'UF'] },
    { chave: 'cep', rotulo: 'CEP', colunas: ['CEP'] },
    { chave: 'email', rotulo: 'E-mail', colunas: ['EMAIL'] },
    { chave: 'telefones', rotulo: 'Telefones', ajuda: 'Vários números separados por "/".', colunas: ['TODOS_TELEFONES', 'TELEFONE_PRINCIPAL', 'TELEFONE'] },
    { chave: 'produtosAtivos', rotulo: 'Produtos ativos', ajuda: 'Desempate ao juntar CNPJ/CPF repetido.', colunas: ['PRODUTOS_ATIVOS'] }
  ],
  produtos: [
    { chave: 'codigo', rotulo: 'Código', obrigatorio: true, colunas: ['CODPRODUTO', 'CODIGO'] },
    { chave: 'nome', rotulo: 'Descrição', obrigatorio: true, colunas: ['DESCRICAO'] },
    { chave: 'descricaoWeb', rotulo: 'Descrição web', colunas: ['DESCRICAOWEB'] },
    { chave: 'inativo', rotulo: 'Inativo (S/N)', colunas: ['INATIVO'] },
    { chave: 'ean', rotulo: 'EAN principal', colunas: ['EAN', 'GTIN'] },
    { chave: 'todosEans', rotulo: 'Todos os EANs', ajuda: 'Separados por "/". Os extras vão nas observações.', colunas: ['TODOSEANS'] },
    { chave: 'preco', rotulo: 'Preço de venda', colunas: ['PRECOVENDA', 'PRECO'] },
    { chave: 'custo', rotulo: 'Custo', colunas: ['CUSTO'] },
    { chave: 'estoque', rotulo: 'Estoque', ajuda: 'Negativo entra como zero.', colunas: ['ESTOQUE'] },
    { chave: 'ncm', rotulo: 'NCM', colunas: ['NCM'] },
    { chave: 'cest', rotulo: 'CEST', colunas: ['CEST'] },
    { chave: 'cstIcms', rotulo: 'CST de ICMS (com origem)', ajuda: '1º dígito = origem; 60 vai para COM ST, o resto para SEM ST.', colunas: ['CSTICMS'] },
    { chave: 'codSetor', rotulo: 'Código do setor', colunas: ['CODSETOR', 'COD_SETOR'] },
    { chave: 'codGrupo', rotulo: 'Código do grupo', colunas: ['CODGRUPO', 'COD_GRUPO'] },
    { chave: 'codSubgrupo', rotulo: 'Código do subgrupo', colunas: ['CODSUBGRUPO', 'COD_SUBGRUPO'] },
    { chave: 'codCategoria', rotulo: 'Código da categoria', colunas: ['CODCATEGORIA', 'COD_CATEGORIA'] },
    { chave: 'codFornecedor', rotulo: 'Código do fornecedor', colunas: ['CODFORNECEDOR'] },
    { chave: 'codNoFornecedor', rotulo: 'Código do produto no fornecedor', colunas: ['SKUREFFORNECEDOR', 'REFFORNECEDOR'] }
  ],
  vinculos: [
    { chave: 'codProduto', rotulo: 'Código do produto', obrigatorio: true, colunas: ['CODPRODUTO', 'CODIGOPRODUTO'] },
    { chave: 'codFornecedor', rotulo: 'Código do fornecedor', obrigatorio: true, colunas: ['CODFORNECEDOR', 'CODIGOFORNECEDOR'] },
    { chave: 'codNoFornecedor', rotulo: 'Código do produto no fornecedor', colunas: ['SKUREFFORNECEDOR', 'REFFORNECEDOR', 'CODIGOFORNECEDOR', 'REFERENCIA'] },
    { chave: 'custo', rotulo: 'Custo', colunas: ['CUSTO', 'PRECOCUSTO'] }
  ],
  contas: [
    { chave: 'codFornecedor', rotulo: 'Código do fornecedor', colunas: ['CODFORNECEDOR', 'CODIGOFORNECEDOR'] },
    { chave: 'cnpjFornecedor', rotulo: 'CNPJ/CPF do fornecedor', ajuda: 'Usado quando o código não achar o fornecedor.', colunas: ['CNPJFORNECEDOR', 'CNPJ', 'CPFCNPJ'] },
    { chave: 'documento', rotulo: 'Nº do documento', colunas: ['DOCUMENTO', 'NUMDOCUMENTO', 'NRDOCUMENTO', 'NUMERODOCUMENTO'] },
    { chave: 'emissao', rotulo: 'Emissão', colunas: ['EMISSAO', 'DATAEMISSAO', 'DTEMISSAO'] },
    { chave: 'vencimento', rotulo: 'Vencimento', obrigatorio: true, colunas: ['VENCIMENTO', 'DATAVENCIMENTO', 'DTVENCIMENTO'] },
    { chave: 'valor', rotulo: 'Valor', obrigatorio: true, colunas: ['VALOR', 'VALORPARCELA', 'SALDO'] },
    { chave: 'parcela', rotulo: 'Parcela', colunas: ['PARCELA'] },
    { chave: 'historico', rotulo: 'Histórico', colunas: ['HISTORICO', 'OBSERVACAO'] },
    { chave: 'categoria', rotulo: 'Categoria / plano de contas', colunas: ['PLANOCONTAS', 'PLANODECONTAS', 'CATEGORIA'] },
    { chave: 'formaPagamento', rotulo: 'Forma de pagamento', colunas: ['FORMAPAGAMENTO', 'FORMA'] }
  ]
}

/** Nome de coluna comparável: maiúsculas, sem acento, sem espaço nem pontuação. */
export function normalizar(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Ligação inicial das colunas: para cada campo, a primeira coluna padrão que existe na planilha. */
export function mapaPadrao(tipo: Tipo, colunas: string[]): Mapa {
  const porNome = new Map(colunas.map((c) => [normalizar(c), c]))
  return Object.fromEntries(
    CAMPOS[tipo].map((campo) => [
      campo.chave,
      campo.colunas.map((c) => porNome.get(normalizar(c))).find((c) => c !== undefined) ?? ''
    ])
  )
}

/** Campos obrigatórios sem coluna escolhida. */
export function faltando(tipo: Tipo, mapa: Mapa): Campo[] {
  return CAMPOS[tipo].filter((c) => c.obrigatorio && !mapa[c.chave])
}
