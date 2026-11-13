/* ══════════════════════════════════════
   OÍDO COCINA · Receta desde una foto (fichas IMPRESAS)
   Botón «Leer receta de foto» en el formulario de receta (junto a «Dictar receta»). Elige o hace una foto de una
   ficha impresa; el móvil la lee GRATIS con Tesseract.js (el mismo lector de albaran-ocr.js: sin IA de pago y sin
   mandar la foto a nadie) y rellena nombre, ingredientes (cantidad y unidad) y alérgenos. No guarda nada: el usuario
   revisa las filas y pulsa «Guardar». Con letra a mano acierta poco: está pensado para fichas impresas.
   Usa de recetas-entrada.js: window.recetaRellenar y window.recetaEntender (alérgenos); de albaran-ocr.js: OCR_LIB.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fmtN = n => String(Math.round(n * 1000) / 1000).replace('.', ',');
const UNID = {g:'g',gr:'g',grs:'g',gramo:'g',gramos:'g',kg:'kg',kgs:'kg',kilo:'kg',kilos:'kg',ml:'ml',cl:'cl',l:'l',lt:'l',lts:'l',litro:'l',litros:'l',
  ud:'ud',uds:'ud',u:'ud',unidad:'ud',unidades:'ud',pieza:'ud',piezas:'ud',pza:'ud',pizca:'pizca',cda:'cda',cdas:'cda',cucharada:'cda',cucharadas:'cda',cdta:'cdta',cucharadita:'cdta',cucharaditas:'cdta',
  diente:'diente',dientes:'diente',hoja:'hoja',hojas:'hoja',rama:'rama',ramas:'rama',lamina:'lámina',laminas:'lámina'};
const FRAC = {'½': .5, '¼': .25, '¾': .75};

// Quita ruido típico del lector en números pegados a unidades («2OO g» → «200 g») y deja espacios normales
function limpiar(l){
  return String(l).replace(/(\d)\s*[Il]\s*$/, '$1 l').replace(/[│|¦]+/g, ' | ').replace(/[·•●▪■□☐✓✔►▶»]+/g, ' ').replace(/(\d)([Oo]+)(?=\d|\s*(?:g|gr|kg|ml|l)\b)/g, (m, d, o) => d + '0'.repeat(o.length))
    .replace(/(?<=\d)[Il](?=\d)/g, '1').replace(/\.{2,}|_{2,}|-{3,}|…+/g, ' ').replace(/\s+/g, ' ').trim();
}
const CABEZA_ING = /^(ingredientes?|ingredients?)\b/i;
const CABEZA_FIN = /^(elaboraci[oó]n|preparaci[oó]n|procedimiento|m[eé]todo|pasos?|modo de hacer|emplatado|presentaci[oó]n|observaciones|notas?|al[eé]rgenos?|alergias?|conservaci[oó]n|rendimiento|tiempo|coste|escandallo)\b/i;

// Una línea de ingrediente → {n, c, u} o null. Admite «Harina 200 g», «200 g de harina», «Harina | 200 | g», «1/2 cebolla».
function lineaIng(l0){
  let l = limpiar(l0).replace(/^[-–—*+\d]{1,2}[.)]\s+(?=\D)/, '').replace(/^[-–—*+]\s*/, '');
  if(!l || !/[a-záéíóúñ]{2}/i.test(l)) return null;
  let c = null, u = '', nombre = l;
  const num = '(\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?|[½¼¾])';
  const uni = '([a-záéíóúñ]{1,10})\\.?';
  const valor = t => { t = t.trim(); if(FRAC[t] != null) return FRAC[t]; const f = t.match(/^(\d+)\s*\/\s*(\d+)$/); if(f) return +f[2] ? +f[1] / +f[2] : null; return parseFloat(t.replace(',', '.')); };
  let m;
  // cantidad + unidad al principio: «200 g de harina»
  if((m = l.match(new RegExp('^' + num + '\\s*' + uni + '(?:\\s+de)?\\s+(.+)$', 'i'))) && UNID[norm(m[2])]){ c = valor(m[1]); u = UNID[norm(m[2])]; nombre = m[3]; }
  // cantidad sin unidad al principio: «2 huevos»
  else if((m = l.match(new RegExp('^' + num + '\\s+(?:de\\s+)?([a-záéíóúñ].*)$', 'i')))){ c = valor(m[1]); u = 'ud'; nombre = m[2]; }
  // al final: «Harina 200 g», «Harina | 200 | g», «Harina 200»
  else if((m = l.match(new RegExp('^(.*?[a-záéíóúñ])[\\s|:,;-]+' + num + '\\s*(?:\\|\\s*)?' + uni + '?\\s*$', 'i'))) && (!m[3] || UNID[norm(m[3])])){ nombre = m[1]; c = valor(m[2]); u = m[3] ? UNID[norm(m[3])] : 'ud'; }
  else if((m = l.match(new RegExp('^(.*?[a-záéíóúñ])[\\s|:,;-]+' + num + '\\s*\\|?\\s*$', 'i')))){ nombre = m[1]; c = valor(m[2]); u = 'ud'; }
  if(c == null || isNaN(c) || c <= 0) return null;
  nombre = nombre.replace(/\|/g, ' ').replace(/\s*\(.*?\)\s*$/, '').replace(/^de\s+/i, '').replace(/[\s,;:.|-]+$/, '').replace(/\s+/g, ' ').trim();
  if(nombre.length < 2 || /^(total|subtotal|pax|raciones?|personas?)$/i.test(nombre)) return null;
  if(u === 'kg'){ c *= 1000; u = 'g'; } else if(u === 'l'){ c *= 1000; u = 'ml'; } else if(u === 'cl'){ c *= 10; u = 'ml'; }
  return {n: nombre.charAt(0).toUpperCase() + nombre.slice(1), c: fmtN(c), u: u || 'ud'};
}

