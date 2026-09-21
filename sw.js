/* Violão Diário: service worker.
   A página (index.html) é sempre buscada na rede primeiro, então quem abre o app com internet
   recebe a versão mais nova. Sem internet, abre a última versão guardada. */
const CACHE = 'violao-diario-v1';
const CORE = ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function pageNetworkFirst(url) {
  const cache = await caches.open(CACHE);
  const fromNet = fetch(url.origin + url.pathname, { cache: 'no-store' }).then(r => {
    if (r && r.ok) cache.put('index.html', r.clone());
    return r;
  });
  const timeout = new Promise(res => setTimeout(res, 4000));
  try {
    const r = await Promise.race([fromNet, timeout]);
    if (r && r.ok) return r;
  } catch (e) {}
  const cached = await cache.match('index.html');
  if (cached) return cached;
  return fromNet; // sem cópia guardada: espera a rede
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fresh = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => cached);
  return cached || fresh;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (url.searchParams.has('check')) return; // checagem de versão: sempre direto na rede
  const isPage = req.mode === 'navigate' || (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));
  if (isPage && sameOrigin) { e.respondWith(pageNetworkFirst(url)); return; }
  if (sameOrigin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(staleWhileRevalidate(req));
});
