/**
 * MISSAO TI :: ACESSOS A EMPRESA, num globo 3D.
 *
 * Cada acesso e um ponto no globo, ligado a sede por um fluxo de pacotes
 * correndo. O jogador gira o mundo e toca no acesso que nao e de quem diz
 * ser.
 *
 * A pista e VIAGEM IMPOSSIVEL: a mesma pessoa aparece logada em dois lugares
 * distantes com poucos minutos de diferenca. Ninguem precisa saber nada de
 * seguranca para concluir que uma pessoa nao vai de Joinville a Kiev em
 * trinta e cinco minutos. E, ao mesmo tempo, e exatamente o metodo que se
 * usa de verdade para detectar conta invadida.
 *
 * O globo NAO marca o invasor com cor. Se marcasse, o desafio viraria "toque
 * no vermelho" e a licao se perderia: o que denuncia e comparar nome, lugar
 * e horario entre si.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Renderer, Camera, Transform, Box, Sphere, Program, Mesh, Raycast, Vec2, Vec3 } from 'ogl'
import { PALETA, PISO_VERT, PISO_FRAG } from '../visual/palette.glsl.ts'
import { criarJuice } from '../visual/juice.ts'
import { criarDestrocos } from '../visual/debris.ts'
import { ambiente, sExplosao, sEstilhaco } from '@/game/sound.ts'
import { RotateCw, ShieldAlert, Check, TriangleAlert } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { useStuck, StuckHint } from '@/components/StuckHint'
import { SEDE, relogio, distanciaKm, type SegurancaCase, type Acesso } from '@/game/ops-content.ts'
import { useFx } from '@/visual/Fx.tsx'

const R = 2.5
const PACOTES = 12

const VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vLocal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  vLocal = position;
  gl_Position = projectionMatrix * mv;
}
`

/** Globo: malha de meridianos e paralelos acesa, sem textura. */
const GLOBE_FRAG = /* glsl */ `
precision mediump float;
${PALETA}
uniform float uTime;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vLocal;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 2.4);

  vec3 p = normalize(vLocal);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(p.z, p.x);

  // Paralelos e meridianos.
  // fract(x + 0.5) - 0.5 zera nos inteiros, entao a distancia ate a linha
  // mais proxima vai de 0 (em cima da linha) a 1 (no meio do vao). O
  // smoothstep invertido acende so perto de zero.
  float dPar = abs(fract(lat * 6.0 / 3.14159 + 0.5) - 0.5) * 2.0;
  float dMer = abs(fract(lon * 6.0 / 3.14159 + 0.5) - 0.5) * 2.0;
  float par = smoothstep(0.09, 0.0, dPar);
  float mer = smoothstep(0.09, 0.0, dMer);

  // O oceano e o azul da marca, nao preto: um globo preto contra fundo preto
  // nao tem volume nenhum. Mas iluminado por igual ele vira disco, entao
  // entra uma luz lateral: um lado amanhece, o outro fica na sombra, e e essa
  // diferenca que faz o olho ler esfera.
  float key = 0.40 + 0.60 * max(dot(n, normalize(vec3(-0.45, 0.42, 0.78))), 0.0);
  vec3 col = INK_600 * 0.80 * key;
  col += CIANO_MARCA * max(par, mer) * 0.46 * (0.40 + key * 0.65);
  // Borda acesa: e o que fecha o contorno contra o fundo.
  col += CIANO * fres * 0.45;

  // Varredura lenta dando a volta, como radar.
  float sweep = smoothstep(0.16, 0.0, abs(fract((lon / 6.28318) - uTime * 0.06 + 0.5) - 0.5) * 2.0);
  col += CIANO * sweep * 0.30;

  gl_FragColor = vec4(col, 1.0);
}
`

/** Marcador de acesso e pacote de dados: o mesmo shader serve aos dois. */
const MARK_FRAG = /* glsl */ `
precision mediump float;
uniform vec3 uColor;
uniform float uSelected;
uniform float uResolved;
uniform float uPulse;
varying vec3 vNormal;
varying vec3 vPos;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 1.6);
  vec3 col = uColor * (0.55 + fres * 1.3) * uPulse;
  col = mix(col, vec3(0.14, 0.87, 0.63), uResolved * 0.6);
  col += vec3(0.55, 0.85, 1.0) * uSelected * fres * 1.6;
  gl_FragColor = vec4(col, 1.0);
}
`

const CIANO: [number, number, number] = [0.13, 0.78, 0.96]
const SEDE_COR: [number, number, number] = [1.0, 0.83, 0.24]

