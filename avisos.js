/* ══════════════════════════════════════
   OÍDO COCINA · Avisos
   - Campana en la cabecera con lo que hay pendiente hoy, según el rol y los módulos:
     temperaturas, limpiezas y muestras testigo sin apuntar (APPCC), eventos de hoy y mañana con alergias,
     artículos bajo el stock mínimo (Albaranes y costes) y cambios de turno pendientes.
   - «Avisos en el móvil»: notificaciones aunque la app esté cerrada (Web Push, gratis). El móvil se apunta con
     avisos_suscribir y Supabase manda los avisos cada hora (supabase/avisos.sql + función avisos-push).
     El service worker (sw.js) pide el texto con aviso_push(endpoint) y lo muestra.
   Usa del principal: appcc, eventos, compras (comprasBajoMinimo), supa, _uid, _perfil, rolActual, ROLES,
   seccionActiva, showTab.
   ══════════════════════════════════════ */
(function(){
const TIPOS = [['temp', 'Temperaturas sin apuntar (11:00 y 19:00)'], ['alergias', 'Eventos de mañana con alergias (10:00)'], ['cambios', 'Cambios de turno (9:00 y 16:00)']];
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const diaK = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const LS = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } };
const conSesion = () => typeof supa !== 'undefined' && supa && typeof _uid !== 'undefined' && _uid;
const rol = () => (typeof rolActual !== 'undefined' && rolActual) || 'admin';
const veo = tab => { const r = typeof ROLES !== 'undefined' && ROLES[rol()]; return !!r && r.tabs.includes(tab) && (typeof seccionActiva !== 'function' || seccionActiva(tab)); };
const sinAlergias = t => !String(t || '').trim() || /^\s*(sin|ninguna|no hay)/i.test(t);

let lista = [], cambios = [], abierto = false, msg = '';

// ── Avisos de hoy (en el aparato) ──
function calcular(){
  const out = [], ahora = new Date(), hoy = diaK(ahora), manana = diaK(new Date(ahora.getTime() + 864e5)), tarde = ahora.getHours() >= 15;
  const evs = typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : [];
  // APPCC
  const ap = typeof appcc !== 'undefined' && appcc && typeof appcc === 'object' ? appcc : null;
  if(ap && veo('appcc')){
    const reg = (ap.reg || []).filter(r => !r.anulado), delDia = r => diaK(new Date(r.f)) === hoy;
    const sinTemp = (ap.equipos || []).filter(e => !reg.some(r => r.t === 'temp' && r.eq === e.id && delDia(r) && (new Date(r.f).getHours() >= 15) === tarde));
    if(sinTemp.length) out.push({tab: 'appcc', ic: 'ti-temperature', t: `Temperaturas de la ${tarde ? 'tarde' : 'mañana'} sin apuntar`, d: sinTemp.map(e => e.n).join(', ')});
    const sinLimp = (ap.zonas || []).filter(z => z.frec === 'diaria' && !reg.some(r => r.t === 'limp' && r.zona === z.id && delDia(r)));
    if(sinLimp.length) out.push({tab: 'appcc', ic: 'ti-spray', t: 'Limpiezas de hoy sin apuntar', d: sinLimp.map(z => z.n).join(', ')});
    const sinTest = evs.filter(e => e.fecha === hoy && !reg.some(r => r.t === 'testigo' && String(r.ev) === String(e.id)));
    if(sinTest.length) out.push({tab: 'appcc', ic: 'ti-flask', t: 'Muestra testigo sin guardar', d: sinTest.map(e => e.nombre).join(', ')});
  }
  // Eventos con alergias
  if(veo('eventos') || veo('produccion') || veo('dashboard')){
    [[hoy, 'Hoy'], [manana, 'Mañana']].forEach(([f, cuando]) => {
      const l = evs.filter(e => e.fecha === f && !sinAlergias(e.alergias_txt));
      if(l.length) out.push({tab: veo('eventos') ? 'eventos' : veo('produccion') ? 'produccion' : 'dashboard', ic: 'ti-alert-triangle', t: `${cuando} hay alergias`, d: l.map(e => `${e.nombre}: ${e.alergias_txt}`).join(' · ')});
    });
  }
  // Stock mínimo
  if(veo('costes') && typeof comprasBajoMinimo === 'function'){
    let b = []; try{ b = comprasBajoMinimo(); }catch(e){}
    if(b.length) out.push({tab: 'costes', ic: 'ti-package', t: `${b.length} artículo${b.length === 1 ? '' : 's'} bajo el mínimo`, d: b.slice(0, 8).join(', ') + (b.length > 8 ? '…' : '')});
  }
  // Cambios de turno (los lee refrescar() de la nube)
  const yo = typeof _perfil !== 'undefined' && _perfil && _perfil.nombre;
  const paraMi = cambios.filter(c => c.estado === 'pendiente' && yo && c.a === yo);
  if(paraMi.length) out.push({tab: 'horarios', ic: 'ti-arrows-exchange', t: 'Te piden un cambio de turno', d: paraMi.map(c => c.de).join(', ')});
  const aprobar = cambios.filter(c => c.estado === 'aceptado');
  if(aprobar.length && ['admin', 'chef', 'direccion'].includes(rol())) out.push({tab: 'horarios', ic: 'ti-arrows-exchange', t: `${aprobar.length} cambio${aprobar.length === 1 ? '' : 's'} de turno espera${aprobar.length === 1 ? "" : "n"} tu aprobación`, d: aprobar.map(c => `${c.de} ↔ ${c.a}`).join(', ')});
  return out;
}

