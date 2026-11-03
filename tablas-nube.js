/* Eventos, plantillas, vajilla, proveedores y personal en la nube, sin pisar cambios de otros aparatos.
   Antes, cada guardado subía la lista ENTERA tal como la tenía el aparato: si otro aparato había cambiado un
   evento mientras tanto, se le devolvía la versión vieja.
   Ahora (igual que las recetas, ver recetas-nube.js):
   - Cada aparato recuerda cómo estaba cada fila la última vez que habló con la nube (localStorage 'seda_sync_<tabla>').
   - Al guardar solo sube las filas que han cambiado AQUÍ y borra solo las que se han borrado AQUÍ.
   - De cada fila cambiada se suben SOLO los campos cambiados aquí, así lo que otro aparato cambie en otros campos
     de la misma fila se respeta (aunque guarden en el mismo segundo). Si los dos cambiaron el mismo campo, queda
     el último y se avisa.
   - Al cargar: primero sube lo pendiente de este aparato y luego toma la lista de la nube.
   - Primera vez en este aparato (sin memoria): sube lo que tenga, sin borrar nada (como antes).
   Usa de la app principal: supa, _uid, _esDemo, mostrarSync, _fallo, canonJSON y recAviso (recetas-nube.js). */

const TAB_LS = {eventos: 'seda_ev', plantillas: 'seda_plt', vajilla: 'seda_vaj', proveedores: 'seda_prov', personal: 'seda_personal'};
const TAB_LISTA = {
  eventos: () => (typeof eventos !== 'undefined' ? eventos : []),
  plantillas: () => (typeof plantillas !== 'undefined' ? plantillas : []),
  vajilla: () => (typeof vajilla !== 'undefined' ? vajilla : []),
  proveedores: () => (typeof proveedores !== 'undefined' ? proveedores : []),
  personal: () => (typeof personal !== 'undefined' ? personal : [])
};
// Campos que en la app y en la nube se llaman distinto: {nombre en la app: nombre de la columna}
const TAB_RENOMBRA = {plantillas: {desc: 'descripcion'}};
function tabANube(t, o){
  const m = TAB_RENOMBRA[t]; if(!m || !o) return o;
  const r = {...o}; Object.entries(m).forEach(([a, n]) => { if(a in r){ r[n] = r[a]; delete r[a]; } }); return r;
}
function tabDeNube(t, o){
  const m = TAB_RENOMBRA[t]; if(!m || !o) return o;
  const r = {...o}; Object.entries(m).forEach(([a, n]) => { if(n in r){ r[a] = r[n]; delete r[n]; } }); return r;
}
// Lo que se sube de cada tabla (los eventos de demostración nunca)
const tabSubibles = t => (TAB_LISTA[t]() || []).filter(x => x && x.id != null && !(t === 'eventos' && typeof _esDemo === 'function' && _esDemo(x)));

// Fila normalizada: id como texto, sin hotel_id y sin campos vacíos (null y «no está» valen lo mismo)
function tabFila(r){
  const o = {};
  Object.keys(r || {}).forEach(k => { if(k !== 'hotel_id' && !k.startsWith('_') && r[k] !== null && r[k] !== undefined) o[k] = r[k]; });
  o.id = String(r.id);
  return o;
}
const tabFirma = r => canonJSON(tabFila(r));

const _tabSnap = {};
function tabSnap(t){
  if(!(t in _tabSnap)){ try{ _tabSnap[t] = JSON.parse(localStorage.getItem('seda_sync_' + t) || 'null'); }catch(e){ _tabSnap[t] = null; } }
  return _tabSnap[t];
}
function tabGuardarSnap(t, s){ _tabSnap[t] = s; try{ localStorage.setItem('seda_sync_' + t, JSON.stringify(s)); }catch(e){} }
// Tras leer la nube: esto es lo que hay allí
function tabFijarDesdeNube(t, filas){ const s = {}; (filas || []).forEach(f => { s[String(f.id)] = tabFirma(tabDeNube(t, f)); }); tabGuardarSnap(t, s); }
function tabPendientes(t){
  const s = tabSnap(t); if(!s) return {cambiadas: [], borradas: []};
  const local = tabSubibles(t), ids = new Set(local.map(r => String(r.id)));
  return {cambiadas: local.filter(r => s[String(r.id)] !== tabFirma(r)), borradas: Object.keys(s).filter(id => !ids.has(id))};
}

