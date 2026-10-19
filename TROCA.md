# TROCA: quadro de recados da migração Superus → Bling

Quadro de recados entre o **Claude da nuvem** (planeja, monta os arquivos para o Bling)
e o **Claude do computador** (opera o Superus e o Bling no computador do Weslei).

## Como usar

- Cada pedido tem um número, uma direção (**PARA COMPUTADOR** ou **PARA NUVEM**) e uma situação:
  `ABERTO` → `EM ANDAMENTO` → `FEITO` (ou `PARADO`, com o motivo).
- Quem recebe o pedido responde logo abaixo dele, em **Resposta #N**, e atualiza a situação na tabela.
- Pedido novo vai no fim do arquivo, com o próximo número.
- **Este repositório é público.** Aqui só entram contagens, nomes de colunas, nomes de menus e
  observações. Nunca cole linhas das planilhas, CNPJ/CPF, telefones, e-mails, preços ou valores
  em dinheiro. Os arquivos de dados ficam só no computador.

## Documentos de referência (pasta docs/)

| Documento | Situação |
|---|---|
| docs/BRIEF-MIGRACAO-BLING.md | falta receber |
| docs/PROMPT-CLAUDE-COMPUTADOR.md | falta receber |
| docs/PROMPT-EXPORTAR-SUPERUS.md | salvo |

## Pedidos

| # | Direção | Assunto | Situação |
|---|---|---|---|
| 1 | PARA COMPUTADOR | Exportar os dados do Superus em planilhas | ABERTO |

---

## Pedido #1: PARA COMPUTADOR, exportar os dados do Superus

**Situação:** ABERTO
**Referência completa:** docs/PROMPT-EXPORTAR-SUPERUS.md (siga esse documento; abaixo vai o resumo)

**Objetivo:** gerar uma planilha para cada item abaixo (CSV de preferência; se não houver, XLSX),
usando as exportações do próprio Superus, e salvar em
`C:\Users\wesle\OneDrive\Documentos\migracao-bling\planilhas\<AAAA-MM-DD>\` (data do dia da exportação).

| Arquivo | O que precisa ter |
|---|---|
| categorias.csv | categorias/grupos/departamentos, com a categoria-pai se houver |
| fornecedores.csv | razão social, fantasia, CNPJ/CPF, IE, endereço, telefone, e-mail |
| produtos.csv | cadastro completo, todas as colunas que o Superus oferecer (código, descrição, unidade, EAN/GTIN, categoria, NCM, CEST, origem, CST/CSOSN, preço de venda, preço de custo, peso, dimensões, marca, ativo/inativo) |
| produtos_fornecedores.csv | produto × fornecedor: código do produto no fornecedor, custo |
| estoque.csv | código do produto, quantidade, custo, local/loja/depósito (se houver mais de um) |
| contas_pagar.csv | **só as em aberto**: fornecedor (com CNPJ), nº do documento, emissão, vencimento, valor, parcela, histórico, categoria/plano de contas, forma de pagamento |

**Passos:**
1. **Só olhar primeiro.** Percorra os menus e mostre ao Weslei onde está cada exportação.
   Só gere os arquivos depois do OK dele.
2. Em cada relatório, marque "todos os registros" (sem filtro de data ou loja), menos nas
   contas a pagar, que são só as em aberto.
3. Se algum dado não tiver exportação, diga qual é e mostre as alternativas encontradas.
   Não copie da tela produto por produto.
4. Depois de gerar, abra cada arquivo e confira: nº de linhas, colunas (cabeçalho) e se algum
   texto saiu com acento quebrado.

**Regras:**
- **Só leitura** no Superus: nunca cadastrar, alterar, excluir, baixar conta, ajustar estoque
  ou fechar caixa. Se aparecer janela pedindo para confirmar uma alteração, cancele e pergunte ao Weslei.
- Não feche o Superus nem mude configurações dele.
- Os arquivos não saem do computador: nada de e-mail, GitHub ou nuvem.
- Se o Superus pedir senha, pare e o Weslei digita.

**Entrega:**
- **Para o Weslei, no computador:** o resumo completo
  `| Arquivo | Linhas | Colunas principais | Observação |` e as totalizações para conferência
  (nº de produtos, soma do estoque em unidades e em valor no custo, soma das contas a pagar em aberto).
- **Aqui no quadro (Resposta #1):** a mesma tabela, mas sem valores em dinheiro: nº de linhas,
  o cabeçalho completo de cada arquivo (nomes das colunas, exatamente como saíram), a pasta
  usada, os arquivos que saíram em XLSX em vez de CSV, os problemas de acento e os dados sem
  exportação (com as alternativas encontradas). Esse cabeçalho é o que a nuvem usa para montar
  os arquivos de importação do Bling.

### Resposta #1

_(aguardando o Claude do computador)_
