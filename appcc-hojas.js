/* ══════════════════════════════════════
   OÍDO COCINA · APPCC · Hojas mensuales firmadas
   Desde APPCC → Registros → «Hojas firmadas»: hoja del mes de temperaturas (cada cámara, mañana y tarde)
   o de limpieza (cada zona), con el nombre del responsable y su firma hecha con el dedo.
   - «Imprimir»: la hoja en papel (o «Guardar como PDF» desde el diálogo de imprimir).
   - «Enviar archivo»: crea un PDF (jsPDF 2.5.1 + autotable 3.8.2, de jsdelivr, solo al pulsar) y lo comparte
     (WhatsApp, correo…) con el menú del móvil; si el aparato no deja compartir, lo descarga.
   La firma se queda solo en este aparato (localStorage 'ap_firma', se borra al cerrar sesión). No se sube a la nube.
   Lee el global `appcc` (appcc.js). Usa, si existen: hotelDatos/hLogo (marca.js).
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const diaK = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtT = v => (Math.round(v * 10) / 10).toLocaleString('es-ES');
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const mesTxt = m => { const [y, mm] = m.split('-'); return `${MESES[+mm - 1]} de ${y}`; };
const LS = (k, v) => { try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } };
const datos = () => (typeof appcc !== 'undefined' && appcc && typeof appcc === 'object') ? appcc : {equipos: [], zonas: [], reg: []};
const vivos = () => (datos().reg || []).filter(r => !r.anulado);
const hotel = () => { try{ return typeof hotelDatos === 'function' ? hotelDatos() : {}; }catch(e){ return {}; } };
const iniciales = n => String(n || '').trim().split(/\s+/).map(p => p[0] || '').join('').toUpperCase().slice(0, 3);

let st = {tipo: 'temp', mes: '', firma: null, abierto: false};

// ── Tabla del mes (sirve para la hoja impresa y para el PDF) ──
function tabla(tipo, mes){
  const [y, m] = mes.split('-').map(Number), dias = new Date(y, m, 0).getDate();
  const reg = vivos().filter(r => r.f.slice(0, 7) === mes);
  const filas = [];
  if(tipo === 'temp'){
    const eqs = datos().equipos || [];
    const head = ['Día', ...eqs.flatMap(e => [`${e.n} (${fmtT(e.min)} a ${fmtT(e.max)} °C) · Mañana`, `${e.n} · Tarde`]), 'Registró'];
    const cortas = ['Día', ...eqs.flatMap(e => [e.n + ' M', e.n + ' T']), 'Registró'];
    let fuera = 0;
    for(let d = 1; d <= dias; d++){
      const k = `${y}-${pad(m)}-${pad(d)}`, del = reg.filter(r => r.t === 'temp' && diaK(r.f) === k), quien = new Set();
      const celdas = eqs.flatMap(e => [true, false].map(man => {
        const l = del.filter(r => r.eq === e.id && (new Date(r.f).getHours() < 15) === man).pop();
        if(!l) return '';
        quien.add(l.por); if(l.fuera) fuera++;
        return fmtT(l.v) + (l.fuera ? ' (!)' : '');
      }));
      filas.push([pad(d), ...celdas, [...quien].filter(Boolean).map(iniciales).join(', ')]);
    }
    const notas = reg.filter(r => r.t === 'temp' && r.fuera).map(r => `${diaK(r.f).slice(8)}/${pad(m)} ${r.eqn || r.eq}: ${fmtT(r.v)} °C — ${r.nota || 'sin nota'} (${r.por || '—'})`);
    return {titulo: 'Registro de temperaturas', head, cortas, filas, notas, pie: fuera ? '(!) Fuera de rango: ver acciones correctoras abajo.' : '', personas: personas(reg.filter(r => r.t === 'temp'))};
  }
  if(tipo === 'recep'){
    // Una fila por mercancía recibida, con quién la recibió (nombre completo)
    const head = ['Fecha', 'Hora', 'Proveedor', 'Producto', 'Temp. °C', 'Lote', 'Caducidad', 'Estado', 'Observaciones', 'Recibió'];
    const l = reg.filter(r => r.t === 'recep').sort((a, b) => a.f.localeCompare(b.f));
    l.forEach(r => {
      const d = new Date(r.f);
      filas.push([`${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, `${pad(d.getHours())}:${pad(d.getMinutes())}`, r.prov || '', r.prod || '',
        r.temp != null ? fmtT(r.temp) : '', r.lote || '', r.cad ? r.cad.split('-').reverse().join('/') : '', r.ok ? 'Aceptado' : 'Incidencia (!)', r.nota || '', r.por || '']);
    });
    return {titulo: 'Registro de recepción de mercancía', head, cortas: head, filas, notas: [], pie: l.some(r => !r.ok) ? '(!) Incidencia: rechazado o aceptado con incidencia, ver observaciones.' : '', personas: '', porFila: true};
  }
  const zonas = datos().zonas || [];
  const head = ['Día', ...zonas.map(z => `${z.n} (${z.frec === 'semanal' ? 'semanal' : 'diaria'})`), 'Registró'];
  for(let d = 1; d <= dias; d++){
    const k = `${y}-${pad(m)}-${pad(d)}`, del = reg.filter(r => r.t === 'limp' && diaK(r.f) === k), quien = new Set();
    const celdas = zonas.map(z => { const l = del.filter(r => r.zona === z.id).pop(); if(!l) return ''; quien.add(l.por); return 'Sí'; });
    filas.push([pad(d), ...celdas, [...quien].filter(Boolean).map(iniciales).join(', ')]);
  }
  return {titulo: 'Registro de limpieza', head, cortas: head, filas, notas: [], pie: '', personas: personas(reg.filter(r => r.t === 'limp'))};
}
// Quién aparece en la hoja: iniciales = nombre completo
function personas(l){ const s = [...new Set(l.map(r => r.por).filter(Boolean))]; return s.map(n => `${iniciales(n)} = ${n}`).join(' · '); }

// ── Hoja para imprimir ──
function htmlHoja(t, nombre, firma){
  const h = hotel(), logo = typeof hLogo === 'function' ? hLogo(40) : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t.titulo)} · ${esc(mesTxt(st.mes))}</title><style>
  @page{size:A4 landscape;margin:10mm} body{font-family:system-ui,Arial,sans-serif;font-size:8.5pt;margin:0;color:#111}
  .cab{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
  h1{font-size:13pt;margin:0} .sub{color:#444;font-size:9pt}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #999;padding:2px 3px;text-align:center}
  th{font-size:7pt;background:#eee;font-weight:600} td:first-child,th:first-child{width:24px}
  .fuera{color:#b00;font-weight:700} .notas{margin-top:6px;font-size:8pt} .notas li{margin:1px 0}
  .firma{display:flex;gap:24px;align-items:flex-end;margin-top:10px;page-break-inside:avoid}
  .firma div{border-top:1px solid #333;padding-top:3px;min-width:200px} .firma img{height:60px;display:block}
  </style></head><body>
  <div class="cab"><div><h1>${esc(t.titulo)} · ${esc(mesTxt(st.mes))}</h1><div class="sub">${esc([h.nombre, h.ciudad].filter(Boolean).join(' · '))}</div></div>${logo}</div>
  <table><thead><tr>${t.head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
  <tbody>${t.filas.map(f => `<tr>${f.map(c => `<td class="${/\(!\)/.test(c) ? 'fuera' : ''}"${t.porFila ? ' style="text-align:left"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  ${t.pie ? `<p class="notas">${esc(t.pie)}</p>` : ''}
  ${t.notas.length ? `<ul class="notas">${t.notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
  ${t.personas ? `<p class="notas">${esc(t.personas)}</p>` : ''}
  <div class="firma"><div>Responsable: <b>${esc(nombre)}</b></div><div>${firma ? `<img src="${firma}" alt="Firma">` : '<br><br>'}Firma</div><div>Fecha: ${new Date().toLocaleDateString('es-ES')}</div></div>
  </body></html>`;
}
function imprimir(){
  const t = tabla(st.tipo, st.mes), nombre = ge('ah-nombre').value.trim();
  if(!comprobar(nombre)) return;
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f); const d = f.contentWindow.document; d.open(); d.write(htmlHoja(t, nombre, st.firma)); d.close();
  setTimeout(() => { try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){} setTimeout(() => f.remove(), 60000); }, 400);
}
function comprobar(nombre){
  if(!nombre){ msg('Escribe el nombre del responsable.'); ge('ah-nombre').focus(); return false; }
  if(!st.firma){ msg('Firma en el recuadro con el dedo.'); return false; }
  LS('ap_firma', {nombre, img: st.firma});
  try{ localStorage.setItem('seda_appcc_yo', localStorage.getItem('seda_appcc_yo') || nombre); }catch(e){}
  return true;
}

// ── PDF y compartir ──
let cargando = null;
function cargar(src){ return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('sin conexión')); document.head.appendChild(s); }); }
function libs(){
  if(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
  return cargando = cargando || cargar('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
    .then(() => cargar('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'))
    .catch(e => { cargando = null; throw e; });
}
const NOMBRES = {temp: 'temperaturas', limp: 'limpieza', recep: 'recepción'};
// Crea el PDF con lo elegido en ese momento (snap): la ventana ya puede estar cerrada y la persona trabajando en otra cosa.
// progreso y ceder vienen de la cola (cola.js); sin cola no hacen nada.
async function crearPdf(snap, progreso = () => {}, ceder = () => Promise.resolve()){
  progreso(5, 'Preparando el creador de PDF…');
  await libs();
  progreso(30, 'Armando la hoja…'); await ceder();
  const t = tabla(snap.tipo, snap.mes), h = hotel();
  const doc = new window.jspdf.jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4'});
  doc.setFontSize(13); doc.text(`${t.titulo} · ${mesTxt(snap.mes)}`, 10, 12);
  doc.setFontSize(9); doc.text([h.nombre, h.ciudad].filter(Boolean).join(' · '), 10, 17);
  progreso(55, 'Dibujando la tabla…'); await ceder();
  doc.autoTable({head: [t.head], body: t.filas, startY: 20, theme: 'grid', margin: {left: 8, right: 8},
    styles: {fontSize: t.head.length > 12 ? 5.5 : 7, cellPadding: .8, halign: t.porFila ? 'left' : 'center', overflow: 'linebreak'},
    headStyles: {fillColor: [235, 235, 235], textColor: 20, fontSize: t.head.length > 12 ? 5 : 6.5},
    didParseCell: c => { if(c.section === 'body' && /\(!\)/.test(String(c.cell.raw))){ c.cell.styles.textColor = [180, 0, 0]; c.cell.styles.fontStyle = 'bold'; } }});
  progreso(80, 'Añadiendo la firma…'); await ceder();
  let yy = doc.lastAutoTable.finalY + 5;
  const lineas = [t.pie, ...t.notas, t.personas].filter(Boolean);
  doc.setFontSize(7.5);
  lineas.forEach(l => { const p = doc.splitTextToSize(l, 275); if(yy + p.length * 3.5 > 180){ doc.addPage(); yy = 15; } doc.text(p, 10, yy); yy += p.length * 3.5; });
  if(yy > 170){ doc.addPage(); yy = 15; }
  doc.setFontSize(9);
  doc.text('Responsable: ' + snap.nombre, 10, yy + 18);
  doc.addImage(snap.firma, /^data:image\/png/.test(snap.firma) ? 'PNG' : 'JPEG', 100, yy, 60, 20); doc.line(100, yy + 21, 160, yy + 21); doc.text('Firma', 100, yy + 25);
  doc.text('Fecha: ' + new Date().toLocaleDateString('es-ES'), 190, yy + 18);
  const nom = `${{temp: 'temperaturas', limp: 'limpieza', recep: 'recepcion'}[snap.tipo]}-${snap.mes}.pdf`;
  progreso(95, 'Guardando el archivo…');
  return {blob: doc.output('blob'), nom, titulo: `${t.titulo} · ${mesTxt(snap.mes)}`};
}
const puedeCompartir = r => { try{ return !!(navigator.canShare && navigator.canShare({files: [new File([r.blob], r.nom, {type: 'application/pdf'})]})); }catch(e){ return false; } };
async function compartir(r){
  try{ await navigator.share({files: [new File([r.blob], r.nom, {type: 'application/pdf'})], title: r.titulo}); return 'Enviado desde el menú del móvil.'; }
  catch(e){ if(e && e.name === 'AbortError') return 'Envío cancelado. Puedes volver a pulsar «Enviar».'; return descargar(r); }
}
function descargar(r){
  const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob); a.download = r.nom; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return 'PDF descargado: ' + r.nom + '. Ya puedes enviarlo por correo o WhatsApp.';
}
const ERR_PDF = 'No se ha podido crear el archivo. Comprueba la conexión (la primera vez se descarga el creador de PDF) o usa «Imprimir» → «Guardar como PDF».';
function pdf(){
  const nombre = ge('ah-nombre').value.trim(); if(!comprobar(nombre)) return;
  const snap = {tipo: st.tipo, mes: st.mes, firma: st.firma, nombre};
  if(typeof window.colaTarea === 'function'){
    // En segundo plano: se cierra la ventana y se sigue trabajando; al acabar sale «Enviar» en la pastilla de abajo.
    cerrar();
    window.colaTarea({titulo: `Hoja de ${NOMBRES[snap.tipo]} · ${mesTxt(snap.mes)}`,
      ejecutar: (progreso, ceder) => crearPdf(snap, progreso, ceder),
      listo: r => ({texto: `PDF listo · ${Math.max(1, Math.round(r.blob.size / 1024))} KB`,
        acciones: [...(puedeCompartir(r) ? [{t: 'Enviar', primaria: true, fn: compartir}] : []), {t: 'Descargar', primaria: !puedeCompartir(r), fn: descargar}]}),
      alFallar: () => ERR_PDF});
    return;
  }
  // Sin cola (no debería pasar): como antes, esperando en la ventana
  const b = ge('ah-pdf'); b.disabled = true; b.textContent = 'Preparando…';
  crearPdf(snap).then(async r => { msg(puedeCompartir(r) ? await compartir(r) : descargar(r), true); }).catch(() => msg(ERR_PDF))
    .finally(() => { b.disabled = false; b.innerHTML = '<i class="ti ti-share"></i> Enviar archivo'; });
}

// ── Firma con el dedo ──
function lienzo(){
  const c = ge('ah-firma'), x = c.getContext('2d'), r = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight; c.width = w * r; c.height = h * r; x.scale(r, r);
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#111';
  let dib = false, hay = false;
  const pos = e => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  c.onpointerdown = e => { e.preventDefault(); c.setPointerCapture(e.pointerId); dib = true; const [a, b] = pos(e); x.beginPath(); x.moveTo(a, b); };
  c.onpointermove = e => { if(!dib) return; const [a, b] = pos(e); x.lineTo(a, b); x.stroke(); hay = true; };
  c.onpointerup = c.onpointercancel = () => { if(!dib) return; dib = false; if(hay){ st.firma = c.toDataURL('image/jpeg', 0.85); estadoFirma(); } };
  c._borrar = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); hay = false; st.firma = null; estadoFirma(); };
  c._poner = src => { const i = new Image(); i.onload = () => { x.drawImage(i, 0, 0, w, h); st.firma = src; hay = true; estadoFirma(); }; i.src = src; };
}
function estadoFirma(){ const e = ge('ah-fest'); if(e) e.textContent = st.firma ? 'Firmado' : 'Sin firmar'; }
function msg(t, ok){ const e = ge('ah-msg'); if(e){ e.className = 'hz-aviso ' + (ok ? 'ok' : 'warn'); e.textContent = t; e.hidden = false; } }

function resumen(){
  const t = tabla(st.tipo, st.mes), con = t.filas.filter(f => f.slice(1, -1).some(Boolean)).length;
  const e = ge('ah-res'); if(!e) return;
  if(t.porFila){ const inc = t.filas.filter(f => /\(!\)/.test(f[7])).length; e.textContent = `${t.filas.length} recepción${t.filas.length === 1 ? '' : 'es'} este mes${inc ? ` · ${inc} con incidencia` : ''}.`; return; }
  e.textContent = `${t.filas.length} días · ${con} con registros${t.notas.length ? ` · ${t.notas.length} fuera de rango` : ''}.`;
}

window.apHojasAbrir = function(mes){
  st.mes = mes || diaK(new Date().toISOString()).slice(0, 7); st.firma = null;
  const prev = LS('ap_firma') || {}, yo = (() => { try{ return localStorage.getItem('seda_appcc_yo') || ''; }catch(e){ return ''; } })();
  const meses = [...new Set((datos().reg || []).map(r => r.f.slice(0, 7)).concat([st.mes]))].sort().reverse();
  let m = ge('ah-modal');
  if(!m){
    if(!ge('ah-css')){ const s = document.createElement('style'); s.id = 'ah-css'; s.textContent = CSS; document.head.appendChild(s); }
    m = document.createElement('div'); m.id = 'ah-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Hojas firmadas');
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      if(e.target === m || e.target.closest('[data-ah="cerrar"]')) return cerrar();
      const b = e.target.closest('[data-ah]'); if(!b) return;
      const a = b.dataset.ah;
      if(a === 'borrar') ge('ah-firma')._borrar();
      if(a === 'ultima' && prevFirma()) ge('ah-firma')._poner(prevFirma().img);
      if(a === 'imprimir') imprimir();
      if(a === 'pdf') pdf();
      if(a === 'temp' || a === 'limp' || a === 'recep'){ st.tipo = a; m.querySelectorAll('[data-ah="temp"],[data-ah="limp"],[data-ah="recep"]').forEach(x => x.setAttribute('aria-pressed', x.dataset.ah === a)); resumen(); }
    });
    m.addEventListener('change', e => { if(e.target.id === 'ah-mes'){ st.mes = e.target.value; resumen(); } });
    m.addEventListener('keydown', e => { if(e.key === 'Escape') cerrar(); });
  }
  m.innerHTML = `<div class="ah-caja"><div class="ah-cab"><b><i class="ti ti-signature"></i> Hojas firmadas</b><button class="ah-x" data-ah="cerrar" aria-label="Cerrar">✕</button></div>
    <div class="ah-cuerpo">
      <div class="ah-tipos" role="group" aria-label="Hoja"><button data-ah="temp" aria-pressed="${st.tipo === 'temp'}">Temperaturas</button><button data-ah="limp" aria-pressed="${st.tipo === 'limp'}">Limpieza</button><button data-ah="recep" aria-pressed="${st.tipo === 'recep'}">Recepción</button></div>
      <label class="ah-l">Mes<select id="ah-mes">${meses.map(k => `<option value="${k}" ${k === st.mes ? 'selected' : ''}>${esc(mesTxt(k))}</option>`).join('')}</select></label>
      <p class="ah-ayuda" id="ah-res"></p>
      <label class="ah-l">Responsable (quien revisa y firma)<input id="ah-nombre" type="text" autocomplete="name" value="${esc(prev.nombre || yo)}" placeholder="Nombre y apellido"></label>
      <div class="ah-l">Firma <small id="ah-fest">Sin firmar</small></div>
      <canvas id="ah-firma" aria-label="Recuadro para firmar con el dedo"></canvas>
      <div class="ah-acc"><button class="btn-sec" data-ah="borrar">Borrar firma</button>${prev.img ? '<button class="btn-sec" data-ah="ultima">Usar mi última firma</button>' : ''}</div>
      <div id="ah-msg" class="hz-aviso" hidden></div>
      <div class="ah-acc ah-fin"><button class="btn-sec" data-ah="imprimir"><i class="ti ti-printer"></i> Imprimir</button><button class="btn btn-p" id="ah-pdf" data-ah="pdf"><i class="ti ti-share"></i> Enviar archivo</button></div>
      <p class="ah-ayuda">«Enviar archivo» prepara el PDF en segundo plano: puedes seguir usando la app y, cuando esté listo, sale el botón «Enviar» abajo a la izquierda. La firma solo se guarda en este aparato.</p>
    </div></div>`;
  m.style.display = 'flex';
  lienzo(); resumen(); estadoFirma();
  function prevFirma(){ return LS('ap_firma'); }
};
function cerrar(){ const m = ge('ah-modal'); if(m) m.style.display = 'none'; }

const CSS = `#ah-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1004;align-items:flex-start;justify-content:center;padding:12px 10px;overflow:auto}
.ah-caja{background:var(--bg-primary);color:var(--text-primary);border-radius:var(--radius-lg,12px);width:100%;max-width:520px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.ah-cab{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:.5px solid var(--border)}
.ah-x{background:none;border:0;font-size:16px;cursor:pointer;color:var(--text-secondary);min-width:40px;min-height:40px}
.ah-cuerpo{padding:12px 14px 16px;display:flex;flex-direction:column;gap:8px}
.ah-tipos{display:flex;gap:6px;flex-wrap:wrap}.ah-tipos button{flex:1;min-height:42px;border-radius:8px;border:1px solid var(--border-md,#999);background:var(--bg-secondary);color:var(--text-primary);font:inherit;font-weight:600;cursor:pointer}
.ah-tipos button[aria-pressed="true"]{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.ah-l{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-secondary)}.ah-l small{font-weight:600}
#ah-firma{width:100%;height:130px;background:#fff;border:1px dashed var(--border-md,#999);border-radius:8px;touch-action:none;cursor:crosshair}
.ah-acc{display:flex;gap:6px;flex-wrap:wrap}.ah-fin{margin-top:4px}.ah-fin>*{flex:1;justify-content:center}
.ah-ayuda{font-size:12px;color:var(--text-secondary);margin:0}`;
})();