const _tabCola = {};
// Sube lo cambiado de una tabla. Devuelve true si todo ha ido bien.
function tabSubir(t){
  if(typeof puedeTabla === 'function' && !puedeTabla(t)) return Promise.resolve(true); // este rol no lo cambia
  const sigue = (_tabCola[t] || Promise.resolve(true)).then(() => _tabSubir(t));
  _tabCola[t] = sigue.catch(() => false);
  return sigue;
}
async function _tabSubir(t){
  if(typeof supa === 'undefined' || !supa || typeof _uid === 'undefined' || !_uid) return false;
  try{
    let s = tabSnap(t);
    if(!s){
      // Primera vez en este aparato: se sube lo que hay (sin borrar nada en la nube)
      const filas = tabSubibles(t).map(r => ({...tabANube(t, tabFila(r)), hotel_id: _uid}));
      if(filas.length){ const {error} = await supa.from(t).upsert(filas, {onConflict: 'id'}); if(error) throw error; }
      s = {}; tabSubibles(t).forEach(r => { s[String(r.id)] = tabFirma(r); }); tabGuardarSnap(t, s);
      if(typeof mostrarSync === 'function') mostrarSync(true);
      return true;
    }
    const {cambiadas, borradas} = tabPendientes(t);
    if(!cambiadas.length && !borradas.length) return true;
    if(cambiadas.length){
      // Cómo están ahora en la nube: solo para avisar si otro aparato ha tocado el mismo dato
      const ids = cambiadas.map(r => String(r.id));
      const {data: actuales, error: e0} = await supa.from(t).select('*').in('id', ids);
      if(e0) throw e0;
      const enNube = {}; (actuales || []).forEach(f => { enNube[String(f.id)] = tabDeNube(t, f); });
      const choques = [];
      for(const r of cambiadas){
        const id = String(r.id), mia = tabFila(r), base = s[id] ? JSON.parse(s[id]) : null, nube = enNube[id];
        let fila = null;
        if(base && nube){
          // Se sube SOLO lo que ha cambiado en este aparato: lo que otro aparato cambie en otros campos se respeta,
          // aunque los dos guarden en el mismo segundo.
          const deNube = tabFila(nube), cambio = {};
          new Set([...Object.keys(mia), ...Object.keys(base)]).forEach(k => {
            if(k === 'id' || canonJSON(mia[k]) === canonJSON(base[k])) return;
            cambio[k] = k in mia ? mia[k] : null;
            if(canonJSON(deNube[k]) !== canonJSON(base[k]) && canonJSON(deNube[k]) !== canonJSON(mia[k])) choques.push(r.nombre || id);
          });
          if(!Object.keys(cambio).length){ s[id] = tabFirma(r); continue; }
          const {data, error} = await supa.from(t).update(tabANube(t, cambio)).eq('id', id).select();
          if(error) throw error;
          fila = data && data[0] && tabDeNube(t, data[0]);
        }
        if(!fila){
          // Fila nueva (o borrada en otro aparato mientras se editaba aquí): se sube entera
          const {data, error} = await supa.from(t).upsert({...tabANube(t, mia), hotel_id: _uid}, {onConflict: 'id'}).select();
          if(error) throw error;
          fila = data && data[0] && tabDeNube(t, data[0]);
        }
        if(fila){
          // Lo de este aparato pasa a ser lo que ha quedado en la nube (mismo objeto: no se rompen las referencias)
          const f = tabFila(fila);
          Object.keys(f).forEach(k => { if(k !== 'id') r[k] = f[k]; });
          Object.keys(tabFila(r)).forEach(k => { if(k !== 'id' && !(k in f)) r[k] = null; });
        }
        s[id] = tabFirma(r);
      }
      try{ localStorage.setItem(TAB_LS[t], JSON.stringify(TAB_LISTA[t]())); }catch(e){}
      if(choques.length && typeof recAviso === 'function') recAviso(`${[...new Set(choques)].join(', ')}: otra persona cambió lo mismo a la vez. Se ha guardado tu versión.`);
    }
    if(borradas.length){
      const {error} = await supa.from(t).delete().in('id', borradas);
      if(error) throw error;
      borradas.forEach(id => { delete s[id]; });
    }
    tabGuardarSnap(t, s);
    if(typeof mostrarSync === 'function') mostrarSync(true);
    return true;
  }catch(err){
    if(typeof _fallo === 'function') _fallo(t, err); else console.warn('Sync', t, err);
    return false;
  }
}
