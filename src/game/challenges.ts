/**
 * MISSAO TI :: sorteio da rodada.
 *
 * A rodada sempre tem a MESMA curva de criticidade (ROUND_SHAPE), mas os
 * desafios dentro dela sao sorteados. Duas coisas saem disso:
 *
 *  1. quem joga de novo, ou quem assiste a fila inteira jogar, nao decora a
 *     resposta. Sem isso o decimo jogador do dia teria vantagem sobre o
 *     primeiro, e o ranking viraria uma medida de quem chegou mais tarde;
 *  2. o maximo continua sendo 100 para todo mundo, porque a curva e fixa.
 *     Sortear tambem a dificuldade premiaria sorte, nao habilidade.
 *
 * Nunca repete o mesmo tipo de mini-game na mesma rodada.
 */
import { ROUND_SHAPE, type Difficulty, type MinigameId } from './scoring.ts'
import {
  SCANNER_CASES, FLOW_CASES, TIMELINE_CASES, PHISHING_CASES, RACK_CASES, WIFI_CASES,
  TICKETS, TRIAGEM_TUNING, FIREWALL_TUNING, BACKUP_TUNING,
  type ScannerCase, type FlowCase, type TimelineCase, type PhishingCase,
  type RackCase, type WifiCase, type Ticket,
} from './content.ts'
import { NET_CASES, type NetCase } from './net-content.ts'
import {
  SUPORTE_CASES, SEGURANCA_CASES,
  type SuporteCase, type SegurancaCase,
} from './ops-content.ts'

export type ChallengeSpec =
  | { id: 'scanner'; difficulty: Difficulty; label: string; erp: ScannerCase }
  | { id: 'fluxo'; difficulty: Difficulty; label: string; flow: FlowCase }
  | { id: 'timeline'; difficulty: Difficulty; label: string; timeline: TimelineCase }
  | { id: 'firewall'; difficulty: Difficulty; label: string; drops: number; speed: number }
  | { id: 'triagem'; difficulty: Difficulty; label: string; tickets: Ticket[] }
  | { id: 'phishing'; difficulty: Difficulty; label: string; email: PhishingCase }
  | { id: 'backup'; difficulty: Difficulty; label: string; length: number }
  | { id: 'rack'; difficulty: Difficulty; label: string; rack: RackCase }
  | { id: 'wifi'; difficulty: Difficulty; label: string; wifi: WifiCase }
  | { id: 'rede'; difficulty: Difficulty; label: string; net: NetCase }
  | { id: 'suporte'; difficulty: Difficulty; label: string; chamados: SuporteCase }
  | { id: 'seguranca'; difficulty: Difficulty; label: string; seg: SegurancaCase }

export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Tudo que pode cair numa dada criticidade. */
function poolFor(d: Difficulty, rand: () => number): ChallengeSpec[] {
  const out: ChallengeSpec[] = []

  for (const erp of SCANNER_CASES) {
    if (erp.difficulty === d) out.push({ id: 'scanner', difficulty: d, label: erp.label, erp })
  }
  for (const flow of FLOW_CASES) {
    if (flow.difficulty === d) out.push({ id: 'fluxo', difficulty: d, label: flow.label, flow })
  }
  for (const timeline of TIMELINE_CASES) {
    if (timeline.difficulty === d) out.push({ id: 'timeline', difficulty: d, label: timeline.label, timeline })
  }
  for (const email of PHISHING_CASES) {
    if (email.difficulty === d) out.push({ id: 'phishing', difficulty: d, label: email.label, email })
  }
  for (const rack of RACK_CASES) {
    if (rack.difficulty === d) out.push({ id: 'rack', difficulty: d, label: rack.label, rack })
  }
  for (const wifi of WIFI_CASES) {
    if (wifi.difficulty === d) out.push({ id: 'wifi', difficulty: d, label: wifi.label, wifi })
  }
  for (const net of NET_CASES) {
    if (net.difficulty === d) out.push({ id: 'rede', difficulty: d, label: net.label, net })
  }
  for (const chamados of SUPORTE_CASES) {
    if (chamados.difficulty === d) out.push({ id: 'suporte', difficulty: d, label: chamados.label, chamados })
  }
  for (const seg of SEGURANCA_CASES) {
    if (seg.difficulty === d) out.push({ id: 'seguranca', difficulty: d, label: seg.label, seg })
  }

  const fw = FIREWALL_TUNING[d]
  if (fw) out.push({ id: 'firewall', difficulty: d, label: 'Ataque de senhas', ...fw })

  const tri = TRIAGEM_TUNING[d]
  if (tri) {
    // Sorteia os chamados, mas garante pelo menos um de cada prioridade:
    // uma rodada só de P3 nao ensina nada e ainda deixa a nota facil demais.
    const byP = (['P1', 'P2', 'P3'] as const).map(p => shuffle(TICKETS.filter(t => t.priority === p), rand)[0])
    const resto = shuffle(TICKETS.filter(t => !byP.includes(t)), rand).slice(0, Math.max(0, tri - 3))
    out.push({ id: 'triagem', difficulty: d, label: 'Fila de chamados', tickets: shuffle([...byP, ...resto], rand) })
  }

  const bk = BACKUP_TUNING[d]
  if (bk) out.push({ id: 'backup', difficulty: d, label: 'Restauração do sistema', length: bk })

  return out
}

/**
 * Monta a rodada. Se uma criticidade ficar sem opcao nova (todos os tipos
 * ja usados), o filtro de tipo e relaxado para aquela etapa: melhor repetir
 * um tipo do que devolver uma rodada mais curta e quebrar o maximo de 100.
 */
export function drawRound(rand: () => number = Math.random): ChallengeSpec[] {
  // Atalho de conferencia: ?desafio=rack monta a rodada SO com aquele tipo,
  // em todas as criticidades em que ele existe, ja na primeira etapa. Serve
  // para conferir um desafio no monitor do estande sem jogar a rodada
  // inteira ate ele cair, o que para um desafio critico levaria dois minutos.
  //
  // A rodada fica mais curta e a pontuacao sai menor: e ferramenta de
  // conferencia, nao partida valendo.
  const forcar = typeof location !== 'undefined'
    ? new URLSearchParams(location.search).get('desafio')
    : null

  if (forcar) {
    const so = rodadaDeUmTipo(forcar as MinigameId, rand)
    if (so.length) return so
  }

  const usados = new Set<MinigameId>()
  const round: ChallengeSpec[] = []

  for (const d of ROUND_SHAPE) {
    const pool = poolFor(d, rand)
    const novos = pool.filter(c => !usados.has(c.id))
    const escolha = shuffle(novos.length ? novos : pool, rand)[0]
    if (!escolha) continue
    usados.add(escolha.id)
    round.push(escolha)
  }
  return round
}

/**
 * Uma rodada feita SO de um tipo de desafio, em todas as criticidades em que
 * ele existe, da mais leve para a mais pesada.
 *
 * Serve a dois donos: o atalho ?desafio= do operador e a tela de treino. Os
 * dois querem a mesma coisa, conferir um desafio sem jogar a rodada inteira
 * ate ele cair, o que para um desafio critico levaria dois minutos.
 */
export function rodadaDeUmTipo(id: MinigameId, rand: () => number = Math.random): ChallengeSpec[] {
  const so: ChallengeSpec[] = []
  for (const d of ['facil', 'medio', 'dificil', 'critico'] as Difficulty[]) {
    for (const c of poolFor(d, rand)) if (c.id === id) so.push(c)
  }
  return so
}
