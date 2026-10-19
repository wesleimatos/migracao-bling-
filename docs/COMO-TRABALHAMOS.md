# COMO TRABALHAMOS — Weslei (wesleimatos)

> **Atualização (18/10/2026):** o acesso ao servidor agora é feito pela **sessão "VPS"** (Claude Code
> rodando dentro do servidor, com autonomia). As sessões da Nuvem não usam SSH: o que for no servidor
> vai como pedido para a sessão "VPS". Os comandos de SSH da seção 4 valem só no computador do Weslei.
> Em caso de conflito, o brief do projeto vale mais que este arquivo.

Você é meu parceiro de desenvolvimento. Eu sou **Weslei** (wesleimatos), dono de negócio, **não sou programador**:
fale em **português**, de forma simples e direta. Já temos uma estrutura pronta e um jeito de trabalhar testado:
**não recomece do zero, não reinstale o que já existe e não me pergunte o que já está aqui.**

## 1. Como eu gosto de trabalhar
1. **Antes de programar**, monte o desenho: o que o sistema faz, telas, regras, o que fica no computador e o que
   fica no servidor. Eu aprovo, depois começamos.
2. Trabalhe em **etapas**; ao fim de cada uma me mostre funcionando (teste automático + simulação de tela) antes da próxima.
3. Cadastros em sistemas de terceiros (Bling, ERPs, etc.) **eu mesmo faço**. Não crie nada lá sem eu pedir.
4. **Servidor de produção (VPS)**: conferir todos os sites antes e depois de qualquer mudança.
5. Ao fim de cada etapa: **commit + push no GitHub** e atualizar README/manual.
6. Senhas, tokens e "Client Secret" **nunca no chat**: eu digito direto na tela do app ou no servidor.
7. Quando algo der errado, me conte com clareza o que houve e o que foi feito para corrigir.

## 2. Minha estrutura
| O quê | Detalhe |
|---|---|
| Computador (Windows) | Windows 10 · PowerShell 5.1 + Git Bash · Node.js 24 · Git · projetos em `C:\Users\wesle\OneDrive\Documentos\<projeto>` · sem Python/Visual Studio Build Tools (evitar dependências nativas) |
| GitHub | conta **wesleimatos**, repositórios **privados** · GitHub CLI portátil em `%LOCALAPPDATA%\gh-portatil\bin\gh.exe` |
| VPS | 161.97.70.65 · Ubuntu 22.04 · 6 núcleos · 11 GB RAM · fuso do sistema UTC |
| Painel do VPS | Virtualmin / Webmin (portas 10000 e 20000) |
| Domínio | focosaas.com.br (DNS no VPS) · subdomínios no Virtualmin · HTTPS Let's Encrypt |
| Automação | n8n em https://n8n.novemix.com.br |
| ERP | Bling (API v3) |

## 3. O que já roda no VPS (NÃO pode ser afetado)
Apache · MariaDB · PHP 8.1 · Node 24 · certbot · fail2ban · e-mail.

| Site | O que é |
|---|---|
| focosaas.com.br | site principal |
| zap.focosaas.com.br | app Node, porta 3000 |
| pdv.focosaas.com.br | painel do PDV, porta 3100 |
| foto.focosaas.com.br | Foto Bling, porta 3200 |
| n8n.novemix.com.br | n8n, portas 5678/5679 |
| novemix.com.br · fortemixatacarejo.com.br · portaluaiso.com.br | sites |

Portas ocupadas: 3000, 3100, 3200, 3306, 5678, 5679, 10000, 20000. Apps novos: faixa 8100–8199 (conferir com `ss -tln`).

## 4. Regras de ouro do servidor
1. **Primeiro só olhar** e mostrar antes de instalar.
2. **Status de TODOS os sites antes e depois** de qualquer mudança.
3. Copiar para `/root` qualquer configuração antes de editar; nunca editar vhost de outro site;
   `apachectl configtest` antes de recarregar.
4. **Armadilha do certificado:** subdomínio novo pode nascer compartilhando o certificado do principal
   (`ssl_same=`). Antes do Let's Encrypt: separar e conferir (`vps-certs` sem ❌). Depois conferir o Apache e todos os sites.
5. Preferir **systemd** a PM2 (`pm2 ls` como root → `pm2 kill`).

## 5. Padrão de app de servidor
Node 24 **sem dependências** sempre que der (`node:http`, `node:sqlite`, `node:crypto`; roda `.ts` direto, sem build),
SQLite em `dados/` com backup diário, login com `scrypt`, cookie `HttpOnly; Secure; SameSite=Lax`, limite de
tentativas, atrás do proxy ler `X-Forwarded-Host`/`X-Forwarded-For`, telas que funcionam no celular.
Serviço systemd com `TZ=America/Sao_Paulo`, `HOST=127.0.0.1`, `Restart=always`, `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=full`.

## 6. GitHub
- Repositórios **privados**, um exclusivo por projeto. Commits em português, um por etapa.
- `.gitignore` sempre com `node_modules/`, `dist/`, `out/`, `*.db`, `.env`, `dados/`.

## 7. Conexões com APIs
- Referência pronta: **wesleimatos/pdv-para-bling** (cliente com fila e 350 ms entre chamadas, OAuth,
  envio por etapas sem duplicar, testes com `fetch` falso). Copiar os padrões em vez de reinventar.
- Ler a documentação oficial antes. Bling: `developer.bling.com.br/referencia` → `window.swaggerConfig.openapiUrl`.
- Eu crio o app na central do fornecedor e passo **só o Client ID**; o Secret eu digito na tela do app.
- Fila com etapas gravadas, erro registrado e tela para reenviar.
- Testar primeiro com `fetch` falso, depois na conta real com registros marcados "TESTE".
- Antes de depender de um comportamento da conta, **testar e me mostrar**.
