/* ══════════════════════════════════════
   OÍDO COCINA · Aviso de versión nueva
   El service worker (sw.js) descarga cada versión entera en segundo plano y la deja esperando. Esta barra avisa
   («Hay una versión nueva · Actualizar»); al pulsar, se activa y esta página se recarga. «Más tarde» la esconde
   hasta la próxima vez que se abra la app; si se cierra la app del todo, la versión nueva entra sola.
   También pide a mi sw.js que busque versión nueva al volver a la app (como mucho cada 10 minutos).
   Se carga en todas las páginas que cargan instalar.js; el service worker lo registra cada página.
   ══════════════════════════════════════ */
(function(){
if(!('serviceWorker' in navigator)) return;
let pedido = false, recargado = false, ultimo = Date.now();

function barra(w){
  if(document.getElementById('sw-aviso')) return;
  if(!document.getElementById('sw-aviso-css')){
    const s = document.createElement('style'); s.id = 'sw-aviso-css';
    s.textContent = `#sw-aviso{position:fixed;left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:1100;max-width:520px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;background:#1a1a1a;color:#f0efe9;border:1px solid #c9a84c;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.4);font:14px/1.3 system-ui,sans-serif}
#sw-aviso span{flex:1;min-width:150px}
#sw-aviso button{font:inherit;min-height:40px;border-radius:8px;padding:0 14px;cursor:pointer}
#sw-aviso .sw-ok{background:#c9a84c;color:#111;border:0;font-weight:600}
#sw-aviso .sw-no{background:none;color:#cfcabd;border:0;text-decoration:underline}`;
    document.head.appendChild(s);
  }
  const b = document.createElement('div'); b.id = 'sw-aviso'; b.setAttribute('role', 'status');
  b.innerHTML = '<span>Hay una versión nueva de Oído Cocina.</span><button type="button" class="sw-ok">Actualizar</button><button type="button" class="sw-no">Más tarde</button>';
  b.querySelector('.sw-ok').onclick = () => { pedido = true; b.querySelector('span').textContent = 'Actualizando…'; b.querySelectorAll('button').forEach(x => x.hidden = true); try{ w.postMessage('saltar'); }catch(e){} };
  b.querySelector('.sw-no').onclick = () => b.remove();
  document.body.appendChild(b);
}
// Solo cuenta si ya había una versión mandando (en la primera instalación no hay nada que actualizar)
function vigila(w, reg){
  const si = () => { if(w.state === 'installed' && navigator.serviceWorker.controller) barra(w); };
  si(); w.addEventListener('statechange', si);
}
navigator.serviceWorker.addEventListener('controllerchange', () => { if(pedido && !recargado){ recargado = true; location.reload(); } });
navigator.serviceWorker.ready.then(reg => {
  if(reg.waiting) vigila(reg.waiting, reg);
  reg.addEventListener('updatefound', () => { if(reg.installing) vigila(reg.installing, reg); });
  const buscar = () => { ultimo = Date.now(); reg.update().catch(() => {}); };
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && Date.now() - ultimo > 10 * 60e3) buscar(); });
  setInterval(() => { if(document.visibilityState === 'visible') buscar(); }, 30 * 60e3);
}).catch(() => {});
})();
