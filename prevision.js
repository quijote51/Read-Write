/* ══════════════════════════════════════
   OÍDO COCINA · Previsión de producción (módulo base)
   Aprende de los eventos ya hechos para no producir de más ni de menos.
   - Después de cada evento, en Producción: «¿Cómo fue?» → cuántas personas vinieron de verdad y, plato a plato,
     si sobró, fue justo o faltó. Se guarda en config 'seda_prevision':
     { cierres: { <id del evento>: {pax, pax_real, f, tipo, fecha, platos:{<nombre en minúsculas>: 'sobra'|'justo'|'falta'}, nota, por, t} } }
   - Antes de un evento, en Producción: «Previsión» → con los eventos cerrados del mismo tipo de servicio
     (si hay menos de 3, con todos): qué parte de lo contratado suele venir, cómo fue cada plato otras veces
     (sobró → 10 % menos; faltó → 10 % más), sobras en kg por persona (de Desperdicio) y las unidades sugeridas.
     Con menos de 3 eventos cerrados se avisa de que aún hay pocos datos.
   - Campana: eventos de los últimos 14 días sin cerrar (prevSinCerrar).
   Usa del principal: eventos, CATS, getFactorEvento, getTipoById, escH, fmtFecha, syncConfig, renderProd,
   puedeConfig (equipo.js) y desperdicio (desperdicio.js).
   ══════════════════════════════════════ */
