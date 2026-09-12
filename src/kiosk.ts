/**
 * MISSAO TI :: blindagem de quiosque.
 *
 * Cada linha aqui corresponde a um "erro de interacao" relatado na edicao
 * anterior do estande. O CSS cobre a maior parte (touch-action, user-select,
 * overscroll-behavior); o que sobra exige JavaScript.
 *
 * Testar SEMPRE no monitor touch, com o dedo. Mouse nao reproduz nenhum
 * destes problemas.
 */

export function hardenKiosk(): void {
  const stop = (e: Event) => e.preventDefault()

  // Toque longo abrindo menu de contexto sobre o jogo.
  document.addEventListener('contextmenu', stop)

  // Pinca para zoom. `touch-action` cobre o caso comum, mas o Chrome ainda
  // emite estes eventos com dois dedos em algumas telas.
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(ev, stop)
  }

  // Arrastar o dedo selecionando texto ou "pegando" um elemento.
  document.addEventListener('selectstart', stop)
  document.addEventListener('dragstart', stop)

  // Zoom por Ctrl+roda. Acontece quando alguem encosta um mouse na maquina.
  document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault() }, { passive: false })

  // Zoom por teclado, caso haja teclado plugado no quiosque.
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault()
    // F5 e Backspace saindo da pagina no meio de uma partida.
    if (e.key === 'F5' || (e.key === 'Backspace' && e.target === document.body)) e.preventDefault()
  })

  // Duplo toque rapido dando zoom em navegadores que ignoram touch-action.
  let lastTouch = 0
  document.addEventListener('touchend', e => {
    const now = Date.now()
    if (now - lastTouch < 320) e.preventDefault()
    lastTouch = now
  }, { passive: false })
}

/** Tela cheia. Precisa ser chamada de dentro de um gesto do usuario. */
export async function goFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  } catch { /* o Chrome em modo --kiosk ja abre assim */ }
}

export const isFullscreen = () => Boolean(document.fullscreenElement)
