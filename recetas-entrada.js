/* ══════════════════════════════════════
   OÍDO COCINA · Recetas: ingredientes en casillas y dictado por voz
   - El formulario de receta muestra una fila por ingrediente (ingrediente, cantidad, unidad, quitar) en vez de
     escribir «Harina | 20 | g». Las filas escriben el recuadro oculto #nr-ing con el formato de siempre, así que
     guardarReceta (recetario.js) no cambia.
   - «Dictar receta» (gratis, reconocimiento de voz del navegador, español): «Croquetas de jamón, ingredientes:
     leche cien mililitros, harina veinte gramos, huevo uno; alérgenos: gluten, lácteos y huevo».
     Entiende «cien gramos de harina» y «harina cien gramos», números en palabras o cifras, «medio», «kilo y medio».
     Kilos y litros pasan a gramos y mililitros (los precios del escandallo van por g y ml). Añade filas; no borra.
   Usa del principal: showNuevaReceta, srAnadirBase (recetario.js), ALERGENOS, preciosIng, recetas.
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const UDS = ['g', 'ml', 'ud', 'kg', 'l', 'pizca', 'cda', 'cdta', 'diente', 'hoja', 'rama', 'lámina', 'ración'];
const fmtN = n => String(Math.round(n * 1000) / 1000).replace('.', ',');

// ── Filas ↔ recuadro oculto ──
const ta = () => ge('nr-ing');
function leerTexto(){
  return (ta().value || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const p = l.split('|').map(s => s.trim());
    return {n: p[0] || '', c: p[1] || '', u: p[2] || 'g'};
  });
}
function escribirTexto(filas){
  ta().value = filas.filter(f => f.n.trim()).map(f => `${f.n.trim()} | ${String(f.c).trim()} | ${f.u || 'ud'}`).join('\n');
}
function filasDom(){ return [...document.querySelectorAll('#ri-filas .ri-fila')].map(r => ({n: r.querySelector('.ri-n').value, c: r.querySelector('.ri-c').value, u: r.querySelector('.ri-u').value})); }
function filaHtml(f){
  const uds = UDS.includes(f.u) ? UDS : [f.u, ...UDS];
  return `<div class="ri-fila">
    <input class="ri-n" type="text" list="ri-ings" value="${esc(f.n)}" placeholder="Ingrediente" aria-label="Ingrediente">
    <input class="ri-c" type="text" inputmode="decimal" value="${esc(f.c)}" placeholder="Cant." aria-label="Cantidad">
    <select class="ri-u" aria-label="Unidad">${uds.map(u => `<option ${u === f.u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>
    <button type="button" class="ri-x" data-ri="quitar" aria-label="Quitar ingrediente" title="Quitar">✕</button></div>`;
}
function pintar(enfocarUltima){
  const cont = ge('ri-filas'); if(!cont || !ta()) return;
  const filas = leerTexto(); if(!filas.length) filas.push({n: '', c: '', u: 'g'});
  cont.innerHTML = filas.map(filaHtml).join('');
  if(enfocarUltima){ const l = cont.querySelectorAll('.ri-n'); const i = l[l.length - 1]; if(i) i.focus(); }
}
function nombresConocidos(){
  const s = new Set();
  try{ Object.keys(typeof preciosIng !== 'undefined' && preciosIng || {}).forEach(k => s.add(k)); }catch(e){}
  try{ (typeof recetas !== 'undefined' ? recetas : []).forEach(r => { if(r.base) s.add(r.nombre); (r.ingredientes || []).forEach(i => s.add(i.nombre)); }); }catch(e){}
  return [...s].sort((a, b) => a.localeCompare(b, 'es'));
}

function montar(){
  const t = ta(); if(!t || ge('ri-filas')) return !!ge('ri-filas');
  if(!ge('ri-css')){ const st = document.createElement('style'); st.id = 'ri-css'; st.textContent = CSS; document.head.appendChild(st); }
  t.style.display = 'none';
  const lab = t.parentElement.querySelector('label');
  if(lab) lab.innerHTML = '<span id="nr-ing-label">Ingredientes de UNA RACIÓN</span>';
  const hayVoz = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const caja = document.createElement('div'); caja.id = 'ri-caja';
  caja.innerHTML = `<datalist id="ri-ings"></datalist><div id="ri-filas"></div>
    <div class="ri-acc"><button type="button" class="btn-sec" data-ri="mas"><i class="ti ti-plus"></i> Añadir ingrediente</button>
    ${hayVoz ? '<button type="button" class="btn-sec ri-mic" data-ri="voz"><i class="ti ti-microphone"></i> Dictar receta</button>' : ''}</div>
    <div id="ri-voz" class="ri-voz" hidden></div>
    <p class="ri-ayuda">${hayVoz ? 'Dicta, por ejemplo: «Croquetas de jamón, ingredientes: leche cien mililitros, harina veinte gramos, huevo uno; alérgenos: gluten, lácteos y huevo». Revisa las filas antes de guardar.' : 'Para dictar, usa el micrófono del teclado del móvil en cada casilla.'}</p>`;
  t.after(caja);
  caja.addEventListener('input', () => escribirTexto(filasDom()));
  caja.addEventListener('change', () => escribirTexto(filasDom()));
  caja.addEventListener('click', e => {
    const b = e.target.closest('[data-ri]'); if(!b) return;
    if(b.dataset.ri === 'quitar'){ b.closest('.ri-fila').remove(); escribirTexto(filasDom()); if(!document.querySelector('#ri-filas .ri-fila')) pintar(); }
    if(b.dataset.ri === 'mas'){ const f = filasDom(); f.push({n: '', c: '', u: 'g'}); ta().value = f.map(x => `${x.n} | ${x.c} | ${x.u}`).join('\n'); pintar(true); escribirTexto(filasDom()); }
    if(b.dataset.ri === 'voz') voz();
  });
  caja.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('.ri-c')){ e.preventDefault(); caja.querySelector('[data-ri="mas"]').click(); } });
  return true;
}
function preparar(){
  if(!montar()) return;
  const dl = ge('ri-ings'); if(dl) dl.innerHTML = nombresConocidos().map(n => `<option value="${esc(n)}">`).join('');
  pararVoz(); const v = ge('ri-voz'); if(v){ v.hidden = true; v.textContent = ''; }
  pintar();
}

// Se engancha al abrir el formulario y al añadir una elaboración base (las dos tocan el recuadro oculto)
function enganchar(){
  if(typeof window.showNuevaReceta === 'function' && !window.showNuevaReceta._ri){
    const o = window.showNuevaReceta; window.showNuevaReceta = function(){ const r = o.apply(this, arguments); preparar(); return r; }; window.showNuevaReceta._ri = true;
  }
  if(typeof window.srAnadirBase === 'function' && !window.srAnadirBase._ri){
    const o = window.srAnadirBase; window.srAnadirBase = function(){ escribirTexto(filasDom()); const r = o.apply(this, arguments); pintar(true); return r; }; window.srAnadirBase._ri = true;
  }
  if(typeof window.guardarReceta === 'function' && !window.guardarReceta._ri){
    // Antes de guardar: las filas sin cantidad se quedan fuera de la comprobación de recetario.js si están vacías
    const o = window.guardarReceta; window.guardarReceta = function(){ if(ge('ri-filas')) escribirTexto(filasDom()); return o.apply(this, arguments); }; window.guardarReceta._ri = true;
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enganchar); else enganchar();

// ── Entender lo dictado ──
const UN = {cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiun:21,veintiuno:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,doscientas:200,trescientos:300,trescientas:300,cuatrocientos:400,cuatrocientas:400,quinientos:500,quinientas:500,seiscientos:600,seiscientas:600,setecientos:700,setecientas:700,ochocientos:800,ochocientas:800,novecientos:900,novecientas:900,mil:1000};
const UNIDAD = {g:'g',gr:'g',grs:'g',gramo:'g',gramos:'g',kg:'kg',kilo:'kg',kilos:'kg',kilogramo:'kg',kilogramos:'kg',ml:'ml',mililitro:'ml',mililitros:'ml',cl:'cl',centilitro:'cl',centilitros:'cl',l:'l',litro:'l',litros:'l',
  ud:'ud',uds:'ud',unidad:'ud',unidades:'ud',pieza:'ud',piezas:'ud',pizca:'pizca',pizcas:'pizca',cucharada:'cda',cucharadas:'cda',cucharadita:'cdta',cucharaditas:'cdta',
  diente:'diente',dientes:'diente',hoja:'hoja',hojas:'hoja',rama:'rama',ramas:'rama',ramita:'rama',ramitas:'rama',lamina:'lámina',laminas:'lámina',racion:'ración',raciones:'ración'};
const ALG_PAL = {gluten:['gluten','trigo','cereales'],crustaceos:['crustaceo','crustaceos','marisco','mariscos','gamba','gambas','langostino','langostinos'],huevo:['huevo','huevos'],pescado:['pescado','pescados'],
  cacahuetes:['cacahuete','cacahuetes','mani'],soja:['soja'],lacteo:['lacteo','lacteos','leche','lactosa'],frutos_secos:['frutos','nueces','almendra','almendras','avellana','avellanas'],apio:['apio'],mostaza:['mostaza'],
  sesamo:['sesamo'],sulfitos:['sulfito','sulfitos'],altramuces:['altramuz','altramuces'],moluscos:['molusco','moluscos','mejillon','mejillones','almeja','almejas','calamar','pulpo']};
const esNumW = w => /^\d+([.,]\d+)?$/.test(w) || w in UN || w === 'medio' || w === 'media' || w === 'cuarto';
// Lee un número desde la posición i: devuelve [valor, siguiente posición] o null
function numero(w, i){
  if(/^\d+([.,]\d+)?$/.test(w[i])){ let v = parseFloat(w[i].replace(',', '.')), j = i + 1;
    if((w[j] === 'y' || w[j] === 'con') && (w[j + 1] === 'medio' || w[j + 1] === 'media')){ v += .5; j += 2; }
    else if(w[j] === 'coma' && /^\d+$/.test(w[j + 1] || '')){ v = parseFloat(w[i] + '.' + w[j + 1]); j += 2; }
    return [v, j]; }
  if(w[i] === 'medio' || w[i] === 'media') return [.5, i + 1];
  if(w[i] === 'un' && w[i + 1] === 'cuarto') return [.25, i + 2];
  if(!(w[i] in UN)) return null;
  let total = 0, actual = 0, j = i;
  while(j < w.length){
    const t = w[j];
    if(t in UN){ const v = UN[t]; if(v === 1000){ total += (actual || 1) * 1000; actual = 0; } else actual += v; j++; continue; }
    if(t === 'y' && w[j + 1] in UN && UN[w[j + 1]] < 10 && actual >= 20){ j++; continue; } // «treinta y cinco»
    break;
  }
  let v = total + actual;
  if((w[j] === 'y' || w[j] === 'con') && (w[j + 1] === 'medio' || w[j + 1] === 'media')){ v += .5; j += 2; }
  return [v, j];
}
function entender(texto){
  // Se trabaja con dos listas de palabras a la par: sin tildes (para entender) y como se dijeron (para los nombres)
  const t0 = String(texto || '').toLowerCase().replace(/(\d)\s*[.,]\s*(\d)/g, '$1,$2').replace(/(\d)(g|kg|ml|l|gr)(?![a-zñáéíóú])/g, '$1 $2').replace(/[;:.!?¿¡"«»()]/g, ' , ').replace(/,(?!\d)/g, ' , ');
  let wo = t0.split(/\s+/).filter(Boolean), wn = wo.map(norm);
  let nombre = '', alg = [];
  const iAlg = wn.findIndex(x => /^(alergenos?|alergias?)$/.test(x));
  if(iAlg >= 0){ const resto = wn.slice(iAlg); alg = Object.keys(ALG_PAL).filter(id => ALG_PAL[id].some(p => resto.includes(p))); wo = wo.slice(0, iAlg); wn = wn.slice(0, iAlg); }
  const iIng = wn.findIndex(x => /^ingredientes?$/.test(x));
  if(iIng >= 0){ nombre = wo.slice(0, iIng).filter((x, k) => x !== ',' && !(k === 0 && wn[0] === 'receta')).join(' ').trim(); wo = wo.slice(iIng + 1); wn = wn.slice(iIng + 1); }
  const w = wn, out = [];
  const conocidos = new Map(nombresConocidos().map(n => [norm(n), n]));
  const nombreDe = (a, b) => { const s = wo.slice(a, b).filter(x => x !== ',').join(' ').trim(); return conocidos.get(norm(s)) || s; };
  // buf: posiciones de las palabras dichas desde el último ingrediente (sin cantidad todavía)
  let buf = [];
  const conector = x => ['y', 'con', ',', 'e', 'mas', 'tambien', 'luego', 'despues'].includes(x);
  const sobra = x => ['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'e'].includes(x);
  for(let i = 0; i < w.length;){
    if(w[i] === ','){ if(buf.length) buf.push(i); i++; continue; }
    const n = esNumW(w[i]) ? numero(w, i) : (UNIDAD[w[i]] && !buf.length ? [1, i] : null);
    if(!n){ buf.push(i); i++; continue; }
    let [cant, j] = n, ud = '';
    if(UNIDAD[w[j]]){ ud = UNIDAD[w[j]]; j++; if((w[j] === 'y' || w[j] === 'con') && (w[j + 1] === 'medio' || w[j + 1] === 'media')){ cant += .5; j += 2; } }
    let a = 0, b = 0;
    if(w[j] === 'de' || !buf.some(k => w[k] !== ',')){
      // «cien gramos de harina» / «dos huevos»: el nombre va detrás, hasta la siguiente cantidad o coma
      if(w[j] === 'de') j++;
      a = j; while(j < w.length && w[j] !== ',' && !esNumW(w[j]) && !(conector(w[j]) && esNumW(w[j + 1] || ''))) j++;
      b = j;
    } else {
      // «harina cien gramos»: el nombre es lo dicho antes, desde la última coma
      let k = buf.length; while(k > 0 && w[buf[k - 1]] !== ',') k--;
      const seg = buf.slice(k); a = seg.length ? seg[0] : i; b = seg.length ? seg[seg.length - 1] + 1 : i;
    }
    buf = [];
    while(a < b && (conector(w[a]) || sobra(w[a]))) a++;
    while(b > a && (conector(w[b - 1]) || sobra(w[b - 1]))) b--;
    let nom = a < b ? nombreDe(a, b) : '';
    if(!nom) { i = j; continue; }
    if(ud === 'kg'){ cant *= 1000; ud = 'g'; } else if(ud === 'l'){ cant *= 1000; ud = 'ml'; } else if(ud === 'cl'){ cant *= 10; ud = 'ml'; }
    out.push({n: nom.charAt(0).toUpperCase() + nom.slice(1), c: fmtN(cant), u: ud || 'ud'});
    i = j;
  }
  nombre = nombre.replace(/^receta\s+/, '').trim();
  if(nombre) nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return {nombre, ingredientes: out, alg};
}
window.recetaEntender = entender; // para las pruebas

// ── Micrófono ──
let rec = null, oyendo = false, texto = '';
function pararVoz(){ oyendo = false; try{ rec && rec.stop(); }catch(e){} const b = document.querySelector('[data-ri="voz"]'); if(b){ b.classList.remove('on'); b.innerHTML = '<i class="ti ti-microphone"></i> Dictar receta'; } }
function voz(){
  const caja = ge('ri-voz');
  if(oyendo){ pararVoz(); return aplicar(); }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if(!SR) return;
  texto = ''; rec = new SR(); rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = true;
  rec.onresult = ev => { let fin = '', prov = ''; for(let k = 0; k < ev.results.length; k++){ const r = ev.results[k][0].transcript; if(ev.results[k].isFinal) fin += r + ' , '; else prov += r; } texto = fin; caja.hidden = false; caja.innerHTML = `<b>Oigo:</b> ${esc(fin + prov)}`; };
  rec.onerror = ev => { if(ev.error === 'not-allowed' || ev.error === 'service-not-allowed'){ pararVoz(); caja.hidden = false; caja.textContent = 'Sin permiso de micrófono. Actívalo en los ajustes del navegador y vuelve a pulsar «Dictar receta».'; } };
  rec.onend = () => { if(oyendo){ try{ rec.start(); }catch(e){ pararVoz(); aplicar(); } } };
  oyendo = true; try{ rec.start(); }catch(e){}
  const b = document.querySelector('[data-ri="voz"]'); if(b){ b.classList.add('on'); b.innerHTML = '<i class="ti ti-player-stop"></i> Terminar y rellenar'; }
  caja.hidden = false; caja.innerHTML = '<b>Escuchando…</b> Di el nombre, «ingredientes» y cada uno con su cantidad. Pulsa «Terminar y rellenar» al acabar.';
}
function aplicar(){
  const caja = ge('ri-voz'), r = entender(texto);
  if(!r.ingredientes.length && !r.nombre){ caja.hidden = false; caja.textContent = 'No he entendido ningún ingrediente. Prueba otra vez diciendo, por ejemplo: «harina doscientos gramos».'; return; }
  rellenar(r);
  caja.hidden = false; caja.innerHTML = `He añadido <b>${r.ingredientes.length}</b> ingrediente${r.ingredientes.length === 1 ? '' : 's'}${r.nombre ? ', el nombre' : ''}${r.alg.length ? ' y ' + r.alg.length + ' alérgeno' + (r.alg.length === 1 ? '' : 's') : ''}. Revisa las filas y corrige lo que haga falta.`;
}
function rellenar(r){
  if(r.nombre && !ge('nr-nombre').value.trim()) ge('nr-nombre').value = r.nombre;
  const f = filasDom().filter(x => x.n.trim()).concat(r.ingredientes);
  escribirTexto(f); pintar();
  r.alg.forEach(id => { const el = document.querySelector(`#nr-alg-sel .alg-cb[data-id="${id}"]`); if(el && !el.classList.contains('sel')) el.classList.add('sel'); });
}
window.recetaRellenar = rellenar; // para las pruebas

const CSS = `#ri-filas{display:flex;flex-direction:column;gap:6px}
.ri-fila{display:grid;grid-template-columns:minmax(0,1fr) 72px 84px 40px;gap:6px;align-items:center}
.ri-fila input,.ri-fila select{min-width:0;width:100%}
.ri-x{background:none;border:.5px solid var(--border);border-radius:var(--radius);min-height:40px;color:var(--text-secondary);cursor:pointer;font-size:14px}
.ri-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ri-mic.on{background:var(--danger-bg);color:var(--danger-text);border-color:var(--danger-text)}
.ri-voz{margin-top:8px;font-size:13px;background:var(--bg-secondary);border:.5px solid var(--border);border-radius:var(--radius);padding:8px 10px}
.ri-ayuda{font-size:12px;color:var(--text-secondary);margin:6px 0 0}
@media(max-width:380px){.ri-fila{grid-template-columns:minmax(0,1fr) 60px 72px 40px}}`;
})();
