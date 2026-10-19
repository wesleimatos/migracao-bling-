/** Texto seguro dentro do HTML. */
export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

const qtd = new Intl.NumberFormat('pt-BR')
const un = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatar(valor: number, formato: 'qtd' | 'un' | 'reais' = 'qtd'): string {
  return formato === 'reais' ? reais.format(valor) : formato === 'un' ? un.format(valor) : qtd.format(valor)
}

const MENU = [
  ['/', 'Início'],
  ['/planilhas', 'Planilhas'],
  ['/conferencia', 'Conferência'],
  ['/bling', 'Bling'],
  ['/envio', 'Envio'],
  ['/relatorio', 'Relatório']
]

/** Página com o menu do app (sem menu na tela de entrar). As telas funcionam no celular. */
export function pagina(titulo: string, ativo: string, corpo: string, comMenu = true): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · Migração Superus → Bling</title>
<style>
  :root { --verde: #1f8a4c; --verde-claro: #e8f5ee; --vermelho: #b42318; --vermelho-claro: #fdecea;
    --amarelo: #8a5a00; --amarelo-claro: #fff6e0; --cinza: #5f6b7a; --borda: #dfe3e8; --fundo: #f6f7f9; }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; font: 15px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1d2733; background: var(--fundo); }
  header { background: #fff; border-bottom: 1px solid var(--borda); padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; }
  header strong { font-size: 16px; }
  nav { display: flex; gap: 4px; flex-wrap: wrap; }
  nav a { padding: 6px 12px; border-radius: 8px; color: var(--cinza); text-decoration: none; }
  nav a.ativo { background: var(--verde-claro); color: var(--verde); font-weight: 600; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 22px; margin: 8px 0 16px; }
  h2 { font-size: 17px; margin: 0 0 12px; }
  .cartao { background: #fff; border: 1px solid var(--borda); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .grade { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 16px; }
  .grade .cartao { margin: 0; padding: 12px; }
  .numero { font-size: 22px; font-weight: 700; }
  .rotulo { color: var(--cinza); font-size: 13px; }
  .rolagem { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--borda); vertical-align: top; }
  th { font-size: 13px; color: var(--cinza); font-weight: 600; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  .etiqueta { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .ok { background: var(--verde-claro); color: var(--verde); }
  .erro { background: var(--vermelho-claro); color: var(--vermelho); }
  .aviso { background: var(--amarelo-claro); color: var(--amarelo); }
  .neutro { background: #eef0f3; color: var(--cinza); }
  .botao { display: inline-block; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--verde); background: var(--verde); color: #fff; text-decoration: none; font: inherit; cursor: pointer; }
  .botao.leve { background: #fff; color: var(--verde); }
  .botao.perigo { background: #fff; color: var(--vermelho); border-color: var(--vermelho); }
  select, input[type=file] { font: inherit; max-width: 100%; }
  input[type=text], input[type=password] { font: inherit; padding: 8px; border: 1px solid var(--borda); border-radius: 8px; width: 100%; max-width: 420px; }
  label.campo { display: block; margin: 0 0 12px; }
  label.campo span { display: block; font-size: 13px; color: var(--cinza); margin-bottom: 4px; }
  .barra { height: 10px; background: #eef0f3; border-radius: 999px; overflow: hidden; }
  .barra div { height: 100%; background: var(--verde); }
  .alerta { padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
  button[disabled] { opacity: .5; cursor: not-allowed; }
  select { padding: 6px; border: 1px solid var(--borda); border-radius: 8px; background: #fff; width: 100%; }
  .ajuda { color: var(--cinza); font-size: 13px; }
  .exemplo { color: var(--cinza); font-size: 13px; word-break: break-word; }
  details { border-top: 1px solid var(--borda); padding: 10px 0; }
  details summary { cursor: pointer; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .acoes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  @media (max-width: 600px) { main { padding: 12px; } .numero { font-size: 19px; } h1 { font-size: 20px; } }
</style>
</head>
<body>
<header><strong>Migração Superus → Bling</strong>
${comMenu ? `<nav>${MENU.map(([href, nome]) => `<a href="${href}"${href === ativo ? ' class="ativo"' : ''}>${nome}</a>`).join('')}</nav>
<form method="post" action="/sair" style="margin-left:auto"><button class="botao leve">Sair</button></form>` : ''}
</header>
<main>
<h1>${esc(titulo)}</h1>
${corpo}
</main>
</body>
</html>`
}
