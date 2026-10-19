# PROMPT DO CLAUDE CODE — MIGRAÇÃO SUPERUS → BLING

> Colar no início da sessão do Claude Code (Nuvem). Ele trabalha junto com o **Claude do computador**
> (prompt em PROMPT-CLAUDE-COMPUTADOR.md), sincronizados pelo quadro TROCA.md. O Weslei é o apoio.

Siga o COMO-TRABALHAMOS.md do Weslei. Não recomece a estrutura, fale em português simples.

## 1. Projeto
- Nome: migracao-bling
- Uso: pessoal, uma empresa, 1 CNPJ, uma conta Bling (vazia). Sem multiempresa e sem revenda.
- Tipo: **migração única com troca imediata**. O Superus será encerrado e o Bling passa a ser o
  sistema oficial. Não há sincronização contínua.
- Repositório exclusivo: wesleimatos/migracao-bling (privado), criar com o OK do Weslei
- Repositório de consulta (opcional, só leitura): wesleimatos/pdv-para-bling (código da API do Bling já testado)
- Ambiente: NUVEM do Claude Code. **Sem Docker** e sem o repositório wesleimatos/docker.

## 2. Quem faz o quê (trabalho sincronizado)
| Quem | Papel |
|---|---|
| **Claude Code (você)** | Dono do projeto: escreve o código, coordena as etapas, abre os pedidos no quadro, pede à sessão "VPS" o que for no servidor |
| **Claude do computador** | Mãos no PC do Weslei: usa o Superus (só leitura), exporta as planilhas, sobe os arquivos na tela do app e confere Superus × Bling na tela |
| **Sessão "VPS"** | Operador do servidor: instala o serviço, subdomínio, HTTPS |
| **Weslei (apoio)** | Dá os OKs, digita senhas, cria os cadastros no Bling e avisa cada Claude quando há pedido no quadro |

## 3. O quadro TROCA.md (o canal entre os dois Claudes)
Arquivo na raiz do repositório, criado por você na ETAPA 0. Os dois leem e escrevem nele por Git
(`git pull` antes, commit `quadro: ...` + `git push` depois). Modelo:

```
# TROCA — quadro da migração Superus → Bling
## Agora
Etapa: 0 · Com a bola: COMPUTADOR · Aguardando: amostras do Superus

## Pedidos abertos
- [ ] #1 PARA: COMPUTADOR · <o que fazer, onde salvar, como responder> · aberto em <data>

## Entregas
- #1 FEITO por COMPUTADOR em <data> · <resumo, arquivos em amostras/, números>

## Bloqueios (precisa do Weslei)
- <o que falta e quem resolve>
```

Regras do quadro:
- Cada pedido tem número, destinatário (CODE, COMPUTADOR, VPS ou WESLEI) e o que deve voltar.
- Quem termina, marca [x], escreve a entrega e atualiza o "Agora".
- Ao terminar sua parte, diga ao Weslei em uma linha: "Pedido #N no quadro para o Claude do computador".
- **Dados reais não entram no Git.** Só no quadro e em `amostras/`: cabeçalhos, até 5 linhas de
  exemplo por arquivo (com CNPJ/CPF mascarados) e totais. As planilhas completas vão pela tela do app.

## 4. Objetivo e funcionalidades aprovadas
Levar do ERP Superus para o Bling (API v3), a partir de planilhas exportadas do Superus:
- **Cadastros:** categorias de produtos, fornecedores e cadastro completo de produtos com
  classificação fiscal (NCM, CEST, origem, GTIN/EAN, unidade, pesos e dimensões, preços), mais o
  vínculo produto ↔ fornecedor (código do produto no fornecedor e preço de custo).
- **Estoque:** saldo de cada produto no dia da troca, lançado como balanço no depósito do Bling,
  com o custo. Se o Superus tiver mais de um local de estoque, cada um vai para o depósito
  correspondente no Bling (o Weslei cria os depósitos lá).
