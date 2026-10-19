# Produtos: Superus → Bling

## O que veio do Superus
Planilha da consulta 62 "CADASTRO COMPLETO OIAPOQUE" (XLSX), 49 colunas, um produto por linha:

`CODPRODUTO, DESCRICAO, DESCRICAO2, DESCRICAO3, DESCRICAO4, DESCRICAOWEB, INATIVO, EAN, TODOSEANS,
SKUREFFORNECEDOR, CODFORNECEDOR, FORNECEDOR, CNPJFORNECEDOR, CODSETOR, SETOR, CODGRUPO, GRUPO,
CODSUBGRUPO, SUBGRUPO, CODCATEGORIA, CATEGORIA, CODMARCA, CODUNIDADE, EMBALAGEM, QTDEMBALAGEM,
TAMANHO, ALTURA, LARGURA, COMPRIMENTO, PESO, PESOLIQUIDO, PESOBRUTOEAN, CUSTO, PRECOVENDA, ESTOQUE,
ESTOQUEDISPONIVEL, NCM, CEST, EXTIPI, ALIQICMS, REDUCAOICMS, CSTICMS, CSOSN, CFOPSAIDA, CSTPIS,
ALIQPIS, CSTCOFINS, ALIQCOFINS, CSTIPI`

Conferência feita em 19/10/2026:
- **13.001 produtos**: 12.960 ativos e 41 inativos. Nenhum código repetido.
  O brief previa ~5.000; com 13 mil, o envio fica em torno de 2h30 (ainda bem abaixo do limite diário).
- **Descrição:** `DESCRICAO` tem até 54 letras. `DESCRICAO2` e `DESCRICAO3` são cortes dela (40 e 20
  letras). `DESCRICAO4` é "SEM NOME" em quase todos. `DESCRICAOWEB` tem até 184 letras.
- **Categoria:** cada produto está ligado a um nível da árvore: 1.034 só ao setor, 5.987 ao grupo,
  5.534 ao subgrupo e 404 à categoria (isso explica os 404 da planilha de categorias). Há 9 com
  setor 1 (que não está na árvore) e 1 sem nada.
- **EAN:** 10.913 ativos têm GTIN válido. 2.047 têm código interno no lugar (1.430 deles são o
  próprio código do produto). Nenhum GTIN válido se repete entre produtos. `TODOSEANS` mostra que
  736 produtos têm 2 ou mais GTINs válidos (até 8).
- **Fiscal:** NCM com 8 dígitos em 12.957 (3 vazios e 19 "00000000"). CEST em 5.284, todos com 7
  dígitos. `CSTICMS` vem com 3 dígitos: o 1º é a **origem** (0 em 12.954, 1 em 4, 5 em 1) e os 2
  últimos são o CST. Regime normal: CST 00 com 18% (7.657), CST 60 substituição tributária (5.111),
  e poucos 90, 41 e 20. PIS/COFINS 01 com 1,65%/7,6% e IPI 53 em quase todos. São 51 combinações
  fiscais diferentes; as 2 maiores cobrem 90%.
- **Preços:** 560 ativos com preço de venda zerado, 323 com custo zerado e 168 com custo maior que a venda.
- **Vazios na planilha:** unidade, embalagem, marca, peso e medidas (todos zerados ou em branco).
- **Estoque (loja Oiapoque):** 3.193 positivos (122.267 unidades), 8.670 zerados e 1.097 negativos.
- **Fornecedor:** 5.844 ativos com fornecedor e código no fornecedor; todos os fornecedores existem
  na planilha de fornecedores e o CNPJ confere. Um fornecedor por produto nesta planilha.

## De → para (`POST /produtos`)

| Superus | Bling | Regra |
|---|---|---|
| CODPRODUTO | `codigo` | igual (texto) |
| DESCRICAO | `nome` | igual |
| DESCRICAOWEB | `descricaoCurta` | quando preenchida |
| INATIVO | `situacao` | `N` → `A`, `S` → `I` |
| — | `tipo` = `P`, `formato` = `S` | fixo |
| — | `condicao` = 1 (Novo), `tipoProducao` = `T` (Terceiros), `freteGratis` = não | padrão do cadastro do Bling (prints do Weslei) |
| EAN | `gtin` | só se for GTIN válido (8, 12, 13 ou 14 dígitos com dígito certo) |
| TODOSEANS | `observacoes` | GTINs e códigos extras, para nada se perder |
| PRECOVENDA | `preco` | igual |
| CUSTO | vínculo com fornecedor (`precoCusto`) e balanço de estoque (`custo`) | igual |
| NCM | `tributacao.ncm` | só dígitos |
| CEST | `tributacao.cest` | só dígitos |
| 1º dígito de CSTICMS | `tributacao.origem` | 0 a 8 |
| CST, alíquotas, CFOP | `tributacao.grupoProduto` | proposta abaixo |
| setor/grupo/subgrupo/categoria | `categoria.id` | o nível mais fundo preenchido (ver MAPEAMENTO-CATEGORIAS) |
| — | `unidade` = `UN` | fixo para todos (decisão do Weslei, 19/10/2026) |
| CODFORNECEDOR + SKUREFFORNECEDOR + CUSTO | `POST /produtos/fornecedores` | `padrao` = sim |
| DESCRICAO2, DESCRICAO3, DESCRICAO4 | — | são cortes da descrição ou "SEM NOME" |
| ALTURA, LARGURA, COMPRIMENTO, PESOs, CODMARCA | — | vazios no próprio Superus (confirmado pelo COMPUTADOR, 19/10/2026) |

Não duplicar: `GET /produtos?codigos[]=...` (até 100 códigos por chamada) antes de criar.

## Parte fiscal: grupos de produtos do Bling (decisão do Weslei, 19/10/2026)
O Bling não guarda CST, alíquota nem CFOP no produto: ele calcula pela natureza de operação,
com regras por grupo de produtos. A conta já tem os grupos **"SEM ST"** e **"COM ST"**. O app liga
cada produto pelo CST de ICMS (os 2 últimos dígitos de `CSTICMS`) em `tributacao.grupoProduto`:
- `00` → **SEM ST** (7.675)
- `60` → **COM ST** (5.134, incluindo 8 com PIS/COFINS 04 ou 06)
- `90`, `41`, `20` e sem CST → **SEM ST** (192), e saem numa lista para a contadora conferir
  (entre eles, 27 com CST 90 e CFOP de ST 5403/5405)

## Decisões do Weslei (19/10/2026)
- **Só a loja Oiapoque.** O estoque vai para o depósito "Geral" do Bling.
- **GTINs extras nas observações:** o 1º GTIN válido vai em `gtin`. Os outros GTINs e códigos de
  `TODOSEANS` (menos o próprio código do produto) ficam em `observacoes`, como
  "Outros códigos de barras: ...". O caixa não acha o produto pelo código extra.
- **Estoque negativo vira zero** no balanço. A lista desses produtos sai no relatório.
- **Unidade de venda `UN` para todos os produtos.**

## A confirmar
- Vínculos produto × fornecedor: o arquivo 67 não vem ao CODE. Se ele for enviado na tela do app,
  entram todos os vínculos; se não, vale o fornecedor da planilha de produtos (5.844 produtos).
- Estoque mínimo: o Superus não tem; vai em branco, salvo pedido do Weslei.
- No teste (Etapa 4): o Bling aceitar o produto com o grupo fiscal e a categoria de 4º nível.
