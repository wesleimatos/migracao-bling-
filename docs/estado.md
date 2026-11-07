# Estado — onde paramos (atualizar ao fim de cada tarefa)

Atualizado: 07/11/2026, 19h40 (fim do plantão de sábado).

## Onde estamos
- A migração Superus → Bling terminou em 19–24/10: 13.001 produtos, 800 fornecedores, 500 categorias,
  5.859 vínculos e 3.194 estoques, 0 erros. O histórico está em `docs/historico.md`.
- Hoje o projeto é o **suporte do Bling** à loja ("Bling atacadao") e ao Compras ("Compras - suporte Ai"),
  em plantão de segunda a sábado, 8h–20h, com o Braço do Bling gravando no Bling.

## Pendências abertas
- **Compras, segunda 09/11 às 8h30** (agenda já criada): avisar os lotes feitos (KFS 12, SEMAAN 38, MACRO 42),
  os provisórios para completar custo/fornecedor (MCF-38A), o Wilson vermelha/preta sem cadastro, o Wilson
  preta duplicado, a Caixa de Som com custo acima do preço (só relatório), o Mordedor M-85 com estoque
  negativo, a diferença do Amolador, a lista dos 186 sem grupo de impostos para revisar e a NFC-e a excluir.
  Depois: duplicados, preços, estoque negativo e produtos sem fornecedor. Uma pendência por vez.
- **Pedido #9 do quadro (PDV):** ordem da atualização do PDV (promoções → usuários → configurações → carga;
  na carga: novos → com estoque → zerados). Com o PDV.
- **Terça de manhã:** relatório "preço ≤ custo" para o Compras (sem promoção).
- **Barras extras no caixa (pedido #184 ao PDV):** a lista `barras-extras-pdv.json` (24/10, 2.270 barras em 1.397 SKUs,
  página "Arquivos da migração") não está carregada no caixa. 4 casos em 07/11: 1001571, 1006816, 1000691 (e 100935,
  resolvido pelo Compras no Bling). O Braço confere a lista contra o Bling hoje às 20h30 (só leitura) e publica a
  versão limpa. Falta o PDV carregar. Até lá, a loja vende digitando o código.
- **Para o Compras (segunda):** 1001571 com fornecedor diferente da embalagem e estoque −63; 100935 perdeu a barra
  antiga 7899858717900 quando o GTIN foi trocado; unidade "Metros" no 100935 (padrão UN).
- **Pedido #171 (língua português do Brasil):** respondido "recebido" com atraso; gravar no CLAUDE.md com o OK do Weslei.

## Depende do Weslei
- Deixar o repositório privado (pedido #30). Prompt para o Claude do navegador já entregue em 07/11.
- Trocar a chave do Painel Zap (prompt para o Claude do navegador, com o OK dele).

## Em andamento
- Organização da memória do projeto (07/11, aprovada pelo Weslei): constituição, estado, histórico e
  decisões em `docs/`; CLAUDE.md curto; TROCA.md virou índice. Manuais de uso e técnico feitos.
  Scripts do plantão enviados cifrados à sessão VPS em 07/11 (pedido #157); falta a VPS confirmar.
- Plano do pedido #120 (arquitetura): este projeto fica fora do monólito; espera a vez depois do ERP.

## Próximo passo
- Continuar o plantão dos grupos e cumprir as pendências acima.
