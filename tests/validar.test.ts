import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cnpjValido, cpfValido, dataIso, gtinValido, numero } from '../src/regras/validar.ts'
import { cnpj, gtin } from './util/planilha.ts'

describe('documentos e códigos', () => {
  it('CNPJ e CPF', () => {
    assert.ok(cnpjValido('11222333000181'))
    assert.ok(cnpjValido(cnpj('123456780001')))
    assert.ok(!cnpjValido('11222333000182'))
    assert.ok(!cnpjValido('11111111111111'))
    assert.ok(cpfValido('52998224725'))
    assert.ok(!cpfValido('52998224724'))
    assert.ok(!cpfValido('00000000000'))
  })

  it('GTIN de 8, 12, 13 e 14 dígitos', () => {
    assert.ok(gtinValido(gtin('789100010010')))
    assert.ok(gtinValido('96385074'))
    assert.ok(gtinValido('036000291452'))
    assert.ok(gtinValido('17894900011514'))
    assert.ok(!gtinValido('7891000100104'.slice(0, 12) + '9'))
    assert.ok(!gtinValido('123456'))
    assert.ok(!gtinValido('2'))
  })
})

describe('números e datas', () => {
  it('número do XLSX e do CSV brasileiro', () => {
    assert.equal(numero('3.79'), 3.79)
    assert.equal(numero('1.234,56'), 1234.56)
    assert.equal(numero('19,9'), 19.9)
    assert.equal(numero('R$ 10,00'), 10)
    assert.equal(numero(''), 0)
    assert.equal(numero('-6'), -6)
    assert.ok(Number.isNaN(numero('abc')))
  })

  it('datas em vários formatos e datas que não existem', () => {
    assert.equal(dataIso('05/11/2026'), '2026-11-05')
    assert.equal(dataIso('5/1/26'), '2026-01-05')
    assert.equal(dataIso('2026-11-05 00:00:00'), '2026-11-05')
    assert.equal(dataIso('46331'), '2026-11-05')
    assert.equal(dataIso('31/02/2026'), null)
    assert.equal(dataIso('amanhã'), null)
    assert.equal(dataIso(''), null)
  })
})
