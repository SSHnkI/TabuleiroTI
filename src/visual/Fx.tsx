/**
 * MISSAO TI :: camada de reacao (L4).
 *
 * Traduz os tres momentos do jogo em sensacao, que e a regra central do
 * brief visual: acerto e recompensa, erro e consequencia, toque e resposta.
 *
 * Tudo aqui e curto. Efeito longo em quiosque vira espera, e espera vira
 * fila parada. Nada passa de 600ms.
 *
 * Os cinco desafios em 3D tem impacto proprio dentro da cena (congelamento
 * de quadro, tranco de camera, destrocos em voxel). Os outros sete vivem no
 * DOM e nao tem cena onde estourar nada. Entao o estrago deles mora AQUI, e
 * como todos passam por fx.hit(), arrumar este arquivo arruma os doze de uma
 * vez: estilhaco no ponto do dedo, onda de choque e a escalada do combo.
 */
import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { sHit, sMiss, sCombo } from '@/game/sound.ts'

type FxKind = 'good' | 'bad'

interface FxApi {
  /** Flash de tela + estilhaco no ponto do toque + degrau de combo. */
  hit: (x?: number, y?: number) => void
  /** Shake + vinheta vermelha + glitch de um quadro. Quebra o combo. */
  miss: (x?: number, y?: number) => void
  /** Numero flutuante saindo do ponto exato do dedo. */
  score: (points: number, x: number, y: number) => void
  /** Zera a escalada. Cada desafio comeca do chao. */
  zerarCombo: () => void
}

const Ctx = createContext<FxApi | null>(null)
export const useFx = () => {
  const api = useContext(Ctx)
  if (!api) throw new Error('useFx precisa estar dentro de <FxProvider>')
  return api
}

interface Float { id: number; text: string; x: number; y: number; kind: FxKind }
interface Onda { id: number; x: number; y: number; kind: FxKind }

/** A partir daqui o combo aparece na tela. Dois acertos seguidos e sorte. */
const COMBO_VISIVEL = 3

/* ===================================================================== nacos
   Estilhaco em Canvas 2D: o equivalente plano dos destrocos em voxel das
   cenas 3D. Um canvas so, um laco que so existe enquanto ha caco vivo. */

interface Caco {
  x: number; y: number; vx: number; vy: number
  vida: number; vidaMax: number; tam: number; cor: string
}

function usarCacos() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cacos = useRef<Caco[]>([])
  const raf = useRef(0)
  const ultimo = useRef(0)

  const passo = useCallback((agora: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) { raf.current = 0; return }

    const dt = Math.min(0.05, (agora - ultimo.current) / 1000)
    ultimo.current = agora

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    if (canvas.width !== Math.floor(w * dpr)) {
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // Soma luz em vez de tapar: caco e brilho, nao objeto.
    ctx.globalCompositeOperation = 'lighter'

    const vivos: Caco[] = []
    for (const c of cacos.current) {
      c.vy += 1900 * dt
      c.vx *= 1 - Math.min(1, dt * 1.6)
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.vida -= dt
      if (c.vida <= 0) continue
      const f = c.vida / c.vidaMax
      ctx.globalAlpha = Math.min(1, f * 1.6)
      const s = c.tam * (f > 0.4 ? 1 : f / 0.4)
      ctx.fillStyle = c.cor
      ctx.fillRect(c.x - s / 2, c.y - s / 2, s, s)
      vivos.push(c)
    }
    cacos.current = vivos
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    // O laco existe so enquanto ha caco. Nada roda de graca durante a partida.
    raf.current = vivos.length ? requestAnimationFrame(passo) : 0
  }, [])

  const estilhacar = useCallback((x: number, y: number, cor: string, n: number, forca: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = (90 + Math.random() * 240) * forca
      cacos.current.push({
        x, y,
        vx: Math.cos(a) * v,
        // Viés para cima: caco que so espalma no plano parece poeira.
        vy: Math.sin(a) * v - 160 * forca,
        vidaMax: 0.45 + Math.random() * 0.4,
        vida: 0.45 + Math.random() * 0.4,
        tam: 4 + Math.random() * 7,
        cor,
      })
    }
    if (!raf.current) {
      ultimo.current = performance.now()
      raf.current = requestAnimationFrame(passo)
    }
  }, [passo])

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  return { canvasRef, estilhacar }
}

/* ================================================================ provedor */

