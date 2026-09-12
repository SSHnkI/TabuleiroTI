/**
 * MISSAO TI :: persistencia do placar.
 *
 * Na edicao anterior o placar vivia so na memoria e se perdeu. Aqui:
 *  - grava em localStorage a cada partida
 *  - mantem uma chave espelho, para o caso de a principal corromper
 *  - avisa outras abas (modo TV) por BroadcastChannel
 *  - toda leitura e escrita e protegida: navegador em modo restrito,
 *    cota estourada ou JSON corrompido nao podem derrubar o estande.
 */
import type { Run } from './scoring.ts'

const KEY = 'missaoTI.runs.v1'
const MIRROR = 'missaoTI.runs.v1.mirror'
const CHANNEL = 'missao-ti'

export type StorageHealth = 'ok' | 'mirror' | 'memoria'

/** Ultimo recurso: se o navegador recusar localStorage, o dia continua aqui. */
let memory: Run[] = []
let health: StorageHealth = 'ok'

export const storageHealth = () => health

function readKey(key: string): Run[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    // Filtra registros quebrados em vez de deixar um deles derrubar a tela toda.
    return parsed.filter(
      (r): r is Run =>
        r && typeof r.name === 'string' && typeof r.score === 'number' && typeof r.at === 'number',
    )
  } catch {
    return null
  }
}

export function loadRuns(): Run[] {
  const main = readKey(KEY)
  if (main) { health = 'ok'; return main }
  const mirror = readKey(MIRROR)
  if (mirror) {
    // A principal se perdeu. Promove o espelho e segue o jogo.
    health = 'mirror'
    writeRuns(mirror)
    return mirror
  }
  return memory
}

function writeRuns(runs: Run[]): void {
  memory = runs
  try {
    const raw = JSON.stringify(runs)
    localStorage.setItem(KEY, raw)
    localStorage.setItem(MIRROR, raw)
    if (health === 'memoria') health = 'ok'
  } catch {
    health = 'memoria'
  }
}

/* ------------------------------------------------------------ sincronismo */

type Listener = (runs: Run[]) => void
const listeners = new Set<Listener>()
let channel: BroadcastChannel | null = null

// Guardado por `window`: o canal e coisa de navegador. Em node ele existe,
// nao serve para nada e ainda segura o processo vivo, travando os testes.
try {
  channel = typeof window === 'undefined' ? null : new BroadcastChannel(CHANNEL)
  if (channel) channel.onmessage = e => {
    if (e.data?.type === 'runs') {
      memory = e.data.runs
      listeners.forEach(fn => fn(e.data.runs))
    }
  }
} catch {
  channel = null
}

// Fallback para navegadores sem BroadcastChannel: o evento `storage` dispara
// em outras abas da mesma origem quando localStorage muda.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return
    const runs = loadRuns()
    listeners.forEach(fn => fn(runs))
  })
}

function broadcast(runs: Run[]): void {
  try { channel?.postMessage({ type: 'runs', runs }) } catch { /* aba sozinha, tudo bem */ }
  listeners.forEach(fn => fn(runs))
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* --------------------------------------------------------------- operacao */

export function saveRun(run: Run): Run[] {
  const runs = [...loadRuns(), run]
  writeRuns(runs)
  broadcast(runs)
  return runs
}

/** Painel do operador: desfazer a ultima pontuacao. */
export function undoLast(): Run[] {
  const runs = loadRuns()
  if (runs.length === 0) return runs
  const last = runs.reduce((a, b) => (b.at > a.at ? b : a))
  return deleteRun(last.at)
}

/** Exclusao por timestamp, nao por indice: a lista na tela esta ordenada
 *  por pontos, e excluir pelo indice visual apagaria a partida errada. */
export function deleteRun(at: number): Run[] {
  const runs = loadRuns().filter(r => r.at !== at)
  writeRuns(runs)
  broadcast(runs)
  return runs
}

export function clearAll(): Run[] {
  writeRuns([])
  broadcast([])
  return []
}

const csvCell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`

export function toCSV(runs: Run[]): string {
  const head = ['Nome', 'Modo', 'Pontos', 'Tempo restante', 'Vale ranking', 'Data']
  const rows = [...runs]
    .sort((a, b) => a.at - b.at)
    .map(r => [
      csvCell(r.name),
      csvCell(r.mode),
      r.score,
      r.secondsLeft,
      r.ranked ? 'sim' : 'treino',
      csvCell(new Date(r.at).toLocaleString('pt-BR')),
    ].join(','))
  // BOM: sem ele o Excel em pt-BR abre os acentos errados.
  return '\uFEFF' + [head.map(csvCell).join(','), ...rows].join('\r\n')
}

export function downloadCSV(runs: Run[]): void {
  const blob = new Blob([toCSV(runs)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `missao-ti-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* -------------------------------------------------------------- duelos */
/**
 * O duelo NAO entra no ranking de pontos, e isso e proposital: ele e uma
 * prova diferente da rodada completa, e como ha premio em jogo, misturar as
 * duas num ranking so seria injusto com quem jogou a rodada inteira.
 *
 * Ele tem placar proprio, de vitorias, o que ainda rende uma terceira
 * categoria de premiacao e mais um anuncio em voz alta durante o dia.
 */
const DUELS = 'missaoTI.duels.v1'

export interface Duel { winner: string; loser: string; at: number }

export function loadDuels(): Duel[] {
  try {
    const raw = localStorage.getItem(DUELS)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((d: Duel) => d && typeof d.winner === 'string') : []
  } catch {
    return []
  }
}

export function saveDuel(d: Duel): Duel[] {
  const all = [...loadDuels(), d]
  try { localStorage.setItem(DUELS, JSON.stringify(all)) } catch { /* segue sem gravar */ }
  broadcast(loadRuns())
  return all
}

export function clearDuels(): void {
  try { localStorage.removeItem(DUELS) } catch { /* nada a fazer */ }
}

/** Quem mais venceu duelos no dia. Empate desempata por quem chegou primeiro. */
export function duelBoard(duels: Duel[]): { name: string; wins: number }[] {
  const wins = new Map<string, { wins: number; first: number }>()
  for (const d of duels) {
    const key = d.winner.trim()
    const cur = wins.get(key)
    if (cur) cur.wins++
    else wins.set(key, { wins: 1, first: d.at })
  }
  return [...wins.entries()]
    .map(([name, v]) => ({ name, wins: v.wins, first: v.first }))
    .sort((a, b) => b.wins - a.wins || a.first - b.first)
    .map(({ name, wins }) => ({ name, wins }))
}
