// Service worker: la app abre al instante y sin conexión. Caché por capas:
// 1) CACHE (cambia con cada versión): TODA la app (páginas, js, css, iconos) se guarda junta al instalar la versión.
//    La app abre desde ahí sin esperar a internet, y como los archivos son de la misma versión, nunca se mezcla
//    una página nueva con un .js viejo (eso dejó el inventario en blanco el 3/11). Cuando hay versión nueva se
//    descarga entera en segundo plano y la página (actualizar.js) avisa: «Hay una versión nueva · Actualizar».
// 2) FOTOS (no se borra al publicar): fotos de recetas y vajilla del almacén de Supabase, hasta MAX_FOTOS
//    (las más antiguas salen solas). Cada foto nueva tiene otro nombre, así que no caducan.
// 3) LIBS (no se borra al publicar): librerías de CDN con versión fija (iconos, supabase-js, fuentes, qr, pdf…).
// 4) ESTATICOS (no se borra al publicar): iconos y manifiestos que no estén en la versión; sale la copia y se
//    refresca en segundo plano.
// Los datos de Supabase NUNCA se guardan aquí: van directos a la red (viven en localStorage y se sincronizan aparte).
// **Subir CACHE en cada cambio de la app y añadir a SHELL cada archivo nuevo** (pruebas/sw-shell.js lo comprueba).
const CACHE = 'oido-cocina-v87';
const FOTOS = 'oido-fotos', LIBS = 'oido-cdn', ESTATICOS = 'oido-estaticos';
const MAX_FOTOS = 300;
const SHELL = ['/', '/index.html', '/horarios.js', '/horarios-eventos.js', '/horarios-generador.js', '/horarios-vacaciones.js', '/horarios-whatsapp.js', '/horarios-cambios.js', '/inventario.js', '/alergenos.js', '/appcc.js', '/appcc-hojas.js', '/desperdicio.js', '/cartas.js', '/avisos.js', '/buscador.js', '/rendimiento.js', '/fichaje.js', '/hojas.js', '/prevision.js', '/carta.html', '/compras.js', '/albaran-ocr.js', '/fotos.js', '/recetario.js', '/recetas-entrada.js', '/recetas-foto.js', '/platos-entrada.js', '/pasos.js', '/secciones.js', '/actualizar.js', '/cola.js', '/conjunta.js', '/hoy.js', '/config-nube.js', '/recetas-nube.js', '/tablas-nube.js', '/equipo.js', '/marca.js', '/instalar.js', '/tema.js', '/horarios.css', '/horarios.html', '/manifest-horarios.json', '/horarios-192.png', '/inventario.html', '/manifest-inventario.json', '/inventario-192.png', '/app-base.js', '/app-base.css', '/appcc.html', '/manifest-appcc.json', '/appcc-192.png', '/alergenos.html', '/manifest-alergenos.json', '/alergenos-192.png', '/albaranes.html', '/manifest-albaranes.json', '/albaranes-192.png', '/desperdicio.html', '/manifest-desperdicio.json', '/desperdicio-192.png', '/cartas.html', '/manifest-cartas.json', '/cartas-192.png', '/fichaje.html', '/manifest-fichaje.json', '/fichaje-192.png', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32x32.png'];
const PAGINAS = ['/horarios.html', '/inventario.html', '/appcc.html', '/alergenos.html', '/albaranes.html', '/carta.html', '/desperdicio.html', '/cartas.html', '/fichaje.html'];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const ESTATICO = /\.(png|ico|svg|webp)$|^\/manifest[^/]*\.json$/;

self.addEventListener('install', (e) => {
  // Todo o nada: si falta un archivo o no hay conexión, esta versión no se instala y sigue la anterior.
  // Páginas, js y css se piden saltándose la caché del navegador para no guardar copias viejas.
  const pide = SHELL.map(u => /\.(js|html|css)$|^\/$/.test(u) ? new Request(u, {cache: 'reload'}) : u);
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(pide)).then(() => {
    // Primera instalación: se activa ya. Si había una versión, espera a que la persona pulse «Actualizar» o cierre la app.
    if (!self.registration.active) return self.skipWaiting();
  }));
});

self.addEventListener('message', (e) => { if (e.data === 'saltar') self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { await migrar(); } catch (err) {}
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith('oido-cocina-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Las versiones anteriores guardaban las librerías de CDN dentro de su caché (que se borraba en cada versión):
// se pasan a LIBS antes de borrarla, para no quedarse sin ellas si el aparato está sin conexión.
async function migrar() {
  const libs = await caches.open(LIBS);
  for (const k of await caches.keys()) {
    if (!k.startsWith('oido-cocina-') || k === CACHE) continue;
    const vieja = await caches.open(k);
    for (const rq of await vieja.keys()) {
      if (!CDN.includes(new URL(rq.url).hostname) || await libs.match(rq)) continue;
      const r = await vieja.match(rq); if (r) await libs.put(rq, r);
    }
  }
}

// Deja en la caché como mucho `max` entradas: salen las más antiguas (keys() va por orden de entrada).
async function recortar(cache, max) {
  const ks = await cache.keys();
  for (let i = 0; i < ks.length - max; i++) await cache.delete(ks[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: de la versión guardada, al instante; solo si no está, de la red.
  if (req.mode === 'navigate') {
    // Cada app suelta se guarda con su nombre; el resto de direcciones es la app principal.
    const clave = PAGINAS.includes(url.pathname) ? url.pathname : '/index.html';
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(clave);
      if (hit) return hit;
      try { const r = await fetch(req); if (r && r.ok) c.put(clave, r.clone()); return r; }
      catch (err) { return (await c.match('/index.html')) || (await c.match('/')) || Response.error(); }
    })());
    return;
  }

  // Archivos propios: de la versión guardada. Lo que no esté en la versión (iconos de más): copia + refresco.
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const hit = await (await caches.open(CACHE)).match(req);
      if (hit) return hit;
      if (!ESTATICO.test(url.pathname)) return fetch(req);
      const c = await caches.open(ESTATICOS), viejo = await c.match(req);
      const red = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => viejo || Response.error());
      return viejo || red;
    })());
    return;
  }

  // Fotos del almacén: se piden en modo CORS (el almacén lo permite) para guardar la foto de verdad y no una
  // respuesta «opaca», que ocuparía unos 7 MB de cuota cada una. Caché primero, hasta MAX_FOTOS.
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/fotos/')) {
    e.respondWith((async () => {
      const c = await caches.open(FOTOS), hit = await c.match(req.url);
      if (hit) return hit;
      try {
        const r = await fetch(new Request(req.url, {mode: 'cors', credentials: 'omit'}));
        if (r && r.ok) e.waitUntil(c.put(req.url, r.clone()).then(() => recortar(c, MAX_FOTOS)));
        return r;
      } catch (err) { return fetch(req); }
    })());
    return;
  }

  // Librerías de CDN (versión fija): caché primero; solo las fuentes de Google se refrescan en segundo plano.
  if (CDN.includes(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(LIBS), hit = await c.match(req);
      if (hit && url.hostname !== 'fonts.googleapis.com') return hit;
      const red = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
      return hit || red;
    })());
  }
  // Datos de Supabase y cualquier otra cosa: directo a la red.
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
