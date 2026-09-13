/**
 * MISSAO TI :: desafio 4, FIREWALL.
 *
 * O mini-game que junta plateia. Senhas caem em direcao ao servidor: destrua
 * as fracas, deixe as fortes passarem. E onde as pessoas gritam, e e o
 * barulho que faz a fila se formar.
 *
 * PERFORMANCE: as posicoes NAO passam por estado do React. Um setState por
 * quadro re-renderizaria a lista inteira 60 vezes por segundo e comeria
 * justamente o orcamento que o toque precisa. O laco escreve `transform`
 * direto no elemento, que e composto pela GPU; o React so cuida de quem
 * nasce e quem morre.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ShieldAlert, Server } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { PASSWORDS, FIREWALL_LIVES } from '@/game/content.ts'
import { accuracyRatio } from '@/game/scoring.ts'
import { useFx } from '@/visual/Fx.tsx'

/** Padrao de senhas agendadas. E o denominador da nota: morrer cedo com
 *  100% de acerto nao pode valer nota cheia. */
export const SCHEDULED = 14
export const LANES = 4

export interface Drop {
  id: number
  text: string
  weak: boolean
  lane: number
  /** Momento de nascimento, em ms desde o inicio da rodada. */
  bornAt: number
  /** Quanto tempo leva para chegar ao servidor. */
  fallMs: number
}

export function buildRound(durationMs: number, count = SCHEDULED, speed = 1): Drop[] {
  const weak = PASSWORDS.filter(p => p.weak)
  const strong = PASSWORDS.filter(p => !p.weak)
  const drops: Drop[] = []
  // Mistura proposital: 9 fracas e 5 fortes. Se quase tudo fosse fraco, o
  // jogo viraria "toque em tudo" e deixaria de testar qualquer coisa.
  const fracas = Math.round(count * 0.64)
  const plan = [
    ...Array.from({ length: fracas }, () => true),
    ...Array.from({ length: count - fracas }, () => false),
  ].sort(() => Math.random() - 0.5)

  plan.forEach((isWeak, i) => {
    const pool = isWeak ? weak : strong
    const t = (i / count) * durationMs * 0.88
    drops.push({
      id: i,
      text: pool[i % pool.length].text,
      weak: isWeak,
      lane: i % LANES,
      bornAt: t,
      // Acelera ao longo da rodada: a tensao tem que subir, nao ficar plana.
      fallMs: (4200 - (i / count) * 1700) / speed,
    })
  })
  return drops
}

