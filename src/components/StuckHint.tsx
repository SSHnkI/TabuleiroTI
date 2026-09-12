/**
 * MISSAO TI :: ajuda que so aparece quando a pessoa trava.
 *
 * Este componente existe para resolver uma tensao real do estande: o jogo
 * nao pode tratar adulto como crianca, e ao mesmo tempo ninguem pode ficar
 * preso numa tela sem saber o que fazer, porque quem trava desiste e a fila
 * para atras dele.
 *
 * A solucao nao e deixar a dica na tela o tempo todo. Dica permanente
 * entrega a resposta, tira a graça e passa o recado de que o jogo acha que
 * voce nao consegue. Aqui o padrao e o silencio: a ajuda so entra depois de
 * alguns segundos SEM progresso, e some assim que a pessoa acerta de novo.
 *
 * Quem sabe joga sem nunca ver uma dica. Quem travou recebe socorro sem
 * precisar pedir, e sem que a fila perceba.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Lightbulb } from 'lucide-react'

/**
 * Vira `true` depois de `afterMs` sem progresso.
 * Qualquer mudanca em `progress` zera a contagem.
 */
export function useStuck(progress: unknown, afterMs = 9000): boolean {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    setStuck(false)
    const id = setTimeout(() => setStuck(true), afterMs)
    return () => clearTimeout(id)
  }, [progress, afterMs])

  return stuck
}

export function StuckHint({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-2.5"
        >
          <Lightbulb size={17} strokeWidth={1.6} style={{ color: 'var(--color-signal-yellow)' }} />
          <span className="text-[15px]" style={{ color: 'var(--color-label)' }}>
            {children}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
