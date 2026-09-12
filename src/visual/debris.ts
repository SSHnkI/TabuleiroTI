/**
 * MISSAO TI :: destrocos em voxel.
 *
 * Quando um alvo e resolvido ele nao apaga: ele SE DESFAZ. Uma nuvem de cubos
 * sai voando, cai, quica no chao e encolhe ate sumir.
 *
 * Tudo em UMA chamada de desenho. Os cubos sao instancias da mesma geometria,
 * e o que muda por cubo (posicao, giro, tamanho, cor) vai em atributo
 * instanciado. Noventa e seis meshes separadas seriam noventa e seis chamadas,
 * e e exatamente esse tipo de coisa que derruba video integrado.
 *
 * Sem dependencia nova: o OGL ja traz atributo instanciado.
 */
import { Box, Mesh, Program } from 'ogl'
import type { OGLRenderingContext, Transform } from 'ogl'
import { PALETA } from './palette.glsl.ts'

const VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec3 offset;
attribute vec3 giro;
attribute float escala;
attribute vec3 cor;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vCor;

mat3 rodar(vec3 a) {
  vec3 s = sin(a);
  vec3 c = cos(a);
  mat3 rx = mat3(1.0, 0.0, 0.0,  0.0, c.x, -s.x,  0.0, s.x, c.x);
  mat3 ry = mat3(c.y, 0.0, s.y,  0.0, 1.0, 0.0,  -s.y, 0.0, c.y);
  mat3 rz = mat3(c.z, -s.z, 0.0,  s.z, c.z, 0.0,  0.0, 0.0, 1.0);
  return rz * ry * rx;
}

