/**
 * MISSAO TI :: regra de pontuacao
 *
 * Unica logica nao trivial do projeto, por isso e a unica que leva teste.
 * Tudo aqui e puro: sem DOM, sem React, sem relogio. Da para rodar em node.
 */

export type MinigameId =
  | 'scanner' | 'firewall' | 'fluxo' | 'timeline'
  | 'triagem' | 'phishing' | 'backup' | 'rack' | 'wifi' | 'rede' | 'suporte' | 'seguranca'

/**
 * Criticidade do incidente. E ela que define quanto vale e quanto tempo da,
 * nao o tipo de mini-game: o mesmo Scanner pode cair como um cadastro
 * errado (barato) ou como uma nota fiscal travada (caro).
 */
export type Difficulty = 'facil' | 'medio' | 'dificil' | 'critico'

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  facil: 8, medio: 12, dificil: 18, critico: 26,
}

export const DIFFICULTY_SECONDS: Record<Difficulty, number> = {
  facil: 18, medio: 22, dificil: 26, critico: 30,
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'BAIXA', medio: 'MÉDIA', dificil: 'ALTA', critico: 'CRÍTICA',
}

/**
 * Formato da rodada: sempre a mesma curva de dificuldade, com os desafios
 * sorteados dentro dela. Duas partidas seguidas nao se repetem, mas as
 * duas valem o mesmo maximo, senao o ranking premiaria sorte de sorteio.
 */
export const ROUND_SHAPE: Difficulty[] = ['facil', 'medio', 'medio', 'dificil', 'critico']

/** Soma de ROUND_SHAPE. */
export const BASE_MAX = ROUND_SHAPE.reduce((sum, d) => sum + DIFFICULTY_POINTS[d], 0)
export const SCORE_MAX = 100

/** Tempo total de uma rodada, somando a curva de dificuldade. */
export const ROUND_SECONDS = ROUND_SHAPE.reduce((sum, d) => sum + DIFFICULTY_SECONDS[d], 0)

/**
 * Botao de calibragem do jogo.
 *
 * O teto do bonus e o que falta para 100 depois da base, e o divisor e
 * calculado para que esse teto seja atingivel jogando perfeito. Mexer numa
 * das duas pontas sem a outra quebra em silencio a promessa de "maximo 100".
 */
export const TIME_BONUS_CAP = SCORE_MAX - BASE_MAX
export const TIME_BONUS_DIVISOR = Math.max(1, Math.floor(ROUND_SECONDS / TIME_BONUS_CAP))

/** Segundos que um erro custa do relogio. Erro nao tira ponto, tira tempo. */
export const ERROR_TIME_PENALTY = 3

export interface MinigameResult {
  id: MinigameId
  /** 0 a 1. Alguns desafios sao quase binarios, outros dao nota graduada. */
  ratio: number
  /** Criticidade sorteada para esta etapa: e ela que define o valor. */
  difficulty: Difficulty
  /** Segundos que sobraram no relogio daquela etapa. */
  secondsLeft: number
  /** Rotulo do incidente, para a tela de resultado explicar o que foi. */
  label?: string
}

export interface Run {
  name: string
  mode: GameMode
  score: number
  secondsLeft: number
  /** Epoch ms. Usado como ultimo criterio de desempate: quem marcou primeiro. */
  at: number
  /** Falso quando e uma repeticao: pontua e comemora, mas nao entra no ranking. */
  ranked: boolean
}

export type GameMode = 'solo' | 'duelo' | 'revezamento' | 'equipe'

/** Modos que disputam o ranking individual. Os outros disputam o de equipes. */
export const INDIVIDUAL_MODES: GameMode[] = ['solo', 'duelo']

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Pontos de uma etapa: criticidade vezes desempenho. */
export function minigameScore(difficulty: Difficulty, ratio: number): number {
  return Math.round(DIFFICULTY_POINTS[difficulty] * clamp01(ratio))
}

/**
 * Bonus de velocidade. E o que espalha as pontuacoes ao longo do dia:
 * sem ele, todo mundo que acerta tudo empata, e um ranking cheio de
 * empates nao premia ninguem com justica.
 */
