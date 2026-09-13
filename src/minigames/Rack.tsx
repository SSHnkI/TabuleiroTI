/**
 * MISSAO TI :: RACK DE SERVIDORES, em 3D de verdade.
 *
 * Nao e um card com cor: e um rack com geometria, perspectiva e traseira.
 * O jogador arrasta o dedo para girar e toca no equipamento em falha. Em
 * alguns casos a falha SO aparece por tras, entao e preciso virar o rack,
 * que e exatamente o que um tecnico faz na sala de verdade.
 *
 * Zero conhecimento tecnico: verde e ok, amarelo e aviso, vermelho e falha.
 * O que se cobra e atencao e vontade de olhar o outro lado do equipamento.
 *
 * Duas garantias de acessibilidade, porque um estande nao pode ter ninguem
 * preso sem saber o que fazer:
 *   1. o rack gira sozinho nos primeiros segundos, mostrando que tem fundo;
 *   2. existe um botao VER TRASEIRA, para quem nao descobrir o arrasto.
 *
 * Selecao por raycast: o toque acerta o objeto 3D, nao um retangulo de DOM
 * por cima dele.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Renderer, Camera, Transform, Box, Program, Mesh, Raycast, Vec2, Vec3,
} from 'ogl'
import { PALETA, PISO_VERT, PISO_FRAG } from '../visual/palette.glsl.ts'
import { criarJuice } from '../visual/juice.ts'
import { criarDestrocos } from '../visual/debris.ts'
import { ambiente, sExplosao, sEstilhaco } from '@/game/sound.ts'
import { RotateCw, Server, Check } from 'lucide-react'
import { HudLabel } from '@/components/hud'
import { useStuck, StuckHint } from '@/components/StuckHint'
import type { RackCase, RackUnit } from '@/game/content.ts'
import { useFx } from '@/visual/Fx.tsx'

const UNIT_W = 2.6
const UNIT_H = 0.34
const UNIT_D = 1.15
const GAP = 0.07

const VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vObjN;
varying vec3 vPos;
varying vec2 vUv;
void main() {
  vNormal = normalize(normalMatrix * normal);
  // Normal no espaco do OBJETO. E ela que diz qual e a face da PECA.
  // Usar a normal de camera fazia o LED migrar de face conforme o rack
  // girava, em vez de ficar preso na frente do equipamento.
  vObjN = normal;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPos = mv.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}
`

/**
 * O LED e desenhado no shader, na face certa, em vez de ser outro objeto.
 * Menos geometria, e o brilho acompanha a inclinacao da face sozinho.
 */
