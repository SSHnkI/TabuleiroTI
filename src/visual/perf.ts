/**
 * MISSAO TI :: medicao de frame rate e degradacao automatica.
 *
 * A maquina do estande tem video integrado e o nucleo 3D fica presente o
 * tempo todo. Isso so e seguro com um guarda medindo: se o frame rate cair,
 * o visual desce de nivel sozinho, sem ninguem precisar intervir no meio da
 * feira. Resposta ao dedo ganha de qualquer efeito.
 */

/** full = 3D completo. reduced = 3D economico. minimal = fallback 2D. */
export type PerfTier = 'full' | 'reduced' | 'minimal'

const DEGRADE_BELOW = 45
const RECOVER_ABOVE = 55
/** Quanto tempo ruim aguenta antes de descer um nivel. */
const DEGRADE_AFTER_MS = 2000
/** Subir de nivel exige mais paciencia que descer, para nao ficar piscando. */
const RECOVER_AFTER_MS = 6000

const ORDER: PerfTier[] = ['full', 'reduced', 'minimal']

type Listener = (state: PerfState) => void
export interface PerfState { fps: number; tier: PerfTier; forced: boolean }

let fps = 60
let tier: PerfTier = 'full'
let forced = false
let badSince = 0
let goodSince = 0
let raf = 0
let frames = 0
let windowStart = 0

const listeners = new Set<Listener>()
const snapshot = (): PerfState => ({ fps, tier, forced })
const emit = () => listeners.forEach(fn => fn(snapshot()))

function step(now: number) {
  frames++
  if (windowStart === 0) windowStart = now

  const elapsed = now - windowStart
  if (elapsed >= 500) {
    fps = Math.round((frames * 1000) / elapsed)
    frames = 0
    windowStart = now

    if (!forced) {
      const i = ORDER.indexOf(tier)
      if (fps < DEGRADE_BELOW && i < ORDER.length - 1) {
        badSince = badSince || now
        goodSince = 0
        if (now - badSince >= DEGRADE_AFTER_MS) {
          tier = ORDER[i + 1]
          badSince = 0
        }
      } else if (fps > RECOVER_ABOVE && i > 0) {
        goodSince = goodSince || now
        badSince = 0
        if (now - goodSince >= RECOVER_AFTER_MS) {
          tier = ORDER[i - 1]
          goodSince = 0
        }
      } else {
        badSince = 0
        goodSince = 0
      }
    }
    emit()
  }
  raf = requestAnimationFrame(step)
}

export function startPerfMonitor(): () => void {
  if (raf) return () => {}
  raf = requestAnimationFrame(step)
  return () => { cancelAnimationFrame(raf); raf = 0 }
}

export function subscribePerf(fn: Listener): () => void {
  listeners.add(fn)
  fn(snapshot())
  return () => listeners.delete(fn)
}

export const getPerf = snapshot

/** Painel do operador: travar um nivel a mao, para testar ou para garantir
 *  estabilidade num dia ruim. `null` devolve o controle ao medidor. */
export function forceTier(next: PerfTier | null): void {
  if (next === null) { forced = false } else { forced = true; tier = next }
  badSince = 0
  goodSince = 0
  emit()
}
