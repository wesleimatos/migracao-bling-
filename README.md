# migracao-bling

Migração única do ERP **Superus** para o **Bling** (API v3), loja Oiapoque.
O app lê as planilhas exportadas do Superus, confere tudo e (a partir da Etapa 2) envia para o
Bling na ordem certa, sem duplicar. Desenho aprovado em `docs/DESENHO.md`; brief em
`docs/BRIEF-MIGRACAO-BLING.md`; quadro de pedidos em `TROCA.md`.

## Situação
**Etapa 1 pronta:** planilhas, ligação de colunas e conferência com totais. Nada vai ao Bling ainda.

| Tela | O que faz |
|---|---|
| Início | As 5 planilhas, quantas linhas vão para o Bling e a situação de cada uma |
| Planilhas | Envio dos arquivos do Superus (XLSX ou CSV) |
| Colunas | Qual coluna do Superus vai em cada campo (já vem preenchido; mostra exemplos) |
| Conferência | Totais para bater com o Superus, erros e avisos por tipo, lista para o Excel |

## Como rodar
Node 22.18 ou mais novo (a VPS tem o 24). Sem dependências: não precisa de `npm install`.

```
npm start      # http://127.0.0.1:8100
npm test       # testes automáticos
```

Variáveis: `PORT` (8100), `HOST` (127.0.0.1) e `DADOS` (pasta do banco e das planilhas; padrão
`dados/`, fora do Git).

**Etapa 1 não tem login:** só roda em 127.0.0.1. O login (senha com scrypt, cookie seguro) entra
antes de o app ir para a VPS.

## Pastas
| Pasta | O quê |
|---|---|
| `src/planilhas/` | Leitura de XLSX (leitor próprio, sem biblioteca) e CSV (UTF-8 ou ANSI) |
| `src/regras/` | Uma regra por cadastro: categorias, fornecedores, produtos, vínculos e contas a pagar. Seguem `docs/MAPEAMENTO-*.md` |
| `src/servidor.ts` | Telas e rotas (`node:http`) |
| `src/banco.ts` | SQLite (`node:sqlite`): planilhas recebidas e ligação de colunas |
| `tests/` | Testes com planilhas de exemplo inventadas (nenhum dado real) |

## Regras principais (decisões do Weslei)
- Categorias iguais ao Superus: setor → grupo → subgrupo → categoria (500 no Bling).
- Fornecedor com CPF/CNPJ repetido vira um só; o que ficar herda IE, telefones e e-mail dos outros.
- Produtos: unidade `UN`; CST 60 → grupo **COM ST**, o resto → **SEM ST**; só GTIN válido no campo
  de código de barras (os outros códigos vão nas observações); estoque negativo entra zerado;
  depósito "Geral".
- Contas a pagar: só em aberto; cada parcela é uma conta.
