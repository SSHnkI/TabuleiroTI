/**
 * MISSAO TI :: modo TV (abrir com ?tv=1).
 *
 * Segunda tela, voltada para o corredor. Resolve a "falta de comunicacao"
 * da edicao anterior: quem passa longe entende em dois segundos o que esta
 * acontecendo no estande, e ve o placar mudar ao vivo.
 *
 * Atualiza sozinha: o quiosque avisa por BroadcastChannel a cada partida,
 * com o evento `storage` como reserva. Nao precisa de servidor, nem de
 * internet, nem de ninguem apertando nada.
 *
 * Tudo aqui e GRANDE. Isto vai ser lido de cinco metros, em pe.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crown, Radio, Swords } from 'lucide-react'
import { NumberTicker } from '@/components/motion/number-ticker'
import { HudLabel, Panel } from '@/components/hud'
import { loadRuns, subscribe, loadDuels, duelBoard } from '@/game/storage.ts'
import { rankRuns, stats, type Run } from '@/game/scoring.ts'
import { EASE_OUT } from '@/lib/ease'

export function TvBoard() {
  const [runs, setRuns] = useState<Run[]>(() => loadRuns())
  const [board, setBoard] = useState<'ind' | 'eq'>('ind')
  const [duels, setDuels] = useState(() => loadDuels())

  useEffect(() => subscribe(r => { setRuns(r); setDuels(loadDuels()) }), [])

  const individual = rankRuns(runs, ['solo', 'duelo'])
  const teams = rankRuns(runs, ['revezamento', 'equipe'])

  // Nao gira para um quadro vazio: nove segundos de "ninguem jogou ainda"
  // numa TV virada para o corredor e atencao jogada fora, justo no lugar
  // onde a atencao e o produto.
  useEffect(() => {
    if (individual.length === 0 && teams.length === 0) return
    if (teams.length === 0) { setBoard('ind'); return }
    if (individual.length === 0) { setBoard('eq'); return }
    const id = setInterval(() => setBoard(b => (b === 'ind' ? 'eq' : 'ind')), 9000)
    return () => clearInterval(id)
  }, [individual.length, teams.length])
  const rows = (board === 'ind' ? individual : teams).slice(0, 5)
  const s = stats(runs)
  const last = runs.length ? runs.reduce((a, b) => (b.at > a.at ? b : a)) : null
  const duelKing = duelBoard(duels)[0]

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] px-14 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Radio size={30} style={{ color: 'var(--color-signal-red)' }} className="animate-pulse" />
          <div>
            <HudLabel>Ao vivo do estande de TI</HudLabel>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 44 }}>
              MISSÃO <span style={{ color: 'var(--color-cyan-core)' }}>TI</span>
            </h1>
          </div>
        </div>
        <div className="text-right">
          <HudLabel>{board === 'ind' ? 'Ranking individual' : 'Ranking de equipes'}</HudLabel>
          <p className="text-[19px]" style={{ color: 'var(--color-label)' }}>
            venha jogar, leva 2 minutos
          </p>
        </div>
      </header>

      <section className="grid min-h-0 grid-cols-[1.4fr_.6fr] items-center gap-12">
        <AnimatePresence mode="wait">
          <motion.ol
            key={board}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -22 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="space-y-3"
          >
            {rows.length === 0 && (
              <li className="text-center" style={{ fontSize: 34, color: 'var(--color-micro)' }}>
                Ninguém jogou ainda.<br />Seja o primeiro do dia.
              </li>
            )}
            {rows.map((r, i) => (
              <li
                key={r.at}
                className="flex items-center gap-7 px-7 py-5"
                style={{
                  border: '1px solid ' + (i === 0 ? 'var(--color-signal-yellow)' : 'rgba(21,199,255,.18)'),
                  background: i === 0
                    ? 'linear-gradient(100deg, rgba(255,211,61,.16), rgba(2,9,20,.85))'
                    : 'rgba(4,18,31,.6)',
                  boxShadow: i === 0 ? 'var(--glow-yellow)' : 'none',
                }}
              >
                <span
                  className="tnum w-14 shrink-0 text-center"
                  style={{
                    fontSize: 46,
                    color: i < 3 ? 'var(--color-signal-yellow)' : 'var(--color-micro)',
                  }}
                >
                  {i + 1}
                </span>
                {i === 0 && <Crown size={38} style={{ color: 'var(--color-signal-yellow)' }} />}
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: 40 }}>{r.name}</span>
                <span
                  className="tnum shrink-0"
                  style={{
                    fontSize: 52,
                    color: i === 0 ? 'var(--color-signal-yellow)' : '#EAFBFF',
                  }}
                >
                  {r.score}
                </span>
              </li>
            ))}
          </motion.ol>
        </AnimatePresence>

        <div className="space-y-5">
          <Big label="Jogadores hoje" value={s.played} />
          <Big label="Recorde do dia" value={s.best} tone="var(--color-signal-yellow)" />
          <Big label="Equipes" value={s.teams} />
        </div>
      </section>

      <footer className="grid grid-cols-[1.6fr_.9fr] gap-5">
        <Panel className="px-8 py-5">
          {last ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={last.at}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
                style={{ fontSize: 28 }}
              >
                <span style={{ color: 'var(--color-micro)' }}>Última partida: </span>
                <b>{last.name}</b>
                <span style={{ color: 'var(--color-micro)' }}> fez </span>
                <b className="tnum" style={{ color: 'var(--color-signal-yellow)' }}>{last.score}</b>
                <span style={{ color: 'var(--color-micro)' }}> pontos</span>
              </motion.p>
            </AnimatePresence>
          ) : (
            <p style={{ fontSize: 28, color: 'var(--color-micro)' }}>
              O placar acende assim que a primeira partida terminar.
            </p>
          )}
        </Panel>

        {/* Terceira categoria de premiacao: o duelo nao entra no ranking de
            pontos, mas rende um campeao proprio e mais um anuncio no dia. */}
        <Panel className="flex items-center gap-5 px-7 py-5" tone={duelKing ? 'yellow' : 'neutral'}>
          <Swords size={34} style={{ color: duelKing ? 'var(--color-signal-yellow)' : 'var(--color-micro)' }} />
          <div className="min-w-0">
            <HudLabel className="mb-1">Campeão de duelos</HudLabel>
            {duelKing ? (
              <p className="truncate" style={{ fontSize: 30 }}>
                <b>{duelKing.name}</b>
                <span className="tnum" style={{ color: 'var(--color-signal-yellow)' }}>
                  {' '}{duelKing.wins}
                </span>
                <span style={{ color: 'var(--color-micro)', fontSize: 22 }}>
                  {duelKing.wins === 1 ? ' vitória' : ' vitórias'}
                </span>
              </p>
            ) : (
              <p style={{ fontSize: 22, color: 'var(--color-micro)' }}>
                Tragam alguém para duelar.
              </p>
            )}
          </div>
        </Panel>
      </footer>
    </div>
  )
}

function Big({ label, value, tone = '#EAFBFF' }: { label: string; value: number; tone?: string }) {
  return (
    <Panel className="px-7 py-5">
      <HudLabel className="mb-1">{label}</HudLabel>
      <div className="tnum leading-none" style={{ fontSize: 72, color: tone }}>
        <NumberTicker value={value} startOnView={false} />
      </div>
    </Panel>
  )
}