async function leerCambios(){
  cambios = [];
  if(!conSesion() || navigator.onLine === false || (typeof moduloActivo === 'function' && !moduloActivo('equipo'))) return;
  try{ const {data} = await supa.from('cambios').select('*').in('estado', ['pendiente', 'aceptado']); cambios = data || []; }catch(e){}
}

// ── Campana y panel ──
function campana(){
  let b = ge('av-btn');
  if(!b){
    const rolBtn = ge('rol-btn'); if(!rolBtn) return;
    b = document.createElement('button'); b.id = 'av-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Avisos'); b.setAttribute('aria-haspopup', 'dialog');
    // Campana dibujada aquí (no depende de la fuente de iconos: se ve aunque no cargue)
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/></svg><span id="av-n"></span>';
    b.onclick = () => abrir(true);
    rolBtn.parentNode.insertBefore(b, rolBtn);
  }
  const n = ge('av-n'); n.textContent = lista.length ? String(lista.length) : ''; n.style.display = lista.length ? '' : 'none';
  b.setAttribute('aria-label', lista.length ? `Avisos: ${lista.length}` : 'Avisos');
}

const pushPosible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function miSuscripcion(){ try{ const r = await navigator.serviceWorker.getRegistration(); return r ? await r.pushManager.getSubscription() : null; }catch(e){ return null; } }

async function htmlPush(){
  if(!pushPosible()) return `<p class="av-ayuda">${esIOS() && !instalada() ? 'En iPhone, primero añade la app a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y ábrela desde allí.' : 'Este navegador no puede recibir avisos. Prueba con Chrome.'}</p>`;
  if(!conSesion()) return '<p class="av-ayuda">Entra con tu cuenta para recibir avisos en el móvil.</p>';
  if(Notification.permission === 'denied') return '<p class="av-ayuda">Los avisos están bloqueados para esta app. Actívalos en los ajustes del navegador (candado junto a la dirección → Notificaciones).</p>';
  const sub = await miSuscripcion(), tipos = LS('oido_avisos_tipos') || TIPOS.map(t => t[0]);
  return `<p class="av-ayuda">${sub ? 'Activados en este móvil. Llegan aunque la app esté cerrada.' : 'Recibe estos avisos aunque la app esté cerrada.'}</p>
    ${TIPOS.map(([k, n]) => `<label class="av-chk"><input type="checkbox" data-avt="${k}"${tipos.includes(k) ? ' checked' : ''}> ${n}</label>`).join('')}
    <div class="av-acc">${sub ? '<button class="btn btn-p" data-av="guardar">Guardar</button><button class="btn-sec" data-av="baja">Desactivar</button>' : '<button class="btn btn-p" data-av="alta"><i class="ti ti-bell-ringing"></i> Activar avisos en este móvil</button>'}</div>`;
}

async function pintar(){
  const m = ge('av-modal'); if(!m || !abierto) return;
  const aviso = msg ? `<div class="hz-aviso ${msg.startsWith('!') ? 'warn' : 'ok'}">${esc(msg.replace(/^!/, ''))}</div>` : ''; msg = '';
  m.querySelector('.av-cuerpo').innerHTML = `${aviso}
    ${lista.length ? lista.map((a, i) => `<button class="av-item" data-ir="${i}"><i class="ti ${a.ic}"></i><span><b>${esc(a.t)}</b><small>${esc(a.d)}</small></span><i class="ti ti-chevron-right"></i></button>`).join('') : '<p class="av-vacio"><i class="ti ti-circle-check"></i> Todo al día.</p>'}
    <div class="av-push"><b>Avisos en el móvil</b>${await htmlPush()}</div>`;
}

function abrir(si){
  abierto = si;
  let m = ge('av-modal');
  if(!m){
    m = document.createElement('div'); m.id = 'av-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Avisos');
    m.innerHTML = '<div class="av-caja"><div class="av-cab"><b><i class="ti ti-bell"></i> Avisos</b><button class="av-x" data-av="cerrar" aria-label="Cerrar">✕</button></div><div class="av-cuerpo"></div></div>';
    m.addEventListener('click', e => {
      if(e.target === m) return abrir(false);
      const ir = e.target.closest('[data-ir]'); if(ir){ const a = lista[+ir.dataset.ir]; abrir(false); if(a && typeof showTab === 'function') showTab(a.tab); return; }
      const b = e.target.closest('[data-av]'); if(b) accion(b.dataset.av);
    });
    document.body.appendChild(m);
  }
  m.style.display = si ? 'flex' : 'none';
  if(si){ lista = calcular(); campana(); pintar(); }
}

