/**
 * MISSAO TI :: shaders do nucleo.
 *
 * Sao dois passes no MESMO canvas e no MESMO laco de render:
 *   1. fundo, um triangulo de tela cheia com gradiente, grid e vinheta;
 *   2. o nucleo 3D, com geometria e camera em perspectiva de verdade.
 *
 * Importar tres componentes de fundo prontos significaria tres contextos
 * WebGL na mesma tela, o que em video integrado e o triplo do custo pelo
 * mesmo resultado.
 *
 * Nada de bloom nem postprocessing: o brilho e feito com CSS numa camada
 * DOM por cima. E a decisao que viabiliza WebGL nesta maquina.
 */

/* ------------------------------------------------------------------ FUNDO */

export const BG_VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

export const BG_FRAG = /* glsl */ `
precision mediump float;

uniform float uTime;
uniform vec2  uRes;
uniform float uEnergy;
uniform float uAlert;
uniform float uDim;
uniform vec2  uCenter;

varying vec2 vUv;

// Indigo da marca Plastireal (#161a56) rebaixado, nao preto: e o que da o
// ar de ctOS em vez de "site escuro".
const vec3 INK  = vec3(0.016, 0.020, 0.059);
const vec3 CYAN = vec3(0.129, 0.784, 0.965);
const vec3 RED  = vec3(1.000, 0.247, 0.180);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  vec3 accent = mix(CYAN, RED, uAlert);
  vec3 col = INK;

  // Duas fontes de luz ambiente. Uma so deixava metade da tela preta chapada,
  // e preto chapado num monitor grande le como "desligado", nao como elegante.
  float ambA = 1.0 - distance(uv, vec2(0.12, 1.05));
  float ambB = 1.0 - distance(uv, vec2(0.92, -0.05));
  col += accent * 0.30 * pow(max(ambA, 0.0), 2.2);
  col += accent * 0.14 * pow(max(ambB, 0.0), 2.6);

  // Piso de luz: garante que nenhum canto chegue a zero absoluto.
  col += vec3(0.020, 0.026, 0.078);

  // Grade plana, nao piso em perspectiva: piso synthwave e o "cyberpunk
  // generico" que a direcao de arte recusa, e ainda faz moire em tela grande.
  vec2 cell = abs(fract(p * 13.0) - 0.5);
  float grid = smoothstep(0.035, 0.0, min(cell.x, cell.y));

  // A grade existe na tela toda e acende mais perto do nucleo. Antes ela so
  // aparecia no halo, e o resto da tela ficava sem textura nenhuma.
  float reveal = 0.30 + exp(-length(p - uCenter) * 1.5) * 0.85;
  col += accent * grid * reveal * (0.22 + uEnergy * 0.20);

  vec2 major = abs(fract(p * 3.25) - 0.5);
  col += accent * smoothstep(0.012, 0.0, min(major.x, major.y)) * reveal * 0.20;

  // Varredura lenta subindo a tela.
  float band = smoothstep(0.015, 0.0, abs(uv.y - fract(uTime * 0.07)));
  col += accent * band * 0.05;

  col *= 1.0 - smoothstep(0.55, 1.15, length(uv - 0.5)) * 0.40;
  col *= (1.0 - uDim * 0.30);

  // Dither: sem isto, gradiente escuro mostra faixas em monitor barato.
  col += (hash(uv * uRes + uTime) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

/* --------------------------------------------------------------- NUCLEO 3D */

/** Vertex comum a esfera e aos aneis. OGL ja fornece estas uniformes. */
export const MESH_VERT = /* glsl */ `
precision mediump float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec3 vNormal;
varying vec3 vPos;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // Posicao no espaco da camera: e o que permite calcular fresnel de verdade,
  // ou seja, a borda do objeto brilhar mais que o centro.
  vPos = mv.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}
`

/** Esfera interna: o corpo do nucleo. */
export const CORE_FRAG = /* glsl */ `
precision mediump float;

uniform float uTime;
uniform float uEnergy;
uniform float uAlert;
uniform float uDim;

varying vec3 vNormal;
varying vec3 vPos;

const vec3 CYAN = vec3(0.129, 0.784, 0.965);
const vec3 RED  = vec3(1.000, 0.247, 0.180);

void main() {
  vec3 accent = mix(CYAN, RED, uAlert);

  // Fresnel: quanto mais de raspao a superficie e vista, mais ela acende.
  // E o que faz uma esfera parecer uma esfera, e nao um circulo chapado.
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 2.6);

  // Faixas de energia correndo pela superficie, no espaco do objeto.
  float bands = sin(vPos.y * 9.0 - uTime * 2.4) * 0.5 + 0.5;
  bands = smoothstep(0.72, 1.0, bands);

  float pulse = 0.5 + 0.5 * sin(uTime * (0.9 + uEnergy * 1.7));

  vec3 col = accent * fres * (0.75 + uEnergy * 0.7);
  col += accent * bands * (0.10 + uEnergy * 0.28);
  col += accent * 0.05 * pulse;

  float alpha = (fres * 0.85 + bands * 0.25 + 0.06) * (1.0 - uDim * 0.55);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`

/** Aneis orbitais. Finos, aditivos, sem escrever profundidade. */
export const RING_FRAG = /* glsl */ `
precision mediump float;

uniform float uTime;
uniform float uEnergy;
uniform float uAlert;
uniform float uDim;
uniform float uSeed;

varying vec3 vNormal;
varying vec3 vPos;
varying vec2 vUv;

const vec3 CYAN = vec3(0.129, 0.784, 0.965);
const vec3 RED  = vec3(1.000, 0.247, 0.180);

void main() {
  vec3 accent = mix(CYAN, RED, uAlert);

  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vPos);
  float fres = pow(1.0 - abs(dot(n, v)), 1.6);

  // Pulso de energia percorrendo o anel. Cada anel com sua fase, senao os
  // tres piscam juntos e a estrutura parece um aro so.
  float travel = fract(vUv.x - uTime * (0.12 + uSeed * 0.05) + uSeed);
  float spark = smoothstep(0.88, 1.0, travel) + smoothstep(0.12, 0.0, travel);

  vec3 col = accent * (0.35 + fres * 0.8 + spark * (0.5 + uEnergy));
  float alpha = (0.30 + fres * 0.5 + spark * 0.6) * (0.45 + uEnergy * 0.55) * (1.0 - uDim * 0.6);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`
