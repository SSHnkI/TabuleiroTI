/**
 * MISSAO TI :: resultado.
 *
 * O pico visual do jogo, e o unico lugar onde nao ha input pendente: da para
 * gastar o orcamento inteiro sem prejudicar latencia nenhuma.
 *
 * Tambem e onde a fila anda. A tela se fecha sozinha em 15 segundos, com a
 * contagem visivel. Na edicao anterior as pessoas ficavam paradas no monitor
 * comemorando enquanto a fila crescia atras.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import confetti from 'canvas-confetti'
import { Trophy, RotateCcw, ListOrdered } from 'lucide-react'
import { NumberTicker } from '@/components/motion/number-ticker'
import { HudLabel, Panel, Rule } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import { DIAGNOSIS } from '@/game/content.ts'
import {
  DIFFICULTY_POINTS, DIFFICULTY_LABEL, minigameScore, timeBonus,
  type MinigameResult, type Run,
} from '@/game/scoring.ts'

/** Segundos ate a tela se fechar sozinha e liberar o quiosque. */
const AUTO_SECONDS = 15

export function Result({ score, results, teamName, position, total, training, onRanking, onAgain }: {
  score: number
  results: MinigameResult[]
  teamName: string
  /** Colocacao no ranking, ou null quando foi treino. */
  position: number | null
  total: number
  training: boolean
  onRanking: () => void
  onAgain: () => void
}) {
  const [stage, setStage] = useState(0)
  const [left, setLeft] = useState(AUTO_SECONDS)
  const fired = useRef(false)

  // Sequencia cinematografica. Cada degrau entra sozinho, em ordem.
  useEffect(() => {
    const marks = [250, 900, 1700, 2400, 3000]
    const ids = marks.map((ms, i) => setTimeout(() => setStage(i + 1), ms))
    return () => ids.forEach(clearTimeout)
  }, [])

  // Confete no momento em que o numero termina de subir, nao antes.
  useEffect(() => {
    if (stage < 3 || fired.current) return
    fired.current = true
    const burst = (x: number) => confetti({
      particleCount: 70,
      spread: 70,
      origin: { x, y: 0.62 },
      colors: ['#15C7FF', '#25DFA0', '#FFD33D', '#7FE4FF', '#FFFFFF'],
      disableForReducedMotion: true,
    })
    burst(0.3); setTimeout(() => burst(0.7), 180)
  }, [stage])

  useEffect(() => {
    const id = setInterval(() => setLeft(s => (s <= 1 ? (onAgain(), 0) : s - 1)), 1000)
    return () => clearInterval(id)
  }, [onAgain])

  const bonus = timeBonus(results.reduce((s, r) => s + Math.max(0, r.secondsLeft), 0))
  const show = (n: number) => (stage >= n ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 })

  return (
    <div className="relative grid h-full grid-rows-[1fr_auto] px-4 py-4 lg:px-12 lg:py-8">
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        {/* ------------------------------------------------- numero principal */}
        <div className="text-center">
          <motion.div animate={show(1)} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <Trophy
              size={54} strokeWidth={1.3}
              className="mx-auto mb-3"
              style={{ color: 'var(--color-signal-yellow)' }}
            />
            <h1
              className="uppercase"
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 'clamp(26px, 4.6vw, 58px)', letterSpacing: '.04em',
              }}
            >
              MISSÃO CONCLUÍDA
            </h1>
            <p className="mt-1 text-[19px]" style={{ color: 'var(--color-label)' }}>{teamName}</p>
          </motion.div>

          <motion.div
            animate={stage >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="tnum my-2 leading-none"
            style={{
              fontSize: 'clamp(34px, 15vw, 200px)',
              color: 'var(--color-signal-yellow)',
              textShadow: '0 0 40px rgba(255,211,61,.5), 0 0 120px rgba(255,211,61,.2)',
            }}
          >
            {stage >= 2 ? <NumberTicker value={score} startOnView={false} duration={1.1} /> : 0}
          </motion.div>
          <HudLabel>de 100 pontos</HudLabel>

          {/* Colocacao. E a frase que faz a pessoa tirar foto da tela. */}
          <motion.div animate={show(4)} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="mt-6">
            {training ? (
              <p
                className="inline-block px-4 py-2 text-[15px] uppercase tracking-widest"
                style={{ color: 'var(--color-signal-yellow)', border: '1px solid var(--color-signal-yellow)' }}
              >
                treino · sua primeira partida é a que vale
              </p>
            ) : position ? (
              <p
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(14px, 3.73vw, 30px)',
                  color: position <= 3 ? 'var(--color-signal-yellow)' : '#EAFBFF',
                  textShadow: position <= 3 ? 'var(--glow-yellow)' : 'none',
                }}
              >
                você é o #{position} de {total} hoje
              </p>
            ) : null}
          </motion.div>
        </div>

        {/* ----------------------------------------------------- detalhamento */}
        <motion.div animate={show(3)} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <Panel className="p-8" tone="cyan">
            <HudLabel className="mb-4">Como você pontuou</HudLabel>

            <ul className="space-y-3">
              {/* Chave composta: a rodada normal nunca repete tipo, mas o
                  atalho de conferencia ?desafio= repete de proposito, e e o
                  indice que mantem a chave unica. */}
              {results.map((r, i) => {
                const pts = minigameScore(r.difficulty, r.ratio)
                const max = DIFFICULTY_POINTS[r.difficulty]
                return (
                  <motion.li
                    key={r.id + ':' + i}
                    initial={{ opacity: 0, x: 16 }}
                    animate={stage >= 3 ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 + i * 0.09, duration: 0.35 }}
                    className="flex items-center gap-4"
                  >
                    <span className="w-48 shrink-0">
                      <span className="block truncate text-[15px]" style={{ color: 'var(--color-label)' }}>
                        {r.label ?? r.id}
                      </span>
                      <span
                        className="block text-[10px] uppercase"
                        style={{ letterSpacing: '.16em', color: 'var(--color-micro)' }}
                      >
                        {DIFFICULTY_LABEL[r.difficulty]}
                      </span>
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden" style={{ background: 'rgba(21,199,255,.12)' }}>
                      <motion.div
                        className="h-full"
                        initial={{ width: 0 }}
                        animate={stage >= 3 ? { width: (pts / max) * 100 + '%' } : {}}
                        transition={{ delay: 0.2 + i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          background: pts === max ? 'var(--color-signal-green)' : 'var(--color-cyan-core)',
                          boxShadow: pts === max ? 'var(--glow-green)' : 'var(--glow-cyan)',
                        }}
                      />
                    </div>
                    <span className="tnum w-16 shrink-0 text-right text-[17px]">
                      {pts}<span style={{ color: 'var(--color-micro)' }}>/{max}</span>
                    </span>
                  </motion.li>
                )
              })}

              <li className="flex items-center gap-4 pt-1">
                <span className="w-40 shrink-0 text-[15px]" style={{ color: 'var(--color-signal-yellow)' }}>
                  Bônus de velocidade
                </span>
                <div className="flex-1" />
                <span className="tnum w-16 shrink-0 text-right text-[17px]" style={{ color: 'var(--color-signal-yellow)' }}>
                  +{bonus}
                </span>
              </li>
            </ul>

            <Rule className="my-5" />

            <HudLabel className="mb-2">O que travou o pedido</HudLabel>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-label)' }}>
              {DIAGNOSIS}
            </p>
          </Panel>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------ rodape */}
      <motion.div animate={show(5)} transition={{ duration: 0.4 }} className="flex items-center justify-center gap-5 pt-4">
        <BigButton onTap={onRanking} tone="ghost" className="min-w-[240px]">
          <ListOrdered size={19} className="mr-2 inline" /> VER RANKING
        </BigButton>
        <BigButton onTap={onAgain} className="min-w-[260px]">
          <RotateCcw size={19} className="mr-2 inline" /> PRÓXIMO JOGADOR
        </BigButton>
      </motion.div>

      {/* Barra de liberacao do quiosque. Some sozinha com a fila andando. */}
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: 'rgba(21,199,255,.1)' }}>
        <div
          className="h-full"
          style={{
            width: (left / AUTO_SECONDS) * 100 + '%',
            background: 'var(--color-cyan-deep)',
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  )
}

/** Nome que entra no ranking. Em grupo, todos aparecem: o ranking e o mural
 *  do dia, e ver o proprio nome nele e metade do premio. */
export function teamNameOf(players: { name: string }[]): string {
  return players.map(p => p.name).join(' · ')
}

export function positionOf(ranked: Run[], at: number): number | null {
  const i = ranked.findIndex(r => r.at === at)
  return i === -1 ? null : i + 1
}
