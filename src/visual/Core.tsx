/**
 * MISSAO TI :: o nucleo.
 *
 * Geometria 3D de verdade: camera em perspectiva, uma esfera com fresnel e
 * tres aneis orbitando em eixos diferentes, como um giroscopio. A versao
 * anterior era um shader de tela cheia desenhando um circulo, sem
 * profundidade nenhuma.
 *
 * Tudo num canvas so, com um laco de render so, junto com o fundo. Tres
 * componentes de fundo separados seriam tres contextos WebGL, ou seja, o
 * triplo do custo pelo mesmo resultado em video integrado.
 *
 * Tres protecoes, porque a maquina do estande tem video integrado e este
 * elemento fica na tela o tempo todo:
 *   1. resolucao reduzida com upscale (num objeto que brilha, e invisivel);
 *   2. 30fps durante o jogo, enquanto a camada tocavel segue a 60;
 *   3. troca automatica para a versao 2D se o frame rate cair.
 */
import { useEffect, useRef } from 'react'
import { Renderer, Camera, Transform, Triangle, Sphere, Torus, Program, Mesh } from 'ogl'
import { BG_VERT, BG_FRAG, MESH_VERT, CORE_FRAG, RING_FRAG } from './core.glsl.ts'
import { budgetFor, type Intensity } from './intensity.ts'
import type { PerfTier } from './perf.ts'
import { Core2D } from './Core2D.tsx'

/** Inclinacao e velocidade de cada anel. Eixos diferentes de proposito: com
 *  os tres no mesmo plano a estrutura vira um aro chapado. */
const RINGS = [
  { tilt: [0.0, 0.0, 0.0], spin: [0.00, 0.35, 0.00], scale: 1.45, tube: 0.012 },
  { tilt: [1.25, 0.0, 0.4], spin: [0.22, 0.00, 0.14], scale: 1.75, tube: 0.009 },
  { tilt: [0.5, 0.9, 0.0], spin: [0.00, 0.18, -0.26], scale: 2.05, tube: 0.007 },
]

