# O que copiar do pdv-para-bling

Lido em 19/10/2026 (wesleimatos/pdv-para-bling, commit f935754). Só leitura, nada foi alterado lá.

## Cliente da API (`src/main/bling/cliente.ts`)
- Base: `https://api.bling.com.br/Api/v3`.
- Fila: uma requisição por vez, no mínimo 350 ms entre elas (fica abaixo do limite de 3/s).
- Timeout de 30 s (`AbortSignal.timeout(30_000)`).
- 401: renova o token uma vez e repete. Só uma renovação por vez, mesmo com várias chamadas esperando.
- 429: espera 1 s, 2 s, 4 s e 8 s (até 4 tentativas).
- 5xx ou falha de rede: erro "de rede" (a fila para e tenta de novo depois). 4xx: erro "da API",
  com a mensagem do Bling (`error.description` + `error.fields[].msg`).
- Renova o token 2 min antes de vencer.
- Listas na consulta saem como `chave[]=a&chave[]=b`.

## Autorização (`src/main/bling/oauth.ts`)
- Autorizar: `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=...&state=...`
- Token: `POST https://www.bling.com.br/Api/v3/oauth/token`, `Authorization: Basic base64(clientId:secret)`,
  corpo `application/x-www-form-urlencoded` (`grant_type=authorization_code&code=...` ou
  `grant_type=refresh_token&refresh_token=...`). Com "www" (sem ele o Bling redireciona o POST).
- **Diferença na migração:** o PDV recebe o retorno em `localhost:53682`; aqui o retorno é a rota
  `GET /bling/callback` do próprio app, em `https://migra.focosaas.com.br/bling/callback`,
  conferindo o `state`.
- Refresh token recusado (400/401) = desconectado: apaga os tokens e pede para conectar de novo.

## Segredos (`cofre.ts`, `credenciais.ts`)
- Client ID, Client Secret e tokens ficam na tabela de configuração; Secret e tokens cifrados.
- **Diferença na migração:** o PDV cifra com o DPAPI do Windows. No servidor: `node:crypto`
  (AES-256-GCM) com a chave num arquivo em `dados/` (chmod 600), fora do banco.

## Envio por etapas (`src/main/bling/envio.ts`)
- Cada registro guarda a etapa em que está; etapa feita não se repete numa nova tentativa.
- Antes de criar, procura no Bling se já existe (ex.: contato por `numeroDocumento`). Assim não duplica.
- Ação que o Bling responde "já lançado" conta como feita.
- Erro do Bling fica gravado no registro, com nova tentativa em 1, 5, 15, 60 e 240 min. Erro de
  rede para a fila inteira.

## Rotas da API que o PDV já usa
`/categorias/produtos`, `/contatos` (filtro `numeroDocumento`; `tipo` J ou F; `situacao` A),
`/depositos`, `/formas-pagamentos`, `/produtos`, `/produtos/{id}`, `/estoques/saldos/{deposito}`.
Os campos de criação (produto com `tributacao`, fornecedor do produto, balanço de estoque, contas a
pagar, categorias financeiras) só serão fechados depois de ler a OpenAPI oficial.

## Testes (`tests/bling.test.ts`)
- Bling falso: um `fetch` que responde por rotas (expressões regulares no caminho) e grava as
  chamadas feitas, para conferir a ordem e os parâmetros.
- O PDV usa vitest. Aqui, sem dependências: `node:test` + `node:assert`, com o mesmo Bling falso.
