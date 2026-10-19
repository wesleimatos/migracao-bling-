# PROMPT — Claude no computador: criar os grupos fiscais no Bling

> Colar no app do Claude no computador, com o Bling aberto no navegador (o Weslei faz o login).
> É o Pedido #5 do quadro.

```
Você é o "CLAUDE DO COMPUTADOR" da migração Superus → Bling. Fale comigo (Weslei) em
português simples.

EXCEÇÃO AUTORIZADA POR MIM (WESLEI)
No Bling, a regra continua sendo só leitura. A única exceção deste pedido é CRIAR os 6 grupos
de produtos da lista abaixo. Mais nada: não altere produtos, categorias, naturezas de operação,
regras fiscais nem configurações.

OBJETIVO
Cada produto do Superus tem um perfil fiscal (CST de ICMS, PIS/COFINS, IPI). O Bling não guarda
isso no produto: ele calcula pela natureza de operação. Para não perder essa informação, cada
produto vai ser ligado a um "grupo de produtos" do Bling, e a contadora configura a regra
fiscal de cada grupo.

GRUPOS A CRIAR (nome exato, sem grupo pai)
| Grupo                                | Produtos | ICMS no Superus               | CFOP mais usado | PIS/COFINS                    | IPI    |
|--------------------------------------|----------|-------------------------------|-----------------|-------------------------------|--------|
| FISCAL 00 - TRIBUTADO 18%            | 7.675    | CST 00, 18%                   | 5102            | CST 01: 1,65% / 7,6%          | CST 53 |
| FISCAL 60 - ICMS ST                  | 5.126    | CST 60 (ST cobrado antes)     | 5405            | CST 01: 1,65% / 7,6%          | CST 53 |
| FISCAL 60 - ICMS ST + PIS/COFINS ZERO| 8        | CST 60                        | 5405            | CST 06 (7 produtos) ou 04 (1) | CST 53 |
| FISCAL 90 - ICMS OUTROS              | 152      | CST 90 (0% em 121, 18% em 31) | 5949 e 5102     | CST 01 (1 produto com 08)     | CST 53 |
| FISCAL 41 - ICMS NAO TRIBUTADO       | 37       | CST 41                        | 5102            | CST 01 (1 produto com 06)     | CST 53 |
| FISCAL 20 - ICMS COM REDUCAO         | 2        | CST 20, 18%, redução 51,11%   | 5102            | CST 01                        | CST 99 |

PASSOS
1. Só olhar primeiro: ache no Bling a tela de "Grupos de produtos" e me mostre. Diga se já
   existe algum grupo cadastrado. Ache também, na natureza de operação de venda, onde se
   configura a tributação por grupo de produtos, e me mostre (sem mudar nada).
2. Com o meu OK: crie os 6 grupos com os nomes exatos da tabela, sem grupo pai. Se aparecer
   qualquer janela pedindo para confirmar outra alteração, cancele e me pergunte.
3. Confira a lista de grupos no final: os 6 nomes, sem repetição.
4. Não configure regras fiscais. Isso é com a contadora. Só me diga em que tela ela faz isso.

NO FIM
- No quadro (TROCA.md, repositório wesleimatos/migracao-bling-): marque o Pedido #5 como feito
  e escreva em "Entregas" os 6 grupos criados (nome e id, se o Bling mostrar o id) e o caminho
  de menu da tributação por grupo. Commit "quadro: #5 feito" e git push.
- Me diga em uma linha: "Pedido #5 feito, avise o Claude Code".

REGRAS
- Senha: pare e me peça; eu digito. Nunca escreva senha no quadro.
- Não feche nem mude configurações do Superus nem do Bling.
```

## Para a contadora
A tabela acima é o resumo do Superus. Casos fora do padrão (ficam no grupo do seu CST e saem
listados no relatório): 6 produtos com CST 00 e alíquota 0%, 4% ou 12%; 18 com CST 60 e
alíquota 18%; 1 produto sem CST.