export function Core({
  tier, intensity, energy = 0, alert = 0, center = [0, 0], scale = 1,
}: {
  tier: PerfTier
  intensity: Intensity
  energy?: number
  alert?: number
  /** Deslocamento do nucleo na tela, em unidades de mundo. */
  center?: [number, number]
  scale?: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const budget = budgetFor(tier, intensity)

  // Valores vivos num ref: mudar energia nao pode recriar o contexto WebGL.
  const live = useRef({ energy, alert, budget, center, scale, intensity })
  live.current = { energy, alert, budget, center, scale, intensity }

  useEffect(() => {
    if (!budget.webgl) return
    const host = hostRef.current
    if (!host) return

    let renderer: Renderer
    try {
      renderer = new Renderer({
        // A densidade real da tela, com teto em 2. Sem isto, num monitor
        // 4K o nucleo renderiza em um quarto da resolucao e fica borrado.
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        alpha: false,
        // Antialias LIGADO: sao tres aneis finos e curvos, e sem suavizacao
        // eles viram escada em qualquer tela grande. Custa pouco numa cena
        // com meia duzia de objetos, e e a diferenca entre parecer produto
        // e parecer protótipo.
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return // sem WebGL: o Core2D assume
    }

    const gl = renderer.gl
    gl.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    host.appendChild(gl.canvas)

    const FOV = 38
    const CAM_Z = 7
    const camera = new Camera(gl, { fov: FOV, near: 0.1, far: 60 })
    camera.position.set(0, 0, CAM_Z)

    // Metade do que a camera enxerga no plano z=0. Deslocar o nucleo em
    // unidades fixas funcionava so numa proporcao de tela: em monitor mais
    // estreito ele saia de cena. Agora o deslocamento e relativo ao
    // enquadramento, entao 0.4 significa "40% do caminho ate a borda".
    let halfH = 1
    let halfW = 1

    const scene = new Transform()

    // Uniformes compartilhados: um objeto so, atualizado uma vez por quadro,
    // referenciado por todos os programas.
    const u = {
      uTime: { value: 0 },
      uRes: { value: [1, 1] },
      uEnergy: { value: 0 },
      uAlert: { value: 0 },
      uDim: { value: 0 },
      uCenter: { value: [0, 0] },
    }

    /* ------------------------------------------------------------- fundo */
    // renderOrder negativo e depth desligado: o fundo e pintado primeiro e
    // nao interfere na profundidade da geometria que vem depois.
    const bg = new Mesh(gl, {
      geometry: new Triangle(gl),
      program: new Program(gl, {
        vertex: BG_VERT,
        fragment: BG_FRAG,
        uniforms: u,
        depthTest: false,
        depthWrite: false,
      }),
    })
    bg.renderOrder = -10
    bg.frustumCulled = false
    bg.setParent(scene)

    /* -------------------------------------------------------- o giroscopio */
    const rig = new Transform()
    rig.setParent(scene)

    const coreMesh = new Mesh(gl, {
      geometry: new Sphere(gl, { radius: 1, widthSegments: 32, heightSegments: 24 }),
      program: new Program(gl, {
        vertex: MESH_VERT,
        fragment: CORE_FRAG,
        uniforms: u,
        transparent: true,
        depthWrite: false,
        cullFace: false,
      }),
    })
    coreMesh.setParent(rig)

    const ringMeshes = RINGS.map((r, i) => {
      const program = new Program(gl, {
        vertex: MESH_VERT,
        fragment: RING_FRAG,
        uniforms: { ...u, uSeed: { value: i * 0.37 } },
        transparent: true,
        depthWrite: false,
        cullFace: false,
      })
      // Aditivo: os aneis somam luz em vez de tapar o que esta atras, que e
      // como energia se comporta e como o glow fica coerente com o CSS.
      program.setBlendFunc(gl.SRC_ALPHA, gl.ONE)

      const mesh = new Mesh(gl, {
        geometry: new Torus(gl, {
          radius: r.scale, tube: r.tube, radialSegments: 8, tubularSegments: 96,
        }),
        program,
      })
      mesh.rotation.set(r.tilt[0], r.tilt[1], r.tilt[2])
      mesh.renderOrder = 1
      mesh.setParent(rig)
      return mesh
    })

    function resize() {
      const { clientWidth: w, clientHeight: h } = host!
      // setSize recebe pixels CSS; o dpr do renderer cuida da densidade.
      // A degradacao mexe no dpr, nao no tamanho, entao o canvas continua
      // cobrindo a tela inteira em qualquer nivel.
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2) * live.current.budget.coreScale
      renderer.setSize(Math.max(1, w), Math.max(1, h))
      // O OGL escreve style.width/height em pixels dentro do setSize; devolver
      // para 100% garante que o canvas cubra o host mesmo apos mudanca de dpr.
      gl.canvas.style.width = '100%'
      gl.canvas.style.height = '100%'
      const W = gl.canvas.width
      const H = gl.canvas.height
      const aspect = W / Math.max(1, H)
      camera.perspective({ aspect })
      halfH = Math.tan((FOV * Math.PI) / 360) * CAM_Z
      halfW = halfH * aspect
      u.uRes.value = [W, H]
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    let raf = 0
    let lastDraw = 0
    let lastScale = budget.coreScale
    // Suavizacao: a energia persegue o alvo em vez de saltar, senao o nucleo
    // pisca a cada acerto em vez de ganhar forca.
    let smEnergy = 0
    let smAlert = 0
    let smDim = 0
    const start = performance.now()

    function frame(now: number) {
      raf = requestAnimationFrame(frame)

      const b = live.current.budget
      if (document.hidden) return
      if (now - lastDraw < 1000 / b.coreFps) return
      const dt = Math.min(0.1, (now - lastDraw) / 1000)
      lastDraw = now

      if (b.coreScale !== lastScale) { lastScale = b.coreScale; resize() }

      const k = 0.08
      smEnergy += (live.current.energy - smEnergy) * k
      smAlert += (live.current.alert - smAlert) * k
      smDim += ((b.particles === 0 ? 1 : 0) - smDim) * k

      const t = (now - start) / 1000
      u.uTime.value = t
      u.uEnergy.value = smEnergy
      u.uAlert.value = smAlert
      u.uDim.value = smDim
      u.uCenter.value = live.current.center

      // O conjunto inteiro desliza e escala conforme a tela pede.
      rig.position.set(live.current.center[0] * halfW, live.current.center[1] * halfH, 0)
      const s = live.current.scale
      rig.scale.set(s, s, s)

      // Respiracao lenta do nucleo, e cada anel no seu proprio eixo.
      const breathe = 1 + Math.sin(t * (0.9 + smEnergy * 1.6)) * 0.03 + smEnergy * 0.05
      coreMesh.scale.set(breathe, breathe, breathe)
      coreMesh.rotation.y += dt * (0.08 + smEnergy * 0.25)

      ringMeshes.forEach((m, i) => {
        const sp = RINGS[i].spin
        const boost = 1 + smEnergy * 2.4
        m.rotation.x += dt * sp[0] * boost
        m.rotation.y += dt * sp[1] * boost
        m.rotation.z += dt * sp[2] * boost
      })

      renderer.render({ scene, camera })
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      gl.canvas.remove()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    // Recriar so quando o modo de renderizacao muda de fato.
  }, [budget.webgl])

  if (!budget.webgl) return <Core2D energy={energy} alert={alert} />

  return <div ref={hostRef} className="absolute inset-0" style={{ zIndex: 0 }} aria-hidden />
}
