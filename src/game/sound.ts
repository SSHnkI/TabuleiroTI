/**
 * MISSAO TI :: som.
 *
 * Gerado no navegador, sem arquivo de audio: o estande roda offline e um
 * .mp3 que nao carrega e um erro silencioso no meio da feira.
 *
 * Tudo protegido por try: navegador que bloqueia audio, contexto suspenso ou
 * maquina sem placa de som nao podem derrubar o jogo. Som e enfeite; o jogo
 * tem que continuar sem ele.
 */

let ctx: AudioContext | null = null
let muted = false

export const isMuted = () => muted
export function setMuted(v: boolean) {
  muted = v
  try { localStorage.setItem('missaoTI.muted', v ? '1' : '0') } catch { /* sem persistencia, tudo bem */ }
}

export function loadMuted(): boolean {
  try { muted = localStorage.getItem('missaoTI.muted') === '1' } catch { muted = false }
  return muted
}

/** O navegador so libera audio depois de um gesto do usuario. Chamar isto
 *  no primeiro toque da sessao evita o primeiro som sair mudo. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* sem audio nesta maquina */ }
}

function tone(freqs: number[], dur: number, type: OscillatorType = 'sine', gain = 0.06) {
  if (muted) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    freqs.forEach((f, i) => {
      const osc = ctx!.createOscillator()
      const g = ctx!.createGain()
      osc.type = type
      osc.frequency.value = f
      const t0 = now + i * (dur * 0.55)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(g).connect(ctx!.destination)
      osc.start(t0)
      osc.stop(t0 + dur + 0.02)
    })
  } catch { /* som e enfeite: o jogo continua sem ele */ }
}

/** Acorde ascendente: recompensa. */
export const sHit = () => tone([660, 880, 1175], 0.16, 'triangle', 0.05)
/** Grave curto e seco: consequencia. */
export const sMiss = () => tone([150, 98], 0.22, 'sawtooth', 0.045)
export const sTap = () => tone([520], 0.05, 'sine', 0.025)
export const sStart = () => tone([392, 523, 659], 0.18, 'triangle', 0.05)
/** Fanfarra do resultado. */
export const sFinish = () => tone([523, 659, 784, 1047], 0.3, 'triangle', 0.06)
/** Alerta de tempo acabando. */
export const sUrgent = () => tone([880], 0.08, 'square', 0.03)
