/**
 * MISSAO TI :: conteudo do jogo, separado da mecanica.
 *
 * Cada mini-game tem VARIAS versoes, com criticidades diferentes. A rodada
 * sorteia uma de cada, entao duas partidas seguidas nunca sao iguais, e quem
 * fica olhando a fila nao decora a resposta e passa adiante.
 *
 * Tudo aqui e dado, nao codigo: da para reescrever os textos, trocar os
 * casos ou inventar incidentes novos sem tocar em nenhum componente.
 */
import type { Difficulty } from './scoring.ts'

/* =========================================================== SCANNER DE BUG
   Mecanica: a tela do sistema aparece e o dedo toca em cima do campo errado.
   ========================================================================= */

export interface ErpField {
  id: string
  label: string
  value: string
  mono?: boolean
  bug?: boolean
  why?: string
}

export interface ScannerCase {
  difficulty: Difficulty
  label: string
  screen: string
  ref: string
  status: string
  fields: ErpField[]
}

export const SCANNER_CASES: ScannerCase[] = [
  {
    difficulty: 'facil',
    label: 'Cadastro recusado',
    screen: 'Cadastro de cliente',
    ref: 'CLI-8842',
    status: 'recusado',
    fields: [
      { id: 'razao', label: 'Razão social', value: 'Metalúrgica Boa Vista' },
      {
        id: 'cnpj', label: 'CNPJ', value: '11.111.111/0001-11', mono: true, bug: true,
        why: 'CNPJ com todos os dígitos iguais não passa na validação. É dado de teste que vazou para produção.',
      },
      {
        id: 'email', label: 'E-mail', value: 'compras.metalurgica.com', bug: true,
        why: 'Não tem arroba. Nunca foi um e-mail válido, e por isso nenhuma nota chegou ao cliente.',
      },
      { id: 'cidade', label: 'Cidade', value: 'Joinville / SC' },
      { id: 'fone', label: 'Telefone', value: '(47) 3422-1180', mono: true },
      { id: 'vend', label: 'Vendedor', value: 'Carlos M.' },
    ],
  },
  {
    difficulty: 'medio',
    label: 'Pedido bloqueado',
    screen: 'Pedido de venda',
    ref: '#46221',
    status: 'bloqueado',
    fields: [
      { id: 'cliente', label: 'Cliente', value: 'João da Silva' },
      { id: 'valor', label: 'Valor', value: 'R$ 2.450,00', mono: true },
      { id: 'forma', label: 'Forma de pagamento', value: 'Cartão de crédito' },
      {
        id: 'parcelas', label: 'Parcelas', value: '0', mono: true, bug: true,
        why: 'Cartão de crédito nunca fecha com 0 parcelas. A integração mandou um valor inválido.',
      },
      { id: 'status_pag', label: 'Status do pagamento', value: 'Pago' },
      {
        id: 'data', label: 'Data do pedido', value: '31/12/2025', mono: true, bug: true,
        why: 'O pedido foi criado hoje. Data no passado indica campo vindo errado da origem.',
      },
      { id: 'status_op', label: 'Status da OP', value: 'Liberada' },
      { id: 'vendedor', label: 'Vendedor', value: 'Carlos M.' },
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Nota rejeitada',
    screen: 'Nota fiscal eletrônica',
    ref: 'NF-e 019477',
    status: 'rejeitada',
    // Regra de ouro deste desafio: toda falha tem que ser descobrivel
    // COMPARANDO campos da propria tela. A versao anterior pedia saber que
    // CFOP 5102 e venda dentro do estado, o que e conhecimento fiscal, nao
    // raciocinio, e travaria qualquer convidado de fora da area.
    fields: [
      { id: 'dest', label: 'Destinatário', value: 'Plastimax Ltda' },
      { id: 'uf', label: 'UF de destino', value: 'SP', mono: true },
      {
        id: 'entrega', label: 'Endereço de entrega',
        value: 'Rua das Palmeiras, 400 · Joinville / SC', bug: true,
        why: 'A UF de destino diz SP, mas o endereço de entrega é em SC. Os dois campos não podem estar certos ao mesmo tempo.',
      },
      { id: 'aliq', label: 'Alíquota de ICMS', value: '0,00%', mono: true },
      {
        id: 'vlr_icms', label: 'Valor do ICMS', value: 'R$ 3.312,00', mono: true, bug: true,
        why: 'A alíquota está em 0%, mas há R$ 3.312,00 de imposto na nota. Zero por cento de qualquer valor é zero.',
      },
      { id: 'total_prod', label: 'Total dos produtos', value: 'R$ 18.400,00', mono: true },
      {
        id: 'total_nota', label: 'Total da nota', value: 'R$ 1.840,00', mono: true, bug: true,
        why: 'O total da nota ficou dez vezes menor que o total dos produtos. Vírgula no lugar errado.',
      },
      { id: 'transp', label: 'Transportadora', value: 'Rodoexpresso' },
      { id: 'emissao', label: 'Emissão', value: '12/09/2026', mono: true },
    ],
  },
]

/* ================================================================= FIREWALL
   Mecanica: senhas caem, destrua as fracas, deixe as fortes passar.
   ========================================================================= */

export interface Password { text: string; weak: boolean; why: string }

export const PASSWORDS: Password[] = [
  { text: '123456', weak: true, why: 'Sequência óbvia, quebrada em menos de um segundo.' },
  { text: 'senha123', weak: true, why: 'Palavra comum com número no fim. Está em toda lista de ataque.' },
  { text: 'admin', weak: true, why: 'Usuário padrão. É o primeiro palpite de qualquer invasor.' },
  { text: 'Plastireal2026', weak: true, why: 'Nome da empresa mais o ano. Previsível demais.' },
  { text: 'qwerty', weak: true, why: 'Sequência do teclado.' },
  { text: '12345678', weak: true, why: 'Só aumentar o tamanho não resolve nada.' },
  { text: 'joao1990', weak: true, why: 'Nome e ano de nascimento são dados públicos.' },
  { text: 'Empresa@123', weak: true, why: 'Parece forte, mas é padrão conhecido de dicionário.' },
  { text: 'Brasil@2026', weak: true, why: 'Palavra comum, símbolo previsível e o ano corrente.' },
  { text: 'ti@2026', weak: true, why: 'Curta demais, e ainda entrega a área.' },

  { text: 'T3ch!_P@ss#9281', weak: false, why: 'Longa, com símbolos e sem palavra de dicionário.' },
  { text: 'Tr0v@o#91xK', weak: false, why: 'Mistura classes de caractere e não forma palavra.' },
  { text: 'vL7$mQ2&bH4z', weak: false, why: 'Aleatória e longa. É o que um gerenciador de senhas cria.' },
  { text: 'C4rro-Azul!Voa', weak: false, why: 'Frase-senha longa. Comprimento vale mais que símbolo.' },
  { text: 'xN#8pR$2wZ!5', weak: false, why: 'Sem padrão reconhecível e com bom comprimento.' },
]

export const FIREWALL_LIVES = 3

/** Quanto mais critico, mais senhas e mais rapido. */
export const FIREWALL_TUNING: Partial<Record<Difficulty, { drops: number; speed: number }>> = {
  medio: { drops: 12, speed: 1 },
  dificil: { drops: 16, speed: 1.2 },
  critico: { drops: 20, speed: 1.45 },
}

/* ==================================================================== FLUXO
   Mecanica: tocar as etapas na ordem certa. Tocar, nunca arrastar.
   ========================================================================= */

export interface FlowStep { id: string; label: string; hint: string }
export interface FlowCase {
  difficulty: Difficulty
  label: string
  question: string
  /** A ordem deste array E a resposta certa. */
  steps: FlowStep[]
}

export const FLOW_CASES: FlowCase[] = [
  {
    difficulty: 'facil',
    label: 'Ciclo do chamado',
    question: 'Monte o caminho de um chamado de suporte.',
    steps: [
      { id: 'abertura', label: 'ABERTURA', hint: 'Alguém registra o problema.' },
      { id: 'triagem', label: 'TRIAGEM', hint: 'A equipe classifica a prioridade.' },
      { id: 'atend', label: 'ATENDIMENTO', hint: 'Um técnico assume o chamado.' },
      { id: 'solucao', label: 'SOLUÇÃO', hint: 'O problema é resolvido.' },
      { id: 'fecham', label: 'FECHAMENTO', hint: 'O usuário confirma e o chamado encerra.' },
    ],
  },
  {
    difficulty: 'medio',
    label: 'Pedido de venda',
    question: 'Monte o caminho de um pedido até o cliente.',
    steps: [
      { id: 'cliente', label: 'CLIENTE', hint: 'Tudo começa com alguém querendo comprar.' },
      { id: 'pedido', label: 'PEDIDO', hint: 'O pedido é registrado no sistema.' },
      { id: 'aprovacao', label: 'APROVAÇÃO', hint: 'Crédito e condições são conferidos.' },
      { id: 'pagamento', label: 'PAGAMENTO', hint: 'Onde a integração do cartão falhou.' },
      { id: 'producao', label: 'PRODUÇÃO', hint: 'A OP é liberada para a fábrica.' },
      { id: 'entrega', label: 'ENTREGA', hint: 'O produto chega ao cliente.' },
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Ciclo de compras',
    question: 'Monte o caminho de uma compra, do pedido interno ao pagamento.',
    steps: [
      { id: 'requisicao', label: 'REQUISIÇÃO', hint: 'Uma área pede o que precisa.' },
      { id: 'cotacao', label: 'COTAÇÃO', hint: 'Compras busca preço com fornecedores.' },
      { id: 'aprova', label: 'APROVAÇÃO', hint: 'A gestão libera o gasto.' },
      { id: 'oc', label: 'ORDEM DE COMPRA', hint: 'O pedido formal vai ao fornecedor.' },
      { id: 'receb', label: 'RECEBIMENTO', hint: 'A mercadoria chega na portaria.' },
      { id: 'confer', label: 'CONFERÊNCIA', hint: 'Confere se veio o que foi pedido.' },
      { id: 'pagto', label: 'PAGAMENTO', hint: 'O financeiro quita a nota.' },
    ],
  },
]

/* ================================================================= TIMELINE
   Mecanica: arrastar o marcador ate o instante exato da falha.
   ========================================================================= */

export interface LogEvent { at: number; label: string; detail: string; failure?: boolean }
export interface TimelineCase {
  difficulty: Difficulty
  label: string
  question: string
  startLabel: string
  /** Minuto zero da janela, em minutos desde a meia-noite. */
  startMinute: number
  span: number
  events: LogEvent[]
  /** Erro em minutos que ainda vale nota cheia, e a partir do qual vale zero. */
  perfect: number
  zero: number
  answer: string
}

export const TIMELINE_CASES: TimelineCase[] = [
  {
    difficulty: 'medio',
    label: 'Pedido travado',
    question: 'Em que instante o pedido travou?',
    startLabel: '10:10', startMinute: 10 * 60 + 10, span: 30,
    perfect: 1.5, zero: 9,
    answer: 'A integração do cartão gravou parcelas = 0 às 10:33.',
    events: [
      { at: 5, label: '10:15', detail: 'Pedido criado pelo vendedor.' },
      { at: 22, label: '10:32', detail: 'Pagamento autorizado pela operadora.' },
      { at: 23, label: '10:33', detail: 'Integração do cartão gravou parcelas = 0.', failure: true },
      { at: 24, label: '10:34', detail: 'Pedido bloqueado por quantidade inválida.' },
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Fábrica parada',
    question: 'Em que instante a produção realmente parou?',
    startLabel: '02:00', startMinute: 2 * 60, span: 60,
    perfect: 1.5, zero: 12,
    answer: 'O disco do banco encheu às 02:41. A queda do sistema às 02:53 foi consequência, não causa.',
    events: [
      { at: 8, label: '02:08', detail: 'Backup noturno iniciado.' },
      { at: 41, label: '02:41', detail: 'Disco do banco de dados atingiu 100%.', failure: true },
      { at: 47, label: '02:47', detail: 'Gravações começaram a falhar em silêncio.' },
      { at: 53, label: '02:53', detail: 'Sistema fora do ar. Apontamento da fábrica parou.' },
    ],
  },
  {
    difficulty: 'critico',
    label: 'Acesso indevido',
    question: 'Em que instante o acesso deixou de ser legítimo?',
    startLabel: '18:00', startMinute: 18 * 60, span: 90,
    perfect: 2, zero: 16,
    answer: 'O login de fora do país às 18:52 foi a virada. O resto já era o invasor agindo.',
    events: [
      { at: 12, label: '18:12', detail: 'Login normal do usuário, da rede da fábrica.' },
      { at: 44, label: '18:44', detail: 'Usuário encerrou o expediente e saiu.' },
      { at: 52, label: '18:52', detail: 'Novo login do mesmo usuário, de outro país.', failure: true },
      { at: 61, label: '19:01', detail: 'Download em massa da base de clientes.' },
      { at: 78, label: '19:18', detail: 'Senha do usuário alterada pelo invasor.' },
    ],
  },
]

/* ================================================================== TRIAGEM
   Mecanica: chamado aparece, o jogador toca na prioridade certa.
   ========================================================================= */

export type Priority = 'P1' | 'P2' | 'P3'

export const PRIORITY_INFO: Record<Priority, { label: string; hint: string; color: string }> = {
  P1: { label: 'AGORA', hint: 'A empresa parou', color: '#FF3F2E' },
  P2: { label: 'HOJE', hint: 'Dá para trabalhar, mas atrapalha', color: '#FFD33D' },
  P3: { label: 'PODE ESPERAR', hint: 'Só incomoda', color: '#25DFA0' },
}

export interface Ticket { text: string; priority: Priority; why: string }

export const TICKETS: Ticket[] = [
  { text: 'Servidor do ERP fora do ar. Fábrica inteira parada.', priority: 'P1', why: 'Produção parada é sempre P1.' },
  { text: 'Recebi um e-mail pedindo a senha e cliquei no link.', priority: 'P1', why: 'Suspeita de vazamento é P1, mesmo sem prejuízo visível ainda.' },
  { text: 'Nenhuma nota fiscal está sendo emitida desde as 8h.', priority: 'P1', why: 'Faturamento parado trava o caixa da empresa.' },
  { text: 'Ninguém da expedição consegue acessar o sistema.', priority: 'P1', why: 'Um setor inteiro impedido de trabalhar.' },

  { text: 'A impressora da expedição só imprime borrado.', priority: 'P2', why: 'Atrapalha e atrasa, mas existe contorno.' },
  { text: 'Meu computador está muito lento desde ontem.', priority: 'P2', why: 'Reduz produtividade sem impedir o trabalho.' },
  { text: 'O relatório de vendas está saindo com número errado.', priority: 'P2', why: 'Dado errado atrapalha decisão, mas o sistema opera.' },
  { text: 'A internet do escritório cai por alguns segundos.', priority: 'P2', why: 'Intermitente: incomoda bastante, mas não para tudo.' },

  { text: 'Queria um monitor maior na minha mesa.', priority: 'P3', why: 'Melhoria, não incidente.' },
  { text: 'O papel de parede do meu PC voltou ao padrão.', priority: 'P3', why: 'Estético. Não afeta trabalho nenhum.' },
  { text: 'Meu mouse está com a rodinha dura.', priority: 'P3', why: 'Incômodo pequeno, com troca simples.' },
  { text: 'Pode instalar um app de anotações no meu notebook?', priority: 'P3', why: 'Solicitação comum, sem urgência.' },
]

export const TRIAGEM_TUNING: Partial<Record<Difficulty, number>> = {
  facil: 4, medio: 5, dificil: 7,
}

/* ================================================================= PHISHING
   Mecanica: o e-mail aparece e o dedo toca nos indicios de golpe.
   ========================================================================= */

export interface EmailPart {
  id: string
  role: 'de' | 'assunto' | 'corpo' | 'link' | 'anexo'
  label: string
  text: string
  suspicious?: boolean
  why?: string
}

export interface PhishingCase {
  difficulty: Difficulty
  label: string
  parts: EmailPart[]
}

export const PHISHING_CASES: PhishingCase[] = [
  {
    difficulty: 'medio',
    label: 'E-mail do banco',
    parts: [
      {
        id: 'de', role: 'de', label: 'De', text: 'seguranca@banco-oficial-br.com', suspicious: true,
        why: 'O domínio não é o do banco. Imita o nome com hífens para parecer legítimo.',
      },
      { id: 'para', role: 'corpo', label: 'Para', text: 'financeiro@plastireal.com.br' },
      {
        id: 'assunto', role: 'assunto', label: 'Assunto',
        text: 'URGENTE: sua conta será bloqueada em 2 horas', suspicious: true,
        why: 'Urgência com prazo curto existe para você agir sem pensar. É a marca registrada do golpe.',
      },
      {
        id: 'corpo', role: 'corpo', label: 'Mensagem',
        text: 'Prezado cliente, detectamos uma movimentação atípica. Confirme seus dados para evitar o bloqueio.',
      },
      {
        id: 'link', role: 'link', label: 'Link', text: 'http://bit.ly/conta-segura-br', suspicious: true,
        why: 'Encurtador esconde o destino real, e ainda por cima sem HTTPS. Banco nenhum faz isso.',
      },
      { id: 'assin', role: 'corpo', label: 'Assinatura', text: 'Central de Relacionamento' },
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Cobrança de fornecedor',
    parts: [
      {
        id: 'de', role: 'de', label: 'De', text: 'financeiro@rodoexpresso.com.co', suspicious: true,
        why: 'O fornecedor é .com.br. O .com.co é outro país, e a troca é quase invisível na correria.',
      },
      { id: 'assunto', role: 'assunto', label: 'Assunto', text: 'Boleto referente à NF 019477' },
      { id: 'corpo', role: 'corpo', label: 'Mensagem', text: 'Segue em anexo o boleto da nota já entregue. Atenciosamente, Rodoexpresso.' },
      {
        id: 'conta', role: 'corpo', label: 'Dados bancários',
        text: 'ATENÇÃO: mudamos de banco. Nova conta: Ag 0001 / CC 99887-2', suspicious: true,
        why: 'Mudança de conta bancária por e-mail é o golpe do boleto. Sempre confirme por telefone conhecido.',
      },
      {
        id: 'anexo', role: 'anexo', label: 'Anexo', text: 'boleto_019477.pdf.exe', suspicious: true,
        why: 'A extensão real é .exe, não .pdf. É um programa disfarçado de documento.',
      },
      { id: 'resp', role: 'corpo', label: 'Responder para', text: 'financeiro@rodoexpresso.com.co' },
    ],
  },
]

/* =================================================================== BACKUP
   Mecanica: o sistema mostra a sequencia de restauracao e o jogador repete.
   ========================================================================= */

export interface RestoreStep { id: string; label: string; icon: string }

export const RESTORE_STEPS: RestoreStep[] = [
  { id: 'isolar', label: 'ISOLAR', icon: 'shield' },
  { id: 'snapshot', label: 'SNAPSHOT', icon: 'camera' },
  { id: 'banco', label: 'BANCO', icon: 'database' },
  { id: 'arquivos', label: 'ARQUIVOS', icon: 'folder' },
  { id: 'servico', label: 'SERVIÇO', icon: 'server' },
  { id: 'testar', label: 'TESTAR', icon: 'check' },
]

/** Quanto mais critico, mais longa a sequencia a memorizar. */
export const BACKUP_TUNING: Partial<Record<Difficulty, number>> = {
  medio: 4, dificil: 5, critico: 6,
}

/* ============================================================== DIAGNOSTICO */

export const DIAGNOSIS =
  'Sistemas param por detalhe: um campo inválido, uma prioridade mal lida, ' +
  'um clique num link errado. Quem olha o processo inteiro acha a causa antes do prejuízo.'

/* ===================================================================== RACK
   Mecanica: um rack de servidores em 3D. Gira com o dedo, toca na peca em
   falha. A peca pode estar ATRAS: e preciso virar o rack para achar.

   Zero conhecimento tecnico: verde e ok, vermelho e falha. O que o desafio
   cobra e atencao e vontade de olhar o outro lado do equipamento, que e
   exatamente o que um tecnico faz na sala de verdade.
   ========================================================================= */

export type UnitStatus = 'ok' | 'atencao' | 'falha'

export interface RackUnit {
  name: string
  status: UnitStatus
  /** Em que face o estado aparece. 'tras' obriga a girar o rack. */
  face: 'frente' | 'tras'
  detail: string
}

export interface RackCase {
  difficulty: Difficulty
  label: string
  question: string
  units: RackUnit[]
}

const ok = (name: string, detail: string): RackUnit =>
  ({ name, status: 'ok', face: 'frente', detail })

export const RACK_CASES: RackCase[] = [
  {
    difficulty: 'medio',
    label: 'Rack de rede',
    question: 'Um equipamento do rack está em falha.',
    units: [
      ok('SWITCH-01', 'Operando. 48 portas ativas.'),
      ok('SWITCH-02', 'Operando. 48 portas ativas.'),
      { name: 'FIREWALL', status: 'falha', face: 'frente', detail: 'Sem resposta. É por aqui que a internet inteira da fábrica passa.' },
      ok('ROTEADOR', 'Operando. Link principal ativo.'),
      ok('PATCH-A', 'Passivo. Sem alimentação.'),
      ok('NOBREAK', 'Bateria em 98%.'),
    ],
  },
  {
    difficulty: 'dificil',
    label: 'Rack de produção',
    question: 'Duas unidades estão em falha. Uma delas não aparece de frente.',
    units: [
      ok('APP-01', 'Operando. Carga normal.'),
      { name: 'BANCO-01', status: 'falha', face: 'frente', detail: 'Disco cheio. Foi o que derrubou o apontamento da fábrica.' },
      ok('APP-02', 'Operando. Carga normal.'),
      ok('STORAGE', 'Operando. 62% usado.'),
      { name: 'BANCO-02', status: 'falha', face: 'tras', detail: 'Cabo de rede solto na traseira. De frente, a luz parecia normal.' },
      ok('BACKUP', 'Última cópia às 02:08.'),
      ok('NOBREAK', 'Bateria em 96%.'),
    ],
  },
  {
    difficulty: 'critico',
    label: 'Rack principal',
    question: 'Três unidades em falha. Amarelo é aviso, não falha.',
    units: [
      { name: 'HIPERVISOR', status: 'falha', face: 'tras', detail: 'Fonte redundante desligada na traseira. O servidor está sem proteção.' },
      ok('APP-01', 'Operando.'),
      { name: 'BANCO-01', status: 'atencao', face: 'frente', detail: 'Aviso: 81% de disco. Incomoda, mas não é falha.' },
      { name: 'SWITCH-CORE', status: 'falha', face: 'frente', detail: 'Porta principal caída. Metade da rede saiu do ar.' },
      ok('STORAGE', 'Operando. 58% usado.'),
      { name: 'NOBREAK', status: 'atencao', face: 'frente', detail: 'Aviso: bateria em 41%. Ainda segura uma queda.' },
      { name: 'BACKUP', status: 'falha', face: 'tras', detail: 'Disco de backup removido. Não havia cópia desde ontem.' },
      ok('APP-02', 'Operando.'),
    ],
  },
]

/* ===================================================================== WIFI
   Mecanica: a planta do galpao em 3D, com as bolhas de cobertura visiveis.
   Gira com o dedo, toca no ponto de acesso que caiu.

   Zero conhecimento tecnico: onde nao ha bolha, nao pega. Qualquer pessoa
   que ja reclamou de wifi no refeitorio entende em dois segundos.
   ========================================================================= */

export interface AccessPoint {
  name: string
  /** Posicao na planta, em metros aproximados a partir do centro. */
  x: number
  z: number
  status: UnitStatus
  /** Raio de cobertura. Cai junto com o estado. */
  range: number
  detail: string
}

export interface WifiWall { x: number; z: number; w: number; d: number }

export interface WifiCase {
  difficulty: Difficulty
  label: string
  question: string
  aps: AccessPoint[]
  walls: WifiWall[]
  /** Onde as pessoas reclamaram que nao pega. */
  queixas: { x: number; z: number; texto: string }[]
}

const GALPAO: WifiWall[] = [
  { x: 0, z: -5.2, w: 13.4, d: 0.3 },
  { x: 0, z: 5.2, w: 13.4, d: 0.3 },
  { x: -6.7, z: 0, w: 0.3, d: 10.4 },
  { x: 6.7, z: 0, w: 0.3, d: 10.4 },
  { x: -2.2, z: -1.6, w: 0.3, d: 6.8 },
  { x: 2.6, z: 1.4, w: 6.0, d: 0.3 },
]

export const WIFI_CASES: WifiCase[] = [
  {
    difficulty: 'medio',
    label: 'Wi-Fi do galpão',
    question: 'Um ponto de acesso caiu. Ache o buraco de sinal.',
    walls: GALPAO,
    aps: [
      { name: 'AP-ESCRITÓRIO', x: -4.4, z: -3.0, status: 'ok', range: 3.4, detail: 'Operando. 18 aparelhos conectados.' },
      { name: 'AP-PRODUÇÃO', x: 1.0, z: -2.6, status: 'ok', range: 3.6, detail: 'Operando. 31 aparelhos conectados.' },
      { name: 'AP-EXPEDIÇÃO', x: 4.6, z: 3.0, status: 'falha', range: 0.6, detail: 'Sem energia. A expedição inteira ficou sem coletor.' },
      { name: 'AP-REFEITÓRIO', x: -4.2, z: 3.2, status: 'ok', range: 3.2, detail: 'Operando. 9 aparelhos conectados.' },
    ],
    queixas: [{ x: 4.4, z: 3.2, texto: 'Coletor não conecta' }],
  },
  {
    difficulty: 'dificil',
    label: 'Wi-Fi da fábrica',
    question: 'Dois pontos falharam. Amarelo é sinal fraco, não queda.',
    walls: GALPAO,
    aps: [
      { name: 'AP-ESCRITÓRIO', x: -4.6, z: -3.2, status: 'ok', range: 3.4, detail: 'Operando.' },
      { name: 'AP-LINHA-1', x: 0.4, z: -3.4, status: 'falha', range: 0.6, detail: 'Fora do ar. O apontamento da linha 1 parou.' },
      { name: 'AP-LINHA-2', x: 2.4, z: -0.4, status: 'atencao', range: 2.2, detail: 'Sinal fraco por interferência do motor. Ainda conecta.' },
      { name: 'AP-EXPEDIÇÃO', x: 5.0, z: 3.2, status: 'falha', range: 0.6, detail: 'Cabo de rede rompido na canaleta.' },
      { name: 'AP-REFEITÓRIO', x: -4.4, z: 3.4, status: 'ok', range: 3.0, detail: 'Operando.' },
      { name: 'AP-DOCA', x: 0.2, z: 4.0, status: 'ok', range: 2.8, detail: 'Operando.' },
    ],
    queixas: [
      { x: 0.6, z: -3.6, texto: 'Tablet caiu da rede' },
      { x: 5.2, z: 3.0, texto: 'Sem sinal na doca' },
    ],
  },
]