let prevision = (() => { try{ return JSON.parse(localStorage.getItem('seda_prevision') || 'null'); }catch(e){ return null; } })();
(function(){
const PV_MIN = 3, PV_AJUSTE = 0.10, PV_DIAS = 14;
const P = () => {
  if(!prevision || typeof prevision !== 'object') prevision = {cierres: {}};
  if(!prevision.cierres || typeof prevision.cierres !== 'object') prevision.cierres = {};
  return prevision;
};
const pad = n => String(n).padStart(2, '0');
const hoyK = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const norm = s => String(s || '').trim().toLowerCase();
const e_ = s => typeof escH === 'function' ? escH(s) : String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct = v => Math.round(v * 100) + ' %';
const evs = () => (typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : []);
const factor = ev => typeof getFactorEvento === 'function' ? getFactorEvento(ev) : 1;
const tipoNom = id => typeof getTipoById === 'function' ? getTipoById(id).nombre : id;
const puedo = () => typeof puedeConfig !== 'function' || puedeConfig('seda_prevision');
const cierreDe = ev => P().cierres[String(ev.id)] || null;
const paxDe = ev => (parseInt(ev.pax) || 0);

function guardar(){
  try{ localStorage.setItem('seda_prevision', JSON.stringify(P())); }catch(e){}
  if(typeof syncConfig === 'function') syncConfig('seda_prevision', P());
}

// Eventos ya pasados (hasta hoy incluido), de los últimos días, con platos y sin cerrar
window.prevSinCerrar = function(){
  const hoy = hoyK(), d = new Date(); d.setDate(d.getDate() - PV_DIAS); const desde = hoyK(d);
  return evs().filter(e => e.fecha && e.fecha <= hoy && e.fecha >= desde && paxDe(e) > 0 && (e.platos || []).length && !cierreDe(e));
};

// Datos aprendidos para un evento: cierres del mismo tipo (o todos si hay pocos), sin contar el propio evento
function aprendido(ev){
  const todos = Object.entries(P().cierres).filter(([id, c]) => id !== String(ev.id) && c && c.pax > 0 && c.pax_real >= 0);
  const mismos = todos.filter(([, c]) => c.tipo === ev.tipo);
  const base = mismos.length >= PV_MIN ? mismos : todos;
  const sPax = base.reduce((s, [, c]) => s + c.pax, 0), sReal = base.reduce((s, [, c]) => s + c.pax_real, 0);
  const asist = base.length && sPax ? Math.min(1.2, Math.max(0.5, sReal / sPax)) : 1;
  // Sobras de Desperdicio (sobras de los platos y preparado sin servir) de esos eventos
  let kg = 0, paxKg = 0;
  const reg = typeof desperdicio !== 'undefined' && desperdicio && Array.isArray(desperdicio.reg) ? desperdicio.reg : [];
  base.forEach(([id, c]) => {
    const r = reg.filter(x => !x.anulado && String(x.ev) === id && (x.tipo === 'plato' || x.tipo === 'produccion'));
    if(r.length){ kg += r.reduce((s, x) => s + (parseFloat(x.kg) || 0), 0); paxKg += c.pax_real || c.pax; }
  });
  // Cada plato: cómo fue en todos los eventos cerrados (el plato es el mismo aunque cambie el tipo de servicio)
  const platos = {};
  todos.forEach(([, c]) => Object.entries(c.platos || {}).forEach(([n, v]) => {
    const p = platos[n] || (platos[n] = {sobra: 0, justo: 0, falta: 0});
    if(p[v] != null) p[v]++;
  }));
  return {n: base.length, mismoTipo: base === mismos && mismos.length > 0, asist, gPax: paxKg ? kg * 1000 / paxKg : null, platos};
}
function ajustePlato(h){
  if(!h) return 0;
  const n = h.sobra + h.justo + h.falta;
  if(n < 2) return 0;
  const s = (h.falta - h.sobra) / n;
  return s >= 0.5 ? PV_AJUSTE : s <= -0.5 ? -PV_AJUSTE : 0;
}
function textoHist(h){
  if(!h) return 'sin datos';
  return [[h.sobra, 'sobró'], [h.justo, 'justo'], [h.falta, 'faltó']].filter(x => x[0]).map(x => `${x[1]} ${x[0]}`).join(' · ');
}

// Tarjeta para Producción
window.htmlPrevision = function(ev){
  if(!ev || !paxDe(ev) || !(ev.platos || []).length) return '';
  const hoy = hoyK(), c = cierreDe(ev);
  if(ev.fecha && ev.fecha <= hoy) return c && !editando[ev.id] ? htmlCerrado(ev, c) : htmlCerrar(ev, c);
  return htmlPrever(ev);
};
const editando = {};

function htmlPrever(ev){
  const a = aprendido(ev), f = factor(ev), pax = paxDe(ev);
  const pocos = a.n < PV_MIN;
  const cab = `<div class="pv-cab"><i class="ti ti-chart-line"></i> Previsión <small>${a.n ? `con ${a.n} evento${a.n === 1 ? '' : 's'} cerrado${a.n === 1 ? '' : 's'}${a.mismoTipo ? ' de ' + e_(tipoNom(ev.tipo)) : ''}` : 'sin datos todavía'}</small></div>`;
  if(!a.n) return `<div class="card pv no-print">${cab}<p class="pv-ayuda">Cuando pasen los eventos, apunta en Producción cuántos vinieron y si sobró o faltó cada plato. Con ${PV_MIN} eventos cerrados empezará a sugerir cantidades.</p></div>`;
  const filas = ev.platos.map(p => {
    const h = a.platos[norm(p.nombre)], aj = ajustePlato(h);
    const actual = Math.round(pax * f), sug = Math.max(1, Math.round(pax * a.asist * f * (1 + aj)));
    return `<tr><td>${e_(p.nombre)}<div class="pv-h">${textoHist(h)}</div></td><td class="pv-n">${actual}</td><td class="pv-n"><b class="${sug < actual ? 'pv-menos' : sug > actual ? 'pv-mas' : ''}">${sug}</b></td></tr>`;
  }).join('');
  const personas = Math.round(pax * a.asist);
  return `<div class="card pv no-print">${cab}
    ${pocos ? `<p class="pv-aviso"><i class="ti ti-info-circle"></i> Aún hay pocos datos (${a.n} de ${PV_MIN}). Tómalo solo como orientación.</p>` : ''}
    <div class="pv-datos"><div><small>Suele venir</small><b>${pct(a.asist)}</b><small>de lo contratado → ${personas} de ${pax}</small></div>
    ${a.gPax != null ? `<div><small>Sobras</small><b>${Math.round(a.gPax)} g</b><small>por persona (Desperdicio)</small></div>` : ''}</div>
    <div><table class="pv-t"><thead><tr><th>Plato</th><th style="text-align:right">Ahora</th><th style="text-align:right">Sugerido</th></tr></thead><tbody>${filas}</tbody></table></div>
    <p class="pv-ayuda">Sugerido = personas que suelen venir × factor ${String(f).replace('.', ',')}; si un plato sobró casi siempre, 10 % menos, y si faltó, 10 % más. Para cambiarlo, ajusta el factor del evento.</p></div>`;
}

function htmlCerrado(ev, c){
  const lista = (ev.platos || []).map(p => ({n: p.nombre, v: (c.platos || {})[norm(p.nombre)] || 'justo'}));
  const sobra = lista.filter(x => x.v === 'sobra').map(x => x.n), falta = lista.filter(x => x.v === 'falta').map(x => x.n);
  return `<div class="card pv no-print"><div class="pv-cab"><i class="ti ti-circle-check"></i> Evento cerrado <small>${c.por ? 'por ' + e_(c.por) : ''}</small></div>
    <p class="pv-linea">Vinieron <b>${c.pax_real}</b> de ${c.pax} (${pct(c.pax ? c.pax_real / c.pax : 1)}).</p>
    ${sobra.length ? `<p class="pv-linea">Sobró: ${sobra.map(e_).join(', ')}</p>` : ''}
    ${falta.length ? `<p class="pv-linea">Faltó: ${falta.map(e_).join(', ')}</p>` : ''}
    ${!sobra.length && !falta.length ? '<p class="pv-linea">Todo justo.</p>' : ''}
    ${c.nota ? `<p class="pv-linea">${e_(c.nota)}</p>` : ''}
    ${puedo() ? `<button type="button" class="pv-btn2" onclick="prevEditar(${JSON.stringify(String(ev.id)).replace(/"/g, '&quot;')})">Cambiar</button>` : ''}</div>`;
}

