# CLAUDE.md — migracao-bling- (Migração Superus → Bling)

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
  dele). Não vai para o chat do VALIDAR PROJETO. RETORNO PARA O CHAT só para validar
  regras (brief novo ou alterado, mudança/exceção no padrão, conflito brief × padrão).

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
- Compras: segunda a sexta, 9h–18h. Fora disso, guardar a pendência para o próximo expediente.
- Dados reais (planilhas, backups, tokens) nunca no Git.
