import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  minigameScore, timeBonus, totalScore, compareRuns, rankRuns, isRepeat, stats,
  DIFFICULTY_POINTS, DIFFICULTY_SECONDS, ROUND_SHAPE, ROUND_SECONDS,
  BASE_MAX, SCORE_MAX, TIME_BONUS_CAP,
  accuracyRatio, precisionRatio,
  type Run, type MinigameResult,
} from './scoring.ts'

const run = (o: Partial<Run> = {}): Run => ({
  name: 'Fulano', mode: 'solo', score: 50, secondsLeft: 10, at: 1000, ranked: true, ...o,
})

/** Uma rodada perfeita e instantanea, seguindo a curva de criticidade. */
const rodadaPerfeita = (): MinigameResult[] =>
  ROUND_SHAPE.map((difficulty, i) => ({
    id: (['scanner', 'fluxo', 'timeline', 'firewall', 'triagem'] as const)[i],
    ratio: 1,
    difficulty,
    secondsLeft: DIFFICULTY_SECONDS[difficulty],
  }))

test('a curva de criticidade soma a base declarada', () => {
  const sum = ROUND_SHAPE.reduce((a, d) => a + DIFFICULTY_POINTS[d], 0)
  assert.equal(sum, BASE_MAX)
})

test('o tempo da rodada permite atingir o teto do bonus', () => {
  // Se esta relacao quebrar, a promessa de "maximo 100 pontos" morre em
  // silencio: ninguem consegue mais fechar 100, e ninguem percebe.
  assert.equal(timeBonus(ROUND_SECONDS), TIME_BONUS_CAP)
  assert.equal(BASE_MAX + TIME_BONUS_CAP, SCORE_MAX)
})

test('a criticidade e o que define o valor da etapa', () => {
  // O mesmo mini-game vale mais quando cai como incidente critico.
  assert.ok(DIFFICULTY_POINTS.critico > DIFFICULTY_POINTS.dificil)
  assert.ok(DIFFICULTY_POINTS.dificil > DIFFICULTY_POINTS.medio)
  assert.ok(DIFFICULTY_POINTS.medio > DIFFICULTY_POINTS.facil)
  assert.equal(minigameScore('critico', 1), DIFFICULTY_POINTS.critico)
  assert.equal(minigameScore('facil', 1), DIFFICULTY_POINTS.facil)
  assert.ok(minigameScore('critico', 0.5) > minigameScore('facil', 1),
    'meio acerto num incidente critico vale mais que acerto cheio num trivial')
})

test('minigameScore e proporcional e fica preso entre 0 e o maximo', () => {
  const max = DIFFICULTY_POINTS.dificil
  assert.equal(minigameScore('dificil', 1), max)
  assert.equal(minigameScore('dificil', 0.5), Math.round(max * 0.5))
  assert.equal(minigameScore('dificil', 0), 0)
  assert.equal(minigameScore('dificil', -3), 0, 'ratio negativo nao vira ponto negativo')
  assert.equal(minigameScore('dificil', 9), max, 'ratio acima de 1 nao estoura o teto')
})

test('timeBonus arredonda para baixo, respeita o teto e ignora lixo', () => {
  assert.equal(timeBonus(0), 0)
  assert.equal(timeBonus(-30), 0, 'tempo negativo nao bonifica')
  assert.equal(timeBonus(9999), TIME_BONUS_CAP)
  assert.equal(timeBonus(NaN), 0)
  assert.ok(timeBonus(40) > timeBonus(20), 'sobrar mais tempo bonifica mais')
})

test('partida perfeita e instantanea da exatamente 100', () => {
  assert.equal(totalScore(rodadaPerfeita()), SCORE_MAX)
})

test('totalScore nunca passa de 100 nem fica negativo', () => {
  const absurd = rodadaPerfeita().map(r => ({ ...r, ratio: 5, secondsLeft: 99999 }))
  assert.equal(totalScore(absurd), SCORE_MAX, 'nem valores absurdos furam o teto')
  assert.ok(totalScore([rodadaPerfeita()[0]]) < SCORE_MAX,
    'uma etapa so nunca chega a 100')
  assert.equal(totalScore([]), 0)
  assert.equal(totalScore([{ id: 'scanner', ratio: 0, difficulty: 'facil', secondsLeft: -50 }]), 0)
})