function htmlCerrar(ev, c){
  if(!puedo()) return `<div class="card pv no-print"><div class="pv-cab"><i class="ti ti-clipboard-check"></i> ¿Cómo fue?</div><p class="pv-ayuda">Este evento aún no se ha cerrado. Lo cierra cocina, el chef o eventos.</p></div>`;
  const pl = (c && c.platos) || {};
  const idA = e_(JSON.stringify(String(ev.id)));
  const filas = ev.platos.map((p, i) => {
    const v = pl[norm(p.nombre)] || 'justo';
    return `<div class="pv-pl"><span>${e_(p.nombre)}</span><div class="pv-op" role="radiogroup" aria-label="${e_(p.nombre)}">${[['sobra', 'Sobró'], ['justo', 'Justo'], ['falta', 'Faltó']].map(([k, t]) =>
      `<label class="${v === k ? 'on' : ''}"><input type="radio" name="pv-p${i}" value="${k}"${v === k ? ' checked' : ''} onchange="prevMarca(this)">${t}</label>`).join('')}</div></div>`;
  }).join('');
  return `<div class="card pv no-print" id="pv-form"><div class="pv-cab"><i class="ti ti-clipboard-check"></i> ¿Cómo fue? <small>así la próxima previsión acierta más</small></div>
    <label class="pv-lab">Personas que vinieron de verdad<input type="number" id="pv-real" inputmode="numeric" min="0" max="${paxDe(ev) * 3}" value="${c ? c.pax_real : paxDe(ev)}"></label>
    <div class="pv-ayuda">Cada plato:</div>${filas}
    <label class="pv-lab">Nota (opcional)<input type="text" id="pv-nota" maxlength="200" value="${c && c.nota ? e_(c.nota) : ''}" placeholder="Ej.: llovió y vino menos gente"></label>
    <button type="button" class="pv-btn" onclick="prevCerrar(${idA})">Guardar</button></div>`;
}

