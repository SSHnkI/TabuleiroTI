/**
 * MISSAO TI :: MAPA DE WI-FI, em 3D.
 *
 * A planta do galpao vista de cima, em perspectiva, com as bolhas de
 * cobertura desenhadas por cima. Onde nao ha bolha, nao pega. O jogador gira
 * a planta com o dedo e toca no ponto de acesso que caiu.
 *
 * Mesma dinamica do rack, ambiente diferente: girar para entender o espaco,
 * tocar no equipamento com problema. Repetir a gramatica de interacao e de
 * proposito: quem aprendeu num aprende no outro sem ler nada.
 *
 * Zero conhecimento tecnico. Qualquer pessoa que ja reclamou de wi-fi no
 * refeitorio entende o buraco de sinal em dois segundos.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Renderer, Camera, Transform, Box, Sphere, Program, Mesh, Raycast, Vec2 } from 'ogl'
import { PALETA, PISO_VERT, PISO_FRAG } from '../visual/palette.glsl.ts'
import { criarJuice } from '../visual/juice.ts'
import { criarDestrocos } from '../visual/debris.ts'
import { ambiente, sExplosao, sEstilhaco } from '@/game/sound.ts'
import { RotateCw, Wifi as WifiIcon, Check, MessageSquareWarning } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { useStuck, StuckHint } from '@/components/StuckHint'
import type { WifiCase, AccessPoint } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'

const VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform mat4 modelMatrix;
varying vec3 vNormal;
varying vec3 vPos;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  vUv = uv;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}
`

/** Paredes: concreto escuro com topo iluminado. */
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
  col += CIANO_MARCA * fres * 0.40;
  col += CIANO * top * 0.20;
  gl_FragColor = vec4(col, 1.0);
}
`

/** Ponto de acesso: caixinha com o LED de status. */
const AP_FRAG = /* glsl */ `
precision mediump float;
${PALETA}
uniform vec3 uLed;
uniform float uBlink;
uniform float uSelected;
uniform float uResolved;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float top = max(n.y, 0.0);
  float fres = pow(1.0 - abs(dot(n, v)), 2.0);

  vec3 col = mix(INK_600, INK_500, 0.45) * (0.55 + top * 0.85);
  col += uLed * (0.30 + fres * 0.9) * uBlink;
  col += uLed * top * 0.55 * uBlink;
  col = mix(col, vec3(0.14, 0.87, 0.63), uResolved * 0.5);
  col += vec3(0.4, 0.8, 1.0) * uSelected * fres * 1.4;
  gl_FragColor = vec4(col, 1.0);
}
`

/** Bolha de cobertura: casca aditiva, sem tapar o que esta embaixo. */
const DOME_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uLed;
uniform float uBlink;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 2.2);
  // Casca fina: a bolha precisa mostrar onde ha sinal sem esconder o chao.
  float a = fres * 0.34 * uBlink;
  gl_FragColor = vec4(uLed * (0.5 + fres), a);
}
`

const STATUS_COLOR: Record<AccessPoint['status'], [number, number, number]> = {
  ok: [0.15, 0.87, 0.63],
  atencao: [1.0, 0.62, 0.18],
  falha: [1.0, 0.25, 0.18],
}

