import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Banco } from './banco.ts'
import { criarApp } from './servidor.ts'

const pasta = process.env.DADOS ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dados')
const porta = Number(process.env.PORT ?? 8100)
const host = process.env.HOST ?? '127.0.0.1'

const banco = new Banco(pasta)
createServer(criarApp(banco, { confiarProxy: process.env.CONFIAR_PROXY === '1' })).listen(porta, host, () => {
  console.log(`Migração Superus → Bling em http://${host}:${porta} (dados em ${pasta})`)
})
