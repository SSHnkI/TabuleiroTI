import { test } from 'node:test'
import assert from 'node:assert/strict'
import { drawRound, shuffle } from './challenges.ts'
import { ROUND_SHAPE, DIFFICULTY_POINTS, BASE_MAX, SCORE_MAX, TIME_BONUS_CAP } from './scoring.ts'

/** Gerador previsivel, para o teste nao depender de sorte. */
function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
}

test('a rodada segue a curva de criticidade, sempre', () => {
  for (let seed = 1; seed < 40; seed++) {
    const round = drawRound(seeded(seed))
    assert.equal(round.length, ROUND_SHAPE.length, 'rodada curta quebraria o maximo de 100')
    assert.deepEqual(round.map(c => c.difficulty), ROUND_SHAPE)
  }
})

test('toda rodada vale exatamente o mesmo maximo', () => {
  // Se o sorteio mudasse o teto, o ranking mediria sorte de sorteio em vez
  // de habilidade, e havendo premio isso e injusto.
  for (let seed = 1; seed < 40; seed++) {
    const total = drawRound(seeded(seed)).reduce((s, c) => s + DIFFICULTY_POINTS[c.difficulty], 0)
    assert.equal(total, BASE_MAX)
  }
  assert.equal(BASE_MAX + TIME_BONUS_CAP, SCORE_MAX)
})

test('nao repete o mesmo tipo de desafio na mesma rodada', () => {
  for (let seed = 1; seed < 40; seed++) {
    const ids = drawRound(seeded(seed)).map(c => c.id)
    assert.equal(new Set(ids).size, ids.length, 'repetiu: ' + ids.join(','))
  }
})

test('partidas diferentes trazem desafios diferentes', () => {
  // O decimo jogador do dia nao pode ter vantagem sobre o primeiro por ter
  // assistido a fila inteira jogar.
  const combos = new Set<string>()
  for (let seed = 1; seed < 40; seed++) combos.add(drawRound(seeded(seed)).map(c => c.label).join('|'))
  assert.ok(combos.size >= 8, 'variedade baixa demais: ' + combos.size + ' combinações em 39 sorteios')
})

test('a triagem sempre tem as tres prioridades', () => {
  for (let seed = 1; seed < 40; seed++) {
    const t = drawRound(seeded(seed)).find(c => c.id === 'triagem')
    if (!t || t.id !== 'triagem') continue
    const ps = new Set(t.tickets.map(x => x.priority))
    assert.equal(ps.size, 3, 'rodada de triagem sem as 3 prioridades nao ensina nada')
  }
})

test('shuffle devolve os mesmos itens, sem perder nem duplicar', () => {
  const orig = [1, 2, 3, 4, 5, 6]
  const out = shuffle(orig, seeded(7))
  assert.equal(out.length, orig.length)
  assert.deepEqual([...out].sort((a, b) => a - b), orig)
  assert.deepEqual(orig, [1, 2, 3, 4, 5, 6], 'nao pode mexer no array de origem')
})