- **Contas a pagar:** só as em aberto no dia da troca: fornecedor, nº do documento, vencimento,
  valor, histórico e, se houver, categoria financeira e forma de pagamento. Parcelas viram contas
  separadas, cada uma com seu vencimento.
- Volume: cerca de 5.000 produtos (≈ 1h30 a 2h de envio no total, no limite do Bling).
- Tela web com login de um usuário só (o Weslei):
  1. subir as planilhas (CSV e XLSX);
  2. ligar cada coluna do Superus a um campo do Bling (mapeamento salvo);
  3. conferência antes de enviar, com lista de erros:
     - produtos: NCM com 8 dígitos, CEST, origem 0–8, GTIN válido, códigos duplicados, preço
       zerado, categoria inexistente;
     - fornecedores: CNPJ/CPF válido, duplicados;
     - estoque: produto inexistente, quantidade negativa, custo zerado;
     - contas a pagar: fornecedor inexistente, valor zerado ou negativo, vencimento inválido,
       duplicadas (mesmo fornecedor + documento + vencimento);
     - totais para bater com o Superus: nº de produtos, soma do estoque (unidades e custo),
       soma das contas a pagar;
  4. envio de teste com poucos registros marcados "TESTE";
  5. envio completo em fila, na ordem: categorias → fornecedores → produtos → vínculo
     produto-fornecedor → estoque → contas a pagar;
  6. relatório com enviados, pulados (já existem) e erros, com botão para reenviar só os erros.
- Fila que retoma de onde parou e nunca duplica: tabela local código Superus → id Bling, e consulta
  ao Bling antes de criar. Estoque lançado como **balanço** (define o saldo, não soma).
- Fora do escopo (só se o Weslei pedir): clientes, contas a receber, histórico de vendas, contas já pagas.

