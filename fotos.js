/* Fotos de recetas y vajilla
   - Las fotos se reducen antes de guardarlas (lado mayor 900 px, JPEG): pasan de varios MB a unos 60-120 KB.
     Así la app va ligera y no se gasta el espacio gratis de Supabase.
   - subirFoto(id, input): foto de una receta (el botón del recetario).
   - reducirFotosGuardadas(): reduce una sola vez las fotos grandes que ya estaban guardadas. */

const FOTO_LADO = 900, FOTO_CALIDAD = 0.78, FOTO_GRANDE = 250000; // caracteres del texto de la foto (~180 KB)

function _fotoCargar(src){
  return new Promise((ok, mal) => { const img = new Image(); img.onload = () => ok(img); img.onerror = mal; img.src = src; });
}
function _fotoLeer(file){
  return new Promise((ok, mal) => { const r = new FileReader(); r.onload = e => ok(e.target.result); r.onerror = mal; r.readAsDataURL(file); });
}
// Devuelve la foto reducida como texto (data:image/jpeg...). Si no se puede reducir, devuelve la original.
async function reducirImagen(src){
  try{
    const img = await _fotoCargar(src);
    const esc = Math.min(1, FOTO_LADO / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round(img.naturalWidth * esc)), h = Math.max(1, Math.round(img.naturalHeight * esc));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // fondo blanco para PNG con transparencia
    ctx.drawImage(img, 0, 0, w, h);
    const out = c.toDataURL('image/jpeg', FOTO_CALIDAD);
    return out.length < src.length ? out : src;
  }catch(e){ console.warn('Foto', e); return src; }
}
async function reducirFoto(file){
  if(!file) return null;
  if(!/^image\//.test(file.type || 'image/')){ alert('Ese archivo no es una foto.'); return null; }
  return reducirImagen(await _fotoLeer(file));
}

// Foto de una receta (botón «📷 Añadir foto» del detalle de la receta)
async function subirFoto(id, input){
  const file = input && input.files && input.files[0]; if(!file) return;
  const r = recetas.find(x => x.id === id); if(!r) return;
  const img = await reducirFoto(file); if(!img) return;
  r.img = img;
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
  if(nRec) saveRec(recetas);
  if(nVaj) saveVaj(vajilla);
  if(nRec || nVaj) console.info('Fotos reducidas:', nRec, 'recetas,', nVaj, 'vajilla');
}
