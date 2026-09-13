/**
 * MISSAO TI :: CACA AO PHISHING.
 *
 * O e-mail aparece inteiro e o dedo toca nos indicios de golpe. Nao e
 * "este e-mail e falso, sim ou nao": e apontar ONDE esta a pista, que e o
 * que a pessoa precisa saber fazer na caixa de entrada dela na segunda-feira.
 *
 * Errar custa tempo, e o acerto revela o porque na hora. O objetivo e que
 * quem sai da fila saiba reconhecer domínio trocado, urgencia fabricada e
 * extensao disfarcada.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MailWarning, Paperclip, Link2, ShieldAlert } from 'lucide-react'
import { HudLabel, Panel } from '@/components/hud'
import type { EmailPart, PhishingCase } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'
import { useStuck, StuckHint } from '@/components/StuckHint'

const ICON: Partial<Record<EmailPart['role'], typeof Link2>> = {
  link: Link2,
  anexo: Paperclip,
}

export function Phishing({ email, secondsLeft, onDone, onPenalty }: {
  email: PhishingCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const parts = email.parts
  const alvos = parts.filter(p => p.suspicious).length
  const [found, setFound] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const finished = useRef(false)
  const travado = useStuck(found.length, 11000)

  function finish(ratio: number) {
    if (finished.current) return
    finished.current = true
    onDone(ratio)
  }

  useEffect(() => {
    if (secondsLeft <= 0) finish(found.length / alvos)
  }, [secondsLeft, found.length])

  function tap(e: React.PointerEvent, part: EmailPart) {
    if (finished.current || found.includes(part.id)) return

    if (part.suspicious) {
      const next = [...found, part.id]
      setFound(next)
      fx.hit()
      fx.score(1, e.clientX, e.clientY)
      if (next.length >= alvos) setTimeout(() => finish(1), 800)
    } else {
      setWrong(part.id)
      setTimeout(() => setWrong(null), 600)
      fx.miss()
      onPenalty()
    }
  }

  return (
    <div className="desafio-2 grid h-full grid-cols-1 items-center gap-4 px-4 pb-4 amplo:grid-cols-[1.3fr_.7fr] amplo:gap-10 amplo:px-12 amplo:pb-8">
      {/* ---------------------------------------------------------- o e-mail */}
      <Panel className="p-7" tone="cyan">
        <div className="mb-4 flex items-center justify-between">
          <HudLabel>Mensagem recebida</HudLabel>
          <span
            className="px-3 py-1 text-[11px] uppercase tracking-widest"
            style={{ color: 'var(--color-signal-yellow)', border: '1px solid var(--color-signal-yellow)' }}
          >
            não verificado
          </span>
        </div>

        <div className="space-y-2">
          {parts.map(part => {
            const hit = found.includes(part.id)
            const bad = wrong === part.id
            const Icon = ICON[part.role]
            return (
              <button
                key={part.id}
                type="button"
                data-touch-target
                onPointerDown={e => tap(e, part)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none"
                style={{
                  border: '1px solid ' + (hit ? 'var(--color-signal-green)' : bad ? 'var(--color-signal-red)' : 'transparent'),
                  background: hit
                    ? 'rgba(37,223,160,.14)'
                    : bad ? 'rgba(255,83,96,.18)' : 'rgba(255,255,255,.025)',
                  boxShadow: hit ? 'var(--glow-green)' : bad ? 'var(--glow-red)' : 'none',
                  transition: 'all .18s var(--ease-out)',
                }}
              >
                <span className="w-28 shrink-0 pt-0.5">
                  <HudLabel>{part.label}</HudLabel>
                </span>
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  {Icon && (
                    <Icon size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--color-micro)' }} />
                  )}
                  <span
                    className="min-w-0 break-words"
                    style={{
                      fontFamily: part.role === 'de' || part.role === 'link' || part.role === 'anexo'
                        ? 'var(--font-mono)' : 'var(--font-sans)',
                      fontSize: part.role === 'assunto' ? 19 : 16,
                      lineHeight: 1.4,
                      color: hit ? 'var(--color-signal-green)' : '#DCEEF8',
                    }}
                  >
                    {part.text}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* -------------------------------------------------------- instrucao */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <MailWarning size={30} strokeWidth={1.5} style={{ color: 'var(--color-signal-yellow)' }} />
          <HudLabel>Análise</HudLabel>
        </div>

        <p className="mb-6 text-[21px] leading-snug">
          Este e-mail é golpe.
          <br />
          <span style={{ color: 'var(--color-cyan-bright)' }}>
            {alvos} coisas aqui entregam isso.
          </span>
        </p>

        <div className="mb-6 flex gap-3">
          {Array.from({ length: alvos }, (_, i) => (
            <div
              key={i}
              className="grid h-14 w-14 place-items-center"
              style={{
                border: '1px solid ' + (i < found.length ? 'var(--color-signal-green)' : 'rgba(21,199,255,.2)'),
                background: i < found.length ? 'rgba(37,223,160,.14)' : 'transparent',
                boxShadow: i < found.length ? 'var(--glow-green)' : 'none',
                transition: 'all .25s var(--ease-out)',
              }}
            >
              {i < found.length
                ? <ShieldAlert size={22} style={{ color: 'var(--color-signal-green)' }} />
                : <span style={{ color: 'var(--color-micro)', fontSize: 20 }}>?</span>}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <StuckHint show={travado && found.length < alvos}>
            Olhe com calma quem enviou, e para onde os links levam.
          </StuckHint>
        </div>

        <div className="min-h-[150px] space-y-3">
          <AnimatePresence>
            {parts.filter(p => found.includes(p.id)).map(p => (
              <motion.p
                key={p.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-l-2 pl-4 text-[15px] leading-snug"
                style={{ borderColor: 'var(--color-signal-green)', color: 'var(--color-label)' }}
              >
                <b style={{ color: 'var(--color-signal-green)' }}>{p.label}:</b> {p.why}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
