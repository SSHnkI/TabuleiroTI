import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { hardenKiosk } from './kiosk.ts'
import './styles/index.css'

hardenKiosk()

/**
 * Service worker: e o que faz o jogo abrir sem internet depois da primeira
 * visita, e o que permite instalar na tela inicial do celular.
 *
 * So em producao. Em desenvolvimento ele guardaria o build antigo e voce
 * passaria a tarde editando codigo que a tela nao mostra.
 *
 * Caminho relativo de proposito: o jogo roda tanto em localhost (estande)
 * quanto numa subpasta (usuario.github.io/repositorio/), e './sw.js' acerta
 * os dois. Barra no comeco acertaria so o primeiro.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sem service worker o jogo continua igual, so perde o modo offline */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
