/**
 * MISSAO TI :: primitivos visuais do HUD.
 *
 * Linguagem de painel tecnico: cantoneiras, microtexto, filetes e luzes de
 * atividade. Hierarquia vem daqui, nao de fazer tudo brilhar ao mesmo tempo.
 */
import { type ReactNode, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/** Cantoneiras em L. E o detalhe que separa "painel tecnico" de "card". */
function Brackets({ color = 'var(--color-cyan-deep)' }: { color?: string }) {
  const base: CSSProperties = { position: 'absolute', width: 14, height: 14, borderColor: color }
  return (
    <>
      <span style={{ ...base, top: -1, left: -1, borderTop: '2px solid', borderLeft: '2px solid' }} />
      <span style={{ ...base, top: -1, right: -1, borderTop: '2px solid', borderRight: '2px solid' }} />
      <span style={{ ...base, bottom: -1, left: -1, borderBottom: '2px solid', borderLeft: '2px solid' }} />
      <span style={{ ...base, bottom: -1, right: -1, borderBottom: '2px solid', borderRight: '2px solid' }} />
    </>
  )
}

export function Panel({
  children, className, tone = 'neutral', bare = false,
}: {
  children: ReactNode
  className?: string
  tone?: 'neutral' | 'cyan' | 'green' | 'red' | 'yellow'
  bare?: boolean
}) {
  const edge = {
    neutral: 'var(--color-cyan-deep)',
    cyan: 'var(--color-cyan-core)',
    green: 'var(--color-signal-green)',
    red: 'var(--color-signal-red)',
    yellow: 'var(--color-signal-yellow)',
  }[tone]

  return (
    <div
      className={cn('relative', className)}
      style={{
        // Indigo da marca com transparencia, e canto chanfrado no lugar do
        // retangulo: e o chanfro que tira o ar de card de dashboard.
        background: 'linear-gradient(160deg, rgba(22,26,86,.62), rgba(8,11,30,.88))',
        border: `1px solid ${tone === 'neutral' ? 'rgba(33,200,246,.22)' : edge}`,
        clipPath: 'var(--notch)',
        backdropFilter: 'blur(3px)',
      }}
    >
      {!bare && <Brackets color={edge} />}
      {children}
    </div>
  )
}

/** Rotulo tecnico: pequeno, espacado, sempre caixa alta. */
export function HudLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn('block uppercase', className)}
      style={{
        fontFamily: 'var(--font-display)',
        // 13px e nao 11: o estande roda num monitor de 24 polegadas a 1080p,
        // onde 1px tem 0,28mm. A 11px o rotulo tinha 3mm de altura, que se
        // le de perto e some para quem joga em pe, a meio metro da tela.
        fontSize: 13,
        letterSpacing: '.16em',
        color: 'var(--color-label)',
      }}
    >
      {children}
    </span>
  )
}

/** Luz de atividade. Sinal de que existe um sistema rodando por tras. */
export function Dot({ on = true, color = 'var(--color-cyan-core)', delay = 0 }) {
  return (
    <span
      style={{
        width: 6, height: 6, borderRadius: 99, display: 'inline-block',
        background: on ? color : 'var(--color-ink-500)',
        boxShadow: on ? `0 0 8px ${color}` : 'none',
        animation: on ? `hud-pulse 2.4s ${delay}s infinite` : 'none',
      }}
    />
  )
}

/** Filete horizontal com um degrade que morre nas pontas. */
export function Rule({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-px w-full', className)}
      style={{ background: 'linear-gradient(90deg, transparent, rgba(21,199,255,.35), transparent)' }}
    />
  )
}
