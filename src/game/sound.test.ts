/**
 * A unica logica nao trivial do som: a escada de semitons do combo.
 *
 * O resto do arquivo e sintese, que so se verifica com o ouvido. Isto aqui
 * se verifica com numero, entao se verifica com teste.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { comboFreq, COMBO_BASE, COMBO_TETO } from './sound.ts'

test('o combo comeca na base', () => {
  assert.equal(comboFreq(0), COMBO_BASE)
})

test('cada degrau sobe exatamente um semitom', () => {
  const semitom = Math.pow(2, 1 / 12)
  for (let n = 0; n < COMBO_TETO; n++) {
    const razao = comboFreq(n + 1) / comboFreq(n)
    assert.ok(Math.abs(razao - semitom) < 1e-9, 'degrau ' + n + ' saiu de ' + razao)
  }
})

test('doze degraus fecham uma oitava', () => {
  assert.ok(Math.abs(comboFreq(COMBO_TETO) / COMBO_BASE - 2) < 1e-9)
})

test('acima do teto o tom para de subir, senao vira apito', () => {
  assert.equal(comboFreq(50), comboFreq(COMBO_TETO))
  assert.equal(comboFreq(999), comboFreq(COMBO_TETO))
})

test('combo negativo ou quebrado volta para a base', () => {
  assert.equal(comboFreq(-3), COMBO_BASE)
  assert.equal(comboFreq(0.9), COMBO_BASE)
})
