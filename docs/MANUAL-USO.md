# Manual de uso — Migração / suporte do Bling

Para o Weslei, a loja e o Compras. Português simples. Regras completas em `docs/constituicao.md`.

## Quem atende
- **🤖 Agente Claude** (sessão principal, "Migração Superus → Bling (envio pela nuvem)"): atende os grupos de
  WhatsApp de segunda a sábado, 8h–20h (no sábado a loja fecha às 19h).
- **Braço do Bling**: grava no Bling o que a sessão principal pede, sempre com cópia antes e conferência depois.
- Caixa, carga e sincronização são do **PDV**, que responde no mesmo grupo.

## Onde pedir
- **"Bling atacadao"**: a loja. Produto "não cadastrado", bloqueado, preço da etiqueta, barra que não bipa.
- **"Compras - suporte Ai"**: o Compras. Cadastro, preço, custo, fornecedor, NCM, relatórios e lotes.
- **Outros projetos**: quadro `wesleimatos/pedidos`, etiqueta "para: migracao-bling" (resposta em até 1 hora).

## O que é feito na hora (sem novo OK)
- Correção de um item com cliente no caixa: barra no EAN, preço da etiqueta, cadastro PROVISÓRIO quando o
  produto não existe. Tudo é anotado para o Compras revisar no próximo expediente.
- Pedido do Compras no grupo deles vale como OK. Lote é sugerido para a noite; se for urgente, é feito na
  hora, devagar e item a item.

## O que espera o OK do Weslei (ou do Compras)
- Lote ou decisão nova fora das regras, produto novo definitivo, preço de venda, exclusão, estoque, usuários.
- Nunca se faz: excluir produto, trocar o código de produto etiquetado, inventar número, criar promoção.

## Horários
- Leitura ou mudança em massa no Bling: só das 20h às 8h, e nunca das 2h às 5h (revisão do PDV).
- Compras: segunda a sexta, 8h30–18h. Fora disso, a pendência fica guardada para o próximo expediente.
- Terça de manhã: relatório "preço ≤ custo" para o Compras (só para revisar preço ou custo).
- Todo dia às 20h (sábado 19h30): resumo do dia para o Weslei.

## Onde ver os resultados
- Página privada "Arquivos da migração" (listas, planilhas de revisão e registro mensal).
- Onde paramos e o que está pendente: `docs/estado.md`.
