# Estado — onde paramos (atualizar ao fim de cada tarefa)

Atualizado: 12/11/2026, 19h55 (fim do plantão de quinta).

## Quinta 12/11, o que foi feito
- Compras avisado às 8h30 (MARES 46/46; BRINQUE FELIZ 3/23, com as 20 restantes hoje às 20h30 pelo Braço; relatórios).
- ALTIMIX 18/18: o 7798 recebeu fornecedor ALTIMIX e marca. O Compras pôs SKU 7798 e 7745.
- Barras gravadas no GTIN de embalagem, item por item, para o caixa achar:
  - Lousa 16721126906;
  - Kit Lanche 16733146487;
  - Super Ferrovia 16733146483;
  - fone LR-14 16721124417;
  - Squishy Urso 16727561316.
- Guaraná garrafa: a loja cadastrou.
- #187: respondido ao PDV que 7888927600724 está só no SKU do Lixador (o 788 é recusado como EAN).
- Pendentes com o Compras:
  - SKU das 23 bonecas BRINQUE FELIZ;
  - SKU da Lousa trocado 2 vezes (hoje 7898572412696);
  - Squishy Urso: estoque 0 e nome "urso" para uma caixa de bolinho com coelho e gato.
- Plantão de sexta: abertura 8h (trig_01BQQXx6UYvBxG3MfhM5TtfG) e fechamento 19h51 (agendado).

## Novidades de 11 e 12/11
- **#212 (corte de gasto):** o Weslei decidiu manter o plantão (decisão 028). Saiu a conferência de hora em hora. Ficam:
  - a abertura às 8h;
  - o fechamento às 19h51 (trig_01VXq4ackTdQsb2qbnTpJFX6, quinta; trig_01BQQXx6UYvBxG3MfhM5TtfG, sexta 8h).
- **Fechamento de 11/11 não saiu:** a sessão ficou parada das 20h57 de 11/11 até as 8h de 12/11, por reinício.
  Nada chegou nos grupos nesse tempo.
- **Token local do Bling** desta sessão está desconectado desde 11/11. Toda leitura do Bling vai pelo Braço.
- **Braço:** travou às 20h36 de 11/11, esperando a aprovação de uma página. O Weslei vai liberar.
  Os lotes MARES e BRINQUE FELIZ foram disparados antes de travar; falta o relatório dele.
- **Guaraná garrafa 7891991014908:** sem cadastro no Bling (só a lata 103822). Pedir o cadastro ao Compras.
- **Categorias:** o Braço mandou a lista (500 categorias, 27 na raiz) à sessão original, que pediu para o Weslei.

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
- 12/11, 8h30: avisar o Compras do resultado do Braço (MARES, BRINQUE FELIZ, relatórios, sem SKU, Guaraná).
- Fechamento de quinta às 19h51; abertura de sexta às 8h.
