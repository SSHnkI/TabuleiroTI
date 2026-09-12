/**
 * MISSAO TI :: o botao do quiosque.
 *
 * Tres regras que nao se negociam, e todas vieram de problemas reais da
 * edicao anterior:
 *  1. dispara no `pointerdown`, nao no clique: o clique so acontece depois
 *     do dedo levantar, e o atraso e lido como "a tela travou";
 *  2. trava por 300ms depois de disparar, porque tela capacitiva suja emite
 *     toque duplicado e isso virava resposta contada duas vezes;
 *  3. altura minima de 72px, porque quem joga esta em pe, com pressa, e com
 *     o dedo de lado.
 */
import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ButtonTone = 'primary' | 'ghost' | 'danger' | 'success'

const TONES: Record<ButtonTone, { bg: string; edge: string; ink: string; glow: string }> = {
  primary: {
    bg: 'linear-gradient(150deg, rgba(21,199,255,.22), rgba(10,110,146,.14))',
    edge: 'var(--color-cyan-core)', ink: '#EAFBFF', glow: 'var(--glow-cyan)',
  },
  ghost: {
    bg: 'linear-gradient(150deg, rgba(12,48,73,.5), rgba(4,18,31,.6))',
    edge: 'rgba(21,199,255,.28)', ink: '#BEDCEC', glow: 'none',
  },
  danger: {
    bg: 'linear-gradient(150deg, rgba(255,83,96,.2), rgba(70,15,22,.5))',
    edge: 'var(--color-signal-red)', ink: '#FFE6E8', glow: 'var(--glow-red)',
  },
  success: {
    bg: 'linear-gradient(150deg, rgba(37,223,160,.2), rgba(6,62,48,.5))',
    edge: 'var(--color-signal-green)', ink: '#E3FFF5', glow: 'var(--glow-green)',
  },
}

export const TAP_LOCK_MS = 300

export function BigButton({
  children, onTap, tone = 'primary', className, disabled, style, lockMs = TAP_LOCK_MS,
}: {
  children: ReactNode
  onTap: (e: React.PointerEvent<HTMLButtonElement>) => void
  tone?: ButtonTone
  className?: string
  disabled?: boolean
  style?: React.CSSProperties
  lockMs?: number
}) {
  const lockedUntil = useRef(0)
  const [pressed, setPressed] = useState(false)
  const t = TONES[tone]

  function handle(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return
    const now = performance.now()
    if (now < lockedUntil.current) return   // toque fantasma da tela suja
    lockedUntil.current = now + lockMs
    setPressed(true)
    setTimeout(() => setPressed(false), 120)
    onTap(e)
  }

  return (
    <button
      type="button"
      data-touch-target
      disabled={disabled}
      onPointerDown={handle}
      onPointerCancel={() => setPressed(false)}
      className={cn(
        'relative px-7 py-4 uppercase transition-transform outline-none',
        disabled && 'opacity-40',
        className,
      )}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '.1em',
        fontSize: 18,
        color: t.ink,
        background: t.bg,
        border: `1px solid ${t.edge}`,
        boxShadow: pressed ? 'none' : t.glow,
        transform: pressed ? 'scale(.97)' : 'scale(1)',
        transitionDuration: 'var(--dur-tap)',
        transitionTimingFunction: 'var(--ease-out)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
