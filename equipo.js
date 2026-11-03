/* EQUIPO: una cuenta por persona (fase 2).
   - perfilCargar(): pregunta a la nube de qué hotel es esta cuenta y con qué rol (función mi_perfil de
     supabase/fase2-cuentas.sql). Se guarda en el aparato ('seda_perfil') para abrir sin conexión.
     Si la nube aún no tiene la fase 2, se sigue como antes: la cuenta es el hotel y el rol es admin.
   - _uid pasa a ser SIEMPRE el hotel (para un miembro, la cuenta del dueño): así todo lo que se guarda va al hotel.
     _yo es la cuenta de la persona.
   - puedeTabla / puedeConfig: copia en la app de los permisos de la base de datos (para no intentar guardar lo
     que el rol no puede cambiar). La base de datos los aplica de verdad.
   - Alta con código de invitación y apartado «Equipo» en Ajustes (invitar, ver y quitar personas). */

let _yo = null, _perfil = null;
const ROLES_EQUIPO = {admin: 'Administración', direccion: 'Dirección', chef: 'Chef', eventos: 'Jefa de eventos', sala: 'Sala / Maître', cocina: 'Cocina'};
const _eqE = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const _eqLS = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } };

// ── Perfil ──
async function perfilCargar(){
  if(typeof _uid === 'undefined' || !_uid) return null;
  if(!_yo) _yo = _uid;
  if(typeof supa !== 'undefined' && supa && navigator.onLine !== false){
    try{
      const {data, error} = await supa.rpc('mi_perfil');
      if(error) throw error;
      _perfil = data && data.hotel ? data : null;
      if(_perfil) _eqLS('seda_perfil', {..._perfil, yo: _yo});
    }catch(e){
      // Sin la fase 2 en la nube (o error): como antes, la cuenta es el hotel y el rol, admin
      const g = _eqLS('seda_perfil');
      _perfil = g && g.yo === _yo ? g : {hotel: _yo, rol: 'admin', antiguo: true};
    }
  }else{
    const g = _eqLS('seda_perfil');
    _perfil = g && g.yo === _yo ? g : {hotel: _yo, rol: 'admin', antiguo: true};
  }
  if(_perfil && _perfil.hotel && _perfil.rol) _uid = _perfil.hotel;
  return _perfil;
}
const miRol = () => (_perfil && _perfil.rol) || 'admin';
// Módulos de pago del hotel (fase 3): base, costes, seguridad, equipo. Sin dato (nube antigua): todos.
const MODULOS = {base: 'Base', costes: 'Costes', seguridad: 'Seguridad alimentaria', equipo: 'Equipo'};
function moduloActivo(m){ return m === 'base' || !_perfil || !Array.isArray(_perfil.modulos) || _perfil.modulos.includes(m); }
// Secciones de la app principal de cada módulo (lo que no está aquí es de la base)
const MODULO_DE = {escandallo: 'costes', inventario: 'costes', costes: 'costes', appcc: 'seguridad', horarios: 'equipo'};
const seccionActiva = tab => moduloActivo(MODULO_DE[tab] || 'base');
const rolEn = roles => roles.includes(miRol());

// ── Permisos (los mismos que la base de datos) ──
const PERM_TABLA = {recetas: ['admin', 'chef'], eventos: ['admin', 'direccion', 'chef', 'eventos', 'sala'],
  plantillas: ['admin', 'direccion', 'eventos'], vajilla: ['admin', 'direccion', 'sala', 'eventos'],
  proveedores: ['admin', 'direccion', 'chef'], personal: ['admin', 'direccion']};
function puedeTabla(t){ return !PERM_TABLA[t] || rolEn(PERM_TABLA[t]); }
function puedeConfig(k){
  if((k === 'seda_precios' || k === 'seda_inventario' || k === 'seda_compras') && !moduloActivo('costes')) return false;
  if((k === 'seda_appcc' || k === 'seda_alg_rev') && !moduloActivo('seguridad')) return false;
  if(k === 'seda_horarios' && !moduloActivo('equipo')) return false;
  if(k === 'seda_precios' || k === 'seda_inventario' || k === 'seda_compras' || k === 'seda_horarios') return rolEn(['admin', 'direccion', 'chef']);
  if(k === 'seda_appcc') return rolEn(['admin', 'direccion', 'chef', 'cocina']);
  if(k === 'seda_alg_rev') return rolEn(['admin', 'direccion', 'chef', 'eventos']);
  if(k === 'seda_pin' || k === 'seda_rec') return rolEn(['admin']);
  return rolEn(['admin', 'direccion']);
}

