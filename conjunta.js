/* ══════════════════════════════════════
   OÍDO COCINA · Producción conjunta
   Junta varios eventos y suma las RACIONES de cada plato, con las alergias de cada evento. Se marcan los eventos
   se puede buscar por día, por semana o elegir a mano, y se imprime una hoja A4.
   Sustituye a initConjunta / renderConjunta / buildConjunta de index.html (se carga después).
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const H = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sel = new Set();      // ids de eventos marcados
let actuales = [], ultimo = null;        // eventos que se están mostrando (para imprimir)
const pad = n => String(n).padStart(2, '0');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

function css(){
  if(ge('cj-css')) return;
  const s = document.createElement('style'); s.id = 'cj-css';
  s.textContent = `.cj-lista{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto;margin-top:6px}
.cj-fila{display:flex;align-items:center;gap:10px;min-height:44px;padding:6px 10px;border:.5px solid var(--border);border-radius:var(--radius);background:var(--bg-primary);cursor:pointer;font-size:13px}
.cj-fila input{width:22px;height:22px;flex:0 0 auto;accent-color:#1D9E75}
.cj-fila.sel{background:var(--success-bg);border-color:var(--success-text)}
.cj-fila small{color:var(--text-secondary);display:block}
.cj-acc{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.cj-acc .cj-n{font-size:12px;color:var(--text-secondary);flex:1;min-width:120px}
@media print{
  body.imp-conj #tab-conjunta{display:block!important}
  body.imp-conj #tab-produccion,body.imp-conj #conj-ctrl{display:none!important}
  body.imp-conj #tab-conjunta .ptable{min-width:0}
}`;
  document.head.appendChild(s);
}

// Eventos que entran según el modo (día y semana: los de esa fecha, desmarcables con las casillas)
function candidatos(){
  const modo = ge('conj-modo').value;
  if(modo === 'dia'){ const f = ge('conj-fecha').value; return f ? eventos.filter(e => e.fecha === f) : []; }
  if(modo === 'semana'){
    const f = ge('conj-semana').value; if(!f) return [];
    const r = getWeekRange(f); return eventos.filter(e => { const d = new Date(e.fecha + 'T00:00:00'); return d >= r.lunes && d <= r.domingo; });
  }
  return eventos.slice();
}

window.initConjunta = function(){
  css();
  const t = hoyISO(); ge('conj-fecha').value = t; ge('conj-semana').value = t;
  const m = ge('conj-modo'); if(m) m.value = 'seleccion';
  const card = ge('conj-selector') && ge('conj-selector').parentNode; if(card) card.id = 'conj-ctrl';
  sel = new Set();
  renderConjunta();
};

window.renderConjunta = function(){
  css();
  const modo = ge('conj-modo').value;
  ge('conj-fecha-wrap').style.display = modo === 'dia' ? 'block' : 'none';
  ge('conj-semana-wrap').style.display = modo === 'semana' ? 'block' : 'none';
  const caja = ge('conj-selector'); caja.style.display = 'block';
  const lista = candidatos().slice().sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  if(modo !== 'seleccion') sel = new Set(lista.map(e => e.id)); // día/semana: todos marcados de salida
  else { const hoy = hoyISO(); lista.sort((a, b) => ((a.fecha < hoy) - (b.fecha < hoy)) || (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''))); } // los próximos primero
  caja.innerHTML = !lista.length ? '<p style="font-size:13px;color:var(--text-secondary);margin:6px 0 0">No hay eventos en esta fecha.</p>' :
    `<p style="font-size:12px;color:var(--text-secondary);margin:0">Marca los eventos que quieres producir juntos:</p>
     <div class="cj-lista">${lista.map(e => `<label class="cj-fila${sel.has(e.id) ? ' sel' : ''}"><input type="checkbox" data-cj="${H(e.id)}"${sel.has(e.id) ? ' checked' : ''}><span><b>${H(e.nombre)}</b><small>${fmtFecha(e.fecha)}${e.hora ? ' · ' + H(e.hora) : ''} · ${e.pax} pax · ${(e.platos || []).length} platos</small></span></label>`).join('')}</div>
     <div class="cj-acc"><button type="button" class="btn-sec" data-cj-todos="1">Marcar todos</button><button type="button" class="btn-sec" data-cj-todos="0">Quitar todos</button><span class="cj-n"></span></div>`;
  caja.onchange = e => {
    const c = e.target.closest('[data-cj]'); if(!c) return;
    const ev = lista.find(x => String(x.id) === c.dataset.cj); if(!ev) return;
    if(c.checked) sel.add(ev.id); else sel.delete(ev.id);
    c.closest('.cj-fila').classList.toggle('sel', c.checked); pintar(lista);
  };
  caja.onclick = e => {
    const b = e.target.closest('[data-cj-todos]'); if(!b) return;
    sel = b.dataset.cjTodos === '1' ? new Set(lista.map(x => x.id)) : new Set();
    caja.querySelectorAll('[data-cj]').forEach(c => { c.checked = sel.size > 0; c.closest('.cj-fila').classList.toggle('sel', c.checked); });
    pintar(lista);
  };
  pintar(lista);
};

function pintar(lista){
  const evs = lista.filter(e => sel.has(e.id));
  const n = ge('conj-selector').querySelector('.cj-n'); if(n) n.textContent = evs.length ? evs.length + ' marcado' + (evs.length > 1 ? 's' : '') : 'Ninguno marcado';
  buildConjunta(evs);
}

window.buildConjunta = function(evs){
  const cont = ge('conj-cont'); actuales = evs || [];
  if(!actuales.length){ cont.innerHTML = '<div class="empty">Marca al menos un evento para ver la producción conjunta.</div>'; return; }
  // Platos: se suman por nombre (la misma carta en varios eventos)
  const map = {};
  actuales.forEach(ev => {
    const qty = Math.round((ev.pax || 0) * getFactorEvento(ev));
    (ev.platos || []).forEach(p => {
      const k = String(p.nombre || '').toLowerCase().trim(); if(!k) return;
      if(!map[k]) map[k] = {cat: p.cat, nombre: p.nombre, alg: [], total: 0, det: []};
      (p.alg || []).forEach(a => { if(!map[k].alg.includes(a)) map[k].alg.push(a); });
      map[k].total += qty; map[k].det.push({ev: ev.nombre, qty});
    });
  });
  const merged = Object.values(map);
  const totalPax = actuales.reduce((s, e) => s + (e.pax || 0), 0);
  const totalRac = merged.reduce((s, p) => s + p.total, 0);
  const todosAlerg = [...new Set(actuales.flatMap(e => e.alergenos_menu || []))];
  const alergC = actuales.filter(e => algHay(e.alergias_txt)).map(e => `<b>${H(e.nombre)}:</b> ${H(e.alergias_txt)}`).join('<br>');
  ultimo = {evs: actuales, merged, totalPax, totalRac, alerg: actuales.filter(e => algHay(e.alergias_txt)).map(e => e.nombre + ": " + e.alergias_txt)};
  let html = `<div class="stat-g"><div class="stat"><div class="stat-l">Eventos</div><div class="stat-v">${actuales.length}</div></div><div class="stat"><div class="stat-l">Pax total</div><div class="stat-v">${totalPax}</div></div><div class="stat"><div class="stat-l">Platos distintos</div><div class="stat-v">${merged.length}</div></div><div class="stat"><div class="stat-l">Raciones totales</div><div class="stat-v">${totalRac}</div></div></div>`;
  html += `<div class="card" style="margin-bottom:10px;font-size:13px;line-height:1.7"><b>Se produce junto:</b><br>${actuales.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(e => `${fmtFecha(e.fecha)}${e.hora ? ' ' + H(e.hora) : ''} · ${H(e.nombre)} · ${e.pax} pax`).join('<br>')}</div>`;
  if(alergC) html += `<div class="card" style="border:.5px solid var(--warn-text);margin-bottom:10px"><div style="font-size:13px;font-weight:500;color:var(--warn-text);margin-bottom:4px"><i class="ti ti-alert-triangle"></i> Alergias (todos los eventos)</div><div style="font-size:13px;line-height:1.7">${alergC}</div></div>`;
  if(todosAlerg.length) html += `<div class="card" style="margin-bottom:10px"><div style="font-size:13px;font-weight:500;margin-bottom:5px"><i class="ti ti-shield-check"></i> Alérgenos presentes</div><div>${todosAlerg.map(a => `<span class="alg-tag">${algIcon(a)} ${algLabel(a)}</span>`).join('')}</div></div>`;
  html += `<div class="card" style="padding:0;overflow-x:auto;margin-bottom:10px"><div style="padding:10px 12px 4px;font-size:13px;font-weight:500"><i class="ti ti-tools-kitchen-2"></i> Platos: raciones a producir</div><table class="ptable"><thead><tr><th>Plato</th><th>Alérgenos</th><th style="text-align:right">Total</th><th style="text-align:right;font-size:11px">Desglose</th></tr></thead><tbody>`;
  const claves = CATS.map(c => c.key), otros = merged.filter(p => !claves.includes(p.cat));
  CATS.concat(otros.length ? [{key: '__otros', label: 'Otros', color: '#888'}] : []).forEach(cat => {
    const items = (cat.key === '__otros' ? otros : merged.filter(p => p.cat === cat.key)).sort((a, b) => b.total - a.total); if(!items.length) return;
    html += `<tr><td colspan="4" class="cat-hdr" style="border-left:3px solid ${cat.color}">${cat.label}</td></tr>`;
    items.forEach(p => { html += `<tr><td style="font-weight:500">${H(p.nombre)}</td><td>${(p.alg || []).map(a => `<span class="alg-tag">${algIcon(a)} ${algLabel(a)}</span>`).join('') || '—'}</td><td style="text-align:right;font-size:18px;font-weight:500">${p.total}</td><td style="text-align:right;font-size:11px;color:var(--text-secondary)">${p.det.map(d => `${H(d.ev)}: ${d.qty}`).join(' · ')}</td></tr>`; });
  });
  html += '</tbody></table></div>';
  html += `<div class="no-print" style="margin:12px 0"><button type="button" class="btn-print" onclick="imprimirConjunta()"><i class="ti ti-printer"></i> Imprimir</button> <button type="button" class="btn-print" onclick="enviarConjunta()" style="background:#1D9E75"><i class="ti ti-brand-whatsapp"></i> Enviar archivo (WhatsApp)</button></div>`;
  cont.innerHTML = html;
};

// ── Enviar como archivo (PDF en segundo plano con cola.js; «Enviar» abre el menú del móvil: WhatsApp, correo…) ──
let cargando = null;
const cargar = src => new Promise((ok, mal) => { const e = document.createElement('script'); e.src = src; e.onload = ok; e.onerror = () => mal(new Error('sin conexión')); document.head.appendChild(e); });
function libs(){
  if(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
  return cargando = cargando || cargar('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js').then(() => cargar('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js')).catch(e => { cargando = null; throw e; });
}
async function crearPdf(u, progreso, ceder){
  progreso(10, 'Preparando el creador de PDF…'); await libs(); progreso(40, 'Armando la hoja…'); await ceder();
  const doc = new window.jspdf.jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  const h = typeof hotelDatos === 'function' ? hotelDatos() : {};
  const f = u.evs.map(e => e.fecha).sort(), rango = f[0] === f[f.length - 1] ? fmtFecha(f[0]) : fmtFecha(f[0]) + ' - ' + fmtFecha(f[f.length - 1]);
  doc.setFontSize(14); doc.text('Producción conjunta · ' + rango, 10, 14);
  doc.setFontSize(9); doc.text([h.nombre, h.ciudad].filter(Boolean).join(' · ') + '  ·  ' + u.totalPax + ' pax  ·  ' + u.totalRac + ' raciones', 10, 19);
  let y = 24;
  doc.setFontSize(8.5);
  u.evs.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(e => { doc.text(`${fmtFecha(e.fecha)}${e.hora ? ' ' + e.hora : ''} · ${e.nombre} · ${e.pax} pax`, 10, y); y += 4.5; });
  if(u.alerg.length){ doc.setTextColor(170, 60, 0); u.alerg.forEach(l => { const p = doc.splitTextToSize('ALERGIAS · ' + l, 190); doc.text(p, 10, y + 1); y += p.length * 4 + 1; }); doc.setTextColor(0); }
  progreso(65, 'Dibujando la tabla…'); await ceder();
  const filas = [], claves = CATS.map(c => c.key);
  CATS.concat([{key: '__otros', label: 'Otros'}]).forEach(cat => {
    const it = u.merged.filter(p => cat.key === '__otros' ? !claves.includes(p.cat) : p.cat === cat.key).sort((a, b) => b.total - a.total); if(!it.length) return;
    filas.push([{content: cat.label, colSpan: 3, styles: {fillColor: [232, 232, 232], fontStyle: 'bold'}}]);
    it.forEach(p => filas.push([p.nombre, {content: String(p.total), styles: {halign: 'right', fontStyle: 'bold', fontSize: 11}}, p.det.map(d => d.ev + ': ' + d.qty).join(' · ')]));
  });
  doc.autoTable({head: [['Plato', 'Raciones', 'Desglose']], body: filas, startY: y + 3, theme: 'grid', margin: {left: 10, right: 10}, styles: {fontSize: 9, cellPadding: 1.6}, headStyles: {fillColor: [60, 60, 60]}, columnStyles: {1: {cellWidth: 24}, 2: {cellWidth: 60, fontSize: 7}}});
  progreso(95, 'Guardando el archivo…');
  return {blob: doc.output('blob'), nom: 'produccion-conjunta-' + f[0] + '.pdf', titulo: 'Producción conjunta · ' + rango};
}
const puedeCompartir = r => { try{ return !!(navigator.canShare && navigator.canShare({files: [new File([r.blob], r.nom, {type: 'application/pdf'})]})); }catch(e){ return false; } };
async function compartir(r){
  try{ await navigator.share({files: [new File([r.blob], r.nom, {type: 'application/pdf'})], title: r.titulo}); return 'Enviado desde el menú del móvil.'; }
  catch(e){ if(e && e.name === 'AbortError') return 'Envío cancelado. Puedes volver a pulsar «Enviar».'; return descargar(r); }
}
function descargar(r){
  const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = r.nom; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return 'PDF descargado: ' + r.nom + '. Ya puedes enviarlo por WhatsApp.';
}
window.enviarConjunta = function(){
  if(!ultimo || !ultimo.evs.length) return;
  const u = JSON.parse(JSON.stringify({evs: ultimo.evs.map(e => ({fecha: e.fecha, hora: e.hora, nombre: e.nombre, pax: e.pax})), merged: ultimo.merged, totalPax: ultimo.totalPax, totalRac: ultimo.totalRac, alerg: ultimo.alerg}));
  const ERR = 'No se ha podido crear el archivo. Comprueba la conexión (la primera vez se descarga el creador de PDF) o usa «Imprimir» → «Guardar como PDF».';
  if(typeof window.colaTarea !== 'function'){ crearPdf(u, () => {}, () => Promise.resolve()).then(async r => alert(puedeCompartir(r) ? await compartir(r) : descargar(r))).catch(() => alert(ERR)); return; }
  window.colaTarea({titulo: 'Producción conjunta · ' + u.evs.length + ' evento' + (u.evs.length > 1 ? 's' : ''),
    ejecutar: (progreso, ceder) => crearPdf(u, progreso, ceder),
    listo: r => ({texto: 'PDF listo · ' + Math.max(1, Math.round(r.blob.size / 1024)) + ' KB', acciones: [...(puedeCompartir(r) ? [{t: 'Enviar por WhatsApp…', primaria: true, fn: compartir}] : []), {t: 'Descargar', primaria: !puedeCompartir(r), fn: descargar}]}),
    alFallar: () => ERR});
};

window.imprimirConjunta = function(){
  if(!actuales.length) return;
  const d = new Date(), fechas = actuales.map(e => e.fecha).sort();
  const rango = fechas[0] === fechas[fechas.length - 1] ? fmtFecha(fechas[0]) : fmtFecha(fechas[0]) + ' – ' + fmtFecha(fechas[fechas.length - 1]);
  const el = ge('print-fecha-gen'), el2 = ge('print-date-foot');
  if(el) el.innerHTML = `<div style="font-size:14px;font-weight:bold">PRODUCCIÓN CONJUNTA · ${actuales.length} evento${actuales.length > 1 ? 's' : ''}</div><div>${rango}</div><div>${actuales.reduce((s, e) => s + (e.pax || 0), 0)} pax</div>`;
  if(el2) el2.textContent = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  document.body.classList.add('imp-conj');
  const fin = () => { document.body.classList.remove('imp-conj'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  window.print();
};
})();
