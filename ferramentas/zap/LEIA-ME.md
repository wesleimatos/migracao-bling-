# Plantão do WhatsApp — como ligar numa sessão nova

1. Abra a sessão no ambiente **MIGRACAOBLING**. A chave do Painel Zap está guardada nesse ambiente como segredo
   de rede (formulário seguro, 18/11), e o proxy da nuvem a coloca sozinho nos pedidos a zap.focosaas.com.br.
   A chave nunca aparece no chat, no Git nem em arquivo. Em outro ambiente, peça a chave pelo formulário
   seguro (request_credential, host zap.focosaas.com.br, cabeçalho X-API-Key).
2. Rode sempre com estas variáveis, porque sem elas o Node não passa pelo proxy e a API responde 401:
   `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt NODE_NO_WARNINGS=1`
3. Comandos (dentro de `ferramentas/zap/`):
   - `node zap.mjs hist loja 15` / `node zap.mjs hist compras 15`: últimas mensagens; filtre com `grep -v '"api":true'`.
   - `node zap.mjs enviar compras f.txt [waIdCitado]`: envia (o prefixo "🤖 *Agente Claude*" entra sozinho).
     Para não mandar em dobro, use a repetição: `for i in 1 2 3 4; do r=$(node zap.mjs enviar ...); echo "$r"; case "$r" in 201*) break;; esac; sleep 10; done`.
   - `node zap.mjs vigia`: espera mensagem nova nos 2 grupos. Rode em segundo plano (run_in_background,
     timeout 7200000) e religue a cada saída até as 20h. Sai com a mensagem nova ou com SEM_NOVIDADE.
   - `node zap.mjs baixar <id>`: salva a foto em `~/zap-dados/midia/`.
4. A linha CORPORATIVO e os grupos são achados pelo nome na primeira vez e guardados em `~/zap-dados/config.json`
   (fora do Git). Pendências do dia vão em `~/zap-dados/pendencias.txt` (fora do Git); o resumo fica no ESTADO.md.
5. Regras: `docs/constituicao.md`, seção 7. Só os dois grupos; não marcar como lido, apagar, agendar ou desconectar;
   nada de mensagem de teste; nunca promoção.
