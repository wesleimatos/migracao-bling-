# Manual técnico — migracao-bling-

Índice do que existe e onde. Os detalhes ficam em cada arquivo.

## Código da migração (Node + TypeScript)
- `src/bling/`: cliente da API v3 (`cliente.ts`), OAuth (`oauth.ts`), credenciais e cofre cifrado
  (`credenciais.ts`, `cofre.ts`), montagem dos envios (`payloads.ts`, `envio.ts`, `catalogos.ts`).
- `src/planilhas/`: leitura de XLSX e CSV sem biblioteca. `src/regras/`: regras de cada cadastro e conferência.
- `src/cli.ts`: comandos do modo nuvem. `src/servidor.ts`, `src/telasEnvio.ts`, `src/html.ts`: telas do app.
- Testes em `tests/`. Como rodar e pastas: `README.md` ("Como rodar" e "Pastas").

## Documentos de referência
- Modo nuvem (o Claude faz os cadastros pelos comandos): `docs/EXECUCAO-NUVEM.md`.
- Instalação na VPS (cancelada pelo modo nuvem, guardada como referência): `docs/IMPLANTACAO-VPS.md`.
- API do Bling e PDV: `docs/REFERENCIA-API-BLING.md`, `docs/REFERENCIA-PDV-PARA-BLING.md`.
- Regras de cada cadastro: `docs/MAPEAMENTO-CATEGORIAS.md`, `-PRODUTOS`, `-FORNECEDORES`, `-CONTAS-PAGAR`.
- Desenho aprovado: `docs/DESENHO.md`. Brief: `docs/BRIEF-MIGRACAO-BLING.md`.

## Plantão (fora do Git)
- Scripts do WhatsApp (vigia dos dois grupos, envio, histórico, baixar foto): hoje só no container da sessão
  principal; vão para o servidor (VPS), fora do GitHub (pedido #157). A chave do Painel Zap fica num arquivo
  à parte e nunca entra em script, Git ou chat.
- Braço do Bling: scripts e cópias (backups) em `dados/braco/`, no container dele, fora do Git.
- Agendas do plantão: vigia de hora em hora, plantão das 8h, resumo das 20h e relatório de terça.

## Limites que não podem ser esquecidos
- No máximo 1 consulta por segundo na API do Bling (o PDV usa a mesma conta). Leitura em massa só das 20h
  às 8h, nunca das 2h às 5h.
- O Bling aceita GTIN repetido, mas não SKU repetido. Ele recusa no GTIN as barras fora do GS1.
- Produto sem grupo de impostos faz a NFC-e ser recusada.
