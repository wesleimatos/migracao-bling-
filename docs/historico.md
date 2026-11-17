# Histórico da migração (pedidos do quadro e entregas)

Tirado do `TROCA.md` em 07/11/2026, sem mudar o texto. As regras que estavam no pedido #10 agora estão em
`docs/constituicao.md` e `docs/decisoes/`. O `TROCA.md` original completo continua no histórico do Git (commit 4929599).

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

- [ ] #9 PARA: PDV (pdv-para-bling) · Ordem da atualização do PDV · aberto em 20/10/2026
  - Regra do Weslei: na atualização do PDV, primeiro **promoções**, depois **usuários**, depois
    **configurações** e por último a **carga de produtos**.
  - Na carga de produtos, a prioridade é: **produtos novos**, depois **produtos com estoque** e por
    último **produtos com estoque zerado**.
  - Motivo: promoções, usuários e configurações são cargas pequenas e chegam rápido ao caixa; a carga
    de produtos é a maior e vem por último, começando pelo que mais vende (novos e com estoque).
  - 20/10/2026 · problema visto no caixa (grupo "Bling atacadao"): o produto 105715 (Moedor GiftUtil,
    EAN 7908762700349) aparece pelo nome e pelo F2, mas a busca digitando o EAN direto diz "Nenhum
    produto encontrado". No Bling o cadastro está certo (código 105715, GTIN 7908762700349).
  - 23/10/2026 · pedido do Weslei ao agente do PDV (não deu para mandar direto à sessão "PDV para
    Bling", que exige aparelho confiável; vai pelo grupo em 24/10): na leitura do
    código de barras, (1) ignorar zeros da esquerda (como o Superus) e (2) procurar o código lido no SKU
    e no GTIN/EAN. Padrão: EAN-13 (13 dígitos) no produto; 14 dígitos é DUN-14 de caixa fechada.
  - Contexto: o Bling agora tem os 13.001 produtos migrados; 1.830 deles estão ganhando o código de
    barras no SKU (EAN inválido ou código de barras extra), com o código do Superus nas observações.

- [ ] #10 PARA: CODE (nuvem) · Suporte da migração no WhatsApp · aberto em 20/10/2026
  - Pedido do Weslei: o Agente Claude atende o grupo "Bling atacadao" (linha CORPORATIVO, Painel Zap
    FocoSaaS), tira dúvidas e orienta; **qualquer mudança no sistema só com autorização do Weslei**,
    pedida no próprio grupo. Toda mensagem começa com "🤖 Agente Claude". Envio só seg–sáb, 9h–20h.
  - Só o grupo "Bling atacadao": não lê nem envia em outras conversas, não marca como lida, não apaga.
  - 20/10/2026 · divisão (decisão do Weslei): o Agente Claude cuida só do que é **interno do Bling**
    (produtos, preços, cadastros). **Tudo do PDV** (caixa, leitura do EAN no caixa, funções do menu)
    fica com o **agente do PDV Bling**, que desenvolveu o PDV. O Claude não analisa nem responde PDV.
  - Pendências do PDV vistas no grupo em 20/10: leitura do EAN pelo leitor não acha o produto (F2 acha);
    função 17 do menu supervisor sumiu na atualização (a Danda vai dizer para que servia).
  - (regras do pedido #10: ver docs/constituicao.md)
    24/10: PDV 0.1.33 corrige carga incompleta e códigos "2…"; cópia SKU→EAN (595) combinada para hoje
    depois das 20h, com o concentrador na 0.1.33. Promoções do Superus não vieram na planilha 62 (pendente).
    FEITO 24/10 (Braço do Bling, com backup): custo preenchido em 141 produtos que estavam com custo zero;
    cadeado 103783 com GTIN 7891194000401; 99 preços promocionais (4 códigos da planilha não existem
    no Bling); volta do SKU em 1.725 produtos (2 pulados, 20 com barra recusada pelo GS1 ficaram com a
    barra no SKU). Falta: o PDV cadastrar as barras extras e forçar a carga (F12 → 11) na segunda.
  - 23/10/2026 · o Weslei excluiu o app "Migração" do Bling (a conexão caiu) e criou um app novo:
    Client ID `f926deb48f139e78e616726cc453c358af3d5307` (já no código). Para reconectar: Client Secret
    novo em `BLING_CLIENT_SECRET` no ambiente (sem `< >`), sessão nova, `node src/cli.ts autorizar` e
    `conectar`. Retorno: `https://migra.focosaas.com.br/bling/callback`. Na sessão nova também vão o
    arquivo de acesso do Painel Zap e as planilhas (dados/ não passa de uma sessão para outra).

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
- CODE (nuvem) · 19/10/2026: planilhas 48, 64 e 62 carregadas e conferidas: 500 categorias,
  800 fornecedores, 13.001 produtos, 5.859 vínculos, 3.194 estoques (122.277 un.). Bate com os docs.
  Client Secret do ambiente veio com "<" ">" em volta (do modelo); corrigido nesta sessão, Bling conectado.
  Weslei deve tirar os "<" ">" da variável para as próximas sessões.
- CODE (nuvem) · 19/10/2026 · envio de teste: 13 categorias, 2 fornecedores, 5 produtos, 5 vínculos,
  5 estoques, 0 erros. O Bling recusa dois números no campo telefone: nova regra (um telefone, um
  celular, repetidos caem), aprovada pelo Weslei · 68 testes passando · aguardando o Weslei conferir.
- CODE (nuvem) · 19/10/2026 · pedidos do Weslei no teste: Tipo do item = Mercadoria para Revenda
  (`spedTipoItem` 00) em todos; origem sem sinalização (0 ou vazio) vai como **2** (Estrangeira,
  mercado interno), 1 e 5 ficam. Teste refeito e conferido no Bling: 5 produtos com origem 2 e tipo 00.
- CODE (nuvem) · 19/10/2026 · teste aprovado pelo Weslei · **envio completo**: 500 categorias, 623
  fornecedores, 2.786 produtos criados (+10.094 que já existiam no Bling, não mexidos), 5.005 vínculos,
  3.179 estoques. Erros: 177 fornecedores (telefone inválido no Superus), 121 produtos (GTIN fora do
  GS1 e 4 CEST), 854 vínculos e 15 estoques que dependem deles.
- CODE (nuvem) · 19/10/2026 · os 10.094 "que já existiam" estavam na **lixeira** do Bling (situação E):
  a busca passou a ignorar a lixeira e eles foram criados. Decisões do Weslei: telefone sem zeros de
  discagem ou sem telefone (159), GTIN recusado vira o código/SKU (117), CEST recusado sai (5).
  **Migração completa, 0 erros:** 500 categorias, 800 fornecedores, 13.001 produtos, 5.859 vínculos,
  3.194 estoques · 71 testes passando · limpeza da lixeira autorizada pelo Weslei e iniciada.
- CODE (nuvem) · 19/10/2026 · lixeira do Bling limpa: 10.098 de 10.103 apagados; 5 o Bling não deixou
  apagar ("problemas de validação"), ficam para o Weslei ver na tela. Bling agora: 12.961 produtos
  ativos e 41 inativos.
- CODE (nuvem) · 19/10/2026 · pedido do Weslei: EAN com zeros à esquerda até 13 dígitos (o Superus
  perdia os zeros). 660 produtos atualizados no Bling (só o GTIN), 0 falhas · 72 testes passando.
  Decisão do Weslei: o código (SKU) é o do Superus; só o EAN ganha os zeros. 2 produtos editados à mão
  no Bling (código trocado pelo EAN) voltaram ao código do Superus (104495 e 103371).
- CODE (nuvem) · 21/10/2026 · base corrigida do Compras (planilha "CADASTRO_PRODUTOS_COMPLETOS_ATUALIZADA
  21.10.26", exportação do Bling com o fornecedor certo): backup do Bling antes (13.012 produtos, 5.874
  vínculos, 806 contatos, em dados/, fora do Git); depois só o fornecedor foi atualizado em 6.580
  produtos: ~5.811 ligados (estavam sem), ~768 trocados (A → B, custo mantido), 1 já ligado na mão,
  0 falhas. 1.798 sem fornecedor na base nova: não mexidos. 4.634 já estavam certos.
  Depois, com OK do Weslei: custo preenchido em 5.664 ligações novas (custo do Superus, planilha 62,
  porque a base do Compras veio com custo 0); 6 já tinham custo (não mexidas); 141 sem custo nem no
  Superus ficaram em branco; 0 falhas.
- CODE (nuvem) · 20/10/2026 · pedido do Weslei: código de barras no SKU e código do Superus nas
  observações em 1.830 produtos (79 com EAN inválido, 1.751 com código de barras extra), 0 falhas.
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
_(nenhum)_ · 23/10/2026: Client Secret corrigido pelo Weslei e Bling reconectado com o app novo.


## Estado diário até 17/11/2026 (copiado de docs/estado.md quando o estado passou para ESTADO.md)


### Segunda 16/11, o que foi feito
- Compras avisado às 8h30 (VELO TECH, KA-952, Red Bull, caderno LOVE). Respostas: 1 ok; KA-952 eles precificam; Red Bull de propósito; caderno conferido.
  As antigas (categoria, Wilson GB001D, 100935, 1001571, MCF-38A) foram listadas, e eles ainda não escolheram qual tratar.
- Mantas 103389 e 103390 (loja, Carol): o caixa estava mais barato que a gôndola. O Compras disse que baixou de propósito, e a loja troca a etiqueta.
  A Carol citou uma "promoção de seguidor" do Ryan; não mexemos (promoção proibida).
- Peneira VL0374 (preço = custo, R$ 3,70): o Compras corrigiu para R$ 8,99 e a loja foi avisada. O rodo VL0337 ainda vai ser precificado (não está na loja).
- Lotes de marca pedidos pelo Compras, hoje às 20h30 pelo Braço (só onde a marca está vazia; os com outra marca só listados):
  - ROBERTO: fornecedor 18460608675, ~268 produtos;
  - SEU LAR: nome com "SEU LAR", ~112;
  - FENIMA: 83 produtos, dos quais 67 pela lista e os 8 duplicados nos 2 cadastros (16).
    Ficam fora 6 itens, por OK do Compras: ducha Lorenzetti, mini mixer, betoneira BR0038, forma de gelo branca, mop AW e prato OKLA.
    Também fica fora o FEN5669 sem A, que não existe.
- Terça 17/11:
  - abertura às 8h (trig_0134W1uTECHu5aFAFyWur9To): resultado das 3 marcas ao Compras e relatório "preço ≤ custo";
  - fechamento às 19h51 (trig_01AhRNHe1Yx6mSLQ1NiUAFbm).

Anterior: 14/11/2026, 22h (fechamento do plantão de sábado).

### Sábado 14/11, o que foi feito
- Caderno LOVE 96 fls Credeal id 16721114788 (loja, Carol, 10h51, "Não cadastrado"):
  - o Braço gravou 7891253254004 no GTIN de embalagem;
  - a loja foi avisada para "Atualizar produtos".
  - O SKU hoje é 101375 (em 21/10 era a barra) e o GTIN é 1212141234124, que parece inventado. Não mexemos; avisar o Compras na segunda.
- A sessão reiniciou duas vezes, sem vigia de ~10h53 a 15h56 e no fechamento. O histórico dos dois grupos foi conferido e não chegou nada.
- Domingo não tem plantão. Segunda 16/11:
  - abertura às 8h (trig_01RiUEq9XbigKiPNPcvKaYYd), com o aviso ao Compras às 8h30 de tudo o que está em pendencias/compras.txt;
  - fechamento às 19h51 (trig_013neuggzFHb1trYGSKhvDbh).

### Sexta 13/11, o que foi feito
- Compras avisado às 8h30; às 10h42 disseram que já ajustaram SKU das bonecas BRINQUE FELIZ, a Lousa e o Squishy.
- VELO TECH (Compras, 10h41):
  - parte 1 feita: os 11 itens VL... passaram de FORTEMIX para o fornecedor VELO TECH (18460608703); a cópia do Braço está em copias/velotech-antes-2026-11-13.jsonl;
  - parte 2 feita (13/11 às 20h35): marca "VELO TECH" em 22 produtos, os 11 novos e 11 antigos, com 0 erros e nenhum com outra marca. Os espaços nos SKUs VL0337 e VL10003 sumiram.
    Avisar o Compras na segunda às 8h30.
  - Compras avisado de 2 SKUs com espaço no fim ("VL10003 ", "VL0337 ") e de 2 itens com preço igual ao custo (VL0374, VL0337).
- Power banks (loja, Fernanda):
  - KAPBOM KA-952 id 16735001277: SKU vazio e preço R$ 0,00. Pedido ao Compras.
  - H'MASTON YD57 id 16721124074: o Bling recusa o prefixo 852 no GTIN, e a barra 8520231101571 está só no SKU. A loja vende digitando. Comentado no #184 para o caixa aceitar a barra.
- Red Bull tradicional id 16721119859 (SKU 103807): o Braço gravou a barra 611269991000 (UPC dos EUA) no GTIN de embalagem. A loja confirmou que passou.
  O GTIN principal mudou de 9002490100490 (21/10) para 9002490100445. Anotado para o Compras conferir.
- Agendas: abertura de sábado 8h (trig_017xFDnNidMhEKYrURDfYBuw) e fechamento de sábado 19h51 (trig_01QukEPqGjGESe3zwxifcfCt).

### Quinta 12/11, o que foi feito
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

### Novidades de 11 e 12/11
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

### Onde estamos
- A migração Superus → Bling terminou em 19–24/10: 13.001 produtos, 800 fornecedores, 500 categorias,
  5.859 vínculos e 3.194 estoques, 0 erros. O histórico está em `docs/historico.md`.
- Hoje o projeto é o **suporte do Bling** à loja ("Bling atacadao") e ao Compras ("Compras - suporte Ai"),
  em plantão de segunda a sábado, 8h–20h, com o Braço do Bling gravando no Bling.
- A sessão principal ficou fora do ar de 09/11 ~12h até 10/11 11h13. Nesse tempo ficaram sem resposta 3 casos
  da loja (a cola, a caneta Flamingo e um print de relatório), e o resumo e a agenda de 09/11 não foram feitos.

### Pendências abertas
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

### Depende do Weslei
- Trocar a chave do Painel Zap. O vigia está parado desde as 20h, o que permite a troca agora.

### Em andamento
- Plano do pedido #120 (arquitetura): este projeto fica fora do monólito e espera a vez depois do ERP.
- Os scripts do plantão estão na VPS desde 07/11, em `/opt/migracao-bling/ferramentas/zap/` (pedido #157, fechado).

### Próximo passo
- 12/11, 8h30: avisar o Compras do resultado do Braço (MARES, BRINQUE FELIZ, relatórios, sem SKU, Guaraná).
- Fechamento de quinta às 19h51; abertura de sexta às 8h.
