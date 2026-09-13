/**
 * MISSAO TI :: ranking.
 *
 * Dois rankings, nao um. Nao da para comparar uma pessoa sozinha com um
 * quarteto de forma justa, e separar ainda rende dois premios e dois
 * anuncios em voz alta ao longo do dia, que e o que junta gente no estande.
 */
import { motion } from 'motion/react'
import { Crown, Users, User } from 'lucide-react'
import { HudLabel, Panel } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import { NumberTicker } from '@/components/motion/number-ticker'
import { rankRuns, stats, type Run } from '@/game/scoring.ts'

export function Ranking({ runs, highlightAt, onBack }: {
  runs: Run[]
  /** Timestamp da partida recem terminada, para destacar a linha dela. */
  highlightAt?: number | null
  onBack: () => void
}) {
  const individual = rankRuns(runs, ['solo', 'duelo'])
  const teams = rankRuns(runs, ['revezamento', 'equipe'])
  const s = stats(runs)

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] px-4 amplo:px-12 py-7">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <HudLabel className="mb-1">Placar do dia</HudLabel>
          <h1
            className="uppercase"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(21px, 3.6vw, 46px)' }}
          >
            RANKING
          </h1>
        </div>
        <div className="flex gap-10">
          <Stat label="Jogadores" value={s.played} />
          <Stat label="Equipes" value={s.teams} />
          <Stat label="Média" value={s.average} />
          <Stat label="Recorde" value={s.best} tone="var(--color-signal-yellow)" />
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-2 gap-7">
        <Board
          title="Individual"
          icon={<User size={20} strokeWidth={1.6} />}
          rows={individual}
          highlightAt={highlightAt}
        />
        <Board
          title="Equipes"
          icon={<Users size={20} strokeWidth={1.6} />}
          rows={teams}
          highlightAt={highlightAt}
        />
      </div>

      <div className="flex justify-center pt-6">
        <BigButton onTap={onBack} className="min-w-[300px]">VOLTAR AO INÍCIO</BigButton>
      </div>
    </div>
  )
}

function Board({ title, icon, rows, highlightAt }: {
  title: string
  icon: React.ReactNode
  rows: Run[]
  highlightAt?: number | null
}) {
  return (
    <Panel className="flex min-h-0 flex-col p-7">
      <div className="mb-4 flex items-center gap-2.5" style={{ color: 'var(--color-cyan-core)' }}>
        {icon}
        <HudLabel>{title}</HudLabel>
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {rows.length === 0 && (
          <li className="pt-14 text-center text-[15px]" style={{ color: 'var(--color-micro)' }}>
            Ninguém aqui ainda.
          </li>
        )}
        {rows.slice(0, 10).map((r, i) => {
          const me = highlightAt != null && r.at === highlightAt
          const podium = i < 3
          return (
            <motion.li
              key={r.at}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="flex items-center gap-4 px-3 py-2.5"
              style={{
                border: '1px solid ' + (me ? 'var(--color-signal-green)' : 'transparent'),
                background: me ? 'rgba(37,223,160,.12)' : i % 2 ? 'rgba(255,255,255,.02)' : 'transparent',
                boxShadow: me ? 'var(--glow-green)' : 'none',
              }}
            >
              <span
                className="tnum grid h-8 w-8 shrink-0 place-items-center text-[14px]"
                style={{
                  color: podium ? 'var(--color-signal-yellow)' : 'var(--color-micro)',
                  border: '1px solid ' + (podium ? 'var(--color-signal-yellow)' : 'var(--color-ink-500)'),
                  boxShadow: i === 0 ? 'var(--glow-yellow)' : 'none',
                }}
              >
                {i + 1}
              </span>
              {i === 0 && <Crown size={18} style={{ color: 'var(--color-signal-yellow)' }} />}
              <span className="min-w-0 flex-1 truncate text-[17px]">{r.name}</span>
              <span
                className="tnum shrink-0 text-[20px]"
                style={{ color: podium ? 'var(--color-signal-yellow)' : '#EAFBFF' }}
              >
                {r.score}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </Panel>
  )
}

function Stat({ label, value, tone = '#EAFBFF' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="text-right">
      <HudLabel className="mb-0.5">{label}</HudLabel>
      <div className="tnum text-[28px]" style={{ color: tone }}>
        <NumberTicker value={value} startOnView={false} />
      </div>
    </div>
  )
}
