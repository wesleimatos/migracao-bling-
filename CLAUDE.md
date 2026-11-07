# CLAUDE.md — migracao-bling- (Migração Superus → Bling)

Migração do Superus para o Bling (feita em 19–24/10) e, hoje, suporte do Bling à loja e ao Compras pelo
WhatsApp. Ordem de leitura: este arquivo → `docs/estado.md` → o que a tarefa pedir.

## Onde está cada coisa
- `docs/constituicao.md`: TODAS as regras fixas (Bling, preço, horários, loja, Compras, WhatsApp, padrão).
- `docs/estado.md`: onde paramos e pendências. Atualizar ao fim de cada tarefa.
- `docs/decisoes/`: uma decisão por arquivo (data, decisão, por quê, alternativas). Decisão nova = arquivo novo.
- `docs/historico.md`: pedidos antigos e entregas. `docs/MANUAL-USO.md` e `docs/MANUAL-TECNICO.md`: manuais.
- `TROCA.md`: só um índice para quem ainda procura as regras lá (PDV, Braço, agendas).
- Regras de código: siga a seção 14 de `padrao/PADRAO-APPS.md` (wesleimatos/projetos, main) (pedido #126).
- Skill Arquiteto: `.claude/skills/arquiteto/SKILL.md` (v2026.11.07-2), sem a parte de módulos (3.1 e trava das fronteiras): este projeto fica fora do monólito (pedido #150).

## OBRIGATÓRIO — Como terminar toda tarefa (02/11, pedidos #65 e #77; acima das outras regras)
1. Nunca terminar com lista de texto do que se espera do Weslei. Terminar de um destes jeitos:
   A) Se algo depende dele: perguntas com opções para clicar (AskUserQuestion), a recomendada marcada
      "(Recomendado)" e "Outro". Uma pergunta por decisão. Depois da resposta, seguir direto.
   B) Se nada depende dele, só a linha:
      "✅ Acabamos. Nada pendente com você. Sessão disponível para a próxima tarefa."
2. Vale também no meio do trabalho: toda decisão do Weslei é pergunta com clique.
3. Ao acabar uma tarefa, mostrar o plano da próxima (em poucas linhas) e perguntar com clique se o Weslei
   aprova. Só começar com o OK dele.

## OBRIGATÓRIO — outras (detalhes em `docs/constituicao.md`)
- O Weslei é o último recurso (#105): o técnico se resolve entre as sessões; ao chamá-lo, mostrar o que já foi tentado.
- Backup nunca no GitHub (#116). Nunca apagar nada no GitHub por conta própria; limpeza só pela sessão VPS (#115).
- Pedido "para: migracao-bling" no `wesleimatos/pedidos`: responder em até 1 HORA (#78). Ler os abertos ao abrir a
  sessão e no fim de cada tarefa. Recurso de testes: `padrao/RECURSO-LAB.md` (#71), só consulta.
- Senhas, chaves e tokens nunca no chat, no Git ou no brief. Dados reais nunca no Git.
- Toda mensagem ao Weslei começa com o horário de Brasília (ex.: 🕐 12h50).
- Promoção proibida (06/11): nunca criar, pedir ou sugerir promoção, preço promocional ou cupom.

## Início de toda sessão
Ler no main do `wesleimatos/projetos` o `padrao/PADRAO-APPS.md` e `briefs/migracao-bling.md` (seguir a
versão mais nova; nunca editar aquele nem outro repositório). Ver no `wesleimatos/pedidos` os Issues
"para: migracao-bling". Depois, `docs/estado.md`.

## Sessões deste projeto
- "Migração Superus → Bling (envio pela nuvem)": sessão principal, dona do projeto e da evolução dele.
- "Braço do Bling": ajudante. Executa no Bling (API) o que a principal pede. Não mexe no WhatsApp nem no PDV.
  Sempre faz backup antes e confere depois. Arquivos de trabalho em `dados/braco/` (fora do Git).
