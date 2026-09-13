/**
 * MISSAO TI :: painel do operador.
 *
 * Existe por causa de tres problemas concretos da edicao anterior do estande:
 * pontuacao que se perdeu, ausencia de qualquer controle durante o dia, e
 * nenhuma forma de corrigir um engano sem reiniciar tudo.
 *
 * Escondido atras de um gesto secreto de proposito: um botao visivel vira
 * brincadeira de visitante em dois minutos de feira.
 */
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, Dumbbell, Gauge, Hand, ShieldCheck, Trash2, Undo2, Volume2, VolumeX, X } from 'lucide-react'
import { HudLabel, Panel, Rule } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import { HoldToConfirmButton } from '@/components/spectrumui/hold-to-confirm'
import { downloadCSV, undoLast, clearAll, storageHealth } from '@/game/storage.ts'
import { stats, type Run } from '@/game/scoring.ts'
import { forceTier, type PerfTier, type PerfState } from '@/visual/perf.ts'

export function Admin({ runs, perf, muted, onMute, onRuns, onClose, onTreino }: {
  runs: Run[]
  perf: PerfState
  muted: boolean
  onMute: (v: boolean) => void
  onRuns: (r: Run[]) => void
  onClose: () => void
  /** Abre a escolha de desafio para treinar sem sujar o placar. */
  onTreino: () => void
}) {
  const s = stats(runs)
  const [touchTest, setTouchTest] = useState(false)
  const health = storageHealth()

  return (
    <div className="h-full overflow-y-auto px-4 py-4 amplo:px-10 amplo:py-7">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <HudLabel className="mb-1">Uso interno</HudLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(17px, 4.53vw, 38px)' }}>
            PAINEL DO OPERADOR
          </h1>
        </div>
        <BigButton onTap={onClose} tone="ghost">
          <X size={20} className="mr-2 inline" /> FECHAR
        </BigButton>
      </header>

      {/* Aviso de armazenamento. Se o placar caiu para memoria, o dia se
          perde ao fechar o navegador, e o operador precisa saber AGORA. */}
      {health !== 'ok' && (
        <Panel tone="red" className="mb-5 flex items-center gap-4 p-5">
          <AlertTriangle size={28} style={{ color: 'var(--color-signal-red)' }} />
          <div>
            <b style={{ color: 'var(--color-signal-red)' }}>
              {health === 'memoria'
                ? 'O navegador está recusando gravar o placar.'
                : 'O placar principal falhou e foi recuperado do espelho.'}
            </b>
            <p className="text-[14px]" style={{ color: 'var(--color-label)' }}>
              {health === 'memoria'
                ? 'Exporte o CSV agora e verifique se o Chrome não está em janela anônima.'
                : 'Nada foi perdido, mas exporte o CSV por segurança.'}
            </p>
          </div>
        </Panel>
      )}

      <div className="mb-6 grid grid-cols-5 gap-4">
        <Metric label="Jogadores" value={s.played} />
        <Metric label="Equipes" value={s.teams} />
        <Metric label="Média" value={s.average} />
        <Metric label="Recorde" value={s.best} tone="var(--color-signal-yellow)" />
        <Metric
          label="Pico por hora"
          value={s.peakHour ? s.peakHour[1] : 0}
          sub={s.peakHour ? String(s.peakHour[0]).padStart(2, '0') + 'h' : '—'}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* -------------------------------------------------------- operacao */}
        <Panel className="p-7">
          <HudLabel className="mb-4">Durante a feira</HudLabel>

          <div className="space-y-3">
            <Action
              icon={<Dumbbell size={20} />}
              title="Modo treino"
              hint="Escolhe um desafio e joga só ele. Não entra no placar."
              onTap={onTreino}
            />
            <Action
              icon={<Download size={20} />}
              title="Exportar CSV agora"
              hint="Faça isso no meio do dia também, não só no fim."
              onTap={() => downloadCSV(runs)}
            />
            <Action
              icon={<Undo2 size={20} />}
              title="Desfazer última pontuação"
              hint="Para quando a partida foi registrada por engano."
              onTap={() => onRuns(undoLast())}
            />
            <Action
              icon={muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              title={muted ? 'Som desligado' : 'Som ligado'}
              hint="Desligue se a feira estiver barulhenta ou alguém reclamar."
              onTap={() => onMute(!muted)}
            />
            <Action
              icon={<Hand size={20} />}
              title="Testar multi-toque"
              hint="Descobre quantos dedos este monitor reconhece ao mesmo tempo."
              onTap={() => setTouchTest(true)}
            />
          </div>

          <Rule className="my-6" />

          <HudLabel className="mb-3">Zona de risco</HudLabel>
          <p className="mb-3 text-[14px]" style={{ color: 'var(--color-micro)' }}>
            Apaga o ranking inteiro deste navegador. Não tem volta. Exporte o CSV antes.
          </p>
          <HoldToConfirmButton
            onConfirm={() => onRuns(clearAll())}
            duration={2200}
            label="Segure para apagar o ranking"
            confirmedLabel="Ranking apagado"
            icon={<Trash2 size={18} />}
            size="lg"
          />
        </Panel>

        {/* ----------------------------------------------------- performance */}
        <Panel className="p-7">
          <HudLabel className="mb-4">Desempenho</HudLabel>

          <div className="mb-5 flex items-baseline gap-4">
            <span
              className="tnum"
              style={{
                fontSize: 'clamp(25px, 6.67vw, 56px)',
                color: perf.fps < 45 ? 'var(--color-signal-red)' : 'var(--color-signal-green)',
              }}
            >
              {perf.fps}
            </span>
            <div>
              <HudLabel>quadros por segundo</HudLabel>
              <p className="text-[14px]" style={{ color: 'var(--color-label)' }}>
                Abaixo de 45 o visual desce de nível sozinho.
              </p>
            </div>
          </div>

          <HudLabel className="mb-2">Nível do visual</HudLabel>
          <div className="mb-2 grid grid-cols-4 gap-2">
            {(['full', 'reduced', 'minimal'] as PerfTier[]).map(t => (
              <TierButton key={t} tier={t} active={perf.tier === t && perf.forced} onTap={() => forceTier(t)} />
            ))}
            <TierButton tier={null} active={!perf.forced} onTap={() => forceTier(null)} />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--color-micro)' }}>
            {perf.forced
              ? 'Travado à mão. O medidor automático está desligado.'
              : 'Automático: o nível acompanha o frame rate medido.'}
          </p>

          <Rule className="my-6" />

          <div className="flex items-start gap-3">
            <ShieldCheck size={22} style={{ color: 'var(--color-signal-green)' }} />
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-label)' }}>
              O placar é gravado no navegador a cada partida, com uma cópia espelho.
              <b style={{ color: 'var(--color-signal-yellow)' }}> Nunca abra em janela anônima:</b> ao
              fechar, o ranking do dia vai junto.
            </p>
          </div>
        </Panel>
      </div>

      {touchTest && <TouchTest onClose={() => setTouchTest(false)} />}
    </div>
  )
}

