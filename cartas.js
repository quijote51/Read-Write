/* ══════════════════════════════════════
   OÍDO COCINA · Carta QR de alérgenos (módulo «Seguridad alimentaria»)
   El equipo crea «cartas públicas» (la carta del restaurante o el menú de un evento). Al publicar, la app calcula
   los alérgenos de cada plato (algDePlato / algDeRecetaCompleta) y guarda SOLO el nombre del plato y sus
   alérgenos en la tabla cartas_publicas (supabase/cartas-publicas.sql). El comensal la abre sin cuenta con el
   enlace o el QR: carta.html?c=<código>. Nada de recetas ni precios.
   Necesita sesión e internet (no se guarda en el aparato).
   Usa del principal: supa, _uid, eventos, recetas, recetaDePlato, algDePlato, algDeRecetaCompleta, ALERGENOS,
   CATS, fmtFecha, hotelDatos (marca.js).
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const BASE = () => location.origin + '/carta.html?c=';
const nuevoId = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; crypto.getRandomValues(new Uint32Array(10)).forEach(x => { s += a[x % a.length]; }); return s; };
const hoyK = () => new Date().toISOString().slice(0, 10);
const enLinea = () => typeof supa !== 'undefined' && supa && typeof _uid !== 'undefined' && _uid && navigator.onLine !== false;

let cartas = [], cargado = false, editando = null, msg = '', vista = 'lista';

function cargarQR(){
  return new Promise((ok, mal) => {
    if(window.qrcode) return ok();
    const s = document.createElement('script'); s.src = QR_LIB; s.onload = ok; s.onerror = () => mal(new Error('No se ha podido descargar el generador de QR.'));
    document.head.appendChild(s);
  });
}
function svgQR(texto, celda){
  const q = qrcode(0, 'M'); q.addData(texto); q.make();
  return q.createSvgTag({cellSize: celda || 5, margin: 2, scalable: true});
}

// Platos de la carta con sus alérgenos (lo único que se publica)
function platosDe(c){
  if(c.origen === 'evento'){
    const ev = (typeof eventos !== 'undefined' ? eventos : []).find(e => String(e.id) === String(c.evento));
    if(!ev) return [];
    return (ev.platos || []).map(p => ({cat: p.cat || '', nombre: p.nombre, alg: (typeof algDePlato === 'function' ? algDePlato(p) : (p.alg || [])).slice().sort()}));
  }
  return (c.recetas || []).map(id => (typeof recetas !== 'undefined' ? recetas : []).find(r => r.id === id)).filter(Boolean)
    .map(r => ({cat: r.cat || '', nombre: r.nombre, alg: (typeof algDeRecetaCompleta === 'function' ? algDeRecetaCompleta(r) : (r.alg || [])).slice().sort()}));
}
function contenidoDe(c){
  const d = typeof hotelDatos === 'function' ? hotelDatos() : {};
  const sinReceta = platosDe(c).filter(p => !p.alg.length).map(p => p.nombre);
  return {hotel: d.nombre || '', ciudad: d.ciudad || '', tel: d.tel || '', logo: /^https:/.test(d.logo || '') ? d.logo : '', platos: platosDe(c), nota: (c.nota || '').trim(), origen: c.origen, evento: c.evento || null, recetas: c.recetas || [], sinDatos: sinReceta};
}

async function cargar(){
  if(!enLinea()){ cargado = true; return; }
  const {data, error} = await supa.from('cartas_publicas').select('*').order('actualizado', {ascending: false});
  if(error){ msg = '!No se han podido cargar las cartas. ' + (/does not exist|schema cache/i.test(error.message || '') ? 'Falta activar las cartas en Supabase.' : 'Revisa la conexión.'); cargado = true; return; }
  cartas = data || []; cargado = true;
}
async function guardar(c){
  const fila = {id: c.id, titulo: c.titulo, contenido: contenidoDe(c), publicada: c.publicada !== false, actualizado: new Date().toISOString(), hotel_id: _uid};
  const {error} = await supa.from('cartas_publicas').upsert(fila, {onConflict: 'id'});
  if(error) throw error;
  await cargar();
}

function vLista(){
  if(!enLinea()) return `<div class="card"><p class="cq-ayuda">Las cartas QR se publican en internet: entra con tu cuenta y con conexión para crearlas o cambiarlas.</p></div>`;
  return `<div class="card"><b>Cartas con QR para el comensal</b>
    <p class="cq-ayuda">El comensal escanea el QR y ve cada plato con sus alérgenos, sin cuenta ni app. Solo se publica el nombre del plato y sus alérgenos. Cuando cambies un plato o una receta, pulsa «Actualizar».</p>
    <button class="btn btn-p" data-cq="nueva"><i class="ti ti-plus"></i> Nueva carta</button></div>
    ${cartas.length ? cartas.map(c => { const n = (c.contenido.platos || []).length;
      return `<div class="card cq-carta"><div class="cq-fila"><div class="cq-n"><b>${esc(c.titulo)}</b>
        <small>${n} plato${n === 1 ? '' : 's'} · actualizada el ${new Date(c.actualizado).toLocaleDateString('es-ES')}${c.publicada ? '' : ' · <span class="cq-off">retirada</span>'}</small></div></div>
        ${(c.contenido.sinDatos || []).length ? `<div class="cq-aviso">Sin alérgenos registrados: ${c.contenido.sinDatos.map(esc).join(', ')}. El comensal verá «pregunte al personal»: revisa sus recetas antes de poner el QR.</div>` : ''}
        <div class="cq-acc"><button class="btn-sec cq-sm" data-cq="ver" data-id="${esc(c.id)}"><i class="ti ti-qrcode"></i> QR y enlace</button>
        <button class="btn-sec cq-sm" data-cq="actualizar" data-id="${esc(c.id)}"><i class="ti ti-refresh"></i> Actualizar</button>
        <button class="btn-sec cq-sm" data-cq="editar" data-id="${esc(c.id)}">Editar</button>
        <button class="btn-sec cq-sm" data-cq="${c.publicada ? 'retirar' : 'publicar'}" data-id="${esc(c.id)}">${c.publicada ? 'Retirar' : 'Volver a publicar'}</button></div></div>`; }).join('')
    : '<div class="card"><p class="cq-vacio">Todavía no hay cartas.</p></div>'}`;
}
function vEditar(){
  const c = editando, evs = (typeof eventos !== 'undefined' ? eventos : []).filter(e => e.fecha >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const recs = (typeof recetas !== 'undefined' ? recetas : []).filter(r => !r.base).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return `<div class="card"><b>${c.nueva ? 'Nueva carta' : 'Editar carta'}</b>
    <div class="cq-form">
      <label>Título que verá el comensal<input id="cq-titulo" value="${esc(c.titulo || '')}" placeholder="Ej.: Carta de otoño · Menú boda Peps"></label>
      <label>Qué platos<select id="cq-origen"><option value="recetas"${c.origen !== 'evento' ? ' selected' : ''}>Elegir del recetario</option><option value="evento"${c.origen === 'evento' ? ' selected' : ''}>Los del menú de un evento</option></select></label>
      ${c.origen === 'evento'
        ? `<label class="cq-ancho">Evento<select id="cq-evento"><option value="">— Elige —</option>${evs.map(e => `<option value="${esc(e.id)}"${String(c.evento) === String(e.id) ? ' selected' : ''}>${esc(fmtFecha(e.fecha))} · ${esc(e.nombre)}</option>`).join('')}</select></label>`
        : `<div class="cq-ancho cq-recs">${recs.length ? recs.map(r => `<label class="cq-chk"><input type="checkbox" data-rec="${esc(r.id)}"${(c.recetas || []).includes(r.id) ? ' checked' : ''}> ${esc(r.nombre)}</label>`).join('') : '<p class="cq-vacio">El recetario está vacío.</p>'}</div>`}
      <label class="cq-ancho">Nota para el comensal (opcional)<input id="cq-nota" value="${esc(c.nota || '')}" placeholder="Ej.: Tenemos pan sin gluten. Pregunte por las opciones sin lactosa."></label>
    </div>
    <div class="cq-acc"><button class="btn btn-p" data-cq="guardar"><i class="ti ti-world-upload"></i> Publicar</button><button class="btn-sec" data-cq="cancelar">Cancelar</button></div></div>`;
}
async function vQR(id){
  const c = cartas.find(x => x.id === id); if(!c) return '';
  const url = BASE() + c.id;
  let qr = '';
  try{ await cargarQR(); qr = svgQR(url, 6); }catch(e){ qr = `<p class="cq-aviso">${esc(e.message)}</p>`; }
  return `<div class="card"><button class="back-btn" data-cq="volver"><i class="ti ti-arrow-left"></i> Volver</button>
    <div class="cq-poster" id="cq-poster"><div class="cq-p-t">Alérgenos</div><div class="cq-p-s">${esc(c.titulo)}</div>
      <div class="cq-qr">${qr}</div><div class="cq-p-i">Escanee el código con la cámara del móvil para ver los alérgenos de cada plato.</div>
      <div class="cq-p-h">${esc(c.contenido.hotel || '')}</div></div>
    <div class="cq-enlace"><input id="cq-url" readonly value="${esc(url)}"><button class="btn-sec cq-sm" data-cq="copiar">Copiar enlace</button></div>
    <div class="cq-acc"><button class="btn btn-p" data-cq="imprimir"><i class="ti ti-printer"></i> Imprimir el cartel</button><a class="btn-sec" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Ver como el comensal</a></div></div>`;
}

async function pintar(){
  const root = ge('cq-root'); if(!root) return;
  if(!cargado){ root.innerHTML = '<div class="card"><p class="cq-vacio">Cargando…</p></div>'; await cargar(); }
  const aviso = msg ? `<div class="hz-aviso ${msg.startsWith('!') ? 'warn' : 'ok'}">${esc(msg.replace(/^!/, ''))}</div>` : '';
  msg = '';
  const cuerpo = vista === 'editar' ? vEditar() : vista.startsWith('qr:') ? await vQR(vista.slice(3)) : vLista();
  root.innerHTML = aviso + cuerpo;
}
const aviso = t => { msg = t; pintar(); };
function leerEdicion(){
  const c = editando; if(!c) return;
  const v = id => (ge(id) || {}).value;
  if(ge('cq-titulo')) c.titulo = v('cq-titulo').trim();
  if(ge('cq-nota')) c.nota = v('cq-nota');
  if(ge('cq-evento')) c.evento = v('cq-evento');
  const chks = document.querySelectorAll('#cq-root [data-rec]');
  if(chks.length) c.recetas = [...chks].filter(x => x.checked).map(x => x.dataset.rec);
}
function imprimirPoster(){
  const p = ge('cq-poster'); if(!p) return;
  let z = ge('cq-print'); if(!z){ z = document.createElement('div'); z.id = 'cq-print'; document.body.appendChild(z); }
  z.innerHTML = p.outerHTML;
  document.body.classList.add('cq-imprimiendo');
  const fin = () => { document.body.classList.remove('cq-imprimiendo'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin); window.print(); setTimeout(fin, 1500);
}
async function accion(a, b){
  const id = b && b.dataset.id, c = id && cartas.find(x => x.id === id);
  try{
    if(a === 'nueva'){ editando = {nueva: true, id: nuevoId(), titulo: '', origen: 'recetas', recetas: [], nota: ''}; vista = 'editar'; return pintar(); }
    if(a === 'editar' && c){ editando = {id: c.id, titulo: c.titulo, origen: c.contenido.origen || 'recetas', evento: c.contenido.evento, recetas: c.contenido.recetas || [], nota: c.contenido.nota || '', publicada: c.publicada}; vista = 'editar'; return pintar(); }
    if(a === 'cancelar' || a === 'volver'){ editando = null; vista = 'lista'; return pintar(); }
    if(a === 'guardar'){
      leerEdicion(); const e = editando;
      if(!e.titulo) return aviso('!Escribe un título.');
      if(e.origen === 'evento' && !e.evento) return aviso('!Elige el evento.');
      if(!platosDe(e).length) return aviso('!La carta no tiene platos.');
      await guardar(e); const nuevo = e.nueva; editando = null; vista = 'qr:' + e.id;
      return aviso(nuevo ? 'Carta publicada. Imprime el cartel con el QR.' : 'Carta actualizada.');
    }
    if(a === 'actualizar' && c){ await guardar({id: c.id, titulo: c.titulo, origen: c.contenido.origen, evento: c.contenido.evento, recetas: c.contenido.recetas, nota: c.contenido.nota, publicada: c.publicada}); return aviso('Alérgenos actualizados con las recetas de ahora.'); }
    if((a === 'retirar' || a === 'publicar') && c){
      const {error} = await supa.from('cartas_publicas').update({publicada: a === 'publicar'}).eq('id', c.id); if(error) throw error;
      await cargar(); return aviso(a === 'retirar' ? 'Carta retirada: el QR ya no muestra nada.' : 'Carta publicada de nuevo.');
    }
    if(a === 'ver' && c){ vista = 'qr:' + c.id; return pintar(); }
    if(a === 'copiar'){ const i = ge('cq-url'); i.select(); try{ await navigator.clipboard.writeText(i.value); }catch(e){ try{ document.execCommand('copy'); }catch(_){} } return; }
    if(a === 'imprimir') return imprimirPoster();
  }catch(err){ aviso('!No se ha podido: ' + (err.message || 'revisa la conexión')); }
}

let enlazado = false;
window.initCartas = function(){
  const root = ge('cq-root'); if(!root) return;
  if(!ge('cq-css')){ const st = document.createElement('style'); st.id = 'cq-css'; st.textContent = CSS; document.head.appendChild(st); }
  if(!enlazado){
    enlazado = true;
    root.addEventListener('click', e => { const b = e.target.closest('[data-cq]'); if(b){ e.preventDefault(); accion(b.dataset.cq, b); } });
    root.addEventListener('change', e => { if(e.target.id === 'cq-origen'){ leerEdicion(); editando.origen = e.target.value; pintar(); } });
  }
  cargado = false; pintar();
};

const CSS = `#cq-root .card{margin-bottom:10px}
.cq-ayuda{font-size:12px;color:var(--text-secondary);margin:4px 0 10px}
.cq-vacio{color:var(--text-secondary);font-size:13px;text-align:center;margin:8px 0}
.cq-fila{display:flex;gap:8px;align-items:center}.cq-n{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.cq-n small{font-size:12px;color:var(--text-secondary)}
.cq-off{color:var(--danger-text)}
.cq-aviso{font-size:12px;background:var(--warn-bg);color:var(--warn-text);border-radius:var(--radius);padding:6px 8px;margin-top:8px}
.cq-acc{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.cq-sm{padding:4px 9px;font-size:12px}
.cq-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:8px 0}
.cq-form>label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary);min-width:0}
.cq-ancho{grid-column:1/-1}
.cq-recs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 12px;max-height:260px;overflow:auto;border:.5px solid var(--border);border-radius:var(--radius);padding:8px}
.cq-chk{display:flex;gap:6px;align-items:flex-start;font-size:13px;color:var(--text-primary)}.cq-chk input{width:auto;margin-top:2px}
.cq-poster{border:2px solid var(--text-primary);border-radius:14px;padding:18px;text-align:center;margin:10px auto;max-width:360px;background:#fff;color:#111}
.cq-p-t{font-size:26px;font-weight:800}.cq-p-s{font-size:15px;margin:4px 0 10px}
.cq-qr svg{width:220px;height:220px;max-width:100%}.cq-p-i{font-size:13px;margin-top:8px}.cq-p-h{font-size:12px;color:#555;margin-top:10px}
.cq-enlace{display:flex;gap:6px;margin-top:8px}.cq-enlace input{flex:1;min-width:0;font-size:12px}
#cq-print{display:none}
@media print{body.cq-imprimiendo>*:not(#cq-print){display:none!important}body.cq-imprimiendo #cq-print{display:block}
  #cq-print .cq-poster{max-width:none;border-width:4px;padding:16mm;margin:10mm}#cq-print .cq-qr svg{width:110mm;height:110mm}#cq-print .cq-p-t{font-size:40pt}#cq-print .cq-p-s{font-size:20pt}#cq-print .cq-p-i{font-size:15pt}}`;
})();
