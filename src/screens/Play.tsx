/**
 * MISSAO TI :: tela de partida.
 *
 * Monta o HUD e o desafio da vez. Nao conhece as regras de nenhum deles:
 * cada desafio recebe o caso sorteado mais o relogio, e devolve uma nota de
 * 0 a 1. A criticidade e quem converte essa nota em pontos.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Scanner } from '@/minigames/Scanner.tsx'
import { Fluxo } from '@/minigames/Fluxo.tsx'
import { Timeline } from '@/minigames/Timeline.tsx'
import { Firewall } from '@/minigames/Firewall.tsx'
import { Triagem } from '@/minigames/Triagem.tsx'
import { Phishing } from '@/minigames/Phishing.tsx'
import { Backup } from '@/minigames/Backup.tsx'
import { Rack } from '@/minigames/Rack.tsx'
import { Wifi } from '@/minigames/Wifi.tsx'
import { Rede } from '@/minigames/Rede.tsx'
import { Suporte } from '@/minigames/Suporte.tsx'
import { Seguranca } from '@/minigames/Seguranca.tsx'
import { GameHud } from '@/components/GameHud.tsx'
import { DIFFICULTY_LABEL } from '@/game/scoring.ts'
import type { GameState } from '@/game/state.ts'
import { useFx } from '@/visual/Fx.tsx'
import { ambiente, type AmbienteId } from '@/game/sound.ts'

/**
 * Leito de som por desafio, SO para os que vivem no DOM.
 *
 * Os cinco em 3D ligam o ambiente deles dentro da propria cena, junto com o
 * resto da montagem. Se esta tela tambem ligasse, o efeito do pai rodaria
 * depois do filho e atropelaria a escolha dele.
 */
const AMBIENTE_DOM: Partial<Record<string, AmbienteId>> = {
  scanner: 'rede',
  fluxo: 'fabrica',
  timeline: 'rede',
  firewall: 'servidores',
  triagem: 'fabrica',
  phishing: 'rede',
  backup: 'servidores',
}

/** Quanto tempo o anuncio de vez fica na tela antes do desafio comecar. */
const TURN_MS = 1700

export function Play({ state, onDone, onPenalty, onPause }: {
  state: GameState
  onDone: (ratio: number) => void
  onPenalty: () => void
  /** O relogio para durante o anuncio de vez: perder 2s por causa de uma
   *  tela informativa seria injusto justamente com quem joga em grupo. */
  onPause: (on: boolean) => void
}) {
  const spec = state.round[state.index]
  const player = state.mode === 'revezamento' ? state.players[state.turn] : undefined
  const fx = useFx()

  // Cada desafio comeca a escalada do chao. Herdar a sequencia do desafio
  // anterior inflaria o selo sem a pessoa ter feito nada para merecer.
  useEffect(() => { fx.zerarCombo() }, [state.index])

  const leito = spec ? AMBIENTE_DOM[spec.id] : undefined
  useEffect(() => {
    if (!leito) return
    ambiente(leito)
    return () => ambiente(null)
  }, [leito])

  // Anuncio de vez: aparece a cada troca de jogador, e SO no revezamento.
  // Sem ele, num grupo de quatro ninguem sabe de quem e a vez, e a partida
  // vira duas pessoas discutindo enquanto o relogio corre.
  const [announcing, setAnnouncing] = useState(Boolean(player))
  useEffect(() => {
    if (!player) return
    setAnnouncing(true)
    onPause(true)
    const id = setTimeout(() => { setAnnouncing(false); onPause(false) }, TURN_MS)
    return () => clearTimeout(id)
  }, [state.index, state.turn, Boolean(player)])

  if (!spec) return null

  const common = {
    secondsLeft: state.secondsLeft,
    onDone,
    onPenalty,
  }

  return (
    <div className="relative grid h-full grid-rows-[auto_1fr]">
      {/* Faixa da cor do jogador da vez, no topo da tela inteira. E o sinal
          que a fila enxerga de longe, sem precisar ler nada. */}
      {player && (
        <motion.div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: player.color, boxShadow: '0 0 22px ' + player.color, zIndex: 40 }}
          layoutId="turn-bar"
        />
      )}

      <GameHud
        round={state.round}
        index={state.index}
        secondsLeft={state.secondsLeft}
        score={state.score}
        combo={state.combo}
        training={state.training}
        player={player}
      />

      {/* key por etapa: cada desafio monta limpo, sem herdar estado do
          anterior nem reaproveitar animacao pela metade. */}
      <div key={spec.id + ':' + state.index} className="min-h-0 pt-4">
        {spec.id === 'scanner' && <Scanner erp={spec.erp} {...common} />}
        {spec.id === 'fluxo' && <Fluxo flow={spec.flow} {...common} />}
        {spec.id === 'timeline' && <Timeline timeline={spec.timeline} {...common} />}
        {spec.id === 'firewall' && <Firewall drops={spec.drops} speed={spec.speed} {...common} />}
        {spec.id === 'triagem' && <Triagem tickets={spec.tickets} {...common} />}
        {spec.id === 'phishing' && <Phishing email={spec.email} {...common} />}
        {spec.id === 'backup' && <Backup length={spec.length} {...common} />}
        {spec.id === 'rack' && <Rack rack={spec.rack} {...common} />}
        {spec.id === 'wifi' && <Wifi wifi={spec.wifi} {...common} />}
        {spec.id === 'rede' && <Rede net={spec.net} {...common} />}
        {spec.id === 'suporte' && <Suporte chamados={spec.chamados} {...common} />}
        {spec.id === 'seguranca' && <Seguranca seg={spec.seg} {...common} />}
      </div>

      {/* ------------------------------------------------- de quem e a vez */}
      <AnimatePresence>
        {announcing && player && (
          <motion.div
            className="absolute inset-0 grid place-items-center"
            style={{ zIndex: 48, background: 'rgba(1,6,13,.93)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              className="w-full px-4 lg:px-16 text-center"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <p
                className="mb-4 uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: 22, letterSpacing: '.3em', color: 'var(--color-micro)',
                }}
              >
                agora é a vez de
              </p>

              <h2
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 'clamp(34px, 9vw, 130px)', lineHeight: 1,
                  color: player.color,
                  textShadow: '0 0 60px ' + player.color + '90',
                }}
              >
                {player.name}
              </h2>

              <div
                className="mx-auto mt-7 h-2 w-72"
                style={{ background: player.color, boxShadow: '0 0 26px ' + player.color }}
              />

              <p className="mt-8 text-[24px]" style={{ color: 'var(--color-label)' }}>
                {spec.label}
              </p>
              <p
                className="mt-1 uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 15, letterSpacing: '.2em', color: 'var(--color-signal-yellow)',
                }}
              >
                criticidade {DIFFICULTY_LABEL[spec.difficulty]}
              </p>


            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