// Nombre y ciudad del hotel en la lista de clientes (solo admin; si la nube no tiene la fase 3, no pasa nada)
async function guardarHotelNube(nombre, ciudad){
  if(!_perfil || _perfil.antiguo || miRol() !== 'admin' || typeof supa === 'undefined' || !supa) return;
  try{ await supa.rpc('guardar_hotel', {p_nombre: nombre || '', p_ciudad: ciudad || ''}); _perfil.hotel_nombre = nombre || _perfil.hotel_nombre; _perfil.hotel_ciudad = ciudad; }catch(e){}
}

// ── Unirse a un hotel con un código ──
function _codigoPendiente(v){ return _eqLS('oido_codigo', v); }
async function unirseConCodigo(codigo, nombre){
  const {data, error} = await supa.rpc('unirse', {p_codigo: String(codigo || '').trim().toUpperCase(), p_nombre: String(nombre || '').trim()});
  if(error) throw error;
  try{ localStorage.removeItem('oido_codigo'); }catch(e){}
  return data;
}
// Pantalla para una cuenta que aún no está en ningún hotel. Devuelve una promesa que no se resuelve: al unirse, recarga.
function pantallaSinHotel(){
  const pend = _codigoPendiente();
  const d = document.createElement('div');
  d.id = 'eq-unirse';
  d.style.cssText = 'position:fixed;inset:0;z-index:1010;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:16px';
  d.innerHTML = `<form style="background:#1a1a1a;color:#f0efe9;border:1px solid #c9a84c;border-radius:14px;padding:20px;max-width:380px;width:100%;font:14px/1.4 system-ui,sans-serif">
    <div style="font-size:18px;font-weight:600;margin-bottom:6px">Únete a tu equipo</div>
    <p style="margin:0 0 12px;color:rgba(255,255,255,.7)">Tu cuenta aún no está en ningún hotel o restaurante. Escribe el código que te han dado (de tu equipo o de cliente nuevo).</p>
    <label style="display:block;font-size:12px;color:rgba(255,255,255,.6)">Código</label>
    <input id="eq-cod" required autocomplete="off" autocapitalize="characters" value="${_eqE(pend && pend.codigo || '')}" style="width:100%;min-height:44px;font-size:18px;letter-spacing:.15em;text-transform:uppercase;margin:4px 0 10px">
    <label style="display:block;font-size:12px;color:rgba(255,255,255,.6)">Tu nombre</label>
    <input id="eq-nom" autocomplete="name" value="${_eqE(pend && pend.nombre || '')}" style="width:100%;min-height:44px;font-size:15px;margin:4px 0 10px">
    <div id="eq-err" role="alert" style="display:none;margin-bottom:10px;padding:8px 10px;border-radius:8px;background:#5a1d1d;color:#ffd6d6"></div>
    <button type="submit" style="width:100%;min-height:44px;border:0;border-radius:8px;background:#c9a84c;color:#1a1a1a;font-weight:600;font-size:15px">Entrar en el equipo</button>
    <button type="button" id="eq-salir" style="width:100%;min-height:40px;margin-top:8px;border:1px solid rgba(255,255,255,.25);border-radius:8px;background:transparent;color:rgba(255,255,255,.75)">Salir de esta cuenta</button>
  </form>`;
  document.body.appendChild(d);
  d.querySelector('#eq-salir').onclick = async () => { try{ await supa.auth.signOut(); }catch(e){} try{ Object.keys(localStorage).filter(k => /^(seda_|oido_|hz_|iv_|ap_)/.test(k)).forEach(k => localStorage.removeItem(k)); }catch(e){} location.reload(); };
  d.querySelector('form').onsubmit = async ev => {
    ev.preventDefault();
    const err = d.querySelector('#eq-err'); err.style.display = 'none';
    try{ await unirseConCodigo(d.querySelector('#eq-cod').value, d.querySelector('#eq-nom').value); location.reload(); }
    catch(e){ err.textContent = /caducado|válido/i.test(e.message) ? 'Ese código no vale o ha caducado. Pide uno nuevo.' : (e.message || 'No se ha podido. Revisa la conexión.'); err.style.display = 'block'; }
  };
  return new Promise(() => {});
}
// Al entrar: perfil y, si la cuenta no tiene hotel, código pendiente o pantalla para meterlo
async function perfilAlEntrar(){
  const p = await perfilCargar();
  if(p && !p.rol){
    const pend = _codigoPendiente();
    if(pend && pend.codigo){ try{ await unirseConCodigo(pend.codigo, pend.nombre); location.reload(); return new Promise(() => {}); }catch(e){} }
    return pantallaSinHotel();
  }
  return p;
}

