/**
 * MISSAO TI :: a camada de impacto.
 *
 * Tres tecnicas, um objeto por cena. Nao desenha nada: so mexe no relogio do
 * mundo e na camera.
 *
 *  1. CONGELAMENTO (hit-stop). O mundo para por uns 70ms no instante do golpe.
 *     E a tecnica de sensacao com melhor retorno por linha escrita que existe,
 *     e e o que separa "a tela respondeu" de "a tela BATEU".
 *  2. TRANCO. A camera avanca um tico e volta com mola.
 *  3. TREMOR. Decai com o quadrado, nao linear: comeca forte e some rapido,
 *     que e como impacto se comporta. Decaimento linear parece maquina de lavar.
 *
 * O laco de render NUNCA para de chamar requestAnimationFrame. Quem congela e
 * o tempo do mundo, nao o laco: um laco parado nao volta.
 */
import type { Camera } from 'ogl'

export interface Quadro {
  /** Segundos desde o quadro anterior. Vale 0 durante o congelamento. */
  dt: number
  /** Segundos de mundo desde o inicio. Nao anda durante o congelamento. */
  t: number
  congelado: boolean
}

export interface Juice {
  /** Chame uma vez por quadro, com o `now` do requestAnimationFrame. */
  tick(now: number): Quadro
  /** Para o mundo. Padrao de 70ms, que e o ponto onde bate sem virar engasgo. */
  congelar(ms?: number): void
  /** Empurrao da camera para frente, com volta elastica. */
  tranco(forca?: number): void
  /** Soma tremor. Acumula ate 1 e decai sozinho. */
  tremor(n?: number): void
  /** Memoriza a posicao atual da camera como repouso. Chamar no resize. */
  ancorar(camera: Camera): void
  /** Aplica tranco e tremor. Chamar por quadro, antes do render. */
  aplicar(camera: Camera): void
}

/** Teto do passo: uma aba em segundo plano nao pode voltar e teleportar tudo. */
const MAX_DT = 0.05

export const CONGELAMENTO_PADRAO = 70

export function criarJuice(): Juice {
  let ultimo = performance.now()
  let mundo = 0
  let real = 0
  let congelarAte = 0

  let trauma = 0
  /** Deslocamento ao longo do eixo de visada, e a velocidade da mola. */
  let empurrao = 0
  let velocidade = 0

  const base: [number, number, number] = [0, 0, 0]
  const visada: [number, number, number] = [0, 0, -1]

  return {
    tick(now) {
      const passo = Math.min(MAX_DT, Math.max(0, (now - ultimo) / 1000))
      ultimo = now
      real += passo

      // Mola e tremor andam em tempo REAL, nao em tempo de mundo: o quadro
      // congelado vibra, e e justamente isso que faz o congelamento ser lido
      // como pancada em vez de travamento.
      trauma = Math.max(0, trauma - passo * 1.9)
      const k = 190
      const amortecimento = 19
      velocidade += (-k * empurrao - amortecimento * velocidade) * passo
      empurrao += velocidade * passo

      const congelado = now < congelarAte
      if (congelado) return { dt: 0, t: mundo, congelado: true }

      mundo += passo
      return { dt: passo, t: mundo, congelado: false }
    },

    congelar(ms = CONGELAMENTO_PADRAO) {
      congelarAte = Math.max(congelarAte, performance.now() + ms)
    },

    tranco(forca = 1) {
      velocidade += forca * 5.5
    },

    tremor(n = 0.5) {
      trauma = Math.min(1, trauma + n)
    },

    ancorar(camera) {
      base[0] = camera.position.x
      base[1] = camera.position.y
      base[2] = camera.position.z
      // Todas as cenas olham para a origem, entao a visada e a propria
      // posicao normalizada e invertida.
      const d = Math.hypot(base[0], base[1], base[2]) || 1
      visada[0] = -base[0] / d
      visada[1] = -base[1] / d
      visada[2] = -base[2] / d
    },

    aplicar(camera) {
      const s = trauma * trauma
      // Duas senoides de frequencia incomensuravel no lugar de ruido aleatorio:
      // sorteio por quadro vira chuvisco, isto vira vibracao.
      const ox = Math.sin(real * 47.0) * s * 0.22
      const oy = Math.sin(real * 61.3 + 1.7) * s * 0.22
      camera.position.set(
        base[0] + visada[0] * empurrao + ox,
        base[1] + visada[1] * empurrao + oy,
        base[2] + visada[2] * empurrao,
      )
    },
  }
}
