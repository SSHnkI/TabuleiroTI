/**
 * MISSAO TI :: som.
 *
 * Gerado no navegador, sem arquivo de audio: o estande roda offline e um
 * .mp3 que nao carrega e um erro silencioso no meio da feira.
 *
 * Tudo protegido por try: navegador que bloqueia audio, contexto suspenso ou
 * maquina sem placa de som nao podem derrubar o jogo. Som e enfeite; o jogo
 * tem que continuar sem ele.
 *
 * O que separa som de arcade de som de formulario e RUIDO. Oscilador afinado
 * sozinho so faz bipe de micro-ondas. Impacto, estilhaco e explosao nascem de
 * ruido branco passado por filtro, e e isso que este arquivo acrescenta.
 */

let ctx: AudioContext | null = null
let bus: GainNode | null = null
let muted = false

export const isMuted = () => muted

export function setMuted(v: boolean) {
  muted = v
  // O barramento tambem abaixa, senao o ambiente continuo continuaria tocando:
  // a trava por chamada so segura som novo.
  try { bus?.gain.setTargetAtTime(v ? 0 : 1, ctx!.currentTime, 0.05) } catch { /* sem audio */ }
  try { localStorage.setItem('missaoTI.muted', v ? '1' : '0') } catch { /* sem persistencia, tudo bem */ }
}

export function loadMuted(): boolean {
  try { muted = localStorage.getItem('missaoTI.muted') === '1' } catch { muted = false }
  return muted
}

/**
 * O contexto, o barramento e o compressor.
 *
 * O compressor existe porque agora varias vozes tocam juntas (impacto, estilhaco,
 * combo e ambiente ao mesmo tempo). Sem ele, dois acertos simultaneos estouram a
 * saida e viram chiado.
 */