// ── Crear cuenta con código (pantalla de inicio de sesión de la app principal) ──
async function registrarConCodigo(ev){
  ev.preventDefault();
  const v = id => (document.getElementById(id) || {}).value || '';
  const email = v('login-email').trim(), pass = v('login-pass'), codigo = v('reg-codigo').trim().toUpperCase(), nombre = v('reg-nombre').trim();
  const err = document.getElementById('login-error'), btn = document.getElementById('reg-btn');
  const mal = t => { err.textContent = t; err.style.display = 'block'; };
  err.style.display = 'none';
  if(!email || !codigo || !nombre) return mal('Rellena correo, contraseña, código y tu nombre.'), false;
  if(pass.length < 10) return mal('La contraseña debe tener al menos 10 caracteres.'), false;
  btn.disabled = true; btn.textContent = 'Creando cuenta…';
  try{
    _codigoPendiente({codigo, nombre});
    const {data, error} = await supa.auth.signUp({email, password: pass});
    if(error) throw error;
    if(data && data.session){ await unirseConCodigo(codigo, nombre); location.reload(); return false; }
    mal('Te hemos enviado un correo para confirmar la cuenta. Ábrelo y después entra aquí con tu correo y contraseña: el código se usará solo.');
    err.style.background = 'rgba(201,168,76,.15)'; err.style.color = '#e2c773';
  }catch(e){ mal(/registered|already/i.test(e.message) ? 'Ese correo ya tiene cuenta: entra con «Entrar» y te pediremos el código.' : (e.message || 'No se ha podido crear la cuenta.')); }
  btn.disabled = false; btn.textContent = 'Crear cuenta y entrar';
  return false;
}
function verRegistro(si){
  const r = document.getElementById('reg-campos'); if(!r) return;
  r.style.display = si ? '' : 'none';
  document.getElementById('login-btn').style.display = si ? 'none' : '';
  document.getElementById('reg-ver').style.display = si ? 'none' : '';
  const p = document.getElementById('login-pass'); if(p) p.autocomplete = si ? 'new-password' : 'current-password';
}

