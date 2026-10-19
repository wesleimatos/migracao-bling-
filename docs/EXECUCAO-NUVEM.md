# Modo nuvem: o Claude da nuvem faz os cadastros no Bling

Decisão do Weslei (19/10/2026): **sem instalar o app na VPS**. O Claude da nuvem roda o envio por
comandos (`src/cli.ts`), com as mesmas regras, a mesma fila e os mesmos testes do app.
O Pedido #7 (instalar na VPS) foi cancelado.

## O que o Weslei faz (uma vez)
1. **Client Secret no ambiente da nuvem** (nunca pelo chat): menu do ambiente no título da sessão →
   **Edit** → variável de ambiente `BLING_CLIENT_SECRET` com o Client Secret do app "Migração"
   (central do Bling, "Informações do app"). O acesso à rede do ambiente já está "Completo".
2. **Sessão nova** nesse ambiente (a variável só vale em sessão nova), com o repositório
   `wesleimatos/migracao-bling-`, mandando as planilhas: 48 (categorias), 64 (fornecedores),
   62 (produtos) e, se quiser que o Claude cadastre também, 65 (contas a pagar em aberto) e
   67 (produtos × fornecedores).
3. **Autorizar o Bling:** clicar no link que o Claude passar, autorizar e colar no chat o endereço
   que aparecer (`https://migra.focosaas.com.br/bling/callback?code=...`). Logo em seguida: o código
   vence rápido. Esse endereço não é senha (sem o Secret não serve para nada).
4. **Conferir o teste no Bling** e aprovar antes do envio completo.

## O que o Claude faz (na sessão nova)
Ler `docs/` e `TROCA.md` antes. As planilhas chegam como anexos; os dados ficam em `dados/`
(fora do Git, nunca commitar).
```
node src/cli.ts planilha categorias <arquivo 48>
node src/cli.ts planilha fornecedores <arquivo 64>
node src/cli.ts planilha produtos <arquivo 62>
node src/cli.ts planilha contas <arquivo 65>        # se vier
node src/cli.ts planilha vinculos <arquivo 67>      # se vier
node src/cli.ts conferir        # bater com: 500 categorias, 800 fornecedores, 13.001 produtos
node src/cli.ts autorizar       # link para o Weslei (precisa de BLING_CLIENT_SECRET)
node src/cli.ts conectar "<endereço colado pelo Weslei>"
node src/cli.ts ligar-contas    # se houver contas; o que não tiver par: ligar categoria|forma "<nome>" <id>
node src/cli.ts enviar teste
node src/cli.ts relatorio teste # e pedir ao Weslei para conferir no Bling (códigos TESTE-...)
node src/cli.ts apagar-testes   # depois da aprovação
node src/cli.ts enviar completo # ~2h30; rodar em segundo plano; se parar, rodar de novo (continua)
node src/cli.ts relatorio completo
```

## Cuidados
- O envio completo passa de 2 horas: rodar em segundo plano e, se o comando for interrompido,
  rodar `enviar completo` de novo. Ele continua de onde parou, sem duplicar.
- Se o contêiner da nuvem for perdido no meio (some a pasta `dados/`), uma sessão nova recebe as
  planilhas de novo e roda `enviar completo`. Categorias (nome + pai), fornecedores (CPF/CNPJ) e
  produtos (código) são procurados no Bling antes de criar; ligações de produtos que já existiam
  são conferidas; o estoque é balanço (repetir não soma). **Contas a pagar** não são procuradas:
  se a pasta se perder depois de elas irem, conferir no Bling antes de rodar de novo.
- Limite do Bling: 3 chamadas por segundo e 120.000 por dia (o envio todo usa ~25.000).
- Ao terminar: o Weslei pode apagar a variável `BLING_CLIENT_SECRET` do ambiente.
