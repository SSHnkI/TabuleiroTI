/**
 * MISSAO TI :: modo atracao.
 *
 * A tela parada e a mais importante do estande: e ela que decide se alguem
 * atravessa o corredor para jogar. Como ninguem esta lendo nem tocando,
 * aqui a intensidade visual pode ser maxima, sem prejudicar a latencia.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EncryptedText } from '@/components/ui/encrypted-text'
import { NumberTicker } from '@/components/motion/number-ticker'
import { Panel, HudLabel, Dot, Rule } from '@/components/hud'
import { HoldToStart } from '@/components/HoldToStart'
import { BigButton } from '@/components/BigButton'
import { rankRuns, stats, type Run } from '@/game/scoring.ts'
import { clearAll } from '@/game/storage.ts'
import { EASE_OUT } from '@/lib/ease'

const ROTATE_MS = 7000

export function Attract({ runs, onStart, onRuns, onTreino }: {
  runs: Run[]
  onStart: () => void
  /** Chamado quando o placar e apagado pelo atalho escondido. */
  onRuns: (runs: Run[]) => void
  /** Atalho escondido para o modo treino. */
  onTreino: () => void
}) {
  const [slide, setSlide] = useState(0)
  const [pedindoApagar, setPedindoApagar] = useState(false)

  const individual = rankRuns(runs, ['solo', 'duelo']).slice(0, 5)
  const teams = rankRuns(runs, ['revezamento', 'equipe']).slice(0, 5)
  const s = stats(runs)

  // Mesma regra da TV: so entra no rodizio o quadro que tem gente. Antes da
  // primeira partida do dia sobra um, e o convite a jogar fica parado nele.
  const all = [
    { key: 'ind', label: 'Melhores do dia', rows: individual },
    { key: 'eq', label: 'Melhores equipes', rows: teams },
  ]
  const withRows = all.filter(s => s.rows.length > 0)
  const slides = withRows.length > 0 ? withRows : [all[0]]

  useEffect(() => {
    setSlide(i => (i < slides.length ? i : 0))
    if (slides.length < 2) return
    const id = setInterval(() => setSlide(i => (i + 1) % slides.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [slides.length])

  return (
    <div className="relative grid h-full w-full grid-rows-[auto_1fr_auto] px-4 py-4 amplo:px-10 amplo:py-7">
      {/* ---------------------------------------------------- faixa superior */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dot /><Dot delay={0.3} /><Dot delay={0.6} />
          <HudLabel>Tecnologia · Sistema de chamados</HudLabel>
        </div>
        {/* O "o" de Expoplasti e um botao. Segure um segundo e meio para
            pedir o apagamento do placar.
            Por que escondido assim: o operador precisa zerar o dia sem
            atravessar o painel inteiro na frente da fila, e ao mesmo tempo
            um visitante curioso nao pode apagar o ranking por acidente.
            Segurar, e nao tocar, e o que garante as duas coisas. */}
        <HudLabel>
          Estande TI · Exp<Segredo onSegurar={() => setPedindoApagar(true)}>o</Segredo>plasti
        </HudLabel>
      </header>

      {/* ------------------------------------------------------------ centro */}
      {/* min-w-0: sem isto o titulo gigante recusa encolher e empurra a coluna
          do ranking para fora da tela. Filho de grid tem min-width:auto por padrao. */}
      <section className="grid min-h-0 grid-cols-1 items-center gap-6 amplo:grid-cols-[1.15fr_.85fr] amplo:gap-14">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <HudLabel className="mb-4">Protocolo de emergência</HudLabel>

            <h1
              className="leading-[0.88]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(34px, 9vw, 132px)' }}
            >
              <span style={{ color: '#EAFBFF' }}>MISSÃO</span>{' '}
              {/* Segure o TI por um segundo e meio e cai no modo treino.
                  Alvo enorme e facil de achar quando se sabe, e inofensivo
                  se alguem disparar sem querer: treino nao apaga nem grava
                  nada, e sai com um toque em Voltar.
                  O gesto e o mesmo do 'o' que apaga o placar, entao o
                  operador decora um jeito so. */}
              <Segredo onSegurar={onTreino}>
                <span style={{ color: 'var(--color-cyan-core)', textShadow: 'var(--glow-cyan)' }}>TI</span>
              </Segredo>
            </h1>

            <div
              className="mt-3"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 'clamp(14px, 2.2vw, 30px)',
                letterSpacing: '.22em', color: 'var(--color-label)',
              }}
            >
              <EncryptedText text="SALVE O SISTEMA" revealDelayMs={70} flipDelayMs={40} />
            </div>

            <Rule className="my-7 max-w-lg" />

            <p className="max-w-lg text-[17px] leading-relaxed" style={{ color: 'var(--color-label)' }}>
              Um pedido travou e a fábrica parou. Quatro desafios, dois minutos,
              e o sistema volta ao ar. Ou não.
            </p>

            <div className="mt-9">
              <HoldToStart onConfirm={onStart} />
            </div>
          </motion.div>
        </div>

        {/* ------------------------------------------------ painel rotativo */}
        <Panel className="min-w-0 p-7" tone="neutral">
          <div className="mb-5 flex items-center justify-between">
            <HudLabel>{slides[slide].label}</HudLabel>
            <div className="flex gap-1.5">
              {slides.map((sl, i) => (
                <span
                  key={sl.key}
                  style={{
                    width: i === slide ? 18 : 6, height: 3,
                    background: i === slide ? 'var(--color-cyan-core)' : 'var(--color-ink-500)',
                    transition: 'width .3s var(--ease-out)',
                  }}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.ol
              key={slides[slide].key}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="min-h-[232px] space-y-2"
            >
              {slides[slide].rows.length === 0 && (
                <li className="pt-16 text-center text-sm" style={{ color: 'var(--color-micro)' }}>
                  Ninguém entrou no ranking ainda.<br />Seja o primeiro.
                </li>
              )}
              {slides[slide].rows.map((r, i) => (
                <li key={r.at} className="flex items-center gap-4 py-1.5">
                  <span
                    className="tnum grid h-8 w-8 shrink-0 place-items-center text-sm"
                    style={{
                      color: i === 0 ? 'var(--color-signal-yellow)' : 'var(--color-micro)',
                      border: `1px solid ${i === 0 ? 'var(--color-signal-yellow)' : 'var(--color-ink-500)'}`,
                      boxShadow: i === 0 ? 'var(--glow-yellow)' : 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[17px]">{r.name}</span>
                  <span
                    className="tnum text-[19px]"
                    style={{ color: i === 0 ? 'var(--color-signal-yellow)' : '#EAFBFF' }}
                  >
                    {r.score}
                  </span>
                </li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </Panel>
      </section>

      {pedindoApagar && (
        <ConfirmarApagar
          total={runs.length}
          onCancelar={() => setPedindoApagar(false)}
          onApagar={() => { onRuns(clearAll()); setPedindoApagar(false) }}
        />
      )}

      {/* ---------------------------------------------------- faixa inferior */}
      <footer className="flex items-end justify-between">
        <div className="flex flex-wrap gap-6 amplo:gap-12">
          <Stat label="Jogadores hoje" value={s.played} />
          <Stat label="Equipes" value={s.teams} />
          <Stat label="Recorde" value={s.best} tone="var(--color-signal-yellow)" />
        </div>
        <HudLabel>Toque e segure para iniciar</HudLabel>
      </footer>
    </div>
  )
}

function Stat({ label, value, tone = '#EAFBFF' }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <HudLabel className="mb-1">{label}</HudLabel>
      <div className="tnum text-4xl" style={{ color: tone, textShadow: tone !== '#EAFBFF' ? 'var(--glow-yellow)' : 'none' }}>
        {/* startOnView={false}: sem isto o contador anima uma vez e congela,
            porque o componente espera entrar em viewport e aqui ele ja nasce visivel. */}
        <NumberTicker value={value} startOnView={false} />
      </div>
    </div>
  )
}

/**
 * O "o" escondido.
 *
 * Nao muda de aparencia: precisa parecer letra, senao deixa de ser atalho e
 * vira botao. O unico sinal e o proprio tempo de espera.
 */
function Segredo({ children, onSegurar }: {
  children: ReactNode
  onSegurar: () => void
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parar = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => parar, [])

  return (
    <span
      role="presentation"
      style={{ cursor: 'inherit', touchAction: 'none', position: 'relative' }}
      onPointerDown={e => {
        e.stopPropagation()
        parar()
        timer.current = setTimeout(onSegurar, 1500)
      }}
      onPointerUp={parar}
      onPointerLeave={parar}
      onPointerCancel={parar}
    >
      {children}
      {/* A area de toque, invisivel e maior que o texto.
          A letra tem 11x17 pixels, que no monitor do estande e 3x5mm:
          escondido nao pode virar inatingivel. Esta caixa leva o alvo para
          perto de 40px.
          Por que sobreposta e nao respiro na propria letra: respiro exige
          inline-block, e inline-block cria ponto de quebra de linha. O nome
          da empresa comecou a quebrar como EXPO / PLASTI no cabecalho. */}
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: '-13px -14px', display: 'block',
          // A regra de celular (#root main * { max-width: 100% }) existe para
          // impedir que um botao largo empurre a tela. Aqui ela travava a
          // area de toque na largura da propria letra, 11px, e o atalho
          // voltava a ser inatingivel com o dedo. Estilo em linha vence a
          // regra, e so aqui.
          maxWidth: 'none', minWidth: 0,
        }}
      />
    </span>
  )
}

/** Confirmacao de apagar. Duas perguntas seria teatro; uma, com o numero de
 *  partidas que somem escrito na tela, e informacao. */
function ConfirmarApagar({ total, onApagar, onCancelar }: {
  total: number
  onApagar: () => void
  onCancelar: () => void
}) {
  return (
    <div
      className="fixed inset-0 grid place-items-center px-6"
      style={{ zIndex: 60, background: 'rgba(4,5,15,.88)' }}
    >
      <div
        className="w-full max-w-lg p-8"
        style={{
          clipPath: 'var(--notch)',
          background: 'var(--color-ink-800)',
          border: '1px solid var(--color-signal-red)',
          boxShadow: 'var(--glow-red)',
        }}
      >
        <HudLabel>Atalho do operador</HudLabel>
        <h2
          className="mt-3 uppercase"
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(22px, 5.6vw, 34px)', color: 'var(--color-signal-red)',
          }}
        >
          Apagar o placar do dia?
        </h2>
        <p className="mt-3" style={{ color: 'var(--color-label)' }}>
          {total === 0
            ? 'Não há nenhuma partida gravada. Não vai sumir nada.'
            : total + (total === 1 ? ' partida gravada some' : ' partidas gravadas somem')
              + '. Isto não tem volta: exporte o CSV antes se ainda precisar dos números.'}
        </p>

        <div className="mt-7 flex flex-col gap-3 amplo:flex-row">
          <BigButton tone="ghost" className="flex-1" onTap={onCancelar}>
            Cancelar
          </BigButton>
          <BigButton tone="danger" className="flex-1" onTap={onApagar}>
            Apagar tudo
          </BigButton>
        </div>
      </div>
    </div>
  )
}
