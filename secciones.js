/* ══════════════════════════════════════
   OÍDO COCINA · Elegir qué secciones ves
   Cada persona puede quitar de su lista las secciones que no usa («solo quiero APPCC y alérgenos»), por rol y en
   ese aparato (localStorage 'oido_secc_ocultas_<rol>'). No toca los módulos contratados ni los permisos: solo
   esconde. Inicio no se puede quitar y siempre queda al menos una sección.
   Botón «Elegir qué secciones ves» al final de la lista y en la ayuda del buscador (seccionesElegir()).
   El buscador no muestra las secciones escondidas (seccionOcultaUsuario).
   Usa del principal: ROLES, rolActual, aplicarRol, seccionActiva, openAccordion, ACC_TABS, GRUPOS_SECC.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rol = () => (typeof rolActual !== 'undefined' && rolActual) || '';
const clave = () => 'oido_secc_ocultas_' + rol();
const ocultas = () => { try{ return new Set(JSON.parse(localStorage.getItem(clave()) || '[]')); }catch(e){ return new Set(); } };
const guardar = s => { try{ localStorage.setItem(clave(), JSON.stringify([...s])); }catch(e){} };
const FIJAS = ['dashboard']; // Inicio siempre
// Secciones que este rol puede ver (permisos y módulos), antes de lo elegido por la persona
const disponibles = () => { const r = typeof ROLES !== 'undefined' && ROLES[rol()]; return r ? r.tabs.filter(t => ge('acc-' + t) && (typeof seccionActiva !== 'function' || seccionActiva(t))) : []; };

window.seccionOcultaUsuario = tab => !FIJAS.includes(tab) && ocultas().has(tab);

function aplicar(){
  const quitar = ocultas(), disp = disponibles();
  if(disp.every(t => quitar.has(t) && !FIJAS.includes(t))) return boton(); // nunca dejar la lista vacía
  disp.forEach(t => {
    if(FIJAS.includes(t) || !quitar.has(t)) return;
    const it = ge('acc-' + t); if(!it) return;
    if(it.classList.contains('open')){ it.classList.remove('open'); }
    it.style.display = 'none';
  });
  if(!document.querySelector('.acc-item.open') && typeof openAccordion === 'function'){
    const primera = disp.find(t => !quitar.has(t) || FIJAS.includes(t)); if(primera) openAccordion(primera);
  }
  boton();
}
function boton(){
  const items = [...document.querySelectorAll('.acc-item[data-tab]')]; if(!items.length) return;
  let b = ge('secc-elegir');
  if(!b){
    b = document.createElement('button'); b.id = 'secc-elegir'; b.type = 'button'; b.className = 'secc-elegir';
    b.onclick = () => window.seccionesElegir();
    items[items.length - 1].parentNode.appendChild(b);
  }
  const n = [...ocultas()].filter(t => disponibles().includes(t)).length;
  b.innerHTML = `<i class="ti ti-adjustments-horizontal" aria-hidden="true"></i> Elegir qué secciones ves${n ? ` <small>(${n} escondida${n === 1 ? '' : 's'})</small>` : ''}`;
  b.style.display = rol() ? '' : 'none';
}

window.seccionesElegir = function(){
  if(!ge('secc-css')){ const s = document.createElement('style'); s.id = 'secc-css'; s.textContent = CSS; document.head.appendChild(s); }
  let m = ge('secc-modal');
  if(!m){
    m = document.createElement('div'); m.id = 'secc-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Elegir secciones');
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      if(e.target === m || e.target.closest('[data-se="cerrar"]')) return cerrar();
      const b = e.target.closest('[data-se]'); if(!b) return;
      if(b.dataset.se === 'todas'){ m.querySelectorAll('input[data-tab]').forEach(i => { i.checked = true; }); }
      if(b.dataset.se === 'guardar'){
        const q = new Set([...m.querySelectorAll('input[data-tab]')].filter(i => !i.checked).map(i => i.dataset.tab));
        const disp = disponibles().filter(t => !FIJAS.includes(t));
        if(disp.length && disp.every(t => q.has(t)) && !disponibles().some(t => FIJAS.includes(t))){ m.querySelector('.se-msg').hidden = false; return; }
        guardar(q); cerrar();
        if(typeof aplicarRol === 'function' && rol()) aplicarRol(rol()); else aplicar();
      }
    });
    m.addEventListener('keydown', e => { if(e.key === 'Escape') cerrar(); });
  }
  const q = ocultas(), disp = disponibles().filter(t => !FIJAS.includes(t));
  const grupos = (typeof GRUPOS_SECC !== 'undefined' ? GRUPOS_SECC : [['Secciones', disp]]).map(([t, tabs]) => [t, tabs.filter(x => disp.includes(x))]).filter(([, tabs]) => tabs.length);
  const sueltas = disp.filter(t => !grupos.some(([, tabs]) => tabs.includes(t)));
  if(sueltas.length) grupos.push(['Otras', sueltas]);
  const nombre = t => (typeof ACC_TABS !== 'undefined' && ACC_TABS[t] ? ACC_TABS[t].label : t);
  m.innerHTML = `<div class="se-caja"><div class="se-cab"><b>Elegir qué secciones ves</b><button class="se-x" data-se="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="se-cuerpo"><p class="se-ayuda">Quita las que no usas y la lista queda más corta. Solo cambia en este móvil y para este rol; no se borra nada y puedes volver a ponerlas cuando quieras.</p>
    ${grupos.map(([t, tabs]) => `<fieldset><legend>${esc(t)}</legend>${tabs.map(x => `<label class="se-op"><input type="checkbox" data-tab="${esc(x)}" ${q.has(x) ? '' : 'checked'}> ${esc(nombre(x))}</label>`).join('')}</fieldset>`).join('')}
    <div class="se-msg hz-aviso warn" hidden>Deja al menos una sección.</div>
    <div class="se-acc"><button class="btn-sec" data-se="todas">Mostrar todas</button><button class="btn btn-p" data-se="guardar">Guardar</button></div></div></div>`;
  m.style.display = 'flex';
  const p = m.querySelector('input'); if(p) p.focus();
};
function cerrar(){ const m = ge('secc-modal'); if(m) m.style.display = 'none'; }

// Después de cada cambio de rol (que vuelve a enseñar las secciones del rol), se esconden las elegidas
function iniciar(){
  if(typeof window.aplicarRol === 'function' && !window.aplicarRol._se){
    const o = window.aplicarRol; window.aplicarRol = function(){ const r = o.apply(this, arguments); aplicar(); return r; }; window.aplicarRol._se = true;
  }
  if(!ge('secc-css')){ const s = document.createElement('style'); s.id = 'secc-css'; s.textContent = CSS; document.head.appendChild(s); }
  setTimeout(aplicar, 300);
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

const CSS = `.secc-elegir{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin:14px 0 4px;min-height:42px;background:none;border:1px dashed var(--border-md);border-radius:var(--radius-lg);color:var(--text-secondary);font:inherit;font-size:13px;cursor:pointer}
.secc-elegir small{font-size:12px}
#secc-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1005;align-items:flex-start;justify-content:center;padding:12px 10px;overflow:auto}
.se-caja{background:var(--bg-primary);color:var(--text-primary);border-radius:var(--radius-lg);width:100%;max-width:460px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.se-cab{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:.5px solid var(--border)}
.se-x{background:none;border:0;font-size:16px;cursor:pointer;color:var(--text-secondary);min-width:40px;min-height:40px}
.se-cuerpo{padding:10px 14px 16px;display:flex;flex-direction:column;gap:10px}
.se-ayuda{font-size:12px;color:var(--text-secondary);margin:0}
.se-cuerpo fieldset{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.se-cuerpo legend{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:4px}
.se-op{display:flex;align-items:center;gap:10px;min-height:40px;font-size:14px;cursor:pointer}.se-op input{width:20px;height:20px}
.se-acc{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}`;
})();
