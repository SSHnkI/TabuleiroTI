/**
 * MISSAO TI :: maquina de estados da partida.
 *
 * Um reducer so. A partida tem menos de dez campos: Zustand ou Redux aqui
 * seriam peso morto.
 */
import {
  DIFFICULTY_SECONDS, ERROR_TIME_PENALTY, totalScore,
  type GameMode, type MinigameResult,
} from './scoring.ts'
import { drawRound, type ChallengeSpec } from './challenges.ts'

export type Screen =
  | 'attract' | 'mode' | 'name' | 'briefing' | 'playing' | 'result' | 'ranking' | 'admin'

/** Cores de jogador. Proposital: nenhuma delas e verde nem vermelha, que
 *  neste jogo significam "confirmado" e "errou" e nao podem virar identidade. */
export const PLAYER_COLORS = ['#15C7FF', '#FF9F45', '#A88BFF', '#FF6FB5'] as const

export interface Player { name: string; color: string }

export interface GameState {
  screen: Screen
  mode: GameMode
  players: Player[]
  /** Indice do jogador da vez. So o revezamento faz isto girar. */
  turn: number
  /** Sorteada no inicio de cada partida: nunca duas rodadas iguais. */
  round: ChallengeSpec[]
  index: number
  results: MinigameResult[]
  /** Relogio do mini-game atual. */
  secondsLeft: number
  /** Acertos de primeira seguidos. Zera ao errar. */
  combo: number
  /** Partida repetida: pontua e comemora, mas nao entra no ranking. */
  training: boolean
  score: number
  startedAt: number
  paused: boolean
}

export const initialState: GameState = {
  screen: 'attract',
  mode: 'solo',
  players: [],
  turn: 0,
  round: [],
  index: 0,
  results: [],
  secondsLeft: 0,
  combo: 0,
  training: false,
  score: 0,
  startedAt: 0,
  paused: false,
}

export type Action =
  | { type: 'goto'; screen: Screen }
  | { type: 'pickMode'; mode: GameMode; count: number }
  | { type: 'setPlayers'; players: Player[]; training: boolean }
  | { type: 'begin' }
  | { type: 'tick' }
  /** Erro custa tempo, nao ponto, e nunca trava a tela. */
  | { type: 'penalty'; seconds?: number }
  | { type: 'finishMinigame'; ratio: number }
  | { type: 'pause'; on: boolean }
  | { type: 'abort' }
  | { type: 'reset' }

const modeFor = (count: number): GameMode =>
  count === 1 ? 'solo' : count === 2 ? 'duelo' : 'revezamento'

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'goto':
      return { ...s, screen: a.screen }

    case 'pickMode':
      // O duelo tem prova propria e nao usa a rodada sorteada.
      return { ...s, mode: a.mode, round: a.mode === 'duelo' ? [] : drawRound(), screen: 'name' }

    case 'setPlayers':
      return { ...s, players: a.players, training: a.training, screen: 'briefing' }

    case 'begin': {
      // Sorteia de novo aqui: quem volta pela tela de regras nao pode
      // espiar a rodada e depois rejogar a mesma.
      const round = s.mode === 'duelo' ? s.round : drawRound()
      return {
        ...s,
        screen: 'playing',
        round,
        index: 0,
        turn: 0,
        results: [],
        combo: 0,
        score: 0,
        secondsLeft: round.length ? DIFFICULTY_SECONDS[round[0].difficulty] : 0,
        startedAt: Date.now(),
        paused: false,
      }
    }

    case 'tick':
      if (s.paused || s.screen !== 'playing') return s
      return { ...s, secondsLeft: Math.max(0, s.secondsLeft - 1) }

    case 'penalty':
      return { ...s, secondsLeft: Math.max(0, s.secondsLeft - (a.seconds ?? ERROR_TIME_PENALTY)), combo: 0 }

    case 'finishMinigame': {
      const spec = s.round[s.index]
      if (!spec) return s
      const result: MinigameResult = {
        id: spec.id,
        ratio: a.ratio,
        difficulty: spec.difficulty,
        label: spec.label,
        secondsLeft: s.secondsLeft,
      }
      const results = [...s.results, result]
      const next = s.index + 1
      const perfect = a.ratio >= 0.999

      if (next >= s.round.length) {
        return { ...s, results, score: totalScore(results), screen: 'result', combo: perfect ? s.combo + 1 : 0 }
      }
      return {
        ...s,
        results,
        index: next,
        // Revezamento: a vez gira a cada mini-game. Nos outros modos, fica parado.
        turn: s.mode === 'revezamento' ? (s.turn + 1) % s.players.length : s.turn,
        combo: perfect ? s.combo + 1 : 0,
        secondsLeft: DIFFICULTY_SECONDS[s.round[next].difficulty],
        score: totalScore(results),
      }
    }

    case 'pause':
      return { ...s, paused: a.on }

    case 'abort':
      return { ...initialState, screen: 'attract' }

    case 'reset':
      return { ...initialState }
  }
}

export { modeFor }