export function timeBonus(secondsLeft: number): number {
  if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) return 0
  return Math.min(TIME_BONUS_CAP, Math.floor(secondsLeft / TIME_BONUS_DIVISOR))
}

export function totalScore(results: MinigameResult[]): number {
  const base = results.reduce((sum, r) => sum + minigameScore(r.difficulty, r.ratio), 0)
  const left = results.reduce((sum, r) => sum + Math.max(0, r.secondsLeft), 0)
  return Math.min(SCORE_MAX, base + timeBonus(left))
}

/**
 * Ordem do ranking: pontos, depois quem sobrou mais tempo, depois quem
 * marcou primeiro. Negativo = `a` vem antes.
 */
export function compareRuns(a: Run, b: Run): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.secondsLeft !== a.secondsLeft) return b.secondsLeft - a.secondsLeft
  return a.at - b.at
}

const norm = (name: string) => name.trim().toLocaleLowerCase('pt-BR')

/**
 * So a PRIMEIRA partida de cada nome conta. As seguintes sao treino.
 *
 * Marcar `ranked` no momento de salvar nao basta: o operador pode apagar
 * uma partida pelo painel, e ai a segunda do mesmo nome passaria a ser a
 * primeira. Por isso a regra e reavaliada aqui, na leitura, sempre.
 */
export function rankRuns(runs: Run[], modes: GameMode[] = INDIVIDUAL_MODES): Run[] {
  const scoped = runs.filter(r => modes.includes(r.mode))
  const byArrival = [...scoped].sort((a, b) => a.at - b.at)
  const seen = new Set<string>()
  const firsts: Run[] = []
  for (const run of byArrival) {
    const key = norm(run.name)
    if (seen.has(key)) continue
    seen.add(key)
    firsts.push(run)
  }
  return firsts.sort(compareRuns)
}

/** Um nome ja jogou valendo? Decide se a tela mostra o selo TREINO. */
export function isRepeat(runs: Run[], name: string, mode: GameMode): boolean {
  const modes = INDIVIDUAL_MODES.includes(mode) ? INDIVIDUAL_MODES : (['revezamento', 'equipe'] as GameMode[])
  return runs.some(r => modes.includes(r.mode) && norm(r.name) === norm(name))
}

/** Numeros para o juri no encerramento. O jogo coleta tudo sozinho. */
export function stats(runs: Run[]) {
  const played = runs.length
  const scores = runs.map(r => r.score)
  const byHour = new Map<number, number>()
  for (const r of runs) {
    const h = new Date(r.at).getHours()
    byHour.set(h, (byHour.get(h) ?? 0) + 1)
  }
  return {
    played,
    teams: new Set(runs.map(r => norm(r.name))).size,
    average: played ? Math.round(scores.reduce((a, b) => a + b, 0) / played) : 0,
    best: played ? Math.max(...scores) : 0,
    peakHour: played ? [...byHour.entries()].sort((a, b) => b[1] - a[1])[0] : null,
  }
}

/* ------------------------------------------------- notas graduadas (ratio) */

/**
 * Firewall. O denominador e o total de senhas AGENDADAS para a rodada, nao
 * o total que o jogador chegou a ver: sem isso, quem perde as tres vidas no
 * comeco com 100% de acerto sairia com nota cheia.
 */
export function accuracyRatio(correct: number, scheduled: number): number {
  if (scheduled <= 0) return 0
  return clamp01(correct / scheduled)
}

/**
 * Linha do tempo. Nota proporcional a precisao, nao acerto ou erro.
 * Dentro de `perfectMargin` e nota cheia; a partir de `zeroMargin` e zero;
 * no meio, cai em linha reta.
 */
export function precisionRatio(
  guess: number, truth: number, perfectMargin: number, zeroMargin: number,
): number {
  if (!Number.isFinite(guess)) return 0
  const err = Math.abs(guess - truth)
  if (err <= perfectMargin) return 1
  if (err >= zeroMargin) return 0
  return clamp01(1 - (err - perfectMargin) / (zeroMargin - perfectMargin))
}
