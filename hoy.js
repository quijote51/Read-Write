/* ══════════════════════════════════════
   OÍDO COCINA · Tarjeta «Hoy» (arriba de Inicio)
   Lo que toca ahora en un vistazo, sin abrir varias secciones: los eventos de hoy (con «Producción» y «Hojas»),
   lo que está pendiente (los mismos avisos de la campana: temperaturas, limpieza, muestra testigo, alergias…),
   cuántos eventos hay mañana y el botón de fichar. Solo muestra lo que el rol ve y los módulos contratados.
   No guarda nada: se pinta con los datos que ya hay en el aparato.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const H = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const diaK = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rol = () => (typeof rolActual !== 'undefined' && rolActual) || 'admin';
const veo = tab => { const r = typeof ROLES !== 'undefined' && ROLES[rol()]; return !!r && r.tabs.includes(tab) && (typeof seccionActiva !== 'function' || seccionActiva(tab)); };
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function pintar(){
  const dash = ge('dash-cont'); if(!dash) return;
  let c = ge('hoy-card');
  if(!veo('dashboard')){ if(c) c.remove(); return; }
  if(!c){
    if(!ge('hoy-css')){ const s = document.createElement('style'); s.id = 'hoy-css'; s.textContent = CSS; document.head.appendChild(s); }
    c = document.createElement('section'); c.id = 'hoy-card'; c.className = 'card'; c.setAttribute('aria-label', 'Hoy');
    dash.parentNode.insertBefore(c, ge('pasos-card') || dash);
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-hoy]'); if(!b) return;
      const a = b.dataset.hoy, id = b.dataset.id;
      if(a === 'prod' && typeof showTab === 'function'){ showTab('produccion'); setTimeout(() => { const s = ge('prod-sel'); if(s){ s.value = id; if(typeof renderProd === 'function') renderProd(); } }, 80); }
      if(a === 'hojas' && typeof hojasAbrir === 'function') hojasAbrir(isNaN(+id) ? id : +id);
      if(a === 'ir' && typeof showTab === 'function') showTab(id);
      if(a === 'avisos'){ const k = ge('av-btn'); if(k) k.click(); }
      if(a === 'fichar' && typeof showTab === 'function') showTab('fichaje');
      if(a === 'conj' && typeof showTab === 'function') showTab('conjunta');
    });
  }
  const ahora = new Date(), hoy = diaK(ahora), man = diaK(new Date(ahora.getTime() + 864e5));
  const evs = (typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : []);
  const deHoy = evs.filter(e => e.fecha === hoy).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')));
  const nMan = evs.filter(e => e.fecha === man).length;
  let pend = []; try{ pend = typeof window.avisosLista === 'function' ? window.avisosLista() : []; }catch(e){}
  const fila = e => `<div class="hoy-ev"><div class="hoy-ev-t"><b>${H(e.hora || '')}</b> ${H(e.nombre)}<small>${e.pax} pax${e.lugar ? ' · ' + H(e.lugar) : ''}${e.alergias_txt && typeof algHay === 'function' && algHay(e.alergias_txt) ? ' · ⚠ alergias' : ''}</small></div>
    <div class="hoy-ev-b">${veo('produccion') ? `<button type="button" class="btn-sec" data-hoy="prod" data-id="${H(e.id)}">Producción</button>` : ''}${veo('hojas') ? `<button type="button" class="btn-sec" data-hoy="hojas" data-id="${H(e.id)}">Hojas</button>` : ''}</div></div>`;
  const html = `<div class="hoy-cab"><b>Hoy</b><small>${DIAS[ahora.getDay()]} ${ahora.getDate()} de ${MESES[ahora.getMonth()]}</small></div>
    ${deHoy.length ? `<div class="hoy-sec">Eventos de hoy</div>${deHoy.map(fila).join('')}${deHoy.length > 1 && veo('conjunta') ? '<button type="button" class="hoy-link" data-hoy="conj">Producir juntos →</button>' : ''}` : '<div class="hoy-vacio">Hoy no hay eventos.</div>'}
    ${nMan ? `<div class="hoy-man">Mañana: ${nMan} evento${nMan > 1 ? 's' : ''}</div>` : ''}
    ${pend.length ? `<div class="hoy-sec">Pendiente ahora</div>${pend.slice(0, 4).map(p => `<button type="button" class="hoy-pend" data-hoy="ir" data-id="${H(p.tab)}"><span><b>${H(p.t)}</b>${p.d ? `<small>${H(p.d)}</small>` : ''}</span><i aria-hidden="true">›</i></button>`).join('')}${pend.length > 4 ? `<button type="button" class="hoy-link" data-hoy="avisos">Ver los ${pend.length} avisos →</button>` : ''}` : '<div class="hoy-ok">✓ Nada pendiente por ahora.</div>'}
    ${veo('fichaje') ? '<button type="button" class="btn btn-p hoy-fichar" data-hoy="fichar">Fichar</button>' : ''}`;
  if(c.innerHTML !== html) c.innerHTML = html;
}

function iniciar(){
  pintar();
  if(typeof window.initDashboard === 'function' && !window.initDashboard._hoy){ const o = window.initDashboard; window.initDashboard = function(){ const r = o.apply(this, arguments); pintar(); return r; }; window.initDashboard._hoy = true; }
  if(typeof window.aplicarRol === 'function' && !window.aplicarRol._hoy){ const o = window.aplicarRol; window.aplicarRol = function(){ const r = o.apply(this, arguments); setTimeout(pintar, 60); return r; }; window.aplicarRol._hoy = true; }
  setInterval(() => { if(document.visibilityState === 'visible') pintar(); }, 5000);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

const CSS = `#hoy-card{border:1px solid var(--gold);margin-bottom:10px}
.hoy-cab{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}.hoy-cab b{font-size:16px}.hoy-cab small{font-size:12px;color:var(--text-secondary)}
.hoy-sec{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-secondary);margin:10px 0 4px}
.hoy-ev{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:.5px solid var(--border)}
.hoy-ev-t{font-size:14px;min-width:0;flex:1 1 150px}.hoy-ev-t small{display:block;font-size:12px;color:var(--text-secondary)}
.hoy-ev-b{display:flex;gap:6px}.hoy-ev-b .btn-sec{min-height:40px}
.hoy-pend{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;min-height:44px;text-align:left;background:var(--bg-secondary);border:.5px solid var(--border);border-radius:var(--radius);padding:6px 10px;margin-bottom:4px;font:inherit;color:inherit;cursor:pointer}
.hoy-pend b{font-size:13px;display:block}.hoy-pend small{display:block;font-size:12px;color:var(--text-secondary);overflow-wrap:anywhere}
.hoy-vacio,.hoy-man,.hoy-ok{font-size:13px;color:var(--text-secondary);margin:6px 0}.hoy-ok{color:var(--success-text)}
.hoy-link{background:none;border:0;color:var(--gold,#c9a84c);font:inherit;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;min-height:44px;padding:0 4px}
.hoy-fichar{width:100%;min-height:48px;margin-top:10px;font-size:15px;background:var(--gold,#c9a84c);color:#1a1a1a;font-weight:600}`;
})();
