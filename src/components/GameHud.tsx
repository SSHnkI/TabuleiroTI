/**
 * MISSAO TI :: HUD da partida.
 *
 * Ordem de importancia na tela: de quem e a vez, quanto tempo falta, quanto
 * vale esta etapa, quantos pontos ja tem. Nada mais. Cada elemento extra
 * aqui e uma coisa a menos que a pessoa enxerga no desafio.
 */
import { motion } from 'motion/react'
import { NumberTicker } from '@/components/motion/number-ticker'
import { HudLabel, Dot } from '@/components/hud'
import { DIFFICULTY_LABEL, DIFFICULTY_POINTS, DIFFICULTY_SECONDS } from '@/game/scoring.ts'
import type { ChallengeSpec } from '@/game/challenges.ts'
import type { Player } from '@/game/state.ts'

const KIND: Record<ChallengeSpec['id'], string> = {
  scanner: 'Scanner de bug',
  fluxo: 'Fluxo do processo',
  timeline: 'Linha do tempo',
  firewall: 'Firewall',
  triagem: 'Triagem de chamados',
  phishing: 'Caça ao phishing',
  backup: 'Restauração',
  rack: 'Sala de equipamentos',
  wifi: 'Cobertura sem fio',
  rede: 'Topologia da rede',
  suporte: 'Fila de atendimento',
  seguranca: 'Acessos ao sistema',
}

/** A criticidade tem cor propria: e ela que diz "isto aqui vale muito". */
const TONE = {
  facil: 'var(--color-signal-green)',
  medio: 'var(--color-cyan-core)',
  dificil: 'var(--color-signal-yellow)',
  critico: 'var(--color-signal-red)',
} as const

export function GameHud({
  round, index, secondsLeft, score, combo, player, training,
}: {
  round: ChallengeSpec[]
  index: number
  secondsLeft: number
  score: number
  combo: number
  /** So o revezamento passa jogador: nos outros modos nao ha "vez". */
  player?: Player
  training: boolean
}) {
  const spec = round[index]
  if (!spec) return null

  const total = DIFFICULTY_SECONDS[spec.difficulty]
  const pct = Math.max(0, secondsLeft / total)
  const urgent = secondsLeft <= 5
  const restored = Math.round((index / round.length) * 100)
  const tone = TONE[spec.difficulty]

  return (
    <header className="relative px-4 pt-4 amplo:px-9 amplo:pt-6" style={{ zIndex: 35 }}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 amplo:flex-nowrap amplo:gap-8">
        {/* ------------------------------------------------ etapa e progresso */}
        <div className="order-last w-full min-w-0 amplo:order-none amplo:w-auto amplo:flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <HudLabel>Etapa {index + 1} de {round.length}</HudLabel>

            {/* Criticidade e valor lado a lado: a pessoa sabe na hora que
                aquela etapa vale mais que a anterior, e joga diferente. */}
            <span
              className="px-2 py-0.5 text-[10px] uppercase tracking-widest"
              style={{ color: tone, border: '1px solid ' + tone }}
            >
              criticidade {DIFFICULTY_LABEL[spec.difficulty]}
            </span>
            <span className="tnum text-[12px]" style={{ color: tone }}>
              vale {DIFFICULTY_POINTS[spec.difficulty]} pts
            </span>

            {training && (
              <span
                className="px-2 py-0.5 text-[10px] uppercase tracking-widest"
                style={{
                  color: 'var(--color-signal-yellow)',
                  border: '1px solid var(--color-signal-yellow)',
                }}
              >
                treino · não vale ranking
              </span>
            )}
          </div>

          <h2
            className="truncate uppercase"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px, 5.2vw, 26px)', letterSpacing: '.06em' }}
          >
            {spec.label}
          </h2>
          <p className="text-[13px]" style={{ color: 'var(--color-micro)' }}>{KIND[spec.id]}</p>

          <div className="mt-2.5 flex items-center gap-3">
            <HudLabel>Sistema restaurado</HudLabel>
            <div className="relative h-1.5 w-full max-w-52 flex-1 overflow-hidden" style={{ background: 'rgba(21,199,255,.12)' }}>
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ background: 'var(--color-signal-green)', boxShadow: 'var(--glow-green)' }}
                animate={{ width: restored + '%' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="tnum text-xs" style={{ color: 'var(--color-signal-green)' }}>{restored}%</span>
          </div>
        </div>

        {/* ---------------------------------------------------------- relogio */}
        <div className="flex flex-1 items-center gap-3 amplo:block amplo:flex-none amplo:text-center">
          <HudLabel className="mb-1">Tempo</HudLabel>
          <div
            className="tnum leading-none"
            style={{
              fontSize: 'clamp(25px, 6.67vw, 56px)',
              color: urgent ? 'var(--color-signal-red)' : '#EAFBFF',
              textShadow: urgent ? 'var(--glow-red)' : 'none',
              // Pulsa so quando aperta. Pulsar sempre nao avisaria nada.
              animation: urgent ? 'hud-pulse .7s infinite' : undefined,
            }}
          >
            {String(secondsLeft).padStart(2, '0')}
          </div>
          <div className="relative mt-2 hidden h-1 w-40 overflow-hidden amplo:block" style={{ background: 'rgba(21,199,255,.12)' }}>
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: pct * 100 + '%',
                background: urgent ? 'var(--color-signal-red)' : 'var(--color-cyan-core)',
                transition: 'width 1s linear, background .3s',
              }}
            />
          </div>
        </div>

        {/* --------------------------------------------- jogador da vez e nota */}
        <div className="text-right amplo:min-w-[230px]">
          {/* Bloco inteiro na cor do jogador, nao so um ponto colorido: num
              grupo de quatro, saber de quem e a vez precisa ser legivel de
              relance, por quem esta em pe atras da pessoa que joga. */}
          {player && (
            <div
              className="mb-2.5 inline-flex items-center gap-2.5 px-3.5 py-2"
              style={{
                border: '1px solid ' + player.color,
                background: player.color + '1F',
                boxShadow: '0 0 22px ' + player.color + '55',
              }}
            >
              <Dot color={player.color} />
              <span className="text-left">
                <span
                  className="block uppercase"
                  style={{ fontSize: 9, letterSpacing: '.22em', color: 'var(--color-micro)' }}
                >
                  jogando agora
                </span>
                <span
                  className="block uppercase leading-tight"
                  style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 19, letterSpacing: '.06em', color: player.color,
                  }}
                >
                  {player.name}
                </span>
              </span>
            </div>
          )}

          <HudLabel className="mb-1">Pontos</HudLabel>
          <div
            className="tnum leading-none"
            style={{ fontSize: 'clamp(21px, 5.6vw, 46px)', color: 'var(--color-signal-yellow)', textShadow: 'var(--glow-yellow)' }}
          >
            <NumberTicker value={score} startOnView={false} />
          </div>

          {combo >= 2 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              className="mt-1.5 inline-block px-2.5 py-1 uppercase"
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, letterSpacing: '.14em',
                color: '#01060D', background: 'var(--color-signal-yellow)', boxShadow: 'var(--glow-yellow)',
              }}
            >
              combo x{combo}
            </motion.div>
          )}
        </div>
      </div>
    </header>
  )
}
