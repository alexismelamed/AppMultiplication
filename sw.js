/* =========================================================
   Service Worker — Tables de Multiplication
   ---------------------------------------------------------
   Stratégie "cache-first, network-fallback" :
   - À la première visite, on met en cache la page principale.
   - Ensuite, tout est servi depuis le cache → l'app marche
     100% hors-ligne, même sans data mobile.
   - Le cache est versionné (CACHE_NAME) : changer le numéro
     force les téléphones à télécharger la nouvelle version.
   ========================================================= */

const CACHE_NAME = 'multiplications-v1';

// Ressources à mettre en cache dès l'installation du SW
const CORE_ASSETS = [
  './',
  './index.html',
];

// --- Installation : on pré-remplit le cache ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()) // active tout de suite le nouveau SW
  );
});

// --- Activation : on supprime les anciens caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Interception des requêtes ---
self.addEventListener('fetch', (event) => {
  // On ne gère que le GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 1) Si trouvé dans le cache, on le renvoie immédiatement
      if (cached) return cached;

      // 2) Sinon on tente le réseau, et on met en cache la réponse
      return fetch(event.request)
        .then((response) => {
          // On ne cache que les réponses OK et de même origine
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // 3) Hors ligne et pas en cache : on renvoie la page principale
          //    pour que la navigation ne casse pas
          return caches.match('./index.html');
        });
    })
  );
});
