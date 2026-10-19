# Categorias: Superus → Bling

Decisão do Weslei (19/10/2026): **levar igual ao Superus**, com os mesmos nomes e a mesma árvore.

## O que veio do Superus
Planilha da consulta personalizada 48 "MIGRACAO ARVORE CATEGORIAS" (XLSX), uma linha por caminho:

`COD_SETOR, SETOR, COD_GRUPO, GRUPO, COD_SUBGRUPO, SUBGRUPO, COD_CATEGORIA, CATEGORIA,
PRODUTOS_ATIVOS, SETOR_INATIVO, GRUPO_INATIVO, SUBGRUPO_INATIVO, CATEGORIA_INATIVA`

Conferência feita em 19/10/2026:
- 4 níveis: 27 setores, 157 grupos, 289 subgrupos e 27 categorias = **500 categorias** no Bling.
- Nenhuma inativa. Cada código tem um nome só e um pai só. Nenhum nome repetido dentro do mesmo pai.
- 18 nomes aparecem em ramos diferentes (ex.: LUVAS 3 vezes, DECORACAO 2 vezes). Continuam
  separados porque cada um fica dentro do seu pai.
- 6 setores não têm nada abaixo deles (ALBUNS E FIGURINHAS COPA, BEBIDAS, GERAL,
  PICOLES E SORVETES, SALDAO, USO E CONSUMO ATACADAO MULTI). Vão assim mesmo.
- Nomes em maiúsculas, até 30 letras; 15 têm acento (ex.: SEGURANÇA). Acentos chegaram certos.
- `PRODUTOS_ATIVOS` só conta produtos ligados ao 4º nível (404 no total). Os níveis de cima
  aparecem com 0. A planilha de produtos vai mostrar em que nível cada produto está ligado.

## Regra de envio
1. Cada setor, grupo, subgrupo e categoria vira uma categoria no Bling
   (`POST /categorias/produtos`): `descricao` = nome do Superus, do jeito que está.
2. `categoriaPai` = a categoria do nível de cima já criada no Bling (setor não tem pai).
3. Ordem: setores → grupos → subgrupos → categorias. Pai sempre antes do filho.
4. Não duplicar: tabela local "nível + código do Superus → id no Bling". Antes de criar, o app
   lista as categorias do Bling e procura uma com o mesmo nome e o mesmo pai. Se achar, usa essa.
   A chave inclui o nível porque o mesmo número pode existir em níveis diferentes.
5. O produto vai para a categoria mais funda que ele tiver no Superus.
6. Tempo: 500 criações a 350 ms ≈ 3 minutos.

## A confirmar
- No envio de teste (Etapa 4): o Bling aceitar os 4 níveis. Testar com um ramo completo
  (ex.: setor → grupo → subgrupo → categoria).
- Se o Superus exporta essa consulta em CSV. Se só sair XLSX, o app usa uma biblioteca de
  leitura de XLSX (o brief permite uma).
