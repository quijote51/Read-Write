/* ══════════════════════════════════════
   OÍDO COCINA · Desperdicio alimentario (Ley 1/2025, módulo «Seguridad alimentaria»)
   - Registrar: qué se tira o se aprovecha (sobras de los platos, preparado y no servido, caducado en almacén,
     comida que el cliente se lleva), cuántos kilos y a dónde va, siguiendo el orden de prioridades de la ley:
     reaprovechar en cocina → donar → alimentación animal → compost → basura.
   - Resumen: kilos por mes, por tipo y por destino, % aprovechado y gramos por persona en los eventos.
   - Plan de prevención: el documento que pide la ley, rellenable e imprimible.
   - Cartel: aviso de que el cliente puede llevarse lo que no consuma con envase gratis, para imprimir.
   Datos en config 'seda_desperdicio': { reg:[{id,f,fecha,serv,ev,tipo,dest,kg,que,por,anulado?}], plan:{...} }
   Los registros no se editan: solo se anulan con motivo. Se guarda con syncConfig (config-nube.js junta los
   registros de varios aparatos). Usa del principal: eventos, fmtFecha, syncConfig, hN/hotelDatos (marca.js).
   ══════════════════════════════════════ */
let desperdicio = (() => { try{ return JSON.parse(localStorage.getItem('seda_desperdicio') || 'null'); }catch(e){ return null; } })();
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
const pad = n => String(n).padStart(2, '0');
const hoyK = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = k => String(k || '').slice(0, 10).split('-').reverse().join('/');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const kgTxt = v => (Math.round((v || 0) * 100) / 100).toLocaleString('es-ES', {maximumFractionDigits: 2}) + ' kg';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const nomMes = m => MESES[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);

const SERVICIOS = [['desayuno','Desayuno'],['comida','Comida'],['cena','Cena'],['evento','Evento'],['otro','Otro']];
const TIPOS = [['plato','Sobras de los platos (vuelve del comedor)'],['produccion','Preparado y no servido'],['almacen','Caducado o estropeado en almacén'],['llevar','Se lo lleva el cliente']];
// Orden de prioridad de la ley: de mejor a peor
const DESTINOS = [['reaprovechado','Reaprovechado en cocina o para el personal'],['donado','Donado (banco de alimentos, entidad social)'],['animal','Alimentación animal'],['compost','Compost o biogás'],['basura','Basura']];
const TIPO = Object.fromEntries(TIPOS), DEST = Object.fromEntries(DESTINOS.concat([['cliente','Para llevar (cliente)']]));
const APROVECHA = ['reaprovechado','donado','animal','cliente'];

const PLAN_MEDIDAS = {
  compras: ['Pedidos ajustados a los eventos y a la ocupación (pedidos calculados por Oído Cocina)','Stock mínimo y rotación por fecha de caducidad'],
  almacen: ['Primero en entrar, primero en salir (FIFO) y etiquetas con fecha','Control de temperaturas de cámaras (APPCC)'],
  produccion: ['Raciones por persona según escandallo y factor de cada servicio','Aprovechamiento de recortes en fondos, cremas y personal'],
  servicio: ['Raciones ajustadas y opción de media ración','Informar de forma visible del envase gratis para llevar'],
  sobras: ['Registro de sobras por servicio y evento en Oído Cocina','Acuerdo de donación con una entidad social']
};
const FASES = [['compras','Compras'],['almacen','Almacenamiento'],['produccion','Producción'],['servicio','Servicio'],['sobras','Sobras y donación']];

const D = () => {
  if(!desperdicio || typeof desperdicio !== 'object') desperdicio = {reg: [], plan: {}};
  if(!Array.isArray(desperdicio.reg)) desperdicio.reg = [];
  if(!desperdicio.plan || typeof desperdicio.plan !== 'object') desperdicio.plan = {};
  return desperdicio;
};
const vivos = () => D().reg.filter(r => !r.anulado);
function guardar(){
  try{ localStorage.setItem('seda_desperdicio', JSON.stringify(D())); }catch(e){}
  if(typeof syncConfig === 'function') syncConfig('seda_desperdicio', D());
}
const yo = () => { try{ return localStorage.getItem('seda_appcc_yo') || ''; }catch(e){ return ''; } };
const evs = () => (typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : []);
const evDe = id => evs().find(e => String(e.id) === String(id));

