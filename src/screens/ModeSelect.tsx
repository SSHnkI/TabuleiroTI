/**
 * MISSAO TI :: quantos vao jogar.
 *
 * A tela escolhe o modo sozinha a partir do tamanho do grupo, porque o
 * operador nao pode virar gargalo: na feira chega gente sozinha e chega
 * turma de quatro, e a fila nao espera ninguem configurar nada.
 *
 * Duas decisoes numa tela so. Uma etapa a mais aqui custa segundos vezes
 * centenas de jogadores.
 */
import { useState } from 'react'
import { motion } from 'motion/react'
import { User, Swords, HeartHandshake } from 'lucide-react'
import { Panel, HudLabel } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import type { GameMode } from '@/game/scoring.ts'
import { EASE_OUT } from '@/lib/ease'

type Together = 'competir' | 'juntos'

const COUNTS = [
  { n: 1, label: 'SOZINHO', hint: 'Você contra o relógio' },
  { n: 2, label: 'EM DUPLA', hint: 'Tela dividida ao meio' },
  { n: 3, label: 'TRIO', hint: 'Cada um pega um desafio' },
  { n: 4, label: 'QUARTETO', hint: 'Um desafio para cada' },
]

export function resolveMode(count: number, together: Together): GameMode {
  if (count === 1) return 'solo'
  if (together === 'juntos') return 'equipe'
  return count === 2 ? 'duelo' : 'revezamento'
}

export function ModeSelect({ onPick, onBack }: {
  onPick: (mode: GameMode, count: number) => void
  onBack: () => void
}) {
  const [count, setCount] = useState<number | null>(null)

  function choose(together: Together) {
    if (count === null) return
    onPick(resolveMode(count, together), count)
  }

  return (
    <div className="grid h-full place-items-center px-4 amplo:px-10">
      <div className="w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <HudLabel className="mb-3 text-center">Formação da equipe</HudLabel>
          <h2
            className="mb-10 text-center"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(24px, 4.4vw, 54px)' }}
          >
            QUANTOS VÃO JOGAR?
          </h2>
        </motion.div>

        <div className="grid grid-cols-4 gap-5">
          {COUNTS.map((c, i) => {
            const active = count === c.n
            return (
              <motion.button
                key={c.n}
                type="button"
                data-touch-target
                onPointerDown={() => setCount(c.n)}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05, ease: EASE_OUT }}
                className="relative px-5 py-8 text-center outline-none"
                style={{
                  border: `1px solid ${active ? 'var(--color-cyan-core)' : 'rgba(21,199,255,.2)'}`,
                  background: active
                    ? 'linear-gradient(160deg, rgba(21,199,255,.22), rgba(4,18,31,.92))'
                    : 'linear-gradient(160deg, rgba(7,32,51,.92), rgba(2,9,20,.96))',
                  boxShadow: active ? 'var(--glow-cyan)' : 'none',
                  transform: active ? 'translateY(-4px)' : 'none',
                  transition: 'all var(--dur-state) var(--ease-out)',
                }}
              >
                <div
                  className="tnum leading-none"
                  style={{
                    fontSize: 'clamp(34px, 9.07vw, 76px)',
                    color: active ? 'var(--color-cyan-bright)' : '#93B7CB',
                    textShadow: active ? 'var(--glow-cyan)' : 'none',
                  }}
                >
                  {c.n}
                </div>
                <div
                  className="mt-3 uppercase"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600, letterSpacing: '.12em', fontSize: 15 }}
                >
                  {c.label}
                </div>
                <div className="mt-1 text-[13px]" style={{ color: 'var(--color-micro)' }}>{c.hint}</div>
              </motion.button>
            )
          })}
        </div>

        {/* Segunda decisao na MESMA tela. Uma etapa a mais custaria segundos
            multiplicados por centenas de jogadores ao longo do dia. */}
        <div className="mt-8 min-h-[132px]">
          {count === 1 ? (
            <div className="flex justify-center">
              <BigButton onTap={() => choose('competir')} className="min-w-[300px]">
                COMEÇAR <User size={20} className="ml-2 inline" />
              </BigButton>
            </div>
          ) : count ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <HudLabel className="mb-3 text-center">E aí, vai ser como?</HudLabel>
              <div className="grid grid-cols-2 gap-5">
                <Choice
                  icon={<Swords size={30} strokeWidth={1.5} />}
                  title="COMPETIR"
                  hint={count === 2 ? 'Duelo na tela dividida' : 'Cada um pega um desafio, e no fim aparece quem carregou o time'}
                  onTap={() => choose('competir')}
                />
                <Choice
                  icon={<HeartHandshake size={30} strokeWidth={1.5} />}
                  title="JUNTOS"
                  hint="Todos discutem, um toca a tela"
                  onTap={() => choose('juntos')}
                />
              </div>
            </motion.div>
          ) : (
            <p className="pt-10 text-center text-[15px]" style={{ color: 'var(--color-micro)' }}>
              Toque em quantas pessoas vão jogar.
            </p>
          )}
        </div>

        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onPointerDown={onBack}
            className="px-6 py-3 text-[13px] uppercase tracking-widest"
            style={{ color: 'var(--color-micro)' }}
          >
            voltar
          </button>
        </div>
      </div>
    </div>
  )
}

function Choice({ icon, title, hint, onTap }: {
  icon: React.ReactNode; title: string; hint: string; onTap: () => void
}) {
  return (
    <Panel bare className="overflow-hidden">
      <button
        type="button"
        data-touch-target
        onPointerDown={onTap}
        className="flex w-full items-center gap-4 px-6 py-5 text-left outline-none"
      >
        <span style={{ color: 'var(--color-cyan-core)' }}>{icon}</span>
        <span className="min-w-0">
          <span
            className="block uppercase"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '.12em', fontSize: 19 }}
          >
            {title}
          </span>
          <span className="block text-[13px] leading-snug" style={{ color: 'var(--color-micro)' }}>{hint}</span>
        </span>
      </button>
    </Panel>
  )
}
