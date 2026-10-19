# Fornecedores: Superus → Bling

## O que veio do Superus
Planilha da consulta 64 "FORNECEDORES COMPLETO" (XLSX), um fornecedor por linha. Substitui a
"RELATORIO FORNECEDOR" (mesmos 804 fornecedores e mesmos valores, mais IE e telefones):

`CODIGO, RAZAO, NOME, CNPJ, CPF, IE, TIPOPESSOA, LOGRADOURO, ENDERECO, COMPLEMENTO, BAIRRO, CIDADE,
ESTADO, CEP, EMAIL, CONTATO, PRAZOPAGAMENTO, PRAZOENTREGA, TELEFONE_PRINCIPAL, TODOS_TELEFONES,
QTD_TELEFONES, PRODUTOS_ATIVOS`

Conferência feita em 19/10/2026:
- **804 fornecedores**: 663 pessoa jurídica (J), 140 pessoa física (F) e 1 marcado "O" (tem CNPJ).
- Todos têm CNPJ ou CPF, e **todos os dígitos verificadores conferem**. Nenhum código repetido.
- **CNPJ/CPF repetido:** 3 casos, somando 7 cadastros (o mesmo documento com 2 ou 3 códigos).
- 277 fornecedores têm produtos ativos (6.121 ligações). Os outros 527 vão também.
- 14 sem endereço; 355 sem e-mail. UF e CEP todos no formato certo. Acentos certos (ex.: SÃO PAULO).
- `CONTATO` = "N" em todos; `PRAZOPAGAMENTO` e `PRAZOENTREGA` = 0 em todos.
- **IE:** 499 preenchidas (498 números e 1 "ISENTO"), todas de pessoa jurídica; 164 pessoas
  jurídicas sem IE. 9 IEs têm tamanho fora do padrão da UF (ex.: SP com 13 dígitos).
- **Telefones:** 738 fornecedores têm telefone (653 com 1 número, 84 com 2, 1 com 3); 66 sem
  nenhum. Formatos misturados ("31 3333-4444", "31999998888", "(31) 3333-444"...); 162 números
  têm 9 dígitos sem ser celular, provavelmente incompletos no próprio Superus.

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
| IE | `ie` + `indicadorIe` | só dígitos e `indicadorIe` = 1; "ISENTO" → sem IE e `indicadorIe` = 2; vazio → não manda. Se o Bling recusar a IE, cria sem ela e lista no relatório |
| TODOS_TELEFONES | `celular` | o 1º número que for celular (11 dígitos com DDD, 3º dígito 9), do jeito que está no Superus, sem o rótulo "COMERCIAL" |
| TODOS_TELEFONES | `telefone` | os outros números, separados por " / " (assim nenhum se perde) |
| TELEFONE_PRINCIPAL, QTD_TELEFONES | — | já estão dentro de TODOS_TELEFONES |
| — | `situacao` = `A`; `tiposContato` = Fornecedor | fixo |
| CONTATO | — | só uma marcação S/N sem uso no Superus (resposta do COMPUTADOR, 19/10/2026) |
| PRAZOPAGAMENTO, PRAZOENTREGA | — | sem informação (todos 0) |
| PRODUTOS_ATIVOS | — | só conferência |

Não duplicar: antes de criar, `GET /contatos?numeroDocumento=<dígitos>`. Tabela local: código do
Superus → id do Bling.

## CNPJ/CPF repetido: juntar (decisão do Weslei, 19/10/2026)
- Cada CNPJ/CPF vira **um** fornecedor no Bling. Os 3 casos (7 cadastros) viram 3 fornecedores.
- O `codigo` no Bling fica com o cadastro que tem mais produtos ativos (empate: o menor código).
- Na tabela local, todos os códigos antigos apontam para esse mesmo fornecedor do Bling. Assim os
  produtos e as contas a pagar de qualquer um deles ficam ligados a ele.

## A confirmar no envio de teste
- O Bling aceitar dois números no campo `telefone` e as IEs de tamanho fora do padrão.
- O Bling aceitar como contato o CNPJ da própria empresa (ATACADAO MULTIMARCAS aparece como fornecedor).
