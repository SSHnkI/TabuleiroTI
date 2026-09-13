/**
 * O sorteio da rodada.
 *
 * Existe porque o Victor jogou tres partidas seguidas e as tres saíram
 * iguais. O culpado era um atalho de URL que grudava na sessao, ja removido,
 * mas a licao fica: variedade de rodada e promessa do jogo, e promessa sem
 * teste e so intencao.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { drawRound } from './challenges.ts'
import { ROUND_SHAPE } from './scoring.ts'

const assinatura = (r: ReturnType<typeof drawRound>) =>
  r.map(c => c.id + ':' + c.label).join('|')

test('a rodada tem sempre a mesma forma de criticidade', () => {
  for (let i = 0; i < 50; i++) {
    const r = drawRound()
    assert.deepEqual(r.map(c => c.difficulty), ROUND_SHAPE)
  }
})

test('cem sorteios nao podem cair em meia duzia de rodadas', () => {
  const vistas = new Set<string>()
  for (let i = 0; i < 100; i++) vistas.add(assinatura(drawRound()))
  // Com onze tipos disputando as etapas do meio, repetir muito significa
  // que alguma coisa prendeu o sorteio.
  assert.ok(vistas.size >= 80, 'so ' + vistas.size + ' rodadas distintas em 100')
})

test('tres partidas seguidas iguais e defeito, nao azar', () => {
  // O caso exato relatado. A chance de acontecer por acaso e desprezivel:
  // se acontecer, alguma coisa esta forcando a rodada.
  let iguais = 0
  for (let i = 0; i < 200; i++) {
    const a = assinatura(drawRound())
    const b = assinatura(drawRound())
    const c = assinatura(drawRound())
    if (a === b && b === c) iguais++
  }
  assert.equal(iguais, 0, iguais + ' trincas identicas em 200 tentativas')
})

test('nenhuma etapa fica presa num tipo so', () => {
  const porEtapa = ROUND_SHAPE.map(() => new Set<string>())
  for (let i = 0; i < 200; i++) {
    drawRound().forEach((c, k) => porEtapa[k].add(c.id))
  }
  porEtapa.forEach((tipos, k) => {
    assert.ok(
      tipos.size >= 3,
      'etapa ' + (k + 1) + ' (' + ROUND_SHAPE[k] + ') so sorteia ' + tipos.size + ' tipo(s)',
    )
  })
})

test('a rodada nao repete tipo dentro da mesma partida', () => {
  for (let i = 0; i < 100; i++) {
    const ids = drawRound().map(c => c.id)
    assert.equal(new Set(ids).size, ids.length, 'tipo repetido: ' + ids.join(', '))
  }
})