/** Lat/lon em graus para posicao na esfera. */
function naEsfera(lat: number, lon: number, raio = R): Vec3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new Vec3(
    -raio * Math.sin(phi) * Math.cos(theta),
    raio * Math.cos(phi),
    raio * Math.sin(phi) * Math.sin(theta),
  )
}

/** Ponto do arco entre dois lugares, erguido sobre a superficie. */
function noArco(a: Vec3, b: Vec3, t: number): Vec3 {
  const p = new Vec3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  )
  const len = p.len() || 1
  // Altura do arco cresce com a distancia: rota longa sobe mais, e fica
  // visivel que aquele acesso veio de muito longe.
  const alturaMax = 0.35 + new Vec3().copy(a).sub(b).len() * 0.16
  const erguer = (R + Math.sin(t * Math.PI) * alturaMax) / len
  return new Vec3(p.x * erguer, p.y * erguer, p.z * erguer)
}

export function Seguranca({ seg, secondsLeft, onDone, onPenalty }: {
  seg: SegurancaCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const hostRef = useRef<HTMLDivElement>(null)
  const labelBox = useRef<HTMLDivElement>(null)
  const labelRefs = useRef(new Map<string, HTMLElement>())

  const invasores = seg.acessos.filter(a => a.invasor)
  const alvos = invasores.length

  const [found, setFound] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const finished = useRef(false)
  const travado = useStuck(found.length, 14000)

  const live = useRef({ found: [] as string[], selected: null as string | null })
  live.current = { found, selected }

  const yawTarget = useRef(0)
  const reset = useRef<(() => void) | null>(null)
  /** Ponte do toque (React) para o estrago (laco 3D): o React decide se
   *  acertou, o laco 3D faz o estrago no lugar certo da cena. */
  const golpe = useRef<((alvoId: string, acertou: boolean) => void) | null>(null)

  function finish(ratio: number) {
    if (finished.current) return
    finished.current = true
    onDone(ratio)
  }

  useEffect(() => {
    if (secondsLeft <= 0) finish(found.length / alvos)
  }, [secondsLeft, found.length])

  function pick(ac: Acesso) {
    if (finished.current || live.current.found.includes(ac.id)) return
    setSelected(ac.id)

    if (ac.invasor) {
      const next = [...live.current.found, ac.id]
      setFound(next)
      setErro(null)
      golpe.current?.(ac.id, true)
      fx.hit()
      if (next.length >= alvos) setTimeout(() => finish(1), 1000)
      return
    }

    golpe.current?.(ac.id, false)
    fx.miss()
    onPenalty()
    setErro('Este acesso confere: ' + ac.usuario + ' em ' + ac.cidade
      + ' às ' + relogio(ac.hora) + '. Compare os nomes que aparecem duas vezes.')
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

    const camera = new Camera(gl, { fov: 36, near: 0.1, far: 100 })
    const scene = new Transform()

    // Parede de fundo: o globo precisa de um espaco atras dele, senao o
    // cenario inteiro e um buraco preto com uma bola dentro.
    const fundo = new Mesh(gl, {
      geometry: new Box(gl, { width: 64, height: 44, depth: 0.05 }),
      program: new Program(gl, {
        vertex: PISO_VERT, fragment: PISO_FRAG, cullFace: false, transparent: true,
        uniforms: {
          uRaio: { value: 11.0 }, uEscala: { value: 0.3 }, uVertical: { value: 1 },
        },
      }),
    })
    fundo.position.z = -14
    fundo.setParent(scene)

    const rig = new Transform()
    rig.setParent(scene)

    const juice = criarJuice()
    const destrocos = criarDestrocos(gl, rig, { chao: -9, tamanho: 0.16 })
    ambiente('orbita')

    /* ------------------------------------------------------------- globo */
    const globe = new Mesh(gl, {
      geometry: new Sphere(gl, { radius: R, widthSegments: 48, heightSegments: 32 }),
      program: new Program(gl, {
        vertex: VERT, fragment: GLOBE_FRAG,
        uniforms: { uTime: { value: 0 } },
        cullFace: false,
      }),
    })
    globe.setParent(rig)

    const markGeo = new Box(gl, { width: 0.17, height: 0.17, depth: 0.17 })
    const dotGeo = new Box(gl, { width: 0.075, height: 0.075, depth: 0.075 })

    const mkProgram = (cor: [number, number, number]) => new Program(gl, {
      vertex: VERT, fragment: MARK_FRAG,
      uniforms: {
        uColor: { value: cor },
        uSelected: { value: 0 },
        uResolved: { value: 0 },
        uPulse: { value: 1 },
      },
      cullFace: false,
    })

    /* --------------------------------------------------------------- sede */
    const posSede = naEsfera(SEDE.lat, SEDE.lon)
    const sede = new Mesh(gl, {
      geometry: new Box(gl, { width: 0.24, height: 0.24, depth: 0.24 }),
      program: mkProgram(SEDE_COR),
    })
    sede.position.copy(posSede)
    sede.setParent(rig)

    /* ------------------------------------------ acessos, arcos e pacotes */
    const marks = seg.acessos.map(ac => {
      const p = naEsfera(ac.lat, ac.lon)

      const mesh = new Mesh(gl, { geometry: markGeo, program: mkProgram(CIANO) })
      mesh.position.copy(p)
      mesh.setParent(rig)

      // Pacotes correndo do acesso ate a sede. O trajeto mostra a distancia
      // de um jeito que numero nenhum mostra.
      const dots = Array.from({ length: PACOTES }, (_, k) => {
        const d = new Mesh(gl, { geometry: dotGeo, program: mkProgram(CIANO) })
        d.setParent(rig)
        return { mesh: d, offset: k / PACOTES }
      })

      return { mesh, dots, ac, origem: p }
    })

    function resize() {
      const { clientWidth: w, clientHeight: h } = host!
      renderer.setSize(Math.max(1, w), Math.max(1, h))
      gl.canvas.style.width = '100%'
      gl.canvas.style.height = '100%'
      const aspect = gl.canvas.width / Math.max(1, gl.canvas.height)
      camera.perspective({ aspect })
      const t = Math.tan((36 * Math.PI) / 360)
      const precisa = R * 2.6
      const dist = Math.max(precisa / (2 * t), precisa / (2 * t * aspect)) * 1.05
      camera.position.set(0, 0, dist)
      camera.lookAt([0, 0, 0])
      juice.ancorar(camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    const raycast = new Raycast()
    const mouse = new Vec2()
    let dragging = false, moved = 0, lastX = 0, lastY = 0
    let yaw = 0, pitch = 0.15
    let intro = 1

    function onDown(e: PointerEvent) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; intro = 0
      try { gl.canvas.setPointerCapture(e.pointerId) } catch { /* segue */ }
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX; lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      yawTarget.current += dx * 0.010
      // Globo tambem inclina: sem isso, um acesso perto do polo fica
      // inalcancavel por mais que a pessoa gire.
      pitch = Math.max(-0.9, Math.min(0.9, pitch + dy * 0.006))
    }
    function onUp(e: PointerEvent) {
      if (!dragging) return
      dragging = false
      if (moved > 12) return
      const r = gl.canvas.getBoundingClientRect()
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
      raycast.castMouse(camera, mouse)
      const hits = raycast.intersectBounds(marks.map(m => m.mesh))
      if (!hits.length) return
      const alvo = marks.find(m => m.mesh === hits[0])
      if (alvo) pick(alvo.ac)
    }

    gl.canvas.addEventListener('pointerdown', onDown)
    gl.canvas.addEventListener('pointermove', onMove)
    gl.canvas.addEventListener('pointerup', onUp)
    gl.canvas.addEventListener('pointercancel', () => { dragging = false })

    reset.current = () => { yawTarget.current = 0; pitch = 0.15 }

    golpe.current = (alvoId, acertou) => {
      const m = marks.find(x => x.ac.id === alvoId)
      if (!m) return
      const pos: [number, number, number] = [m.origem.x, m.origem.y, m.origem.z]
      if (acertou) {
        destrocos.explodir(pos, [0.145, 0.875, 0.627], 34, 1.5)
        juice.congelar(90); juice.tranco(1.2); juice.tremor(0.55)
        sExplosao()
      } else {
        destrocos.explodir(pos, [1.0, 0.247, 0.18], 16, 0.85)
        juice.congelar(45); juice.tremor(0.7)
        sEstilhaco()
      }
    }

    const tmp = new Vec3()
    let raf = 0

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const { dt, t } = juice.tick(now)
      destrocos.atualizar(dt)

      if (intro > 0) yawTarget.current += dt * 0.16
      yaw += (yawTarget.current - yaw) * Math.min(1, dt * 8)
      rig.rotation.y = yaw
      rig.rotation.x = pitch
      globe.program.uniforms.uTime.value = t

      for (const m of marks) {
        const u = m.mesh.program.uniforms
        const achado = live.current.found.includes(m.ac.id)
        u.uSelected.value = live.current.selected === m.ac.id ? 1 : 0
        u.uResolved.value = achado ? 1 : 0
        u.uPulse.value = 1

        for (const d of m.dots) {
          const k = (t * 0.22 + d.offset) % 1
          const p = noArco(m.origem, posSede, k)
          d.mesh.position.copy(p)
          // Some nas pontas, para o fluxo nascer e morrer suave.
          const vis = Math.sin(k * Math.PI)
          d.mesh.scale.set(vis, vis, vis)
          d.mesh.program.uniforms.uResolved.value = achado ? 1 : 0
        }
      }

      juice.aplicar(camera)
      renderer.render({ scene, camera })

      const rect = labelBox.current?.getBoundingClientRect()
      if (rect) {
        for (const m of marks) {
          const el = labelRefs.current.get(m.ac.id)
          if (!el) continue
          tmp.copy(m.origem).applyMatrix4(rig.worldMatrix)
          camera.project(tmp)
          // Atras do globo: o rotulo some junto com o ponto, senao o texto
          // flutua sobre o planeta e mente sobre onde aquilo esta.
          const atras = tmp.z > 0.985
          if (atras) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue }
          const sx = (tmp.x * 0.5 + 0.5) * rect.width
          const sy = (-tmp.y * 0.5 + 0.5) * rect.height
          el.style.transform = 'translate(-50%,-140%) translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)'
          el.style.opacity = '1'
          el.style.pointerEvents = 'auto'
        }
      }
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
  }, [seg])

  const achado = found.length > 0
    ? seg.acessos.find(a => a.id === found[found.length - 1])
    : null

  return (
    <div className="grid h-full grid-cols-[1fr_330px] gap-8 px-10 pb-6">
      <div ref={labelBox} className="sala-3d relative min-h-0">
        <div ref={hostRef} className="absolute inset-0" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {seg.acessos.map(ac => {
            const feito = found.includes(ac.id)
            return (
              <button
                key={ac.id}
                type="button"
                ref={el => { if (el) labelRefs.current.set(ac.id, el); else labelRefs.current.delete(ac.id) }}
                onPointerDown={() => pick(ac)}
                className="absolute left-0 top-0 whitespace-nowrap px-2.5 py-1.5 text-left outline-none"
                style={{
                  willChange: 'transform',
                  opacity: 0,
                  border: '1px solid ' + (feito ? 'var(--color-signal-green)' : 'rgba(33,200,246,.4)'),
                  background: feito ? 'rgba(37,223,160,.18)' : 'rgba(8,11,30,.92)',
                }}
              >
                <span
                  className="block"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: feito ? 'var(--color-signal-green)' : '#EAFBFF',
                  }}
                >
                  {ac.usuario}
                </span>
                <span className="block" style={{ fontSize: 11, color: 'var(--color-micro)' }}>
                  {ac.cidade} · {relogio(ac.hora)}
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
            arraste para girar o mundo
          </div>
          <StuckHint show={travado && found.length < alvos}>
            Procure um nome que aparece duas vezes, em lugares longe demais.
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
          <ShieldAlert size={26} strokeWidth={1.5} style={{ color: 'var(--color-signal-amber)' }} />
          <HudLabel>Acessos ao sistema hoje</HudLabel>
        </div>

        <p className="mb-5 text-[19px] leading-snug">{seg.question}</p>

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

        <div className="mb-5 flex items-center gap-2.5">
          <span
            className="h-3 w-3"
            style={{ background: 'rgb(255,212,61)', boxShadow: '0 0 10px rgb(255,212,61)' }}
          />
          <span className="text-[15px]" style={{ color: 'var(--color-label)' }}>
            a sede, onde tudo chega
          </span>
        </div>

        <p className="mb-5 text-[15px] leading-relaxed" style={{ color: 'var(--color-label)' }}>
          Nenhum acesso vem marcado como invasor. O que denuncia é comparar
          nome, lugar e horário entre si.
        </p>

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
          ENDIREITAR O MUNDO
        </button>

        <div className="min-h-[130px]">
          <AnimatePresence mode="wait">
            {achado && (
              <motion.div
                key={achado.id}
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                className="border-l-2 pl-4"
                style={{ borderColor: 'var(--color-signal-green)' }}
              >
                <HudLabel className="mb-1">Conta comprometida</HudLabel>
                <p className="text-[15px] leading-snug" style={{ color: 'var(--color-label)' }}>
                  {achado.why}
                </p>
                <p className="tnum mt-2 text-[13px]" style={{ color: 'var(--color-signal-amber)' }}>
                  {distanciaKm(achado, SEDE).toLocaleString('pt-BR')} km da sede
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