void main() {
  mat3 R = rodar(giro);
  vec3 p = R * (position * escala) + offset;
  vNormal = normalize(normalMatrix * (R * normal));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vPos = mv.xyz;
  vCor = cor;
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = /* glsl */ `
precision mediump float;
${PALETA}
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vCor;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float key = max(dot(n, normalize(vec3(0.3, 0.85, 0.45))), 0.0);
  float fres = pow(1.0 - abs(dot(n, v)), 2.2);
  vec3 col = vCor * (0.42 + key * 0.85);
  col += CIANO_ALTO * fres * 0.40;
  gl_FragColor = vec4(col, 1.0);
}
`

/**
 * O quique no chao, isolado porque e a unica conta com jeito de errar.
 *
 * Devolve a altura corrigida e a velocidade vertical depois da batida. O
 * corte em 0,55 existe porque quique fraco demais nao e quique: e um cubo
 * tremendo no chao ate a vida acabar, que le como bug.
 */
export const QUIQUE_MINIMO = 0.55

export function quicar(
  y: number, vy: number, chao: number, restituicao: number,
): { y: number; vy: number; bateu: boolean } {
  if (y >= chao) return { y, vy, bateu: false }
  const devolvida = -vy * restituicao
  return {
    y: chao,
    vy: Math.abs(devolvida) < QUIQUE_MINIMO ? 0 : devolvida,
    bateu: true,
  }
}

export interface Destrocos {
  malha: Mesh
  /** Solta uma nuvem de cubos a partir de um ponto. */
  explodir(
    pos: [number, number, number],
    cor: [number, number, number],
    quantidade?: number,
    forca?: number,
  ): void
  /** Anda a fisica. Recebe o dt do MUNDO, entao congela junto com o resto. */
  atualizar(dt: number): void
  /** Quantos cubos estao vivos agora. Serve para teste e para medicao. */
  vivos(): number
}

export interface OpcoesDestrocos {
  /** Teto de cubos vivos ao mesmo tempo. */
  max?: number
  /** Aresta do cubo, nas unidades da cena. */
  tamanho?: number
  /** Altura do chao. Abaixo disso o cubo quica. */
  chao?: number
  gravidade?: number
  /** Quanto sobra da velocidade a cada quique. */
  quique?: number
}

export function criarDestrocos(
  gl: OGLRenderingContext,
  pai: Transform,
  o: OpcoesDestrocos = {},
): Destrocos {
  const max = o.max ?? 96
  const tamanho = o.tamanho ?? 0.1
  const chao = o.chao ?? 0
  const gravidade = o.gravidade ?? 11
  const quique = o.quique ?? 0.42

  const offset = new Float32Array(max * 3)
  const giro = new Float32Array(max * 3)
  const escala = new Float32Array(max)
  const cor = new Float32Array(max * 3)

  // Estado que nao vai para a GPU.
  const vel = new Float32Array(max * 3)
  const velGiro = new Float32Array(max * 3)
  const vida = new Float32Array(max)
  const vidaMax = new Float32Array(max)
  const base = new Float32Array(max)

  let proximo = 0

  const geometry = new Box(gl, {
    width: 1, height: 1, depth: 1,
    attributes: {
      offset: { instanced: 1, size: 3, data: offset },
      giro: { instanced: 1, size: 3, data: giro },
      escala: { instanced: 1, size: 1, data: escala },
      cor: { instanced: 1, size: 3, data: cor },
    },
  })

  const malha = new Mesh(gl, {
    geometry,
    program: new Program(gl, { vertex: VERT, fragment: FRAG, cullFace: false }),
  })
  malha.frustumCulled = false
  // Depois dos objetos solidos, antes das camadas aditivas.
  malha.renderOrder = 4
  malha.setParent(pai)

  function marcarSujo() {
    geometry.attributes.offset.needsUpdate = true
    geometry.attributes.giro.needsUpdate = true
    geometry.attributes.escala.needsUpdate = true
    geometry.attributes.cor.needsUpdate = true
  }

  return {
    malha,

    explodir(pos, c, quantidade = 22, forca = 1) {
      const n = Math.min(quantidade, max)
      for (let k = 0; k < n; k++) {
        // Fila circular: estourar de novo antes do primeiro sumir rouba os
        // cubos mais velhos, em vez de ignorar o pedido.
        const i = proximo
        proximo = (proximo + 1) % max
        const i3 = i * 3

        // Direcao uniforme na esfera, senao a nuvem sai achatada nos polos.
        const u = Math.random() * 2 - 1
        const fi = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.max(0, 1 - u * u))
        const v = (0.6 + Math.random() * 0.9) * 3.4 * forca

        offset[i3] = pos[0] + r * Math.cos(fi) * 0.06
        offset[i3 + 1] = pos[1] + u * 0.06
        offset[i3 + 2] = pos[2] + r * Math.sin(fi) * 0.06

        vel[i3] = r * Math.cos(fi) * v
        // Viés para cima: destroco que so espalha no plano parece poeira,
        // destroco que sobe parece estilhaco.
        vel[i3 + 1] = u * v * 0.7 + 2.1 * forca
        vel[i3 + 2] = r * Math.sin(fi) * v

        giro[i3] = Math.random() * 6.28
        giro[i3 + 1] = Math.random() * 6.28
        giro[i3 + 2] = Math.random() * 6.28
        velGiro[i3] = (Math.random() * 2 - 1) * 9
        velGiro[i3 + 1] = (Math.random() * 2 - 1) * 9
        velGiro[i3 + 2] = (Math.random() * 2 - 1) * 9

        cor[i3] = c[0]
        cor[i3 + 1] = c[1]
        cor[i3 + 2] = c[2]

        base[i] = tamanho * (0.55 + Math.random() * 0.9)
        escala[i] = base[i]
        vidaMax[i] = 0.9 + Math.random() * 0.7
        vida[i] = vidaMax[i]
      }
      marcarSujo()
    },

    atualizar(dt) {
      if (dt <= 0) return
      let algum = false
      for (let i = 0; i < max; i++) {
        if (vida[i] <= 0) continue
        algum = true
        const i3 = i * 3

        vel[i3 + 1] -= gravidade * dt
        offset[i3] += vel[i3] * dt
        offset[i3 + 1] += vel[i3 + 1] * dt
        offset[i3 + 2] += vel[i3 + 2] * dt

        const batida = quicar(offset[i3 + 1], vel[i3 + 1], chao, quique)
        if (batida.bateu) {
          offset[i3 + 1] = batida.y
          vel[i3 + 1] = batida.vy
          // Atrito com o chao, senao o cubo desliza para sempre.
          vel[i3] *= 0.72
          vel[i3 + 2] *= 0.72
          velGiro[i3] *= 0.6
          velGiro[i3 + 1] *= 0.6
          velGiro[i3 + 2] *= 0.6
        }

        giro[i3] += velGiro[i3] * dt
        giro[i3 + 1] += velGiro[i3 + 1] * dt
        giro[i3 + 2] += velGiro[i3 + 2] * dt

        vida[i] -= dt
        if (vida[i] <= 0) {
          vida[i] = 0
          escala[i] = 0
          continue
        }
        // Encolhe so no ultimo terco: sumir desde o inicio tira o peso.
        const f = vida[i] / vidaMax[i]
        escala[i] = base[i] * (f > 0.35 ? 1 : f / 0.35)
      }
      if (algum) marcarSujo()
    },

    vivos() {
      let n = 0
      for (let i = 0; i < max; i++) if (vida[i] > 0) n++
      return n
    },
  }
}