let vista = 'reg', msg = '', mesR = '', abiertoForm = {fecha: hoyK(), serv: 'comida', tipo: 'plato', dest: 'basura'};

/* ── Registrar ── */
function vReg(){
  const f = abiertoForm, evDia = evs().filter(e => e.fecha === f.fecha);
  const ult = D().reg.slice().reverse().slice(0, 25);
  return `<div class="card"><b>Apuntar</b>
    <p class="dp-ayuda">Pesa lo que sobra al final de cada servicio. Apuntarlo a diario es lo que muestra a la inspección que el plan se cumple.</p>
    <div class="dp-form">
      <label>Fecha<input type="date" id="dp-fecha" value="${esc(f.fecha)}"></label>
      <label>Servicio<select id="dp-serv">${SERVICIOS.map(([k, n]) => `<option value="${k}"${f.serv === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      ${evDia.length ? `<label>Evento<select id="dp-ev"><option value="">— Ninguno —</option>${evDia.map(e => `<option value="${esc(e.id)}"${String(f.ev) === String(e.id) ? ' selected' : ''}>${esc(e.nombre)} (${e.pax} pax)</option>`).join('')}</select></label>` : ''}
      <label>Qué es<select id="dp-tipo">${TIPOS.map(([k, n]) => `<option value="${k}"${f.tipo === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      ${f.tipo === 'llevar' ? '' : `<label>A dónde va<select id="dp-dest">${DESTINOS.map(([k, n]) => `<option value="${k}"${f.dest === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`}
      <label>Kilos<input id="dp-kg" inputmode="decimal" placeholder="0,0" value="${esc(f.kg || '')}"></label>
      <label class="dp-ancho">Qué alimentos (opcional)<input id="dp-que" placeholder="Ej.: arroz, pan, guarnición de patata" value="${esc(f.que || '')}"></label>
    </div>
    <button class="btn btn-p" data-dp="guardar"><i class="ti ti-plus"></i> Apuntar</button></div>
  <div class="card"><b>Últimos registros</b>${ult.length ? ult.map(r => { const e = evDe(r.ev);
    return `<div class="dp-fila ${r.anulado ? 'dp-anul' : ''}"><div class="dp-n"><b>${kgTxt(r.kg)} · ${esc(TIPO[r.tipo] || r.tipo)}</b>
      <small>${dmy(r.fecha)} · ${esc((SERVICIOS.find(s => s[0] === r.serv) || [, r.serv])[1])}${e ? ' · ' + esc(e.nombre) : ''} · ${esc(DEST[r.dest] || r.dest)}${r.que ? ' · ' + esc(r.que) : ''}${r.por ? ' · ' + esc(r.por) : ''}${r.anulado ? ' · anulado: ' + esc(r.anulado.motivo) : ''}</small></div>
      ${r.anulado ? '' : `<button class="btn-sec dp-sm" data-dp="anular" data-id="${esc(r.id)}">Anular</button>`}</div>`; }).join('') : '<p class="dp-vacio">Todavía no hay registros.</p>'}</div>`;
}

/* ── Resumen ── */
function vRes(){
  const regs = vivos(), meses = [...new Set(regs.map(r => r.fecha.slice(0, 7)).concat([hoyK().slice(0, 7)]))].sort().reverse();
  if(!meses.includes(mesR)) mesR = meses[0];
  const delMes = regs.filter(r => r.fecha.slice(0, 7) === mesR), total = delMes.reduce((s, r) => s + (r.kg || 0), 0);
  const [y, m] = mesR.split('-').map(Number), ant = new Date(y, m - 2, 1), mesAnt = ant.getFullYear() + '-' + pad(ant.getMonth() + 1);
  const totAnt = regs.filter(r => r.fecha.slice(0, 7) === mesAnt).reduce((s, r) => s + (r.kg || 0), 0);
  const aprov = delMes.filter(r => APROVECHA.includes(r.dest)).reduce((s, r) => s + (r.kg || 0), 0);
  const suma = clave => { const o = {}; delMes.forEach(r => { o[r[clave]] = (o[r[clave]] || 0) + (r.kg || 0); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const barras = (l, nom) => { const max = Math.max(...l.map(x => x[1]), 0) || 1; return l.map(([k, v]) => `<div class="dp-bar"><div class="dp-bar-t"><span>${esc(nom[k] || k)}</span><b>${kgTxt(v)}</b></div><div class="dp-bar-f"><i style="width:${Math.max(2, v / max * 100)}%"></i></div></div>`).join(''); };
  // Eventos del mes con sobras: gramos por persona
  const porEv = {}; delMes.filter(r => r.ev && r.tipo !== 'llevar').forEach(r => { porEv[r.ev] = (porEv[r.ev] || 0) + (r.kg || 0); });
  const filasEv = Object.entries(porEv).map(([id, kg]) => { const e = evDe(id); return e && e.pax ? {e, kg, g: kg * 1000 / e.pax} : null; }).filter(Boolean).sort((a, b) => b.g - a.g);
  const media = filasEv.length ? filasEv.reduce((s, x) => s + x.kg, 0) * 1000 / filasEv.reduce((s, x) => s + x.e.pax, 0) : null;
  const dif = totAnt ? (total - totAnt) / totAnt : null;
  return `<div class="card"><div class="dp-form"><label>Mes<select id="dp-mes">${meses.map(x => `<option value="${x}"${x === mesR ? ' selected' : ''}>${nomMes(x)}</option>`).join('')}</select></label></div>
    <div class="dp-tiles">
      <div><small>Total del mes</small><b>${kgTxt(total)}</b><small>${delMes.length} registro${delMes.length === 1 ? '' : 's'}${dif != null ? ` · <span class="${dif > 0 ? 'dp-mal' : 'dp-bien'}">${dif > 0 ? '+' : ''}${Math.round(dif * 100)} % vs ${MESES[ant.getMonth()]}</span>` : ''}</small></div>
      <div><small>Aprovechado</small><b>${total ? Math.round(aprov / total * 100) : 0} %</b><small>reaprovechado, donado, animales o para llevar</small></div>
      ${media != null ? `<div><small>Sobras en eventos</small><b>${Math.round(media)} g</b><small>por persona, de media</small></div>` : ''}
    </div>
    ${delMes.length ? `<button class="btn-sec" data-dp="csv"><i class="ti ti-download"></i> Descargar CSV</button>` : ''}</div>
  ${delMes.length ? `<div class="card"><b>Por tipo</b>${barras(suma('tipo'), TIPO)}</div>
  <div class="card"><b>Por destino</b><p class="dp-ayuda">De mejor a peor según la ley: reaprovechar, donar, animales, compost, basura.</p>${barras(suma('dest'), DEST)}</div>
  ${filasEv.length ? `<div class="card"><b>Eventos con más sobras por persona</b>${filasEv.map(x => `<div class="dp-fila"><div class="dp-n"><b>${esc(x.e.nombre)}</b><small>${dmy(x.e.fecha)} · ${x.e.pax} pax · ${kgTxt(x.kg)}</small></div><b class="${x.g > 150 ? 'dp-mal' : ''}">${Math.round(x.g)} g/pax</b></div>`).join('')}<p class="dp-ayuda">Si un tipo de evento sobra mucho por persona, baja su factor de raciones en Ajustes.</p></div>` : ''}`
  : '<div class="card"><p class="dp-vacio">No hay registros en este mes.</p></div>'}`;
}

/* ── Plan de prevención ── */
function vPlan(){
  const p = D().plan, med = p.medidas || {};
  return `<div class="card"><b>Plan de prevención de pérdidas y desperdicio</b>
    <p class="dp-ayuda">La Ley 1/2025 pide a la hostelería un plan propio de prevención. Rellénalo una vez, revísalo cada año y tenlo impreso para la inspección.</p>
    <div class="dp-form">
      <label>Responsable<input data-plan="responsable" value="${esc(p.responsable || '')}" placeholder="Nombre y cargo"></label>
      <label>Fecha de revisión<input type="date" data-plan="revision" value="${esc(p.revision || hoyK())}"></label>
      <label>Objetivo de reducción<input data-plan="objetivo" value="${esc(p.objetivo || '')}" placeholder="Ej.: −20 % de kilos a la basura en 12 meses"></label>
      <label>Entidad para donar<input data-plan="entidad" value="${esc(p.entidad || '')}" placeholder="Banco de alimentos, comedor social…"></label>
      <label class="dp-ancho">Contacto de la entidad<input data-plan="contacto" value="${esc(p.contacto || '')}" placeholder="Teléfono o correo"></label>
    </div>
    ${FASES.map(([k, n]) => `<div class="dp-fase"><b>${n}</b>${PLAN_MEDIDAS[k].map((t, i) => `<label class="dp-chk"><input type="checkbox" data-med="${k}" data-i="${i}"${(med[k] || []).includes(i) ? ' checked' : ''}> ${esc(t)}</label>`).join('')}
      <label class="dp-ancho">Otras medidas<input data-plan-otras="${k}" value="${esc((p.otras || {})[k] || '')}" placeholder="Opcional"></label></div>`).join('')}
    <div class="dp-acc"><button class="btn btn-p" data-dp="imprimir-plan"><i class="ti ti-printer"></i> Imprimir el plan</button></div></div>`;
}
function htmlPlanImpreso(){
  const p = D().plan, med = p.medidas || {}, d = typeof hotelDatos === 'function' ? hotelDatos() : {nombre: ''};
  const regs = vivos(), desde = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), ult = regs.filter(r => r.fecha >= desde);
  const tot = ult.reduce((s, r) => s + (r.kg || 0), 0), aprov = ult.filter(r => APROVECHA.includes(r.dest)).reduce((s, r) => s + (r.kg || 0), 0);
  return `<h1>Plan de prevención de las pérdidas y el desperdicio alimentario</h1>
    <p><b>${esc(d.nombre || 'Establecimiento')}</b>${d.dir ? ' · ' + esc(d.dir) : ''}${d.ciudad ? ' · ' + esc(d.ciudad) : ''}<br>Ley 1/2025, de 1 de abril, de prevención de las pérdidas y el desperdicio alimentario.</p>
    <p>Responsable: <b>${esc(p.responsable || '—')}</b> · Revisión: <b>${dmy(p.revision || hoyK())}</b>${p.objetivo ? ' · Objetivo: <b>' + esc(p.objetivo) + '</b>' : ''}</p>
    ${p.entidad ? `<p>Donación de excedentes: <b>${esc(p.entidad)}</b>${p.contacto ? ' (' + esc(p.contacto) + ')' : ''}</p>` : ''}
    <h2>Medidas por fase</h2>
    ${FASES.map(([k, n]) => { const l = (med[k] || []).map(i => PLAN_MEDIDAS[k][i]).filter(Boolean).concat((p.otras || {})[k] ? [p.otras[k]] : []);
      return `<h3>${n}</h3>${l.length ? '<ul>' + l.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<p>—</p>'}`; }).join('')}
    <h2>Seguimiento (últimos 12 meses)</h2>
    <p>${ult.length} registros · ${kgTxt(tot)} en total · ${tot ? Math.round(aprov / tot * 100) : 0} % aprovechado (reaprovechado, donado, alimentación animal o para llevar).</p>
    <h2>Información al cliente</h2>
    <p>El establecimiento informa de forma visible de que el cliente puede llevarse los alimentos que no haya consumido y le facilita un envase apto para uso alimentario sin coste.</p>`;
}
/* ── Cartel ── */
function htmlCartel(){
  const n = typeof hN === 'function' ? hN() : '';
  return `<div class="dp-cartel"><div class="dp-cartel-t">¿No ha terminado?</div><div class="dp-cartel-s">Llévese lo que no haya consumido.<br>Le damos el envase <b>gratis</b>.</div>
    <div class="dp-cartel-p">Pídaselo a nuestro personal.</div><div class="dp-cartel-n">${esc(n === 'nuestro restaurante' ? '' : n)} · Ley 1/2025 de prevención del desperdicio alimentario</div></div>`;
}
function vCartel(){
  return `<div class="card"><b>Cartel del envase para llevar</b><p class="dp-ayuda">La ley obliga a informar de forma visible. Imprímelo y ponlo en la entrada, en la barra o en la carta.</p>
    ${htmlCartel()}<div class="dp-acc"><button class="btn btn-p" data-dp="imprimir-cartel"><i class="ti ti-printer"></i> Imprimir el cartel</button></div></div>`;
}
function imprimir(html, apaisado){
  let z = ge('dp-print'); if(!z){ z = document.createElement('div'); z.id = 'dp-print'; document.body.appendChild(z); }
  z.innerHTML = html; z.className = apaisado ? 'dp-print-cartel' : '';
  document.body.classList.add('dp-imprimiendo');
  const fin = () => { document.body.classList.remove('dp-imprimiendo'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  window.print();
  setTimeout(fin, 1500);
}

/* ── Pintar y acciones ── */
const VISTAS = [['reg','Registrar'],['res','Resumen'],['plan','Plan de prevención'],['cartel','Cartel']];
function pintar(){
  const root = ge('dp-root'); if(!root) return;
  const f = {reg: vReg, res: vRes, plan: vPlan, cartel: vCartel}[vista];
  root.innerHTML = `<div class="dp-tabs" role="tablist">${VISTAS.map(([k, t]) => `<button role="tab" aria-selected="${k === vista}" class="${k === vista ? 'on' : ''}" data-dpv="${k}">${t}</button>`).join('')}</div>
    ${msg ? `<div class="hz-aviso ${msg.startsWith('!') ? 'warn' : 'ok'}">${esc(msg.replace(/^!/, ''))}</div>` : ''}${f()}`;
  msg = '';
}
const aviso = t => { msg = t; pintar(); };
function leerForm(){
  const v = id => (ge(id) || {}).value;
  abiertoForm = {fecha: v('dp-fecha') || hoyK(), serv: v('dp-serv') || 'comida', ev: v('dp-ev') || '', tipo: v('dp-tipo') || 'plato',
    dest: v('dp-dest') || abiertoForm.dest || 'basura', kg: v('dp-kg') || '', que: v('dp-que') || ''};
}
function csv(){
  const filas = [['Fecha','Servicio','Evento','Tipo','Destino','Kilos','Alimentos','Apuntado por','Anulado']].concat(D().reg.map(r => {
    const e = evDe(r.ev); return [r.fecha, r.serv, e ? e.nombre : '', TIPO[r.tipo] || r.tipo, DEST[r.dest] || r.dest, String(r.kg).replace('.', ','), r.que || '', r.por || '', r.anulado ? r.anulado.motivo : ''];
  }));
  const t = '﻿' + filas.map(f => f.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], {type: 'text/csv'})); a.download = `desperdicio-${mesR || hoyK()}.csv`; a.click();
}
function accion(a, b){
  if(a === 'guardar'){
    leerForm(); const kg = num(abiertoForm.kg);
    if(!(kg > 0)) return aviso('!Escribe los kilos (por ejemplo 1,5).');
    const r = {id: uid(), f: new Date().toISOString(), fecha: abiertoForm.fecha, serv: abiertoForm.serv, tipo: abiertoForm.tipo,
      dest: abiertoForm.tipo === 'llevar' ? 'cliente' : abiertoForm.dest, kg: Math.round(kg * 1000) / 1000, que: abiertoForm.que.trim(), por: yo()};
    if(abiertoForm.ev) r.ev = abiertoForm.ev;
    D().reg.push(r); guardar();
    abiertoForm = {...abiertoForm, kg: '', que: ''};
    return aviso(`Apuntado: ${kgTxt(r.kg)}.`);
  }
  if(a === 'anular'){
    const r = D().reg.find(x => x.id === b.dataset.id); if(!r) return;
    const motivo = (prompt('¿Por qué anulas este registro? (queda constancia)') || '').trim(); if(!motivo) return;
    r.anulado = {por: yo(), f: new Date().toISOString(), motivo}; guardar(); return aviso('Registro anulado.');
  }
  if(a === 'csv') return csv();
  if(a === 'imprimir-plan') return imprimir(htmlPlanImpreso(), false);
  if(a === 'imprimir-cartel') return imprimir(htmlCartel(), true);
}

let enlazado = false;
window.initDesperdicio = function(){
  const root = ge('dp-root'); if(!root) return;
  if(!ge('dp-css')){ const st = document.createElement('style'); st.id = 'dp-css'; st.textContent = CSS; document.head.appendChild(st); }
  if(!enlazado){
    enlazado = true;
    root.addEventListener('click', e => {
      const v = e.target.closest('[data-dpv]'); if(v){ if(vista === 'reg') leerForm(); vista = v.dataset.dpv; return pintar(); }
      const b = e.target.closest('[data-dp]'); if(b) accion(b.dataset.dp, b);
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if(t.id === 'dp-fecha' || t.id === 'dp-tipo'){ leerForm(); return pintar(); }
      if(t.id === 'dp-mes'){ mesR = t.value; return pintar(); }
      const p = D().plan;
      if(t.dataset.plan){ p[t.dataset.plan] = t.value.trim(); return guardar(); }
      if(t.dataset.planOtras){ p.otras = p.otras || {}; p.otras[t.dataset.planOtras] = t.value.trim(); return guardar(); }
      if(t.dataset.med){ p.medidas = p.medidas || {}; const l = new Set(p.medidas[t.dataset.med] || []), i = +t.dataset.i; t.checked ? l.add(i) : l.delete(i); p.medidas[t.dataset.med] = [...l].sort(); return guardar(); }
    });
  }
  pintar();
};
// Desde la nube (cargarNube): se toma lo de la nube y se repinta si está a la vista
window.desperdicioDesdeNube = function(v){
  if(v && typeof v === 'object'){ desperdicio = v; try{ localStorage.setItem('seda_desperdicio', JSON.stringify(v)); }catch(e){} }
  const r = ge('dp-root'); if(r && r.offsetParent !== null) pintar();
};

const CSS = `#dp-root .card{margin-bottom:10px}
.dp-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:10px;padding-bottom:2px}
.dp-tabs button{border:.5px solid var(--border);background:var(--bg-primary);color:var(--text-secondary);border-radius:999px;padding:6px 12px;font-size:13px;white-space:nowrap;cursor:pointer}
.dp-tabs button.on{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.dp-ayuda{font-size:12px;color:var(--text-secondary);margin:4px 0 8px}
.dp-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:8px 0}
.dp-form label,.dp-fase label.dp-ancho{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary);min-width:0}
.dp-ancho{grid-column:1/-1}
.dp-fila{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 0;border-top:.5px solid var(--border)}
.dp-n{flex:1;min-width:150px;display:flex;flex-direction:column;gap:2px}.dp-n small{font-size:12px;color:var(--text-secondary)}
.dp-anul .dp-n b{text-decoration:line-through;color:var(--text-tertiary)}
.dp-sm{padding:3px 8px;font-size:12px}
.dp-vacio{color:var(--text-secondary);font-size:13px;text-align:center;margin:8px 0}
.dp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:4px 0 10px}
.dp-tiles div{background:var(--bg-secondary);border-radius:var(--radius);padding:8px 10px;display:flex;flex-direction:column;gap:2px}.dp-tiles small{font-size:11px;color:var(--text-secondary)}.dp-tiles b{font-size:18px;font-variant-numeric:tabular-nums}
.dp-bar{padding:7px 0;border-top:.5px solid var(--border)}.dp-bar-t{display:flex;justify-content:space-between;gap:8px;font-size:13px}.dp-bar-t b{white-space:nowrap;font-variant-numeric:tabular-nums}
.dp-bar-f{height:6px;border-radius:3px;background:var(--bg-secondary);margin-top:4px;overflow:hidden}.dp-bar-f i{display:block;height:100%;background:#4f8a5b;border-radius:3px}
.dp-mal{color:var(--danger-text)}.dp-bien{color:var(--success-text)}
.dp-fase{padding:10px 0;border-top:.5px solid var(--border);display:grid;gap:6px}
.dp-chk{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4}.dp-chk input{width:auto;margin-top:2px;flex-shrink:0}
.dp-acc{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.dp-cartel{border:3px solid var(--text-primary);border-radius:14px;padding:22px 18px;text-align:center;margin:8px 0;background:var(--bg-primary)}
.dp-cartel-t{font-size:28px;font-weight:800;line-height:1.1}.dp-cartel-s{font-size:19px;margin:10px 0}.dp-cartel-p{font-size:15px;color:var(--text-secondary)}.dp-cartel-n{font-size:11px;color:var(--text-secondary);margin-top:14px}
#dp-print{display:none}
@media print{
  body.dp-imprimiendo>*:not(#dp-print){display:none!important}
  body.dp-imprimiendo #dp-print{display:block;color:#000;font:12pt/1.45 system-ui,sans-serif;padding:0 8mm}
  #dp-print h1{font-size:18pt;margin:0 0 6pt}#dp-print h2{font-size:13pt;margin:14pt 0 4pt}#dp-print h3{font-size:11pt;margin:8pt 0 2pt}
  #dp-print.dp-print-cartel .dp-cartel{border-width:6px;padding:40mm 14mm;min-height:150mm;display:flex;flex-direction:column;justify-content:center}
  #dp-print.dp-print-cartel .dp-cartel-t{font-size:54pt}#dp-print.dp-print-cartel .dp-cartel-s{font-size:30pt}#dp-print.dp-print-cartel .dp-cartel-p{font-size:20pt}#dp-print.dp-print-cartel .dp-cartel-n{font-size:11pt}
}`;
})();
