/* ══════════════════════════════════════
   OÍDO COCINA · Platos de un evento o plantilla elegidos de las recetas
   Los recuadros de platos (evento: #n-fr #n-ca #n-po #n-pr; plantilla: #plt-fr #plt-ca #plt-po #plt-pr) pasan a
   filas: cada plato con la lista de recetas al escribir y una marca de si está enlazado:
     ✓ Receta (nombre igual que una receta) · ≈ «Parece X» con botón «Usar» (lo que buscarReceta encontraría) ·
     ⚠ Sin receta (no suma coste ni alérgenos).
   El recuadro original sigue existiendo oculto con una línea por plato (como siempre), así que guardarEvento,
   actualizarEvento, guardarPlt y vincularPlatos no cambian. Cuando el programa rellena el recuadro (editar un
   evento, cargar una plantilla, vaciar el formulario), las filas se repintan solas.
   Usa del principal: recetas, buscarReceta, _norm.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nrm = x => typeof _norm === 'function' ? _norm(x) : String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const IDS = ['n-fr', 'n-ca', 'n-po', 'n-pr', 'plt-fr', 'plt-ca', 'plt-po', 'plt-pr'];
const PREF = /^[FCPMfcpm]:/; // «F:Plato» de antes: se respeta al leer
const DESC = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
const recs = () => (typeof recetas !== 'undefined' && Array.isArray(recetas) ? recetas : []).filter(r => !r.base && !r.borrado);

function estado(nombre){
  const n = nrm(String(nombre).replace(PREF, '')); if(!n) return {t: ''};
  if(recs().some(r => nrm(r.nombre) === n)) return {t: 'ok'};
  const p = typeof buscarReceta === 'function' ? buscarReceta(nombre.replace(PREF, '')) : null;
  return p && !p.base ? {t: 'parece', r: p} : {t: 'no'};
}
function chip(e){
  if(e.t === 'ok') return '<span class="pe-est ok" title="Enlazado con su receta: suma coste y alérgenos">✓ Receta</span>';
  if(e.t === 'parece') return `<span class="pe-est parece">≈ ¿«${esc(e.r.nombre)}»? <button type="button" data-pe="usar" data-n="${esc(e.r.nombre)}">Usar</button></span>`;
  if(e.t === 'no') return '<span class="pe-est no" title="No suma coste ni alérgenos">⚠ Sin receta</span>';
  return '';
}
function filaHtml(v){
  return `<div class="pe-fila"><div class="pe-l"><input class="pe-n" type="text" list="pe-recetas" value="${esc(v)}" placeholder="Escribe y elige una receta" aria-label="Plato"><button type="button" class="pe-x" data-pe="quitar" aria-label="Quitar plato" title="Quitar">✕</button></div><div class="pe-e">${chip(estado(v))}</div></div>`;
}
const caja = ta => ta && ta.nextElementSibling && ta.nextElementSibling.classList.contains('pe-caja') ? ta.nextElementSibling : null;
function leer(ta){ return DESC.get.call(ta).split('\n').map(l => l.trim()).filter(Boolean); }
function escribir(ta){ const c = caja(ta); if(!c) return; DESC.set.call(ta, [...c.querySelectorAll('.pe-n')].map(i => i.value.trim()).filter(Boolean).join('\n')); }
function pintar(ta, foco){
  const c = caja(ta); if(!c) return;
  const l = leer(ta); if(!l.length) l.push('');
  c.querySelector('.pe-filas').innerHTML = l.map(filaHtml).join('');
  if(foco){ const i = [...c.querySelectorAll('.pe-n')].pop(); if(i) i.focus(); }
}
function lista(){
  let dl = ge('pe-recetas');
  if(!dl){ dl = document.createElement('datalist'); dl.id = 'pe-recetas'; document.body.appendChild(dl); }
  dl.innerHTML = recs().map(r => r.nombre).sort((a, b) => a.localeCompare(b, 'es')).map(n => `<option value="${esc(n)}">`).join('');
}
function montar(ta){
  if(!ta || caja(ta)) return;
  if(!ge('pe-css')){ const st = document.createElement('style'); st.id = 'pe-css'; st.textContent = CSS; document.head.appendChild(st); }
  ta.style.display = 'none';
  const c = document.createElement('div'); c.className = 'pe-caja';
  c.innerHTML = '<div class="pe-filas"></div><button type="button" class="btn-sec pe-mas" data-pe="mas"><i class="ti ti-plus"></i> Añadir plato</button>';
  ta.after(c);
  // Lo que ponga el programa en el recuadro (editar, plantilla, vaciar) se ve en las filas
  Object.defineProperty(ta, 'value', {configurable: true, get(){ return DESC.get.call(this); }, set(v){ DESC.set.call(this, v); pintar(this); }});
  c.addEventListener('input', e => { escribir(ta); });
  c.addEventListener('change', e => { if(e.target.matches('.pe-n')){ escribir(ta); const f = e.target.closest('.pe-fila'); f.querySelector('.pe-e').innerHTML = chip(estado(e.target.value)); } });
  c.addEventListener('click', e => {
    const b = e.target.closest('[data-pe]'); if(!b) return;
    const a = b.dataset.pe;
    if(a === 'quitar'){ b.closest('.pe-fila').remove(); escribir(ta); if(!c.querySelector('.pe-fila')) pintar(ta); }
    if(a === 'mas'){ const fs = c.querySelector('.pe-filas'); fs.insertAdjacentHTML('beforeend', filaHtml('')); const l = fs.querySelectorAll('.pe-n'); l[l.length - 1].focus(); }
    if(a === 'usar'){ const f = b.closest('.pe-fila'), i = f.querySelector('.pe-n'); i.value = b.dataset.n; escribir(ta); f.querySelector('.pe-e').innerHTML = chip(estado(i.value)); }
  });
  c.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('.pe-n')){ e.preventDefault(); c.querySelector('[data-pe="mas"]').click(); } });
  pintar(ta);
}
function iniciar(){ lista(); IDS.forEach(id => montar(ge(id))); }
// La lista de recetas se refresca al tocar un plato (por si se acaba de crear una receta)
document.addEventListener('focusin', e => { if(e.target.matches && e.target.matches('.pe-n')) lista(); });
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
window.platosRepintar = () => { lista(); IDS.forEach(id => { const t = ge(id); if(t) pintar(t); }); };

const CSS = `.pe-filas{display:flex;flex-direction:column;gap:6px}
.pe-fila{display:flex;flex-direction:column;gap:3px}
.pe-l{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:6px}.pe-l input{min-width:0;width:100%}
.pe-x{background:none;border:.5px solid var(--border);border-radius:var(--radius);min-height:40px;color:var(--text-secondary);cursor:pointer}
.pe-e:empty{display:none}
.pe-est{font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
.pe-est.ok{color:var(--success-text)}.pe-est.no{color:var(--warn-text)}.pe-est.parece{color:var(--info-text)}
.pe-est button{font:inherit;font-size:11px;border:.5px solid currentColor;background:none;color:inherit;border-radius:999px;padding:3px 10px;cursor:pointer;min-height:28px}
.pe-mas{margin-top:6px}`;
})();
