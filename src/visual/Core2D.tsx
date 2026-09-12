/**
 * MISSAO TI :: nucleo em Canvas 2D.
 *
 * Este NAO e um plano B improvisado na vespera: e o piso do projeto. Foi
 * construido antes da versao WebGL e continua no build. A degradacao
 * automatica cai aqui quando o frame rate nao se sustenta, e o estande
 * segue funcionando sem ninguem precisar intervir.
 *
 * Só gradientes radiais e arcos: roda em qualquer maquina.
 */
import { useEffect, useRef } from 'react'

export function Core2D({ energy = 0, alert = 0 }: { energy?: number; alert?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef({ energy, alert })
  live.current = { energy, alert }

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = 0
    const start = performance.now()

    function resize() {
      const host = canvas!.parentElement!
      canvas!.width = Math.round(host.clientWidth * 0.6)
      canvas!.height = Math.round(host.clientHeight * 0.6)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    resize()

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden || now - last < 1000 / 30) return
      last = now

      const t = (now - start) / 1000
      const { energy: e, alert: a } = live.current
      const w = canvas!.width, h = canvas!.height
      const cx = w / 2, cy = h / 2
      const accent = a > 0.5 ? [255, 83, 96] : [21, 199, 255]
      const rgb = (alpha: number) => `rgba(${accent[0]},${accent[1]},${accent[2]},${alpha})`

      ctx!.fillStyle = '#01060D'
      ctx!.fillRect(0, 0, w, h)

      const breathe = 0.5 + 0.5 * Math.sin(t * (0.9 + e * 1.6))
      const R = Math.min(w, h) * (0.17 + breathe * 0.006 + e * 0.012)

      const halo = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55)
      halo.addColorStop(0, rgb(0.22 + e * 0.24))
      halo.addColorStop(0.45, rgb(0.05))
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx!.fillStyle = halo
      ctx!.fillRect(0, 0, w, h)

      ctx!.strokeStyle = rgb(0.55 + e * 0.4)
      ctx!.lineWidth = Math.max(1, Math.min(w, h) * 0.004)
      ctx!.beginPath(); ctx!.arc(cx, cy, R, 0, Math.PI * 2); ctx!.stroke()

      for (let i = 0; i < 3; i++) {
        const rr = R * (0.3 + ((t * 0.25 + i / 3) % 1) * 0.66)
        ctx!.strokeStyle = rgb((0.16 + e * 0.2) * (1 - rr / R))
        ctx!.beginPath(); ctx!.arc(cx, cy, rr, 0, Math.PI * 2); ctx!.stroke()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }} aria-hidden>
      <canvas ref={ref} className="h-full w-full" style={{ display: 'block' }} />
    </div>
  )
}
