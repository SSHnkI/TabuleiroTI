/**
 * MISSAO TI :: FILA DE CHAMADOS, no chao da fabrica em 3D.
 *
 * Os chamados abertos viram balizas de luz no lugar onde aconteceram. O
 * jogador gira a planta e toca NA ORDEM DE ATENDIMENTO.
 *
 * Por que em 3D e nao em cartao: aqui o LUGAR e informacao. Uma maquina
 * parada no meio da linha de producao pesa diferente de um mouse com
 * defeito no escritorio, e ver os dois no mapa torna isso obvio sem que
 * ninguem precise explicar regra de prioridade.
 *
 * As balizas NAO tem cor de urgencia. Se tivessem, o desafio viraria "toque
 * na vermelha" e deixaria de ensinar qualquer coisa: o que se le e o
 * chamado, nao a cor.
 *
 * Os rotulos sao DOM ancorado na posicao 3D projetada. Texto de interface
 * renderiza nitido e redimensiona sozinho; texto dentro de WebGL nao.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Renderer, Camera, Transform, Box, Cylinder, Program, Mesh, Raycast, Vec2, Vec3 } from 'ogl'
import { PALETA, PISO_VERT, PISO_FRAG } from '../visual/palette.glsl.ts'
import { RotateCw, Headset, Check, TriangleAlert } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { useStuck, StuckHint } from '@/components/StuckHint'
import type { SuporteCase, Incidente } from '@/game/ops-content.ts'
import { useFx } from '@/visual/Fx.tsx'

const PAREDES = [
  { x: 0, z: -5.2, w: 13.4, d: 0.3 },
  { x: 0, z: 5.2, w: 13.4, d: 0.3 },
  { x: -6.7, z: 0, w: 0.3, d: 10.4 },
  { x: 6.7, z: 0, w: 0.3, d: 10.4 },
  { x: -2.2, z: -1.6, w: 0.3, d: 6.8 },
  { x: 2.6, z: 1.4, w: 6.0, d: 0.3 },
]

const VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform mat4 modelMatrix;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorld;
varying float vY;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vY = position.y + 0.5;
  gl_Position = projectionMatrix * mv;
}
`

const WALL_FRAG = /* glsl */ `
precision mediump float;
${PALETA}
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float top = max(n.y, 0.0);
  float fres = pow(1.0 - abs(dot(n, v)), 2.5);
  vec3 col = INK_600 * (0.55 + top * 0.85);
  col += CIANO_MARCA * fres * 0.38;
  col += CIANO * top * 0.16;
  gl_FragColor = vec4(col, 1.0);
}
`

