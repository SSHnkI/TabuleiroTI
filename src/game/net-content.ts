/**
 * MISSAO TI :: topologia de rede.
 *
 * Mecanica: a rede flutuando em 3D, com o trafego correndo nos links. Gira
 * com o dedo, toca no ponto que CAUSOU a queda.
 *
 * A torcao deste desafio: varios pontos ficam escuros, mas so um esta
 * quebrado de verdade. Os outros estao escuros POR CAUSA dele. Tocar num
 * sintoma conta como erro, e o jogo explica a diferenca na hora.
 *
 * Zero conhecimento tecnico: basta seguir a corrente a partir da internet e
 * achar o primeiro ponto onde ela para. E o mesmo raciocinio que resolve o
 * pedido #46221 do resto do jogo: a falha aparece num lugar e nasceu em outro.
 */
import type { Difficulty } from './scoring.ts'

export type NetKind = 'internet' | 'firewall' | 'core' | 'switch' | 'servidor' | 'ap'

export interface NetNode {
  id: string
  name: string
  kind: NetKind
  x: number
  y: number
  z: number
  detail: string
}

export interface NetLink {
  from: string
  to: string
  /** false = link rompido. E o unico dado que define a falha. */
  ok: boolean
  /** Mostrado quando o jogador acerta a causa. */
  causa?: string
}

export interface NetCase {
  difficulty: Difficulty
  label: string
  question: string
  nodes: NetNode[]
  links: NetLink[]
}

