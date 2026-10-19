# Desenho do app migracao-bling

Para o Weslei aprovar antes da Etapa 1 (COMO-TRABALHAMOS, item 1.1). Feito em 19/10/2026.

## O que é
Um site com login de um usuário só (o Weslei), em `https://migra.focosaas.com.br`, rodando na VPS.
Ele lê as planilhas do Superus e manda tudo para o Bling pela API, na ordem certa, sem duplicar.
É usado uma vez (teste + dia da troca) e depois é desligado.

## Onde fica cada coisa
| Lugar | O quê |
|---|---|
| Computador do Weslei | Superus, planilhas exportadas e o navegador |
| VPS (`/opt/migracao-bling`) | O app (Node 24) e a pasta `dados/`: planilhas, ligações de colunas, a tabela "código do Superus → id no Bling", a fila e os tokens do Bling cifrados. Serviço `migracao-bling`, porta só local, HTTPS pelo proxy |
| Bling | Recebe tudo pela API v3 |
| GitHub | Só código e documentos. Nenhum dado |

## Telas
1. **Entrar:** usuário e senha. A senha é criada pelo Weslei no primeiro acesso.
2. **Conectar o Bling:** o Client ID já vem preenchido; o Weslei digita o Client Secret ali e clica
   em "Conectar". Abre o login do Bling, autoriza e volta conectado. A tela mostra o que o app leu
   do Bling: depósitos, grupos de produtos, categorias de despesa e formas de pagamento.
3. **Planilhas:** subir os arquivos do Superus (XLSX ou CSV): categorias (48), fornecedores (64),
   produtos (62), produto × fornecedor (67, opcional) e contas a pagar (65). Mostra quantas
   linhas e quais colunas cada um tem.
4. **Ligar colunas:** para cada planilha, cada campo do Bling com a coluna do Superus. Já vem
   preenchido com as regras de `docs/MAPEAMENTO-*.md`; o Weslei só confere. Nas contas a pagar,
   liga cada categoria e forma de pagamento do Superus às do Bling. Fica salvo.
5. **Conferência:** antes de enviar, lista de erros e avisos por tipo, com botão para baixar a
   lista. Entre eles: NCM inválido, EAN interno, preço zerado, custo maior que a venda, estoque
   negativo (vai zerado), IE fora do padrão, CST especial (vai em SEM ST), fornecedor ou
   categoria que não existe, conta duplicada, valor zerado. E os **totais para bater com o
   Superus**: nº de produtos, estoque (unidades e valor no custo) e contas a pagar.
6. **Teste:** envia um ramo de categorias (4 níveis), 2 fornecedores, 5 produtos com código e nome
   começando por "TESTE", o estoque deles e 2 contas. Mostra o link de cada um no Bling para
   conferir. Botão "Apagar testes" depois da aprovação.
7. **Envio completo:** fila na ordem categorias → fornecedores → produtos → vínculos com
   fornecedor → estoque → contas a pagar. Barra de progresso por etapa, tempo que falta, botões
   pausar e continuar. Se cair, retoma de onde parou.
8. **Relatório:** quantos foram enviados, pulados (já existiam no Bling) e com erro (com o motivo).
   Botão "Reenviar só os erros" e botão para baixar tudo.

## Regras para tudo
- **Nunca duplica:** antes de criar, procura na tabela local e no Bling.
- **Respeita o Bling:** 1 chamada a cada 350 ms (limite de 3 por segundo); se o Bling pedir para
  esperar, espera e tenta de novo; renova o acesso sozinho.
- **Segurança:** Client Secret e tokens cifrados; senha guardada com scrypt; cookie seguro;
  bloqueio depois de várias senhas erradas. Nada de senha no chat, no Git ou no quadro.
- **Dados:** planilhas e banco só na VPS, com backup diário. No fim (Etapa 6), uma cópia é
  guardada e o serviço é removido.
- **Celular:** as telas funcionam no celular, para acompanhar o envio de longe.

## O que o app não faz
- Não mexe no Superus.
- Não cria nada no Bling fora do que está nas regras (depósitos, grupos, categorias de despesa e
  formas de pagamento são criados pelo Weslei).
- Não leva clientes, contas a receber, vendas nem contas já pagas.

## Etapas (brief, seção 6)
| Etapa | O quê | O Weslei vê funcionando |
|---|---|---|
| 1 | Leitura das planilhas, ligar colunas e conferência com totais (sem Bling) | Telas 3, 4 e 5 com planilhas de exemplo |
| 2 | Conexão com o Bling e fila de envio, testadas com um Bling falso | Testes automáticos + simulação |
| 3 | App na VPS (sessão VPS) | Entrar, digitar o Secret e conectar o Bling |
| 4 | Teste real com registros "TESTE" | Conferência no Bling e aprovação |
| 5 | Dia da troca: exportação final, envio completo, reenvio dos erros | Relatório e totais batendo |
| 6 | Conferência final de 20 produtos sorteados e desligamento | Aprovação final |
