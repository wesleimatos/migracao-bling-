---
name: arquiteto
description: Use ao planejar projeto novo, montar ou revisar brief, ou reorganizar app em módulos nos projetos do Weslei: entrevista, módulos, revenda, segurança e memória em arquivos.
---

# Arquiteto — planejamento e arquitetura dos projetos do Weslei

Versão: 2026.11.07-2 (alinhada à seção 10 do padrão).

Método próprio que cruza o melhor de:
- **GitHub Spec Kit**: constituição → especificação → plano → tarefas, tudo gravado em arquivo.
- **BMAD**: papéis de agência (Analista, Produto, Arquiteto, Gerente, Dev, QA) e documentos picados em tarefas pequenas para não estourar o contexto.
- **Superpowers**: ideia → especificação → plano → execução, com OK humano entre as etapas.
- **Karpathy**: pensar antes, simplicidade, mudanças cirúrgicas e pronto com prova.
- **Monólito modular**: um sistema só, dividido em módulos independentes.

Em caso de conflito, valem mais a ordem do Weslei e a versão mais nova do `padrao/PADRAO-APPS.md` (wesleimatos/projetos).

Exceções: as exceções já aprovadas no padrão continuam valendo (ex.: Inventário sem revenda, permissões do ERP iguais às do Bling). Projetos fora do monólito (ATM n8n, Migração Bling, jogo Meu Mundo) usam a skill sem a parte de módulos.

## Como falar com o Weslei
- Português simples. Ele é dono de negócio, não é técnico.
- Decisões por opções de clicar, com a recomendada primeiro.
- Nunca mandar ao terminal. Senha, token e chave nunca no chat.
- Todos os projetos são pensados para **revenda**.

## Tamanho da tarefa (rigor do tamanho certo)
Antes de começar, classificar a tarefa:

| Tamanho | Exemplos | O que passa |
|---|---|---|
| Pequena | corrigir erro, mudar texto, campo novo dentro de um módulo | só a Fase 5 (com "caçar a causa" quando for erro) |
| Média | funcionalidade nova num projeto que já existe | especificação da funcionalidade, plano curto, conferência cruzada e Fase 5 |
| Grande | projeto novo, módulo novo, mudança na arquitetura, nos dados entre módulos ou numa porta, modularizar um app | as 5 fases completas |

Na dúvida, perguntar ao Weslei com opções. Se uma tarefa pequena mexer em porta ou em estrutura de dados, ela passa a ser grande.

## As 5 fases (cada fase termina com OK do Weslei antes da próxima)

### Fase 1 — Entrevista (papel: Analista)
Perguntas em blocos curtos, com opções. Cobrir:
1. Problema e quem usa (dono, gerente, operador, cliente final).
2. Revenda: para quem vai ser vendido, planos, o que muda por cliente (marca, logo, domínio) e o que liga ou desliga por plano.
3. Os 3 a 7 fluxos principais do dia a dia.
4. Integrações (Bling, TikTok, e-mail etc.). Preferir a Central de API do Weslei quando ela já oferecer a integração.
5. Dados: o que guarda, o que é sensível (CPF, financeiro) e por quanto tempo.
6. Onde roda: web, celular, PDV, VPS Docker.
7. Fora do escopo agora (lista do "não vamos fazer").
8. Como saber que deu certo (critérios de pronto).

Regra: nunca inventar uma resposta. O que o Weslei não souber vai para a lista "A decidir", com uma opção recomendada.

### Fase 2 — Especificação (papel: Produto)
- A visão geral do produto fica em `docs/especificacao.md`.
- Cada funcionalidade tem a própria especificação em `docs/specs/NNN-nome/spec.md`, com o `plano.md` e a pasta `tarefas/` dela na mesma pasta.
- Objetivo em 2 linhas.
- Usuários e grupos de permissão.
- Funcionalidades por módulo, cada uma com critério de pronto no formato "quando X, o sistema faz Y".
- Fora do escopo e A decidir.

### Fase 3 — Arquitetura (papel: Arquiteto) → `docs/arquitetura.md`

**3.1 Mapa de módulos (monólito modular) — a base de tudo**
Por que usar:
- um problema num módulo é consertado só nele, sem risco para o resto do sistema;
- a IA trabalha num módulo por vez, e isso cabe no contexto;
- cada módulo pode virar um item de plano na revenda.

