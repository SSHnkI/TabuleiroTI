/**
 * MISSAO TI :: desafio 2, FLUXO DO PROCESSO.
 *
 * Tocar na ordem certa, NAO arrastar. Drag and drop e exatamente onde
 * touchscreen quebra, e foi parte do que deu errado na edicao anterior do
 * estande: o dedo sai do alvo, o navegador rouba o gesto, o item cai no
 * lugar errado e a pessoa acha que o jogo travou.
 *
 * As caixas ficam espalhadas de proposito. Enfileiradas, o desafio seria
 * ler de cima para baixo; espalhadas, e preciso entender o processo.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Workflow } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import type { FlowCase } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'
import { useStuck, StuckHint } from '@/components/StuckHint'

/** Posicoes em porcentagem do palco, uma lista por tamanho de processo.
 *  Espalhadas de proposito: enfileiradas, o desafio seria ler de cima para
 *  baixo em vez de entender o processo. */
const SPOTS_BY_LEN: Record<number, { x: number; y: number }[]> = {
  5: [{ x: 16, y: 26 }, { x: 50, y: 13 }, { x: 84, y: 30 }, { x: 72, y: 78 }, { x: 26, y: 74 }],
  6: [{ x: 14, y: 22 }, { x: 50, y: 12 }, { x: 84, y: 28 }, { x: 80, y: 72 }, { x: 46, y: 84 }, { x: 15, y: 66 }],
  7: [
    { x: 13, y: 20 }, { x: 40, y: 11 }, { x: 68, y: 18 }, { x: 87, y: 44 },
    { x: 72, y: 76 }, { x: 42, y: 86 }, { x: 14, y: 62 },
  ],
}

/** Embaralha qual etapa cai em qual posicao, para a ordem visual nao
 *  entregar a resposta. Ordem fixa por partida. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function Fluxo({ flow, secondsLeft, onDone, onPenalty }: {
  flow: FlowCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const stage = useRef<HTMLDivElement>(null)
  const steps = flow.steps
  const SPOTS = SPOTS_BY_LEN[steps.length] ?? SPOTS_BY_LEN[6]
  const [layout] = useState(() => shuffled(steps.map((s, i) => ({ step: s, order: i }))))
  const [done, setDone] = useState<number[]>([])   // indices de SPOTS ja ligados
  const [shakeAt, setShakeAt] = useState<number | null>(null)
  const finished = useRef(false)

  const nextOrder = done.length

  function finish(ratio: number) {
    if (finished.current) return
    finished.current = true
    onDone(ratio)
  }

  useEffect(() => {
    if (secondsLeft <= 0) finish(done.length / steps.length)
  }, [secondsLeft, done.length])

  function tap(e: React.PointerEvent, spotIndex: number, order: number) {
    if (finished.current || done.includes(spotIndex)) return

    if (order === nextOrder) {
      const next = [...done, spotIndex]
      setDone(next)
      fx.hit()
      fx.score(1, e.clientX, e.clientY)
      if (next.length === steps.length) setTimeout(() => finish(1), 650)
    } else {
      // Errar NAO zera o que ja foi ligado. Perder tudo por um toque errado
      // faria a pessoa desistir, e quem desiste no meio trava a fila.
      setShakeAt(spotIndex)
      setTimeout(() => setShakeAt(null), 420)
      fx.miss()
      onPenalty()
    }
  }

  // A dica da proxima etapa NAO fica na tela. Ela entregava a resposta de
  // graca e transformava o desafio em leitura. So aparece depois de 9
  // segundos parado no mesmo ponto.
  const travado = useStuck(done.length, 9000)
  const hint = steps[nextOrder]?.hint

  return (
    <div className="grid h-full grid-rows-[auto_1fr] px-12 pb-8">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Workflow size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <p className="text-[19px]">{flow.question}</p>
        </div>
        <div className="text-right">
          <HudLabel>Próxima etapa</HudLabel>
          <p className="tnum text-[15px]" style={{ color: 'var(--color-label)' }}>
            {nextOrder + 1} de {steps.length}
          </p>
        </div>
      </div>

      <div ref={stage} className="relative min-h-0">
        {/* Linha luminosa ligando as etapas ja acertadas, na ordem do toque. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {done.slice(1).map((spotIndex, i) => {
            const from = SPOTS[done[i]]
            const to = SPOTS[spotIndex]
            return (
              <motion.line
                key={spotIndex}
                x1={from.x + '%'} y1={from.y + '%'}
                x2={to.x + '%'} y2={to.y + '%'}
                stroke="var(--color-cyan-core)"
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ filter: 'drop-shadow(0 0 6px rgba(21,199,255,.8))' }}
              />
            )
          })}
        </svg>

        {layout.map((item, spotIndex) => {
          const spot = SPOTS[spotIndex]
          const lit = done.includes(spotIndex)
          const seq = done.indexOf(spotIndex)
          const bad = shakeAt === spotIndex
          return (
            <button
              key={item.step.id}
              type="button"
              data-touch-target
              onPointerDown={e => tap(e, spotIndex, item.order)}
              className="absolute px-6 py-4 outline-none"
              style={{
                left: spot.x + '%',
                top: spot.y + '%',
                translate: '-50% -50%',
                minWidth: 178,
                border: '1px solid ' + (lit ? 'var(--color-cyan-core)' : bad ? 'var(--color-signal-red)' : 'rgba(21,199,255,.2)'),
                background: lit
                  ? 'linear-gradient(160deg, rgba(21,199,255,.24), rgba(4,18,31,.9))'
                  : 'linear-gradient(160deg, rgba(7,32,51,.9), rgba(2,9,20,.94))',
                boxShadow: lit ? 'var(--glow-cyan)' : bad ? 'var(--glow-red)' : 'none',
                animation: bad ? 'fx-shake .4s var(--ease-out)' : undefined,
                transition: 'border-color .2s, box-shadow .2s, background .2s',
              }}
            >
              {lit && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="tnum absolute -left-3 -top-3 grid h-7 w-7 place-items-center text-[13px]"
                  style={{
                    background: 'var(--color-cyan-core)', color: '#01060D',
                    fontWeight: 700, boxShadow: 'var(--glow-cyan)',
                  }}
                >
                  {seq + 1}
                </motion.span>
              )}
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 17, letterSpacing: '.1em',
                  color: lit ? 'var(--color-cyan-bright)' : '#DCEEF8',
                }}
              >
                {item.step.label}
              </span>
            </button>
          )
        })}

        <div className="absolute inset-x-0 bottom-0">
          <StuckHint show={travado && Boolean(hint)}>{hint}</StuckHint>
        </div>
      </div>
    </div>
  )
}
