// Service worker: la app abre sin conexión.
// - Páginas (navegación): red primero, y si falla, la copia guardada.
// - Archivos de la app y de CDN (iconos, SDK, fuentes): caché primero y se refresca en segundo plano.
// - Supabase y cualquier otra cosa: directo a la red (los datos viven en localStorage y se sincronizan aparte).
const CACHE = 'oido-cocina-v14';
const SHELL = ['/', '/index.html', '/horarios.js', '/inventario.js', '/alergenos.js', '/horarios.css', '/horarios.html', '/manifest-horarios.json', '/horarios-192.png', '/inventario.html', '/manifest-inventario.json', '/inventario-192.png', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32x32.png'];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    const clave = ['/horarios.html','/inventario.html'].includes(url.pathname) ? url.pathname : '/index.html';
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(clave, c)); return r; })
        .catch(() => caches.match(clave).then(r => r || caches.match('/index.html')).then(r => r || caches.match('/')))
    );
    return;
  }

  const mismo = url.origin === self.location.origin;
  if (mismo || CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const red = fetch(req).then(r => {
          if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); }
          return r;
        }).catch(() => hit);
        return hit || red;
      })
    );
  }
});
