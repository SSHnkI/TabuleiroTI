/**
 * MISSAO TI :: DUELO, dois jogadores na mesma tela.
 *
 * POR QUE SO O FIREWALL, e nao a rodada inteira:
 * o duelo existe para juntar plateia. Prova simetrica, legivel de longe,
 * curta e barulhenta ganha de uma rodada completa espremida em meia tela.
 * Quem passa no corredor entende em dois segundos quem esta ganhando.
 *
 * POR QUE NAO ENTRA NO RANKING DE PONTOS:
 * o duelo e uma prova diferente da rodada completa. Como ha premio em jogo,
 * misturar as duas num ranking so seria injusto com quem jogou a rodada
 * inteira. O duelo tem placar proprio, de vitorias.
 *
 * MULTI-TOQUE: nao ha filtro de pointerId aqui, e nao precisa haver. Cada
 * metade tem seus proprios elementos, entao o dedo de cada jogador cai
 * naturalmente no botao da sua metade. O DOM ja resolve.
 * Ainda assim, confirme no monitor real pelo teste do painel do operador:
 * tela touch barata as vezes so reporta um ponto.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Swords, Crown } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { buildRound, type Drop } from '@/minigames/Firewall.tsx'
import { FIREWALL_LIVES } from '@/game/content.ts'
import type { Player } from '@/game/state.ts'
import { sHit, sMiss, sFinish, sUrgent } from '@/game/sound.ts'

const DURATION = 45
const DROPS = 20
const LANES = 2

export function Duelo({ players, onFinish, onAbort }: {
  players: Player[]
  /** winner = indice do vencedor, ou null em caso de empate. */
  onFinish: (winner: number | null, blocked: number[]) => void
  onAbort: () => void
}) {
  // Os dois lados recebem EXATAMENTE a mesma sequencia. Sorteios diferentes
  // tornariam a disputa uma questao de sorte, e o que esta em jogo e quem
  // reage melhor.
  const [round] = useState(() => buildRound(DURATION * 1000, DROPS))
  const [phase, setPhase] = useState<'contagem' | 'jogo' | 'fim'>('contagem')
  const [count, setCount] = useState(3)
  const [left, setLeft] = useState(DURATION)
  const [blocked, setBlocked] = useState([0, 0])
  const [winner, setWinner] = useState<number | null>(null)
  const done = useRef(false)

  // Contagem regressiva. Duelo precisa comecar junto, senao quem tocou
  // primeiro sai na frente e a disputa ja nasce torta.
  useEffect(() => {
    if (phase !== 'contagem') return
    if (count === 0) { setPhase('jogo'); return }
    sUrgent()
    const id = setTimeout(() => setCount(c => c - 1), 800)
    return () => clearTimeout(id)
  }, [phase, count])

  useEffect(() => {
    if (phase !== 'jogo') return
    const id = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'jogo' || left > 0 || done.current) return
    done.current = true
    const w = blocked[0] === blocked[1] ? null : blocked[0] > blocked[1] ? 0 : 1
    setWinner(w)
    setPhase('fim')
    sFinish()
    setTimeout(() => onFinish(w, blocked), 4200)
  }, [left, phase, blocked, onFinish])

  const report = (side: number, delta: number) =>
    setBlocked(b => b.map((v, i) => (i === side ? v + delta : v)))

  return (
    <div className="relative grid h-full grid-rows-[auto_1fr]">
      {/* --------------------------------------------------------- placar */}
      <header className="flex items-center justify-between px-4 lg:px-10 pt-5">
        <SideScore player={players[0]} score={blocked[0]} align="left" />
        <div className="text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Swords size={20} style={{ color: 'var(--color-micro)' }} />
            <HudLabel>Duelo</HudLabel>
          </div>
          <div
            className="tnum leading-none"
            style={{
              fontSize: 'clamp(23px, 6.13vw, 52px)',
              color: left <= 5 ? 'var(--color-signal-red)' : '#EAFBFF',
              textShadow: left <= 5 ? 'var(--glow-red)' : 'none',
              animation: left <= 5 ? 'hud-pulse .7s infinite' : undefined,
            }}
          >
            {String(left).padStart(2, '0')}
          </div>
        </div>
        <SideScore player={players[1]} score={blocked[1]} align="right" />
      </header>

      {/* ---------------------------------------------------- tela dividida */}
      <div className="relative grid min-h-0 grid-cols-2">
        {[0, 1].map(side => (
          <div
            key={side}
            className="relative min-h-0"
            style={{
              borderLeft: side === 1 ? '1px solid rgba(21,199,255,.25)' : undefined,
              background: side === 0
                ? 'linear-gradient(180deg, transparent, ' + players[0].color + '10)'
                : 'linear-gradient(180deg, transparent, ' + players[1].color + '10)',
            }}
          >
            <DuelSide
              round={round}
              color={players[side].color}
              running={phase === 'jogo'}
              onBlock={() => report(side, 1)}
              onLeak={() => report(side, -1)}
            />
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------- contagem */}
      <AnimatePresence>
        {phase === 'contagem' && (
          <motion.div
            className="absolute inset-0 grid place-items-center"
            style={{ zIndex: 50, background: 'rgba(1,6,13,.82)' }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <p className="mb-3 text-[22px]" style={{ color: 'var(--color-label)' }}>
                Destruam as senhas fracas. Deixem as fortes passar.
              </p>
              <motion.div
                key={count}
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="tnum"
                style={{ fontSize: 'clamp(34px, 21.6vw, 180px)', color: 'var(--color-cyan-bright)', textShadow: 'var(--glow-cyan)' }}
              >
                {count === 0 ? 'JÁ' : count}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ---------------------------------------------------- vencedor */}
        {phase === 'fim' && (
          <motion.div
            className="absolute inset-0 grid place-items-center"
            style={{ zIndex: 50, background: 'rgba(1,6,13,.9)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            >
              {winner === null ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px, 8.53vw, 70px)' }}>EMPATE</h2>
                  <p className="mt-2 text-[22px]" style={{ color: 'var(--color-label)' }}>
                    {blocked[0]} a {blocked[1]}. Vão ter que desempatar.
                  </p>
                </>
              ) : (
                <>
                  <Crown size={64} className="mx-auto mb-3" style={{ color: 'var(--color-signal-yellow)' }} />
                  <HudLabel className="mb-2">Vencedor do duelo</HudLabel>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700,
                      fontSize: 'clamp(34px, 7vw, 92px)',
                      color: players[winner].color,
                      textShadow: '0 0 40px ' + players[winner].color + '80',
                    }}
                  >
                    {players[winner].name}
                  </h2>
                  <p className="mt-2 tnum text-[26px]" style={{ color: 'var(--color-label)' }}>
                    {blocked[winner]} a {blocked[winner === 0 ? 1 : 0]}
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onPointerDown={onAbort}
        className="absolute bottom-3 right-4 px-4 py-2 text-[12px] uppercase tracking-widest"
        style={{ color: 'var(--color-micro)', zIndex: 51 }}
      >
        encerrar
      </button>
    </div>
  )
}

function SideScore({ player, score, align }: {
  player: Player; score: number; align: 'left' | 'right'
}) {
  return (
    <div style={{ textAlign: align }}>
      <HudLabel className="mb-1">{player.name}</HudLabel>
      <div
        className="tnum leading-none"
        style={{ fontSize: 'clamp(27px, 7.2vw, 60px)', color: player.color, textShadow: '0 0 26px ' + player.color + '70' }}
      >
        {score}
      </div>
    </div>
  )
}

/**
 * Uma metade do duelo.
 *
 * Mesma tecnica do Firewall: as posicoes nao passam por estado do React, o
 * laco escreve `transform` direto no elemento. Com dois lados em cena ao
 * mesmo tempo isso importa o dobro.
 */
function DuelSide({ round, color, running, onBlock, onLeak }: {
  round: Drop[]
  color: string
  running: boolean
  onBlock: () => void
  onLeak: () => void
}) {
  const [live, setLive] = useState<number[]>([])
  const [lives, setLives] = useState(FIREWALL_LIVES)
  const els = useRef(new Map<number, HTMLElement>())
  const settled = useRef(new Set<number>())
  const livesRef = useRef(FIREWALL_LIVES)

  useEffect(() => {
    if (!running) return
    const start = performance.now()
    let raf = 0

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      const t = now - start

      const should = round.filter(d => t >= d.bornAt && !settled.current.has(d.id)).map(d => d.id)
      setLive(prev =>
        prev.length === should.length && prev.every((v, i) => v === should[i]) ? prev : should,
      )

      for (const d of round) {
        if (settled.current.has(d.id)) continue
        const el = els.current.get(d.id)
        if (!el) continue
        const p = (t - d.bornAt) / d.fallMs
        if (p < 0) continue

        if (p >= 1) {
          settled.current.add(d.id)
          // Senha forte chegando ao servidor e o comportamento correto.
          if (d.weak) {
            livesRef.current = Math.max(0, livesRef.current - 1)
            setLives(livesRef.current)
            onLeak()
            sMiss()
          }
          continue
        }
        el.style.transform = 'translate3d(0,' + (p * 100).toFixed(2) + 'cqh,0)'
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [round, running, onLeak])

  function tap(d: Drop) {
    if (!running || settled.current.has(d.id)) return
    settled.current.add(d.id)
    els.current.get(d.id)?.style.setProperty('display', 'none')
    if (d.weak) { onBlock(); sHit() } else { onLeak(); sMiss() }
  }

  return (
    <div className="grid h-full grid-rows-[1fr_auto]">
      <div className="relative min-h-0 overflow-hidden" style={{ containerType: 'size' }}>
        {round.filter(d => live.includes(d.id)).map(d => (
          <button
            key={d.id}
            ref={el => { if (el) els.current.set(d.id, el); else els.current.delete(d.id) }}
            type="button"
            onPointerDown={() => tap(d)}
            className="absolute top-0 px-3 py-3 outline-none"
            style={{
              left: ((d.lane % LANES) * 50) + 25 + '%',
              marginLeft: -82,
              width: 164,
              minHeight: 58,
              willChange: 'transform',
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              color: '#EAFBFF',
              background: 'linear-gradient(160deg, rgba(12,48,73,.95), rgba(2,9,20,.97))',
              border: '1px solid ' + color + '55',
            }}
          >
            {d.text}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-3">
        {Array.from({ length: FIREWALL_LIVES }, (_, i) => (
          <span
            key={i}
            className="h-3.5 w-3.5"
            style={{
              background: i < lives ? color : 'transparent',
              border: '1px solid ' + (i < lives ? color : 'var(--color-ink-500)'),
              boxShadow: i < lives ? '0 0 10px ' + color : 'none',
              rotate: '45deg',
            }}
          />
        ))}
      </div>
    </div>
  )
}
