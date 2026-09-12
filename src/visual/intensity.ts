/**
 * MISSAO TI :: hierarquia de intensidade.
 *
 * A regra dura do projeto: NADA de efeito novo entra em cena enquanto o
 * jogador precisa tocar. Se tudo for intenso, nada e intenso.
 *
 * Cada efeito declara o nivel maximo em que pode rodar. O guarda e
 * `allows()`, e nao se contorna: e o que protege a latencia do toque.
 */
import type { PerfTier } from './perf.ts'

export type Intensity =
  | 'idle'        // atracao e telas de espera: GPU livre, ninguem tocando
  | 'interacao'   // durante um mini-game: o toque precisa responder em <100ms
  | 'recompensa'  // acerto e combo: rajada curta de 300 a 600ms
  | 'cinematico'  // resultado final: nao ha input pendente

const RANK: Record<Intensity, number> = {
  interacao: 0,
  recompensa: 1,
  idle: 2,
  cinematico: 3,
}

/** Um efeito de peso `need` pode rodar no momento `current`? */
export function allows(current: Intensity, need: Intensity): boolean {
  return RANK[need] <= RANK[current]
}

export interface Budget {
  /** Resolucao de render, como fracao da densidade real da tela.
   *  1 = nitido de verdade. Abaixo de 0.7 comeca a aparecer serrilhado. */
  coreScale: number
  /** Quadros por segundo do nucleo. O jogo continua a 60 de qualquer forma. */
  coreFps: number
  /** Quantidade de particulas no fundo. */
  particles: number
  /** Usar WebGL ou cair para o nucleo 2D. */
  webgl: boolean
}

/**
 * O orcamento e o cruzamento de dois eixos: o que a maquina aguenta (tier)
 * e o que o momento permite (intensity).
 */
export function budgetFor(tier: PerfTier, intensity: Intensity): Budget {
  if (tier === 'minimal') {
    return { coreScale: 1, coreFps: 30, particles: 0, webgl: false }
  }

  const playing = intensity === 'interacao'

  // A economia sai do FRAME RATE, nao da resolucao. Baixar resolucao poupa
  // GPU, mas o que sobra e uma imagem borrada e serrilhada, que numa tela
  // grande de estande e o primeiro sinal de amadorismo. Baixar quadros num
  // objeto que so pulsa devagar ninguem percebe.
  if (tier === 'reduced') {
    return {
      coreScale: playing ? 0.75 : 0.9,
      coreFps: playing ? 24 : 30,
      particles: playing ? 0 : 90,
      webgl: true,
    }
  }

  // tier === 'full'
  return {
    coreScale: 1,
    coreFps: playing ? 30 : 60,
    particles: playing ? 60 : 220,
    webgl: true,
  }
}
