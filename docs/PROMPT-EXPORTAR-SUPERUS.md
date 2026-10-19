# PROMPT-EXPORTAR-SUPERUS

Você vai usar meu computador (uso do computador) para tirar os dados do ERP Superus,
que já está aberto e logado. Fale comigo em português simples.

OBJETIVO
Gerar planilhas (de preferência CSV; se não houver, XLSX) com os dados abaixo, para a
migração do Superus para o Bling. Salvar tudo em:
C:\Users\wesle\OneDrive\Documentos\migracao-bling\planilhas\<AAAA-MM-DD>\

O QUE EXPORTAR (um arquivo para cada)
1. categorias.csv: categorias/grupos/departamentos de produtos (com a categoria-pai, se houver)
2. fornecedores.csv: nome/razão social, fantasia, CNPJ/CPF, IE, endereço, telefone, e-mail
3. produtos.csv: cadastro COMPLETO, com todas as colunas que o Superus oferecer, principalmente:
   código, descrição, unidade, EAN/GTIN, categoria, NCM, CEST, origem, CST/CSOSN, preço de venda,
   preço de custo, peso, dimensões, marca, ativo/inativo
4. produtos_fornecedores.csv: produto × fornecedor (código do produto no fornecedor, custo)
5. estoque.csv: código do produto, quantidade, custo, e o local/loja/depósito (se houver mais de um)
6. contas_pagar.csv: SÓ as contas EM ABERTO: fornecedor (com CNPJ), nº do documento, emissão,
   vencimento, valor, parcela, histórico, categoria/plano de contas e forma de pagamento

COMO FAZER
- Use as funções do próprio Superus: "Exportar", "Relatórios", "Gerar Excel/CSV" ou "Imprimir →
  Excel". NÃO copie produto por produto da tela.
- Primeiro só OLHE: percorra os menus e me mostre onde está cada exportação antes de gerar.
- Se um dado não tiver exportação, me diga qual e mostre as alternativas que encontrou.
- Em cada relatório, marque "todos os registros" (sem filtro de data ou loja), menos nas contas
  a pagar, que devem ser só as em aberto.
- Depois de gerar, abra cada arquivo e me diga: quantas linhas tem, as colunas (cabeçalho) e se
  algum texto saiu com acento quebrado.

REGRAS (importante)
- SÓ LEITURA. Nunca cadastre, altere, exclua, baixe conta, ajuste estoque ou feche caixa no Superus.
- Se aparecer qualquer janela pedindo para confirmar uma alteração, cancele e me pergunte.
- Não feche o Superus nem mude configurações dele.
- Não envie os arquivos para lugar nenhum (nem e-mail, nem GitHub, nem nuvem). Só salvar na pasta.
- Senhas: se o Superus pedir senha, pare e eu digito.

NO FIM, me entregue um resumo:
| Arquivo | Linhas | Colunas principais | Observação |
e as totalizações para conferência: nº de produtos, soma do estoque (unidades e valor no custo)
e soma das contas a pagar em aberto.
