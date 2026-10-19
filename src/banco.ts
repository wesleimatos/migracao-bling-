import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Mapa, Tipo } from './regras/tipos.ts'

export interface Arquivo {
  tipo: Tipo
  nome: string
  tamanho: number
  linhas: number
  recebidoEm: string
}

/** Banco e planilhas do app, todos dentro da pasta de dados (fora do Git). */
export class Banco {
  readonly db: DatabaseSync
  readonly pasta: string
  private readonly pastaPlanilhas: string

  constructor(pasta: string) {
    this.pasta = pasta
    mkdirSync(pasta, { recursive: true, mode: 0o700 })
    this.pastaPlanilhas = join(pasta, 'planilhas')
    mkdirSync(this.pastaPlanilhas, { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(join(pasta, 'migracao.db'))
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS arquivos (
        tipo TEXT PRIMARY KEY, nome TEXT NOT NULL, tamanho INTEGER NOT NULL,
        linhas INTEGER NOT NULL, recebido_em TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mapas (tipo TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
      -- Tabela local "registro do Superus → id no Bling", por modo (teste ou completo).
      -- status: enviando (POST em andamento), enviado (criado pelo app), pulado (já existia), erro.
      CREATE TABLE IF NOT EXISTS itens (
        modo TEXT NOT NULL, tipo TEXT NOT NULL, chave TEXT NOT NULL, status TEXT NOT NULL,
        bling_id INTEGER, mensagem TEXT, tentativas INTEGER NOT NULL DEFAULT 0, atualizado_em TEXT NOT NULL,
        PRIMARY KEY (modo, tipo, chave)
      );
      CREATE TABLE IF NOT EXISTS usuario (id INTEGER PRIMARY KEY CHECK (id = 1), senha TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, expira_em INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS tentativas (ip TEXT NOT NULL, quando INTEGER NOT NULL);
    `)
  }

  arquivo(tipo: Tipo): Arquivo | null {
    const r = this.db.prepare('SELECT nome, tamanho, linhas, recebido_em FROM arquivos WHERE tipo = ?').get(tipo) as
      | { nome: string; tamanho: number; linhas: number; recebido_em: string }
      | undefined
    return r ? { tipo, nome: r.nome, tamanho: r.tamanho, linhas: r.linhas, recebidoEm: r.recebido_em } : null
  }

  conteudo(tipo: Tipo): Buffer {
    return readFileSync(join(this.pastaPlanilhas, tipo))
  }

  guardarArquivo(tipo: Tipo, nome: string, conteudo: Buffer, linhas: number): void {
    writeFileSync(join(this.pastaPlanilhas, tipo), conteudo, { mode: 0o600 })
    this.db
      .prepare(
        `INSERT INTO arquivos (tipo, nome, tamanho, linhas, recebido_em) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (tipo) DO UPDATE SET nome = excluded.nome, tamanho = excluded.tamanho,
           linhas = excluded.linhas, recebido_em = excluded.recebido_em`
      )
      .run(tipo, nome, conteudo.length, linhas, new Date().toISOString())
  }

  apagarArquivo(tipo: Tipo): void {
    rmSync(join(this.pastaPlanilhas, tipo), { force: true })
    this.db.prepare('DELETE FROM arquivos WHERE tipo = ?').run(tipo)
  }

  /** Ligação de colunas salva pelo Weslei (pode estar incompleta; o resto vem do padrão). */
  mapaSalvo(tipo: Tipo): Mapa {
    const r = this.db.prepare('SELECT json FROM mapas WHERE tipo = ?').get(tipo) as { json: string } | undefined
    return r ? (JSON.parse(r.json) as Mapa) : {}
  }

  guardarMapa(tipo: Tipo, mapa: Mapa): void {
    this.db
      .prepare('INSERT INTO mapas (tipo, json) VALUES (?, ?) ON CONFLICT (tipo) DO UPDATE SET json = excluded.json')
      .run(tipo, JSON.stringify(mapa))
  }

  lerConfig(chave: string): string | null {
    const r = this.db.prepare('SELECT valor FROM config WHERE chave = ?').get(chave) as { valor: string } | undefined
    return r?.valor ?? null
  }

  gravarConfig(chave: string, valor: string | null): void {
    if (valor === null) this.db.prepare('DELETE FROM config WHERE chave = ?').run(chave)
    else this.db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor').run(chave, valor)
  }

  fechar(): void {
    this.db.close()
  }
}
