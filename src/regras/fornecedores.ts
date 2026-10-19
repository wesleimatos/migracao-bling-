import type { Planilha } from '../planilhas/ler.ts'
import { anotador, type Mapa, type Problema, type Resultado } from './tipos.ts'
import { cnpjValido, cpfValido, digitos, numero, TAMANHO_IE } from './validar.ts'

/** Um fornecedor como vai para o Bling (contato do tipo Fornecedor). */
export interface Fornecedor {
  /** CPF/CNPJ (só dígitos); "cod:<código>" quando não há documento. */
  chave: string
  /** Código do Superus que vai no campo código do Bling. */
  codigo: string
  /** Todos os códigos do Superus que viram este fornecedor (mais de um quando o documento se repete). */
  codigos: string[]
  linha: number
  nome: string
  fantasia: string
  tipo: 'J' | 'F'
  numeroDocumento: string
  ie: string
  /** 1 contribuinte, 2 isento; null = não informar. */
  indicadorIe: 1 | 2 | null
  email: string
  telefone: string
  celular: string
  endereco: { endereco: string; numero: string; complemento: string; bairro: string; cep: string; municipio: string; uf: string }
}

/** Onde achar o fornecedor do Bling a partir do código ou do documento do Superus. */
export interface IndiceFornecedores {
  porCodigo: Map<string, string>
  porDocumento: Map<string, string>
}

export function indiceFornecedores(lista: Fornecedor[]): IndiceFornecedores {
  const porCodigo = new Map<string, string>()
  const porDocumento = new Map<string, string>()
  for (const f of lista) {
    for (const c of f.codigos) porCodigo.set(c, f.chave)
    if (f.numeroDocumento) porDocumento.set(f.numeroDocumento, f.chave)
  }
  return { porCodigo, porDocumento }
}

/** Número do endereço: depois da última vírgula e antes do "-" ("RUA X, 199-GALPAO 1" → "199"). */
export function numeroEndereco(endereco: string): string {
  const i = endereco.lastIndexOf(',')
  const n = i < 0 ? '' : endereco.slice(i + 1).split('-')[0].trim()
  return n === '' || /^S\.?\/?N\.?$/i.test(n) ? 'S/N' : n
}

/**
 * Separa os números: o Bling aceita um só em telefone e um só em celular (confirmado no envio de
 * teste de 19/10/2026). Repetidos caem; celular é o 1º com 11 dígitos e 9 depois do DDD, telefone é o
 * 1º dos outros; se não houver celular, o 2º número vai no celular. O que sobrar vai para o aviso.
 */
