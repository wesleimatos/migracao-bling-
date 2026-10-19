# TROCA — quadro da migração Superus → Bling

## Agora
Etapa: 3 (modo nuvem) · Com a bola: WESLEI (Pedido #8) · Depois: CODE faz o teste e o envio completo pela nuvem

Repositório: `wesleimatos/migracao-bling-` (com traço no fim; o Weslei escolheu usar este no lugar
de `migracao-bling`). Fica **público** por decisão do Weslei e será excluído no fim do projeto.
Referências em `docs/`; regras de cada cadastro em `docs/MAPEAMENTO-*.md`.
**Modo nuvem** (decisão do Weslei, 19/10/2026): o app **não** vai para a VPS; o Claude da nuvem faz os
cadastros no Bling por comandos (`src/cli.ts`). Roteiro em `docs/EXECUCAO-NUVEM.md`.

## Como usar o quadro
- Quem mantém o quadro é o CODE: `git pull` antes, commit `quadro: ...` + `git push` depois.
- O Claude do computador roda no navegador e **não acessa o GitHub**. O Weslei leva a ele o texto
  do pedido e traz de volta a resposta e as planilhas pelo chat do CODE. O CODE registra a entrega aqui.
- Cada pedido tem número, destinatário (CODE, COMPUTADOR, VPS ou WESLEI) e o que deve voltar.
- **Dados reais não entram no Git.** Aqui só entram contagens, nomes de colunas e decisões. As
  planilhas ficam no computador do Weslei e na sessão do CODE (fora do Git) e, na Etapa 4, vão
  pela tela do app.

## Pedidos abertos
- [x] #1 PARA: COMPUTADOR · Exportar do Superus (só leitura) · aberto em 19/10/2026
  - Regras de `docs/PROMPT-EXPORTAR-SUPERUS.md`: só leitura, cancelar qualquer janela de
    confirmação, senha é com o Weslei.
  - Já chegaram: categorias, fornecedores e produtos (com o estoque da loja Oiapoque).
  - Falta: **contas a pagar só em aberto**, com fornecedor (código e CNPJ), nº do documento,
    emissão, vencimento, valor, parcela, histórico, categoria/plano de contas e forma de pagamento.
    Junto, a lista das categorias financeiras e das formas de pagamento que aparecem nelas.
  - Entregar a planilha ao Weslei, que manda ao CODE pelo chat.
- [x] #2 PARA: VPS · Porta livre e como baixar o código · aberto em 19/10/2026
  - Só responder, sem instalar nada ainda (a instalação é na Etapa 3, seção 7 do brief).
  - Qual porta livre em 127.0.0.1, entre 8100 e 8199, fica para o serviço `migracao-bling`?
    (conferir com `ss -tln`; as ocupadas conhecidas estão em `docs/COMO-TRABALHAMOS.md`, seção 3)
  - Como o servidor vai baixar o código de `wesleimatos/migracao-bling-` (atenção ao traço no fim):
    o GitHub do servidor já está configurado, ou vai precisar de uma deploy key só leitura
    (o Weslei cadastra a chave pública)?
  - Responda em "Entregas".
  - 19/10/2026: enviado pelo CODE direto para a sessão "VPS" (pedido do Weslei), com mais 3 perguntas
    só de olhar: Node e node:sqlite, acesso à API do Bling e se o subdomínio já existe.
- [x] #3 PARA: COMPUTADOR · Fornecedores: IE e telefones · aberto em 19/10/2026
  - A planilha "RELATORIO FORNECEDOR" veio sem inscrição estadual e sem telefones.
  - Gere de novo a mesma planilha (só leitura, mesmas regras), incluindo as colunas de IE e de
    todos os telefones que o Superus tiver para o fornecedor (fixo, celular, fax...).
  - Diga também o que significa a coluna `CONTATO` (veio "N" em todos).
  - 19/10/2026: o arquivo reenviado ("RELATORIO_FORNECEDOR_1.xlsx") é idêntico ao primeiro,
    byte a byte. Continua sem IE e sem telefones.
  - Entregue a planilha nova ao Weslei, que manda ao CODE pelo chat.
- [x] #4 PARA: COMPUTADOR · Produtos: marca, medidas e vínculos com fornecedores · aberto em 19/10/2026
  - Unidade não precisa: o Weslei decidiu `UN` para todos.
  - A planilha "62 CADASTRO COMPLETO OIAPOQUE" veio com `CODMARCA`, peso e medidas vazios em
    todos os produtos. Confira no Superus (só olhando) se esses dados existem no cadastro. Se
    existirem, gere a planilha de novo com eles (marca pelo nome).
  - Gere também `produtos_fornecedores`: todos os pares produto × fornecedor (código do produto,
    código do fornecedor, código do produto no fornecedor, custo). A planilha de fornecedores
    conta 6.121 ligações, e a de produtos só traz um fornecedor por produto.
  - Entregue as planilhas ao Weslei, que manda ao CODE pelo chat.

- [x] #7 CANCELADO (19/10/2026, decisão do Weslei: modo nuvem) · PARA: VPS · Instalar o app na VPS (Etapa 3) · aberto em 19/10/2026
  - Roteiro completo em `docs/IMPLANTACAO-VPS.md`: serviço `migracao-bling` em `/opt/migracao-bling`,
    porta 127.0.0.1:8101, proxy do `migra.focosaas.com.br` (mantendo o `/.well-known`), backup diário.
  - Primeiro só olhar e mostrar ao Weslei; instalar com o OK dele. Regras de ouro do servidor.
  - O código de primeiro acesso vai só para o Weslei, direto (nunca no quadro).
  - Responder em "Entregas" (e para a sessão "Migração Superus → Bling").
  - 19/10/2026: enviado pelo CODE direto para a sessão "VPS" (pedido do Weslei).

## Pedido para o Weslei
- [ ] #8 PARA: WESLEI · Preparar o modo nuvem · aberto em 19/10/2026
  - Cadastrar `BLING_CLIENT_SECRET` nas configurações do ambiente da nuvem (nunca pelo chat).
    Feito pelo Weslei em 19/10/2026 (variável de ambiente; vale a partir da próxima sessão).
  - Abrir uma sessão nova com o repositório e mandar as planilhas 48, 64 e 62 (e 65 e 67, se quiser
    que o Claude cadastre contas a pagar e todos os vínculos). Passo a passo em `docs/EXECUCAO-NUVEM.md`.
- [x] #6 PARA: WESLEI · Mandar ao CODE, pelo chat, os arquivos 64, 65, 66 e 67 de `X:\backup` · aberto em 19/10/2026
  - 64 recebido em 19/10/2026 (fornecedores com IE e telefones).
  - 65, 66 e 67: o Weslei decidiu não mandar ao CODE. Entram direto na tela do app (Etapa 4),
    onde ele liga as colunas. Regra das contas a pagar em `docs/MAPEAMENTO-CONTAS-PAGAR.md`.

## Entregas
- CODE · **Etapa 2 pronta** em 19/10/2026: login (scrypt, cookie seguro, bloqueio de tentativas),
  conexão com o Bling (OAuth com state, Secret e tokens cifrados), fila de envio por etapas
  (não duplica, retoma, pausa, limite do dia), envio de teste "TESTE" + apagar testes, ligação das
  contas a pagar e relatório · 67 testes com Bling falso · simulação com as planilhas reais e o
  Bling falso: 500 categorias, 800 fornecedores, 13.001 produtos, 5.859 vínculos e 3.194 estoques
  enviados, 0 erros · ver `README.md`
- #2 FEITO por VPS em 19/10/2026 (só olhando, nada instalado) · **porta 8101** (a 8100 é do ERPNext;
  entra na tabela de portas do ACESSO-DOCKER.md na Etapa 3) · o servidor baixa o código de
  `migracao-bling-` sem login · Node 24.22.0 com `node:sqlite` funcionando · API do Bling responde
  (200 em 0,3 s) · `migra.focosaas.com.br` criado pelo Weslei no Virtualmin e conferido pela VPS:
  DNS certo, certificado Let's Encrypt próprio com renovação automática (vence 17/01/2027),
  `vps-certs` sem ❌. Na Etapa 3 falta o proxy para 127.0.0.1:8101, mantendo o `/.well-known`.
