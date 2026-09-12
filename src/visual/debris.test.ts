/**
 * A unica conta dos destrocos com jeito de errar: o quique.
 * O resto e desenho, e desenho se confere com o olho.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { quicar, QUIQUE_MINIMO } from './debris.ts'

test('acima do chao nada acontece', () => {
  const r = quicar(2, -3, 0, 0.5)
  assert.equal(r.bateu, false)
  assert.equal(r.y, 2)
  assert.equal(r.vy, -3)
})

test('abaixo do chao volta para o chao e inverte a velocidade', () => {
  const r = quicar(-0.4, -4, 0, 0.5)
  assert.equal(r.bateu, true)
  assert.equal(r.y, 0)
  assert.equal(r.vy, 2)
})

test('o chao nao precisa ser zero', () => {
  const r = quicar(1.2, -4, 1.5, 0.5)
  assert.equal(r.bateu, true)
  assert.equal(r.y, 1.5)
})

test('quique fraco zera, senao o cubo treme no chao ate a vida acabar', () => {
  const r = quicar(-0.01, -0.4, 0, 0.5)
  assert.equal(r.bateu, true)
  assert.equal(r.vy, 0)
})

test('o corte e no minimo declarado, nao num numero solto', () => {
  const acima = quicar(-0.01, -(QUIQUE_MINIMO + 0.2) / 0.5, 0, 0.5)
  assert.ok(acima.vy > 0, 'acima do corte tinha que continuar quicando')
  const abaixo = quicar(-0.01, -(QUIQUE_MINIMO - 0.2) / 0.5, 0, 0.5)
  assert.equal(abaixo.vy, 0)
})

test('a energia sempre cai: quique nao inventa altura', () => {
  let vy = -6
  for (let i = 0; i < 8; i++) {
    const r = quicar(-0.001, vy, 0, 0.6)
    assert.ok(Math.abs(r.vy) <= Math.abs(vy), 'quique ' + i + ' ganhou energia')
    if (r.vy === 0) break
    vy = -Math.abs(r.vy)
  }
})