// ── Apartado «Equipo» en Ajustes ──
const _eqCodigo = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(8)); r.forEach(x => { s += a[x % a.length]; }); return s.slice(0, 4) + '-' + s.slice(4); };
async function equipoPintar(){
  const c = document.getElementById('equipo-card'); if(!c) return;
  if(!_uid || !_perfil || _perfil.antiguo || !rolEn(['admin', 'direccion'])){ c.style.display = 'none'; return; }
  c.style.display = '';
  c.innerHTML = `<div class="form-sec" style="margin-top:0"><i class="ti ti-users-group"></i> Equipo</div><p style="font-size:13px;color:var(--text-secondary)">Cargando…</p>`;
  let gente = [], invs = [];
  try{
    const [g, i] = await Promise.all([supa.rpc('mi_equipo'), supa.from('invitaciones').select('*').is('usado_por', null).order('creado', {ascending: false})]);
    if(g.error) throw g.error; gente = g.data || []; invs = (i.data || []).filter(x => new Date(x.caduca) > new Date());
  }catch(e){ c.innerHTML = `<div class="form-sec" style="margin-top:0"><i class="ti ti-users-group"></i> Equipo</div><p style="font-size:13px;color:var(--danger-text)">No se ha podido cargar el equipo. Revisa la conexión.</p>`; return; }
  const opRol = Object.entries(ROLES_EQUIPO).filter(([k]) => k !== 'admin' || miRol() === 'admin').map(([k, n]) => `<option value="${k}"${k === 'chef' ? ' selected' : ''}>${n}</option>`).join('');
  c.innerHTML = `<div class="form-sec" style="margin-top:0"><i class="ti ti-users-group"></i> Equipo</div>
    <p style="font-size:13px;color:var(--text-secondary);margin:0 0 10px">Cada persona entra con su propia cuenta y ve solo lo de su rol. Para añadir a alguien, crea un código y envíaselo.</p>
    ${gente.length ? gente.map(p => `<div class="eq-fila"><div><b>${_eqE(p.nombre || p.email)}</b><small>${_eqE(ROLES_EQUIPO[p.rol] || p.rol)} · ${_eqE(p.email)}</small></div>${miRol() === 'admin' && p.user_id !== _yo ? `<button class="btn-sec eq-sm" data-eq-quitar="${_eqE(p.user_id)}" data-eq-nom="${_eqE(p.nombre || p.email)}">Quitar</button>` : ''}</div>`).join('') : '<p style="font-size:13px;color:var(--text-secondary)">Todavía no hay nadie más.</p>'}
    ${invs.length ? `<div style="font-size:12px;font-weight:600;margin:12px 0 4px">Códigos sin usar</div>` + invs.map(x => `<div class="eq-fila"><div><b style="letter-spacing:.1em;white-space:nowrap">${_eqE(x.codigo)}</b><small>${_eqE(ROLES_EQUIPO[x.rol] || x.rol)}${x.nombre ? ' · ' + _eqE(x.nombre) : ''} · caduca el ${new Date(x.caduca).toLocaleDateString('es-ES')}</small></div><button class="btn-sec eq-sm" data-eq-copiar="${_eqE(x.codigo)}" data-eq-rol="${_eqE(x.rol)}">Copiar mensaje</button><button class="btn-sec eq-sm" data-eq-borrar="${_eqE(x.codigo)}" aria-label="Borrar código">✕</button></div>`).join('') : ''}
    <div class="eq-nuevo"><label>Rol<select id="eq-rol">${opRol}</select></label><label>Nombre (opcional)<input id="eq-nombre" placeholder="Como aparece en los horarios"></label><button class="btn btn-p" data-eq-crear="1"><i class="ti ti-plus"></i> Crear código</button></div>
    <div id="eq-msg" style="font-size:13px;margin-top:8px"></div>`;
}
function _eqMensaje(codigo, rol){
  const hotel = (_perfil && _perfil.hotel_nombre) || 'nuestro hotel';
  return `Te invito a Oído Cocina (${hotel}) como ${ROLES_EQUIPO[rol] || rol}.\n1) Abre https://oidococina-xu7i.vercel.app\n2) Pulsa «Tengo un código de invitación»\n3) Escribe tu correo, una contraseña (mínimo 10 caracteres), tu nombre y este código: ${codigo}\nEl código caduca en 7 días y solo sirve una vez.`;
}
function _eqCopiar(t, ok){
  const resp = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); ok(); }catch(e){} ta.remove(); };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, resp); else resp();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-eq-crear],[data-eq-copiar],[data-eq-borrar],[data-eq-quitar]'); if(!b) return;
  const msg = t => { const m = document.getElementById('eq-msg'); if(m) m.textContent = t; };
  try{
    if(b.dataset.eqCrear){
      const rol = document.getElementById('eq-rol').value, nombre = document.getElementById('eq-nombre').value.trim(), codigo = _eqCodigo();
      const {error} = await supa.from('invitaciones').insert({codigo, rol, nombre: nombre || null, hotel_id: _uid});
      if(error) throw error;
      await equipoPintar();
      _eqCopiar(_eqMensaje(codigo, rol), () => msg(`Código ${codigo} creado y mensaje copiado: pégalo en WhatsApp.`));
      msg(`Código ${codigo} creado. Pulsa «Copiar mensaje» para enviarlo.`);
    }else if(b.dataset.eqCopiar){
      _eqCopiar(_eqMensaje(b.dataset.eqCopiar, b.dataset.eqRol), () => msg('Mensaje copiado: pégalo en WhatsApp.'));
    }else if(b.dataset.eqBorrar){
      const {error} = await supa.from('invitaciones').delete().eq('codigo', b.dataset.eqBorrar); if(error) throw error; await equipoPintar();
    }else if(b.dataset.eqQuitar){
      if(!confirm(`¿Quitar a ${b.dataset.eqNom} del equipo? Dejará de ver los datos del hotel al momento.`)) return;
      const {error} = await supa.from('miembros').delete().eq('user_id', b.dataset.eqQuitar); if(error) throw error; await equipoPintar();
    }
  }catch(err){ msg('No se ha podido: ' + (err.message || 'revisa la conexión')); }
});
(function(){
  if(typeof document === 'undefined' || document.getElementById('eq-css')) return;
  const st = document.createElement('style'); st.id = 'eq-css';
  st.textContent = `.eq-fila{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:.5px solid var(--border,#ddd)}
  .eq-fila>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.eq-fila small{font-size:12px;color:var(--text-secondary,#777);overflow-wrap:anywhere}
  .eq-sm{padding:4px 9px;font-size:12px;min-height:34px}
  .eq-nuevo{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-top:12px;padding-top:10px;border-top:.5px solid var(--border,#ddd)}
  .eq-nuevo label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary,#777);flex:1;min-width:140px}`;
  (document.head || document.documentElement).appendChild(st);
})();

