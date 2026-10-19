# TROCA — quadro da migração Superus → Bling

## Agora
Etapa: 0 · Com a bola: COMPUTADOR · Aguardando: amostras do Superus (Pedido #1)

Repositório: `wesleimatos/migracao-bling-` (com traço no fim; o Weslei escolheu usar este no lugar
de `migracao-bling`). Fica **público** por decisão do Weslei e será excluído no fim do projeto.
Referências em `docs/`.

## Como usar o quadro
- Antes de mexer: `git pull`. Depois: commit `quadro: ...` + `git push`.
- Cada pedido tem número, destinatário (CODE, COMPUTADOR, VPS ou WESLEI) e o que deve voltar.
- Quem termina marca [x], escreve a entrega em "Entregas" e atualiza o "Agora".
- **Dados reais não entram no Git.** Só aqui e em `amostras/`: cabeçalhos, até 5 linhas de exemplo
  por arquivo (com CNPJ/CPF mascarados) e totais. As planilhas completas ficam no computador e,
  na Etapa 4, vão pela tela do app.

## Pedidos abertos
- [ ] #1 PARA: COMPUTADOR · Amostra dos 6 arquivos do Superus · aberto em 19/10/2026
  - Siga `docs/PROMPT-EXPORTAR-SUPERUS.md` (uso "amostra"). Todas as regras de lá valem:
    só leitura no Superus, cancelar qualquer janela de confirmação, senha é com o Weslei.
  - 1) **Só olhar primeiro:** percorra os menus e mostre ao Weslei onde fica cada exportação.
    Só gere os arquivos depois do OK dele.
  - 2) Gere os 6 arquivos completos (categorias, fornecedores, produtos, produtos_fornecedores,
    estoque, contas_pagar só em aberto) em
    `C:\Users\wesle\OneDrive\Documentos\migracao-bling\planilhas\<AAAA-MM-DD>\`.
    **Esses arquivos completos não vão para o Git.**
  - 3) Crie a amostra no repositório, um arquivo por planilha: `amostras/<arquivo>.md`
    (ex.: `amostras/produtos.md`), com o cabeçalho + até 5 linhas copiados do arquivo do jeito
    que estão, dentro de um bloco de código, sem trocar separador nem aspas. Se a planilha for
    XLSX, copie as células separadas por `;`. Se der, escolha linhas variadas (produto inativo,
    com CEST, unidade diferente de UN, conta com parcela).
    - Mascare só CNPJ/CPF, assim: `12.345.***/0001-**`.
    - A amostra serve só para a nuvem ver o formato. **A migração leva todos os registros,
      completos e sem máscara**, a partir dos arquivos completos (pela tela do app, na Etapa 4).
  - 4) Escreva a entrega em "Entregas", com:
    - onde fica cada exportação no Superus (caminho do menu);
    - para cada arquivo: nº de linhas, formato (CSV ou XLSX), separador, codificação
      (UTF-8 ou ANSI/Windows-1252) e se algum acento saiu quebrado;
    - totais: nº de produtos (ativos e inativos), soma do estoque (unidades e valor no custo),
      quantidade e soma das contas a pagar em aberto;
    - quantos locais de estoque existem, com os nomes;
    - lista das categorias financeiras (plano de contas) e das formas de pagamento que aparecem
      nas contas a pagar em aberto;
    - o que não teve exportação e as alternativas encontradas.
- [ ] #2 PARA: VPS · Porta livre e como baixar o código · aberto em 19/10/2026
  - Só responder, sem instalar nada ainda (a instalação é na Etapa 3, seção 7 do brief).
  - Qual porta livre em 127.0.0.1, entre 8100 e 8199, fica para o serviço `migracao-bling`?
    (conferir com `ss -tln`; as ocupadas conhecidas estão em `docs/COMO-TRABALHAMOS.md`, seção 3)
  - Como o servidor vai baixar o código de `wesleimatos/migracao-bling-` (atenção ao traço no fim):
    o GitHub do servidor já está configurado, ou vai precisar de uma deploy key só leitura
    (o Weslei cadastra a chave pública)?
  - Responda em "Entregas".

## Entregas
- WESLEI · app "Migração" criado na central do Bling em 19/10/2026 · Client ID:
  `d8c1742bfda50d9d56ee88a8887b07b607c553cd` (o Client Secret nunca vai no quadro: o Weslei
  digita na tela do app, na Etapa 3) · link de retorno confirmado pelo Weslei · falta confirmar
  as permissões

## Bloqueios (precisa do Weslei)
_(nenhum)_
