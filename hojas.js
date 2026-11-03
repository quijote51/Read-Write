/* ══════════════════════════════════════
   OÍDO COCINA · Hojas de evento por departamento (módulo base)
   Cada departamento con su hoja, sacada siempre del evento tal y como está ahora:
   - Cocina: platos y raciones por categoría, alérgenos, alergias de los clientes, elaboraciones base,
     menú infantil y horario de cocina.
   - Sala: orden del menú con alérgenos, alergias (destacadas), bebidas, personal asignado y notas.
   - Montaje: lugar, hora, tipo de servicio, vajilla necesaria (con faltas de stock), personal y notas.
   Al imprimir una hoja se guarda en el aparato lo que llevaba; si el evento cambia después, la hoja avisa de qué
   ha cambiado (y sale en la campana de avisos) para volver a imprimirla. También se puede compartir como texto.
   Usa del principal: eventos, CATS, getFactorEvento, algDePlato, algLabel, htmlAlertaAlergenos, htmlHorarioEvento,
   htmlElaboracionesBase, PLATOS_INFANTIL, calcVajEvento, BEB_CATS, calcUnidades, personal, ROL_LABELS, fmtFecha,
   hotelDatos, rolActual.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const hoyK = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const LS = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } };
const IMPR = 'oido_hojas_impresas';
const DEPS = {cocina: 'Cocina', sala: 'Sala', montaje: 'Montaje'};
const TIPOS = {coctel: 'Cóctel', menu: 'Menú sentado', desayuno: 'Desayuno', banquete: 'Banquete'};
const rol = () => (typeof rolActual !== 'undefined' && rolActual) || 'admin';
const depsDeRol = () => rol() === 'cocina' ? ['cocina'] : rol() === 'sala' ? ['sala', 'montaje'] : ['cocina', 'sala', 'montaje'];
const evs = () => (typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : []);
const ff = f => typeof fmtFecha === 'function' ? fmtFecha(f) : f;
const algTxt = p => (typeof algDePlato === 'function' ? algDePlato(p) : (p.alg || [])).map(a => typeof algLabel === 'function' ? algLabel(a) : a);
const sinAlergias = t => !String(t || '').trim() || /^\s*(sin|ninguna|no hay)/i.test(t);

let evId = null, dep = null;

// ── Lo que lleva cada hoja (sirve para pintarla, compartirla y ver qué ha cambiado) ──
function datos(ev, d){
  const f = typeof getFactorEvento === 'function' ? getFactorEvento(ev) : 1, rac = Math.round((ev.pax || 0) * f);
  const ninos = ev.infantil && ev.infantil.ninos || 0;
  const cats = (typeof CATS !== 'undefined' ? CATS : [{key: '', label: ''}]);
  const platosCat = cats.map(c => ({cat: c.label, platos: (ev.platos || []).filter(p => (p.cat || '') === c.key)})).filter(x => x.platos.length);
  const otros = (ev.platos || []).filter(p => !cats.some(c => c.key === (p.cat || '')));
  if(otros.length) platosCat.push({cat: 'Otros', platos: otros});
  const pers = (ev.personal_ids || []).map(id => (typeof personal !== 'undefined' ? personal : []).find(p => p.id === id)).filter(Boolean)
    .map(p => `${p.nombre}${p.rol ? ' (' + ((typeof ROL_LABELS !== 'undefined' && ROL_LABELS[p.rol]) || p.rol) + ')' : ''}`);
  const comun = {'Fecha y hora': `${ff(ev.fecha)} · ${ev.hora || ''}`, 'Personas': `${ev.pax || 0}${ninos ? ' + ' + ninos + ' niños' : ''}`, 'Lugar': ev.lugar || '', 'Servicio': TIPOS[ev.tipo] || ev.tipo || ''};
  const alergias = sinAlergias(ev.alergias_txt) ? 'Sin alergias registradas' : ev.alergias_txt;
  if(d === 'cocina') return {...comun, 'Alergias de clientes': alergias,
    'Platos': platosCat.map(g => g.cat + ': ' + g.platos.map(p => `${p.nombre} ×${rac}${algTxt(p).length ? ' [' + algTxt(p).join(', ') + ']' : ''}`).join('; ')),
    'Menú infantil': ninos ? `${ninos} niños: ` + ((ev.infantil.platos || []).map(id => ((typeof PLATOS_INFANTIL !== 'undefined' ? PLATOS_INFANTIL : []).find(x => x.id === id) || {}).nombre).filter(Boolean).join(', ')) : '',
    'Notas': ev.notas || ''};
  if(d === 'sala'){
    const beb = ev.bebidas || {}, bebs = (typeof BEB_CATS !== 'undefined' ? BEB_CATS : []).filter(c => beb[c.id] && beb[c.id].activo)
      .map(c => c.id === 'barra_libre' ? c.label : `${c.label}: ${(typeof calcUnidades === 'function' ? calcUnidades(c.id, ev.pax, ev.tipo) : 0) + (beb[c.id].botellas_extra || 0)} ${c.ud}`);
    return {...comun, 'Alergias de clientes': alergias,
      'Menú': platosCat.map(g => g.cat + ': ' + g.platos.map(p => `${p.nombre}${algTxt(p).length ? ' [' + algTxt(p).join(', ') + ']' : ''}`).join('; ')),
      'Bebidas': bebs.join('; ') + (ev.notas_bebidas ? ' · ' + ev.notas_bebidas : ''), 'Personal': pers.join(', '), 'Notas': ev.notas || ''};
  }
  const vaj = typeof calcVajEvento === 'function' ? calcVajEvento(ev) : [];
  return {...comun, 'Vajilla': vaj.map(v => `${v.nombre}: ${v.necesario}${v.ok ? '' : ' (faltan ' + v.falta + ')'}`), 'Personal': pers.join(', '), 'Notas': ev.notas || ''};
}
const texto = v => Array.isArray(v) ? v.join('\n') : String(v ?? '');
function cambios(ev, d){
  const g = (LS(IMPR) || {})[ev.id + '|' + d]; if(!g) return null;
  const ahora = datos(ev, d), lista = Object.keys({...ahora, ...g.datos}).filter(k => texto(ahora[k]) !== texto(g.datos[k]));
  return {f: g.f, lista};
}
// Para la campana de avisos: hojas impresas de eventos de hoy en adelante que han cambiado después
window.hojasCambiadas = function(){
  const g = LS(IMPR) || {}, out = [];
  Object.keys(g).forEach(k => { const [id, d] = k.split('|'), ev = evs().find(e => String(e.id) === id);
    if(ev && ev.fecha >= hoyK()){ const c = cambios(ev, d); if(c && c.lista.length) out.push({ev, dep: d, depNombre: DEPS[d], lista: c.lista}); } });
  return out;
};

// ── Pintar ──
function bloque(t, html, clase){ return html ? `<div class="hj-b ${clase || ''}"><div class="hj-t">${t}</div>${html}</div>` : ''; }
function cabecera(ev, d){
  const ninos = ev.infantil && ev.infantil.ninos || 0;
  return `<div class="hj-cab"><div class="hj-dep">Hoja de ${DEPS[d].toLowerCase()}</div><div class="hj-ev">${esc(ev.nombre)}</div>
    <div class="hj-datos"><span>${esc(ff(ev.fecha))} · ${esc(ev.hora || '')}</span><span>${ev.pax || 0} personas${ninos ? ' + ' + ninos + ' niños' : ''}</span><span>${esc(ev.lugar || '')}</span><span>${esc(TIPOS[ev.tipo] || ev.tipo || '')}</span></div></div>`;
}
function htmlHoja(ev, d){
  const f = typeof getFactorEvento === 'function' ? getFactorEvento(ev) : 1, rac = Math.round((ev.pax || 0) * f);
  const alg = sinAlergias(ev.alergias_txt) ? '' : `<div class="hj-alerta">⚠ ${esc(ev.alergias_txt)}</div>`;
  const cats = (typeof CATS !== 'undefined' ? CATS : []);
  const tablaPlatos = conUds => `<table class="hj-tabla"><tbody>${cats.map(c => { const ps = (ev.platos || []).filter(p => p.cat === c.key); if(!ps.length) return '';
      return `<tr><td colspan="${conUds ? 3 : 2}" class="hj-cat">${esc(c.label)}</td></tr>` + ps.map(p => `<tr><td><b>${esc(p.nombre)}</b></td><td class="hj-alg">${esc(algTxt(p).join(', ')) || '—'}</td>${conUds ? `<td class="hj-n">${rac}</td>` : ''}</tr>`).join(''); }).join('')}</tbody></table>`;
  const dd = datos(ev, d);
  let cuerpo = '';
  if(d === 'cocina'){
    cuerpo = bloque('Alergias de los clientes', alg || '<p>Sin alergias registradas.</p>', alg ? 'hj-warn' : '')
      + (typeof htmlAlertaAlergenos === 'function' ? htmlAlertaAlergenos(ev, true) : '')
      + bloque(`Platos · ${rac} raciones de cada uno`, tablaPlatos(true))
      + (typeof htmlElaboracionesBase === 'function' ? htmlElaboracionesBase([ev]) : '')
      + bloque('Menú infantil', dd['Menú infantil'] ? `<p>${esc(dd['Menú infantil'])}</p>` : '')
      + (typeof htmlHorarioEvento === 'function' ? bloque('Equipo de cocina', htmlHorarioEvento(ev)) : '')
      + bloque('Notas', ev.notas ? `<p>${esc(ev.notas)}</p>` : '');
  }else if(d === 'sala'){
    cuerpo = bloque('Alergias de los clientes', alg || '<p>Sin alergias registradas.</p>', alg ? 'hj-warn' : '')
      + bloque('Orden del menú', tablaPlatos(false))
      + bloque('Bebidas', dd['Bebidas'] ? `<p>${esc(dd['Bebidas'])}</p>` : '<p>Sin bebidas marcadas.</p>')
      + bloque('Personal', dd['Personal'] ? `<p>${esc(dd['Personal'])}</p>` : '')
      + bloque('Notas', ev.notas ? `<p>${esc(ev.notas)}</p>` : '');
  }else{
    const vaj = typeof calcVajEvento === 'function' ? calcVajEvento(ev) : [];
    cuerpo = bloque('Vajilla necesaria', vaj.length ? `<table class="hj-tabla"><tbody>${vaj.map(v => `<tr><td>${esc(v.nombre)}</td><td class="hj-n">${v.necesario}</td><td class="${v.ok ? '' : 'hj-mal'}">${v.ok ? 'ok' : 'faltan ' + v.falta}</td></tr>`).join('')}</tbody></table>` : '<p>No hay vajilla dada de alta.</p>')
      + bloque('Personal', dd['Personal'] ? `<p>${esc(dd['Personal'])}</p>` : '')
      + bloque('Notas', ev.notas ? `<p>${esc(ev.notas)}</p>` : '');
  }
  return cabecera(ev, d) + cuerpo;
}

function pintar(){
  const root = ge('hj-root'); if(!root) return;
  const lista = evs().filter(e => e.fecha >= hoyK()).sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  const deps = depsDeRol();
  if(!deps.includes(dep)) dep = deps[0];
  if(!lista.some(e => String(e.id) === String(evId))) evId = lista.length ? lista[0].id : null;
  const ev = lista.find(e => String(e.id) === String(evId));
  if(!ev){ root.innerHTML = '<div class="card"><p class="hj-vacio">No hay eventos próximos.</p></div>'; return; }
  const c = cambios(ev, dep);
  const avisoCambio = c ? (c.lista.length ? `<div class="hj-cambio"><b>Ha cambiado desde que la imprimiste</b> (${new Date(c.f).toLocaleString('es-ES', {day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'})}): ${c.lista.map(esc).join(', ')}. Vuelve a imprimirla.</div>`
    : `<div class="hj-igual">Igual que la impresa el ${new Date(c.f).toLocaleString('es-ES', {day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'})}.</div>`) : '';
  root.innerHTML = `<div class="card"><div class="hj-sel"><label>Evento<select id="hj-ev">${lista.map(e => `<option value="${esc(e.id)}"${String(e.id) === String(evId) ? ' selected' : ''}>${esc(ff(e.fecha))} · ${esc(e.nombre)}</option>`).join('')}</select></label></div>
    ${deps.length > 1 ? `<div class="hj-deps" role="tablist">${deps.map(k => `<button role="tab" aria-selected="${k === dep}" class="${k === dep ? 'on' : ''}" data-hjd="${k}">${DEPS[k]}</button>`).join('')}</div>` : ''}
    <div class="hj-acc"><button class="btn btn-p" data-hj="imprimir"><i class="ti ti-printer"></i> Imprimir</button><button class="btn-sec" data-hj="compartir"><i class="ti ti-share"></i> Compartir como texto</button></div></div>
    ${avisoCambio}<div class="card hj-hoja" id="hj-hoja">${htmlHoja(ev, dep)}</div>`;
}
function imprimir(){
  const ev = evs().find(e => String(e.id) === String(evId)); if(!ev) return;
  const g = LS(IMPR) || {}; g[ev.id + '|' + dep] = {f: new Date().toISOString(), datos: datos(ev, dep)};
  // Se olvidan las hojas de eventos ya pasados
  Object.keys(g).forEach(k => { const e = evs().find(x => String(x.id) === k.split('|')[0]); if(!e || e.fecha < hoyK()) delete g[k]; });
  LS(IMPR, g);
  const d = typeof hotelDatos === 'function' ? hotelDatos() : {};
  let z = ge('hj-print'); if(!z){ z = document.createElement('div'); z.id = 'hj-print'; document.body.appendChild(z); }
  z.innerHTML = `<div class="hj-ph">${esc(d.nombre || 'Oído Cocina')} · impresa el ${new Date().toLocaleString('es-ES')}</div>` + htmlHoja(ev, dep);
  document.body.classList.add('hj-imprimiendo');
  const fin = () => { document.body.classList.remove('hj-imprimiendo'); window.removeEventListener('afterprint', fin); pintar(); if(typeof avisosRecalcular === 'function') avisosRecalcular(); };
  window.addEventListener('afterprint', fin); window.print(); setTimeout(fin, 1500);
}
async function compartir(){
  const ev = evs().find(e => String(e.id) === String(evId)); if(!ev) return;
  const dd = datos(ev, dep);
  const txt = `*Hoja de ${DEPS[dep].toLowerCase()} · ${ev.nombre}*\n` + Object.entries(dd).filter(([, v]) => texto(v)).map(([k, v]) => Array.isArray(v) ? `\n*${k}*\n${v.map(x => '— ' + x).join('\n')}` : `*${k}:* ${v}`).join('\n');
  try{ if(navigator.share){ await navigator.share({text: txt}); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
}

let enlazado = false;
window.initHojas = function(){
  const root = ge('hj-root'); if(!root) return;
  if(!ge('hj-css')){ const st = document.createElement('style'); st.id = 'hj-css'; st.textContent = CSS; document.head.appendChild(st); }
  if(!enlazado){
    enlazado = true;
    root.addEventListener('click', e => {
      const d = e.target.closest('[data-hjd]'); if(d){ dep = d.dataset.hjd; pintar(); return; }
      const b = e.target.closest('[data-hj]'); if(!b) return;
      if(b.dataset.hj === 'imprimir') imprimir(); else compartir();
    });
    root.addEventListener('change', e => { if(e.target.id === 'hj-ev'){ evId = e.target.value; pintar(); } });
  }
  pintar();
};
window.hojasAbrir = function(id, d){ evId = id; if(d) dep = d; if(typeof showTab === 'function') showTab('hojas'); window.initHojas(); };

const CSS = `#hj-root .card{margin-bottom:10px}
.hj-sel label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary)}
.hj-deps{display:flex;gap:4px;margin-top:10px}.hj-deps button{flex:1;border:.5px solid var(--border);background:var(--bg-primary);color:var(--text-secondary);border-radius:999px;padding:7px 10px;font-size:13px;cursor:pointer}
.hj-deps button.on{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.hj-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.hj-cambio{background:var(--warn-bg);color:var(--warn-text);border-radius:var(--radius);padding:8px 12px;font-size:13px;margin-bottom:10px}
.hj-igual{font-size:12px;color:var(--success-text);margin:0 0 8px 4px}
.hj-cab{border-bottom:2px solid var(--text-primary);padding-bottom:8px;margin-bottom:8px}.hj-dep{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary)}
.hj-ev{font-size:18px;font-weight:700}.hj-datos{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--text-secondary);margin-top:2px}
.hj-b{margin:10px 0}.hj-t{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary);margin-bottom:4px}.hj-b p{margin:0;font-size:14px}
.hj-alerta{font-size:15px;font-weight:700;color:var(--warn-text)}
.hj-tabla{width:100%;border-collapse:collapse;font-size:13px}.hj-tabla td{padding:5px 4px;border-bottom:.5px solid var(--border);vertical-align:top}
.hj-cat{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-secondary);padding-top:8px!important}
.hj-alg{color:var(--text-secondary);font-size:12px}.hj-n{text-align:right;font-weight:700;font-size:15px;white-space:nowrap}.hj-mal{color:var(--danger-text);font-weight:600}
.hj-vacio{color:var(--text-secondary);text-align:center;font-size:13px}
#hj-print{display:none}
@media print{body.hj-imprimiendo>*:not(#hj-print){display:none!important}body.hj-imprimiendo #hj-print{display:block;color:#000;font:11pt/1.4 Arial,sans-serif}
  #hj-print .hj-ph{font-size:9pt;color:#555;margin-bottom:6px}#hj-print .hj-ev{font-size:18pt}#hj-print .hj-alerta{font-size:14pt;border:2px solid #000;padding:4px 8px}
  #hj-print .hj-tabla td{border-bottom:1px solid #999}#hj-print .no-print{display:none}}`;
})();