test('desempate: pontos, depois tempo restante, depois quem chegou primeiro', () => {
  const alto = run({ score: 80 }), baixo = run({ score: 70 })
  assert.ok(compareRuns(alto, baixo) < 0, 'mais pontos vem antes')

  const rapido = run({ score: 80, secondsLeft: 30 }), lento = run({ score: 80, secondsLeft: 5 })
  assert.ok(compareRuns(rapido, lento) < 0, 'empatado em pontos, mais tempo sobrando vem antes')

  const cedo = run({ score: 80, secondsLeft: 5, at: 100 })
  const tarde = run({ score: 80, secondsLeft: 5, at: 900 })
  assert.ok(compareRuns(cedo, tarde) < 0, 'empate total: quem marcou primeiro vem antes')
})

test('so a primeira partida de cada nome entra no ranking', () => {
  const runs = [
    run({ name: 'Ana', score: 40, at: 1 }),
    run({ name: 'Ana', score: 95, at: 2 }),  // treino: nao pode roubar o topo
    run({ name: 'Bruno', score: 60, at: 3 }),
  ]
  const rank = rankRuns(runs)
  assert.equal(rank.length, 2)
  assert.equal(rank[0].name, 'Bruno', 'o 95 de treino da Ana nao pode valer')
  assert.equal(rank[1].score, 40)
})

test('nome repetido ignora espacos e caixa', () => {
  const runs = [run({ name: 'ana', at: 1 }), run({ name: '  ANA  ', score: 99, at: 2 })]
  assert.equal(rankRuns(runs).length, 1)
  assert.ok(isRepeat(runs, 'Ana', 'solo'))
  assert.ok(!isRepeat(runs, 'Carla', 'solo'))
})

test('rankings individual e de equipe nao se misturam', () => {
  const runs = [
    run({ name: 'Ana', mode: 'solo', at: 1 }),
    run({ name: 'Ana', mode: 'equipe', at: 2 }),
  ]
  assert.equal(rankRuns(runs, ['solo', 'duelo']).length, 1)
  assert.equal(rankRuns(runs, ['revezamento', 'equipe']).length, 1)
  assert.ok(!isRepeat([runs[0]], 'Ana', 'equipe'), 'jogar solo nao queima a vez no ranking de equipes')
})

test('apagar a primeira partida promove a seguinte, em vez de sumir com o nome', () => {
  // O operador pode excluir uma partida pelo painel. Se `ranked` fosse
  // congelado na gravacao, o nome sumiria do ranking para sempre.
  const todas = [run({ name: 'Ana', score: 40, at: 1 }), run({ name: 'Ana', score: 95, at: 2 })]
  const apos = todas.filter(r => r.at !== 1)
  assert.equal(rankRuns(apos)[0].score, 95)
})

test('stats entrega os numeros que o juri pede', () => {
  const runs = [
    run({ name: 'Ana', score: 40, at: new Date('2026-09-12T10:15:00').getTime() }),
    run({ name: 'Bruno', score: 80, at: new Date('2026-09-12T10:40:00').getTime() }),
    run({ name: 'Ana', score: 60, at: new Date('2026-09-12T14:00:00').getTime() }),
  ]
  const s = stats(runs)
  assert.equal(s.played, 3)
  assert.equal(s.teams, 2)
  assert.equal(s.average, 60)
  assert.equal(s.best, 80)
  assert.equal(s.peakHour?.[0], 10)
  assert.equal(s.peakHour?.[1], 2)
  assert.deepEqual(stats([]).peakHour, null)
})

test('Firewall: morrer cedo com 100% de acerto nao da nota cheia', () => {
  assert.equal(accuracyRatio(12, 12), 1)
  assert.equal(accuracyRatio(6, 12), 0.5)
  assert.equal(accuracyRatio(3, 12), 0.25, '3 acertos antes de morrer valem 3 de 12, nao 3 de 3')
  assert.equal(accuracyRatio(5, 0), 0, 'rodada sem senhas nao pontua')
})

test('Linha do tempo: nota cai em linha reta conforme erra o instante', () => {
  const p = (err: number) => precisionRatio(23 + err, 23, 1, 8)
  assert.equal(p(0), 1, 'no ponto exato')
  assert.equal(p(1), 1, 'dentro da margem cheia')
  assert.equal(p(-1), 1, 'errar para tras vale igual')
  assert.equal(p(8), 0, 'no limite de zero')
  assert.equal(p(30), 0, 'muito longe continua zero, nunca negativo')
  assert.ok(p(2) > p(4) && p(4) > p(6), 'decai conforme se afasta')
  assert.equal(precisionRatio(NaN, 23, 1, 8), 0)
})
