# Fornecedores: Superus → Bling

## O que veio do Superus
Planilha "RELATORIO FORNECEDOR" (XLSX), um fornecedor por linha:

`CODIGO, RAZAO, NOME, CNPJ, CPF, TIPOPESSOA, LOGRADOURO, ENDERECO, COMPLEMENTO, BAIRRO, CIDADE,
ESTADO, CEP, CONTATO, EMAIL, PRAZOPAGAMENTO, PRAZOENTREGA, PRODUTOS_ATIVOS`

Conferência feita em 19/10/2026:
- **804 fornecedores**: 663 pessoa jurídica (J), 140 pessoa física (F) e 1 marcado "O" (tem CNPJ).
- Todos têm CNPJ ou CPF, e **todos os dígitos verificadores conferem**. Nenhum código repetido.
- **CNPJ/CPF repetido:** 3 casos, somando 7 cadastros (o mesmo documento com 2 ou 3 códigos).
- 277 fornecedores têm produtos ativos (6.121 ligações). Os outros 527 vão também.
- 14 sem endereço; 355 sem e-mail. UF e CEP todos no formato certo. Acentos certos (ex.: SÃO PAULO).
- `CONTATO` = "N" em todos; `PRAZOPAGAMENTO` e `PRAZOENTREGA` = 0 em todos.
- **Faltam na planilha:** inscrição estadual (IE) e telefones. Pedido ao COMPUTADOR no quadro.

## De → para

| Superus | Bling (`POST /contatos`) | Regra |
|---|---|---|
| CODIGO | `codigo` | igual; serve para achar o fornecedor no Bling pelo código antigo |
| RAZAO | `nome` | igual |
| NOME | `fantasia` | igual |
| CNPJ ou CPF | `numeroDocumento` | só os dígitos |
| TIPOPESSOA | `tipo` | pelo documento: 14 dígitos → `J`, 11 → `F` (o "O" vira `J`) |
| LOGRADOURO | `endereco.geral.endereco` | igual |
| ENDERECO | `endereco.geral.numero` | o número que vem depois da última vírgula e antes do "-"; sem número → `S/N` |
| COMPLEMENTO | `endereco.geral.complemento` | igual |
| BAIRRO, CIDADE, ESTADO, CEP | `bairro`, `municipio`, `uf`, `cep` | iguais |
| EMAIL | `email` | igual |
| IE (falta) | `ie` + `indicadorIe` | quando chegar |
| telefones (falta) | `telefone`, `celular` | quando chegar |
| — | `situacao` = `A`; `tiposContato` = Fornecedor | fixo |
| CONTATO, PRAZOPAGAMENTO, PRAZOENTREGA | — | sem informação (todos iguais) |
| PRODUTOS_ATIVOS | — | só conferência |

Não duplicar: antes de criar, `GET /contatos?numeroDocumento=<dígitos>`. Tabela local: código do
Superus → id do Bling.

## CNPJ/CPF repetido: juntar (decisão do Weslei, 19/10/2026)
- Cada CNPJ/CPF vira **um** fornecedor no Bling. Os 3 casos (7 cadastros) viram 3 fornecedores.
- O `codigo` no Bling fica com o cadastro que tem mais produtos ativos (empate: o menor código).
- Na tabela local, todos os códigos antigos apontam para esse mesmo fornecedor do Bling. Assim os
  produtos e as contas a pagar de qualquer um deles ficam ligados a ele.

## A confirmar no envio de teste
- O Bling aceitar como contato o CNPJ da própria empresa (ATACADAO MULTIMARCAS aparece como fornecedor).
