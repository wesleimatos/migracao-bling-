# Contas a pagar: Superus → Bling

O Weslei decidiu (19/10/2026) não mandar ao CODE as planilhas 65 (contas a pagar em aberto),
66 (categorias financeiras e formas de pagamento) e 67 (produtos × fornecedores). Elas entram
direto na tela do app, na Etapa 4, e o Weslei liga as colunas lá. Por isso esta regra foi
escrita sem ver os dados; a conferência acontece na própria tela.

## Colunas pedidas ao Superus
fornecedor (código e CNPJ), nº do documento, emissão, vencimento, valor, parcela, histórico,
categoria/plano de contas e forma de pagamento. Só as contas em aberto.

## De → para (`POST /contas/pagar`)

| Superus | Bling | Regra |
|---|---|---|
| fornecedor (código; CNPJ se o código não achar) | `contato.id` | pela tabela local de fornecedores (o fornecedor tem que ter ido antes) |
| nº do documento | `numeroDocumento` | igual |
| emissão | `dataEmissao` e `competencia` | AAAA-MM-DD |
| vencimento | `vencimento` e `vencimentoOriginal` | AAAA-MM-DD |
| valor | `valor` | igual |
| parcela | `historico` | cada parcela é uma conta separada; a parcela vai escrita no histórico (ex.: "2/5") |
| histórico | `historico` | igual, junto com a parcela |
| categoria/plano de contas | `categoria.id` | o Weslei liga cada nome do Superus a uma categoria de despesa do Bling, na tela |
| forma de pagamento | `formaPagamento.id` | o Weslei liga cada nome do Superus a uma forma do Bling, na tela |
| — | `situacao` = 1 (aberto) | fixo |

## Conferência antes de enviar (brief)
Fornecedor inexistente, valor zerado ou negativo, vencimento inválido, duplicadas e o total para
bater com o Superus. Duplicada = mesmo fornecedor, documento, vencimento, parcela **e valor** (mais
justo que o brief, para não descartar duas parcelas diferentes com o mesmo vencimento).

Não duplicar: antes de criar, `GET /contas/pagar?idContato=&situacao=1&dataVencimentoInicial=&dataVencimentoFinal=`
no dia do vencimento, comparando nº do documento e valor.

## Antes da Etapa 4 (Weslei)
Criar no Bling as categorias de despesa e as formas de pagamento que o Superus usa (brief, seção 8).
