# migracao-bling

Migração única do ERP **Superus** para o **Bling** (API v3), loja Oiapoque.
O app lê as planilhas exportadas do Superus, confere tudo e envia para o Bling na ordem certa, sem
duplicar. Desenho aprovado em `docs/DESENHO.md`; brief em `docs/BRIEF-MIGRACAO-BLING.md`; quadro de
pedidos em `TROCA.md`.

## Situação
- **Etapa 1 pronta:** planilhas, ligação de colunas e conferência com totais.
- **Etapa 2 pronta:** login, conexão com o Bling (OAuth), fila de envio (teste e completo),
  relatório. Testada com um Bling falso; ainda não falou com o Bling de verdade.
- Próxima: **Etapa 3**, app na VPS pela sessão "VPS".

| Tela | O que faz |
|---|---|
| Entrar | Senha única do Weslei (criada no primeiro acesso) |
| Início | As 5 planilhas, quantas linhas vão para o Bling e a situação de cada uma |
| Planilhas | Envio dos arquivos do Superus (XLSX ou CSV) |
| Colunas | Qual coluna do Superus vai em cada campo (já vem preenchido; mostra exemplos) |
| Conferência | Totais para bater com o Superus, erros e avisos por tipo, lista para o Excel |
| Bling | Client ID e Secret, conectar, cadastros lidos do Bling (grupos, depósito...) |
| Ligar contas a pagar | Categoria e forma de pagamento do Superus → as do Bling |
| Envio | Teste (registros "TESTE"), apagar testes, envio completo, andamento, pausar |
| Relatório | Enviados, já existiam, erros e avisos; reenviar só os erros; lista para o Excel |

## Como rodar
Node 22.18 ou mais novo (a VPS tem o 24). Sem dependências: não precisa de `npm install`.

```
npm start      # http://127.0.0.1:8100
npm test       # testes automáticos (67)
```

| Variável | Padrão | Na VPS |
|---|---|---|
| `PORT` | 8100 | 8101 |
| `HOST` | 127.0.0.1 | 127.0.0.1 |
| `DADOS` | `dados/` | `/opt/migracao-bling/dados` |
| `CONFIAR_PROXY` | (vazio) | `1` (IP, HTTPS e host vêm do proxy: cookie `Secure`) |

## Segurança
- Senha com scrypt; sessão em cookie `HttpOnly; SameSite=Lax` (e `Secure` atrás do HTTPS), 12 h.
- 5 senhas erradas bloqueiam o IP por 15 minutos.
- Formulário vindo de outro site é recusado (cabeçalho `Origin`).
- Client Secret e tokens do Bling cifrados (AES-256-GCM) no banco; a chave fica em
  `dados/chave-cofre` (chmod 600). Nada disso vai para o Git, o chat ou o quadro.
- Planilhas e banco só em `dados/` (fora do Git).

## Como o envio funciona
- Ordem do brief: categorias → fornecedores → produtos → produto × fornecedor → estoque → contas.
- 1 chamada a cada 350 ms; espera quando o Bling pede; o limite do dia para o envio (continua depois).
- **Não duplica:** cada registro fica gravado ("código do Superus → id no Bling"). Antes de criar,
  procura no Bling: categorias pelo nome e pai, fornecedores pelo CPF/CNPJ, produtos pelo código (de
  100 em 100). Se uma chamada caiu no meio, confere no Bling antes de criar de novo.
- Erro do Bling num registro fica anotado e o envio segue; queda de internet ou acesso vencido param
  tudo, e o "continuar" segue de onde parou. "Reenviar só os erros" tenta de novo só o que falhou.
- **Teste:** 5 produtos (com GTIN, fornecedor e estoque, misturando COM ST e SEM ST), as categorias
  acima deles, os fornecedores e 2 contas, tudo com "TESTE" no código, nome ou histórico. "Apagar
  testes" remove do Bling só o que o teste criou. O envio completo fica travado até apagar.

## Pastas
| Pasta | O quê |
|---|---|
| `src/planilhas/` | Leitura de XLSX (leitor próprio, sem biblioteca) e CSV (UTF-8 ou ANSI) |
| `src/regras/` | Uma regra por cadastro, seguindo `docs/MAPEAMENTO-*.md` |
| `src/bling/` | Cliente da API, OAuth, cofre, cadastros do Bling, montagem dos envios e a fila |
| `src/servidor.ts`, `src/telasEnvio.ts` | Telas e rotas (`node:http`) |
| `src/seguranca.ts` | Login, sessões e limite de tentativas |
| `src/banco.ts` | SQLite (`node:sqlite`) |
| `tests/` | Testes com planilhas inventadas e um Bling falso (nenhum dado real) |

## Regras principais (decisões do Weslei)
- Categorias iguais ao Superus: setor → grupo → subgrupo → categoria (500 no Bling).
- Fornecedor com CPF/CNPJ repetido vira um só; o que ficar herda IE, telefones e e-mail dos outros.
- Produtos: unidade `UN`; CST 60 → grupo **COM ST**, o resto → **SEM ST**; só GTIN válido no campo
  de código de barras (os outros códigos vão nas observações); estoque negativo entra zerado;
  depósito "Geral".
- Contas a pagar: só em aberto; cada parcela é uma conta.

## A confirmar no teste real (Etapa 4)
- O Bling aceitar 4 níveis de categoria e o grupo de produtos dentro de `tributacao`.
- Criar produto já inativo; apagar produto (o app põe em "Excluído" antes, se o Bling pedir).
- GTIN de um produto de teste apagado não bloquear o mesmo GTIN no envio completo.
- Dois números no campo `telefone` e as IEs fora do padrão (se recusar, vai sem IE e fica anotado).
- Campos que a OpenAPI marca como obrigatórios nas contas a pagar (`numeroBanco`, `borderos`).
