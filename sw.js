// Service worker: la app abre sin conexión.
// - Páginas (navegación): red primero, y si falla, la copia guardada.
// - Archivos propios (js, css, iconos): red primero; la copia guardada solo sin conexión.
// - Librerías de CDN (iconos, SDK, fuentes): caché primero y se refresca en segundo plano.
// - Fotos del almacén de Supabase: caché primero (cada foto nueva tiene otro nombre).
// - Datos de Supabase y cualquier otra cosa: directo a la red (los datos viven en localStorage y se sincronizan aparte).
const CACHE = 'oido-cocina-v33';
const SHELL = ['/', '/index.html', '/horarios.js', '/inventario.js', '/alergenos.js', '/appcc.js', '/desperdicio.js', '/cartas.js', '/avisos.js', '/carta.html', '/compras.js', '/albaran-ocr.js', '/fotos.js', '/recetario.js', '/config-nube.js', '/recetas-nube.js', '/tablas-nube.js', '/equipo.js', '/marca.js', '/instalar.js', '/horarios.css', '/horarios.html', '/manifest-horarios.json', '/horarios-192.png', '/inventario.html', '/manifest-inventario.json', '/inventario-192.png', '/app-base.js', '/app-base.css', '/appcc.html', '/manifest-appcc.json', '/appcc-192.png', '/alergenos.html', '/manifest-alergenos.json', '/alergenos-192.png', '/albaranes.html', '/manifest-albaranes.json', '/albaranes-192.png', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32x32.png'];
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
    // Cada app suelta se guarda con su nombre; el resto de direcciones es la app principal.
    const clave = ['/horarios.html','/inventario.html','/appcc.html','/alergenos.html','/albaranes.html','/carta.html'].includes(url.pathname) ? url.pathname : '/index.html';
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(clave, c)); return r; })
        .catch(() => caches.match(clave).then(r => r || caches.match('/index.html')).then(r => r || caches.match('/')))
    );
    return;
  }

  // Archivos propios (js, css, iconos…): red primero, y la copia guardada solo sin conexión.
  // Así la página nueva nunca se mezcla con un archivo viejo guardado (eso dejaba el inventario en blanco).
  const mismo = url.origin === self.location.origin;
  if (mismo) {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); }
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // Librerías de fuera (iconos, supabase, fuentes) y fotos del almacén (nunca cambian: cada foto nueva tiene
  // otro nombre): caché primero, así se ven también sin conexión.
  const foto = url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/fotos/');
  if (CDN.includes(url.hostname) || foto) {
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

// Avisos en el móvil (avisos.js, supabase/avisos.sql): llega un aviso vacío y se pide el texto a Supabase.
const SUPA_URL = 'https://gxkxslkdqgwovgxcuzkr.supabase.co', SUPA_KEY = 'sb_publishable_xAUprOgWQi0HhYms69zUhA_yiTwDYPK';
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let m = null;
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const r = await fetch(SUPA_URL + '/rest/v1/rpc/aviso_push', {method: 'POST', headers: {apikey: SUPA_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify({p_endpoint: sub && sub.endpoint})});
      if (r.ok) m = await r.json();
    } catch (err) {}
    m = m || {titulo: 'Oído Cocina', cuerpo: 'Tienes avisos pendientes.', url: '/index.html#avisos'};
    await self.registration.showNotification(m.titulo || 'Oído Cocina', {body: m.cuerpo || '', icon: '/icon-192.png', badge: '/favicon-32x32.png', tag: 'oido-avisos', renotify: true, data: {url: m.url || '/index.html#avisos'}});
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/index.html#avisos', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(ls => {
    const w = ls.find(c => new URL(c.url).pathname === '/index.html' || new URL(c.url).pathname === '/');
    if (w) return w.navigate(url).then(c => (c || w).focus()).catch(() => w.focus());
    return self.clients.openWindow(url);
  }));
});