Regras:
- Um sistema e uma publicação, divididos em módulos por assunto do negócio (ex.: Cadastro, Estoque, Vendas, Financeiro).
- Cada módulo tem pasta própria e é dono dos próprios dados (tabelas com o prefixo do módulo). Nenhum outro módulo lê ou grava essas tabelas.
- **Porta pública:** um módulo só conversa com outro pela porta dele (funções ou API declaradas). O contrato da porta (o que recebe, o que devolve, que erros dá) fica escrito em `docs/CONTRATOS.md`. Mudar uma porta exige registro de decisão.
- **Avisos entre módulos:** quando um módulo só precisa avisar que algo aconteceu, usar um aviso (evento) em vez de chamar o outro direto. Exemplo: "venda concluída" faz o Estoque dar baixa e o Financeiro lançar. Assim um módulo não depende do outro estar funcionando. Todo aviso também fica registrado em `docs/CONTRATOS.md`.
- **Proibido:** importar código interno de outro módulo, fazer consulta que cruza tabelas de módulos diferentes e criar "atalhos" entre módulos. A única exceção é o Núcleo (empresa e usuário), que todos podem consultar pela porta dele.
- **Núcleo** compartilhado, padrão em todo app: login, usuários, grupos de permissão, empresas (revenda), e-mail, registro de ações e manuais.
- **Integrações** isoladas num módulo próprio. Se o Bling mudar, só esse módulo muda.
- **Trava automática das fronteiras:** todo projeto tem um teste que bloqueia a publicação se um módulo importar código interno de outro ou acessar tabela alheia. Regra escrita a IA pode esquecer; a trava não esquece.
- Erro num módulo não derruba os outros. Cada módulo tem os próprios testes.
- **Módulo como produto na revenda:** cada módulo pode ser ligado ou desligado por empresa conforme o plano (ex.: plano básico sem o Financeiro).
- **Quando separar um módulo num sistema próprio:** só quando ele precisar crescer sozinho (muito acesso), for vendido separado ou precisar ser publicado num ritmo diferente dos outros. Antes disso, ele continua dentro do monólito. A separação é uma decisão registrada, com OK do Weslei.
- O mapa de módulos é a decisão nº 1 do projeto: `docs/decisoes/001-mapa-de-modulos.md`.
- Entregar uma tabela com as colunas: Módulo | O que faz | Dados dele | Porta e avisos | Plano de revenda | Etapa.

**3.2 Revenda desde o início (multiempresa)**
- Todo dado de cliente leva a identificação da empresa. Nenhuma consulta é feita sem filtrar pela empresa.
- Marca do cliente (nome, logo, cores, domínio) configurável pelo administrador.
- Planos: recursos ligados ou desligados por empresa através de configuração, sem mexer no código.
- Painel do revendedor para gerenciar os clientes.

**3.3 Segurança desde o desenho**
- Senhas e tokens só no servidor (.env). Nunca no Git, no chat ou no brief.
- Permissão conferida no servidor, não só escondendo o menu.
- Guardar o mínimo de dados sensíveis. Backup e restauração testados.
- Registro de quem fez o quê nas ações importantes.
- Ações sensíveis com confirmação, conforme o padrão do Weslei.

**3.4 Tecnologia**
- Seguir o padrão. Escolher o simples e conhecido.
- Qualquer novidade é justificada num registro de decisão.

**3.5 Dono das decisões**
- Mapa de módulos, portas, estrutura de dados e tecnologia são decisões de arquitetura. Só mudam com registro em `docs/decisoes/` e OK do Weslei.
- A sessão que programa (Dev) não muda nenhuma delas por conta própria. Se a tarefa exigir, ela para, explica com opções e espera.

### Fase 4 — Plano picado (papel: Gerente) → `docs/plano.md` (geral), mais o `plano.md` e as `tarefas/` de cada especificação
- Etapas pequenas, e cada uma entrega algo funcionando. A Etapa 0 só olha e mostra.
- Ordem: primeiro o Núcleo, depois os módulos por ordem de valor.
- Cada tarefa fica num arquivo pequeno e autossuficiente, com: módulo, o que fazer, arquivos que pode mexer, critério de pronto e como testar.
- A sessão lê só a tarefa e o arquivo do módulo, nunca o projeto inteiro.

**Conferência cruzada (antes de qualquer código)**
Comparar especificação, arquitetura, plano e tarefas, e responder:
- Todo requisito tem pelo menos uma tarefa?
- Alguma tarefa está fora do escopo ou não tem requisito?
- Os módulos e as portas das tarefas batem com o mapa de módulos?
- Algo contradiz a constituição do projeto ou o padrão?

Se algo falhar, voltar para a fase certa e corrigir antes de programar. Mostrar o resultado ao Weslei.