const FRAG = /* glsl */ `
precision mediump float;
${PALETA}
uniform vec3  uPanel;
uniform vec3  uLed;
uniform float uBlink;
uniform float uSelected;
uniform float uResolved;
/** +1 quando o estado aparece na frente, -1 quando aparece atras. */
uniform float uFaceSign;
/** 1 quando esta unidade tem tela de status; 0 para estrutura. */
uniform float uIsUnit;
varying vec3 vNormal;
varying vec3 vObjN;
varying vec3 vPos;
varying vec2 vUv;

float box(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);

  // Duas luzes: uma de cima, como a luminaria do corredor do datacenter, e
  // uma frontal fraca, que e o que impede o equipamento de virar silhueta.
  float key = max(dot(n, normalize(vec3(0.3, 0.85, 0.45))), 0.0);
  float fill = max(dot(n, normalize(vec3(-0.2, 0.1, 1.0))), 0.0);
  vec3 col = uPanel * (0.42 + key * 0.75 + fill * 0.45);

  // Borda acesa: e o que separa uma unidade da outra a distancia.
  float fres = pow(1.0 - abs(dot(n, v)), 3.0);
  col += CIANO_MARCA * fres * 0.55;

  // Face da PECA, nao da camera.
  float objZ = vObjN.z;
  bool frente = objZ > 0.75;
  bool tras   = objZ < -0.75;
  bool ledFace = (uFaceSign > 0.0 && frente) || (uFaceSign < 0.0 && tras);

  if (uIsUnit > 0.5 && frente) {
    /* --------------------------------------------------- painel frontal */
    col *= 1.22;

    // Grelha de ventilacao no miolo.
    float vent = step(0.5, fract(vUv.y * 6.0))
               * step(0.34, vUv.x) * step(vUv.x, 0.78);
    col *= 1.0 - vent * 0.30;

    // Puxadores nas duas pontas.
    float grip = smoothstep(0.045, 0.030, vUv.x) + smoothstep(0.955, 0.970, vUv.x);
    col += vec3(0.22, 0.28, 0.40) * grip;

    // Faixa de portas de rede a direita: oito quadradinhos escuros.
    float ports = step(0.82, vUv.x) * step(vUv.x, 0.95)
                * step(0.25, vUv.y) * step(vUv.y, 0.75)
                * step(0.35, fract((vUv.x - 0.82) * 62.0));
    col = mix(col, vec3(0.03, 0.05, 0.09), ports * 0.85);
    col += vec3(0.10, 0.45, 0.55) * ports * 0.25;

    // Etiqueta clara, onde ficaria o nome do equipamento.
    float tag = 1.0 - smoothstep(0.0, 0.02, box(vUv - vec2(0.24, 0.5), vec2(0.055, 0.16)));
    col = mix(col, vec3(0.55, 0.62, 0.72), tag * 0.5);
  }

  if (uIsUnit > 0.5 && tras) {
    /* -------------------------------------------------- painel traseiro */
    // Fonte de alimentacao e bocais de cabo: e o que faz a traseira parecer
    // traseira, e nao a frente espelhada.
    float psu = 1.0 - smoothstep(0.0, 0.02, box(vUv - vec2(0.78, 0.5), vec2(0.13, 0.28)));
    col = mix(col, vec3(0.05, 0.06, 0.10), psu * 0.8);
    float fan = smoothstep(0.11, 0.09, length((vUv - vec2(0.78, 0.5)) * vec2(2.6, 1.0)));
    col += vec3(0.16, 0.22, 0.30) * fan;

    float bocais = step(0.10, vUv.x) * step(vUv.x, 0.55)
                 * step(0.32, vUv.y) * step(vUv.y, 0.68)
                 * step(0.45, fract((vUv.x - 0.10) * 26.0));
    col = mix(col, vec3(0.02, 0.03, 0.06), bocais * 0.9);
  }

  if (ledFace) {
    // LED de status. Grande e com halo largo: numa tela de estande isto
    // precisa ser visto de dois metros, nao de perto.
    vec2 p = (vUv - vec2(0.135, 0.5)) * vec2(3.2, 1.0);
    float d = length(p);
    float lamp = smoothstep(0.090, 0.02, d);
    float halo = smoothstep(0.42, 0.0, d);
    col += uLed * halo * 1.0 * uBlink;
    col = mix(col, uLed * 1.8, lamp * uBlink);
  }

  // Marcacao de resolvido: um veu verde sobre a unidade ja encontrada.
  col = mix(col, vec3(0.14, 0.87, 0.63), uResolved * 0.45);

  // Selecao: contorno claro, sem tirar a leitura do LED.
  col += vec3(0.35, 0.75, 0.95) * uSelected * fres * 1.6;

  gl_FragColor = vec4(col, 1.0);
}
`

const STATUS_COLOR: Record<RackUnit['status'], [number, number, number]> = {
  ok: [0.15, 0.87, 0.63],
  atencao: [1.0, 0.62, 0.18],
  falha: [1.0, 0.25, 0.18],
}

interface UnitMesh { mesh: Mesh; unit: RackUnit; index: number }

