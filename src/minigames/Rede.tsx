/**
 * MISSAO TI :: TOPOLOGIA DE REDE, em 3D.
 *
 * A rede flutua no espaco, com o trafego correndo pelos links. O jogador
 * gira com o dedo e toca no ponto que CAUSOU a queda.
 *
 * Aqui esta a diferenca para o rack e para o wi-fi: varios pontos ficam
 * escuros, mas so um esta quebrado. Tocar num sintoma conta como erro, e o
 * jogo explica a diferenca na hora, em vez de so piscar vermelho.
 *
 * E o mesmo raciocinio que resolve o pedido travado do resto do jogo: a
 * falha aparece num lugar e nasceu em outro. Aqui ela fica visivel: basta
 * seguir a corrente a partir da internet e achar onde ela para.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Renderer, Camera, Transform, Box, Sphere, Program, Mesh, Raycast, Vec2, Vec3 } from 'ogl'
import { PALETA, PISO_VERT, PISO_FRAG } from '../visual/palette.glsl.ts'
import { RotateCw, Network, Check, TriangleAlert } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { useStuck, StuckHint } from '@/components/StuckHint'
import { alcancaveis, culpados, type NetCase, type NetNode } from '@/game/net-content.ts'
import { useFx } from '@/visual/Fx.tsx'

const VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vPos;
/** 0 a 1 ao longo do comprimento do link. */
varying float vT;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  vT = position.z + 0.5;
  gl_Position = projectionMatrix * mv;
}
`

/** No da rede: caixa ou esfera, acesa conforme o estado. */
const NODE_FRAG = /* glsl */ `
precision mediump float;
${PALETA}
uniform vec3 uColor;
uniform float uAlive;
uniform float uSelected;
uniform float uResolved;
uniform float uPulse;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float key = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0);
  float fres = pow(1.0 - abs(dot(n, v)), 2.2);

  // Apagado nao vira preto: vira cinza-azulado. Preto absoluto some do
  // fundo escuro, e um no invisivel nao pode ser tocado.
  vec3 base = mix(mix(INK_600, INK_500, 0.5), uColor, uAlive);
  vec3 col = base * (0.35 + key * 0.7);
  col += uColor * fres * (0.35 + uAlive * 0.9) * uPulse;
  col = mix(col, vec3(0.14, 0.87, 0.63), uResolved * 0.5);
  col += vec3(0.45, 0.8, 1.0) * uSelected * fres * 1.8;
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * Link: os tracos de trafego correm ao longo dele.
 * Link rompido nao tem trafego, e e isso que o olho procura.
 */
