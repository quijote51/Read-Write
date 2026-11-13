/* ══════════════════════════════════════
   OÍDO COCINA · Tareas en segundo plano (cola)
   Lo que tarda (crear un PDF, leer la foto de un albarán) se manda a una cola y la app sigue libre: la persona
   puede cambiar de sección, apuntar temperaturas o cerrar la ventana de la tarea. Abajo a la izquierda sale una
   pastilla con lo que está en marcha («Segundo plano · 1»); al terminar se abre sola con el botón de lo que toca
   hacer (Enviar, Ver albarán…). Una tarea cada vez, por orden; entre pasos se cede el turno al navegador
   (`ceder`) para que no se congele la pantalla.
   Las tareas viven en la página (no sobreviven a recargar): si se intenta cerrar con algo en marcha, el
   navegador pregunta. Los botones se pulsan con el dedo, así que `navigator.share` y los permisos funcionan
   (no se pueden pedir desde un proceso que termina solo).
   API:
     colaTarea({titulo, ejecutar: async (progreso, ceder) => resultado,
                listo: resultado => ({texto, acciones:[{t, primaria?, fn:(resultado, tarea) => texto?}]}),
                alFallar: error => texto})
       progreso(porcentaje|null, texto?) · devuelve el id de la tarea.
     colaCeder()   → promesa que deja respirar a la pantalla
     colaEstado()  → [{id, titulo, estado:'espera'|'corre'|'hecha'|'fallo', texto, pct}]  (para pruebas)
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tareas = [];
let corriendo = null, sig = 1, abierto = false, ui = null;
const MAX_TERMINADAS = 8;

const ceder = () => (window.scheduler && typeof window.scheduler.yield === 'function') ? window.scheduler.yield() : new Promise(r => setTimeout(r, 0));
window.colaCeder = ceder;

window.colaTarea = function(o){
  const t = {id: sig++, titulo: o.titulo || 'Tarea', ejecutar: o.ejecutar, listo: o.listo, alFallar: o.alFallar, estado: 'espera', pct: null, texto: 'En cola', res: null, acciones: []};
  tareas.push(t); pintar(); arrancar(); return t.id;
};
window.colaEstado = () => tareas.map(t => ({id: t.id, titulo: t.titulo, estado: t.estado, texto: t.texto, pct: t.pct}));

async function arrancar(){
  if(corriendo) return;
  const t = tareas.find(x => x.estado === 'espera'); if(!t) return;
  corriendo = t; t.estado = 'corre'; t.texto = 'Empezando…'; t.pct = 0; t.acciones = []; pintar();
  try{
    const progreso = (pct, texto) => { if(pct != null) t.pct = Math.max(0, Math.min(100, Math.round(pct))); if(texto) t.texto = texto; pintar(); };
    t.res = await t.ejecutar(progreso, ceder);
    const l = (t.listo ? t.listo(t.res) : null) || {};
    t.estado = 'hecha'; t.pct = 100; t.texto = l.texto || 'Listo'; t.acciones = l.acciones || [];
  }catch(e){
    t.estado = 'fallo'; t.pct = null;
    t.texto = (t.alFallar ? t.alFallar(e) : '') || (e && e.message) || 'No se ha podido terminar.';
  }
  corriendo = null; limpiar(); abierto = true; pintar(); arrancar();
}
// Solo se guardan las últimas terminadas (cada PDF o foto leída ocupa memoria)
function limpiar(){
  const fin = tareas.filter(t => t.estado === 'hecha' || t.estado === 'fallo');
  fin.slice(0, Math.max(0, fin.length - MAX_TERMINADAS)).forEach(t => tareas.splice(tareas.indexOf(t), 1));
}
function quitar(id){ const i = tareas.findIndex(t => t.id === id); if(i >= 0 && tareas[i].estado !== 'corre') tareas.splice(i, 1); if(!tareas.length) abierto = false; pintar(); }
async function accion(id, n){
  const t = tareas.find(x => x.id === id); if(!t) return;
  if(n === 'reintentar'){ t.estado = 'espera'; t.texto = 'En cola'; pintar(); return arrancar(); }
  const a = t.acciones[n]; if(!a) return;
  try{ const r = await a.fn(t.res, t); if(typeof r === 'string') t.texto = r; }catch(e){ t.texto = (e && e.message) || 'No se ha podido.'; }
  pintar();
}

window.addEventListener('beforeunload', e => { if(tareas.some(t => t.estado === 'corre' || t.estado === 'espera')){ e.preventDefault(); e.returnValue = ''; } });

// ── Pantalla ──
const R = {espera: 'En cola', corre: 'En marcha', hecha: 'Listo', fallo: 'No se pudo'};
function resumen(){
  const act = tareas.filter(t => t.estado === 'corre' || t.estado === 'espera').length, ok = tareas.filter(t => t.estado === 'hecha').length, mal = tareas.filter(t => t.estado === 'fallo').length;
  if(act){ const run = tareas.find(t => t.estado === 'corre'); return {t: `Segundo plano · ${act}${run && run.pct != null ? ' · ' + run.pct + ' %' : ''}`, k: 'corre'}; }
  if(mal && !ok) return {t: 'No se pudo terminar', k: 'fallo'};
  return {t: ok > 1 ? `${ok} tareas listas` : 'Tarea lista', k: 'hecha'};
}
function pintar(){
  if(!tareas.length){ if(ui) ui.hidden = true; return; }
  if(!ui){
    if(!ge('cq-css')){ const s = document.createElement('style'); s.id = 'cq-css'; s.textContent = CSS; document.head.appendChild(s); }
    ui = document.createElement('div'); ui.id = 'cola-ui'; document.body.appendChild(ui);
    ui.addEventListener('click', e => {
      const b = e.target.closest('[data-cq]'); if(!b) return;
      const a = b.dataset.cq;
      if(a === 'abrir'){ abierto = !abierto; return pintar(); }
      if(a === 'cerrar'){ abierto = false; return pintar(); }
      const id = +b.dataset.id;
      if(a === 'quitar') return quitar(id);
      if(a === 'reintentar') return accion(id, 'reintentar');
      if(a === 'hacer') return accion(id, +b.dataset.n);
    });
    // Si está la barra «Hay una versión nueva», se sube para no taparla
    setInterval(() => { if(ui && !ui.hidden) ui.classList.toggle('cq-sube', !!ge('sw-aviso')); }, 1500);
  }
  ui.hidden = false; ui.classList.toggle('cq-sube', !!ge('sw-aviso'));
  const r = resumen();
  const filas = tareas.slice().reverse().map(t => `<div class="cq-t cq-${t.estado}">
    <div class="cq-tt"><b>${esc(t.titulo)}</b><small>${t.estado === 'corre' ? '' : esc(R[t.estado]) + ' · '}${esc(t.texto)}${t.estado === 'corre' && t.pct != null ? ` · ${t.pct} %` : ''}</small></div>
    ${t.estado === 'corre' ? `<div class="cq-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${t.pct || 0}"><span style="width:${t.pct || 0}%"></span></div>` : ''}
    <div class="cq-ac">${t.estado === 'hecha' ? t.acciones.map((a, n) => `<button type="button" class="${a.primaria ? 'cq-p' : ''}" data-cq="hacer" data-id="${t.id}" data-n="${n}">${esc(a.t)}</button>`).join('') : ''}${t.estado === 'fallo' ? `<button type="button" class="cq-p" data-cq="reintentar" data-id="${t.id}">Reintentar</button>` : ''}${t.estado !== 'corre' ? `<button type="button" class="cq-q" data-cq="quitar" data-id="${t.id}">Quitar</button>` : ''}</div></div>`).join('');
  ui.innerHTML = `<button type="button" class="cq-chip cq-${r.k}" data-cq="abrir" aria-expanded="${abierto}" aria-label="Tareas en segundo plano"><span class="cq-punto" aria-hidden="true"></span>${esc(r.t)}</button>
    ${abierto ? `<div class="cq-panel" role="status" aria-live="polite"><div class="cq-cab"><b>Segundo plano</b><button type="button" class="cq-x" data-cq="cerrar" aria-label="Cerrar">✕</button></div>${filas}<p class="cq-ayuda">Puedes seguir usando la app mientras tanto.</p></div>` : ''}`;
}

const CSS = `#cola-ui{position:fixed;left:max(10px,env(safe-area-inset-left,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:1099;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:calc(100vw - 20px);font:14px/1.3 system-ui,sans-serif}
#cola-ui.cq-sube{bottom:calc(74px + env(safe-area-inset-bottom,0px))}
#cola-ui[hidden]{display:none}
.cq-chip{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #c9a84c;background:#1a1a1a;color:#f0efe9;font:inherit;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}
.cq-punto{width:10px;height:10px;border-radius:50%;background:#c9a84c}
.cq-chip.cq-corre .cq-punto{animation:cqlat 1.1s ease-in-out infinite}
.cq-chip.cq-hecha .cq-punto{background:#7fcf8a}.cq-chip.cq-fallo .cq-punto{background:#f08080}
@keyframes cqlat{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
.cq-panel{width:min(360px,calc(100vw - 20px));max-height:60vh;overflow:auto;background:#1a1a1a;color:#f0efe9;border:1px solid #c9a84c;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.45);padding:10px 12px}
.cq-cab{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.cq-x{background:none;border:0;color:#cfcabd;font-size:16px;min-width:40px;min-height:40px;cursor:pointer}
.cq-t{padding:8px 0;border-top:1px solid #34312a;display:flex;flex-direction:column;gap:6px}
.cq-tt{display:flex;flex-direction:column;gap:2px}.cq-tt b{font-size:14px}.cq-tt small{font-size:12px;color:#cfcabd;overflow-wrap:anywhere}
.cq-hecha .cq-tt small{color:#9fdca7}.cq-fallo .cq-tt small{color:#f2a3a3}
.cq-barra{height:6px;background:#34312a;border-radius:99px;overflow:hidden}.cq-barra span{display:block;height:100%;background:#c9a84c;transition:width .25s}
.cq-ac{display:flex;gap:6px;flex-wrap:wrap}.cq-ac:empty{display:none}
.cq-ac button{font:inherit;font-size:13px;min-height:40px;padding:0 14px;border-radius:8px;border:1px solid #5a5649;background:none;color:#f0efe9;cursor:pointer}
.cq-ac .cq-p{background:#c9a84c;border-color:#c9a84c;color:#111;font-weight:600}.cq-ac .cq-q{border:0;color:#cfcabd;text-decoration:underline}
.cq-ayuda{margin:6px 0 0;font-size:12px;color:#9a9588}
@media(prefers-reduced-motion:reduce){.cq-chip.cq-corre .cq-punto{animation:none}.cq-barra span{transition:none}}`;
})();
