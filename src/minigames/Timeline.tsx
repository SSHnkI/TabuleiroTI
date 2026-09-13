/**
 * MISSAO TI :: desafio 3, LINHA DO TEMPO.
 *
 * No prototipo isto era "qual etapa falhou?" com quatro letras. Escolher
 * entre A, B, C e D permite acertar no chute com 25% de chance, e um jogo
 * onde o chute paga bem nao produz ranking, produz empate.
 *
 * Aqui a nota e proporcional a precisao: arrastar o marcador ate o instante
 * exato vale 25 pontos, errar por cinco minutos vale alguma coisa, errar por
 * oito nao vale nada. Isso espalha as pontuacoes e cria disputa de verdade.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Clock, Crosshair } from 'lucide-react'
import { HudLabel, Panel } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import type { TimelineCase } from '@/game/content.ts'
import { precisionRatio } from '@/game/scoring.ts'
import { useFx } from '@/visual/Fx.tsx'

const clockLabel = (minutes: number, startMinute: number) => {
  const total = startMinute + minutes
  const h = Math.floor(total / 60) % 24
  const m = Math.round(total % 60)
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}

export function Timeline({ timeline, secondsLeft, onDone }: {
  timeline: TimelineCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const trackRef = useRef<HTMLDivElement>(null)
  const { events, span, startMinute, perfect, zero } = timeline
  const truth = events.find(e => e.failure)!.at
  const clock = (m: number) => clockLabel(m, startMinute)
  const endLabel = clockLabel(span, startMinute)
  const [at, setAt] = useState(span / 2)
  const [locked, setLocked] = useState(false)
  const finished = useRef(false)

  function finish(ratio: number) {
    if (finished.current) return
    finished.current = true
    onDone(ratio)
  }

  useEffect(() => {
    if (secondsLeft <= 0 && !locked) confirm()
  }, [secondsLeft])

  /** Converte a posicao do dedo em minuto da janela. */
  function fromPointer(clientX: number) {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    setAt(Math.round(pct * span * 10) / 10)
  }

  function down(e: React.PointerEvent) {
    if (locked) return
    // Captura: o dedo precisa poder sair da trilha sem largar o marcador.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* segue sem captura */ }
    fromPointer(e.clientX)
  }

  function move(e: React.PointerEvent) {
    if (locked || e.buttons === 0 && e.pointerType === 'mouse') return
    if (e.pressure === 0 && e.pointerType !== 'mouse') return
    fromPointer(e.clientX)
  }

  function confirm() {
    if (locked || finished.current) return
    setLocked(true)
    const ratio = precisionRatio(at, truth, perfect, zero)
    if (ratio > 0.4) fx.hit(); else fx.miss()
    setTimeout(() => finish(ratio), 1400)
  }

  const pct = (at / span) * 100
  const truthPct = (truth / span) * 100
  const ratio = precisionRatio(at, truth, perfect, zero)

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] px-4 amplo:px-12 pb-8">
      <div className="flex items-center gap-3 pb-4">
        <Clock size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
        <p className="text-[19px]">
          {timeline.question}{' '}
          <span style={{ color: 'var(--color-cyan-bright)' }}>Arraste o marcador.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-4 amplo:grid-cols-[1.4fr_.6fr] amplo:gap-10">
        {/* --------------------------------------------------------- trilha */}
        <div>
          <div
            ref={trackRef}
            onPointerDown={down}
            onPointerMove={move}
            className="relative h-48 cursor-ew-resize select-none"
            style={{ touchAction: 'none' }}
          >
            {/* eixo */}
            <div
              className="absolute inset-x-0 top-1/2 h-px"
              style={{ background: 'rgba(21,199,255,.3)' }}
            />

            {/* eventos do log */}
            {events.map((ev, i) => (
              <div
                key={ev.label}
                className="absolute top-1/2"
                style={{ left: (ev.at / span) * 100 + '%', translate: '-50% -50%' }}
              >
                <div
                  className="mx-auto h-3 w-3"
                  style={{
                    background: locked && ev.failure ? 'var(--color-signal-red)' : 'var(--color-cyan-deep)',
                    boxShadow: locked && ev.failure ? 'var(--glow-red)' : 'none',
                    rotate: '45deg',
                  }}
                />
                {/* Alterna a altura do rotulo: os tres ultimos eventos estao
                    a um minuto um do outro numa janela de trinta, e na mesma
                    linha eles se sobrepoem e viram borrao. */}
                <div
                  className="tnum absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px]"
                  style={{ color: 'var(--color-micro)', top: i % 2 === 0 ? 20 : 40 }}
                >
                  {ev.label}
                </div>
                {i % 2 === 1 && (
                  <div
                    className="absolute left-1/2 top-3 h-5 w-px -translate-x-1/2"
                    style={{ background: 'rgba(21,199,255,.25)' }}
                  />
                )}
              </div>
            ))}

            {/* Onde estava a verdade. So aparece depois de confirmar. */}
            {locked && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
                className="absolute inset-y-6 w-px"
                style={{ left: truthPct + '%', background: 'var(--color-signal-red)', boxShadow: 'var(--glow-red)' }}
              />
            )}

            {/* marcador */}
            <motion.div
              className="absolute inset-y-0"
              style={{ left: pct + '%', translate: '-50% 0' }}
              animate={{ left: pct + '%' }}
              transition={{ type: 'spring', stiffness: 700, damping: 40 }}
            >
              <div
                className="mx-auto h-full w-0.5"
                style={{
                  background: locked ? 'var(--color-signal-green)' : 'var(--color-cyan-bright)',
                  boxShadow: locked ? 'var(--glow-green)' : 'var(--glow-cyan)',
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                style={{
                  border: '2px solid ' + (locked ? 'var(--color-signal-green)' : 'var(--color-cyan-bright)'),
                  background: 'rgba(1,6,13,.85)',
                  boxShadow: locked ? 'var(--glow-green)' : 'var(--glow-cyan)',
                }}
              >
                <Crosshair size={26} strokeWidth={1.5} />
              </div>
              <div
                className="tnum absolute left-1/2 -top-2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[17px]"
                style={{
                  background: 'var(--color-cyan-core)', color: '#01060D', fontWeight: 700,
                }}
              >
                {clock(at)}
              </div>
            </motion.div>
          </div>

          <div className="mt-2 flex justify-between">
            <HudLabel>{timeline.startLabel}</HudLabel>
            <HudLabel>{endLabel}</HudLabel>
          </div>
        </div>

        {/* ----------------------------------------------------------- logs */}
        <Panel className="p-6">
          <HudLabel className="mb-3">Registro do sistema</HudLabel>
          <ol className="space-y-3">
            {events.map(ev => (
              <li key={ev.label} className="flex gap-3 text-[14px] leading-snug">
                <span className="tnum shrink-0" style={{ color: 'var(--color-cyan-core)' }}>{ev.label}</span>
                <span style={{ color: locked && ev.failure ? 'var(--color-signal-red)' : 'var(--color-label)' }}>
                  {ev.detail}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="flex items-center justify-center gap-6 pt-4">
        {locked ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
                color: ratio > 0.4 ? 'var(--color-signal-green)' : 'var(--color-signal-red)',
              }}
            >
              {ratio >= 1 ? 'no ponto exato' : ratio > 0.4 ? 'quase lá' : 'longe do alvo'}
            </div>
            <p className="mt-1 max-w-xl text-[15px]" style={{ color: 'var(--color-label)' }}>
              {timeline.answer}
            </p>
          </motion.div>
        ) : (
          <BigButton onTap={confirm} tone="success" className="min-w-[320px]">
            CONFIRMAR ESTE INSTANTE
          </BigButton>
        )}
      </div>
    </div>
  )
}
