/**
 * MISSAO TI :: TRIAGEM DE CHAMADOS.
 *
 * Chega um chamado por vez e o jogador toca na prioridade. E o desafio mais
 * util do jogo para quem trabalha na empresa: a maior parte das reclamacoes
 * sobre TI nasce de expectativa de prioridade, nao de competencia tecnica.
 * Depois de jogar, a pessoa entende por que o mouse duro espera e o servidor
 * fora do ar nao.
 *
 * Tres alvos enormes e fixos na mesma posicao: em quiosque, alvo que muda de
 * lugar a cada rodada faz o dedo errar.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Inbox } from 'lucide-react'
import { HudLabel, Panel } from '@/components/hud'
import { PRIORITY_INFO, type Priority, type Ticket } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'

const ORDER: Priority[] = ['P1', 'P2', 'P3']

export function Triagem({ tickets, secondsLeft, onDone, onPenalty }: {
  tickets: Ticket[]
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<{ ok: boolean; why: string } | null>(null)
  const finished = useRef(false)
  const correctRef = useRef(0)

  const ticket = tickets[index]

  function finish() {
    if (finished.current) return
    finished.current = true
    onDone(correctRef.current / tickets.length)
  }

  useEffect(() => { if (secondsLeft <= 0) finish() }, [secondsLeft])

  function answer(p: Priority) {
    if (finished.current || feedback || !ticket) return
    const ok = p === ticket.priority

    if (ok) {
      correctRef.current += 1
      setCorrect(correctRef.current)
      fx.hit()
    } else {
      fx.miss()
      onPenalty()
    }

    // O porque aparece SEMPRE, acertando ou errando. O jogo existe para
    // ensinar a regra de prioridade, e so o placar nao ensina nada.
    setFeedback({ ok, why: ticket.why })
    setTimeout(() => {
      setFeedback(null)
      if (index + 1 >= tickets.length) finish()
      else setIndex(i => i + 1)
    }, 1100)
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] px-4 amplo:px-12 pb-8">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <Inbox size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <p className="text-[19px]">
            Quando isto precisa ser resolvido?
          </p>
        </div>
        <div className="text-right">
          <HudLabel>Fila</HudLabel>
          <span className="tnum text-[19px]">{Math.min(index + 1, tickets.length)}/{tickets.length}</span>
        </div>
      </div>

      {/* ------------------------------------------------------- o chamado */}
      <div className="grid place-items-center">
        <AnimatePresence mode="wait">
          {ticket && (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 26, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -26, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-3xl"
            >
              <Panel className="px-4 amplo:px-10 py-9" tone={feedback ? (feedback.ok ? 'green' : 'red') : 'cyan'}>
                <HudLabel className="mb-3">Chamado aberto agora</HudLabel>
                <p style={{ fontSize: 'clamp(14px, 3.73vw, 30px)', lineHeight: 1.3 }}>{ticket.text}</p>

                <AnimatePresence>
                  {feedback && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-5 border-l-2 pl-4 text-[16px] leading-snug"
                      style={{
                        borderColor: feedback.ok ? 'var(--color-signal-green)' : 'var(--color-signal-red)',
                        color: 'var(--color-label)',
                      }}
                    >
                      <b style={{ color: feedback.ok ? 'var(--color-signal-green)' : 'var(--color-signal-red)' }}>
                        {feedback.ok ? 'Isso. ' : 'Era ' + ticket.priority + '. '}
                      </b>
                      {feedback.why}
                    </motion.p>
                  )}
                </AnimatePresence>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --------------------------------------------------- as prioridades */}
      <div className="grid grid-cols-3 gap-5 pt-5">
        {ORDER.map(p => {
          const info = PRIORITY_INFO[p]
          const revealed = feedback && ticket?.priority === p
          return (
            <button
              key={p}
              type="button"
              data-touch-target
              onPointerDown={() => answer(p)}
              className="px-6 py-6 text-left outline-none"
              style={{
                border: '1px solid ' + (revealed ? info.color : info.color + '55'),
                background: revealed ? info.color + '26' : 'rgba(4,18,31,.72)',
                boxShadow: revealed ? '0 0 26px ' + info.color + '60' : 'none',
                transition: 'all .2s var(--ease-out)',
                opacity: feedback && !revealed ? 0.4 : 1,
              }}
            >
              <span
                className="block uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 21, letterSpacing: '.08em', color: info.color,
                }}
              >
                {info.label}
              </span>
              <span className="mt-1 block text-[14px]" style={{ color: 'var(--color-micro)' }}>
                {info.hint}
              </span>
            </button>
          )
        })}
      </div>

      <div className="pt-3 text-center">
        <HudLabel>Acertos: {correct} de {tickets.length}</HudLabel>
      </div>
    </div>
  )
}
