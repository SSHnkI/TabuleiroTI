/**
 * MISSAO TI :: service worker.
 *
 * Faz o jogo abrir sem internet depois da primeira visita. E o mesmo objetivo
 * do estande (que ja roda offline em localhost), so que valendo para quem
 * instalar o jogo no celular.
 *
 * Duas regras, e so duas:
 *
 *  NAVEGACAO vai na REDE PRIMEIRO. Se um build novo subiu, a pessoa recebe o
 *  build novo. Sem internet, cai para a copia guardada. Isto e o que impede o
 *  pior defeito de service worker mal feito: o app congelar numa versao velha
 *  e ninguem entender por que a correcao nao chegou.
 *
 *  O RESTO vai no CACHE PRIMEIRO. Script, estilo, fonte e icone tem o hash do
 *  conteudo no nome, entao arquivo com o mesmo nome tem o mesmo conteudo para
 *  sempre: buscar de novo seria desperdicio.
 */
const CACHE = 'missao-ti-v1'

self.addEventListener('install', e => {
  // Assume o lugar na hora, sem esperar a aba antiga fechar.
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './manifest.webmanifest']).catch(() => {})),
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // So o proprio site. Nada de tentar guardar coisa de terceiro, ate porque
  // este jogo nao chama nenhum.
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone()
          caches.open(CACHE).then(c => c.put('./', copia)).catch(() => {})
          return res
        })
        .catch(() => caches.match('./').then(r => r || caches.match(req))),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(guardado => {
      if (guardado) return guardado
      return fetch(req).then(res => {
        // Resposta parcial ou de erro nao se guarda: guardar um 404 e como
        // gravar o defeito em disco.
        if (res.ok && res.status === 200) {
          const copia = res.clone()
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {})
        }
        return res
      })
    }),
  )
})
