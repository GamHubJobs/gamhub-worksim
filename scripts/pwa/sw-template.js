/*
 * GamHub WorkSim service worker (generated at build time from
 * scripts/pwa/sw-template.js; do not edit dist/sw.js by hand).
 *
 * - Installs every file of this version into its own cache, so WorkSim can
 *   start offline once it has been opened online.
 * - Built files have unique names per version, so they are served from the
 *   cache. The page itself is fetched from the network when possible, so a new
 *   version is found, and from the cache when offline.
 * - A new version waits until the player chooses to update (the page sends
 *   SKIP_WAITING after saving), so work is never interrupted by an update.
 * - Saves live in IndexedDB, which the service worker never touches.
 */
const VERSION = '__VERSION__'
const CACHE = `worksim-${VERSION}`
const FILES = __FILES__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Every file must arrive, or this version is not installed at all (the
      // previous version keeps working).
      cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('worksim-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  if (event.data === 'VERSION') event.ports[0]?.postMessage(VERSION)
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Pages: the network first (to find new versions), the cached page offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() =>
          caches
            .open(CACHE)
            .then((cache) => cache.match('./index.html', { ignoreVary: true }))
            .then((cached) => cached ?? Response.error()),
        ),
    )
    return
  }

  // Files of this version: from the cache, or the network if not cached.
  event.respondWith(
    caches
      .open(CACHE)
      // Ignore Vary: servers may vary by Origin, which module scripts send and
      // the install requests did not; the file is the same either way.
      .then((cache) => cache.match(request, { ignoreVary: true }))
      .then((cached) => cached ?? fetch(request)),
  )
})
