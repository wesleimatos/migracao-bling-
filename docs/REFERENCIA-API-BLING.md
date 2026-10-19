# API do Bling (v3): o que a migração usa

Lido em 19/10/2026 na OpenAPI oficial (`developer.bling.com.br/referencia` →
`window.swaggerConfig.openapiUrl`, hoje `/build/assets/openapi-Dw6cY8yQ.json`; o nome muda a cada
versão do site). Campos com `*` são obrigatórios segundo a OpenAPI.

## Limites (developer.bling.com.br/limites)
- 3 requisições por segundo e 120.000 por dia, por conta. Passou disso: HTTP 429
  (`error.period` = `second` ou `day`).
- Conta aproximada da migração: ~5.000 produtos × (buscar + criar + vínculo + estoque) ≈ 20.000
  chamadas. Com 350 ms entre elas: ~2 h. Cabe com folga no limite do dia.

## Ordem de envio e rotas

| # | O quê | Criar | Achar antes de criar (não duplicar) |
|---|---|---|---|
| 1 | Categorias de produto | `POST /categorias/produtos` | `GET /categorias/produtos` (lista tudo, sem filtro; comparar descrição + pai) |
| 2 | Fornecedores | `POST /contatos` | `GET /contatos?numeroDocumento=<só dígitos>` |
| 3 | Produtos | `POST /produtos` | `GET /produtos?codigos[]=A&codigos[]=B...` (vários códigos por chamada) |
| 4 | Produto × fornecedor | `POST /produtos/fornecedores` | `GET /produtos/fornecedores?idProduto=&idFornecedor=` |
| 5 | Estoque | `POST /estoques` com `operacao: "B"` (balanço) | não precisa: o balanço define o saldo, repetir não soma |
| 6 | Contas a pagar | `POST /contas/pagar` | `GET /contas/pagar?idContato=&situacao=1&dataVencimentoInicial=&dataVencimentoFinal=` (comparar nº do documento + valor) |

Consultas de apoio (cadastros que o Weslei cria no Bling antes da Etapa 4):
`GET /depositos`, `GET /categorias/receitas-despesas?tipo=1` (despesas), `GET /formas-pagamentos`,
`GET /contatos/tipos` (para achar o id do tipo "Fornecedor").

## Campos de cada envio

**Categoria** (`POST /categorias/produtos`): `descricao*`, `categoriaPai.id` (a pai vai antes da filha).

**Fornecedor** (`POST /contatos`): `nome*`, `tipo*` (`J` CNPJ, `F` CPF, `E` estrangeiro),
`situacao*` (`A`), `fantasia`, `numeroDocumento`, `ie`, `indicadorIe` (`1` contribuinte,
`2` isento, `9` não contribuinte), `telefone`, `celular`, `email`, `endereco.geral` (`endereco`,
`numero`, `complemento`, `bairro`, `cep`, `municipio`, `uf`), `tiposContato: [{id: <Fornecedor>}]`.

**Produto** (`POST /produtos`): `nome*`, `tipo*` (`P`), `situacao*` (`A`/`I`), `formato*` (`S`),
`codigo`, `preco`, `unidade`, `gtin`, `gtinEmbalagem`, `marca`, `pesoLiquido` e `pesoBruto` (kg),
`dimensoes` (`largura`, `altura`, `profundidade`, `unidadeMedida`: `0` m, `1` cm, `2` mm),
`categoria.id`, `tributacao` (`origem`, `ncm`, `cest`, ...), `estoque` (`minimo`, `maximo`, `localizacao`).

**Produto × fornecedor** (`POST /produtos/fornecedores`): `produto.id`, `fornecedor.id`, `codigo`
(código no fornecedor), `precoCusto`, `precoCompra`, `padrao`.

**Estoque** (`POST /estoques`): `produto.id*`, `deposito.id*`, `operacao*` (`B`), `quantidade*`,
`custo`, `preco`, `observacoes`.

**Conta a pagar** (`POST /contas/pagar`): `situacao*` (`1` aberto), `vencimento*`,
`vencimentoOriginal*`, `valor*`, `contato.id*`, `dataEmissao`, `numeroDocumento`, `historico`,
`competencia`, `categoria.id` (categoria de despesa), `formaPagamento.id`.

## Pontos de atenção (levar para a proposta de mapeamento)
- **CST/CSOSN não existe no cadastro do produto do Bling.** O Bling tira isso das regras fiscais
  (natureza de operação e grupo de produtos), que o Weslei ou a contadora configuram (brief, seção 8).
  A coluna do Superus serve só para conferência.
- **Preço de custo** não é um campo solto do produto: vai no vínculo com o fornecedor (`precoCusto`)
  e no balanço de estoque (`custo`).
- Na OpenAPI aparecem como obrigatórios campos que parecem só de leitura: `id` em categoria e
  contato, `numeroBanco` e `borderos` em contas a pagar. Conferir no envio de teste (Etapa 4) antes
  de contar com isso.
- Parcelas: cada parcela do Superus vira uma conta a pagar separada, com o próprio vencimento (brief).