### Fase 5 — Execução e conferência (papéis: Dev e QA)
- Seguir as 4 regras do Karpathy.
- **Teste antes do código nos módulos críticos** (dinheiro, preço, estoque, permissões e separação dos dados entre empresas):
  1. escrever o teste que prova a regra e ver ele falhar;
  2. fazer o código;
  3. ver o teste passar.
- **Caçar a causa antes de consertar.** Diante de um erro:
  1. repetir o erro;
  2. achar a causa raiz;
  3. anotar no arquivo do módulo;
  4. corrigir;
  5. deixar um teste que impede o erro de voltar.
  Nunca só tapar o sintoma.
- **Revisão por um segundo agente.** Nos módulos críticos e antes de publicar, um agente separado, que não viu o código ser feito, revisa a mudança conferindo: critério de pronto, regras do Karpathy, fronteiras dos módulos e segurança. O que ele apontar volta para a tarefa.
- A sessão testa o próprio trabalho e mostra a prova. O LAB faz a segunda conferência quando faltar recurso ou quando pedido.
- Atualizar a memória do projeto ao fim de cada tarefa.

## Memória do projeto (contra o limite de contexto)
A IA esquece; arquivo não esquece. Estrutura padrão em todo repositório:

```
CLAUDE.md                      curto (até ~40 linhas): o que é, onde está cada doc, regras apontando para o padrão
docs/constituicao.md           regras fixas do projeto (só mudam com OK do Weslei)
docs/especificacao.md
docs/arquitetura.md            mapa de módulos
docs/CONTRATOS.md              contratos das portas e avisos (eventos) de todos os módulos
modulos/<nome>/                documentos de cada módulo junto do código: o que faz, dados, regras, armadilhas aprendidas
docs/decisoes/NNN-titulo.md    registro de decisões: data, decisão, por quê, alternativas
docs/plano.md                  plano geral
docs/specs/NNN-nome/           spec.md, plano.md e tarefas/ de cada funcionalidade
docs/estado.md                 onde paramos e próximo passo (curto, sempre atualizado)
docs/MANUAL-USO.md
docs/MANUAL-TECNICO.md
```

Regras da memória:
- Nunca carregar tudo. Ordem de leitura: `CLAUDE.md` → `docs/estado.md` → o módulo e a tarefa da vez.
- Aprendeu algo (um erro, um limite do Bling)? Gravar no arquivo do módulo.
- Tomou uma decisão nova? Criar um arquivo em `docs/decisoes/`.
- Arquivo passou de ~300 linhas? Dividir.

## Uso no chat (planejamento com o Weslei)
- Projeto novo: fazer as Fases 1 a 3 no chat. O brief sai com mapa de módulos, revenda, segurança, estrutura de memória e uma Etapa 0 que cria a pasta `docs/`.
- Projeto existente: antes do brief, pedir o "RESUMO DO PROJETO HOJE" à sessão do projeto. O que foi aprovado lá vale mais.
- Entregar sempre em pacote completo, um prompt único por sessão, com a linha "Cole na sessão X" em negrito antes de cada prompt.

## Uso nas sessões (Claude Code)
- Projeto novo: a Etapa 0 cria a estrutura de memória a partir do brief.
- Projeto existente sem módulos: não reorganizar por conta própria. Fazer um diagnóstico com:
  - os módulos que já existem "escondidos";
  - as dependências cruzadas;
  - os riscos e o custo;
  - uma proposta de migração aos poucos, um módulo por vez, sem parar o sistema. O primeiro passo é ligar a trava das fronteiras no modo "só avisa", para medir as invasões entre módulos. A trava fica mais rígida à medida que cada módulo é separado.
  Mostrar o diagnóstico e esperar o OK.
- Nunca mexer em módulo fora da tarefa.

## Checklist antes de entregar um brief
- [ ] Entrevista feita e lista "A decidir" registrada
- [ ] Tamanho da tarefa classificado
- [ ] Mapa de módulos com portas, avisos e donos dos dados (decisão 001)
- [ ] Trava automática das fronteiras prevista
- [ ] Módulos como itens de plano na revenda
- [ ] Núcleo padrão (login, usuários, grupos, empresa, e-mail, manuais)
- [ ] Revenda: empresa em todo dado, marca do cliente, planos
- [ ] Integrações isoladas (Central de API quando houver)
- [ ] Segurança
- [ ] Estrutura de memória e Etapa 0
- [ ] Etapas pequenas com critério de pronto e teste
- [ ] Módulos críticos marcados para teste antes do código e revisão por segundo agente
- [ ] Conferência cruzada feita
- [ ] Fora do escopo
