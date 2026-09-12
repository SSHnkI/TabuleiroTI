/**
 * MISSAO TI :: teclado de toque.
 *
 * Nao usamos o teclado do Windows: em quiosque ele abre torto, cobre metade
 * da tela, as vezes nao abre, e quando abre da para sair do jogo por ele.
 * Teclas grandes, proprias, dentro da pagina.
 *
 * O nome ja nasce sugerido: quem so quer jogar aceita e vai; quem quer se
 * ver no ranking apaga e escreve o proprio. Os dois casos custam um toque.
 */
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Delete, Check, Shuffle } from 'lucide-react'
import { HudLabel, Panel } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import { PLAYER_COLORS, type Player } from '@/game/state.ts'
import { EASE_OUT } from '@/lib/ease'

const ROWS = ['QWERTYUIOP', 'ASDFGHJKLÇ', 'ZXCVBNM']
const MAX = 12

const ADJ = ['RÁPIDO', 'FERA', 'TURBO', 'NINJA', 'ALFA', 'ÁGIL', 'SUPER', 'ZEN', 'NEON', 'VELOZ']
const NOUN = ['FALCÃO', 'TIGRE', 'RAIO', 'CACTO', 'LOBO', 'COMETA', 'PANDA', 'TUCANO', 'JAGUAR', 'GARÇA']

function codename() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)]
  const n = NOUN[Math.floor(Math.random() * NOUN.length)]
  return (n + ' ' + a).slice(0, MAX)
}

export function TouchKeyboard({ count, onDone, onBack }: {
  count: number
  onDone: (players: Player[]) => void
  onBack: () => void
}) {
  const [players, setPlayers] = useState<Player[]>(() =>
    Array.from({ length: count }, (_, i) => ({ name: codename(), color: PLAYER_COLORS[i] })),
  )
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState<boolean[]>(() => Array(count).fill(false))

  const current = players[active]
  const canFinish = useMemo(() => players.every(p => p.name.trim().length > 0), [players])

  function setName(fn: (old: string) => string) {
    setPlayers(ps => ps.map((p, i) => (i === active ? { ...p, name: fn(p.name) } : p)))
  }

  function type(ch: string) {
    // A primeira tecla apaga o codinome sugerido: ninguem quer editar no meio
    // de FALCAO RAPIDO com o dedo, so escrever o proprio nome por cima.
    if (!touched[active]) {
      setTouched(t => t.map((v, i) => (i === active ? true : v)))
      setName(() => ch)
      return
    }
    setName(old => (old.length >= MAX ? old : old + ch))
  }

  function backspace() {
    setTouched(t => t.map((v, i) => (i === active ? true : v)))
    setName(old => old.slice(0, -1))
  }

  function reroll() {
    setTouched(t => t.map((v, i) => (i === active ? false : v)))
    setName(() => codename())
  }

  function advance() {
    if (active < count - 1) { setActive(active + 1); return }
    onDone(players.map(p => ({ ...p, name: p.name.trim() || codename() })))
  }

  return (
    <div className="grid h-full place-items-center px-8">
      <motion.div
        className="w-full max-w-4xl"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        <HudLabel className="mb-2 text-center">
          {count === 1 ? 'Identificação' : 'Jogador ' + (active + 1) + ' de ' + count}
        </HudLabel>

        {/* Trilha de jogadores. Em grupo, saber de quem e a vez importa mais
            que qualquer outra informacao da tela. */}
        {count > 1 && (
          <div className="mb-5 flex justify-center gap-2">
            {players.map((p, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={() => setActive(i)}
                className="px-4 py-2 text-[13px] uppercase tracking-wider"
                style={{
                  border: '1px solid ' + (i === active ? p.color : 'rgba(21,199,255,.18)'),
                  color: i === active ? p.color : 'var(--color-micro)',
                  boxShadow: i === active ? '0 0 18px ' + p.color + '55' : 'none',
                  background: i === active ? p.color + '18' : 'transparent',
                }}
              >
                {p.name || 'Jogador ' + (i + 1)}
              </button>
            ))}
          </div>
        )}

        <Panel className="mb-6 px-8 py-7" tone="cyan">
          <div className="flex items-center gap-4">
            <span
              className="h-10 w-1.5 shrink-0"
              style={{ background: current.color, boxShadow: '0 0 16px ' + current.color }}
            />
            <div
              className="min-h-[48px] min-w-0 flex-1 truncate"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, letterSpacing: '.04em' }}
            >
              {current.name || <span style={{ color: 'var(--color-micro)' }}>digite seu nome</span>}
            </div>
            <span className="tnum shrink-0 text-sm" style={{ color: 'var(--color-micro)' }}>
              {current.name.length}/{MAX}
            </span>
          </div>
        </Panel>

        <div className="space-y-2.5">
          {ROWS.map((row, r) => (
            <div key={r} className="flex justify-center gap-2.5" style={{ paddingInline: r * 22 }}>
              {row.split('').map(ch => (
                <Key key={ch} onTap={() => type(ch)}>{ch}</Key>
              ))}
              {r === 2 && (
                <Key onTap={backspace} wide tone="ghost">
                  <Delete size={26} strokeWidth={1.6} />
                </Key>
              )}
            </div>
          ))}
          <div className="flex justify-center gap-2.5 pt-1">
            <Key onTap={() => type(' ')} className="min-w-[240px]">ESPAÇO</Key>
            <Key onTap={reroll} wide tone="ghost">
              <Shuffle size={22} strokeWidth={1.6} />
              <span className="ml-2 text-[13px]">OUTRO NOME</span>
            </Key>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onPointerDown={onBack}
            className="px-6 py-3 text-[13px] uppercase tracking-widest"
            style={{ color: 'var(--color-micro)' }}
          >
            voltar
          </button>
          <BigButton onTap={advance} disabled={!canFinish} tone="success" className="min-w-[280px]">
            {active < count - 1 ? 'PRÓXIMO JOGADOR' : 'ENTRAR NA MISSÃO'}
            <Check size={20} className="ml-2 inline" />
          </BigButton>
        </div>
      </motion.div>
    </div>
  )
}

function Key({ children, onTap, wide, tone = 'key', className }: {
  children: React.ReactNode
  onTap: () => void
  wide?: boolean
  tone?: 'key' | 'ghost'
  className?: string
}) {
  const [down, setDown] = useState(false)
  return (
    <button
      type="button"
      data-touch-target
      onPointerDown={() => { setDown(true); onTap(); setTimeout(() => setDown(false), 110) }}
      onPointerCancel={() => setDown(false)}
      className={'flex items-center justify-center outline-none ' + (className ?? '')}
      style={{
        // 72px de lado. Dedo grosso, tela engordurada, pessoa em pe e com pressa.
        minWidth: wide ? 120 : 72,
        height: 72,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 24,
        color: tone === 'ghost' ? 'var(--color-label)' : '#EAFBFF',
        background: down
          ? 'linear-gradient(160deg, rgba(21,199,255,.32), rgba(10,110,146,.2))'
          : 'linear-gradient(160deg, rgba(12,48,73,.62), rgba(4,18,31,.72))',
        border: '1px solid ' + (down ? 'var(--color-cyan-core)' : 'rgba(21,199,255,.18)'),
        boxShadow: down ? 'var(--glow-cyan)' : 'none',
        transform: down ? 'scale(.94)' : 'scale(1)',
        transition: 'transform var(--dur-tap) var(--ease-out), box-shadow var(--dur-tap)',
      }}
    >
      {children}
    </button>
  )
}