function audio(): { ctx: AudioContext; bus: GainNode } | null {
  try {
    if (!ctx) {
      ctx = new AudioContext()
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -16
      comp.knee.value = 24
      comp.ratio.value = 6
      comp.attack.value = 0.002
      comp.release.value = 0.18
      bus = ctx.createGain()
      bus.gain.value = muted ? 0 : 1
      bus.connect(comp).connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return { ctx, bus: bus! }
  } catch { return null }
}

/** O navegador so libera audio depois de um gesto do usuario. Chamar isto
 *  no primeiro toque OU na primeira tecla da sessao evita o primeiro som
 *  sair mudo. */
export function unlockAudio() { audio() }

/* ==================================================================== base */

let ruidoBuf: AudioBuffer | null = null

/** Um segundo e meio de ruido branco, gerado uma vez e reaproveitado por
 *  todos os sons. Gerar a cada tiro custaria mais que o som inteiro. */
function bufferRuido(c: AudioContext): AudioBuffer {
  if (ruidoBuf) return ruidoBuf
  const n = Math.floor(c.sampleRate * 1.5)
  const b = c.createBuffer(1, n, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  ruidoBuf = b
  return b
}

interface RuidoOpts {
  dur: number
  /** Corte do filtro no inicio. */
  de: number
  /** Corte no fim. Uma varredura de agudo para grave e o som de "baque". */
  para?: number
  tipo?: BiquadFilterType
  q?: number
  gain?: number
  /** Segundos a esperar antes de disparar. */
  atraso?: number
}

function ruido(o: RuidoOpts) {
  if (muted) return
  const a = audio()
  if (!a) return
  try {
    const t0 = a.ctx.currentTime + (o.atraso ?? 0)
    const src = a.ctx.createBufferSource()
    src.buffer = bufferRuido(a.ctx)
    src.loop = true
    // Ponto de partida aleatorio: dois tiros seguidos nao saem identicos.
    const inicio = Math.random() * 1.2

    const filtro = a.ctx.createBiquadFilter()
    filtro.type = o.tipo ?? 'lowpass'
    filtro.Q.value = o.q ?? 1
    filtro.frequency.setValueAtTime(o.de, t0)
    if (o.para !== undefined) {
      filtro.frequency.exponentialRampToValueAtTime(Math.max(30, o.para), t0 + o.dur)
    }

    const g = a.ctx.createGain()
    const pico = o.gain ?? 0.10
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(pico, t0 + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur)

    src.connect(filtro).connect(g).connect(a.bus)
    src.start(t0, inicio)
    src.stop(t0 + o.dur + 0.02)
  } catch { /* som e enfeite */ }
}

/** Uma nota. Com `para` definido, o tom escorrega: e o corpo de todo impacto. */
function nota(
  de: number, dur: number,
  { para, tipo = 'sine', gain = 0.08, atraso = 0 }:
  { para?: number; tipo?: OscillatorType; gain?: number; atraso?: number } = {},
) {
  if (muted) return
  const a = audio()
  if (!a) return
  try {
    const t0 = a.ctx.currentTime + atraso
    const osc = a.ctx.createOscillator()
    osc.type = tipo
    osc.frequency.setValueAtTime(de, t0)
    if (para !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, para), t0 + dur)

    const g = a.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

    osc.connect(g).connect(a.bus)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  } catch { /* som e enfeite */ }
}

/** Arpejo: uma nota depois da outra, nao um acorde. */
function tone(freqs: number[], dur: number, tipo: OscillatorType = 'sine', gain = 0.06) {
  freqs.forEach((f, i) => nota(f, dur, { tipo, gain, atraso: i * dur * 0.55 }))
}

/* =============================================================== o kit novo */

/**
 * Acerto que BATE. Duas camadas, que e o minimo para soar fisico:
 * o estalo (ruido varrendo do agudo ao grave) e o corpo (tom caindo).
 */
export function sImpacto() {
  ruido({ dur: 0.09, de: 3400, para: 320, gain: 0.13 })
  nota(320, 0.13, { para: 96, tipo: 'triangle', gain: 0.11 })
}

/** Vidro rachando: campo do ERP quebrando, painel estilhacando. */
export function sEstilhaco() {
  ruido({ dur: 0.22, de: 2600, tipo: 'highpass', q: 0.8, gain: 0.07 })
  for (let i = 0; i < 3; i++) {
    nota(1800 + Math.random() * 1600, 0.07, { tipo: 'triangle', gain: 0.035, atraso: 0.02 + i * 0.035 })
  }
}

/**
 * Explosao. Ruido grave varrendo para baixo, um tom despencando por baixo,
 * e uma cauda curta por delay realimentado. Reverb de verdade custaria um
 * arquivo de impulso, que o estande offline nao pode carregar.
 */
export function sExplosao() {
  ruido({ dur: 0.55, de: 900, para: 60, gain: 0.16 })
  nota(96, 0.42, { para: 28, tipo: 'sine', gain: 0.14 })
  if (muted) return
  const a = audio()
  if (!a) return
  try {
    const t0 = a.ctx.currentTime
    const delay = a.ctx.createDelay(0.5)
    delay.delayTime.value = 0.085
    const fb = a.ctx.createGain()
    fb.gain.value = 0.34
    const saida = a.ctx.createGain()
    saida.gain.value = 0.5

    const src = a.ctx.createBufferSource()
    src.buffer = bufferRuido(a.ctx)
    src.loop = true
    const f = a.ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 420
    f.Q.value = 0.8
    const g = a.ctx.createGain()
    g.gain.setValueAtTime(0.06, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)

    src.connect(f).connect(g).connect(delay)
    delay.connect(fb).connect(delay)
    delay.connect(saida).connect(a.bus)
    src.start(t0, Math.random())
    src.stop(t0 + 0.2)
  } catch { /* som e enfeite */ }
}

/**
 * Combo: o tom sobe um semitom a cada acerto seguido.
 *
 * E o gatilho de recompensa mais barato que existe e o mais antigo do arcade.
 * Teto em doze degraus (uma oitava): passando disso vira apito.
 */
export const COMBO_TETO = 12
export const COMBO_BASE = 523.25

export function comboFreq(n: number): number {
  const degrau = Math.max(0, Math.min(COMBO_TETO, Math.floor(n)))
  return COMBO_BASE * Math.pow(2, degrau / 12)
}

export function sCombo(n: number) {
  const f = comboFreq(n)
  nota(f, 0.12, { tipo: 'triangle', gain: 0.05 })
  nota(f * 1.5, 0.10, { tipo: 'sine', gain: 0.03, atraso: 0.03 })
  if (n >= 3) ruido({ dur: 0.07, de: 5200, tipo: 'highpass', gain: 0.03 })
}

/** Relogio acabando. `urgencia` vai de 0 a 1: quanto maior, mais seco e alto. */
export function sAlarme(urgencia = 0.5) {
  const u = Math.max(0, Math.min(1, urgencia))
  nota(760 + u * 280, 0.06 + (1 - u) * 0.04, { tipo: 'square', gain: 0.022 + u * 0.02 })
}

/* ============================================================== o ambiente */

export type AmbienteId = 'servidores' | 'fabrica' | 'rede' | 'orbita'

interface AmbienteCfg {
  corte: number
  q: number
  tipo: BiquadFilterType
  ganhoRuido: number
  zumbido: number[]
  ganhoZumbido: number
  /** Quanto o filtro respira, em Hz. */
  respiro: number
}

const AMBIENTES: Record<AmbienteId, AmbienteCfg> = {
  // Corredor de datacenter: ventoinha e o zumbido de 60Hz do transformador.
  servidores: { corte: 520, q: 0.7, tipo: 'lowpass', ganhoRuido: 0.022, zumbido: [58, 116], ganhoZumbido: 0.012, respiro: 90 },
  // Galpao: grave, longe, com ar.
  fabrica: { corte: 260, q: 0.6, tipo: 'lowpass', ganhoRuido: 0.026, zumbido: [44], ganhoZumbido: 0.016, respiro: 60 },
  // Rede: nada mecanico, so o sibilo de um sistema acordado.
  rede: { corte: 900, q: 3.0, tipo: 'bandpass', ganhoRuido: 0.012, zumbido: [130], ganhoZumbido: 0.008, respiro: 160 },
  // Globo: vazio, agudo, sem chao.
  orbita: { corte: 1800, q: 1.5, tipo: 'bandpass', ganhoRuido: 0.010, zumbido: [78], ganhoZumbido: 0.010, respiro: 220 },
}

let ambienteAtivo: { id: AmbienteId; parar: () => void } | null = null

/**
 * Liga um leito de som continuo por cenario. `null` desliga.
 *
 * Volume proposital de quase nada: ninguem deve notar que existe, so notar
 * quando some. E o que faz o cenario parecer um lugar e nao um desenho.
 * Entra e sai com rampa de 0,8s, senao estala.
 */
export function ambiente(id: AmbienteId | null) {
  if (ambienteAtivo?.id === id) return
  ambienteAtivo?.parar()
  ambienteAtivo = null
  if (!id) return

  const a = audio()
  if (!a) return
  try {
    const cfg = AMBIENTES[id]
    const t0 = a.ctx.currentTime
    const mestre = a.ctx.createGain()
    mestre.gain.setValueAtTime(0.0001, t0)
    mestre.gain.linearRampToValueAtTime(1, t0 + 0.8)
    mestre.connect(a.bus)

    const src = a.ctx.createBufferSource()
    src.buffer = bufferRuido(a.ctx)
    src.loop = true
    const filtro = a.ctx.createBiquadFilter()
    filtro.type = cfg.tipo
    filtro.frequency.value = cfg.corte
    filtro.Q.value = cfg.q
    const gr = a.ctx.createGain()
    gr.gain.value = cfg.ganhoRuido
    src.connect(filtro).connect(gr).connect(mestre)
    src.start(t0, Math.random())

    // O filtro respira devagar. Sem isso o leito vira chiado de radio.
    const lfo = a.ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoG = a.ctx.createGain()
    lfoG.gain.value = cfg.respiro
    lfo.connect(lfoG).connect(filtro.frequency)
    lfo.start(t0)

    const oscs = cfg.zumbido.map((f, i) => {
      const o = a.ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = a.ctx.createGain()
      g.gain.value = cfg.ganhoZumbido / (i + 1)
      o.connect(g).connect(mestre)
      o.start(t0)
      return o
    })

    ambienteAtivo = {
      id,
      parar: () => {
        try {
          const t = a.ctx.currentTime
          mestre.gain.cancelScheduledValues(t)
          mestre.gain.setValueAtTime(Math.max(0.0001, mestre.gain.value), t)
          mestre.gain.linearRampToValueAtTime(0.0001, t + 0.5)
          src.stop(t + 0.55)
          lfo.stop(t + 0.55)
          oscs.forEach(o => o.stop(t + 0.55))
        } catch { /* ja parou */ }
      },
    }
  } catch { /* som e enfeite */ }
}

/* ================================================================= finais */

export type Rank = 'S' | 'A' | 'B' | 'C'

/** Fanfarra do resultado, diferente por faixa de nota. O S tem que soar
 *  como conquista de verdade, e o C nao pode soar como derrota. */
export function sFanfarra(rank: Rank = 'B') {
  const linhas: Record<Rank, number[]> = {
    S: [523.25, 659.25, 783.99, 1046.5, 1318.5],
    A: [523.25, 659.25, 783.99, 1046.5],
    B: [523.25, 659.25, 783.99],
    C: [523.25, 622.25, 739.99],
  }
  const notas = linhas[rank]
  notas.forEach((f, i) => {
    nota(f, 0.34, { tipo: 'triangle', gain: 0.055, atraso: i * 0.11 })
    nota(f * 2, 0.22, { tipo: 'sine', gain: 0.022, atraso: i * 0.11 })
  })
  if (rank === 'S' || rank === 'A') {
    ruido({ dur: 0.7, de: 6000, tipo: 'highpass', gain: 0.035, atraso: notas.length * 0.11 })
    nota(1046.5, 0.9, { tipo: 'triangle', gain: 0.05, atraso: notas.length * 0.11 })
  }
}

/* ======================================================= os sons de sempre */

/** Acorde ascendente: recompensa. Agora com o baque por baixo. */
export const sHit = () => { sImpacto(); tone([880, 1175], 0.12, 'triangle', 0.035) }
/** Grave curto e seco: consequencia. */
export const sMiss = () => {
  ruido({ dur: 0.16, de: 1200, para: 120, gain: 0.09 })
  tone([150, 98], 0.22, 'sawtooth', 0.045)
}
export const sTap = () => nota(520, 0.05, { gain: 0.025 })
export const sStart = () => {
  tone([392, 523, 659], 0.18, 'triangle', 0.05)
  ruido({ dur: 0.4, de: 400, para: 3000, tipo: 'bandpass', q: 2, gain: 0.05 })
}
/** Fanfarra do resultado. */
export const sFinish = () => sFanfarra('B')
/** Alerta de tempo acabando. */
export const sUrgent = () => sAlarme(0.6)