const LINK_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uTime;
uniform float uFlow;
varying float vT;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 1.5);

  vec3 col = uColor * (0.10 + fres * 0.35);

  // Pacotes correndo. Sem fluxo, o cabo continua desenhado, so morto: ver
  // o cabo intacto e sem trafego e o que ensina onde a corrente parou.
  float pos = fract(vT * 3.0 - uTime * 0.6);
  float pacote = smoothstep(0.10, 0.0, abs(pos - 0.5));
  col += uColor * pacote * 1.5 * uFlow;
  col += uColor * 0.25 * uFlow;

  gl_FragColor = vec4(col, 1.0);
}
`

const VIVO: [number, number, number] = [0.13, 0.78, 0.96]
const MORTO: [number, number, number] = [0.62, 0.20, 0.24]
const CAUSA: [number, number, number] = [1.0, 0.25, 0.18]

const TAM: Record<NetNode['kind'], [number, number, number]> = {
  internet: [0.62, 0.62, 0.62],
  firewall: [1.05, 0.34, 0.62],
  core: [1.15, 0.30, 0.72],
  switch: [0.92, 0.24, 0.58],
  servidor: [0.46, 0.62, 0.46],
  ap: [0.40, 0.14, 0.40],
}

export function Rede({ net, secondsLeft, onDone, onPenalty }: {
  net: NetCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const hostRef = useRef<HTMLDivElement>(null)

  const vivos = alcancaveis(net)
  const raizes = culpados(net)
  const alvos = raizes.length

  const [found, setFound] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [erroSintoma, setErroSintoma] = useState<string | null>(null)
  const finished = useRef(false)
  const travado = useStuck(found.length, 13000)

  const live = useRef({ found: [] as string[], selected: null as string | null })
  live.current = { found, selected }

  const yawTarget = useRef(0.4)
  const reset = useRef<(() => void) | null>(null)

  function finish(ratio: number) {
    if (finished.current) return
    finished.current = true
    onDone(ratio)
  }

  useEffect(() => {
    if (secondsLeft <= 0) finish(found.length / alvos)
  }, [secondsLeft, found.length])

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

    const camera = new Camera(gl, { fov: 38, near: 0.1, far: 120 })
    const scene = new Transform()

    // Fundo da sala. A camera olha a topologia de frente, entao o que faltava
    // atras dela nao era chao e sim parede: sem ela a rede flutuava no preto.
    // Fica fora do rig de proposito, para nao girar junto com a topologia.
    const fundo = new Mesh(gl, {
      geometry: new Box(gl, { width: 64, height: 44, depth: 0.05 }),
      program: new Program(gl, {
        vertex: PISO_VERT, fragment: PISO_FRAG, cullFace: false, transparent: true,
        uniforms: {
          uRaio: { value: 11.0 }, uEscala: { value: 0.35 }, uVertical: { value: 1 },
        },
      }),
    })
    fundo.position.z = -13
    fundo.setParent(scene)

    const rig = new Transform()
    rig.setParent(scene)

    const pos = new Map(net.nodes.map(n => [n.id, new Vec3(n.x, n.y, n.z)]))

    /* -------------------------------------------------------------- links */
    const linkGeo = new Box(gl, { width: 0.07, height: 0.07, depth: 1 })
    const linkMeshes = net.links.map(l => {
      const a = pos.get(l.from)!
      const b = pos.get(l.to)!
      const dir = new Vec3().copy(b).sub(a)
      const dist = dir.len()

      const program = new Program(gl, {
        vertex: VERT, fragment: LINK_FRAG,
        uniforms: {
          uColor: { value: l.ok ? VIVO : CAUSA },
          uTime: { value: 0 },
          // Link intacto que vem de area morta tambem nao tem trafego: o
          // desenho precisa contar a verdade, senao a deducao nao fecha.
          uFlow: { value: l.ok && vivos.has(l.from) && vivos.has(l.to) ? 1 : 0 },
        },
        cullFace: false,
      })
      const mesh = new Mesh(gl, { geometry: linkGeo, program })
      mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
      mesh.scale.set(1, 1, dist)
      // lookAt alinha o eixo Z do objeto com o alvo, que e exatamente o eixo
      // em que a geometria do cabo foi construida.
      mesh.lookAt([b.x, b.y, b.z])
      mesh.setParent(rig)
      return { mesh, link: l }
    })

    /* ---------------------------------------------------------------- nos */
    const boxGeo = new Box(gl, { width: 1, height: 1, depth: 1 })
    const sphereGeo = new Sphere(gl, { radius: 0.5, widthSegments: 24, heightSegments: 18 })

    const nodeMeshes = net.nodes.map(node => {
      const vivo = vivos.has(node.id)
      const ehCausa = raizes.includes(node.id)
      const program = new Program(gl, {
        vertex: VERT, fragment: NODE_FRAG,
        uniforms: {
          uColor: { value: vivo ? VIVO : (ehCausa ? CAUSA : MORTO) },
          uAlive: { value: vivo ? 1 : 0.22 },
          uSelected: { value: 0 },
          uResolved: { value: 0 },
          uPulse: { value: 1 },
        },
        cullFace: false,
      })
      const mesh = new Mesh(gl, {
        geometry: node.kind === 'internet' ? sphereGeo : boxGeo,
        program,
      })
      const [w, h, d] = TAM[node.kind]
      mesh.scale.set(w, h, d)
      mesh.position.set(node.x, node.y, node.z)
      mesh.setParent(rig)
      return { mesh, node }
    })

    function resize() {
      const { clientWidth: w, clientHeight: h } = host!
      renderer.setSize(Math.max(1, w), Math.max(1, h))
      gl.canvas.style.width = '100%'
      gl.canvas.style.height = '100%'
      const aspect = gl.canvas.width / Math.max(1, gl.canvas.height)
      camera.perspective({ aspect })

      // Enquadramento a partir da extensao real da topologia, com folga.
      const xs = net.nodes.map(n => Math.abs(n.x))
      const ys = net.nodes.map(n => Math.abs(n.y))
      const largura = Math.max(...xs) * 2 + 2.4
      const altura = Math.max(...ys) * 2 + 2.0
      const t = Math.tan((38 * Math.PI) / 360)
      const dist = Math.max(altura / (2 * t), largura / (2 * t * aspect)) * 1.08
      camera.position.set(0, 0, dist)
      camera.lookAt([0, 0, 0])
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    /* ---------------------------------------------------------- interacao */
    const raycast = new Raycast()
    const mouse = new Vec2()
    let dragging = false
    let moved = 0
    let lastX = 0
    let yaw = 0.4
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
      yawTarget.current += dx * 0.011
    }
    function onUp(e: PointerEvent) {
      if (!dragging) return
      dragging = false
      if (moved > 12) return
      const r = gl.canvas.getBoundingClientRect()
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      raycast.castMouse(camera, mouse)
      const hits = raycast.intersectBounds(nodeMeshes.map(nm => nm.mesh))
      if (!hits.length) return
      const alvo = nodeMeshes.find(nm => nm.mesh === hits[0])
      if (alvo) pick(alvo.node)
    }

    gl.canvas.addEventListener('pointerdown', onDown)
    gl.canvas.addEventListener('pointermove', onMove)
    gl.canvas.addEventListener('pointerup', onUp)
    gl.canvas.addEventListener('pointercancel', () => { dragging = false })

    reset.current = () => { yawTarget.current = 0.4 }

    let raf = 0
    let last = performance.now()
    const start = last

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - start) / 1000

      if (intro > 0) yawTarget.current += dt * 0.32
      yaw += (yawTarget.current - yaw) * Math.min(1, dt * 8)
      rig.rotation.y = yaw
      rig.rotation.x = Math.sin(t * 0.25) * 0.045

      for (const lm of linkMeshes) lm.mesh.program.uniforms.uTime.value = t

      for (const nm of nodeMeshes) {
        const u = nm.mesh.program.uniforms
        u.uSelected.value = live.current.selected === nm.node.id ? 1 : 0
        u.uResolved.value = live.current.found.includes(nm.node.id) ? 1 : 0
        // So a causa pulsa. Se todo ponto escuro piscasse, a tela viraria
        // arvore de natal e a deducao se perderia no meio do brilho.
        u.uPulse.value = raizes.includes(nm.node.id)
          ? 0.6 + 0.7 * Math.sin(t * 4.2)
          : 1
      }

      renderer.render({ scene, camera })
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
  }, [net])

  function pick(node: NetNode) {
    if (finished.current || live.current.found.includes(node.id)) return
    setSelected(node.id)

    if (raizes.includes(node.id)) {
      const next = [...live.current.found, node.id]
      setFound(next)
      setErroSintoma(null)
      fx.hit()
      if (next.length >= alvos) setTimeout(() => finish(1), 1000)
      return
    }

    fx.miss()
    onPenalty()
    // A distincao entre sintoma e causa e a licao do desafio, entao ela e
    // dita com todas as letras no momento do erro.
    setErroSintoma(vivos.has(node.id)
      ? 'Este está funcionando normalmente.'
      : 'Este está sem rede, mas por causa de outro. Suba a corrente até onde ela para.')
    setTimeout(() => setErroSintoma(null), 2600)
  }

  const sel = selected ? net.nodes.find(n => n.id === selected) : null
  const causaLink = net.links.find(l => !l.ok && found.includes(l.to))

  return (
    <div className="grid h-full grid-cols-[1fr_330px] gap-8 px-10 pb-6">
      <div className="sala-3d relative min-h-0">
        <div ref={hostRef} className="absolute inset-0" />

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
            arraste para girar a rede
          </div>
          <StuckHint show={travado && found.length < alvos}>
            Comece na internet e desça. Onde o tráfego para pela primeira vez?
          </StuckHint>
        </div>

        {/* Correcao imediata quando o jogador toca num sintoma. */}
        <AnimatePresence>
          {erroSintoma && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-2 flex justify-center"
            >
              <div
                className="flex items-center gap-2.5 px-5 py-2.5"
                style={{
                  border: '1px solid var(--color-signal-amber)',
                  background: 'rgba(8,11,30,.92)',
                  color: 'var(--color-signal-amber)',
                  fontSize: 15,
                }}
              >
                <TriangleAlert size={17} />
                {erroSintoma}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex min-h-0 flex-col pt-1">
        <div className="mb-4 flex items-center gap-3">
          <Network size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <HudLabel>Mapa da rede</HudLabel>
        </div>

        <p className="mb-5 text-[19px] leading-snug">{net.question}</p>

        <div className="mb-5 flex gap-2.5">
          {Array.from({ length: alvos }, (_, i) => (
            <div
              key={i}
              className="grid h-12 w-12 place-items-center"
              style={{
                border: '1px solid ' + (i < found.length ? 'var(--color-signal-green)' : 'rgba(33,200,246,.22)'),
                background: i < found.length ? 'rgba(37,223,160,.14)' : 'transparent',
                boxShadow: i < found.length ? 'var(--glow-green)' : 'none',
              }}
            >
              {i < found.length
                ? <Check size={20} style={{ color: 'var(--color-signal-green)' }} />
                : <span style={{ color: 'var(--color-micro)' }}>?</span>}
            </div>
          ))}
        </div>

        <div className="mb-5 space-y-1.5">
          {[
            ['rgb(33,199,245)', 'com tráfego'],
            ['rgb(158,51,61)', 'sem rede'],
          ].map(([c, txt]) => (
            <div key={txt} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: '0 0 10px ' + c }} />
              <span className="text-[15px]" style={{ color: 'var(--color-label)' }}>{txt}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          data-touch-target
          onPointerDown={() => reset.current?.()}
          className="mb-5 flex items-center justify-center gap-2.5 px-5 py-3.5 outline-none"
          style={{
            border: '1px solid rgba(33,200,246,.3)',
            background: 'rgba(22,26,86,.55)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 15, letterSpacing: '.1em',
          }}
        >
          <RotateCw size={18} />
          ENDIREITAR A REDE
        </button>

        <div className="min-h-[130px]">
          <AnimatePresence mode="wait">
            {causaLink ? (
              <motion.div
                key="causa"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                className="border-l-2 pl-4"
                style={{ borderColor: 'var(--color-signal-green)' }}
              >
                <HudLabel className="mb-1">Causa encontrada</HudLabel>
                <p className="text-[15px] leading-snug" style={{ color: 'var(--color-label)' }}>
                  {causaLink.causa}
                </p>
              </motion.div>
            ) : sel ? (
              <motion.div
                key={sel.id}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="border-l-2 pl-4"
                style={{ borderColor: vivos.has(sel.id) ? 'var(--color-cyan-core)' : 'var(--color-signal-red)' }}
              >
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#EAFBFF' }}>{sel.name}</p>
                <p className="mt-1 text-[15px] leading-snug" style={{ color: 'var(--color-label)' }}>
                  {sel.detail}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