export const NET_CASES: NetCase[] = [
  {
    difficulty: 'medio',
    label: 'Queda na produção',
    question: 'Parte da rede caiu. Toque no ponto que causou a queda.',
    nodes: [
      { id: 'net', name: 'INTERNET', kind: 'internet', x: 0, y: 3.6, z: 0, detail: 'Link da operadora. Normal.' },
      { id: 'fw', name: 'FIREWALL', kind: 'firewall', x: 0, y: 2.2, z: 0, detail: 'Operando. Tráfego passando.' },
      { id: 'core', name: 'SWITCH CORE', kind: 'core', x: 0, y: 0.8, z: 0, detail: 'Operando. Distribui para os setores.' },
      { id: 'adm', name: 'SW-ESCRITÓRIO', kind: 'switch', x: -3.2, y: -0.7, z: 0.8, detail: 'Operando. Escritório conectado.' },
      { id: 'prod', name: 'SW-PRODUÇÃO', kind: 'switch', x: 2.0, y: -0.7, z: 0.8, detail: 'Sem tráfego. É por aqui que a produção inteira passa.' },
      { id: 'cftv', name: 'SW-PORTARIA', kind: 'switch', x: -0.6, y: -0.9, z: -1.6, detail: 'Operando. Câmeras gravando.' },
      { id: 'erp', name: 'ERP', kind: 'servidor', x: -4.2, y: -2.4, z: 0.2, detail: 'Operando.' },
      { id: 'arq', name: 'ARQUIVOS', kind: 'servidor', x: -2.2, y: -2.5, z: 1.6, detail: 'Operando.' },
      { id: 'pcp', name: 'PCP', kind: 'servidor', x: 1.2, y: -2.6, z: -0.4, detail: 'Sem rede. Depende do SW-PRODUÇÃO.' },
      { id: 'apont', name: 'APONTAMENTO', kind: 'servidor', x: 3.4, y: -2.5, z: -0.4, detail: 'Sem rede. Depende do SW-PRODUÇÃO.' },
      { id: 'balanca', name: 'BALANÇA', kind: 'servidor', x: 4.2, y: -1.2, z: 1.2, detail: 'Sem rede. Depende do SW-PRODUÇÃO.' },
      { id: 'cam', name: 'CÂMERAS', kind: 'ap', x: -0.8, y: -2.6, z: -2.4, detail: 'Operando.' },
    ],
    links: [
      { from: 'net', to: 'fw', ok: true },
      { from: 'fw', to: 'core', ok: true },
      { from: 'core', to: 'adm', ok: true },
      { from: 'core', to: 'cftv', ok: true },
      { from: 'core', to: 'prod', ok: false, causa: 'A fibra entre o switch core e a produção rompeu. Tudo abaixo dela caiu junto.' },
      { from: 'adm', to: 'erp', ok: true },
      { from: 'adm', to: 'arq', ok: true },
      { from: 'cftv', to: 'cam', ok: true },
      { from: 'prod', to: 'pcp', ok: true },
      { from: 'prod', to: 'apont', ok: true },
      { from: 'prod', to: 'balanca', ok: true },
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Metade da fábrica fora',
    question: 'Vários pontos estão sem rede. Só um causou isso.',
    nodes: [
      { id: 'net', name: 'INTERNET', kind: 'internet', x: 0, y: 3.8, z: 0, detail: 'Link da operadora. Normal.' },
      { id: 'fw', name: 'FIREWALL', kind: 'firewall', x: 0, y: 2.5, z: 0, detail: 'Operando.' },
      { id: 'core', name: 'SWITCH CORE', kind: 'core', x: 0, y: 1.1, z: 0, detail: 'Operando.' },
      { id: 'a', name: 'SW-BLOCO-A', kind: 'switch', x: -3.2, y: -0.3, z: 1.0, detail: 'Operando.' },
      { id: 'b', name: 'SW-BLOCO-B', kind: 'switch', x: 0.4, y: -0.4, z: -1.4, detail: 'Sem tráfego. Alimenta o bloco B inteiro.' },
      { id: 'c', name: 'SW-BLOCO-C', kind: 'switch', x: 3.6, y: -0.3, z: 1.0, detail: 'Operando.' },
      { id: 'erp', name: 'ERP', kind: 'servidor', x: -4.4, y: -2.2, z: 0.4, detail: 'Operando.' },
      { id: 'arq', name: 'ARQUIVOS', kind: 'servidor', x: -2.4, y: -2.3, z: 1.6, detail: 'Operando.' },
      { id: 'sw2', name: 'SW-LINHA-2', kind: 'switch', x: 1.0, y: -2.1, z: -2.0, detail: 'Sem rede. Depende do SW-BLOCO-B.' },
      { id: 'ap1', name: 'AP-LINHA-2', kind: 'ap', x: 2.8, y: -3.4, z: -1.4, detail: 'Sem rede. Depende do SW-LINHA-2.' },
      { id: 'bal', name: 'BALANÇA', kind: 'servidor', x: -0.2, y: -3.6, z: -2.6, detail: 'Sem rede. Depende do SW-LINHA-2.' },
      { id: 'exp', name: 'EXPEDIÇÃO', kind: 'servidor', x: 4.4, y: -2.2, z: 0.4, detail: 'Operando.' },
      { id: 'port', name: 'PORTARIA', kind: 'ap', x: 2.8, y: -2.4, z: 1.8, detail: 'Operando.' },
    ],
    links: [
      { from: 'net', to: 'fw', ok: true },
      { from: 'fw', to: 'core', ok: true },
      { from: 'core', to: 'a', ok: true },
      { from: 'core', to: 'c', ok: true },
      { from: 'core', to: 'b', ok: false, causa: 'A porta do switch core que atende o bloco B queimou. Três equipamentos caíram por tabela.' },
      { from: 'a', to: 'erp', ok: true },
      { from: 'a', to: 'arq', ok: true },
      { from: 'c', to: 'exp', ok: true },
      { from: 'c', to: 'port', ok: true },
      { from: 'b', to: 'sw2', ok: true },
      { from: 'sw2', to: 'ap1', ok: true },
      { from: 'sw2', to: 'bal', ok: true },
    ],
  },
  {
    difficulty: 'critico',
    label: 'Fábrica isolada',
    question: 'A fábrica inteira perdeu a rede. Ache onde a corrente para.',
    nodes: [
      { id: 'net', name: 'INTERNET', kind: 'internet', x: 0, y: 3.9, z: 0, detail: 'Link da operadora. Normal, o sinal chega.' },
      { id: 'fw', name: 'FIREWALL', kind: 'firewall', x: 0, y: 2.6, z: 0, detail: 'Travado. Nada passa daqui para baixo.' },
      { id: 'core', name: 'SWITCH CORE', kind: 'core', x: 0, y: 1.2, z: 0, detail: 'Sem tráfego. Depende do firewall.' },
      { id: 'a', name: 'SW-BLOCO-A', kind: 'switch', x: -3.4, y: -0.2, z: 1.1, detail: 'Sem rede. Depende do core.' },
      { id: 'b', name: 'SW-BLOCO-B', kind: 'switch', x: 0.2, y: -0.3, z: -1.6, detail: 'Sem rede. Depende do core.' },
      { id: 'c', name: 'SW-BLOCO-C', kind: 'switch', x: 3.4, y: -0.2, z: 1.1, detail: 'Sem rede. Depende do core.' },
      { id: 'erp', name: 'ERP', kind: 'servidor', x: -4.4, y: -2.2, z: 0.2, detail: 'Sem rede.' },
      { id: 'arq', name: 'ARQUIVOS', kind: 'servidor', x: -2.4, y: -2.3, z: 1.8, detail: 'Sem rede.' },
      { id: 'pcp', name: 'PCP', kind: 'servidor', x: -0.6, y: -2.4, z: -2.4, detail: 'Sem rede.' },
      { id: 'bal', name: 'BALANÇA', kind: 'servidor', x: 1.4, y: -2.4, z: -2.0, detail: 'Sem rede.' },
      { id: 'exp', name: 'EXPEDIÇÃO', kind: 'servidor', x: 4.4, y: -2.2, z: 0.2, detail: 'Sem rede.' },
      { id: 'ap1', name: 'AP-GALPÃO', kind: 'ap', x: 2.6, y: -2.4, z: 1.8, detail: 'Sem rede.' },
    ],
    links: [
      { from: 'net', to: 'fw', ok: true },
      { from: 'fw', to: 'core', ok: false, causa: 'O firewall travou e parou de encaminhar. A internet chegava nele, mas não saía. Por isso tudo abaixo caiu de uma vez.' },
      { from: 'core', to: 'a', ok: true },
      { from: 'core', to: 'b', ok: true },
      { from: 'core', to: 'c', ok: true },
      { from: 'a', to: 'erp', ok: true },
      { from: 'a', to: 'arq', ok: true },
      { from: 'b', to: 'pcp', ok: true },
      { from: 'b', to: 'bal', ok: true },
      { from: 'c', to: 'exp', ok: true },
      { from: 'c', to: 'ap1', ok: true },
    ],
  },
]


/**
 * Quem ainda alcanca a internet, seguindo so os links intactos.
 *
 * Tudo que nao aparecer aqui esta escuro: um por culpa propria, os demais
 * por tabela. E essa diferenca que o desafio cobra, e por isso ela e
 * CALCULADA em vez de escrita no conteudo: quem for criar um caso novo so
 * precisa marcar qual link rompeu, e o resto se resolve sozinho.
 */
export function alcancaveis(net: NetCase): Set<string> {
  const vivos = new Set<string>(['net'])
  // Repete ate estabilizar. A topologia e pequena, e assim funciona para
  // qualquer profundidade sem precisar ordenar a arvore antes.
  for (let i = 0; i < net.nodes.length; i++) {
    for (const l of net.links) {
      if (!l.ok) continue
      if (vivos.has(l.from)) vivos.add(l.to)
      if (vivos.has(l.to)) vivos.add(l.from)
    }
  }
  return vivos
}

/** O no logo abaixo de um link rompido que ainda parte de area viva.
 *  E nele que se deve tocar: e ali que a corrente para pela primeira vez. */
export function culpados(net: NetCase): string[] {
  const vivos = alcancaveis(net)
  return net.links.filter(l => !l.ok && vivos.has(l.from)).map(l => l.to)
}
