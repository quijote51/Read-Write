/* Recetas en la nube: UNA FILA POR RECETA (tabla public.recetas, clave hotel_id + id).
   Antes iban todas juntas en config.seda_rec y el último aparato en guardar pisaba los cambios de los demás.
   - Al guardar (saveRec) solo se suben las recetas que han cambiado en este aparato; las borradas se marcan
     con borrado=true (no se pierden y los demás aparatos se enteran).
   - Cada aparato recuerda qué versión de cada receta tiene la nube (localStorage 'seda_rec_sync'), así sabe
     qué ha cambiado aquí aunque se haya trabajado sin conexión.
   - Al cargar: primero sube lo pendiente de este aparato y luego baja la lista de la nube.
   - Primera vez (tabla vacía para este hotel): pasa las recetas de config.seda_rec (o las del aparato) a la tabla.
     config.seda_rec se deja como estaba, de copia.
   - Si otra persona cambió la misma receta mientras tanto, se juntan por campos: de este aparato solo se suben
     los campos que ha cambiado aquí (nombre, ingredientes, foto…) y se respetan los que cambió el otro.
     Solo si los dos cambiaron el mismo campo, queda el último, y se avisa en pantalla.
   Se usa en la app principal (recCargar, recSubir, recProgramar) y en las apps sueltas (recDeFila, vía app-base.js). */

const REC_COLS = ['id', 'nombre', 'cat', 'emoji', 'alg', 'ingredientes', 'img', 'base', 'rinde'];
const REC_SYNC = 'seda_rec_sync';

// Receta de la app → fila de la tabla (lo que no tiene columna propia va en «extra», para no perderlo)
function recAFila(r){
  const extra = {};
  Object.keys(r || {}).filter(k => !REC_COLS.includes(k) && !k.startsWith('_')).sort().forEach(k => { extra[k] = r[k]; });
  return {
    id: String(r.id), nombre: r.nombre ?? null, cat: r.cat ?? null, emoji: r.emoji ?? null,
    alg: Array.isArray(r.alg) ? r.alg : [], ingredientes: Array.isArray(r.ingredientes) ? r.ingredientes : [],
    img: r.img || null, base: !!r.base, rinde: r.base ? (r.rinde || null) : null, extra, borrado: false
  };
}
// Fila de la tabla → receta de la app
function recDeFila(f){
  const r = {...(f.extra || {}), id: String(f.id), nombre: f.nombre || '', cat: f.cat || 'F', emoji: f.emoji || '🍴',
    alg: Array.isArray(f.alg) ? f.alg : [], ingredientes: Array.isArray(f.ingredientes) ? f.ingredientes : []};
  if(f.img) r.img = f.img;
  if(f.base){ r.base = true; r.rinde = f.rinde || {cant: 1, ud: 'ud'}; }
  return r;
}
const recFirma = r => JSON.stringify(recAFila(r));

// Lo que este aparato sabe que hay en la nube: {id: firma}. null = este aparato aún no ha usado la tabla.
let _recNube = (() => { try{ return JSON.parse(localStorage.getItem(REC_SYNC) || 'null'); }catch(e){ return null; } })();
function _recGuardarNube(){ try{ localStorage.setItem(REC_SYNC, JSON.stringify(_recNube)); }catch(e){} }
const _recLista = () => (typeof recetas !== 'undefined' && Array.isArray(recetas) ? recetas : []);
const _recPuede = () => typeof supa !== 'undefined' && supa && typeof _uid !== 'undefined' && _uid;
function _recFallo(e){
  console.warn('Recetas nube', e);
  try{ localStorage.setItem('seda_pendiente', '1'); }catch(_){}
  if(typeof mostrarSync === 'function') mostrarSync(false);
}

// Qué ha cambiado en este aparato desde la última vez que habló con la nube
function recPendientes(){
  if(!_recNube) return {cambiadas: [], borradas: []};
  const local = _recLista(), ids = new Set(local.map(r => String(r.id)));
  return {
    cambiadas: local.filter(r => r && r.id != null && _recNube[String(r.id)] !== recFirma(r)),
    borradas: Object.keys(_recNube).filter(id => !ids.has(id))
  };
}

