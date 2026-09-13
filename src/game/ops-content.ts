/**
 * MISSAO TI :: conteudo dos desafios de operacao (suporte e seguranca).
 *
 * Os dois seguem a mesma gramatica dos outros 3D: girar com o dedo, tocar no
 * que importa. O que muda e a licao.
 */
import type { Difficulty } from './scoring.ts'

/* ================================================================= SUPORTE
   Mecanica: os chamados abertos viram balizas de luz no chao da fabrica.
   O jogador toca NA ORDEM DE URGENCIA.

   Por que em 3D e nao em cartao: aqui o LUGAR e informacao. Uma maquina
   parada no meio da linha de producao pesa diferente de um mouse com defeito
   no escritorio, e ver os dois no mapa torna isso obvio sem explicar.

   Zero conhecimento tecnico: o texto do chamado diz o estrago.
   ========================================================================= */

export interface Incidente {
  id: string
  texto: string
  setor: string
  /** Posicao no chao da fabrica. */
  x: number
  z: number
  /** 1 atende agora, 2 atende hoje, 3 pode esperar. */
  urgencia: 1 | 2 | 3
  why: string
}

export interface SuporteCase {
  difficulty: Difficulty
  label: string
  question: string
  incidentes: Incidente[]
}

export const SUPORTE_CASES: SuporteCase[] = [
  {
    difficulty: 'medio',
    label: 'Fila da manhã',
    question: 'Cinco chamados abertos ao mesmo tempo. Toque na ordem de atendimento.',
    incidentes: [
      {
        id: 'a', texto: 'Linha 2 parada: coletor não lê etiqueta', setor: 'Produção',
        x: 1.8, z: -2.4, urgencia: 1,
        why: 'Linha de produção parada custa dinheiro por minuto. Vem sempre primeiro.',
      },
      {
        id: 'b', texto: 'Impressora do faturamento saindo borrada', setor: 'Escritório',
        x: -4.0, z: -2.8, urgencia: 2,
        why: 'Atrapalha e atrasa a emissão, mas existe outra impressora para contornar.',
      },
      {
        id: 'c', texto: 'Telefone da portaria mudo', setor: 'Portaria',
        x: 4.8, z: -3.4, urgencia: 2,
        why: 'Incomoda a recepção de carga, mas o celular da portaria resolve por enquanto.',
      },
      {
        id: 'd', texto: 'Pedido de mousepad novo', setor: 'Escritório',
        x: -4.2, z: 2.6, urgencia: 3,
        why: 'Solicitação sem urgência nenhuma. Entra na fila normal.',
      },
      {
        id: 'e', texto: 'Trocar a foto do perfil no sistema', setor: 'Escritório',
        x: -1.6, z: 3.6, urgencia: 3,
        why: 'Não afeta trabalho nenhum. Pode esperar a semana virar.',
      },
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Tudo ao mesmo tempo',
    question: 'Sete chamados. Toque do mais urgente ao menos urgente.',
    incidentes: [
      {
        id: 'a', texto: 'Alguém clicou em link suspeito e digitou a senha', setor: 'Escritório',
        x: -3.6, z: -3.2, urgencia: 1,
        why: 'Suspeita de senha vazada é emergência, mesmo sem prejuízo visível ainda. Cada minuto conta.',
      },
      {
        id: 'b', texto: 'Expedição inteira sem sistema: nada sai', setor: 'Expedição',
        x: 4.6, z: 2.8, urgencia: 1,
        why: 'Um setor inteiro impedido de trabalhar, com caminhão parado no pátio.',
      },
      {
        id: 'c', texto: 'Balança da linha 1 desconectando sozinha', setor: 'Produção',
        x: 0.8, z: -1.2, urgencia: 2,
        why: 'Atrapalha bastante, mas a pesagem ainda pode ser feita manualmente.',
      },
      {
        id: 'd', texto: 'Computador do RH muito lento', setor: 'Escritório',
        x: -4.4, z: 1.0, urgencia: 2,
        why: 'Reduz produtividade de uma pessoa, sem impedir o trabalho.',
      },
      {
        id: 'e', texto: 'Câmera da doca fora do ar', setor: 'Expedição',
        x: 3.2, z: 4.2, urgencia: 2,
        why: 'A doca fica sem gravação, mas a operação continua rodando hoje.',
      },
      {
        id: 'f', texto: 'Trocar o papel de parede da recepção', setor: 'Recepção',
        x: -1.0, z: 4.0, urgencia: 3,
        why: 'Estético. Não afeta trabalho nenhum.',
      },
      {
        id: 'g', texto: 'Instalar um segundo monitor no comercial', setor: 'Escritório',
        x: -2.6, z: -0.6, urgencia: 3,
        why: 'Melhoria de conforto. O trabalho acontece do mesmo jeito sem ela.',
      },
    ],
  },
]


/* =============================================================== SEGURANCA
   Mecanica: um globo com os acessos chegando a empresa. O jogador gira e
   toca no acesso invasor.

   A pista e VIAGEM IMPOSSIVEL: a mesma pessoa aparece logada em dois lugares
   distantes com poucos minutos de diferenca. Ninguem precisa saber nada de
   seguranca para entender que uma pessoa nao vai de Joinville a Kiev em
   quarenta minutos.

   E o metodo de deteccao que se usa de verdade. So que aqui da para ver.
   ========================================================================= */

export interface Acesso {
  id: string
  usuario: string
  cidade: string
  /** Graus. Usados para posicionar o ponto no globo. */
  lat: number
  lon: number
  /** Horario do acesso, em minutos desde a meia-noite. */
  hora: number
  invasor?: boolean
  why?: string
}

export interface SegurancaCase {
  difficulty: Difficulty
  label: string
  question: string
  acessos: Acesso[]
}

const hm = (h: number, m: number) => h * 60 + m

export const SEGURANCA_CASES: SegurancaCase[] = [
  {
    difficulty: 'dificil',
    label: 'Acesso de fora',
    question: 'Um destes acessos não é de quem diz ser.',
    // Dez acessos espalhados pelo pais de proposito: representante em Recife,
    // compras em Sao Paulo, fabrica em Joinville. E o que faz o globo virar
    // mapa de operacao em vez de bola com um pontinho.
    // A pista continua sendo UMA so: a mesma pessoa em dois lugares longe
    // demais, rapido demais. O resto e cenario.
    acessos: [
      { id: '1', usuario: 'CARLOS M.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(7, 58) },
      { id: '2', usuario: 'MARIA S.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(8, 31) },
      { id: '3', usuario: 'ANA P.', cidade: 'Curitiba, PR', lat: -25.4, lon: -49.3, hora: hm(8, 47) },
      { id: '4', usuario: 'RENATO F.', cidade: 'Recife, PE', lat: -8.05, lon: -34.9, hora: hm(8, 55) },
      // Repeticao legitima: mesma pessoa, mesma cidade, uma hora depois.
      // Esta aqui de proposito. Se aparecer duas vezes ja fosse resposta, o
      // desafio seria contar nomes em vez de pensar.
      { id: '5', usuario: 'CARLOS M.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(9, 2) },
      {
        id: '6', usuario: 'MARIA S.', cidade: 'Kiev, Ucrânia', lat: 50.4, lon: 30.5, hora: hm(9, 6),
        invasor: true,
        why: 'MARIA S. entrou de Joinville às 08:31 e reaparece em Kiev às 09:06. Ninguém atravessa o mundo em 35 minutos: a senha dela vazou.',
      },
      { id: '7', usuario: 'JOÃO R.', cidade: 'Blumenau, SC', lat: -26.9, lon: -49.1, hora: hm(9, 20) },
      // Segunda repeticao legitima.
      { id: '8', usuario: 'ANA P.', cidade: 'Curitiba, PR', lat: -25.4, lon: -49.3, hora: hm(10, 15) },
      { id: '9', usuario: 'PEDRO L.', cidade: 'São Paulo, SP', lat: -23.5, lon: -46.6, hora: hm(11, 4) },
      { id: '10', usuario: 'LÚCIA T.', cidade: 'Manaus, AM', lat: -3.1, lon: -60.0, hora: hm(13, 40) },
    ],
  },
  {
    difficulty: 'critico',
    label: 'Dois de fora',
    question: 'Dois acessos não deveriam existir. Ache os dois.',
    // Doze acessos, doze arcos. Dois pares impossiveis, e a mesma regra
    // aprendida na etapa anterior resolve os dois.
    acessos: [
      { id: '1', usuario: 'CARLOS M.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(7, 55) },
      {
        id: '2', usuario: 'CARLOS M.', cidade: 'Lagos, Nigéria', lat: 6.5, lon: 3.4, hora: hm(8, 20),
        invasor: true,
        why: 'CARLOS M. estava em Joinville 25 minutos antes. Dois continentes na mesma manhã não existe.',
      },
      { id: '3', usuario: 'ANA P.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(8, 40) },
      { id: '4', usuario: 'RENATO F.', cidade: 'Recife, PE', lat: -8.05, lon: -34.9, hora: hm(8, 52) },
      { id: '5', usuario: 'MARIA S.', cidade: 'São Paulo, SP', lat: -23.5, lon: -46.6, hora: hm(9, 10) },
      { id: '6', usuario: 'JOÃO R.', cidade: 'Blumenau, SC', lat: -26.9, lon: -49.1, hora: hm(9, 35) },
      {
        id: '7', usuario: 'MARIA S.', cidade: 'Hanói, Vietnã', lat: 21.0, lon: 105.8, hora: hm(9, 48),
        invasor: true,
        why: 'MARIA S. estava em São Paulo às 09:10 e aparece em Hanói 38 minutos depois, do outro lado do planeta.',
      },
      { id: '8', usuario: 'ANA P.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(10, 2) },
      { id: '9', usuario: 'LÚCIA T.', cidade: 'Manaus, AM', lat: -3.1, lon: -60.0, hora: hm(10, 25) },
      { id: '10', usuario: 'PEDRO L.', cidade: 'Porto Alegre, RS', lat: -30.0, lon: -51.2, hora: hm(11, 30) },
      { id: '11', usuario: 'RENATO F.', cidade: 'Recife, PE', lat: -8.05, lon: -34.9, hora: hm(12, 48) },
      { id: '12', usuario: 'JOÃO R.', cidade: 'Joinville, SC', lat: -26.3, lon: -48.8, hora: hm(13, 15) },
    ],
  },
]

/** A sede, onde todos os acessos chegam. Joinville, no mapa. */
export const SEDE = { lat: -26.3, lon: -48.8, nome: 'PLASTIREAL' }

export const relogio = (min: number) =>
  String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0')

/**
 * Distancia aproximada entre dois pontos do globo, em quilometros.
 * Serve para o jogo explicar por que aquele par e impossivel, com numero
 * em vez de adjetivo.
 */
export function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}