export function Rack({ rack, secondsLeft, onDone, onPenalty }: {
  rack: RackCase
  secondsLeft: number
  onDone: (ratio: number) => void
  onPenalty: () => void
}) {
  const fx = useFx()
  const hostRef = useRef<HTMLDivElement>(null)
  const alvos = rack.units.filter(u => u.status === 'falha').length

  const [found, setFound] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [behind, setBehind] = useState(false)
  const finished = useRef(false)
  const travado = useStuck(found.length, 12000)

  // Ponte entre o React e o laco de render: o laco le daqui, sem recriar
  // o contexto WebGL a cada acerto.
  const live = useRef({ found: [] as number[], selected: null as number | null })
  live.current = { found, selected }

  const yawTarget = useRef(0)
  const flip = useRef<(() => void) | null>(null)
  /** O toque acontece no React, o estrago acontece no laco 3D. Este ref e a
   *  ponte: guarda a funcao que o laco instalou, para o pick chamar. */
  const golpe = useRef<((index: number, acertou: boolean) => void) | null>(null)

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
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }
    const gl = renderer.gl
    gl.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none'
    host.appendChild(gl.canvas)

    const camera = new Camera(gl, { fov: 34, near: 0.1, far: 80 })

    const scene = new Transform()
    const rig = new Transform()
    rig.setParent(scene)

    const n = rack.units.length
    const totalH = n * (UNIT_H + GAP)
    const alturaChao = -(totalH / 2 + 0.56)

    const juice = criarJuice()
    const destrocos = criarDestrocos(gl, rig, { chao: alturaChao + 0.05, tamanho: 0.11 })
    ambiente('servidores')

    // Chao: sem ele o rack flutua no vazio preto. Com ele a peca tem peso e o
    // ambiente vira sala.
    const piso = new Mesh(gl, {
      geometry: new Box(gl, { width: 48, height: 0.06, depth: 48 }),
      program: new Program(gl, {
        vertex: PISO_VERT, fragment: PISO_FRAG, cullFace: false, transparent: true,
        uniforms: { uRaio: { value: 7.0 }, uEscala: { value: 0.6 }, uVertical: { value: 0 } },
      }),
    })
    piso.position.y = -(totalH / 2 + 0.56)
    piso.setParent(rig)
    const geo = new Box(gl, { width: UNIT_W, height: UNIT_H, depth: UNIT_D })

    /* ------------------------------------------------------- as unidades */
    const units: UnitMesh[] = rack.units.map((unit, i) => {
      const [r, g, b] = STATUS_COLOR[unit.status]
      const program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uPanel: { value: [0.135, 0.155, 0.29] },
          uLed: { value: [r, g, b] },
          uBlink: { value: 1 },
          uSelected: { value: 0 },
          uResolved: { value: 0 },
          uFaceSign: { value: unit.face === 'frente' ? 1 : -1 },
          uIsUnit: { value: 1 },
        },
        cullFace: false,
      })
      const mesh = new Mesh(gl, { geometry: geo, program })
      mesh.position.y = totalH / 2 - i * (UNIT_H + GAP) - UNIT_H / 2
      mesh.setParent(rig)
      return { mesh, unit, index: i }
    })

    /* ----------------------------------------------------- estrutura do rack */
    const frameProgram = () => new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uPanel: { value: [0.085, 0.098, 0.215] },
        uLed: { value: [0, 0, 0] },
        uBlink: { value: 0 },
        uSelected: { value: 0 },
        uResolved: { value: 0 },
        uFaceSign: { value: 0 },
        uIsUnit: { value: 0 },
      },
      cullFace: false,
    })
    const postGeo = new Box(gl, { width: 0.14, height: totalH + 0.6, depth: UNIT_D + 0.22 })
    for (const sx of [-1, 1]) {
      const post = new Mesh(gl, { geometry: postGeo, program: frameProgram() })
      post.position.set(sx * (UNIT_W / 2 + 0.07), 0, 0)
      post.setParent(rig)
    }
    const capGeo = new Box(gl, { width: UNIT_W + 0.28, height: 0.14, depth: UNIT_D + 0.22 })
    for (const sy of [-1, 1]) {
      const cap = new Mesh(gl, { geometry: capGeo, program: frameProgram() })
      cap.position.set(0, sy * (totalH / 2 + 0.23), 0)
      cap.setParent(rig)
    }

    // Base do rack: sem ela o equipamento parece flutuar, e movel flutuando
    // e a diferenca entre "sala de servidores" e "desenho de sala".
    const base = new Mesh(gl, {
      geometry: new Box(gl, { width: UNIT_W + 0.5, height: 0.22, depth: UNIT_D + 0.45 }),
      program: frameProgram(),
    })
    base.position.y = -(totalH / 2 + 0.41)
    base.setParent(rig)

    // Painel lateral fechado dos dois lados.
    const sideGeo = new Box(gl, { width: 0.04, height: totalH + 0.2, depth: UNIT_D + 0.16 })
    for (const sx of [-1, 1]) {
      const side = new Mesh(gl, { geometry: sideGeo, program: frameProgram() })
      side.position.set(sx * (UNIT_W / 2 + 0.155), 0, 0)
      side.setParent(rig)
    }

    // Chicote de cabos descendo pela traseira, um por unidade, com pequenas
    // variacoes de profundidade e altura. E o detalhe que mais vende a cena:
    // rack de verdade e uma parede de cabo atras.
    const cableProgram = () => new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uPanel: { value: [0.07, 0.13, 0.19] },
        uLed: { value: [0, 0, 0] },
        uBlink: { value: 0 },
        uSelected: { value: 0 },
        uResolved: { value: 0 },
        uFaceSign: { value: 0 },
        uIsUnit: { value: 0 },
      },
      cullFace: false,
    })
    rack.units.forEach((_, i) => {
      const y = totalH / 2 - i * (UNIT_H + GAP) - UNIT_H / 2
      const alturaAteBase = y + totalH / 2 + 0.3
      // Dois cabos por unidade, saindo em lados diferentes do chicote.
      for (const lado of [-1, 1]) {
        const cabo = new Mesh(gl, {
          geometry: new Box(gl, { width: 0.045, height: alturaAteBase, depth: 0.045 }),
          program: cableProgram(),
        })
        cabo.position.set(
          lado * (0.42 + (i % 3) * 0.09),
          y - alturaAteBase / 2 + UNIT_H / 2,
          -(UNIT_D / 2 + 0.10 + (i % 2) * 0.035),
        )
        cabo.setParent(rig)
      }
    })

    // Barra horizontal de organizacao de cabos, atras.
    const barra = new Mesh(gl, {
      geometry: new Box(gl, { width: UNIT_W, height: 0.07, depth: 0.07 }),
      program: frameProgram(),
    })
    barra.position.set(0, -(totalH / 2 + 0.1), -(UNIT_D / 2 + 0.14))
    barra.setParent(rig)

    function resize() {
      const { clientWidth: w, clientHeight: h } = host!
      renderer.setSize(Math.max(1, w), Math.max(1, h))
      gl.canvas.style.width = '100%'
      gl.canvas.style.height = '100%'
      const aspect = gl.canvas.width / Math.max(1, gl.canvas.height)
      camera.perspective({ aspect })

      // A camera recua conforme a altura do rack e a proporcao da tela, para
      // o equipamento caber inteiro em qualquer monitor. Sem isto, o rack de
      // oito unidades fica cortado justamente no caso mais critico.
      const need = totalH + 1.0
      const fitH = (need / 2) / Math.tan((34 * Math.PI) / 360)
      const fitW = (UNIT_W * 1.5 / 2) / (Math.tan((34 * Math.PI) / 360) * aspect)
      camera.position.set(0, 0, Math.max(fitH, fitW) * 1.12)
      // O tranco e o tremor saem desta posicao. Reancorar a cada resize,
      // senao a camera volta para o lugar errado depois de girar a tela.
      juice.ancorar(camera)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    /* --------------------------------------------------------- interacao */
    const raycast = new Raycast()
    const mouse = new Vec2()
    let dragging = false
    let moved = 0
    let lastX = 0
    let yaw = 0

    // Apresentacao: o rack gira sozinho no comeco. E assim que a pessoa
    // descobre, sem ler nada, que aquilo tem fundo e pode ser virado.
    let intro = 1

    const toNdc = (e: PointerEvent) => {
      const r = gl.canvas.getBoundingClientRect()
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    }

    function onDown(e: PointerEvent) {
      dragging = true
      moved = 0
      lastX = e.clientX
      intro = 0
      try { gl.canvas.setPointerCapture(e.pointerId) } catch { /* segue sem captura */ }
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
      // Arrastou: era giro, nao toque. O limiar evita que um dedo tremido
      // vire resposta errada.
      if (moved > 12) return

      toNdc(e)
      raycast.castMouse(camera, mouse)
      const hits = raycast.intersectBounds(units.map(u => u.mesh))
      if (!hits.length) return
      const alvo = units.find(u => u.mesh === hits[0])
      if (alvo) pick(alvo.index)
    }

    gl.canvas.addEventListener('pointerdown', onDown)
    gl.canvas.addEventListener('pointermove', onMove)
    gl.canvas.addEventListener('pointerup', onUp)
    gl.canvas.addEventListener('pointercancel', () => { dragging = false })

    flip.current = () => { yawTarget.current += Math.PI }

    golpe.current = (index, acertou) => {
      const u = units[index]
      if (!u) return
      const y = u.mesh.position.y
      if (acertou) {
        // Verde da marca: a mesma cor que o shader usa para "resolvido".
        destrocos.explodir([0, y, UNIT_D / 2], [0.145, 0.875, 0.627], 30, 1.3)
        juice.congelar(80)
        juice.tranco(1)
        juice.tremor(0.45)
        sExplosao()
      } else {
        destrocos.explodir([0, y, UNIT_D / 2], [1.0, 0.247, 0.18], 14, 0.75)
        juice.congelar(45)
        juice.tremor(0.7)
        sEstilhaco()
      }
    }

    /* ------------------------------------------------------------- render */
    let raf = 0
    /** Quanto cada unidade ja saiu do rack. Consertada, desliza para fora. */
    const saida = new Float32Array(units.length)

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const { dt, t } = juice.tick(now)

      destrocos.atualizar(dt)

      if (intro > 0) yawTarget.current += dt * 0.5
      // Perseguicao suave: o rack acompanha o dedo com peso, em vez de
      // saltar. E o que da sensacao de massa ao equipamento.
      yaw += (yawTarget.current - yaw) * Math.min(1, dt * 9)
      rig.rotation.y = yaw
      rig.rotation.x = Math.sin(yaw) * 0.02

      setBehindFromYaw(yaw)

      for (const u of units) {
        const p = u.mesh.program.uniforms
        const resolvida = live.current.found.includes(u.index)
        p.uSelected.value = live.current.selected === u.index ? 1 : 0
        p.uResolved.value = resolvida ? 1 : 0
        // Falha pisca; ok e aviso ficam acesos. Piscar so o que importa e o
        // que faz o olho encontrar a falha de longe.
        p.uBlink.value = u.unit.status === 'falha'
          ? 0.55 + 0.45 * Math.sin(t * 7.0)
          : 1

        // A unidade consertada desliza para fora do rack. Ver a peca sair e
        // o que transforma "o LED mudou de cor" em "eu consertei aquilo".
        const alvo = resolvida ? 0.55 : 0
        saida[u.index] += (alvo - saida[u.index]) * Math.min(1, dt * 7)
        u.mesh.position.z = saida[u.index]
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
      void Vec3
    }
  }, [rack])

  /** Guarda se a camera esta vendo a traseira, para a interface avisar. */
  function setBehindFromYaw(yaw: number) {
    const normalized = Math.abs(((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI)
    const atras = normalized < Math.PI / 2
    setBehind(prev => (prev === atras ? prev : atras))
  }

  function pick(index: number) {
    if (finished.current || live.current.found.includes(index)) return
    const unit = rack.units[index]
    setSelected(index)

    if (unit.status === 'falha') {
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

  const sel = selected != null ? rack.units[selected] : null

  return (
    <div className="grid h-full grid-cols-1 gap-4 px-4 pb-4 amplo:grid-cols-[1fr_340px] amplo:gap-8 amplo:px-10 amplo:pb-6">
      {/* --------------------------------------------------------- o rack 3D */}
      <div className="sala-3d relative min-h-[46vh] amplo:min-h-0">
        <div ref={hostRef} className="absolute inset-0" />

        {/* Affordance de giro. Some assim que a pessoa gira. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center gap-2">
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{
              border: '1px solid rgba(33,200,246,.25)',
              background: 'rgba(8,11,30,.75)',
              color: 'var(--color-label)',
              fontSize: 15,
            }}
          >
            <RotateCw size={16} />
            arraste para girar o rack
          </div>
          <StuckHint show={travado && found.length < alvos}>
            Nem toda falha aparece de frente. Vire o rack.
          </StuckHint>
        </div>

        {/* Aviso de face. Saber se esta vendo a frente ou o fundo e o que
            torna o espaco compreensivel. */}
        <div
          className="pointer-events-none absolute left-0 top-0 px-3 py-1.5"
          style={{
            border: '1px solid ' + (behind ? 'var(--color-signal-amber)' : 'rgba(33,200,246,.3)'),
            color: behind ? 'var(--color-signal-amber)' : 'var(--color-cyan-core)',
            background: 'rgba(8,11,30,.8)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 12, letterSpacing: '.18em',
          }}
        >
          {behind ? 'TRASEIRA DO RACK' : 'FRENTE DO RACK'}
        </div>
      </div>

      {/* --------------------------------------------------------- painel */}
      <div className="flex min-h-0 flex-col pt-1">
        <div className="mb-4 flex items-center gap-3">
          <Server size={26} strokeWidth={1.5} style={{ color: 'var(--color-cyan-core)' }} />
          <HudLabel>Sala de equipamentos</HudLabel>
        </div>

        <p className="mb-5 text-[19px] leading-snug">{rack.question}</p>

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

        {/* Legenda. Tres cores, sem jargao nenhum. */}
        <div className="mb-5 space-y-1.5">
          {([['falha', 'em falha'], ['atencao', 'aviso'], ['ok', 'operando']] as const).map(([k, txt]) => (
            <div key={k} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: 'rgb(' + STATUS_COLOR[k].map(c => Math.round(c * 255)).join(',') + ')',
                  boxShadow: '0 0 10px rgb(' + STATUS_COLOR[k].map(c => Math.round(c * 255)).join(',') + ')',
                }}
              />
              <span className="text-[15px]" style={{ color: 'var(--color-label)' }}>{txt}</span>
            </div>
          ))}
        </div>

        {/* Botao de traseira: a garantia de que quem nao descobrir o arrasto
            ainda consegue terminar o desafio. */}
        <button
          type="button"
          data-touch-target
          onPointerDown={() => flip.current?.()}
          className="mb-5 flex items-center justify-center gap-2.5 px-5 py-3.5 outline-none"
          style={{
            border: '1px solid rgba(33,200,246,.3)',
            background: 'rgba(22,26,86,.55)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 15, letterSpacing: '.1em',
          }}
        >
          <RotateCw size={18} />
          {behind ? 'VER A FRENTE' : 'VER A TRASEIRA'}
        </button>

        <div className="min-h-[120px]">
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
                <p
                  className="uppercase"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#EAFBFF' }}
                >
                  {sel.name}
                </p>
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