function Metric({ label, value, tone = '#EAFBFF', sub }: {
  label: string; value: number; tone?: string; sub?: string
}) {
  return (
    <Panel className="px-5 py-4">
      <HudLabel className="mb-1">{label}</HudLabel>
      <div className="tnum text-[clamp(14px,3.73vw,32px)]" style={{ color: tone }}>{value}</div>
      {sub && <div className="tnum text-[13px]" style={{ color: 'var(--color-micro)' }}>{sub}</div>}
    </Panel>
  )
}

function Action({ icon, title, hint, onTap }: {
  icon: React.ReactNode; title: string; hint: string; onTap: () => void
}) {
  return (
    <button
      type="button"
      data-touch-target
      onPointerDown={onTap}
      className="flex w-full items-center gap-4 px-5 py-3.5 text-left outline-none"
      style={{
        border: '1px solid rgba(21,199,255,.2)',
        background: 'rgba(4,18,31,.7)',
      }}
    >
      <span style={{ color: 'var(--color-cyan-core)' }}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[16px]">{title}</span>
        <span className="block text-[13px]" style={{ color: 'var(--color-micro)' }}>{hint}</span>
      </span>
    </button>
  )
}

function TierButton({ tier, active, onTap }: {
  tier: PerfTier | null; active: boolean; onTap: () => void
}) {
  const label = tier === null ? 'AUTO' : tier === 'full' ? 'CHEIO' : tier === 'reduced' ? 'MÉDIO' : 'MÍNIMO'
  return (
    <button
      type="button"
      onPointerDown={onTap}
      className="px-2 py-2.5 text-[12px] uppercase tracking-wider outline-none"
      style={{
        border: '1px solid ' + (active ? 'var(--color-cyan-core)' : 'rgba(21,199,255,.18)'),
        background: active ? 'rgba(21,199,255,.18)' : 'transparent',
        color: active ? 'var(--color-cyan-bright)' : 'var(--color-micro)',
      }}
    >
      {label}
    </button>
  )
}

