/* ══════════════════════════════════════
   OÍDO COCINA · Producción conjunta
   Junta varios eventos y suma TODO lo que hay que producir: platos (raciones), elaboraciones base e ingredientes
   (peso bruto), con las alergias de cada evento. Se marcan los eventos que se quieren producir juntos (casillas),
   se puede buscar por día, por semana o elegir a mano, y se imprime una hoja A4.
   Sustituye a initConjunta / renderConjunta / buildConjunta de index.html (se carga después).
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const H = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sel = new Set();      // ids de eventos marcados
let actuales = [];        // eventos que se están mostrando (para imprimir)
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
  const sinReceta = [], ings = calcIngredientesPedido(actuales, sinReceta);
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
  if(typeof htmlElaboracionesBase === 'function') html += htmlElaboracionesBase(actuales);
  if(ings.length){
    const por = {}; ings.forEach(i => { (por[i.cat || 'Otros'] = por[i.cat || 'Otros'] || []).push(i); });
    html += `<div class="card" style="padding:0;overflow-x:auto;margin-bottom:10px"><div style="padding:10px 12px 4px;font-size:13px;font-weight:500"><i class="ti ti-basket"></i> Ingredientes en total (peso bruto)</div><table class="ptable"><thead><tr><th>Ingrediente</th><th style="text-align:right">Total</th></tr></thead><tbody>${Object.keys(por).sort().map(c => `<tr><td colspan="2" class="cat-hdr">${H(c)}</td></tr>` + por[c].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(i => { const f = fmtCant(i.total, i.ud); return `<tr><td>${H(i.nombre)}</td><td style="text-align:right;font-weight:500;white-space:nowrap">${f.txt} ${H(f.ud || '')}</td></tr>`; }).join('')).join('')}</tbody></table></div>`;
  }
  if(sinReceta.length) html += avisoSinReceta(sinReceta);
  html += `<div class="no-print" style="margin:12px 0"><button type="button" class="btn-print" onclick="imprimirConjunta()"><i class="ti ti-printer"></i> Imprimir producción conjunta</button></div>`;
  cont.innerHTML = html;
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