// ── Panel de la plataforma: clientes, códigos de cliente y módulos (solo la cuenta plataforma) ──
async function clientesPintar(){
  const c = document.getElementById('clientes-card'); if(!c) return;
  if(!_perfil || !_perfil.plataforma){ c.style.display = 'none'; return; }
  c.style.display = '';
  let lista = [], codigos = [];
  try{
    const [l, k] = await Promise.all([supa.rpc('clientes'), supa.from('codigos_cliente').select('*').is('usado_por', null).order('creado', {ascending: false})]);
    if(l.error) throw l.error; lista = l.data || []; codigos = (k.data || []).filter(x => new Date(x.caduca) > new Date());
  }catch(e){ c.innerHTML = `<div class="form-sec" style="margin-top:0"><i class="ti ti-building-store"></i> Clientes</div><p style="font-size:13px;color:var(--danger-text)">No se ha podido cargar la lista de clientes.</p>`; return; }
  const chk = (pref, act) => Object.entries(MODULOS).filter(([k]) => k !== 'base').map(([k, n]) => `<label class="cl-mod"><input type="checkbox" data-cl-mod="${pref}" value="${k}"${act.includes(k) ? ' checked' : ''}${pref === _yo ? ' disabled title="Tu propio hotel: siempre con todo"' : ''}> ${n}</label>`).join('');
  c.innerHTML = `<div class="form-sec" style="margin-top:0"><i class="ti ti-building-store"></i> Clientes</div>
    <p style="font-size:13px;color:var(--text-secondary);margin:0 0 10px">Solo lo ves tú. Crea un código para cada cliente nuevo y elige sus módulos. La base (eventos, producción, recetario) va siempre.</p>
    ${lista.map(h => `<div class="eq-fila" style="flex-wrap:wrap"><div><b>${_eqE(h.nombre || '(sin nombre)')}</b><small>${_eqE([h.ciudad, h.email, (h.personas || 0) + ' persona' + (h.personas == 1 ? '' : 's')].filter(Boolean).join(' · '))}</small></div>
      <div class="cl-mods" data-cl-owner="${_eqE(h.owner)}">${chk(h.owner, h.modulos || [])}</div></div>`).join('')}
    ${codigos.length ? `<div style="font-size:12px;font-weight:600;margin:12px 0 4px">Códigos de cliente sin usar</div>` + codigos.map(x => `<div class="eq-fila"><div><b style="letter-spacing:.1em;white-space:nowrap">${_eqE(x.codigo)}</b><small>${_eqE(x.nombre)}${x.ciudad ? ' · ' + _eqE(x.ciudad) : ''} · ${(x.modulos || []).filter(m => m !== 'base').map(m => MODULOS[m]).join(', ') || 'solo base'}</small></div><button class="btn-sec eq-sm" data-cl-copiar="${_eqE(x.codigo)}" data-cl-nom="${_eqE(x.nombre)}">Copiar mensaje</button><button class="btn-sec eq-sm" data-cl-borrar="${_eqE(x.codigo)}" aria-label="Borrar código">✕</button></div>`).join('') : ''}
    <div class="eq-nuevo"><label>Nombre del cliente<input id="cl-nombre" placeholder="Restaurante…"></label><label>Ciudad<input id="cl-ciudad"></label>
      <div class="cl-mods" style="flex-basis:100%">${chk('nuevo', ['costes', 'seguridad', 'equipo'])}</div>
      <button class="btn btn-p" data-cl-crear="1"><i class="ti ti-plus"></i> Crear código de cliente</button></div>
    <div id="cl-msg" style="font-size:13px;margin-top:8px"></div>`;
}
function _clMensaje(codigo, nombre){
  return `Bienvenido a Oído Cocina, ${nombre}.\n1) Abre https://oidococina-xu7i.vercel.app\n2) Pulsa «Tengo un código de invitación»\n3) Escribe tu correo, una contraseña (mínimo 10 caracteres), tu nombre y este código: ${codigo}\nCon esa cuenta serás el administrador de ${nombre} y podrás invitar a tu equipo. El código caduca en 30 días.`;
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-cl-crear],[data-cl-copiar],[data-cl-borrar]'); if(!b) return;
  const msg = t => { const m = document.getElementById('cl-msg'); if(m) m.textContent = t; };
  try{
    if(b.dataset.clCrear){
      const nombre = document.getElementById('cl-nombre').value.trim(), ciudad = document.getElementById('cl-ciudad').value.trim();
      if(!nombre) return msg('Escribe el nombre del cliente.');
      const modulos = ['base', ...[...document.querySelectorAll('[data-cl-mod="nuevo"]:checked')].map(x => x.value)];
      const codigo = 'C' + _eqCodigo().slice(1);
      const {error} = await supa.from('codigos_cliente').insert({codigo, nombre, ciudad: ciudad || null, modulos});
      if(error) throw error;
      await clientesPintar();
      _eqCopiar(_clMensaje(codigo, nombre), () => msg(`Código ${codigo} creado y mensaje copiado.`));
      msg(`Código ${codigo} creado. Pulsa «Copiar mensaje» para enviarlo.`);
    }else if(b.dataset.clCopiar){
      _eqCopiar(_clMensaje(b.dataset.clCopiar, b.dataset.clNom), () => msg('Mensaje copiado.'));
    }else if(b.dataset.clBorrar){
      const {error} = await supa.from('codigos_cliente').delete().eq('codigo', b.dataset.clBorrar); if(error) throw error; await clientesPintar();
    }
  }catch(err){ msg('No se ha podido: ' + (err.message || 'revisa la conexión')); }
});
document.addEventListener('change', async e => {
  const x = e.target.closest('.cl-mods[data-cl-owner] input'); if(!x) return;
  const caja = x.closest('.cl-mods'), owner = caja.dataset.clOwner;
  const modulos = [...caja.querySelectorAll('input:checked')].map(i => i.value);
  try{ const {error} = await supa.rpc('cambiar_modulos', {p_owner: owner, p_modulos: modulos}); if(error) throw error;
    if(owner === _yo && _perfil){ _perfil.modulos = ['base', ...modulos]; }
  }catch(err){ x.checked = !x.checked; alert('No se ha podido cambiar el módulo: ' + (err.message || 'revisa la conexión')); }
});
(function(){
  if(typeof document === 'undefined' || document.getElementById('cl-css')) return;
  const st = document.createElement('style'); st.id = 'cl-css';
  st.textContent = `.cl-mods{display:flex;flex-wrap:wrap;gap:4px 12px;flex-basis:100%}.cl-mod,.eq-nuevo .cl-mod{display:flex;flex-direction:row;flex:0 0 auto;min-width:0;align-items:center;gap:5px;font-size:12px;color:var(--text-primary,#222)}.cl-mod input{width:auto;margin:0;min-height:0}`;
  (document.head || document.documentElement).appendChild(st);
})();