export function separarTelefones(texto: string): { telefone: string; celular: string; sobras: string[]; incompletos: string[] } {
  const vistos = new Set<string>()
  const numeros: { n: string; d: string }[] = []
  for (const parte of texto.split('/')) {
    const n = parte.replace(/^[^\d(+]*/, '').trim()
    let d = digitos(n)
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
    if (d === '' || vistos.has(d)) continue
    vistos.add(d)
    numeros.push({ n, d })
  }
  const incompletos = numeros.filter(({ d }) => d.length < 8 || (d.length === 9 && d[0] !== '9')).map(({ n }) => n)
  const iCel = numeros.findIndex(({ d }) => d.length === 11 && d[2] === '9')
  const outros = numeros.filter((_, i) => i !== iCel).map(({ n }) => n)
  const telefone = outros.shift() ?? ''
  const celular = iCel >= 0 ? numeros[iCel].n : (outros.shift() ?? '')
  return { telefone, celular, sobras: outros, incompletos }
}

/** Fornecedores do Superus virando contatos do Bling. CPF/CNPJ repetido vira um só (decisão do Weslei). */
export function montarFornecedores(p: Planilha, mapa: Mapa): Resultado<Fornecedor> {
  const problemas: Problema[] = []
  const anota = anotador(problemas)
  const v = (l: Record<string, string>, campo: string) => (mapa[campo] ? (l[mapa[campo]] ?? '').trim() : '')
  const lidos: (Fornecedor & { produtos: number })[] = []
  const codigosVistos = new Set<string>()

  p.linhas.forEach((l, i) => {
    const linha = p.numeros[i]
    const codigo = v(l, 'codigo')
    const nome = v(l, 'razao') || v(l, 'fantasia')
    if (!codigo) return anota.erro('sem-codigo', linha, '', 'Fornecedor sem código.')
    if (codigosVistos.has(codigo)) return anota.erro('codigo-repetido', linha, codigo, `Código ${codigo} repetido na planilha.`)
    codigosVistos.add(codigo)
    if (!nome) return anota.erro('sem-nome', linha, codigo, 'Fornecedor sem razão social e sem nome.')

    const doc = digitos(v(l, 'cnpj')) || digitos(v(l, 'cpf'))
    if (doc && !(doc.length === 14 ? cnpjValido(doc) : cpfValido(doc))) {
      return anota.erro('documento-invalido', linha, codigo, `CPF/CNPJ inválido: ${doc}.`)
    }
    if (!doc) anota.aviso('sem-documento', linha, codigo, 'Sem CPF/CNPJ: vai sem documento.')

    const uf = v(l, 'uf').toUpperCase()
    const ieTexto = v(l, 'ie')
    let ie = ''
    let indicadorIe: 1 | 2 | null = null
    if (/^isent/i.test(ieTexto)) indicadorIe = 2
    else if (digitos(ieTexto)) {
      ie = digitos(ieTexto)
      indicadorIe = 1
      if (TAMANHO_IE[uf] && !TAMANHO_IE[uf].includes(ie.length)) {
        anota.aviso('ie-fora-do-padrao', linha, codigo, `IE com ${ie.length} dígitos, fora do padrão de ${uf}. Se o Bling recusar, vai sem IE.`)
      }
    }

    const tel = separarTelefones(v(l, 'telefones'))
    if (tel.incompletos.length) {
      anota.aviso('telefone-incompleto', linha, codigo, `Telefone que parece incompleto: ${tel.incompletos.join(', ')}.`)
    }
    if (tel.sobras.length) {
      anota.aviso('telefone-sobrando', linha, codigo, `Número que não coube no Bling (um telefone e um celular): ${tel.sobras.join(', ')}.`)
    }

    lidos.push({
      chave: doc || `cod:${codigo}`,
      codigo,
      codigos: [codigo],
      linha,
      nome,
      fantasia: v(l, 'fantasia'),
      tipo: doc.length === 11 || (!doc && v(l, 'tipoPessoa').toUpperCase() === 'F') ? 'F' : 'J',
      numeroDocumento: doc,
      ie,
      indicadorIe,
      email: v(l, 'email'),
      telefone: tel.telefone,
      celular: tel.celular,
      endereco: {
        endereco: v(l, 'logradouro'),
        numero: v(l, 'endereco') || v(l, 'logradouro') ? numeroEndereco(v(l, 'endereco')) : '',
        complemento: v(l, 'complemento'),
        bairro: v(l, 'bairro'),
        cep: v(l, 'cep'),
        municipio: v(l, 'cidade'),
        uf
      },
      produtos: numero(v(l, 'produtosAtivos')) || 0
    })
  })

  // Mesmo CPF/CNPJ: fica o cadastro com mais produtos ativos (empate: o menor código), com todos os
  // códigos; o que ele não tiver preenchido (IE, telefone, e-mail, endereço) vem dos outros.
  const grupos = new Map<string, (typeof lidos)[number][]>()
  for (const f of lidos) grupos.set(f.chave, [...(grupos.get(f.chave) ?? []), f])
  const registros: Fornecedor[] = []
  let juntados = 0
  for (const grupo of grupos.values()) {
    grupo.sort((a, b) => b.produtos - a.produtos || Number(a.codigo) - Number(b.codigo) || a.codigo.localeCompare(b.codigo))
    const { produtos: _, ...fica } = grupo[0]
    fica.codigos = grupo.map((f) => f.codigo)
    for (const outro of grupo.slice(1)) {
      for (const k of ['fantasia', 'email', 'telefone', 'celular'] as const) fica[k] ||= outro[k]
      if (!fica.indicadorIe && outro.indicadorIe) [fica.ie, fica.indicadorIe] = [outro.ie, outro.indicadorIe]
      if (!fica.endereco.endereco && outro.endereco.endereco) fica.endereco = outro.endereco
    }
    if (grupo.length > 1) {
      juntados += grupo.length - 1
      anota.aviso('documento-repetido', fica.linha, fica.codigo, `CPF/CNPJ ${fica.numeroDocumento} em ${grupo.length} cadastros (códigos ${fica.codigos.join(', ')}): vira um fornecedor só, com o código ${fica.codigo}.`)
    }
    registros.push(fica)
  }

  return {
    registros,
    problemas,
    totais: [
      { rotulo: 'Linhas na planilha', valor: p.linhas.length },
      { rotulo: 'Fornecedores a criar no Bling', valor: registros.length },
      { rotulo: 'Cadastros juntados por CPF/CNPJ repetido', valor: juntados },
      { rotulo: 'Com inscrição estadual', valor: registros.filter((f) => f.ie).length },
      { rotulo: 'Com telefone ou celular', valor: registros.filter((f) => f.telefone || f.celular).length }
    ]
  }
}