// Sube solo lo cambiado. Devuelve true si todo ha ido bien (o no había nada que subir).
let _recSubiendo = null, _recOtraVez = false;
async function recSubir(){
  if(!_recPuede() || !_recNube) return true;
  if(_recSubiendo){ _recOtraVez = true; return _recSubiendo; }
  _recSubiendo = (async () => {
    let ok = true;
    try{
      const {cambiadas, borradas} = recPendientes();
      if(cambiadas.length){
        // Cómo están ahora en la nube (por si otro aparato las ha cambiado desde que este las bajó)
        const ids = cambiadas.map(r => String(r.id));
        const {data: actuales, error: e0} = await supa.from('recetas').select('*').eq('hotel_id', _uid).in('id', ids);
        if(e0) throw e0;
        const enNube = {}; (actuales || []).forEach(f => { enNube[String(f.id)] = f; });
        const choques = [];
        const filas = cambiadas.map(r => {
          const id = String(r.id), mia = recAFila(r), nube = enNube[id], base = _recNube[id] ? JSON.parse(_recNube[id]) : null;
          if(!nube || !base) return mia;
          const deNube = recAFila(recDeFila(nube));
          if(JSON.stringify(deNube) === _recNube[id]) return mia; // nadie más la ha tocado
          // Juntar campo a campo: lo que he cambiado yo, mío; lo demás, de la nube
          const junta = {...deNube, borrado: false};
          Object.keys(mia).forEach(k => {
            const yoCambie = JSON.stringify(mia[k]) !== JSON.stringify(base[k]);
            if(!yoCambie) return;
            if(JSON.stringify(deNube[k]) !== JSON.stringify(base[k]) && JSON.stringify(deNube[k]) !== JSON.stringify(mia[k])) choques.push(r.nombre || id);
            junta[k] = mia[k];
          });
          // La receta del aparato pasa a ser la juntada
          const i = _recLista().findIndex(x => String(x.id) === id);
          if(i >= 0) recetas[i] = recDeFila(junta);
          return junta;
        });
        const {error} = await supa.from('recetas').upsert(filas.map(f => ({...f, hotel_id: _uid})), {onConflict: 'hotel_id,id'});
        if(error) throw error;
        filas.forEach(f => { _recNube[String(f.id)] = recFirma(recDeFila(f)); });
        if(filas.some((f, i) => recFirma(recDeFila(f)) !== recFirma(cambiadas[i]))){
          try{ localStorage.setItem('seda_rec', JSON.stringify(recetas)); }catch(e){}
          if(typeof renderRecetario === 'function' && document.getElementById('receta-grid')){ try{ renderRecetario(); }catch(e){} }
        }
        if(choques.length) recAviso(`${[...new Set(choques)].join(', ')}: otra persona cambió lo mismo a la vez. Se ha guardado tu versión.`);
      }
      if(borradas.length){
        const {error} = await supa.from('recetas').update({borrado: true}).eq('hotel_id', _uid).in('id', borradas);
        if(error) throw error;
        borradas.forEach(id => { delete _recNube[id]; });
      }
      _recGuardarNube();
      if((cambiadas.length || borradas.length) && typeof mostrarSync === 'function') mostrarSync(true);
    }catch(e){ ok = false; _recFallo(e); }
    return ok;
  })();
  const ok = await _recSubiendo;
  _recSubiendo = null;
  if(_recOtraVez){ _recOtraVez = false; return recSubir(); }
  return ok;
}
// Aviso pequeño abajo (solo cuando dos personas cambian el mismo dato de una receta a la vez)
function recAviso(txt){
  if(typeof document === 'undefined' || !document.body) return;
  const d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9998;max-width:520px;margin:0 auto;background:#1a1a1a;color:#f0efe9;border:1px solid #c9a84c;border-radius:12px;padding:10px 12px;font:14px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)';
  d.textContent = txt;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 7000);
}
let _recTimer = null;
function recProgramar(){ clearTimeout(_recTimer); _recTimer = setTimeout(recSubir, 700); }

// Baja las recetas de la nube (tras subir lo pendiente). Devuelve true si ha podido leer la nube.
async function recCargar(){
  if(!_recPuede()) return false;
  try{
    if(!(await recSubir())) return false;
    const {data, error} = await supa.from('recetas').select('*').eq('hotel_id', _uid);
    if(error) throw error;
    if(!data.length){
      // Primera vez: se pasan a la tabla las recetas de config.seda_rec (o, si no hay, las de este aparato)
      let origen = null;
      const c = await supa.from('config').select('value').eq('hotel_id', _uid).eq('key', 'seda_rec').maybeSingle();
      if(!c.error && c.data && Array.isArray(c.data.value)) origen = c.data.value;
      if(!origen) origen = _recLista();
      const filas = origen.filter(r => r && r.id != null).map(r => ({...recAFila(r), hotel_id: _uid}));
      if(filas.length){
        const {error: e2} = await supa.from('recetas').upsert(filas, {onConflict: 'hotel_id,id'});
        if(e2) throw e2;
      }
      recetas = origen.filter(r => r && r.id != null).map(r => recDeFila(recAFila(r)));
    }else{
      recetas = data.filter(f => !f.borrado).map(recDeFila);
    }
    _recNube = {}; recetas.forEach(r => { _recNube[String(r.id)] = recFirma(r); });
    _recGuardarNube();
    try{ localStorage.setItem('seda_rec', JSON.stringify(recetas)); }catch(e){}
    return true;
  }catch(e){ _recFallo(e); return false; }
}
