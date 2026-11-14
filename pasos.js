/* ══════════════════════════════════════
   OÍDO COCINA · Primeros pasos
   Tarjeta arriba de Inicio (solo administración, dirección y chef) con lo mínimo para empezar, cada paso con su
   botón «Hacerlo» que lleva al sitio. Se marca solo cuando se detecta hecho; lo que no se puede detectar
   (invitar al equipo) se marca a mano. «Ocultar» la quita en este aparato (oido_pasos_oculto); vuelve desde la lupa
   escribiendo «primeros pasos». Desaparece sola cuando todo está hecho.
   Usa del principal: rolActual, hotelDatos (marca.js), recetas, RECETAS_BASE, preciosIng, PRECIOS_BASE, appcc,
   eventos, showTab, showNuevaReceta, switchEsc, _uid.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const LS = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } };
const rol = () => (typeof rolActual !== 'undefined' && rolActual) || '';
// Solo los pasos de secciones que este rol ve (el chef no crea eventos ni entra en Ajustes)
const veo = tab => { const r = typeof ROLES !== 'undefined' && ROLES[rol()]; return !!r && r.tabs.includes(tab) && (typeof seccionActiva !== 'function' || seccionActiva(tab)); };
const misPasos = () => PASOS.filter(p => veo(p.tab));
const ir = (tab, luego) => { if(typeof showTab === 'function') showTab(tab); if(luego) setTimeout(luego, 250); };
const foco = id => { const e = ge(id); if(e){ e.scrollIntoView({behavior: 'smooth', block: 'center'}); setTimeout(() => e.focus(), 300); } };

const PASOS = [
  {id: 'hotel', tab: 'ajustes', t: 'Pon el nombre de tu hotel o restaurante', d: 'Sale en las hojas impresas, la carta QR y los mensajes.',
    hecho: () => { try{ return !!(typeof hotelDatos === 'function' && hotelDatos().nombre); }catch(e){ return false; } },
    ir: () => ir('ajustes', () => foco('aj-hotel-nombre'))},
  {id: 'recetas', tab: 'recetario', t: 'Crea 3 recetas tuyas con sus alérgenos', d: 'Con ingredientes por ración. Puedes dictarlas con el micrófono.',
    hecho: () => propias() >= 3, cuenta: () => `${Math.min(propias(), 3)} de 3`,
    ir: () => ir('recetario', () => { if(typeof showNuevaReceta === 'function') showNuevaReceta(); })},
  {id: 'precios', tab: 'escandallo', t: 'Pon los precios de tus ingredientes', d: 'Como los compras (€/kg, €/l o €/unidad). Así sale el coste de cada plato.',
    hecho: () => preciosPropios(),
    ir: () => ir('escandallo', () => { const b = ge('esc-tab-precios'); if(b && typeof switchEsc === 'function') switchEsc('precios', b); })},
  {id: 'appcc', tab: 'appcc', t: 'Pon tus cámaras y zonas de limpieza', d: 'En APPCC → Ajustes: las de ejemplo no son las tuyas.',
    hecho: () => !!(typeof appcc !== 'undefined' && appcc && appcc.cts > 0),
    ir: () => ir('appcc', () => { const b = document.querySelector('#ap-root [data-v="ajustes"]'); if(b) b.click(); })},
  {id: 'evento', tab: 'nuevo', t: 'Crea tu primer evento', d: 'Con sus platos elegidos de tus recetas y las alergias de los invitados.',
    hecho: () => (typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : []).some(e => +e.id >= 1e6),
    ir: () => ir('nuevo', () => foco('n-nom'))},
  {id: 'equipo', tab: 'ajustes', t: 'Invita a tu equipo', d: 'Ajustes → Equipo: crea un código para cada persona. Hace falta entrar con cuenta.', manual: true,
    hecho: () => !!(LS('oido_pasos_hechos') || {}).equipo,
    ir: () => ir('ajustes', () => { const c = ge('equipo-card'); if(c && c.style.display !== 'none') c.scrollIntoView({behavior: 'smooth', block: 'start'}); })}
];
function propias(){
  const base = new Set((typeof RECETAS_BASE !== 'undefined' ? RECETAS_BASE : []).map(r => r.id));
  return (typeof recetas !== 'undefined' && Array.isArray(recetas) ? recetas : []).filter(r => !r.borrado && !base.has(r.id) && (r.ingredientes || []).length && Array.isArray(r.alg)).length;
}
function preciosPropios(){
  try{
    const p = typeof preciosIng !== 'undefined' ? preciosIng : {}, b = typeof PRECIOS_BASE !== 'undefined' ? PRECIOS_BASE : {};
    return Object.keys(p).some(k => p[k] && p[k].precio > 0 && (!b[k] || b[k].precio !== p[k].precio));
  }catch(e){ return false; }
}

function visible(){ return ['admin', 'direccion', 'chef'].includes(rol()) && !LS('oido_pasos_oculto'); }
function pintar(){
  const dash = ge('dash-cont'); if(!dash) return;
  let c = ge('pasos-card');
  const lista = misPasos(), estados = lista.map(p => ({p, ok: !!p.hecho()})), hechos = estados.filter(x => x.ok).length;
  if(!visible() || !lista.length || hechos === lista.length){ if(c) c.remove(); return; }
  if(!c){
    if(!ge('pasos-css')){ const s = document.createElement('style'); s.id = 'pasos-css'; s.textContent = CSS; document.head.appendChild(s); }
    c = document.createElement('section'); c.id = 'pasos-card'; c.className = 'card'; c.setAttribute('aria-label', 'Primeros pasos');
    dash.parentNode.insertBefore(c, dash);
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-pa]'); if(!b) return;
      const a = b.dataset.pa, p = PASOS.find(x => x.id === b.dataset.id);
      if(a === 'ir' && p) p.ir();
      if(a === 'manual' && p){ const h = LS('oido_pasos_hechos') || {}; h[p.id] = !h[p.id]; LS('oido_pasos_hechos', h); pintar(); }
      if(a === 'ocultar'){ LS('oido_pasos_oculto', true); pintar(); }
    });
  }
  const html = `<div class="pa-cab"><div><b>Primeros pasos</b><small>${hechos} de ${lista.length} hechos</small></div><button type="button" class="pa-ocultar" data-pa="ocultar">Ocultar</button></div>
    <div class="pa-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${lista.length}" aria-valuenow="${hechos}"><span style="width:${Math.round(hechos / lista.length * 100)}%"></span></div>
    <ol class="pa-lista">${estados.map(({p, ok}) => `<li class="${ok ? 'ok' : ''}">
      <span class="pa-marca" aria-hidden="true">${ok ? '✓' : ''}</span>
      <div class="pa-txt"><b>${p.t}${p.cuenta && !ok ? ` <small>(${p.cuenta()})</small>` : ''}</b><small>${p.d}</small></div>
      <div class="pa-acc">${ok ? (p.manual ? `<button type="button" class="pa-link" data-pa="manual" data-id="${p.id}">Desmarcar</button>` : '<span class="pa-hecho">Hecho</span>')
        : `<button type="button" class="btn btn-p" data-pa="ir" data-id="${p.id}">Hacerlo</button>${p.manual ? `<button type="button" class="pa-link" data-pa="manual" data-id="${p.id}">Ya lo he hecho</button>` : ''}`}</div>
    </li>`).join('')}</ol>`;
  if(c.innerHTML !== html) c.innerHTML = html;
}
window.pasosMostrar = () => { LS('oido_pasos_oculto', null); if(typeof showTab === 'function') showTab('dashboard'); setTimeout(pintar, 200); };
// Se repinta al abrir Inicio, al cambiar de rol y cada pocos segundos (por si se acaba de hacer un paso)
function iniciar(){
  pintar();
  if(typeof window.initDashboard === 'function' && !window.initDashboard._pa){ const o = window.initDashboard; window.initDashboard = function(){ const r = o.apply(this, arguments); pintar(); return r; }; window.initDashboard._pa = true; }
  if(typeof window.aplicarRol === 'function' && !window.aplicarRol._pa){ const o = window.aplicarRol; window.aplicarRol = function(){ const r = o.apply(this, arguments); setTimeout(pintar, 50); return r; }; window.aplicarRol._pa = true; }
  setInterval(() => { if(document.visibilityState === 'visible') pintar(); }, 4000);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

const CSS = `#pasos-card{border:1px solid var(--gold);margin-bottom:10px}
.pa-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.pa-cab b{font-size:15px;display:block}.pa-cab small{font-size:12px;color:var(--text-secondary)}
.pa-ocultar,.pa-link{background:none;border:0;color:var(--text-secondary);font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;min-height:44px;padding:0 4px}
.pa-barra{height:6px;background:var(--bg-secondary);border-radius:99px;margin:8px 0 10px;overflow:hidden}.pa-barra span{display:block;height:100%;background:var(--gold);border-radius:99px;transition:width .3s}
.pa-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.pa-lista li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:4px 10px;align-items:start;padding:8px 0;border-top:.5px solid var(--border)}
.pa-marca{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border-md);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;margin-top:2px}
li.ok .pa-marca{background:var(--success-bg);border-color:var(--success-text);color:var(--success-text)}
.pa-txt{display:flex;flex-direction:column;gap:2px;min-width:0}.pa-txt b{font-size:14px;font-weight:600}.pa-txt small{font-size:12px;color:var(--text-secondary)}
li.ok .pa-txt b{color:var(--text-secondary);text-decoration:line-through}
.pa-acc{grid-column:2;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pa-hecho{font-size:12px;color:var(--success-text);font-weight:600}
@media(prefers-reduced-motion:reduce){.pa-barra span{transition:none}}`;
})();