export function Firewall({ drops, speed, secondsLeft, onDone, onPenalty }: {
  /** Quantas senhas caem. Quanto mais critico o incidente, mais senhas. */
  drops: number
  /** Multiplicador de velocidade de queda. */
  speed: number
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const stageRef = useRef<HTMLDivElement>(null)
  // Inicializador preguicoso: roda uma vez, na montagem, com o relogio cheio.
  // A duracao do agendamento tem que ser o tempo TOTAL da etapa, nao o que
  // sobrar depois.
  const [round] = useState(() => buildRound(secondsLeft * 1000, drops, speed))
  const [live, setLive] = useState<number[]>([])       // ids em cena
  const [correct, setCorrect] = useState(0)
  const [lives, setLives] = useState(FIREWALL_LIVES)
  const [impact, setImpact] = useState(false)

  const els = useRef(new Map<number, HTMLElement>())
  const settled = useRef(new Set<number>())
  const finished = useRef(false)
  const correctRef = useRef(0)
  const livesRef = useRef(FIREWALL_LIVES)

  function finish() {
    if (finished.current) return
    finished.current = true
    onDone(accuracyRatio(correctRef.current, drops))
  }

  useEffect(() => { if (secondsLeft <= 0) finish() }, [secondsLeft])

  useEffect(() => {
    const start = performance.now()
    let raf = 0

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      const t = now - start

      // Quem ja devia ter nascido entra em cena.
      const shouldBeLive = round
        .filter(d => t >= d.bornAt && !settled.current.has(d.id))
        .map(d => d.id)
      setLive(prev =>
        prev.length === shouldBeLive.length && prev.every((v, i) => v === shouldBeLive[i])
          ? prev
          : shouldBeLive,
      )

      for (const d of round) {
        if (settled.current.has(d.id)) continue
        const el = els.current.get(d.id)
        if (!el) continue
        const p = (t - d.bornAt) / d.fallMs
        if (p < 0) continue

        if (p >= 1) {
          // Chegou ao servidor. Senha forte passando e o comportamento certo.
          settled.current.add(d.id)
          if (d.weak) {
            livesRef.current -= 1
            setLives(livesRef.current)
            setImpact(true)
            setTimeout(() => setImpact(false), 300)
            fx.miss()
            if (livesRef.current <= 0) { finish(); return }
          } else {
            correctRef.current += 1
            setCorrect(correctRef.current)
          }
          continue
        }

        // Somente transform: e o que a GPU compoe sem recalcular layout.
        el.style.transform = 'translate3d(0,' + (p * 100).toFixed(2) + 'cqh,0)'
        el.style.opacity = p > 0.94 ? String((1 - p) * 16) : '1'
      }

      if (settled.current.size >= drops) finish()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [round])

  function tap(e: React.PointerEvent, d: Drop) {
    if (finished.current || settled.current.has(d.id)) return
    settled.current.add(d.id)
    els.current.get(d.id)?.style.setProperty('display', 'none')

    if (d.weak) {
      correctRef.current += 1
      setCorrect(correctRef.current)
      fx.hit()
      fx.score(1, e.clientX, e.clientY)
    } else {
      // Derrubar senha forte e erro: significa que o filtro esta pegando
      // o que nao devia, e na vida real isso e chamado aberto.
      fx.miss()
      onPenalty()
    }
  }

  const health = Math.max(0, lives / FIREWALL_LIVES)

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] px-4 lg:px-12 pb-6">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <ShieldAlert size={26} strokeWidth={1.5} style={{ color: 'var(--color-signal-red)' }} />
          <p className="text-[19px]">
            Destrua as senhas <span style={{ color: 'var(--color-signal-red)' }}>fracas</span>.
            Deixe as <span style={{ color: 'var(--color-signal-green)' }}>fortes</span> passarem.
          </p>
        </div>
        <div className="text-right">
          <HudLabel>Bloqueadas</HudLabel>
          <span className="tnum text-[19px]">{correct}/{drops}</span>
        </div>
      </div>

      {/* container-type permite posicionar em cqh, entao a queda acompanha a
          altura real do palco em qualquer monitor. */}
      <div
        ref={stageRef}
        className="relative min-h-0 overflow-hidden"
        style={{ containerType: 'size' }}
      >
        {round.filter(d => live.includes(d.id)).map(d => (
          <button
            key={d.id}
            ref={el => { if (el) els.current.set(d.id, el); else els.current.delete(d.id) }}
            type="button"
            onPointerDown={e => tap(e, d)}
            className="absolute top-0 px-5 py-3 outline-none"
            style={{
              left: (d.lane * (100 / LANES)) + (100 / LANES / 2) + '%',
              marginLeft: -95,
              width: 190,
              minHeight: 60,
              willChange: 'transform',
              fontFamily: 'var(--font-mono)',
              fontSize: 17,
              color: '#EAFBFF',
              background: 'linear-gradient(160deg, rgba(12,48,73,.94), rgba(2,9,20,.96))',
              border: '1px solid rgba(21,199,255,.32)',
            }}
          >
            {d.text}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------- servidor */}
      <div className="pt-3">
        <div
          className="relative flex items-center gap-4 px-6 py-4"
          style={{
            border: '1px solid ' + (impact ? 'var(--color-signal-red)' : 'rgba(21,199,255,.28)'),
            background: impact ? 'rgba(255,83,96,.16)' : 'rgba(4,18,31,.7)',
            boxShadow: impact ? 'var(--glow-red)' : 'none',
            animation: impact ? 'fx-shake .3s var(--ease-out)' : undefined,
            transition: 'background .2s, border-color .2s',
          }}
        >
          <Server size={30} strokeWidth={1.5} style={{ color: health > 0.34 ? 'var(--color-cyan-core)' : 'var(--color-signal-red)' }} />
          <div className="flex-1">
            <HudLabel className="mb-1.5">Integridade do servidor</HudLabel>
            <div className="h-2.5 overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
              <motion.div
                className="h-full"
                animate={{ width: health * 100 + '%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  background: health > 0.34 ? 'var(--color-signal-green)' : 'var(--color-signal-red)',
                  boxShadow: health > 0.34 ? 'var(--glow-green)' : 'var(--glow-red)',
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: FIREWALL_LIVES }, (_, i) => (
              <span
                key={i}
                className="h-4 w-4"
                style={{
                  background: i < lives ? 'var(--color-signal-green)' : 'transparent',
                  border: '1px solid ' + (i < lives ? 'var(--color-signal-green)' : 'var(--color-ink-500)'),
                  boxShadow: i < lives ? 'var(--glow-green)' : 'none',
                  rotate: '45deg',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
