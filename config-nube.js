/* Configuración en la nube (tabla config: una fila por clave, p. ej. seda_precios, seda_inventario, seda_horarios)
   sin pisar los cambios de otros aparatos.
   Antes, cada guardado sustituía la clave entera: si dos personas cambiaban a la vez precios distintos, o
   contaban artículos distintos del inventario, se perdía lo del primero.
   Ahora cada aparato recuerda cómo estaba cada clave la última vez que habló con la nube (localStorage
   'seda_cfgbase_<clave>') y al guardar JUNTA DATO A DATO: lo que ha cambiado aquí, de aquí; lo que ha cambiado
   en la nube, de la nube. Solo si los dos cambiaron el mismo dato queda el de aquí, y se avisa.
   Si otro aparato guarda en el mismo instante, se nota (updated_at ya no coincide), se vuelve a juntar y se reintenta.
   También aquí: canonJSON (comparar sin depender del orden de los campos) y recAviso (aviso pequeño abajo).
   Se carga en todas las páginas antes que recetas-nube.js y tablas-nube.js. */

// Texto estable de un dato para compararlo: mismas claves en el mismo orden (la nube devuelve los campos de
// las listas, como los ingredientes, en otro orden que el móvil) y sin campos vacíos.
function canonJSON(v){
  const orden = x => {
    if(Array.isArray(x)) return x.map(orden);
    if(x && typeof x === 'object'){ const o = {}; Object.keys(x).sort().forEach(k => { if(x[k] !== undefined) o[k] = orden(x[k]); }); return o; }
    return x;
  };
  return JSON.stringify(orden(v)) ?? 'null';
}

// Aviso pequeño abajo (cuando dos personas cambian el mismo dato a la vez)
function recAviso(txt){
  if(typeof document === 'undefined' || !document.body) return;
  const d = document.createElement('div');
  d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9998;max-width:520px;margin:0 auto;background:#1a1a1a;color:#f0efe9;border:1px solid #c9a84c;border-radius:12px;padding:10px 12px;font:14px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)';
  d.textContent = txt;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 7000);
}

const _esObj = x => x && typeof x === 'object' && !Array.isArray(x);
// Junta tres versiones: base (como estaba), mia (este aparato) y nube. Devuelve el resultado.
// «choques» recoge dónde los dos cambiaron lo mismo de forma distinta (ahí gana lo de este aparato).
function cfgMezcla(base, mia, nube, ruta, choques){
  // La nube no tenía nada al leerla: se parte de vacío (así se juntan las altas de dos aparatos que empiezan a la vez)
  if(base === null || base === undefined){ if(_esObj(mia) && _esObj(nube)) base = {}; else if(Array.isArray(mia) && Array.isArray(nube)) base = []; }
  const cb = canonJSON(base), cm = canonJSON(mia), cn = canonJSON(nube);
  if(cm === cn) return mia;
  if(cm === cb) return nube;   // aquí no se ha tocado: lo de la nube
  if(cn === cb) return mia;    // en la nube no se ha tocado: lo de aquí
  if(_esObj(base) && _esObj(mia) && _esObj(nube)){
    const r = {};
    new Set([...Object.keys(base), ...Object.keys(mia), ...Object.keys(nube)]).forEach(k => {
      const v = cfgMezcla(base[k], mia[k], nube[k], ruta.concat(k), choques);
      if(v !== undefined) r[k] = v;   // undefined = borrado
    });
    return r;
  }
  if(Array.isArray(base) && Array.isArray(mia) && Array.isArray(nube) && mia.length >= base.length && nube.length >= base.length){
    // Listas que solo crecen (p. ej. artículos del inventario): lo de antes, junto elemento a elemento, y después
    // lo añadido en la nube (mantiene su posición) y lo añadido aquí que no esté ya
    const r = base.map((b, i) => cfgMezcla(b, mia[i], nube[i], ruta.concat(i), choques));
    const masNube = nube.slice(base.length), ya = new Set(masNube.map(canonJSON));
    return r.concat(masNube, mia.slice(base.length).filter(x => !ya.has(canonJSON(x))));
  }
  choques.push(ruta.join('.'));
  return mia;
}

const _cfgBaseLS = k => 'seda_cfgbase_' + k;
function cfgBase(key){ try{ const t = localStorage.getItem(_cfgBaseLS(key)); return t === null ? undefined : JSON.parse(t); }catch(e){ return undefined; } }
// Lo que hay en la nube para esta clave (tras leerla o tras guardarla)
function cfgFijarBase(key, valor){ try{ localStorage.setItem(_cfgBaseLS(key), JSON.stringify(valor)); }catch(e){} }

const CFG_NOMBRES = {seda_precios: 'precios', seda_inventario: 'inventario', seda_horarios: 'horarios', seda_ajustes: 'ajustes',
  seda_tipos: 'tipos de servicio', seda_bodega: 'bodega', seda_contactos: 'contactos', seda_alg_rev: 'revisión de alérgenos', seda_prevision: 'previsión'};

// Sube una clave juntándola con lo que haya en la nube. aplicar(valor) se llama si el resultado cambia lo de
// este aparato (para que la pantalla muestre lo juntado). Lanza el error si no se ha podido guardar.
const _cfgCola = {};
function cfgSubir(key, mia, aplicar){
  if(typeof puedeConfig === 'function' && !puedeConfig(key)) return Promise.resolve(true); // este rol no lo cambia: solo en el aparato
  const sigue = (_cfgCola[key] || Promise.resolve()).then(() => _cfgSubir(key, mia, aplicar));
  _cfgCola[key] = sigue.catch(() => {});
  return sigue;
}
async function _cfgSubir(key, mia, aplicar){
  for(let intento = 0; intento < 4; intento++){
    const {data, error} = await supa.from('config').select('value,updated_at').eq('hotel_id', _uid).eq('key', key).maybeSingle();
    if(error) throw error;
    const base = cfgBase(key), choques = [];
    // Sin memoria (primera vez en este aparato) se sube lo de aquí, como antes
    const valor = data && base !== undefined ? cfgMezcla(base, mia, data.value, [], choques) : mia;
    if(data && canonJSON(valor) === canonJSON(data.value)){
      cfgFijarBase(key, data.value);
      if(canonJSON(valor) !== canonJSON(mia) && aplicar) aplicar(data.value);
      return true;
    }
    const ahora = new Date().toISOString();
    let res;
    if(data){
      // Solo se guarda si nadie ha guardado desde que se leyó (misma fecha de cambio; sin fecha, la que esté vacía)
      let q = supa.from('config').update({value: valor, updated_at: ahora}).eq('hotel_id', _uid).eq('key', key);
      q = data.updated_at ? q.eq('updated_at', data.updated_at) : q.is('updated_at', null);
      res = await q.select('key');
    }else res = await supa.from('config').insert({hotel_id: _uid, key, value: valor, updated_at: ahora}).select('key');
    if(res.error){ if(!data && /duplicate|23505/i.test(String(res.error.code || res.error.message))) continue; throw res.error; }
    if(!res.data || !res.data.length) continue; // otro aparato ha guardado justo ahora: se vuelve a juntar
    cfgFijarBase(key, valor);
    if(canonJSON(valor) !== canonJSON(mia) && aplicar) aplicar(valor);
    if(choques.length) recAviso(`${CFG_NOMBRES[key] || key}: otra persona cambió lo mismo a la vez. Se ha guardado tu versión.`);
    return true;
  }
  throw new Error('No se ha podido guardar ' + key + ': demasiados cambios a la vez');
}
