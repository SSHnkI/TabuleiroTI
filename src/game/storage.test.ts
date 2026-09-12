import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCSV } from './storage.ts'
import type { Run } from './scoring.ts'

const run = (o: Partial<Run> = {}): Run => ({
  name: 'Ana', mode: 'solo', score: 70, secondsLeft: 12,
  at: new Date('2026-09-12T10:15:00').getTime(), ranked: true, ...o,
})

test('o CSV abre certo no Excel em portugues', () => {
  const csv = toCSV([run()])
  assert.ok(csv.startsWith('\uFEFF'), 'sem BOM o Excel em pt-BR mostra os acentos quebrados')
  assert.ok(csv.includes('\r\n'), 'Excel no Windows espera CRLF')
})

test('nome com aspas nao quebra a planilha', () => {
  // Um jogador digitando aspas no teclado de toque nao pode destruir o
  // arquivo que vale como registro do dia.
  const csv = toCSV([run({ name: 'A "FERA" da TI' })])
  assert.ok(csv.includes('"A ""FERA"" da TI"'))
  const linhas = csv.trim().split('\r\n')
  assert.equal(linhas.length, 2, 'continua sendo uma linha de dados, nao duas')
})

test('nome com virgula continua numa coluna so', () => {
  const csv = toCSV([run({ name: 'Ana, Bruno e Caio' })])
  assert.ok(csv.includes('"Ana, Bruno e Caio"'))
})

test('a planilha sai em ordem de chegada, nao de pontuacao', () => {
  // O CSV e o registro do dia: tem que contar a historia na ordem em que
  // aconteceu. Ranking ordenado por ponto ja existe na tela.
  const csv = toCSV([
    run({ name: 'Tarde', at: 3000 }),
    run({ name: 'Cedo', at: 1000 }),
  ])
  assert.ok(csv.indexOf('Cedo') < csv.indexOf('Tarde'))
})

test('partida de treino sai marcada como treino', () => {
  assert.ok(toCSV([run({ ranked: false })]).includes('treino'))
  assert.ok(toCSV([run({ ranked: true })]).includes('sim'))
})

test('dia sem ninguem gera planilha so com cabecalho', () => {
  const linhas = toCSV([]).trim().split('\r\n')
  assert.equal(linhas.length, 1)
  assert.ok(linhas[0].includes('Pontos'))
})

import { duelBoard, type Duel } from './storage.ts'

const duel = (winner: string, at: number): Duel => ({ winner, loser: 'X', at })

test('o placar de duelos conta vitorias, nao participacoes', () => {
  const board = duelBoard([duel('Ana', 1), duel('Bruno', 2), duel('Ana', 3)])
  assert.deepEqual(board, [{ name: 'Ana', wins: 2 }, { name: 'Bruno', wins: 1 }])
})

test('empate de vitorias desempata por quem venceu primeiro', () => {
  const board = duelBoard([duel('Bruno', 5), duel('Ana', 1)])
  assert.equal(board[0].name, 'Ana', 'ambos com 1, quem venceu antes vem na frente')
})

test('dia sem duelo devolve placar vazio, nao quebra', () => {
  assert.deepEqual(duelBoard([]), [])
})