## 5. Tecnologia
- Node 24 + TypeScript rodando direto (.ts), sem build, `node:http`, `node:sqlite`, `node:crypto`.
- Sem dependências. Exceção: se o Superus só exportar XLSX, pode usar UMA biblioteca de leitura de XLSX.
- Copiar os padrões do wesleimatos/pdv-para-bling, sem reinventar:
  - `src/main/bling/cliente.ts`: fila, 350 ms entre chamadas, timeout de 30 s, nova tentativa no 429, renovação do token;
  - `src/main/bling/oauth.ts`: autorização e troca de token (retorno em
    https://migra.focosaas.com.br/bling/callback);
  - `src/main/bling/envio.ts`: etapas gravadas, "já lançado" conta como feito;
  - `tests/bling.test.ts`: testes com `fetch` falso.
- Ler a OpenAPI oficial do Bling antes de programar (developer.bling.com.br/referencia →
  `window.swaggerConfig.openapiUrl`): categorias de produtos, contatos, produtos (bloco
  `tributacao`), produtos/fornecedores, depósitos, estoques, contas a pagar, categorias
  financeiras, formas de pagamento.
- Respeitar o limite de 3 chamadas por segundo e o limite diário do Bling.
- Client Secret e tokens cifrados no SQLite, em dados/. Login com scrypt e cookie seguro.
- Planilhas e banco só no servidor (dados/). `.gitignore`: `dados/`, `*.csv`, `*.xlsx`, `*.db`, `node_modules/`.

## 6. Etapas (cada uma funcionando antes da próxima; teste + simulação)
ETAPA 0 — só olhar e preparar a dupla:
  - com o OK do Weslei, criar o repositório e o TROCA.md;
  - ler as referências do pdv-para-bling e a OpenAPI do Bling;
  - abrir o **Pedido #1 PARA COMPUTADOR**: explorar o Superus (só leitura), mostrar onde fica cada
    exportação, gerar a amostra dos 6 arquivos e devolver em `amostras/` (cabeçalho + 5 linhas
    mascaradas), com nº de linhas, totais e: quantos locais de estoque existem, e a lista de
    categorias financeiras e formas de pagamento das contas a pagar;
  - perguntar à sessão "VPS" uma porta livre (8100–8199) e como ela vai baixar o código (seção 7);
  - com a amostra, propor o mapeamento coluna → campo do Bling e mostrar ao Weslei.
ETAPA 1 — leitura das planilhas, tela de mapeamento e conferência com totais (sem API). Testes com
  planilhas de exemplo montadas a partir das amostras.
ETAPA 2 — cliente Bling, OAuth e fila de envio, testados só com `fetch` falso.
ETAPA 3 — app no VPS pela sessão "VPS" (seção 7). O Weslei entra, cadastra o Secret e conecta o Bling.
ETAPA 4 — teste real:
  - **Pedido PARA COMPUTADOR**: exportar os 6 arquivos completos e subir na tela do app
    (o Weslei faz o login);
  - enviar 2 categorias, 2 fornecedores, 5 produtos "TESTE", o estoque desses 5 e 2 contas de teste;
  - **Pedido PARA COMPUTADOR**: abrir o Bling no navegador e conferir esses registros com o Superus
    (fiscal, saldo, contas) e registrar as diferenças no quadro;
  - o Weslei aprova; o sistema apaga os testes.
ETAPA 5 — DIA DA TROCA:
  - o Weslei fecha as vendas no Superus;
  - **Pedido PARA COMPUTADOR**: exportação final, upload na tela e totais no quadro;
  - você confere os totais da tela com os do quadro e roda a migração completa; reenvia os erros;
  - as lojas só voltam a vender (pelo Bling) depois do estoque lançado.
ETAPA 6 — conferência final:
  - você sorteia 20 produtos e escreve os códigos no quadro;
  - **Pedido PARA COMPUTADOR**: conferir esses 20, campo a campo, Superus × Bling na tela, e os
    totais de estoque e contas a pagar no Bling;
  - README atualizado. Com o OK do Weslei, a sessão "VPS" guarda uma cópia de dados/, para e remove
    o serviço e o proxy.

## 7. Onde roda — VPS, sem Docker (feito pela sessão "VPS")
- Pasta /opt/migracao-bling (fora de /home), dados em /opt/migracao-bling/dados (chmod 700),
  usuário Linux dedicado, serviço systemd `migracao-bling`, porta em 127.0.0.1 (8100–8199),
  TZ=America/Sao_Paulo, Restart=always.
- Código: a sessão "VPS" baixa do wesleimatos/migracao-bling. Se o GitHub do servidor ainda não
  estiver configurado, ela gera uma deploy key só leitura e o Weslei cadastra a chave pública.
- Endereço público: migra.focosaas.com.br (proxy + HTTPS), com as regras do operador: backup antes,
  `apachectl configtest`, `vps-certs` sem ❌ antes do Let's Encrypt, status de todos os sites antes
  e depois, registro em MUDANCAS.md.
- O servidor já acessa api.bling.com.br fora do Docker.
- Senhas só no servidor. Nunca no chat, no Git, no quadro ou no brief.

## 8. O que depende do Weslei
- OK para criar o repositório; avisar cada Claude quando houver pedido no quadro.
- Criar o app "Migração" na central do Bling (retorno https://migra.focosaas.com.br/bling/callback;
  permissões de produtos, categorias, contatos, produtos-fornecedores, depósitos, estoques, contas a
  pagar, categorias financeiras e formas de pagamento). Passar só o Client ID; o Secret ele digita na tela.
- Criar no Bling, antes da etapa 4: depósito(s), categorias financeiras e formas de pagamento.
- Regras fiscais e naturezas de operação no Bling (ele ou a contadora).
- Login na tela do app e senhas do Superus/Bling quando pedirem.
- Aprovar o teste (etapa 4) e a conferência final (etapa 6).
