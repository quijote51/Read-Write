// Service worker mínimo — solo existe para que el navegador reconozca
// la app como instalable (PWA). No cachea nada de forma agresiva para
// no interferir con los datos en vivo de Supabase.
const CACHE = 'oido-cocina-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Pass-through: deja pasar todas las peticiones a la red tal cual.
// Requerido para que Chrome considere la app "instalable".
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
