# Estado — onde paramos (atualizar ao fim de cada tarefa)

Atualizado: 07/11/2026.

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

## Depende do Weslei
- Deixar o repositório privado (pedido #30). Prompt para o Claude do navegador já entregue em 07/11.
- Trocar a chave do Painel Zap (prompt para o Claude do navegador, com o OK dele).

## Em andamento
- Organização da memória do projeto (07/11, aprovada pelo Weslei): constituição, estado, histórico e
  decisões em `docs/`; CLAUDE.md curto; TROCA.md virou índice. Scripts do plantão vão para o servidor (VPS),
  fora do GitHub, por pedido à sessão VPS.
- Plano do pedido #120 (arquitetura): este projeto fica fora do monólito; espera a vez depois do ERP.

## Próximo passo
- Continuar o plantão dos grupos e cumprir as pendências acima.