// Texto de la ficha → {nombre, ingredientes, alg}
function recetaDeTexto(texto){
  const lineas = String(texto || '').split(/\r?\n/).map(limpiar).filter(Boolean);
  let nombre = '', desde = -1, hasta = lineas.length, alg = [];
  desde = lineas.findIndex(l => CABEZA_ING.test(l));
  // Nombre: «Receta: X», «Nombre: X» o la primera línea de texto (antes de «Ingredientes») que no sea un encabezado
  for(let i = 0; i < (desde >= 0 ? desde : Math.min(lineas.length, 4)); i++){
    const l = lineas[i], m = l.match(/^(?:receta|nombre|plato|elaboraci[oó]n)\s*[:\-]\s*(.+)$/i);
    if(m){ nombre = m[1]; break; }
    if(!nombre && /[a-záéíóúñ]{3}/i.test(l) && !CABEZA_FIN.test(l) && !lineaIng(l) && l.length <= 70) nombre = l;
  }
  const ini = desde >= 0 ? desde + 1 : 0;
  for(let i = ini; i < lineas.length; i++){ if(CABEZA_FIN.test(lineas[i]) && !/^(rendimiento|tiempo|coste|escandallo)/i.test(lineas[i])){ hasta = i; break; } }
  const ings = [];
  const resto = lineas[desde] ? lineas[desde].replace(CABEZA_ING, '').replace(/^[\s:.-]+/, '') : '';
  const lista = (resto ? [resto] : []).concat(lineas.slice(ini, hasta));
  for(const l of lista){ const f = lineaIng(l); if(f) ings.push(f); }
  // Alérgenos: lo que sigue a «alérgenos» (misma línea y siguientes hasta el final)
  const iA = lineas.findIndex(l => /^(al[eé]rgenos?|contiene)\b/i.test(l));
  if(iA >= 0 && typeof window.recetaEntender === 'function'){
    try{ alg = window.recetaEntender('alérgenos ' + lineas.slice(iA, iA + 4).join(', ')).alg || []; }catch(e){}
  }
  nombre = nombre.replace(/[\s:.,;-]+$/, '').trim();
  if(nombre) nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
  return {nombre, ingredientes: ings.slice(0, 60), alg};
}
window.recetaDeTexto = recetaDeTexto; // para las pruebas