/**
 * Teste de multi-toque.
 *
 * Monitor touch barato as vezes so reporta um ou dois pontos. O modo duelo
 * depende de dois dedos simultaneos, entao isto precisa ser rodado no
 * monitor de verdade ANTES da feira, nao na vespera.
 */
function TouchTest({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<Map<number, { x: number; y: number }>>(new Map())
  const max = useRef(0)
  const [maxSeen, setMaxSeen] = useState(0)

  useEffect(() => {
    const up = (e: PointerEvent) => setActive(m => {
      const n = new Map(m); n.delete(e.pointerId); return n
    })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  function track(e: React.PointerEvent) {
    setActive(m => {
      const n = new Map(m)
      n.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (n.size > max.current) { max.current = n.size; setMaxSeen(n.size) }
      return n
    })
  }

  const verdict = maxSeen >= 2
    ? 'Este monitor aguenta o modo duelo.'
    : maxSeen === 1
      ? 'Só um toque por vez. O duelo em tela dividida não vai funcionar aqui.'
      : 'Encoste dois ou mais dedos na tela ao mesmo tempo.'

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 60, background: 'rgba(1,6,13,.97)', touchAction: 'none' }}
      onPointerDown={track}
      onPointerMove={e => active.has(e.pointerId) && track(e)}
    >
      <div className="pointer-events-none absolute inset-x-0 top-16 text-center">
        <Gauge size={34} className="mx-auto mb-3" style={{ color: 'var(--color-cyan-core)' }} />
        <HudLabel className="mb-2">Teste de multi-toque</HudLabel>
        <p className="tnum" style={{ fontSize: 'clamp(35px, 9.33vw, 78px)', color: 'var(--color-cyan-bright)' }}>{maxSeen}</p>
        <p className="text-[17px]" style={{ color: 'var(--color-label)' }}>
          dedos reconhecidos ao mesmo tempo
        </p>
        <p
          className="mt-3 text-[16px]"
          style={{ color: maxSeen >= 2 ? 'var(--color-signal-green)' : 'var(--color-signal-yellow)' }}
        >
          {verdict}
        </p>
      </div>

      {[...active.entries()].map(([id, p]) => (
        <div
          key={id}
          className="pointer-events-none absolute grid h-24 w-24 place-items-center rounded-full"
          style={{
            left: p.x, top: p.y, translate: '-50% -50%',
            border: '2px solid var(--color-cyan-core)',
            boxShadow: 'var(--glow-cyan)',
          }}
        >
          <span className="tnum text-[15px]">{id}</span>
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-12 flex justify-center">
        <BigButton onTap={onClose} tone="ghost">FECHAR TESTE</BigButton>
      </div>
    </div>
  )
}
