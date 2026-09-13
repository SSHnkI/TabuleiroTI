/**
 * MISSAO TI :: RESTAURACAO DO SISTEMA.
 *
 * O sistema mostra a sequencia de restauracao e o jogador repete na mesma
 * ordem. E o desafio mais dificil do jogo, e de proposito: ele exige atencao
 * e memoria, nao conhecimento previo, entao o convidado que nunca viu um ERP
 * tem exatamente a mesma chance que o analista de TI.
 *
 * Na pratica e o desempate do ranking. Os outros desafios premiam quem
 * conhece o processo; este premia quem esta prestando atencao.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  ShieldCheck, Camera, Database, Folder, Server, Check, HardDriveDownload,
} from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { RESTORE_STEPS } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'

const ICONS: Record<string, typeof Check> = {
  shield: ShieldCheck, camera: Camera, database: Database,
  folder: Folder, server: Server, check: Check,
}

type Phase = 'mostrando' | 'repetindo' | 'errou'

export function Backup({ length, secondsLeft, onDone, onPenalty }: {
  /** Tamanho da sequencia. Quanto mais critico o incidente, mais longa. */
  length: number
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  // A sequencia pode repetir passos: decorar "sao sempre seis diferentes"
  // tornaria o desafio trivial na segunda partida.
  const [seq] = useState(() =>
    Array.from({ length }, () => RESTORE_STEPS[Math.floor(Math.random() * RESTORE_STEPS.length)]),
  )
  const [phase, setPhase] = useState<Phase>('mostrando')
  const [highlight, setHighlight] = useState(-1)
  const [typed, setTyped] = useState<number[]>([])
  const [best, setBest] = useState(0)
  const finished = useRef(false)
  const bestRef = useRef(0)

  function finish() {
    if (finished.current) return
    finished.current = true
    onDone(bestRef.current / length)
  }

  useEffect(() => { if (secondsLeft <= 0) finish() }, [secondsLeft])

  // Apresentacao da sequencia, um passo por vez.
  useEffect(() => {
    if (phase !== 'mostrando') return
    let i = 0
    const id = setInterval(() => {
      setHighlight(i)
      setTimeout(() => setHighlight(-1), 380)
      i++
      if (i >= seq.length) {
        clearInterval(id)
        setTimeout(() => setPhase('repetindo'), 520)
      }
    }, 620)
    return () => clearInterval(id)
  }, [phase, seq.length])

  function tap(stepId: string) {
    if (finished.current || phase !== 'repetindo') return
    const pos = typed.length
    const certo = seq[pos].id === stepId

    if (!certo) {
      // Errou: perde tempo, a sequencia e mostrada de novo, e o que ja tinha
      // acertado fica guardado. Sem isso, um erro no ultimo passo zeraria
      // tudo e a pessoa largaria o jogo no meio, travando a fila.
      fx.miss()
      onPenalty()
      setPhase('errou')
      setTyped([])
      setTimeout(() => setPhase('mostrando'), 900)
      return
    }

    const next = [...typed, RESTORE_STEPS.findIndex(s => s.id === stepId)]
    setTyped(next)
    fx.hit()
    if (next.length > bestRef.current) {
      bestRef.current = next.length
      setBest(next.length)
    }
    if (next.length >= seq.length) setTimeout(finish, 600)
  }

  const label =
    phase === 'mostrando' ? 'Memorize a sequência'
    : phase === 'errou' ? 'Ordem errada. Olhe de novo.'
    : 'Agora repita, na mesma ordem'

  return (
    <div className="grid h-full grid-rows-[auto_auto_1fr] px-4 amplo:px-12 pb-8">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <HardDriveDownload size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <p className="text-[19px]" style={{ color: phase === 'errou' ? 'var(--color-signal-red)' : undefined }}>
            {label}
          </p>
        </div>
        <div className="text-right">
          <HudLabel>Melhor sequência</HudLabel>
          <span className="tnum text-[19px]">{best}/{length}</span>
        </div>
      </div>

      {/* ------------------------------------------------- trilha de progresso */}
      <div className="flex justify-center gap-2.5 pb-7">
        {seq.map((_, i) => (
          <span
            key={i}
            className="h-2.5 w-12"
            style={{
              background: i < typed.length ? 'var(--color-signal-green)' : 'rgba(21,199,255,.16)',
              boxShadow: i < typed.length ? 'var(--glow-green)' : 'none',
              transition: 'all .2s var(--ease-out)',
            }}
          />
        ))}
      </div>

      {/* --------------------------------------------------------- os botoes */}
      <div className="grid grid-cols-1 amplo:grid-cols-3 grid-rows-2 gap-5">
        {RESTORE_STEPS.map((step, i) => {
          const Icon = ICONS[step.icon] ?? Check
          const aceso = phase === 'mostrando' && highlight >= 0 && seq[highlight]?.id === step.id
          const jogavel = phase === 'repetindo'
          return (
            <motion.button
              key={step.id}
              type="button"
              data-touch-target
              onPointerDown={() => tap(step.id)}
              animate={{ scale: aceso ? 1.06 : 1 }}
              transition={{ duration: 0.18 }}
              className="grid place-items-center outline-none"
              style={{
                minHeight: 96,
                border: '1px solid ' + (aceso ? 'var(--color-cyan-bright)' : 'rgba(21,199,255,.2)'),
                background: aceso
                  ? 'linear-gradient(160deg, rgba(21,199,255,.4), rgba(4,18,31,.85))'
                  : 'linear-gradient(160deg, rgba(7,32,51,.88), rgba(2,9,20,.94))',
                boxShadow: aceso ? 'var(--glow-cyan)' : 'none',
                // Durante a apresentacao os botoes ficam apagados: tocar aqui
                // seria erro garantido e frustracao gratuita.
                opacity: jogavel || aceso ? 1 : 0.45,
                transition: 'opacity .25s, border-color .2s, box-shadow .2s',
              }}
            >
              <Icon
                size={34}
                strokeWidth={1.5}
                style={{ color: aceso ? 'var(--color-cyan-bright)' : 'var(--color-label)' }}
              />
              <span
                className="mt-2 uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 15, letterSpacing: '.1em',
                  color: aceso ? '#EAFBFF' : 'var(--color-label)',
                }}
              >
                {step.label}
              </span>
              <span className="tnum mt-0.5 text-[11px]" style={{ color: 'var(--color-micro)' }}>
                {i + 1}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
