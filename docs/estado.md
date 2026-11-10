# Estado — onde paramos (atualizar ao fim de cada tarefa)

Atualizado: 10/11/2026, 20h05 (fim do plantão de terça).

## Onde estamos
- A migração Superus → Bling terminou em 19–24/10: 13.001 produtos, 800 fornecedores, 500 categorias,
  5.859 vínculos e 3.194 estoques, 0 erros. O histórico está em `docs/historico.md`.
- Hoje o projeto é o **suporte do Bling** à loja ("Bling atacadao") e ao Compras ("Compras - suporte Ai"),
  em plantão de segunda a sábado, 8h–20h, com o Braço do Bling gravando no Bling.
- A sessão principal ficou fora do ar de 09/11 ~12h até 10/11 11h13. Nesse tempo ficaram sem resposta 3 casos
  da loja (a cola, a caneta Flamingo e um print de relatório), e o resumo e a agenda de 09/11 não foram feitos.

## Pendências abertas
- **Braço, hoje à noite (10/11, a partir das 20h30):**
  - 18 produtos ALTIMIX recebem fornecedor ALTIMIX e marca "ALTIMIX - ALTITOYS" (pedido do Compras, 17h06);
  - barra 7898714607041 no 1004964;
  - teste do GTIN 7888927600724 no Lixador AJ-F07-B (id 16733245597);
  - CSVs "preço ≤ custo" e "preços alterados" (só leitura).
- **Quarta 11/11, 8h30 (agenda criada):** avisar o Compras do resultado da noite. Depois, uma pendência por vez:
  - categoria em ~200 produtos (João, 09/11; esperando a planilha);
  - Wilson GB001D provisório × 101122;
  - 100935 perdeu a barra antiga;
  - 1001571: fornecedor diferente da embalagem e estoque −63;
  - MCF-38A provisório;
  - duplicados, estoque negativo e produtos sem fornecedor.
- **Barras extras no caixa (pedido #184 ao PDV):** são 7 casos desde 07/11 e o PDV não respondeu. A lista limpa
  `barras-extras-pdv-2026-11-07.json` está na página "Arquivos da migração". Até ela entrar, a loja vende
  digitando o código.
- **Webhooks do Bling para o PDV (#187):** dependem de o PDV dizer qual aplicativo tem o Client Secret no painel.
  Foi perguntado em 08/11 e de novo em 10/11.
- **Painel do PDV × barra no SKU (#187, 10/11):** o "Atualizar do Bling" não acha produtos cuja barra está só no
  SKU (exemplo: o Lixador 7888927600724). Foi sugerido ao PDV procurar também pelo SKU.
- **Pedido #9 (PDV):** ordem da atualização do PDV, com o PDV.

## Depende do Weslei
- Trocar a chave do Painel Zap. O vigia está parado desde as 20h, o que permite a troca agora.

## Em andamento
- Plano do pedido #120 (arquitetura): este projeto fica fora do monólito e espera a vez depois do ERP.
- Os scripts do plantão estão na VPS desde 07/11, em `/opt/migracao-bling/ferramentas/zap/` (pedido #157, fechado).

## Próximo passo
- Plantão de quarta 11/11 às 8h (agenda trig_01TgVUzMQAu1iwj54793Pfvg).
