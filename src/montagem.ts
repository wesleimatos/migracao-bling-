import type { Banco } from './banco.ts'
import type { Lote } from './bling/envio.ts'
import type { Planilha } from './planilhas/ler.ts'
import { CAMPOS, mapaPadrao } from './regras/campos.ts'
import type { Categoria } from './regras/categorias.ts'
import type { ConferenciaTipo } from './regras/conferencia.ts'
import type { Conta } from './regras/contas.ts'
import type { Fornecedor } from './regras/fornecedores.ts'
import type { Produto } from './regras/produtos.ts'
import type { Mapa, Tipo } from './regras/tipos.ts'
import type { Vinculo } from './regras/vinculos.ts'

/** Ligação que vale: a salva (se a coluna ainda existe na planilha) e, no resto, a padrão. */
export function mapaValido(banco: Banco, tipo: Tipo, p: Planilha | null): Mapa {
  const colunas = p?.colunas ?? []
  const salvo = banco.mapaSalvo(tipo)
  const padrao = mapaPadrao(tipo, colunas)
  return Object.fromEntries(
    CAMPOS[tipo].map(({ chave }) => {
      const s = salvo[chave]
      return [chave, s !== undefined && (s === '' || colunas.includes(s)) ? s : padrao[chave]]
    })
  )
}

/** O lote para o Bling a partir da conferência (null sem categorias, fornecedores ou produtos). */
export function loteDaConferencia(c: Record<Tipo, ConferenciaTipo>): Lote | null {
  if (!c.categorias.resultado || !c.fornecedores.resultado || !c.produtos.resultado) return null
  return {
    categorias: c.categorias.resultado.registros as Categoria[],
    fornecedores: c.fornecedores.resultado.registros as Fornecedor[],
    produtos: c.produtos.resultado.registros as Produto[],
    vinculos: (c.vinculos.resultado?.registros ?? []) as Vinculo[],
    contas: (c.contas.resultado?.registros ?? []) as Conta[]
  }
}