export function FxProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<FxKind | null>(null)
  const [shaking, setShaking] = useState(false)
  const [floats, setFloats] = useState<Float[]>([])
  const [ondas, setOndas] = useState<Onda[]>([])
  const [combo, setCombo] = useState(0)
  const nextId = useRef(0)
  const comboRef = useRef(0)
  const { canvasRef, estilhacar } = usarCacos()

  // Onde o dedo encostou por ultimo. Assim fx.hit() sem coordenada ainda
  // sabe onde estourar, e nenhum dos doze desafios precisou mudar de
  // assinatura para ganhar estilhaco.
  const ultimoToque = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const ver = (e: PointerEvent) => { ultimoToque.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('pointerdown', ver, { capture: true })
    return () => window.removeEventListener('pointerdown', ver, { capture: true })
  }, [])

  const pushFloat = useCallback((text: string, x: number, y: number, kind: FxKind) => {
    const id = nextId.current++
    setFloats(f => [...f, { id, text, x, y, kind }])
    setTimeout(() => setFloats(f => f.filter(i => i.id !== id)), 900)
  }, [])

  const pushOnda = useCallback((x: number, y: number, kind: FxKind) => {
    const id = nextId.current++
    setOndas(o => [...o, { id, x, y, kind }])
    setTimeout(() => setOndas(o => o.filter(i => i.id !== id)), 620)
  }, [])

  const hit = useCallback((x?: number, y?: number) => {
    const px = x ?? ultimoToque.current?.x ?? window.innerWidth / 2
    const py = y ?? ultimoToque.current?.y ?? window.innerHeight / 2

    const n = comboRef.current + 1
    comboRef.current = n
    setCombo(n)

    sHit()
    // Primeiro acerto e o degrau zero: a escada so sobe com sequencia.
    sCombo(n - 1)

    setFlash('good')
    setTimeout(() => setFlash(null), 180)

    pushOnda(px, py, 'good')
    // A rajada engorda com o combo: a recompensa precisa crescer junto,
    // senao o decimo acerto sente igual ao primeiro.
    estilhacar(px, py, '#25DFA0', 14 + Math.min(16, n * 2), 1 + Math.min(0.8, n * 0.1))
  }, [estilhacar, pushOnda])

  const miss = useCallback((x?: number, y?: number) => {
    const px = x ?? ultimoToque.current?.x ?? window.innerWidth / 2
    const py = y ?? ultimoToque.current?.y ?? window.innerHeight / 2

    comboRef.current = 0
    setCombo(0)

    sMiss()
    setFlash('bad')
    setShaking(true)
    setTimeout(() => setFlash(null), 200)
    setTimeout(() => setShaking(false), 420)

    pushOnda(px, py, 'bad')
    estilhacar(px, py, '#FF3F2E', 10, 0.7)
  }, [estilhacar, pushOnda])

  const score = useCallback((points: number, x: number, y: number) => {
    pushFloat((points > 0 ? '+' : '') + points, x, y, points >= 0 ? 'good' : 'bad')
  }, [pushFloat])

  const zerarCombo = useCallback(() => {
    comboRef.current = 0
    setCombo(0)
  }, [])

  return (
    <Ctx.Provider value={{ hit, miss, score, zerarCombo }}>
      {/* O shake vive num wrapper proprio: animar a arvore inteira forcaria
          recomposicao de tudo. Aqui e so um transform, que a GPU resolve. */}
      <div
        className="h-full w-full"
        style={{ animation: shaking ? 'fx-shake .4s var(--ease-out)' : undefined }}
      >
        {children}
      </div>

      {/* Cacos. Fica abaixo do flash e acima do conteudo. */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ zIndex: 44 }}
        aria-hidden
      />

      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash}
            className="pointer-events-none fixed inset-0"
            style={{
              zIndex: 45,
              background: flash === 'good'
                ? 'radial-gradient(ellipse at center, rgba(37,223,160,.22), transparent 65%)'
                : 'radial-gradient(ellipse at center, transparent 35%, rgba(255,83,96,.34))',
              mixBlendMode: 'screen',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: flash === 'good' ? 1 + Math.min(0.6, combo * 0.12) : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>

      {/* Onda de choque no ponto do dedo. Impacto acontece ONDE a pessoa
          tocou, nao no meio da tela. */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 46 }}>
        <AnimatePresence>
          {ondas.map(o => (
            <motion.span
              key={o.id}
              className="absolute block rounded-full"
              style={{
                left: o.x, top: o.y, width: 40, height: 40, translate: '-50% -50%',
                border: '2px solid ' + (o.kind === 'good'
                  ? 'var(--color-signal-green)'
                  : 'var(--color-signal-red)'),
                boxShadow: o.kind === 'good' ? 'var(--glow-green)' : 'var(--glow-red)',
              }}
              initial={{ opacity: 0.9, scale: 0.2 }}
              animate={{ opacity: 0, scale: 3.4 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Glitch de UM quadro no erro. Um quadro de distorcao diz
          "consequencia" melhor que meio segundo de animacao. */}
      {shaking && (
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            zIndex: 46,
            animation: 'fx-glitch .22s steps(3) 1',
            background: 'repeating-linear-gradient(0deg, rgba(255,83,96,.08) 0 2px, transparent 2px 5px)',
          }}
        />
      )}

      {/* Selo de combo. So aparece quando ja e sequencia de verdade.
          Encostado na direita, abaixo do placar: no centro ele tapava a barra
          de sistema restaurado, que e informacao que o jogador precisa ver. */}
      <div
        className="pointer-events-none fixed flex justify-end"
        style={{ zIndex: 47, top: 116, right: 40 }}
      >
        <AnimatePresence>
          {combo >= COMBO_VISIVEL && (
            <motion.div
              key={combo}
              className="flex items-baseline gap-2 px-5 py-2"
              style={{
                clipPath: 'var(--notch)',
                background: 'rgba(8,11,30,.82)',
                border: '1px solid var(--color-signal-yellow)',
                boxShadow: 'var(--glow-yellow)',
              }}
              initial={{ opacity: 0, scale: 1.5, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 15,
                  letterSpacing: '.22em', color: 'var(--color-label)',
                }}
              >
                sequência
              </span>
              <span
                className="tnum"
                style={{
                  fontSize: 'clamp(14px, 3.73vw, 30px)', fontWeight: 700,
                  color: 'var(--color-signal-yellow)',
                  textShadow: 'var(--glow-yellow)',
                }}
              >
                ×{combo}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 47 }}>
        <AnimatePresence>
          {floats.map(f => (
            <motion.span
              key={f.id}
              className="tnum absolute"
              style={{
                left: f.x, top: f.y,
                fontSize: 'clamp(15px, 4vw, 34px)', fontWeight: 700,
                color: f.kind === 'good' ? 'var(--color-signal-yellow)' : 'var(--color-signal-red)',
                textShadow: f.kind === 'good' ? 'var(--glow-yellow)' : 'var(--glow-red)',
                translate: '-50% -50%',
              }}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -68, scale: 1 }}
              exit={{ opacity: 0, y: -96, scale: 0.9 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            >
              {f.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
