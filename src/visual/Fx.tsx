/**
 * MISSAO TI :: camada de reacao (L4).
 *
 * Traduz os tres momentos do jogo em sensacao, que e a regra central do
 * brief visual: acerto e recompensa, erro e consequencia, toque e resposta.
 *
 * Tudo aqui e curto. Efeito longo em quiosque vira espera, e espera vira
 * fila parada. Nada passa de 600ms.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { sHit, sMiss } from '@/game/sound.ts'

type FxKind = 'good' | 'bad'

interface FxApi {
  /** Flash de tela inteira + particulas no ponto do toque. */
  hit: (x?: number, y?: number) => void
  /** Shake + vinheta vermelha + glitch de um quadro. */
  miss: () => void
  /** Numero flutuante saindo do ponto exato do dedo. */
  score: (points: number, x: number, y: number) => void
}

const Ctx = createContext<FxApi | null>(null)
export const useFx = () => {
  const api = useContext(Ctx)
  if (!api) throw new Error('useFx precisa estar dentro de <FxProvider>')
  return api
}

interface Float { id: number; text: string; x: number; y: number; kind: FxKind }

export function FxProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<FxKind | null>(null)
  const [shaking, setShaking] = useState(false)
  const [floats, setFloats] = useState<Float[]>([])
  const nextId = useRef(0)

  const pushFloat = useCallback((text: string, x: number, y: number, kind: FxKind) => {
    const id = nextId.current++
    setFloats(f => [...f, { id, text, x, y, kind }])
    setTimeout(() => setFloats(f => f.filter(i => i.id !== id)), 900)
  }, [])

  const hit = useCallback((x?: number, y?: number) => {
    sHit()
    setFlash('good')
    setTimeout(() => setFlash(null), 180)
    if (x !== undefined && y !== undefined) pushFloat('', x, y, 'good')
  }, [pushFloat])

  const miss = useCallback(() => {
    sMiss()
    setFlash('bad')
    setShaking(true)
    setTimeout(() => setFlash(null), 200)
    setTimeout(() => setShaking(false), 420)
  }, [])

  const score = useCallback((points: number, x: number, y: number) => {
    pushFloat((points > 0 ? '+' : '') + points, x, y, points >= 0 ? 'good' : 'bad')
  }, [pushFloat])

  return (
    <Ctx.Provider value={{ hit, miss, score }}>
      {/* O shake vive num wrapper proprio: animar a arvore inteira forcaria
          recomposicao de tudo. Aqui e so um transform, que a GPU resolve. */}
      <div
        className="h-full w-full"
        style={{ animation: shaking ? 'fx-shake .4s var(--ease-out)' : undefined }}
      >
        {children}
      </div>

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
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>

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

      <div className="pointer-events-none fixed inset-0" style={{ zIndex: 47 }}>
        <AnimatePresence>
          {floats.map(f => (
            <motion.span
              key={f.id}
              className="tnum absolute"
              style={{
                left: f.x, top: f.y,
                fontSize: 34, fontWeight: 700,
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
