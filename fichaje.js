/* ══════════════════════════════════════
   OÍDO COCINA · Fichaje de jornada (módulo «Equipo»)
   Registro horario obligatorio (art. 34.9 del Estatuto de los Trabajadores): entrada, pausas y salida de cada
   persona. Tabla fichajes (supabase/fichaje.sql): la hora la pone la base de datos, nada se cambia ni se borra
   (se conserva 4 años) y un error se corrige con una anulación con motivo y, si hace falta, un fichaje a mano.
   - Fichar: botones grandes según el momento (Entrada → Pausa / Salida → Vuelta). Sin conexión se guarda en el
     aparato con su hora («sin conexión») y se sube al volver.
   - Jefes (admin, dirección, chef): quién está dentro ahora, informe del mes por persona (con el turno previsto
     de Horarios), imprimir para la inspección, CSV, anular y fichaje a mano.
   - La cuenta compartida de cocina elige el nombre (queda marcado «compartida»).
   Usa del principal: supa, _uid, _perfil, rolActual, horarios (seda_horarios), hotelDatos.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const diaK = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hm = d => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dmy = k => String(k).slice(0, 10).split('-').reverse().join('/');
const LS = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } };
const PEND = 'oido_fichajes_pend';
const TIPO = {entrada: 'Entrada', salida: 'Salida', pausa: 'Pausa', vuelta: 'Vuelta de la pausa', anula: 'Anulación'};
const ORIGEN = {compartida: 'aparato compartido', manual: 'a mano', sin_conexion: 'sin conexión'};
const TURNO = {L:'Libre',V:'Vacaciones',B:'Baja',P:'12:00-16:00 / 20:00-00:00',a:'08:00-16:00',b:'06:30-14:30',c:'16:00-00:00',d:'14:30-22:30',e:'12:00-20:00',f:'09:00-17:00',R:'Recuperación','-':''};
const conSesion = () => typeof supa !== 'undefined' && supa && typeof _uid !== 'undefined' && _uid;
const rol = () => (typeof _perfil !== 'undefined' && _perfil && _perfil.rol) || (typeof rolActual !== 'undefined' && rolActual) || 'admin';
const jefe = () => ['admin', 'direccion', 'chef'].includes(rol());
const miNombre = () => (typeof _perfil !== 'undefined' && _perfil && _perfil.nombre) || null;
const horDatos = () => (typeof horarios !== 'undefined' && horarios) || window._fhHorarios || LS('seda_horarios') || {};
const equipo = () => [...new Set(((horDatos().equipo) || []).map(e => e.n).filter(Boolean).concat(filas.map(f => f.persona)))].sort((a, b) => a.localeCompare(b));

let filas = [], vista = 'fichar', persona = null, mes = diaK(new Date()).slice(0, 7), quien = '', msg = '', cargando = false;

// ── Cálculo: quita lo anulado y junta entrada → (pausas) → salida ──
function validos(lista){
  const anul = new Set(lista.filter(f => f.tipo === 'anula').map(f => f.corrige));
  return lista.filter(f => f.tipo !== 'anula' && !anul.has(f.id)).sort((a, b) => new Date(a.hora) - new Date(b.hora));
}
function jornadas(lista, p){
  const out = []; let j = null;
  validos(lista).filter(f => f.persona === p).forEach(f => {
    const t = new Date(f.hora).getTime();
    if(f.tipo === 'entrada'){ if(j) out.push(j); j = {dia: diaK(f.hora), entrada: f, salida: null, pausas: [], pausaDesde: null, fichas: [f]}; return; }
    if(!j) return;
    j.fichas.push(f);
    if(f.tipo === 'pausa' && j.pausaDesde == null) j.pausaDesde = t;
    else if(f.tipo === 'vuelta' && j.pausaDesde != null){ j.pausas.push(t - j.pausaDesde); j.pausaDesde = null; }
    else if(f.tipo === 'salida'){ if(j.pausaDesde != null){ j.pausas.push(t - j.pausaDesde); j.pausaDesde = null; } j.salida = f; out.push(j); j = null; }
  });
  if(j) out.push(j);
  out.forEach(x => { const pausa = x.pausas.reduce((a, b) => a + b, 0); x.pausaMin = Math.round(pausa / 6e4);
    x.min = x.salida ? Math.max(0, Math.round((new Date(x.salida.hora) - new Date(x.entrada.hora) - pausa) / 6e4)) : null; });
  return out;
}
function estadoDe(p){
  const js = jornadas(filas, p), j = js[js.length - 1];
  if(!j || j.salida) return 'fuera';
  if(Date.now() - new Date(j.entrada.hora) > 20 * 36e5) return 'fuera'; // entrada de hace más de 20 h sin salida: se da por cerrada
  return j.pausaDesde != null ? 'pausa' : 'dentro';
}
const hCorta = m => m == null ? '—' : `${Math.floor(m / 60)}:${pad(m % 60)}`;
const horasTxt = m => m == null ? '—' : `${Math.floor(m / 60)} h ${pad(m % 60)} min`;
function turnoPrevisto(p, dia){
  const d = new Date(dia + 'T12:00'), lun = new Date(d); lun.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const s = (horDatos().semanas || {})[diaK(lun)], t = s && s[p] ? s[p][(d.getDay() + 6) % 7] : null;
  return t == null ? '' : (TURNO[t] ?? String(t).replace(/\n/g, ' / '));
}

// ── Nube ──
async function cargar(desde){
  if(!conSesion() || navigator.onLine === false) return;
  cargando = true;
  try{
    const {data, error} = await supa.from('fichajes').select('*').gte('hora', desde.toISOString()).order('hora');
    if(error) throw error;
    filas = data || [];
  }catch(e){ msg = '!No se han podido leer los fichajes. ' + (/does not exist|schema cache/i.test(e.message || '') ? 'Falta activar el fichaje en Supabase.' : 'Revisa la conexión.'); }
  cargando = false;
}
const desdeVista = () => vista === 'informe' ? new Date(mes + '-01T00:00') : new Date(Date.now() - 2 * 864e5);
let enviando = false;
async function enviarPendientes(){
  if(enviando) return;
  const pend = LS(PEND) || []; if(!pend.length || !conSesion() || navigator.onLine === false) return;
  enviando = true; LS(PEND, []); // se sacan de la cola antes de enviar: así no se suben dos veces
  const quedan = [];
  try{
    for(const f of pend){
      let error = null; try{ ({error} = await supa.from('fichajes').insert(f)); }catch(e){ error = e; }
      if(error && !/fuera de plazo/.test(error.message || '')) quedan.push(f);
      else if(error) msg = '!Un fichaje sin conexión tenía más de 3 días y no se ha podido guardar: pídeselo a tu jefe.';
    }
  }finally{ LS(PEND, quedan.concat(LS(PEND) || [])); enviando = false; }
}
async function fichar(tipo){
  const p = persona; if(!p) return aviso('!Elige tu nombre.');
  const f = {persona: p, tipo, origen: 'movil'};
  if(!conSesion() || navigator.onLine === false){
    LS(PEND, (LS(PEND) || []).concat([{...f, origen: 'sin_conexion', hora: new Date().toISOString()}]));
    filas.push({...f, id: 'p' + Date.now(), hora: new Date().toISOString(), origen: 'sin_conexion'});
    return aviso(`${TIPO[tipo]} guardada en el aparato a las ${hm(new Date())}. Se subirá al volver la conexión.`);
  }
  const {data, error} = await supa.from('fichajes').insert(f).select();
  if(error) return aviso('!No se ha podido fichar: ' + error.message);
  filas = filas.concat(data || []);
  aviso(`${TIPO[tipo]} a las ${hm((data && data[0] && data[0].hora) || new Date())}.`);
}

// ── Vistas ──
function vFichar(){
  const yo = miNombre(), eq = equipo(), elegir = !yo;
  if(!persona) persona = yo || LS('oido_fichaje_persona') || null;
  const est = persona ? estadoDe(persona) : 'fuera';
  const botones = {fuera: [['entrada', 'Entrada', 'fh-g']], dentro: [['pausa', 'Pausa', 'fh-s'], ['salida', 'Salida', 'fh-r']], pausa: [['vuelta', 'Vuelvo de la pausa', 'fh-g'], ['salida', 'Salida', 'fh-r']]}[est];
  const hoy = jornadas(filas, persona).filter(j => j.dia === diaK(new Date()));
  const reloj = `<div class="fh-reloj" id="fh-reloj">${hm(new Date())}</div><div class="fh-fecha">${new Date().toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</div>`;
  return `<div class="card fh-card">${reloj}
    ${elegir ? `<label class="fh-quien">Quién ficha<select id="fh-persona"><option value="">— Elige tu nombre —</option>${eq.map(n => `<option${n === persona ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : `<div class="fh-yo">${esc(persona)}</div>`}
    ${persona ? `<div class="fh-est fh-est-${est}">${{fuera: 'Fuera', dentro: 'Trabajando', pausa: 'En pausa'}[est]}</div>
      <div class="fh-bots">${botones.map(([t, n, c]) => `<button class="fh-bot ${c}" data-fh="fichar" data-t="${t}">${n}</button>`).join('')}</div>` : ''}
    ${(LS(PEND) || []).length ? `<p class="fh-ayuda">${(LS(PEND) || []).length} fichaje(s) guardados sin conexión, pendientes de subir.</p>` : ''}
  </div>
  ${persona ? `<div class="card"><b>Hoy</b>${hoy.length ? hoy.map(j => `<div class="fh-fila">${j.fichas.map(f => `<span class="fh-chip">${TIPO[f.tipo]} ${hm(f.hora)}${ORIGEN[f.origen] ? ` · ${ORIGEN[f.origen]}` : ''}</span>`).join('')}<b class="fh-h">${j.salida ? horasTxt(j.min) : 'en curso'}</b></div>`).join('') : '<p class="fh-vacio">Sin fichajes hoy.</p>'}</div>` : ''}
  <p class="fh-ayuda">La hora la pone el servidor y los fichajes no se pueden cambiar ni borrar: si te equivocas, díselo a tu jefe para que lo corrija con el motivo.</p>`;
}
function vAhora(){
  const eq = equipo(), dentro = eq.map(n => ({n, e: estadoDe(n), j: jornadas(filas, n).pop()})).filter(x => x.e !== 'fuera');
  return `<div class="card"><b>Ahora en el trabajo (${dentro.length})</b>
    ${dentro.length ? dentro.map(x => `<div class="fh-fila"><span class="fh-n">${esc(x.n)}</span><span class="fh-chip fh-est-${x.e}">${x.e === 'pausa' ? 'En pausa' : 'Trabajando'} desde las ${hm(x.j.entrada.hora)}</span></div>`).join('') : '<p class="fh-vacio">Nadie ha fichado la entrada.</p>'}</div>`;
}
function vInforme(){
  const eq = equipo(); if(!quien && eq.length) quien = eq[0];
  const js = quien ? jornadas(filas, quien).filter(j => j.dia.slice(0, 7) === mes) : [];
  const total = js.reduce((a, j) => a + (j.min || 0), 0), sinSalida = js.filter(j => !j.salida).length;
  const ultimos = validos(filas).filter(f => f.persona === quien && diaK(f.hora).slice(0, 7) === mes).reverse();
  return `<div class="card"><div class="fh-form">
      <label>Mes<input type="month" id="fh-mes" value="${mes}"></label>
      <label>Persona<select id="fh-quien">${eq.map(n => `<option${n === quien ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label></div>
    <div class="fh-tot"><b>${horasTxt(total)}</b> en ${js.length} jornada${js.length === 1 ? '' : 's'}${sinSalida ? ` · <span class="fh-mal">${sinSalida} sin salida</span>` : ''}</div>
    <div class="fh-tabla"><table><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Pausa</th><th>Horas</th><th>Turno</th></tr></thead><tbody>
    ${js.map(j => `<tr><td>${dmy(j.dia)}</td><td>${hm(j.entrada.hora)}${ORIGEN[j.entrada.origen] ? '*' : ''}</td><td>${j.salida ? hm(j.salida.hora) + (ORIGEN[j.salida.origen] ? '*' : '') : '<span class="fh-mal">—</span>'}</td><td>${j.pausaMin ? j.pausaMin + ' min' : ''}</td><td>${hCorta(j.min)}</td><td>${esc(turnoPrevisto(quien, j.dia))}</td></tr>`).join('') || '<tr><td colspan="6" class="fh-vacio">Sin fichajes este mes.</td></tr>'}
    </tbody></table></div><p class="fh-ayuda">* fichado a mano, sin conexión o en el aparato compartido.</p>
    <div class="fh-acc"><button class="btn btn-p" data-fh="imprimir"><i class="ti ti-printer"></i> Imprimir para la inspección</button><button class="btn-sec" data-fh="csv">Descargar CSV (todos)</button><button class="btn-sec" data-fh="manual">Añadir a mano</button></div></div>
  <div class="card"><b>Fichajes del mes</b><p class="fh-ayuda">No se borran: si uno está mal, anúlalo con el motivo y, si hace falta, añade el bueno a mano.</p>
    ${ultimos.map(f => `<div class="fh-fila"><span class="fh-n">${dmy(diaK(f.hora))} ${hm(f.hora)} · ${TIPO[f.tipo]}${ORIGEN[f.origen] ? ` <small>(${ORIGEN[f.origen]}${f.nota ? ': ' + esc(f.nota) : ''})</small>` : ''}</span><button class="btn-sec fh-sm" data-fh="anular" data-id="${esc(f.id)}">Anular</button></div>`).join('') || '<p class="fh-vacio">—</p>'}</div>`;
}

async function pintar(){
  const root = ge('fh-root'); if(!root) return;
  const vistas = jefe() ? [['fichar', 'Fichar'], ['ahora', 'Ahora'], ['informe', 'Informe']] : (miNombre() ? [['fichar', 'Fichar']] : [['fichar', 'Fichar'], ['ahora', 'Ahora']]);
  if(!vistas.some(v => v[0] === vista)) vista = 'fichar';
  const a = msg ? `<div class="hz-aviso ${msg.startsWith('!') ? 'warn' : 'ok'}">${esc(msg.replace(/^!/, ''))}</div>` : ''; msg = '';
  const cuerpo = !conSesion() && !(LS(PEND) || []).length && !miNombre() && !equipo().length ? '<div class="card"><p class="fh-vacio">Entra con tu cuenta para fichar.</p></div>'
    : vista === 'ahora' ? vAhora() : vista === 'informe' ? vInforme() : vFichar();
  root.innerHTML = `${vistas.length > 1 ? `<div class="fh-tabs" role="tablist">${vistas.map(([k, t]) => `<button role="tab" aria-selected="${k === vista}" class="${k === vista ? 'on' : ''}" data-fhv="${k}">${t}</button>`).join('')}</div>` : ''}${a}${cuerpo}`;
}
const aviso = t => { msg = t; pintar(); };
async function recargar(){ await enviarPendientes(); await cargar(desdeVista()); pintar(); }

function imprimirInforme(){
  const d = typeof hotelDatos === 'function' ? hotelDatos() : {}, js = jornadas(filas, quien).filter(j => j.dia.slice(0, 7) === mes);
  const total = js.reduce((a, j) => a + (j.min || 0), 0);
  const html = `${typeof hLogo === 'function' ? hLogo(40) : ''}<h1>Registro de jornada · ${esc(quien)}</h1><p>${esc([d.nombre, d.dir, d.ciudad].filter(Boolean).join(' · '))} · Mes ${mes.split('-').reverse().join('/')}</p>
    <table><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Pausa</th><th>Horas</th></tr></thead><tbody>
    ${js.map(j => `<tr><td>${dmy(j.dia)}</td><td>${hm(j.entrada.hora)}</td><td>${j.salida ? hm(j.salida.hora) : '—'}</td><td>${j.pausaMin ? j.pausaMin + ' min' : ''}</td><td>${horasTxt(j.min)}</td></tr>`).join('')}
    <tr><td colspan="4"><b>Total</b></td><td><b>${horasTxt(total)}</b></td></tr></tbody></table>
    <p>Registro diario de jornada (art. 34.9 del Estatuto de los Trabajadores). Hora tomada por el servidor; los registros no se modifican y se conservan 4 años. Impreso el ${dmy(diaK(new Date()))} a las ${hm(new Date())}.</p>
    <div class="fh-firmas"><div>Firma de la empresa</div><div>Firma de la persona trabajadora</div></div>`;
  let z = ge('fh-print'); if(!z){ z = document.createElement('div'); z.id = 'fh-print'; document.body.appendChild(z); }
  z.innerHTML = html; document.body.classList.add('fh-imprimiendo');
  const fin = () => { document.body.classList.remove('fh-imprimiendo'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin); window.print(); setTimeout(fin, 1500);
}
function csv(){
  const l = [['persona', 'dia', 'entrada', 'salida', 'pausa_min', 'minutos_trabajados']];
  equipo().forEach(p => jornadas(filas, p).filter(j => j.dia.slice(0, 7) === mes).forEach(j => l.push([p, j.dia, hm(j.entrada.hora), j.salida ? hm(j.salida.hora) : '', j.pausaMin, j.min ?? ''])));
  const txt = l.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], {type: 'text/csv'})); a.download = `fichajes-${mes}.csv`; a.click();
}
async function manual(){
  const p = quien || persona; if(!p) return;
  const tipo = prompt(`Fichaje a mano para ${p}.\nEscribe: entrada, salida, pausa o vuelta`, 'salida'); if(!tipo) return;
  const t = tipo.trim().toLowerCase(); if(!TIPO[t] || t === 'anula') return aviso('!Tipo no válido: entrada, salida, pausa o vuelta.');
  const cuando = prompt('Día y hora (dd/mm/aaaa hh:mm)', `${dmy(diaK(new Date()))} ${hm(new Date())}`); if(!cuando) return;
  const m = cuando.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/); if(!m) return aviso('!Escribe la fecha como 03/11/2026 18:30.');
  const hora = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]); if(hora > new Date()) return aviso('!No se puede fichar en el futuro.');
  const nota = (prompt('Motivo (obligatorio): por qué se añade a mano') || '').trim(); if(!nota) return aviso('!Hace falta el motivo.');
  const {error} = await supa.from('fichajes').insert({persona: p, tipo: t, origen: 'manual', hora: hora.toISOString(), nota});
  if(error) return aviso('!No se ha podido: ' + error.message);
  msg = `Añadido: ${TIPO[t]} de ${p} el ${cuando}.`; await recargar();
}
async function anular(id){
  const f = filas.find(x => String(x.id) === String(id)); if(!f) return;
  const nota = (prompt(`Anular «${TIPO[f.tipo]} ${dmy(diaK(f.hora))} ${hm(f.hora)}» de ${f.persona}.\nMotivo (obligatorio):`) || '').trim(); if(!nota) return;
  const {error} = await supa.from('fichajes').insert({persona: f.persona, tipo: 'anula', corrige: f.id, nota});
  if(error) return aviso('!No se ha podido: ' + error.message);
  msg = 'Anulado. Queda constancia del motivo.'; await recargar();
}

let enlazado = false, relojT = null;
window.initFichaje = function(){
  const root = ge('fh-root'); if(!root) return;
  if(!ge('fh-css')){ const st = document.createElement('style'); st.id = 'fh-css'; st.textContent = CSS; document.head.appendChild(st); }
  if(!enlazado){
    enlazado = true;
    root.addEventListener('click', e => {
      const v = e.target.closest('[data-fhv]'); if(v){ vista = v.dataset.fhv; recargar(); return; }
      const b = e.target.closest('[data-fh]'); if(!b) return;
      const a = b.dataset.fh;
      if(a === 'fichar'){ b.disabled = true; fichar(b.dataset.t); }
      else if(a === 'imprimir') imprimirInforme(); else if(a === 'csv') csv(); else if(a === 'manual') manual(); else if(a === 'anular') anular(b.dataset.id);
    });
    root.addEventListener('change', e => {
      if(e.target.id === 'fh-persona'){ persona = e.target.value || null; LS('oido_fichaje_persona', persona); pintar(); }
      if(e.target.id === 'fh-quien'){ quien = e.target.value; pintar(); }
      if(e.target.id === 'fh-mes' && e.target.value){ mes = e.target.value; recargar(); }
    });
    window.addEventListener('online', () => { if(ge('fh-root')) recargar(); });
    relojT = setInterval(() => { const r = ge('fh-reloj'); if(r) r.textContent = hm(new Date()); }, 15e3);
  }
  pintar(); recargar();
};

const CSS = `#fh-root .card{margin-bottom:10px}
.fh-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:10px}
.fh-tabs button{border:.5px solid var(--border);background:var(--bg-primary);color:var(--text-secondary);border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer}
.fh-tabs button.on{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.fh-card{text-align:center}.fh-reloj{font-size:44px;font-weight:700;letter-spacing:.02em;line-height:1.1}.fh-fecha{font-size:13px;color:var(--text-secondary)}.fh-fecha::first-letter{text-transform:uppercase}
.fh-yo{font-size:17px;font-weight:600;margin-top:12px}.fh-quien{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-secondary);margin:12px auto 0;max-width:320px;text-align:left}
.fh-est{display:inline-block;margin-top:8px;border-radius:999px;padding:3px 12px;font-size:12px;font-weight:600;background:var(--bg-secondary);color:var(--text-secondary)}
.fh-est-dentro{background:var(--success-bg);color:var(--success-text)}.fh-est-pausa{background:var(--warn-bg);color:var(--warn-text)}
.fh-bots{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}
.fh-bot{flex:1;min-width:130px;max-width:220px;min-height:64px;border:0;border-radius:14px;font-size:18px;font-weight:700;cursor:pointer;color:#fff}
.fh-bot:disabled{opacity:.5}.fh-g{background:#2e7d4f}.fh-r{background:#b3402e}.fh-s{background:#a8872e}
.fh-ayuda{font-size:12px;color:var(--text-secondary);margin:8px 0}.fh-vacio{color:var(--text-secondary);font-size:13px;text-align:center;margin:8px 0}
.fh-fila{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 0;border-top:.5px solid var(--border)}
.fh-chip{font-size:12px;background:var(--bg-secondary);border-radius:999px;padding:3px 9px}.fh-h{margin-left:auto;font-size:13px}.fh-n{flex:1;min-width:0;font-size:13px}.fh-n small{color:var(--text-secondary)}
.fh-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:8px}.fh-form label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary)}
.fh-tot{font-size:14px;margin:6px 0}.fh-mal{color:var(--danger-text)}
.fh-tabla{overflow-x:auto}.fh-tabla table{width:100%;border-collapse:collapse;font-size:12px}.fh-tabla th,.fh-tabla td{padding:5px 4px;border-bottom:.5px solid var(--border);text-align:left;white-space:nowrap}.fh-tabla th{color:var(--text-secondary);font-weight:500}
.fh-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.fh-sm{padding:3px 8px;font-size:12px}
#fh-print{display:none}
@media print{body.fh-imprimiendo>*:not(#fh-print){display:none!important}body.fh-imprimiendo #fh-print{display:block;color:#000;font:11pt/1.4 Arial,sans-serif}
  #fh-print h1{font-size:16pt;margin:0 0 4px}#fh-print table{width:100%;border-collapse:collapse;margin:10px 0}#fh-print th,#fh-print td{border:1px solid #888;padding:4px 6px;text-align:left}
  .fh-firmas{display:flex;gap:40px;margin-top:40px}.fh-firmas div{flex:1;border-top:1px solid #000;padding-top:4px;font-size:10pt}}`;
})();
