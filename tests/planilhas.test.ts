import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lerCsv } from '../src/planilhas/csv.ts'
import { lerPlanilha } from '../src/planilhas/ler.ts'
import { numeroLimpo } from '../src/planilhas/xlsx.ts'
import { xlsx } from './util/planilha.ts'

describe('XLSX', () => {
  it('lê texto compartilhado, texto embutido, números, acentos e células vazias no meio', () => {
    for (const comprimir of [true, false]) {
      const p = lerPlanilha(
        xlsx(
          [
            ['CODPRODUTO', 'DESCRICAO', 'CSTICMS', 'CUSTO', 'CEST'],
            [1, 'GAMELA & CIA <MDF>', '060', 3.79, null],
            [2, { inline: 'AÇÃO PÁSCOA' }, '000', 1.6500000000000001, '0100100']
          ],
          comprimir
        )
      )
      assert.deepEqual(p.colunas, ['CODPRODUTO', 'DESCRICAO', 'CSTICMS', 'CUSTO', 'CEST'])
      assert.deepEqual(p.linhas, [
        { CODPRODUTO: '1', DESCRICAO: 'GAMELA & CIA <MDF>', CSTICMS: '060', CUSTO: '3.79', CEST: '' },
        { CODPRODUTO: '2', DESCRICAO: 'AÇÃO PÁSCOA', CSTICMS: '000', CUSTO: '1.65', CEST: '0100100' }
      ])
      assert.deepEqual(p.numeros, [2, 3])
    }
  })

  it('pula linhas vazias e mantém o número da linha original', () => {
    const p = lerPlanilha(xlsx([[], ['A', 'B'], ['1', '2'], [], ['3', '4']]))
    assert.deepEqual(p.colunas, ['A', 'B'])
    assert.equal(p.linhas.length, 2)
    assert.deepEqual(p.numeros, [3, 5])
  })

  it('número sem notação científica nem resto de ponto flutuante', () => {
    assert.equal(numeroLimpo('7.899605778284E12'), '7899605778284')
    assert.equal(numeroLimpo('1.6500000000000001'), '1.65')
    assert.equal(numeroLimpo('-6'), '-6')
    assert.equal(numeroLimpo('0.1'), '0.1')
  })

  it('recusa arquivo que não é XLSX nem texto', () => {
    assert.throws(() => lerPlanilha(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0])), /XLSX/)
  })
})

describe('CSV', () => {
  it('UTF-8 com BOM e separador ponto e vírgula', () => {
    const p = lerPlanilha(Buffer.from('\ufeffCODIGO;NOME\r\n1;SÃO PAULO\r\n', 'utf8'))
    assert.deepEqual(p.linhas, [{ CODIGO: '1', NOME: 'SÃO PAULO' }])
  })

  it('ANSI (Windows-1252), aspas e vírgula dentro do campo', () => {
    const texto = 'CODIGO,NOME,VALOR\n7,"AÇO, ""INOX""","1.234,56"\n'
    const ansi = Buffer.from(texto, 'latin1')
    assert.deepEqual(lerCsv(ansi), [
      ['CODIGO', 'NOME', 'VALOR'],
      ['7', 'AÇO, "INOX"', '1.234,56']
    ])
  })

  it('separador tab', () => {
    assert.deepEqual(lerCsv(Buffer.from('A\tB\n1\t2')), [
      ['A', 'B'],
      ['1', '2']
    ])
  })
})
