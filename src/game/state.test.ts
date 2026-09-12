import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reducer, initialState, type GameState } from './state.ts'
import { DIFFICULTY_SECONDS, ERROR_TIME_PENALTY, ROUND_SHAPE, SCORE_MAX } from './scoring.ts'
import { drawRound } from './challenges.ts'

const ROUND = drawRound()

const playing = (over: Partial<GameState> = {}): GameState => ({
  ...initialState,
  screen: 'playing',
  players: [{ name: 'A', color: '#1' }, { name: 'B', color: '#2' }, { name: 'C', color: '#3' }],
  round: ROUND,
  secondsLeft: DIFFICULTY_SECONDS[ROUND[0].difficulty],
  ...over,
})

test('o duelo tem prova propria e nao carrega a rodada sorteada', () => {
  const s = reducer(initialState, { type: 'pickMode', mode: 'duelo', count: 2 })
  assert.deepEqual(s.round, [])
  assert.equal(s.screen, 'name')
})

test('escolher o modo ja sorteia a rodada', () => {
  const s = reducer(initialState, { type: 'pickMode', mode: 'solo', count: 1 })
  assert.equal(s.round.length, ROUND_SHAPE.length)
  assert.deepEqual(s.round.map(c => c.difficulty), ROUND_SHAPE)
})

test('comecar sorteia de novo, para nao dar para espiar e rejogar igual', () => {
  // Quem entra, olha as regras e volta, nao pode voltar para a MESMA rodada
  // que acabou de ver.
  const base = reducer(initialState, { type: 'pickMode', mode: 'solo', count: 1 })
  const combos = new Set<string>()
  for (let i = 0; i < 25; i++) {
    combos.add(reducer(base, { type: 'begin' }).round.map(c => c.label).join('|'))
  }
  assert.ok(combos.size > 1, 'a rodada ficou congelada entre partidas')
})

test('o relogio nunca fica negativo, nem pelo tique nem pela penalidade', () => {
  const s = reducer(playing({ secondsLeft: 2 }), { type: 'penalty' })
  assert.equal(s.secondsLeft, 0, ERROR_TIME_PENALTY + 's de penalidade em 2s sobrando para em zero')
  assert.equal(reducer(playing({ secondsLeft: 0 }), { type: 'tick' }).secondsLeft, 0)
})

test('errar custa tempo e zera o combo, mas nao tira ponto', () => {
  const antes = playing({ secondsLeft: 20, combo: 3, score: 40 })
  const depois = reducer(antes, { type: 'penalty' })
  assert.equal(depois.secondsLeft, 20 - ERROR_TIME_PENALTY)
  assert.equal(depois.combo, 0)
  assert.equal(depois.score, 40, 'pontos ja conquistados nao voltam atras')
})

test('o relogio so corre durante a partida e fora de pausa', () => {
  assert.equal(reducer(playing({ secondsLeft: 9, paused: true }), { type: 'tick' }).secondsLeft, 9)
  assert.equal(reducer(playing({ secondsLeft: 9, screen: 'result' }), { type: 'tick' }).secondsLeft, 9)
})

test('cada etapa recarrega o relogio com a duracao da proxima', () => {
  const s = reducer(playing(), { type: 'finishMinigame', ratio: 1 })
  assert.equal(s.index, 1)
  assert.equal(s.secondsLeft, DIFFICULTY_SECONDS[ROUND[1].difficulty])
})

test('a etapa guarda a criticidade em que caiu, nao so o tipo', () => {
  // Sem isto o resultado nao consegue dizer quanto cada etapa valia.
  const s = reducer(playing(), { type: 'finishMinigame', ratio: 1 })
  assert.equal(s.results[0].difficulty, ROUND[0].difficulty)
  assert.equal(s.results[0].label, ROUND[0].label)
})

test('a ultima etapa leva ao resultado, nao a um quinto desafio', () => {
  let s = playing()
  for (let i = 0; i < ROUND.length; i++) s = reducer(s, { type: 'finishMinigame', ratio: 1 })
  assert.equal(s.screen, 'result')
  assert.equal(s.results.length, ROUND.length)
  assert.equal(s.score, SCORE_MAX, 'tudo certo e sem gastar tempo da o maximo')
})

test('combo so conta acerto cheio, e quebra no primeiro tropeco', () => {
  let s = reducer(playing(), { type: 'finishMinigame', ratio: 1 })
  assert.equal(s.combo, 1)
  s = reducer(s, { type: 'finishMinigame', ratio: 1 })
  assert.equal(s.combo, 2)
  s = reducer(s, { type: 'finishMinigame', ratio: 0.7 })
  assert.equal(s.combo, 0, 'acerto parcial nao mantem combo')
})

test('so o revezamento gira a vez; nos outros modos ela fica parada', () => {
  const rev = reducer(playing({ mode: 'revezamento' }), { type: 'finishMinigame', ratio: 1 })
  assert.equal(rev.turn, 1)
  const eq = reducer(playing({ mode: 'equipe' }), { type: 'finishMinigame', ratio: 1 })
  assert.equal(eq.turn, 0)
})

test('a vez da a volta quando ha menos jogadores que desafios', () => {
  // Trio em rodada de quatro: alguem joga duas vezes, e nao pode estourar
  // o indice do array de jogadores.
  let s = playing({ mode: 'revezamento' })
  const vistos: number[] = []
  for (let i = 0; i < ROUND.length; i++) {
    s = reducer(s, { type: 'finishMinigame', ratio: 1 })
    vistos.push(s.turn)
  }
  assert.ok(vistos.every(t => t >= 0 && t < 3), 'a vez nunca aponta para fora da lista: ' + vistos)
})

test('abortar devolve o quiosque limpo para a atracao', () => {
  const s = reducer(playing({ score: 80, combo: 4 }), { type: 'abort' })
  assert.equal(s.screen, 'attract')
  assert.equal(s.score, 0)
  assert.equal(s.players.length, 0, 'o proximo jogador nao pode herdar o nome do anterior')
})
