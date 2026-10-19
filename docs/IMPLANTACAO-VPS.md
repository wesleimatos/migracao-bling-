# Etapa 3: instalar o app na VPS (para a sessão "VPS")

Brief, seção 7, e regras de ouro do servidor (COMO-TRABALHAMOS, seção 4). **Primeiro só olhar e
mostrar ao Weslei; instalar com o OK dele.** Backup antes de mexer, `apachectl configtest`,
`vps-certs` sem ❌, status de todos os sites antes e depois, registro em MUDANCAS.md.

## O que já está pronto (Pedido #2)
- Porta **8101** livre (a 8100 é do ERPNext). Incluir a 8101 na tabela de portas do ACESSO-DOCKER.md.
- `migra.focosaas.com.br` criado no Virtualmin, com Let's Encrypt próprio e renovação automática.
- Node 24.22.0 com `node:sqlite`. O servidor baixa o código do GitHub sem login.

## Como deve ficar
| Item | Valor |
|---|---|
| Código | `/opt/migracao-bling/app`: clone de `https://github.com/wesleimatos/migracao-bling-` (branch `claude/migracao-bling-q0n4i3`, o padrão do repositório), dono root, só leitura para o serviço |
| Dados | `/opt/migracao-bling/dados`, dono do usuário do serviço, `chmod 700` |
| Usuário | Linux dedicado, sem login (ex.: `migracao`) |
| Serviço | systemd `migracao-bling` |
| Porta | `127.0.0.1:8101` |
| Dependências | nenhuma (sem `npm install`) |

### Serviço (`/etc/systemd/system/migracao-bling.service`)
Conferir o caminho do Node com `command -v node`.
```
[Unit]
Description=Migração Superus → Bling (app de migração única)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=migracao
Group=migracao
WorkingDirectory=/opt/migracao-bling/app
Environment=PORT=8101
Environment=HOST=127.0.0.1
Environment=DADOS=/opt/migracao-bling/dados
Environment=CONFIAR_PROXY=1
Environment=TZ=America/Sao_Paulo
ExecStart=/usr/bin/node src/index.ts
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

### Apache (vhost 443 de `migra.focosaas.com.br`)
Trocar a página padrão pelo proxy, mantendo o `/.well-known` para a renovação do certificado:
```
ProxyPreserveHost On
ProxyPass /.well-known !
ProxyPass / http://127.0.0.1:8101/
ProxyPassReverse / http://127.0.0.1:8101/
RequestHeader set X-Forwarded-Proto "https"
```
O app lê `X-Forwarded-For`, `X-Forwarded-Host` (o mod_proxy já manda) e `X-Forwarded-Proto` (para
marcar o cookie como `Secure`). As planilhas sobem com até 60 MB. Na porta 80, só o redirecionamento
para HTTPS (e o `/.well-known`).

### Backup diário
Cópia diária e consistente do banco (`migracao.db`, que usa WAL) e da chave `chave-cofre` (sem
ela o Secret e os tokens guardados não abrem), com retenção. Do jeito que a VPS já faz nos outros
apps (ex.: `sqlite3 ... ".backup ..."` num timer do systemd).

### Atualizar o código depois
`git -C /opt/migracao-bling/app pull` e `systemctl restart migracao-bling`. As planilhas e o banco
ficam em `dados/` e não são tocados.

## Conferência depois de instalar
1. `systemctl status migracao-bling` ativo; no `journalctl -u migracao-bling` aparece
   "Migração Superus → Bling em http://127.0.0.1:8101" e "Primeiro acesso: o código para criar a
   senha está em /opt/migracao-bling/dados/codigo-primeiro-acesso".
2. `curl -sI http://127.0.0.1:8101/entrar` → 200.
3. `curl -sI https://migra.focosaas.com.br/` → 303 para `/entrar`; `/entrar` → 200 com
   `X-Frame-Options: DENY` (prova de que é o app respondendo, e não a página padrão).
4. `vps-certs` sem ❌, `apachectl configtest` OK e os outros sites iguais a antes.

## O que NÃO fazer
- Não criar a senha do app nem digitar o Client Secret: isso é do Weslei, na tela.
- **O código de primeiro acesso** (`cat /opt/migracao-bling/dados/codigo-primeiro-acesso`) vai só
  para o Weslei, direto. Nunca no quadro, no GitHub ou em arquivo do repositório. Vale uma vez e
  some quando a senha é criada.
- Não mexer em outros sites, vhosts ou portas.