const tiposMarcados = () => [...document.querySelectorAll('#av-modal [data-avt]')].filter(x => x.checked).map(x => x.dataset.avt);
// Clave pública de los avisos: la guarda Supabase; la primera vez la crea la función avisos-push
async function clavePublica(){
  const {data, error} = await supa.rpc('avisos_clave_publica');
  if(error) throw error;
  if(data) return data;
  const r = await supa.functions.invoke('avisos-push', {body: {clave: true}});
  if(r.error || !r.data || !r.data.publica) throw new Error('No se ha podido preparar los avisos. Inténtalo de nuevo.');
  return r.data.publica;
}
const claveBin = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function accion(a){
  if(a === 'cerrar') return abrir(false);
  try{
    if(a === 'alta' || a === 'guardar'){
      const tipos = tiposMarcados(); LS('oido_avisos_tipos', tipos);
      let sub = await miSuscripcion();
      if(!sub){
        if(await Notification.requestPermission() !== 'granted'){ msg = '!Sin permiso no se pueden mandar avisos.'; return pintar(); }
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: claveBin(await clavePublica())});
      }
      const {error} = await supa.rpc('avisos_suscribir', {p_sub: sub.toJSON(), p_tipos: tipos});
      if(error) throw error;
      msg = a === 'alta' ? 'Avisos activados en este móvil.' : 'Guardado.';
    }
    if(a === 'baja'){
      const sub = await miSuscripcion();
      if(sub){ try{ await supa.rpc('avisos_baja', {p_endpoint: sub.endpoint}); }catch(e){} await sub.unsubscribe(); }
      msg = 'Avisos desactivados en este móvil.';
    }
  }catch(e){ msg = '!No se ha podido: ' + (/avisos_|schema cache|does not exist/i.test(e.message || '') ? 'falta activar los avisos en Supabase.' : (e.message || 'revisa la conexión')); }
  pintar();
}

// Se llama al cargar la nube y al cambiar de rol
window.avisosRefrescar = async function(){
  if(!ge('av-css')){ const st = document.createElement('style'); st.id = 'av-css'; st.textContent = CSS; document.head.appendChild(st); }
  await leerCambios();
  lista = calcular(); campana(); if(abierto) pintar();
  if(location.hash === '#avisos'){ history.replaceState(null, '', location.pathname + location.search); abrir(true); }
};
window.addEventListener('hashchange', () => { if(location.hash === '#avisos'){ history.replaceState(null, '', location.pathname + location.search); abrir(true); } });
setInterval(() => { if(document.visibilityState === 'visible') window.avisosRecalcular(); }, 5 * 60e3);
window.avisosRecalcular = () => { lista = calcular(); campana(); if(abierto) pintar(); };

const CSS = `#av-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:5px 10px;color:#c9a84c;cursor:pointer;font-size:14px;min-height:34px;min-width:34px}
#av-n{position:absolute;top:-6px;right:-6px;background:#c9a84c;color:#111;border-radius:999px;font-size:10px;font-weight:700;min-width:17px;height:17px;line-height:17px;padding:0 4px;text-align:center}
#av-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1002;align-items:flex-start;justify-content:center;padding:60px 12px 12px}
.av-caja{background:var(--bg-primary);color:var(--text-primary);border-radius:var(--radius-lg);width:100%;max-width:460px;max-height:calc(100vh - 80px);overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3)}
.av-cab{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:.5px solid var(--border);position:sticky;top:0;background:var(--bg-primary)}
.av-x{background:none;border:0;font-size:16px;cursor:pointer;color:var(--text-secondary);min-width:34px;min-height:34px}
.av-cuerpo{padding:10px 12px}
.av-item{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:var(--bg-secondary);border:.5px solid var(--border);border-radius:var(--radius);padding:9px 10px;margin-bottom:6px;cursor:pointer;color:var(--text-primary);font:inherit}
.av-item>.ti:first-child{font-size:18px;color:var(--warn-text)}.av-item span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.av-item small{font-size:12px;color:var(--text-secondary);overflow-wrap:anywhere}
.av-vacio{text-align:center;color:var(--text-secondary);margin:14px 0}
.av-push{border-top:.5px solid var(--border);margin-top:10px;padding-top:10px}.av-ayuda{font-size:12px;color:var(--text-secondary);margin:4px 0 8px}
.av-chk{display:flex;gap:8px;align-items:center;font-size:13px;margin:5px 0}.av-chk input{width:auto}
.av-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}`;
})();