export function Wifi({ wifi, secondsLeft, onDone, onPenalty }: {
  wifi: WifiCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const hostRef = useRef<HTMLDivElement>(null)
  const alvos = wifi.aps.filter(a => a.status === 'falha').length

  const [found, setFound] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const finished = useRef(false)
  const travado = useStuck(found.length, 12000)

  const live = useRef({ found: [] as number[], selected: null as number | null })
  live.current = { found, selected }

  const yawTarget = useRef(-0.5)
  const reset = useRef<(() => void) | null>(null)
  /** Ponte do toque (React) para o estrago (laco 3D): o React decide se
   *  acertou, o laco 3D faz o estrago no lugar certo da cena. */
  const golpe = useRef<((alvoId: number, acertou: boolean) => void) | null>(null)

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

    const camera = new Camera(gl, { fov: 36, near: 0.1, far: 120 })
    const scene = new Transform()
    const rig = new Transform()
    rig.setParent(scene)

    const juice = criarJuice()
    const destrocos = criarDestrocos(gl, rig, { chao: 0.06, tamanho: 0.30 })
    ambiente('fabrica')

    /* ------------------------------------------------------------- piso */
    const floor = new Mesh(gl, {
      geometry: new Box(gl, { width: 44, height: 0.08, depth: 44 }),
      program: new Program(gl, {
        vertex: PISO_VERT, fragment: PISO_FRAG, cullFace: false, transparent: true,
        uniforms: { uRaio: { value: 9.5 }, uEscala: { value: 0.5 }, uVertical: { value: 0 } },
      }),
    })
    floor.position.y = -0.04
    floor.setParent(rig)

    /* ---------------------------------------------------------- paredes */
    for (const w of wifi.walls) {
      const wall = new Mesh(gl, {
        geometry: new Box(gl, { width: w.w, height: 1.15, depth: w.d }),
        program: new Program(gl, { vertex: VERT, fragment: WALL_FRAG, cullFace: false }),
      })
      wall.position.set(w.x, 0.575, w.z)
      wall.setParent(rig)
    }

    /* ------------------------------------------------ pontos e coberturas */
    const apMeshes = wifi.aps.map((ap, i) => {
      const [r, g, b] = STATUS_COLOR[ap.status]

      // A bolha vem primeiro e sem escrita de profundidade, para nao comer
      // os objetos que estao dentro dela.
      const domeProgram = new Program(gl, {
        vertex: VERT, fragment: DOME_FRAG,
        uniforms: { uLed: { value: [r, g, b] }, uBlink: { value: 1 } },
        transparent: true, depthWrite: false, cullFace: false,
      })
      domeProgram.setBlendFunc(gl.SRC_ALPHA, gl.ONE)
      const dome = new Mesh(gl, {
        geometry: new Sphere(gl, { radius: 1, widthSegments: 28, heightSegments: 18 }),
        program: domeProgram,
      })
      dome.position.set(ap.x, 0.1, ap.z)
      dome.scale.set(ap.range, ap.range * 0.55, ap.range)
      dome.renderOrder = 2
      dome.setParent(rig)

      const program = new Program(gl, {
        vertex: VERT, fragment: AP_FRAG,
        uniforms: {
          uLed: { value: [r, g, b] },
          uBlink: { value: 1 },
          uSelected: { value: 0 },
          uResolved: { value: 0 },
        },
        cullFace: false,
      })
      const mesh = new Mesh(gl, {
        geometry: new Box(gl, { width: 0.52, height: 0.16, depth: 0.52 }),
        program,
      })
      mesh.position.set(ap.x, 1.28, ap.z)
      mesh.renderOrder = 3
      mesh.setParent(rig)

      // Haste ligando o ponto ao teto imaginario, para ele nao flutuar.
      const haste = new Mesh(gl, {
        geometry: new Box(gl, { width: 0.06, height: 1.2, depth: 0.06 }),
        program: new Program(gl, { vertex: VERT, fragment: WALL_FRAG, cullFace: false }),
      })
      haste.position.set(ap.x, 0.6, ap.z)
      haste.setParent(rig)

      return { mesh, dome, ap, index: i }
    })

    /* ------------------------------------------------------ enquadramento */
    function resize() {
      const { clientWidth: w, clientHeight: h } = host!
      renderer.setSize(Math.max(1, w), Math.max(1, h))
      gl.canvas.style.width = '100%'
      gl.canvas.style.height = '100%'
      const aspect = gl.canvas.width / Math.max(1, gl.canvas.height)
      camera.perspective({ aspect })

      // Enquadramento calculado, nao chutado: a planta tem tamanho conhecido,
      // entao a distancia sai da trigonometria do campo de visao. Sem isto a
      // planta fica cortada justo em monitor fora do 16:9.
      const LARGURA = 16
      const PROFUND = 14
      const t = Math.tan((36 * Math.PI) / 360)
      const porAltura = PROFUND / (2 * t)
      const porLargura = LARGURA / (2 * t * aspect)
      const dist = Math.max(porAltura, porLargura) * 1.06

      // Camera alta e inclinada, como maquete: e a vista que faz a planta
      // ser lida como espaco, e nao como desenho.
      camera.position.set(0, dist * 0.72, dist * 0.68)
      camera.lookAt([0, 0, 0])
      juice.ancorar(camera)
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
    let yaw = -0.5
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
      // So os pontos de acesso sao alvo. A bolha e informacao, nao botao.
      const hits = raycast.intersectBounds(apMeshes.map(a => a.mesh))
      if (!hits.length) return
      const alvo = apMeshes.find(a => a.mesh === hits[0])
      if (alvo) pick(alvo.index)
    }

    gl.canvas.addEventListener('pointerdown', onDown)
    gl.canvas.addEventListener('pointermove', onMove)
    gl.canvas.addEventListener('pointerup', onUp)
    gl.canvas.addEventListener('pointercancel', () => { dragging = false })

    reset.current = () => { yawTarget.current = -0.5 }

    golpe.current = (alvoId, acertou) => {
      const a = apMeshes[alvoId]
      if (!a) return
      const pos: [number, number, number] = [a.ap.x, 1.28, a.ap.z]
      if (acertou) {
        destrocos.explodir(pos, [0.145, 0.875, 0.627], 32, 2.2)
        juice.congelar(80); juice.tranco(1); juice.tremor(0.45)
        sExplosao()
      } else {
        destrocos.explodir(pos, [1.0, 0.247, 0.18], 16, 1.2)
        juice.congelar(45); juice.tremor(0.7)
        sEstilhaco()
      }
    }

    let raf = 0
    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const { dt } = juice.tick(now)
      destrocos.atualizar(dt)

      if (intro > 0) yawTarget.current += dt * 0.22
      yaw += (yawTarget.current - yaw) * Math.min(1, dt * 8)
      rig.rotation.y = yaw

      for (const a of apMeshes) {
        const p = a.mesh.program.uniforms
        p.uSelected.value = live.current.selected === a.index ? 1 : 0
        p.uResolved.value = live.current.found.includes(a.index) ? 1 : 0
        const pulse = a.ap.status === 'falha' ? 0.45 + 0.55 * Math.sin(now * 0.008) : 1
        p.uBlink.value = pulse
        a.dome.program.uniforms.uBlink.value = a.ap.status === 'falha' ? pulse * 0.6 : 1
        // A bolha respira de leve, para o mapa nao parecer imagem parada.
        const b = 1 + Math.sin(now * 0.0016 + a.index) * 0.02
        a.dome.scale.set(a.ap.range * b, a.ap.range * 0.55 * b, a.ap.range * b)
      }

      juice.aplicar(camera)
      renderer.render({ scene, camera })
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ambiente(null)
      golpe.current = null
      ro.disconnect()
      gl.canvas.removeEventListener('pointerdown', onDown)
      gl.canvas.removeEventListener('pointermove', onMove)
      gl.canvas.removeEventListener('pointerup', onUp)
      gl.canvas.remove()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [wifi])

  function pick(index: number) {
    if (finished.current || live.current.found.includes(index)) return
    const ap = wifi.aps[index]
    setSelected(index)

    if (ap.status === 'falha') {
      const next = [...live.current.found, index]
      setFound(next)
      golpe.current?.(index, true)
      fx.hit()
      if (next.length >= alvos) setTimeout(() => finish(1), 900)
    } else {
      golpe.current?.(index, false)
      fx.miss()
      onPenalty()
    }
  }

  const sel = selected != null ? wifi.aps[selected] : null

  return (
    <div className="grid h-full grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[1fr_320px] lg:gap-8 lg:px-10 lg:pb-6">
      <div className="sala-3d relative min-h-[46vh] lg:min-h-0">
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
            arraste para girar a planta
          </div>
          <StuckHint show={travado && found.length < alvos}>
            Procure o pedaço do galpão que ficou sem bolha de sinal.
          </StuckHint>
        </div>
      </div>

      <div className="flex min-h-0 flex-col pt-1">
        <div className="mb-4 flex items-center gap-3">
          <WifiIcon size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <HudLabel>Cobertura de rede sem fio</HudLabel>
        </div>

        <p className="mb-5 text-[19px] leading-snug">{wifi.question}</p>

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

        {/* As queixas sao o que traduz o mapa para a vida real: alguem
            reclamou, e a reclamacao tem endereco. */}
        <div className="mb-5 space-y-2">
          <HudLabel>Reclamações de hoje</HudLabel>
          {wifi.queixas.map(q => (
            <div key={q.texto} className="flex items-start gap-2.5">
              <MessageSquareWarning size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-signal-amber)' }} />
              <span className="text-[15px] leading-snug" style={{ color: 'var(--color-label)' }}>
                “{q.texto}”
              </span>
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
          ENDIREITAR A PLANTA
        </button>

        <div className="min-h-[110px]">
          <AnimatePresence mode="wait">
            {sel && (
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="border-l-2 pl-4"
                style={{
                  borderColor: 'rgb(' + STATUS_COLOR[sel.status].map(c => Math.round(c * 255)).join(',') + ')',
                }}
              >
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#EAFBFF' }}>{sel.name}</p>
                <p className="mt-1 text-[15px] leading-snug" style={{ color: 'var(--color-label)' }}>
                  {sel.detail}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