// ── Foto → texto (Tesseract.js, desde jsdelivr la primera vez) ──
const LIB = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
function cargarLib(){
  return new Promise((ok, mal) => {
    if(window.Tesseract) return ok();
    const s = document.createElement('script'); s.src = (typeof OCR_LIB === 'string' && OCR_LIB) || LIB; s.onload = ok;
    s.onerror = () => mal(new Error('No se ha podido descargar el lector de fotos. Hace falta internet la primera vez.'));
    document.head.appendChild(s);
  });
}
// Reduce la foto (lado largo 2200 px) y la pasa a grises con más contraste: el lector va más rápido y acierta más
function prepararFoto(archivo){
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 2200 / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
      try{
        const d = cx.getImageData(0, 0, w, h), p = d.data;
        for(let i = 0; i < p.length; i += 4){ let g = .3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]; g = (g - 128) * 1.3 + 128; g = g < 0 ? 0 : g > 255 ? 255 : g; p[i] = p[i + 1] = p[i + 2] = g; }
        cx.putImageData(d, 0, 0);
      }catch(e){}
      URL.revokeObjectURL(url); cv.toBlob(b => b ? ok(b) : mal(new Error('No se ha podido abrir la foto.')), 'image/jpeg', .9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se ha podido abrir la foto.')); };
    img.src = url;
  });
}
async function leerFoto(archivo, progreso){
  await cargarLib();
  const foto = await prepararFoto(archivo);
  const worker = await Tesseract.createWorker('spa', 1, {logger: m => { if(progreso && m.status === 'recognizing text') progreso(Math.round((m.progress || 0) * 100)); }});
  try{ const {data} = await worker.recognize(foto); return data.text || ''; }
  finally{ try{ await worker.terminate(); }catch(e){} }
}

// ── Botón en el formulario ──
let ocupado = false;
function estado(html){ const c = ge('rf-estado'); if(c){ c.hidden = !html; c.innerHTML = html || ''; } }
async function alElegir(inp){
  const f = inp.files && inp.files[0]; inp.value = '';
  if(!f || ocupado) return;
  ocupado = true; const b = document.querySelector('[data-rf="foto"]'); if(b) b.disabled = true;
  try{
    estado('<b>Leyendo la ficha…</b> <span id="rf-pct">preparando</span>. La primera vez descarga el lector (unos MB) y tarda más.');
    const txt = await leerFoto(f, p => { const e = ge('rf-pct'); if(e) e.textContent = p + ' %'; });
    const r = recetaDeTexto(txt);
    if(!r.ingredientes.length && !r.nombre){ estado('No he podido leer ingredientes en la foto. Prueba con más luz, la ficha recta y de frente, o dicta la receta.'); return; }
    if(typeof window.recetaRellenar === 'function') window.recetaRellenar(r);
    estado(`He añadido <b>${r.ingredientes.length}</b> ingrediente${r.ingredientes.length === 1 ? '' : 's'}${r.nombre ? ', el nombre' : ''}${r.alg.length ? ' y ' + r.alg.length + ' alérgeno' + (r.alg.length === 1 ? '' : 's') : ''}. <b>Revisa cada fila</b> (el lector se equivoca a veces con las cantidades) y corrige antes de guardar.`);
  }catch(e){ estado(esc(e && e.message || 'No se ha podido leer la foto.')); }
  finally{ ocupado = false; if(b) b.disabled = false; }
}
function montar(){
  const acc = document.querySelector('#ri-caja .ri-acc'); if(!acc || acc.querySelector('[data-rf="foto"]')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-sec'; b.dataset.rf = 'foto';
  b.innerHTML = '<i class="ti ti-camera"></i> Leer receta de foto';
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true; inp.id = 'rf-file';
  inp.addEventListener('change', () => alElegir(inp));
  b.addEventListener('click', () => { if(!ocupado) inp.click(); });
  acc.appendChild(b); acc.appendChild(inp);
  if(!ge('rf-estado')){
    const d = document.createElement('div'); d.id = 'rf-estado'; d.className = 'ri-voz'; d.hidden = true; d.setAttribute('role', 'status');
    const voz = ge('ri-voz'); (voz || acc).after(d);
  }
  const ay = document.querySelector('#ri-caja .ri-ayuda');
  if(ay && !ay.dataset.rf){ ay.dataset.rf = '1'; ay.insertAdjacentHTML('afterend', '<p class="ri-ayuda">«Leer receta de foto»: para fichas impresas (con letra a mano falla mucho). Se lee en el móvil, gratis.</p>'); }
}
function enganchar(){
  if(typeof window.showNuevaReceta === 'function' && !window.showNuevaReceta._rf){
    const o = window.showNuevaReceta; window.showNuevaReceta = function(){ const r = o.apply(this, arguments); estado(''); montar(); return r; }; window.showNuevaReceta._rf = true;
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enganchar); else enganchar();
})();