/** Baliza: coluna de luz subindo do chao. Some quando o chamado e atendido. */
const BEACON_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uTime;
uniform float uDone;
uniform float uSelected;
varying float vY;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 1.4);

  // Some para cima, como facho de luz.
  float fade = 1.0 - smoothstep(0.15, 1.0, vY);

  // Pulso subindo pela coluna: e o que faz a baliza chamar atencao de longe.
  float pulso = smoothstep(0.75, 1.0, sin((vY * 4.0 - uTime * 2.2)));

  vec3 cor = mix(uColor, vec3(0.14, 0.87, 0.63), uDone);
  vec3 col = cor * (0.35 + fres * 0.8) * fade;
  col += cor * pulso * fade * mix(0.9, 0.15, uDone);
  col += vec3(0.5, 0.85, 1.0) * uSelected * fres * 0.9;

  gl_FragColor = vec4(col, fade * mix(0.85, 0.30, uDone));
}
`

export function Suporte({ chamados, secondsLeft, onDone, onPenalty }: {
  chamados: SuporteCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const hostRef = useRef<HTMLDivElement>(null)
  const labelBox = useRef<HTMLDivElement>(null)
  const labelRefs = useRef(new Map<string, HTMLElement>())

  const total = chamados.incidentes.length
  const [atendidos, setAtendidos] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const finished = useRef(false)
  const travado = useStuck(atendidos.length, 13000)

  const live = useRef({ atendidos: [] as string[] })
  live.current = { atendidos }

  const yawTarget = useRef(-0.45)
  const reset = useRef<(() => void) | null>(null)

  function finish(ratio: number) {
    if (finished.current) return
    finished.current = true
    onDone(ratio)
  }

  useEffect(() => {
    if (secondsLeft <= 0) finish(atendidos.length / total)
  }, [secondsLeft, atendidos.length])

  /** A urgencia que deve ser atendida agora. Empates valem em qualquer ordem. */
  function urgenciaDaVez(feitos: string[]): number {
    const restantes = chamados.incidentes.filter(i => !feitos.includes(i.id))
    return Math.min(...restantes.map(i => i.urgencia))
  }

  function pick(inc: Incidente) {
    if (finished.current || live.current.atendidos.includes(inc.id)) return
    const esperada = urgenciaDaVez(live.current.atendidos)

    if (inc.urgencia === esperada) {
      const next = [...live.current.atendidos, inc.id]
      setAtendidos(next)
      setErro(null)
      fx.hit()
      if (next.length >= total) setTimeout(() => finish(1), 900)
      return
    }

    fx.miss()
    onPenalty()
    // Diz QUAL era o certo, nao so que errou. E a diferenca entre corrigir
    // e humilhar, e e o que faz a pessoa aprender a regra em vez de chutar.
    const certo = chamados.incidentes.find(i => !live.current.atendidos.includes(i.id) && i.urgencia === esperada)!
    setErro('Antes disso: ' + certo.texto.toLowerCase() + '. ' + certo.why)
    setTimeout(() => setErro(null), 3200)
  }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: Renderer
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: true, antialias: true, powerPreference: 'high-performance',
      })
    } catch { return }

    const gl = renderer.gl
    gl.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none'
    host.appendChild(gl.canvas)

    const camera = new Camera(gl, { fov: 36, near: 0.1, far: 120 })
    const scene = new Transform()
    const rig = new Transform()
    rig.setParent(scene)

    const floor = new Mesh(gl, {
      geometry: new Box(gl, { width: 44, height: 0.08, depth: 44 }),
      program: new Program(gl, {
        vertex: PISO_VERT, fragment: PISO_FRAG, cullFace: false, transparent: true,
        uniforms: { uRaio: { value: 9.0 }, uEscala: { value: 0.5 }, uVertical: { value: 0 } },
      }),
    })
    floor.position.y = -0.04
    floor.setParent(rig)

    for (const w of PAREDES) {
      const wall = new Mesh(gl, {
        geometry: new Box(gl, { width: w.w, height: 1.0, depth: w.d }),
        program: new Program(gl, { vertex: VERT, fragment: WALL_FRAG, cullFace: false }),
      })
      wall.position.set(w.x, 0.5, w.z)
      wall.setParent(rig)
    }

    /* ------------------------------------------------------------ balizas */
    const colGeo = new Cylinder(gl, { radiusTop: 0.16, radiusBottom: 0.26, height: 1, radialSegments: 18 })
    const beacons = chamados.incidentes.map(inc => {
      const program = new Program(gl, {
        vertex: VERT, fragment: BEACON_FRAG,
        uniforms: {
          uColor: { value: [1.0, 0.62, 0.18] },
          uTime: { value: 0 },
          uDone: { value: 0 },
          uSelected: { value: 0 },
        },
        transparent: true, depthWrite: false, cullFace: false,
      })
      program.setBlendFunc(gl.SRC_ALPHA, gl.ONE)
      const mesh = new Mesh(gl, { geometry: colGeo, program })
      mesh.scale.set(1, 3.4, 1)
      mesh.position.set(inc.x, 1.7, inc.z)
      mesh.renderOrder = 3
      mesh.setParent(rig)
      return { mesh, inc }
    })

    function resize() {
      const { clientWidth: w, clientHeight: h } = host!
      renderer.setSize(Math.max(1, w), Math.max(1, h))
      gl.canvas.style.width = '100%'
      gl.canvas.style.height = '100%'
      const aspect = gl.canvas.width / Math.max(1, gl.canvas.height)
      camera.perspective({ aspect })
      const t = Math.tan((36 * Math.PI) / 360)
      const dist = Math.max(15 / (2 * t), 17 / (2 * t * aspect)) * 1.04
      camera.position.set(0, dist * 0.66, dist * 0.70)
      camera.lookAt([0, 0, 0])
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    const raycast = new Raycast()
    const mouse = new Vec2()
    let dragging = false, moved = 0, lastX = 0
    let yaw = -0.45
    let intro = 1

    function onDown(e: PointerEvent) {
      dragging = true; moved = 0; lastX = e.clientX; intro = 0
      try { gl.canvas.setPointerCapture(e.pointerId) } catch { /* segue */ }
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      moved += Math.abs(dx)
      yawTarget.current += dx * 0.010
    }
    function onUp(e: PointerEvent) {
      if (!dragging) return
      dragging = false
      if (moved > 12) return
      const r = gl.canvas.getBoundingClientRect()
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      raycast.castMouse(camera, mouse)
      const hits = raycast.intersectBounds(beacons.map(b => b.mesh))
      if (!hits.length) return
      const alvo = beacons.find(b => b.mesh === hits[0])
      if (alvo) pick(alvo.inc)
    }

    gl.canvas.addEventListener('pointerdown', onDown)
    gl.canvas.addEventListener('pointermove', onMove)
    gl.canvas.addEventListener('pointerup', onUp)
    gl.canvas.addEventListener('pointercancel', () => { dragging = false })

    reset.current = () => { yawTarget.current = -0.45 }

    const tmp = new Vec3()
    let raf = 0
    let last = performance.now()
    const start = last

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - start) / 1000

      if (intro > 0) yawTarget.current += dt * 0.2
      yaw += (yawTarget.current - yaw) * Math.min(1, dt * 8)
      rig.rotation.y = yaw

      for (const b of beacons) {
        const u = b.mesh.program.uniforms
        u.uTime.value = t
        u.uDone.value = live.current.atendidos.includes(b.inc.id) ? 1 : 0
      }

      renderer.render({ scene, camera })

      /* ------------------------------------------- rotulos ancorados no 3D
         Escritos direto no style, sem passar por estado do React: sao
         dezenas de atualizacoes por segundo, e re-renderizar a arvore a cada
         quadro comeria o orcamento que o toque precisa. */
      const rect = labelBox.current?.getBoundingClientRect()
      if (rect) {
        for (const b of beacons) {
          const el = labelRefs.current.get(b.inc.id)
          if (!el) continue
          tmp.set(b.inc.x, 3.6, b.inc.z)
          tmp.applyMatrix4(rig.worldMatrix)
          camera.project(tmp)
          // Fora do campo de visao: esconde em vez de desenhar nas costas.
          if (tmp.z > 1) { el.style.opacity = '0'; continue }
          const sx = (tmp.x * 0.5 + 0.5) * rect.width
          const sy = (-tmp.y * 0.5 + 0.5) * rect.height
          el.style.transform = 'translate(-50%,-100%) translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)'
          el.style.opacity = '1'
        }
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.canvas.removeEventListener('pointerdown', onDown)
      gl.canvas.removeEventListener('pointermove', onMove)
      gl.canvas.removeEventListener('pointerup', onUp)
      gl.canvas.remove()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [chamados])

  return (
    <div className="grid h-full grid-cols-[1fr_310px] gap-8 px-10 pb-6">
      <div ref={labelBox} className="sala-3d relative min-h-0">
        <div ref={hostRef} className="absolute inset-0" />

        {/* Rotulos: o texto do chamado fica ancorado na baliza dele. Tocar
            aqui tambem vale, porque e um alvo maior que a coluna. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {chamados.incidentes.map(inc => {
            const feito = atendidos.includes(inc.id)
            return (
              <button
                key={inc.id}
                type="button"
                ref={el => { if (el) labelRefs.current.set(inc.id, el); else labelRefs.current.delete(inc.id) }}
                onPointerDown={() => pick(inc)}
                className="pointer-events-auto absolute left-0 top-0 max-w-[230px] px-3 py-2 text-left outline-none"
                style={{
                  willChange: 'transform',
                  opacity: 0,
                  border: '1px solid ' + (feito ? 'var(--color-signal-green)' : 'rgba(255,159,46,.55)'),
                  background: feito ? 'rgba(37,223,160,.16)' : 'rgba(8,11,30,.92)',
                  transition: 'border-color .2s, background .2s',
                }}
              >
                <span
                  className="block uppercase"
                  style={{ fontSize: 9, letterSpacing: '.18em', color: 'var(--color-micro)' }}
                >
                  {inc.setor}
                </span>
                <span
                  className="block leading-snug"
                  style={{
                    fontSize: 13,
                    color: feito ? 'var(--color-signal-green)' : '#DCEEF8',
                    textDecoration: feito ? 'line-through' : 'none',
                  }}
                >
                  {inc.texto}
                </span>
              </button>
            )
          })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center gap-2">
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{
              border: '1px solid rgba(33,200,246,.25)',
              background: 'rgba(8,11,30,.75)',
              color: 'var(--color-label)', fontSize: 15,
            }}
          >
            <RotateCw size={16} />
            arraste para girar a fábrica
          </div>
          <StuckHint show={travado && atendidos.length < total}>
            Comece pelo que para a empresa. Conforto fica por último.
          </StuckHint>
        </div>

        <AnimatePresence>
          {erro && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
            >
              <div
                className="flex max-w-xl items-start gap-2.5 px-5 py-2.5"
                style={{
                  border: '1px solid var(--color-signal-amber)',
                  background: 'rgba(8,11,30,.94)',
                  color: 'var(--color-signal-amber)', fontSize: 15, lineHeight: 1.4,
                }}
              >
                <TriangleAlert size={17} className="mt-0.5 shrink-0" />
                {erro}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-h-0 flex-col pt-1">
        <div className="mb-4 flex items-center gap-3">
          <Headset size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <HudLabel>Central de atendimento</HudLabel>
        </div>

        <p className="mb-5 text-[19px] leading-snug">{chamados.question}</p>

        <div className="mb-5 flex flex-wrap gap-2.5">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className="grid h-11 w-11 place-items-center"
              style={{
                border: '1px solid ' + (i < atendidos.length ? 'var(--color-signal-green)' : 'rgba(33,200,246,.22)'),
                background: i < atendidos.length ? 'rgba(37,223,160,.14)' : 'transparent',
                boxShadow: i < atendidos.length ? 'var(--glow-green)' : 'none',
              }}
            >
              {i < atendidos.length
                ? <Check size={18} style={{ color: 'var(--color-signal-green)' }} />
                : <span className="tnum text-[15px]" style={{ color: 'var(--color-micro)' }}>{i + 1}</span>}
            </div>
          ))}
        </div>

        <p className="mb-5 text-[15px] leading-relaxed" style={{ color: 'var(--color-label)' }}>
          As balizas não têm cor de urgência de propósito. O que decide a ordem
          é o que está escrito no chamado, e onde ele aconteceu.
        </p>

        <button
          type="button"
          data-touch-target
          onPointerDown={() => reset.current?.()}
          className="flex items-center justify-center gap-2.5 px-5 py-3.5 outline-none"
          style={{
            border: '1px solid rgba(33,200,246,.3)',
            background: 'rgba(22,26,86,.55)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 15, letterSpacing: '.1em',
          }}
        >
          <RotateCw size={18} />
          ENDIREITAR A PLANTA
        </button>
      </div>
    </div>
  )
}
