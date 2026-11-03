/* Fotos de recetas y vajilla
   - Las fotos se reducen antes de guardarlas (lado mayor 900 px, JPEG): pasan de varios MB a unos 60-120 KB.
     Así la app va ligera y no se gasta el espacio gratis de Supabase.
   - subirFoto(id, input): foto de una receta (el botón del recetario).
   - reducirFotosGuardadas(): reduce una sola vez las fotos grandes que ya estaban guardadas y, con sesión,
     pasa al almacén las que aún iban dentro de los datos.
   - Con sesión, cada foto se sube al almacén de Supabase (carpeta «fotos/<cuenta>/…», supabase/fotos-almacen.sql)
     y en la receta o la pieza solo se guarda su enlace. Sin conexión o si falla, se guarda dentro como antes y
     se sube más tarde. Al cambiar una foto, la vieja se borra del almacén. */

const FOTO_LADO = 900, FOTO_CALIDAD = 0.78, FOTO_GRANDE = 250000; // caracteres del texto de la foto (~180 KB)

function _fotoCargar(src){
  return new Promise((ok, mal) => { const img = new Image(); img.onload = () => ok(img); img.onerror = mal; img.src = src; });
}
function _fotoLeer(file){
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = e => ok(e.target.result); r.onerror = mal; r.readAsDataURL(file); });
}
// Devuelve la foto reducida como texto (data:image/jpeg...). Si no se puede reducir, devuelve la original.
async function reducirImagen(src, lado = FOTO_LADO, calidad = FOTO_CALIDAD){ // albaranes: más grande para leer la letra
  try{
    const img = await _fotoCargar(src);
    const esc = Math.min(1, lado / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round(img.naturalWidth * esc)), h = Math.max(1, Math.round(img.naturalHeight * esc));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // fondo blanco para PNG con transparencia
    ctx.drawImage(img, 0, 0, w, h);
    const out = c.toDataURL('image/jpeg', calidad);
    return out.length < src.length ? out : src;
  }catch(e){ console.warn('Foto', e); return src; }
}
async function reducirFoto(file){
  if(!file) return null;
  if(!/^image\//.test(file.type || 'image/')){ alert('Ese archivo no es una foto.'); return null; }
  return reducirImagen(await _fotoLeer(file));
}

/* ── Almacén de fotos (Supabase Storage) ── */
const FOTOS_CARPETA = 'fotos';
const esFotoNube = s => typeof s === 'string' && s.includes('/storage/v1/object/public/' + FOTOS_CARPETA + '/');
const _fotoPuede = () => typeof supa !== 'undefined' && supa && supa.storage && typeof _uid !== 'undefined' && _uid && navigator.onLine !== false;
function _fotoBlob(dataUrl){
  const [cab, datos] = dataUrl.split(','), tipo = (cab.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(datos), u = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], {type: tipo});
}
// Sube una foto (data:image/...) y devuelve su enlace, o null si no se ha podido (se queda dentro, como antes)
async function fotoANube(dataUrl, carpeta, id){
  if(!_fotoPuede() || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null;
  try{
    const blob = _fotoBlob(dataUrl), ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const nombre = `${_uid}/${carpeta}/${String(id).replace(/[^\w-]/g, '_')}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const {error} = await supa.storage.from(FOTOS_CARPETA).upload(nombre, blob, {contentType: blob.type, cacheControl: '31536000', upsert: false});
    if(error) throw error;
    return supa.storage.from(FOTOS_CARPETA).getPublicUrl(nombre).data.publicUrl;
  }catch(e){ console.warn('Foto al almacén', e); return null; }
}
async function fotoBorrarNube(url){
  if(!esFotoNube(url) || !_fotoPuede()) return;
  try{ await supa.storage.from(FOTOS_CARPETA).remove([decodeURIComponent(url.split('/object/public/' + FOTOS_CARPETA + '/')[1].split('?')[0])]); }catch(e){}
}
// Guarda la foto nueva de un objeto (receta o pieza): al almacén si se puede; borra la anterior del almacén
async function fotoGuardar(obj, carpeta, dataUrl){
  const anterior = obj.img, url = await fotoANube(dataUrl, carpeta, obj.id);
  obj.img = url || dataUrl;
  if(url && anterior && anterior !== url) fotoBorrarNube(anterior);
  return obj.img;
}

// Foto de una receta (botón «📷 Añadir foto» del detalle de la receta)
async function subirFoto(id, input){
  const file = input && input.files && input.files[0]; if(!file) return;
  const r = recetas.find(x => x.id === id); if(!r) return;
  const img = await reducirFoto(file); if(!img) return;
  await fotoGuardar(r, 'recetas', img);
  saveRec(recetas);
  verReceta(id);
}

// Una vez por sesión, tras cargar la nube: reduce las fotos grandes de recetas y vajilla que ya había.
let _fotosRevisadas = false;
async function reducirFotosGuardadas(){
  if(_fotosRevisadas) return; _fotosRevisadas = true;
  const grande = x => x && typeof x.img === 'string' && x.img.startsWith('data:image') && x.img.length > FOTO_GRANDE;
  let nRec = 0, nVaj = 0;
  for(const r of (typeof recetas !== 'undefined' ? recetas : []).filter(grande)){ const n = await reducirImagen(r.img); if(n !== r.img){ r.img = n; nRec++; } }
  for(const v of (typeof vajilla !== 'undefined' ? vajilla : []).filter(grande)){ const n = await reducirImagen(v.img); if(n !== v.img){ v.img = n; nVaj++; } }
  // Con sesión: las fotos que aún van dentro de los datos pasan al almacén
  if(_fotoPuede()){
    const dentro = x => x && typeof x.img === 'string' && x.img.startsWith('data:image');
    for(const r of (typeof recetas !== 'undefined' ? recetas : []).filter(dentro)){ const u = await fotoANube(r.img, 'recetas', r.id); if(!u) break; r.img = u; nRec++; }
    for(const v of (typeof vajilla !== 'undefined' ? vajilla : []).filter(dentro)){ const u = await fotoANube(v.img, 'vajilla', v.id); if(!u) break; v.img = u; nVaj++; }
  }
  if(nRec) saveRec(recetas);
  if(nVaj) saveVaj(vajilla);
  if(nRec || nVaj) console.info('Fotos reducidas o pasadas al almacén:', nRec, 'recetas,', nVaj, 'vajilla');
}
