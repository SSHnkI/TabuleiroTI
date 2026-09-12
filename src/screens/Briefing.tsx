/**
 * MISSAO TI :: regras, entre os nomes e a partida.
 *
 * Tem que ser lida em oito segundos, em pe, por alguem que nunca viu o jogo.
 * Por isso sao TRES regras, nao um manual: a quarta regra ninguem le.
 *
 * Comeca sozinha em 12 segundos. Quem ja conhece toca e vai; quem esta lendo
 * nao e apressado por ninguem; e o quiosque nunca fica parado nesta tela com
 * fila atras.
 */
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Gauge, Timer, Zap, Users } from 'lucide-react'
import { HudLabel, Panel, Rule } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import {
  DIFFICULTY_LABEL, DIFFICULTY_POINTS, ERROR_TIME_PENALTY,
  ROUND_SHAPE, SCORE_MAX, TIME_BONUS_CAP, type GameMode,
} from '@/game/scoring.ts'
import type { Player } from '@/game/state.ts'
import { EASE_OUT } from '@/lib/ease'

const AUTO_SECONDS = 12

export function Briefing({ mode, players, onStart, onBack }: {
  mode: GameMode
  players: Player[]
  onStart: () => void
  onBack: () => void
}) {
  const [left, setLeft] = useState(AUTO_SECONDS)

  useEffect(() => {
    const id = setInterval(() => setLeft(s => (s <= 1 ? (onStart(), 0) : s - 1)), 1000)
    return () => clearInterval(id)
  }, [onStart])

  const revezando = mode === 'revezamento'

  const regras = [
    {
      icon: <Gauge size={30} strokeWidth={1.5} />,
      title: 'Quanto mais crítico, mais vale',
      text: 'São ' + ROUND_SHAPE.length + ' incidentes, do trivial ao crítico. Um incidente crítico vale '
        + DIFFICULTY_POINTS.critico + ' pontos; um trivial vale ' + DIFFICULTY_POINTS.facil + '.',
      tone: 'var(--color-signal-red)',
    },
    {
      icon: <Timer size={30} strokeWidth={1.5} />,
      title: 'Errar custa tempo, não ponto',
      text: 'Cada erro tira ' + ERROR_TIME_PENALTY + ' segundos do relógio. Nada trava, nada zera: pode continuar tentando.',
      tone: 'var(--color-signal-yellow)',
    },
    {
      icon: <Zap size={30} strokeWidth={1.5} />,
      title: 'Sobrar tempo vira ponto',
      text: 'O tempo que sobrar vira bônus, até ' + TIME_BONUS_CAP + ' pontos. Máximo da partida: ' + SCORE_MAX + '.',
      tone: 'var(--color-signal-green)',
    },
  ]

  return (
    <div className="grid h-full place-items-center px-12">
      <motion.div
        className="w-full max-w-5xl"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <div className="mb-8 text-center">
          <HudLabel className="mb-2">Instruções da missão</HudLabel>
          <h1
            className="uppercase"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(30px,4.4vw,52px)' }}
          >
            COMO FUNCIONA
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {regras.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.08, duration: 0.35, ease: EASE_OUT }}
            >
              <Panel className="h-full px-7 py-7">
                <span style={{ color: r.tone }}>{r.icon}</span>
                <h2
                  className="mb-2 mt-4"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, lineHeight: 1.2 }}
                >
                  {r.title}
                </h2>
                <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-label)' }}>
                  {r.text}
                </p>
              </Panel>
            </motion.div>
          ))}
        </div>

        {/* Regra do revezamento so aparece quando existe revezamento. Regra
            que nao se aplica ao seu caso e ruido, e ruido faz ninguem ler. */}
        {revezando && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="mt-5"
          >
            <Panel className="flex items-center gap-5 px-7 py-5" tone="cyan">
              <Users size={30} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
              <div className="min-w-0 flex-1">
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>
                  Cada incidente é de uma pessoa
                </h2>
                <p className="text-[15px]" style={{ color: 'var(--color-label)' }}>
                  A tela avisa de quem é a vez antes de cada um. Os outros podem falar, mas quem toca é a pessoa da vez.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {players.map(p => (
                  <span
                    key={p.name}
                    className="px-3 py-1.5 text-[13px] uppercase"
                    style={{
                      border: '1px solid ' + p.color,
                      color: p.color,
                      background: p.color + '18',
                      boxShadow: '0 0 14px ' + p.color + '44',
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </Panel>
          </motion.div>
        )}

        <Rule className="my-7" />

        {/* Escala de criticidade, para o numero no HUD fazer sentido depois. */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <HudLabel>Escala</HudLabel>
          {(Object.keys(DIFFICULTY_POINTS) as (keyof typeof DIFFICULTY_POINTS)[]).map(d => (
            <span
              key={d}
              className="tnum px-3 py-1.5 text-[12px] uppercase tracking-wider"
              style={{
                border: '1px solid rgba(21,199,255,.22)',
                color: 'var(--color-label)',
              }}
            >
              {DIFFICULTY_LABEL[d]} · {DIFFICULTY_POINTS[d]}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onPointerDown={onBack}
            className="px-6 py-3 text-[13px] uppercase tracking-widest"
            style={{ color: 'var(--color-micro)' }}
          >
            voltar
          </button>
          <BigButton onTap={onStart} tone="success" className="min-w-[360px]">
            ENTENDI, COMEÇAR
            <span className="tnum ml-3 opacity-60">{left}</span>
          </BigButton>
        </div>
      </motion.div>
    </div>
  )
}
