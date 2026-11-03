/* Recetario: ficha de receta, alta y edición, y ELABORACIONES BASE (sub-recetas)
   - Una receta marcada como «elaboración base» (fondo, salsa, masa…) lleva `base:true` y `rinde:{cant,ud}`
     (lo que sale de una tanda). Sus ingredientes son los de UNA TANDA, no de una ración.
   - Otra receta la usa escribiéndola como ingrediente («Salsa bordalesa | 40 | g»). Al guardar se fija `receta_id`
     en esa línea; si no lo tiene, se reconoce por el nombre exacto.
   - Su coste, sus alérgenos y sus ingredientes pasan al plato: escandallo, ficha de alérgenos y pedidos.
   - Producción y Pedidos muestran cuánto hay que preparar de cada elaboración.
   Se carga también en alergenos.html (solo usa la parte de cálculo). */

const _srN = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const _srE = s => (typeof escH === 'function' ? escH(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const _srRecetas = () => (typeof recetas !== 'undefined' && Array.isArray(recetas) ? recetas : []);

// ── Unidades: pasa una cantidad de una unidad a otra (g↔kg, ml↔cl↔l). null si no se pueden comparar.
const SR_UD = {g:['g',1], gr:['g',1], grs:['g',1], kg:['g',1000], ml:['ml',1], cl:['ml',10], l:['ml',1000], lt:['ml',1000], litro:['ml',1000], litros:['ml',1000]};
function srConv(cant, de, a){
  const d = _srN(de), b = _srN(a);
  if(d === b || !d || !b) return cant;
  const x = SR_UD[d], y = SR_UD[b];
  return x && y && x[0] === y[0] ? cant * x[1] / y[1] : null;
}
function srRinde(r){ const c = parseFloat(r && r.rinde && r.rinde.cant); return {cant: c > 0 ? c : 1, ud: (r && r.rinde && r.rinde.ud) || 'ud'}; }
function srRindeTxt(r){ const ri = srRinde(r); return (typeof fmtCant === 'function' ? (f => f.txt + ' ' + f.ud)(fmtCant(ri.cant, ri.ud)) : ri.cant + ' ' + ri.ud); }

// ── ¿Esta línea de ingrediente (o este nombre) es una elaboración base?
function subRecetaDe(ing){
  if(!ing) return null;
  const lista = _srRecetas();
  if(typeof ing === 'object' && ing.receta_id){ const r = lista.find(x => x.id === ing.receta_id); if(r && r.base) return r; }
  const n = _srN(typeof ing === 'object' ? ing.nombre : ing); if(!n) return null;
  return lista.find(r => r.base && _srN(r.nombre) === n) || null;
}
// Cantidad de la línea expresada en la unidad del rinde de la elaboración
function _srCantEnRinde(ing, sub){
  const ri = srRinde(sub), c = parseFloat(ing.cant) || 0;
  const q = srConv(c, ing.ud, ri.ud);
  return q == null ? c : q;
}

// ── Coste: € por unidad (la del ingrediente) de una elaboración base. null si el nombre no es una elaboración.
const _srPila = new Set();
function precioSubreceta(nombre, ud){
  const r = subRecetaDe(nombre); if(!r) return null;
  if(_srPila.has(r.id)) return 0; // una elaboración que se contiene a sí misma: se corta
  _srPila.add(r.id);
  let tanda = 0;
  try{ tanda = typeof calcCosteReceta === 'function' ? calcCosteReceta(r, 1) : 0; } finally { _srPila.delete(r.id); }
  const ri = srRinde(r);
  const una = srConv(1, ud || ri.ud, ri.ud);
  return tanda / ri.cant * (una == null ? 1 : una);
}

// ── Alérgenos de una receta, con los de sus elaboraciones base (y las de dentro de estas)
function algDeRecetaCompleta(r, pila){
  const set = new Set();
  if(!r) return [];
  pila = pila || new Set(); if(pila.has(r.id)) return []; pila.add(r.id);
  (r.alg || []).forEach(a => set.add(a));
  (r.ingredientes || []).forEach(i => {
    (i.alg || []).forEach(a => set.add(a));
    const s = subRecetaDe(i); if(s) algDeRecetaCompleta(s, pila).forEach(a => set.add(a));
  });
  pila.delete(r.id);
  return [...set];
}

// ── Ingredientes «de compra»: las elaboraciones se abren en sus ingredientes, ya multiplicados.
function ingredientesBrutos(r, mult, pila){
  mult = mult == null ? 1 : mult; pila = pila || new Set();
  if(!r || pila.has(r.id)) return [];
  pila.add(r.id);
  const out = [];
  (r.ingredientes || []).forEach(i => {
    const s = subRecetaDe(i);
    if(s && !pila.has(s.id)) out.push(...ingredientesBrutos(s, mult * _srCantEnRinde(i, s) / srRinde(s).cant, pila).map(x => ({...x, via: x.via || s.nombre})));
    else out.push({...i, cant: (parseFloat(i.cant) || 0) * mult});
  });
  pila.delete(r.id);
  return out;
}
// Cuánto hace falta de cada elaboración base para `mult` raciones de la receta. acc: {id:{receta,cant}}
function elaboracionesNecesarias(r, mult, acc, pila){
  acc = acc || {}; pila = pila || new Set();
  if(!r || pila.has(r.id)) return acc;
  pila.add(r.id);
  (r.ingredientes || []).forEach(i => {
    const s = subRecetaDe(i); if(!s || pila.has(s.id)) return;
    const q = _srCantEnRinde(i, s) * mult;
    if(!acc[s.id]) acc[s.id] = {receta: s, cant: 0, platos: new Set()};
    acc[s.id].cant += q;
    if(!r.base) acc[s.id].platos.add(r.nombre);
    elaboracionesNecesarias(s, q / srRinde(s).cant, acc, pila);
  });
  pila.delete(r.id);
  return acc;
}
// Recetas que usan esta elaboración
function usosDeBase(b){ return _srRecetas().filter(r => r.id !== b.id && (r.ingredientes || []).some(i => { const s = subRecetaDe(i); return s && s.id === b.id; })); }

// Tarjeta «Elaboraciones base que preparar» para uno o varios eventos (Producción y Pedidos)
function htmlElaboracionesBase(evs){
  const acc = {};
  (evs || []).forEach(ev => {
    const rac = Math.round((ev.pax || 0) * (typeof getFactorEvento === 'function' ? getFactorEvento(ev) : 1));
    (ev.platos || []).forEach(p => { const r = typeof recetaDePlato === 'function' ? recetaDePlato(p) : null; if(r) elaboracionesNecesarias(r, rac, acc); });
  });
  const items = Object.values(acc).filter(x => x.cant > 0).sort((a, b) => a.receta.nombre.localeCompare(b.receta.nombre));
  if(!items.length) return '';
  const filas = items.map(x => {
    const ri = srRinde(x.receta), f = fmtCant(x.cant, ri.ud), tandas = x.cant / ri.cant;
    const tTxt = (Math.ceil(tandas * 10) / 10).toString().replace('.', ',');
    return `<tr>
      <td><a href="#" class="sr-link" onclick="srAbrirReceta('${x.receta.id}');return false">${_srE(x.receta.nombre)}</a>
        ${x.platos.size ? `<div style="font-size:11px;color:var(--text-secondary)">${[...x.platos].map(_srE).join(' · ')}</div>` : ''}</td>
      <td style="text-align:right;font-size:16px;font-weight:500;white-space:nowrap">${f.txt} ${_srE(f.ud)}</td>
      <td style="text-align:right;font-size:12px;color:var(--text-secondary);white-space:nowrap">${tTxt} tanda${tandas > 1 ? 's' : ''}<br><span style="font-size:11px">de ${_srE(srRindeTxt(x.receta))}</span></td>
    </tr>`;
  }).join('');
  return `<div class="card" style="padding:0;overflow:hidden;margin:10px 0">
    <div style="padding:10px 12px 4px;font-size:13px;font-weight:500"><i class="ti ti-bowl"></i> Elaboraciones base que preparar</div>
    <table class="ptable sr-tabla"><thead><tr><th>Elaboración</th><th style="text-align:right">Total</th><th style="text-align:right">Tandas</th></tr></thead><tbody>${filas}</tbody></table>
  </div>`;
}
function srAbrirReceta(id){
  if(typeof showTab === 'function'){ try{ showTab('recetario'); }catch(e){} }
  setTimeout(() => verReceta(id), 30);
}

/* ═════════════════ Pantallas del recetario (solo en la app principal) ═════════════════ */

function renderRecetario(){
  const busca = (ge('receta-busca').value || '').toLowerCase(), cat = ge('receta-cat').value;
  const lista = recetas.filter(r => (!busca || r.nombre.toLowerCase().includes(busca)) && (!cat || (cat === '_base' ? r.base : r.cat === cat)));
  const grid = ge('receta-grid');
  if(!lista.length){ grid.innerHTML = '<div class="empty">No se encontraron recetas.</div>'; return; }
  grid.innerHTML = '<div class="receta-grid">' + lista.map(r => {
    const algHTML = algDeRecetaCompleta(r).map(a => `<span class="alg-tag">${algIcon(a)}</span>`).join('');
    return `<div class="receta-card" onclick="verReceta('${r.id}')">
      <div class="receta-emoji">${r.img ? `<img src="${r.img}" style="width:100%;height:100%;object-fit:cover" alt="">` : `<span style="font-size:48px">${r.emoji || '🍴'}</span>`}</div>
      <div class="receta-body">
        <div class="receta-nombre">${_srE(r.nombre)}</div>
        ${r.base ? `<span class="sr-badge">Elaboración · ${_srE(srRindeTxt(r))}</span>` : `<span class="cat-${r.cat}" style="font-size:11px;padding:2px 8px;border-radius:var(--radius);display:inline-block">${CAT_NAMES[r.cat] || ''}</span>`}
        <div style="margin-top:4px">${algHTML}</div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

function verReceta(id){
  const r = recetas.find(x => x.id === id); if(!r) return;
  ge('receta-lista-view').style.display = 'none'; ge('nueva-receta-view').style.display = 'none';
  const det = ge('receta-detalle-view'); det.style.display = 'block';
  const alg = algDeRecetaCompleta(r);
  const uni = r.base ? 'tanda' : 'ración';
  let infoBase = '';
  if(r.base){
    const tanda = calcCosteReceta(r, 1), ri = srRinde(r), usos = usosDeBase(r);
    const porUd = tanda > 0 ? tanda / ri.cant : 0;
    const porUdTxt = porUd > 0 ? (_srN(ri.ud) === 'g' ? (porUd * 1000).toFixed(2) + ' €/kg' : _srN(ri.ud) === 'ml' ? (porUd * 1000).toFixed(2) + ' €/l' : porUd.toFixed(3) + ' €/' + ri.ud) : '';
    infoBase = `<div class="sr-info">
      <div><i class="ti ti-bowl"></i> <b>Elaboración base</b> · una tanda rinde <b>${_srE(srRindeTxt(r))}</b></div>
      ${tanda > 0 ? `<div>Coste de la tanda: <b>${tanda.toFixed(2)} €</b>${porUdTxt ? ' · ' + _srE(porUdTxt) : ''}</div>` : ''}
      <div style="margin-top:4px">${usos.length ? 'Se usa en: ' + usos.map(u => `<a href="#" class="sr-link" onclick="verReceta('${u.id}');return false">${_srE(u.nombre)}</a>`).join(' · ') : '<span style="color:var(--text-secondary)">Todavía no se usa en ninguna receta. Escríbela como ingrediente en otra receta.</span>'}</div>
    </div>`;
  }
  det.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
      <button class="back-btn" style="margin-bottom:0" onclick="volverRecetario()"><i class="ti ti-arrow-left"></i> Volver al recetario</button>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn-print no-print" onclick="showNuevaReceta('${r.id}')"><i class="ti ti-pencil"></i> Editar</button>
        <button class="btn-print no-print" onclick="imprimirReceta('${r.id}')"><i class="ti ti-printer"></i> Imprimir</button>
      </div>
    </div>
    <div class="card">
      <div style="display:flex;gap:16px;margin-bottom:1rem;align-items:flex-start;flex-wrap:wrap">
        <div style="width:160px;min-width:120px;max-width:100%;height:120px;border-radius:var(--radius);overflow:hidden;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:56px;flex-shrink:0">
          ${r.img ? `<img src="${r.img}" style="width:100%;height:100%;object-fit:cover" alt="">` : `<span>${r.emoji || '🍴'}</span>`}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:17px;font-weight:500;margin-bottom:6px">${_srE(r.nombre)}</div>
          ${r.base ? '<span class="sr-badge">Elaboración base</span>' : `<span class="cat-${r.cat}" style="font-size:11px;padding:2px 8px;border-radius:var(--radius);display:inline-block">${CAT_NAMES[r.cat] || ''}</span>`}
          <div style="margin-top:8px">${alg.map(a => `<span class="alg-tag">${algIcon(a)} ${algLabel(a)}</span>`).join('')}</div>
          <div style="margin-top:10px" class="no-print">
            <label style="font-size:12px;color:var(--text-secondary)">📷 ${r.img ? 'Cambiar' : 'Añadir'} foto</label>
            <input type="file" accept="image/*" onchange="subirFoto('${r.id}',this)" style="font-size:12px;margin-top:4px;max-width:100%"/>
          </div>
        </div>
      </div>
      ${infoBase}
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;padding:.75rem;background:var(--bg-secondary);border-radius:var(--radius)" class="no-print">
        <label style="font-size:13px;color:var(--text-secondary);white-space:nowrap"><i class="ti ti-calculator"></i> Escalar a</label>
        <input type="range" min="1" max="${r.base ? 20 : 200}" value="1" step="1" id="scale-slider" oninput="scaleReceta('${r.id}',this.value)" style="flex:1;min-width:0"/>
        <span style="font-size:15px;font-weight:500;min-width:30px;text-align:center" id="scale-num">1</span>
        <label style="font-size:13px;color:var(--text-secondary)">${r.base ? 'tandas' : 'raciones'}</label>
      </div>
      <div style="font-size:12px;font-weight:500;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">
        Ingredientes · <span id="receta-raciones-label">1 ${uni}</span>
      </div>
      <table class="ing-table">
        <thead><tr><th>Ingrediente</th><th>Alérgenos</th><th style="text-align:right">Cantidad</th><th>Ud.</th></tr></thead>
        <tbody>${(r.ingredientes || []).map((i, n) => {
          const s = subRecetaDe(i);
          const ia = s ? algDeRecetaCompleta(s) : (i.alg || []);
          return `<tr>
          <td>${s ? `<a href="#" class="sr-link" onclick="verReceta('${s.id}');return false"><i class="ti ti-bowl"></i> ${_srE(i.nombre)}</a>` : _srE(i.nombre)}</td>
          <td>${ia.map(a => `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:var(--danger-bg);color:var(--danger-text);margin-right:2px;display:inline-block">${algIcon(a)} ${algLabel(a)}</span>`).join('') || '—'}</td>
          <td style="text-align:right;font-weight:500" id="iq-${n}">${_srFmtNum(i.cant)}</td>
          <td style="color:var(--text-secondary)">${_srE(i.ud)}</td>
        </tr>`; }).join('')}
        </tbody>
      </table>
    </div>`;
  window._recetaActual = r;
}
const _srFmtNum = v => { v = parseFloat(v) || 0; return (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10)).replace('.', ','); };

function scaleReceta(id, val){
  ge('scale-num').textContent = val;
  const r = recetas.find(x => x.id === id); if(!r) return;
  const label = ge('receta-raciones-label');
  if(label) label.textContent = `${val} ${r.base ? 'tanda' : 'ración'}${val > 1 ? (r.base ? 's' : 'es') : ''}`;
  (r.ingredientes || []).forEach((i, n) => { const el = ge('iq-' + n); if(el) el.textContent = _srFmtNum(i.cant * val); });
}

/* ── Alta y edición ── */
let _srEditId = null;
function showNuevaReceta(id){
  const r = id ? recetas.find(x => x.id === id) : null;
  _srEditId = r ? r.id : null;
  ge('receta-lista-view').style.display = 'none'; ge('receta-detalle-view').style.display = 'none'; ge('nueva-receta-view').style.display = 'block';
  ge('nr-titulo').textContent = r ? 'Editar receta' : 'Nueva receta';
  ge('nr-nombre').value = r ? r.nombre : '';
  ge('nr-cat').value = r ? r.cat : 'F';
  ge('nr-ing').value = r ? (r.ingredientes || []).map(i => `${i.nombre} | ${String(i.cant).replace('.', ',')} | ${i.ud || 'ud'}`).join('\n') : '';
  ge('nr-base').checked = !!(r && r.base);
  ge('nr-rinde-cant').value = r && r.rinde ? r.rinde.cant : '';
  ge('nr-rinde-ud').value = r && r.rinde ? r.rinde.ud : 'g';
  const sel = new Set(r ? r.alg || [] : []);
  ge('nr-alg-sel').innerHTML = ALERGENOS.map(a => `<div class="alg-cb${sel.has(a.id) ? ' sel' : ''}" data-id="${a.id}" onclick="this.classList.toggle('sel')" style="user-select:none"><span style="font-size:14px">${a.icon}</span><span style="color:var(--text-primary)">${a.label}</span></div>`).join('');
  ge('nr-borrar').style.display = r ? '' : 'none';
  srFormBase();
  window.scrollTo(0, 0);
}
// Muestra u oculta el rinde y la ayuda, y la lista de elaboraciones que se pueden añadir
function srFormBase(){
  const base = ge('nr-base').checked;
  ge('nr-rinde-wrap').style.display = base ? '' : 'none';
  ge('nr-ing-label').textContent = base ? 'Ingredientes de UNA TANDA' : 'Ingredientes de UNA RACIÓN';
  const bases = recetas.filter(r => r.base && r.id !== _srEditId);
  ge('nr-bases').innerHTML = bases.length
    ? `<div style="font-size:12px;color:var(--text-secondary);margin:6px 0 4px">Añadir una elaboración base como ingrediente:</div>` +
      bases.map(b => `<button type="button" class="sr-chip" onclick="srAnadirBase('${b.id}')"><i class="ti ti-plus"></i> ${_srE(b.nombre)}</button>`).join('')
    : `<div style="font-size:12px;color:var(--text-secondary);margin-top:6px"><i class="ti ti-info-circle"></i> Para usar un fondo, una salsa o una masa dentro de un plato, créala antes como receta marcando «elaboración base».</div>`;
}
function srAnadirBase(id){
  const b = recetas.find(x => x.id === id); if(!b) return;
  const ta = ge('nr-ing'), ud = srRinde(b).ud === 'kg' ? 'g' : srRinde(b).ud === 'l' ? 'ml' : srRinde(b).ud;
  const pre = ta.value && !ta.value.endsWith('\n') ? '\n' : '';
  ta.value += `${pre}${b.nombre} |  | ${ud}`;
  ta.focus();
  const pos = ta.value.length - (` | ${ud}`).length; // cursor donde va la cantidad
  try{ ta.setSelectionRange(pos, pos); }catch(e){}
}

function guardarReceta(){
  const nombre = ge('nr-nombre').value.trim(), cat = ge('nr-cat').value, ingTxt = ge('nr-ing').value.trim();
  if(!nombre || !ingTxt){ alert('Nombre e ingredientes son obligatorios.'); return; }
  const previa = _srEditId ? recetas.find(x => x.id === _srEditId) : null;
  if(recetas.some(x => x.id !== _srEditId && _srN(x.nombre) === _srN(nombre))){ alert('Ya hay una receta con ese nombre.'); return; }
  const base = ge('nr-base').checked;
  const rindeCant = parseFloat(String(ge('nr-rinde-cant').value).replace(',', '.'));
  if(base && !(rindeCant > 0)){ alert('Indica cuánto rinde una tanda (por ejemplo 2000 g).'); ge('nr-rinde-cant').focus(); return; }
  const alg = [...ge('nr-alg-sel').querySelectorAll('.alg-cb.sel')].map(el => el.dataset.id).filter(Boolean);
  const algPrev = {}; (previa ? previa.ingredientes || [] : []).forEach(i => { algPrev[_srN(i.nombre)] = i.alg || []; });
  const faltan = [];
  const ingredientes = ingTxt.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const p = l.split('|').map(s => s.trim());
    const nom = p[0] || l, s = subRecetaDe(nom);
    let cant = parseFloat(String(p[1] || '').replace(',', '.'));
    if(!(cant > 0)){ if(s) faltan.push(nom); cant = 1; }
    const ing = {nombre: s ? s.nombre : nom, cant, ud: p[2] || (s ? srRinde(s).ud : 'ud'), alg: algPrev[_srN(nom)] || []};
    if(s && s.id !== _srEditId) ing.receta_id = s.id;
    return ing;
  });
  if(faltan.length){ alert('Falta la cantidad de: ' + faltan.join(', ') + '.\nEjemplo: ' + faltan[0] + ' | 40 | g'); return; }
  if(ingredientes.some(i => i.receta_id && _srContiene(recetas.find(x => x.id === i.receta_id), _srEditId))){ alert('Una elaboración no puede llevarse a sí misma dentro.'); return; }
  const emojis = {F:'🥗', C:'🍳', P:'🍰', M:'🍽️'};
  const datos = {nombre, cat, alg, ingredientes, base: base || undefined, rinde: base ? {cant: rindeCant, ud: ge('nr-rinde-ud').value} : undefined};
  let id;
  if(previa){
    const nombreAntes = previa.nombre;
    Object.assign(previa, datos);
    if(!base){ delete previa.base; delete previa.rinde; }
    id = previa.id;
    // Si cambia el nombre de una elaboración, se cambia también en las recetas que la usan
    if(nombreAntes !== nombre) recetas.forEach(r => (r.ingredientes || []).forEach(i => { if(i.receta_id === id) i.nombre = nombre; }));
  }else{
    id = 'c-' + Date.now();
    const nueva = {id, emoji: base ? '🥣' : (emojis[cat] || '🍴'), ...datos};
    if(!base){ delete nueva.base; delete nueva.rinde; }
    recetas.push(nueva);
  }
  _srEditId = null;
  saveRec(recetas);
  verReceta(id);
}
function _srContiene(r, id, pila){
  if(!r || !id) return false; if(r.id === id) return true;
  pila = pila || new Set(); if(pila.has(r.id)) return false; pila.add(r.id);
  return (r.ingredientes || []).some(i => { const s = subRecetaDe(i); return s && _srContiene(s, id, pila); });
}
function borrarReceta(){
  const r = _srEditId && recetas.find(x => x.id === _srEditId); if(!r) return;
  const usos = r.base ? usosDeBase(r) : [];
  const enEventos = (typeof eventos !== 'undefined' ? eventos : []).filter(ev => (ev.platos || []).some(p => p.receta_id === r.id)).length;
  let msg = `¿Borrar la receta «${r.nombre}»?`;
  if(usos.length) msg += `\n\nSe usa en: ${usos.map(u => u.nombre).join(', ')}. Esas recetas dejarán de contar su coste y alérgenos.`;
  if(enEventos) msg += `\n\nEstá enlazada en ${enEventos} evento${enEventos > 1 ? 's' : ''}.`;
  if(!confirm(msg)) return;
  recetas.splice(recetas.indexOf(r), 1);
  usos.forEach(u => (u.ingredientes || []).forEach(i => { if(i.receta_id === r.id) delete i.receta_id; }));
  _srEditId = null;
  saveRec(recetas);
  volverRecetario();
}

// Estilos propios
(function(){
  if(typeof document === 'undefined' || document.getElementById('sr-css')) return;
  const st = document.createElement('style'); st.id = 'sr-css';
  st.textContent = `
    .sr-badge{font-size:11px;padding:2px 8px;border-radius:var(--radius,6px);display:inline-block;background:#c9a84c22;color:#9a7b2c;border:.5px solid #c9a84c}
    .sr-link{color:var(--info-text,#2a6fb0);text-decoration:none;font-weight:500}
    .sr-link:hover{text-decoration:underline}
    .sr-info{font-size:13px;line-height:1.6;padding:.6rem .75rem;margin-bottom:1rem;border-radius:var(--radius,6px);background:#c9a84c14;border:.5px solid #c9a84c88}
    .sr-chip{font-size:12px;padding:4px 10px;margin:0 6px 6px 0;border-radius:14px;border:.5px solid #c9a84c;background:transparent;color:var(--text-primary);cursor:pointer;max-width:100%;white-space:normal;text-align:left}
    .ptable.sr-tabla{min-width:0}
    .ptable.sr-tabla th,.ptable.sr-tabla td{padding:7px 8px}
    .sr-chk{display:flex;gap:8px;align-items:flex-start;cursor:pointer;font-size:13px;line-height:1.4}
    .sr-chk input{width:auto;margin-top:2px;flex-shrink:0}
    @media (prefers-color-scheme: dark){ .sr-badge{color:#e2c773} }
  `;
  document.head.appendChild(st);
})();
