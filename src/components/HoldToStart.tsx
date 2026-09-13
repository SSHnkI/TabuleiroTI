/**
 * MISSAO TI :: iniciar segurando o dedo.
 *
 * Por que segurar em vez de tocar: num estande cheio, gente esbarra na tela
 * ao passar. Um toque simples abriria partidas fantasma a tarde inteira e
 * sujaria a fila. Segurar 700ms e rapido para quem quer jogar e praticamente
 * impossivel de disparar por acidente.
 *
 * POR QUE NAO HA requestAnimationFrame AQUI:
 * a primeira versao contava o tempo no rAF e morria em silencio sempre que o
 * navegador pausava as animacoes (aba em segundo plano, monitor dormindo,
 * protetor de tela). O botao ficava inerte sem nenhum sinal de erro, e este
 * e o unico botao sem o qual o estande inteiro para.
 *
 * Agora quem decide e um setTimeout, que dispara mesmo com animacao pausada,
 * e quem desenha e uma transicao CSS. Menos codigo e mais dificil de quebrar.
 */
import { useEffect, useRef, useState } from 'react'
import { Fingerprint } from 'lucide-react'

const HOLD_MS = 700

export function HoldToStart({ onConfirm, label = 'SEGURE PARA INICIAR' }: {
  onConfirm: () => void
  label?: string
}) {
  const [holding, setHolding] = useState(false)
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  function stop() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
  }

  function release() {
    if (fired.current) return
    stop()
    setHolding(false)
  }

  useEffect(() => stop, [])

  function begin(e: React.PointerEvent<HTMLButtonElement>) {
    if (fired.current || timer.current) return

    // Captura para o dedo poder escorregar sem largar o gesto. Protegida
    // porque uma captura recusada lancaria e derrubaria o botao.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* segue sem captura */ }

    // O sinal de "soltou" e o pointerup na JANELA, nao a perda da captura:
    // capturar pode falhar por motivo de navegador, rejeicao de palma ou
    // re-render, e nada disso significa que a pessoa tirou o dedo. Escutar
    // na janela tambem pega o caso do dedo levantar fora do botao.
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)

    setHolding(true)
    timer.current = setTimeout(() => {
      fired.current = true
      stop()
      setDone(true)
      onConfirm()
    }, HOLD_MS)
  }

  return (
    <button
      type="button"
      data-touch-target
      onPointerDown={begin}
      className="hold-iniciar relative flex w-full min-w-0 max-w-lg items-center gap-3 overflow-hidden px-4 py-5 uppercase outline-none amplo:gap-5 amplo:px-8 amplo:py-6"
      style={{
        touchAction: 'none',
        border: '1px solid var(--color-cyan-core)',
        background: 'linear-gradient(150deg, rgba(21,199,255,.14), rgba(4,18,31,.6))',
        boxShadow: holding ? 'var(--glow-cyan)' : '0 0 0 rgba(0,0,0,0)',
        transform: holding ? 'scale(.985)' : 'scale(1)',
        transition: 'box-shadow .2s var(--ease-out), transform .2s var(--ease-out)',
      }}
    >
      {/* Onda de energia acompanhando o dedo. Puro CSS: a largura e uma
          transicao, entao nao ha laco de animacao nenhum por tras. */}
      <span
        aria-hidden
        className="absolute inset-0 origin-left"
        style={{
          background: 'linear-gradient(90deg, rgba(21,199,255,.45), rgba(127,228,255,.2))',
          transform: 'scaleX(' + (holding ? 1 : 0) + ')',
          transition: holding
            ? 'transform ' + HOLD_MS + 'ms linear'
            : 'transform 180ms var(--ease-out)',
        }}
      />
      <Fingerprint
        size={34}
        strokeWidth={1.5}
        className="relative shrink-0"
        style={{ color: 'var(--color-cyan-bright)' }}
      />
      <span
        className="hold-rotulo relative flex-1 text-left"
        style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: 'clamp(15px, 4.4vw, 21px)', letterSpacing: '.12em', color: '#EAFBFF',
        }}
      >
        {done ? 'INICIANDO' : label}
      </span>
    </button>
  )
}
