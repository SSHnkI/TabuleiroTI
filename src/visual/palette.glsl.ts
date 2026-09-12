/**
 * MISSAO TI :: a paleta da Plastireal, em GLSL.
 *
 * Os mesmos valores de styles/index.css, so que em float. Existe porque os
 * cinco ambientes 3D estavam cada um com a sua tinta chutada na mao, e o
 * resultado era um preto que nao e cor nenhuma da marca.
 *
 * Regra: nenhuma superficie do jogo cai em preto. O fundo mais escuro que
 * existe e INK_800, que ja e azul.
 */
export const PALETA = /* glsl */ `
const vec3 INK_900 = vec3(0.016, 0.020, 0.059);
const vec3 INK_800 = vec3(0.031, 0.043, 0.118);
const vec3 INK_700 = vec3(0.055, 0.075, 0.188);
const vec3 INK_600 = vec3(0.086, 0.102, 0.337);
const vec3 INK_500 = vec3(0.184, 0.200, 0.490);
const vec3 CIANO      = vec3(0.129, 0.784, 0.965);
const vec3 CIANO_ALTO = vec3(0.561, 0.890, 1.000);
const vec3 CIANO_MARCA= vec3(0.353, 0.671, 0.780);
const vec3 CIANO_FUNDO= vec3(0.102, 0.435, 0.580);
const vec3 VERDE = vec3(0.145, 0.875, 0.627);
const vec3 AMBAR = vec3(1.000, 0.624, 0.180);
`

/** Vertice de qualquer chao: so precisa da posicao no mundo. */
export const PISO_VERT = /* glsl */ `
precision mediump float;
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
varying vec3 vWorld;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * Chao tecnico compartilhado pelos ambientes.
 *
 * A luminaria fica no centro: perto dela o piso e o azul forte da marca,
 * longe ele cai para INK_800 e some no fundo da pagina. Isso da profundidade
 * sem escurecer ate o preto, que era o problema.
 *
 * uRaio    = a que distancia o poco de luz acaba.
 * uEscala  = tamanho da malha fina (0.5 = quadrado de 2 unidades).
 * uVertical= 0 usa o plano do chao, 1 usa o plano de fundo. O mesmo shader
 *            serve de piso onde a camera olha de cima e de parede de fundo
 *            onde ela olha de frente, que e o caso da rede e do globo.
 */
export const PISO_FRAG = /* glsl */ `
precision mediump float;
${PALETA}
uniform float uRaio;
uniform float uEscala;
uniform float uVertical;
varying vec3 vWorld;
void main() {
  vec2 p = mix(vWorld.xz, vWorld.xy, uVertical);
  vec2 g = abs(fract(p * uEscala) - 0.5);
  float fina = smoothstep(0.035, 0.0, min(g.x, g.y));
  vec2 gM = abs(fract(p * uEscala * 0.2) - 0.5);
  float grossa = smoothstep(0.012, 0.0, min(gM.x, gM.y));

  float r = length(p);
  float luz = 1.0 - smoothstep(0.0, uRaio, r);

  vec3 col = mix(INK_700, INK_600, luz);
  col += CIANO_MARCA * fina * 0.30 * (0.40 + luz);
  col += CIANO * grossa * 0.42 * (0.35 + luz);

  // A placa dissolve na TRANSPARENCIA, nao numa cor.
  // Terminar numa cor, qualquer que fosse, deixava a borda do retangulo
  // aparecendo contra o degrade da pagina. Sumindo no alfa, o chao continua
  // no fundo do app sem emenda. Por isso o programa vai com transparent.
  float fade = 1.0 - smoothstep(uRaio, uRaio * 1.8, r);
  gl_FragColor = vec4(col, fade);
}
`
