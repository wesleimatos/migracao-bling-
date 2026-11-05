# CLAUDE.md — migracao-bling- (Migração Superus → Bling)

## OBRIGATÓRIO — Como terminar toda tarefa (02/11, pedidos #65 e #77; acima das outras regras)
1. Nunca terminar com lista de texto do que se espera do Weslei. Terminar de um destes jeitos:
   A) Se algo depende dele: perguntas com opções para clicar (AskUserQuestion), a
      recomendada marcada "(Recomendado)" e "Outro". Uma pergunta por decisão. Depois da
      resposta, seguir direto para a próxima etapa.
   B) Se nada depende dele, só a linha:
      "✅ Acabamos. Nada pendente com você. Sessão disponível para a próxima tarefa."
2. Vale também no meio do trabalho: toda decisão do Weslei é pergunta com clique.
3. Ao acabar uma tarefa, mostrar o plano da próxima (em poucas linhas) e perguntar com
   clique se o Weslei aprova. Só começar com o OK dele.

## OBRIGATÓRIO — O Weslei é o último recurso (05/11, pedido #105)
- O que é técnico se resolve direto entre as sessões (Braço, quadro de pedidos, API).
- Criar métodos que não dependam dos cliques do Weslei. Ele só entra para o OK que as
  regras exigem, uma senha ou login só dele, ou uma decisão de negócio.
- Ao chamá-lo, mostrar em poucas linhas o que já foi tentado e por que não deu.

## OBRIGATÓRIO — Backup nunca no GitHub (05/11, pedido #116)
- Nunca mandar backup ou cópia de dados ao GitHub (Actions, releases, repositório, pacotes).
- Nunca apagar nada no GitHub por conta própria; limpeza só pela sessão VPS (#115).
- Backups do Bling ficam só no container/servidor (`dados/braco/`, fora do Git).

## OBRIGATÓRIO — Prazo de resposta (03/11, pedido #78)
- Pedido no `wesleimatos/pedidos` "para: migracao-bling": responder em até 1 HORA, pelo
  menos com um comentário ("recebido, vou fazer / preciso de X / não é comigo").
- Ler os pedidos abertos ao abrir a sessão e no fim de cada tarefa, e responder os novos.
- Recurso de testes: cartão do LAB em `padrao/RECURSO-LAB.md` (pedido #71), só consulta.

## Início de toda sessão
No início de cada sessão, leia no main do `wesleimatos/projetos` o arquivo
`padrao/PADRAO-APPS.md` e o brief deste projeto em `briefs/migracao-bling.md`. Siga sempre
a versão mais nova. Nunca edite o `wesleimatos/projetos` nem outro repositório. Veja no
`wesleimatos/pedidos` os Issues "para: migracao-bling".
As regras do dia a dia da loja (PDV, Compras, escala, horário) estão no `TROCA.md`.

## Regras do padrão (adotadas em 02/11/2026, pedido #35)
- **Quem decide é o Weslei.** Mostre o plano, pergunte com opções para clicar e só siga
  com o OK dele. Português simples, sem termos técnicos.
- **Todo problema:** onde falhou, a causa, o alcance, a solução definitiva com teste e, se
  precisar, uma correção imediata. Apresente e só corrija com o OK. Nunca relate só o sintoma.
- **Antes de mexer:** aviso de risco (o que pode quebrar, a chance, a prevenção, o backup e
  como desfazer), inclusive o efeito em outros sistemas (PDV, caixas, servidor).
- **Site ou conta do Weslei:** entregue um prompt pronto para o Claude do navegador, com o
  fluxo inteiro. O Weslei só digita senha, cola a chave e dá o OK.
- **Senhas, chaves e tokens** nunca no chat, no Git ou no brief.
- **Foco só neste projeto.** Pedidos para outros projetos vão pelo quadro `wesleimatos/pedidos`.
- **Brief novo não apaga o que foi aprovado:** mostre as diferenças antes.
- **Toda tarefa termina com um RESUMO PARA O WESLEI** (feito, pendente, o que depende
  dele). Não vai para o chat do VALIDAR PROJETO. RETORNO PARA O CHAT só para PROJETO NOVO
  (pedido #103, 04/11): este projeto já existe, então não volta para o chat validar.
- **Dona da evolução (padrão §7, pedido #103):** o chat só fez o primeiro brief. A evolução
  da Migração é desta sessão: procurar sempre melhorias e propor ao Weslei com plano e
  perguntas de clique. Só faz com o OK dele. A central só registra o que for decidido.

## Como falar com o Weslei (regra obrigatória, 31/10)
- Tudo que depender de resposta do Weslei vira ENTREVISTA: usar a ferramenta de perguntas
  com opções para clicar (AskUserQuestion), nunca texto para ele digitar.
- Uma pergunta por vez (ou poucas, numeradas "1 de 3"), cada opção com uma explicação
  curta, e a recomendada marcada "(Recomendado)".
- Sempre deixar a opção "Outro" para ele escrever, se precisar.
- Nunca pedir para ele responder digitando "1A", "sim/não" ou números.
- Antes de começar uma função nova, fazer a entrevista para entender o que ele quer.

## Sessões deste projeto
- "Migração Superus → Bling (envio pela nuvem)": sessão principal, dona do projeto.
- "Braço do Bling": ajudante. Executa no Bling (API) o que a principal pede. Não mexe no
  WhatsApp nem no PDV. Sempre faz backup antes e confere depois. Arquivos de trabalho em
  `dados/braco/` (fora do Git).

## Exceção aprovada pelo Weslei (02/11/2026)
- Correção de UM item pedida pelo PDV ou pela sessão principal (cliente no caixa, barra,
  preço da etiqueta, regra já aprovada) segue sem novo OK, com backup, conferência e aviso
  depois. Mudança em lote ou decisão nova: só com o OK do Weslei.
- Toda mensagem ao Weslei começa com o horário de Brasília (ex.: 🕐 12h50).

## Regras do Bling (do Weslei, ver TROCA.md)
- Nunca trocar código (SKU) de produto já etiquetado. Não inventar números.
- Barra de fábrica → GTIN; se o Bling recusar, → SKU. Etiqueta da loja → não mexer.
- Antes de concluir erro de cadastro, conferir a última carga/sincronização do PDV.
- Horário da loja: só consulta e correção item a item. Varredura ou leitura em massa só
  fora do horário (20h–8h), no máximo 1 consulta por segundo (o PDV usa a mesma conta).
- Compras: segunda a sexta, 8h30–18h (feriado só quem estiver de plantão). Fora disso, guardar a pendência para o próximo expediente.
- Dados reais (planilhas, backups, tokens) nunca no Git.

## Exceção aprovada pelo Weslei: permissões (02/11/2026)
- O `.claude/settings.json` deste repositório usa uma lista de ações liberadas, e não o modo
  plano do padrão, para os plantões automáticos (8h, 20h e agendas) não travarem esperando
  aprovação. Ações sérias (ex.: apagar agenda) continuam pedindo OK.
- Fora do horário do Compras, com cliente esperando: resolver na hora no Bling (preço da
  etiqueta, barra de fábrica, cadastro PROVISÓRIO) e anotar para o Compras revisar (31/10).
