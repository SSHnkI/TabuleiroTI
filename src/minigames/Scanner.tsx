/**
 * MISSAO TI :: desafio 1, SCANNER DE BUG.
 *
 * No prototipo original isto era uma lista de caixinhas para marcar. Em tela
 * de toque, marcar caixinha e preencher formulario, nao jogar. Aqui a tela
 * do ERP aparece de verdade e o dedo encosta em cima do campo errado.
 *
 * Erro custa 3 segundos, nao ponto, e nunca trava a tela: quem errou continua
 * jogando e a fila continua andando.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ScanLine, TriangleAlert } from 'lucide-react'
import { Panel, HudLabel } from '@/components/hud'
import type { ScannerCase } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'
import { useStuck, StuckHint } from '@/components/StuckHint'

export function Scanner({ erp, secondsLeft, onDone, onPenalty }: {
  erp: ScannerCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const fields = erp.fields
  const alvos = fields.filter(f => f.bug).length
  const [found, setFound] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const [reticle, setReticle] = useState<{ x: number; y: number } | null>(null)
  const done = useRef(false)
  const travado = useStuck(found.length, 11000)

  function finish(ratio: number) {
    if (done.current) return
    done.current = true
    onDone(ratio)
  }

  // O relogio e do pai. Quando zera, entrega o que conseguiu ate aqui.
  useEffect(() => {
    if (secondsLeft <= 0) finish(found.length / alvos)
  }, [secondsLeft, found.length])

  function tap(e: React.PointerEvent, id: string, bug: boolean) {
    if (done.current || found.includes(id)) return
    setReticle({ x: e.clientX, y: e.clientY })

    if (bug) {
      const next = [...found, id]
      setFound(next)
      fx.hit()
      fx.score(1, e.clientX, e.clientY)
      if (next.length >= alvos) setTimeout(() => finish(1), 700)
    } else {
      setWrong(id)
      setTimeout(() => setWrong(null), 600)
      fx.miss()
      onPenalty()
    }
  }

  return (
    <div className="desafio-2 grid h-full grid-cols-1 items-center gap-4 px-4 pb-4 amplo:grid-cols-[1.25fr_.75fr] amplo:gap-10 amplo:px-12 amplo:pb-10">
      {/* ------------------------------------------------------ tela do ERP */}
      <Panel className="relative overflow-hidden p-4 amplo:p-8" tone="cyan">
        {/* Varredura continua. E o que diz "estamos procurando alguma coisa". */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-24"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(21,199,255,.13), transparent)',
            animation: 'scanline-sweep 3.4s linear infinite',
          }}
        />

        <div className="mb-5 flex items-center justify-between">
          <div>
            <HudLabel>{erp.screen}</HudLabel>
            <div
              className="tnum mt-1"
              style={{ fontSize: 'clamp(14px, 3.73vw, 30px)', fontWeight: 700, color: '#EAFBFF' }}
            >
              {erp.ref}
            </div>
          </div>
          <span
            className="px-3 py-1.5 text-[12px] uppercase tracking-widest"
            style={{
              color: 'var(--color-signal-red)',
              border: '1px solid var(--color-signal-red)',
              boxShadow: 'var(--glow-red)',
            }}
          >
            {erp.status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-2 amplo:grid-cols-2 amplo:gap-y-2.5">
          {fields.map(f => {
            const hit = found.includes(f.id)
            const bad = wrong === f.id
            return (
              <button
                key={f.id}
                type="button"
                data-touch-target
                onPointerDown={e => tap(e, f.id, Boolean(f.bug))}
                className="relative overflow-hidden px-4 py-3 text-left outline-none"
                style={{
                  border: '1px solid ' + (hit ? 'var(--color-signal-green)' : bad ? 'var(--color-signal-red)' : 'rgba(21,199,255,.16)'),
                  background: hit
                    ? 'rgba(37,223,160,.14)'
                    : bad ? 'rgba(255,83,96,.18)' : 'rgba(4,18,31,.6)',
                  boxShadow: hit ? 'var(--glow-green)' : bad ? 'var(--glow-red)' : 'none',
                  transition: 'all .18s var(--ease-out)',
                }}
              >
                <HudLabel>{f.label}</HudLabel>
                <div
                  className="mt-0.5 break-words amplo:truncate"
                  style={{
                    fontFamily: f.mono ? 'var(--font-mono)' : 'var(--font-sans)',
                    fontSize: 19,
                    color: hit ? 'var(--color-signal-green)' : '#DCEEF8',
                  }}
                >
                  {f.value}
                </div>

                {/* Estilhaco. O campo racha quando e descoberto. */}
                <AnimatePresence>
                  {hit && <Shatter />}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* --------------------------------------------------------- instrucao */}
      <div>
        <div className="mb-5 flex items-center gap-3">
          <ScanLine size={30} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <HudLabel>Diagnóstico</HudLabel>
        </div>

        <p className="mb-7 text-[21px] leading-snug">
          {alvos} campos desta tela se contradizem.
          <br />
          <span style={{ color: 'var(--color-cyan-bright)' }}>Ache todos.</span>
        </p>

        <div className="flex gap-3">
          {Array.from({ length: alvos }, (_, i) => (
            <div
              key={i}
              className="grid h-14 w-14 place-items-center"
              style={{
                border: '1px solid ' + (i < found.length ? 'var(--color-signal-green)' : 'rgba(21,199,255,.2)'),
                background: i < found.length ? 'rgba(37,223,160,.14)' : 'transparent',
                boxShadow: i < found.length ? 'var(--glow-green)' : 'none',
                transition: 'all .25s var(--ease-out)',
              }}
            >
              {i < found.length
                ? <TriangleAlert size={22} style={{ color: 'var(--color-signal-green)' }} />
                : <span style={{ color: 'var(--color-micro)', fontSize: 20 }}>?</span>}
            </div>
          ))}
        </div>

        {/* O porque aparece assim que o campo racha: o jogo explica enquanto
            e jogado, em vez de guardar tudo para uma tela de resultado. */}
        <div className="mt-5">
          <StuckHint show={travado && found.length < alvos}>
            Compare os campos entre si. Um deles briga com outro.
          </StuckHint>
        </div>

        <div className="mt-4 min-h-[120px] space-y-3">
          <AnimatePresence>
            {fields.filter(f => found.includes(f.id)).map(f => (
              <motion.p
                key={f.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-l-2 pl-4 text-[15px] leading-snug"
                style={{ borderColor: 'var(--color-signal-green)', color: 'var(--color-label)' }}
              >
                <b style={{ color: 'var(--color-signal-green)' }}>{f.label}:</b> {f.why}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Mira no ultimo ponto tocado. Confirma onde o dedo encostou de fato,
          que numa tela capacitiva grande nem sempre e onde a pessoa achou. */}
      {reticle && (
        <motion.div
          key={reticle.x + ':' + reticle.y}
          className="pointer-events-none fixed"
          style={{ left: reticle.x, top: reticle.y, translate: '-50% -50%', zIndex: 44 }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="h-16 w-16 rounded-full"
            style={{ border: '2px solid var(--color-cyan-bright)' }}
          />
        </motion.div>
      )}
    </div>
  )
}

/** Cacos saindo do campo descoberto. Cinco poligonos, sem biblioteca. */
function Shatter() {
  const shards = [
    'polygon(0 0, 40% 0, 22% 100%, 0 70%)',
    'polygon(40% 0, 68% 0, 58% 100%, 22% 100%)',
    'polygon(68% 0, 100% 0, 100% 45%, 58% 100%)',
    'polygon(0 70%, 22% 100%, 0 100%)',
    'polygon(100% 45%, 100% 100%, 58% 100%)',
  ]
  return (
    <>
      {shards.map((clip, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: clip, background: 'rgba(127,228,255,.5)' }}
          initial={{ opacity: 0.9, scale: 1, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: 1.12,
            x: (i - 2) * 16,
            y: (i % 2 === 0 ? -1 : 1) * 14,
          }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </>
  )
}