- CODE · **Etapa 1 pronta** em 19/10/2026: leitura das planilhas (XLSX/CSV, sem biblioteca),
  ligação de colunas e conferência com totais · 33 testes passando · simulação com as planilhas
  reais (fora do Git): 500 categorias, 800 fornecedores, 13.001 produtos, 5.859 vínculos,
  122.277 unidades de estoque (R$ 1.170.117,60 no custo) · ver `README.md`
- CODE · desenho do app em `docs/DESENHO.md` (19/10/2026) · **aprovado pelo Weslei**
- #1, #3 e #4 FEITOS por COMPUTADOR em 19/10/2026 · arquivos em `X:\backup` no computador do
  Weslei: 64 (fornecedores com IE e telefones), 65 (contas a pagar em aberto), 66 (categorias
  financeiras e formas de pagamento), 67 (produtos × fornecedores) · `CONTATO` é só uma marcação
  S/N sem uso · marca, peso e medidas estão vazios no próprio Superus · os arquivos ainda não
  chegaram ao CODE (Pedido #6)
- #5 CANCELADO em 19/10/2026 · o Bling já tem os grupos de produtos "COM ST" e "SEM ST";
  decisão do Weslei: CST 00 → SEM ST, CST 60 → COM ST (ver `docs/MAPEAMENTO-PRODUTOS.md`)
- WESLEI · planilha de produtos (consulta 62, XLSX) entregue ao CODE em 19/10/2026 · 13.001
  produtos (12.960 ativos) · regra e pontos a decidir em `docs/MAPEAMENTO-PRODUTOS.md`
- WESLEI · planilha de fornecedores (XLSX) entregue ao CODE em 19/10/2026 · 804 fornecedores,
  documentos todos válidos · falta IE e telefones (Pedido #3) · regra em `docs/MAPEAMENTO-FORNECEDORES.md`
- WESLEI · árvore de categorias do Superus (consulta 48, XLSX) entregue ao CODE em 19/10/2026 ·
  500 categorias em 4 níveis · decisão: levar igual ao Superus · regra em `docs/MAPEAMENTO-CATEGORIAS.md`
- CODE · leu o pdv-para-bling e a OpenAPI do Bling em 19/10/2026 · resumos em
  `docs/REFERENCIA-PDV-PARA-BLING.md` e `docs/REFERENCIA-API-BLING.md`
- WESLEI · app "Migração" criado na central do Bling em 19/10/2026 · Client ID:
  `d8c1742bfda50d9d56ee88a8887b07b607c553cd` (o Client Secret nunca vai no quadro: o Weslei
  digita na tela do app, na Etapa 3) · link de retorno e permissões confirmados pelo Weslei

## Bloqueios (precisa do Weslei)
_(nenhum)_
