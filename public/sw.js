// Service worker mínimo do Riff Pro: só mostra a tela "sem conexão" quando a navegação falha.
// Não guarda páginas nem dados do app (nada de versão antiga presa no aparelho).
const OFFLINE_CACHE = 'riff-pro-offline-v1';
const OFFLINE_FILES = ['/offline.html', '/brand/app-icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // só a abertura de páginas; arquivos, banco e busca de endereço seguem direto para a rede
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }
  if (new URL(request.url).pathname === '/brand/app-icon-192.png') {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
