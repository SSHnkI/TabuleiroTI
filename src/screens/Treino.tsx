/**
 * MISSAO TI :: treino livre.
 *
 * Escolhe UM tipo de desafio e joga so ele, em todas as criticidades em que
 * ele existe. Serve para conferir um desafio no monitor do estande, para
 * ensaiar antes da feira e para demonstrar um cenario especifico a alguem.
 *
 * A partida de treino NAO e gravada. Nao entra no ranking, nao conta como
 * jogador do dia e nao aparece no CSV. Um estande que treina a manha inteira
 * nao pode terminar o dia com o placar mentindo sobre quanta gente jogou.
 */
import { motion } from 'motion/react'
import { Panel, HudLabel } from '@/components/hud'
import { BigButton } from '@/components/BigButton'
import type { MinigameId } from '@/game/scoring.ts'
import { EASE_OUT } from '@/lib/ease'

interface Ficha {
  id: MinigameId
  nome: string
  area: string
  /** O que a pessoa faz com o dedo. Nao o que o desafio ensina. */
  gesto: string
  tridimensional: boolean
}

/** A ordem e por area, nao por dificuldade: quem abre esta tela quase sempre
 *  esta procurando "aquele do rack", nao "um dificil". */
const FICHAS: Ficha[] = [
  { id: 'rack', nome: 'Rack de rede', area: 'Infraestrutura', gesto: 'Girar o rack e tocar na unidade em falha', tridimensional: true },
  { id: 'rede', nome: 'Topologia', area: 'Redes', gesto: 'Achar onde a corrente para, não onde apagou', tridimensional: true },
  { id: 'wifi', nome: 'Cobertura wi-fi', area: 'Redes', gesto: 'Achar o ponto de acesso que caiu na planta', tridimensional: true },
  { id: 'suporte', nome: 'Fila de chamados', area: 'Suporte', gesto: 'Tocar nas balizas na ordem de urgência', tridimensional: true },
  { id: 'seguranca', nome: 'Acesso indevido', area: 'Segurança', gesto: 'Girar o globo e achar a viagem impossível', tridimensional: true },
  { id: 'firewall', nome: 'Firewall', area: 'Segurança', gesto: 'Derrubar as senhas fracas antes que cheguem', tridimensional: false },
  { id: 'phishing', nome: 'E-mail suspeito', area: 'Segurança', gesto: 'Achar o que denuncia a fraude na mensagem', tridimensional: false },
  { id: 'scanner', nome: 'Scanner de erro', area: 'Sistemas', gesto: 'Tocar nos campos errados da tela do ERP', tridimensional: false },
  { id: 'fluxo', nome: 'Fluxo do processo', area: 'Sistemas', gesto: 'Montar o caminho na ordem certa', tridimensional: false },
  { id: 'timeline', nome: 'Linha do tempo', area: 'Sistemas', gesto: 'Arrastar até o instante exato da falha', tridimensional: false },
  { id: 'triagem', nome: 'Triagem', area: 'Suporte', gesto: 'Dizer quando cada chamado precisa ser resolvido', tridimensional: false },
  { id: 'backup', nome: 'Restauração', area: 'Infraestrutura', gesto: 'Pôr os passos do restore na ordem', tridimensional: false },
]

export function Treino({ onEscolher, onVoltar }: {
  onEscolher: (id: MinigameId) => void
  onVoltar: () => void
}) {
  return (
    <div className="relative grid h-full w-full grid-rows-[auto_1fr_auto] px-4 py-4 amplo:px-10 amplo:py-7">
      <header>
        <HudLabel>Modo treino</HudLabel>
        <h1
          className="mt-2 uppercase"
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'clamp(24px, 6vw, 44px)', letterSpacing: '.04em',
          }}
        >
          Escolha o desafio
        </h1>
        <p className="mt-1" style={{ color: 'var(--color-label)' }}>
          Joga só esse tipo, da criticidade mais leve à mais pesada.{' '}
          <span style={{ color: 'var(--color-signal-yellow)' }}>
            Nada aqui entra no placar.
          </span>
        </p>
      </header>

      <div className="rola-miolo min-h-0 overflow-y-auto py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 amplo:grid-cols-3">
          {FICHAS.map((f, i) => (
            <motion.button
              key={f.id}
              type="button"
              data-touch-target
              onPointerDown={() => onEscolher(f.id)}
              className="p-4 text-left outline-none amplo:p-5"
              style={{
                clipPath: 'var(--notch)',
                background: 'var(--color-ink-800)',
                border: '1px solid var(--color-ink-500)',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: EASE_OUT }}
            >
              <div className="flex items-center justify-between gap-2">
                <HudLabel>{f.area}</HudLabel>
                {f.tridimensional && (
                  <span
                    className="px-1.5 py-0.5 uppercase"
                    style={{
                      fontSize: 10, letterSpacing: '.18em',
                      color: 'var(--color-cyan-core)',
                      border: '1px solid var(--color-cyan-deep)',
                    }}
                  >
                    3D
                  </span>
                )}
              </div>
              <div
                className="mt-1.5 uppercase"
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: 'clamp(17px, 4.4vw, 21px)', letterSpacing: '.03em',
                }}
              >
                {f.nome}
              </div>
              <p className="mt-1 leading-snug" style={{ fontSize: 14, color: 'var(--color-micro)' }}>
                {f.gesto}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-4">
        <BigButton tone="ghost" onTap={onVoltar}>Voltar</BigButton>
        <Panel className="hidden px-4 py-2 amplo:block" tone="neutral">
          <HudLabel>Treino não é gravado: nem ranking, nem CSV, nem contagem do dia</HudLabel>
        </Panel>
      </footer>
    </div>
  )
}