window.prevMarca = function(inp){
  inp.closest('.pv-op').querySelectorAll('label').forEach(l => l.classList.toggle('on', l.contains(inp)));
};
window.prevEditar = function(id){ editando[id] = true; if(typeof renderProd === 'function') renderProd(); };
window.prevCerrar = function(id){
  const ev = evs().find(e => String(e.id) === String(id)); if(!ev) return;
  const real = parseInt(document.getElementById('pv-real').value);
  if(isNaN(real) || real < 0) return alert('Pon cuántas personas vinieron.');
  const platos = {};
  ev.platos.forEach((p, i) => { const r = document.querySelector(`input[name="pv-p${i}"]:checked`); platos[norm(p.nombre)] = r ? r.value : 'justo'; });
  let por = ''; try{ por = (typeof _perfil !== 'undefined' && _perfil && _perfil.nombre) || localStorage.getItem('seda_appcc_yo') || ''; }catch(e){}
  P().cierres[String(ev.id)] = {pax: paxDe(ev), pax_real: real, f: factor(ev), tipo: ev.tipo, fecha: ev.fecha, platos,
    nota: (document.getElementById('pv-nota').value || '').trim(), por, t: new Date().toISOString()};
  delete editando[id];
  guardar();
  if(typeof renderProd === 'function') renderProd();
  if(typeof avisosRecalcular === 'function') avisosRecalcular();
};
// Desde la nube (cargarNube)
window.previsionDesdeNube = function(v){
  if(v && typeof v === 'object'){ prevision = v; try{ localStorage.setItem('seda_prevision', JSON.stringify(v)); }catch(e){} }
};

const st = document.createElement('style');
st.textContent = `.pv{margin-top:10px}.pv-cab{font-size:14px;font-weight:500;margin-bottom:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pv-cab small{font-weight:400;color:var(--text-secondary);font-size:12px}
.pv-ayuda{font-size:12px;color:var(--text-secondary);margin:6px 0}.pv-aviso{font-size:12px;background:var(--warn-bg);color:var(--warn-text);border-radius:8px;padding:6px 8px;margin:4px 0 8px}
.pv-datos{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.pv-datos>div{flex:1 1 140px;background:var(--bg-secondary);border-radius:8px;padding:8px;display:flex;flex-direction:column}
.pv-datos b{font-size:20px}.pv-datos small{font-size:11px;color:var(--text-secondary)}
.pv-t{width:100%;border-collapse:collapse;font-size:13px}.pv-t th{font-size:11px;font-weight:500;color:var(--text-secondary);text-align:left;padding:4px 0}.pv-t td{padding:6px 0;border-top:.5px solid var(--border);vertical-align:top}.pv-t .pv-n{text-align:right;white-space:nowrap;padding-left:10px;font-size:15px}.pv-h{font-size:11px;color:var(--text-secondary)}.pv-menos{color:var(--success-text)}.pv-mas{color:var(--warn-text)}
.pv-linea{font-size:13px;margin:3px 0}
.pv-lab{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary);margin:8px 0}
.pv-pl{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;padding:6px 0;border-top:.5px solid var(--border);font-size:13px}
.pv-pl>span{flex:1 1 140px;min-width:0}
.pv-op{display:flex;gap:4px}.pv-op label{border:.5px solid var(--border);border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer;min-height:32px;display:flex;align-items:center}
.pv-op input{position:absolute;opacity:0;pointer-events:none}.pv-op label.on{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.pv-op label:focus-within{outline:2px solid #c9a84c}
.pv-btn{background:#c9a84c;color:#1a1a1a;border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer;width:100%;min-height:44px}
.pv-btn2{background:none;border:.5px solid var(--border);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;color:var(--text-primary)}`;
document.head.appendChild(st);
})();
