/* ══════════════════════════════════════
   OÍDO COCINA · Albaranes y costes
   Sobre los artículos del inventario (inventario.js, config 'seda_inventario'):
   - Albaranes: lo que llega, con su importe. Actualiza el precio del artículo y guarda el historial.
   - Precios: subidas recientes e historial por artículo.
   - Stock: mínimo por artículo y stock estimado = último recuento + entradas − consumo teórico de los eventos.
   - Mermas: entre dos recuentos, consumo real (inicial + entradas − final) frente al teórico de las recetas.
   - Enlaces: artículo del inventario ↔ ingrediente de las recetas (para el consumo teórico y el precio del escandallo).
   - Gasto: sumas por mes, proveedor, familia (sección del inventario) y artículo.
   - Si un producto del albarán no está en el inventario, se puede dar de alta desde la misma línea.
   App suelta: albaranes.html (window.CO_SUELTA=true: solo Albaranes, Gasto y Precios, porque allí no hay eventos para el stock y las mermas).
   Datos en config 'seda_compras':
     { alb:[{id,f,fecha,prov,num,por,lineas:[{a,cant,u,imp}],anulado?}], hist:[{id,f,a,p,u,prov,origen}],
       min:{articulo:cantidad}, enl:{articulo:ingrediente}, cts }
   Varios aparatos pueden apuntar a la vez: albaranes e historial se fusionan por id; mínimos y enlaces, el más reciente.
   Usa del principal, solo al ejecutarse: inventario, eventos, proveedores, recetas, preciosIng, savePrecios,
   calcIngredientesPedido, syncConfig, supa, _uid, mostrarSync.
   ══════════════════════════════════════ */
let compras=(()=>{try{return JSON.parse(localStorage.getItem('seda_compras')||'null')}catch(e){return null}})();
(function(){
const ge=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v??'').replace(/\s/g,'').replace(',','.'));return isNaN(n)?null:n};
const pad=n=>String(n).padStart(2,'0');
const hoyK=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dmy=k=>String(k||'').slice(0,10).split('-').reverse().join('/');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const eur=n=>(Math.round((n||0)*100)/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const fmt=n=>(Math.round((n||0)*100)/100).toLocaleString('es-ES',{maximumFractionDigits:2});
const pct=n=>(n>0?'+':'')+Math.round(n*100)+' %';
const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
// KG/KILO → kg, LITRO/LITROS → l, UNID → ud, PQT → paquete
const unidad=u=>{const x=norm(u);if(/^(kg|kilo|kilos|kgs)$/.test(x))return'kg';if(/^(l|litro|litros|lt)$/.test(x))return'l';if(/^(g|gr|gramos?)$/.test(x))return'g';if(/^(ml|mililitros?)$/.test(x))return'ml';if(/^(ud|uds|unid|unidad|unidades|u)$/.test(x))return'ud';if(/^(pqt|paquete|paquetes)$/.test(x))return'paquete';return x||'ud'};
// Convierte una cantidad de la unidad de la receta a la del artículo (g→kg, ml→l). null si no se puede.
const convertir=(cant,de,a)=>{de=unidad(de);a=unidad(a);if(de===a)return cant;if(de==='g'&&a==='kg')return cant/1000;if(de==='kg'&&a==='g')return cant*1000;if(de==='ml'&&a==='l')return cant/1000;if(de==='l'&&a==='ml')return cant*1000;return null};

const C=()=>{if(!compras||typeof compras!=='object')compras={alb:[],hist:[],min:{},enl:{},cts:0};['alb','hist'].forEach(k=>{if(!Array.isArray(compras[k]))compras[k]=[]});['min','enl'].forEach(k=>{if(!compras[k]||typeof compras[k]!=='object')compras[k]={}});return compras};
const INV=()=>(typeof inventario!=='undefined'&&inventario&&Array.isArray(inventario.articulos))?inventario:{articulos:[],conteos:{}};
const arts=()=>INV().articulos;
const artPorNombre=n=>arts().find(a=>a.n===n)||arts().find(a=>norm(a.n)===norm(n));
const recuentos=()=>Object.keys(INV().conteos||{}).sort();
const albVivos=()=>C().alb.filter(a=>!a.anulado);

/* ── Guardado y nube (mismo esquema que APPCC) ── */
function guardarLocal(){try{localStorage.setItem('seda_compras',JSON.stringify(C()))}catch(e){}}
function fusion(a,b){
  if(!b||typeof b!=='object')return a; if(!a||typeof a!=='object')return b;
  const une=(x,y)=>{const m=new Map();(x||[]).concat(y||[]).forEach(r=>{if(!r||!r.id)return;const o=m.get(r.id);if(!o||(r.anulado&&!o.anulado))m.set(r.id,r)});return [...m.values()].sort((p,q)=>String(p.f).localeCompare(String(q.f)))};
  const cfg=(b.cts||0)>(a.cts||0)?b:a;
  return {alb:une(a.alb,b.alb),hist:une(a.hist,b.hist),min:cfg.min||{},enl:cfg.enl||{},cts:cfg.cts||0};
}
let subiendo=false,otraVez=false;
async function subir(){
  guardarLocal();
  if(typeof puedeConfig==='function'&&!puedeConfig('seda_compras'))return;
  if(typeof _uid==='undefined'||!_uid||typeof supa==='undefined'||!supa)return;
  if(subiendo){otraVez=true;return} subiendo=true;
  try{
    const {data,error}=await supa.from('config').select('value').eq('key','seda_compras').maybeSingle();
    if(error)throw error;
    if(data&&data.value)compras=fusion(C(),data.value);
    const r=await supa.from('config').upsert({hotel_id:_uid,key:'seda_compras',value:C(),updated_at:new Date().toISOString()},{onConflict:'hotel_id,key'});
    if(r.error)throw r.error;
    guardarLocal(); if(typeof mostrarSync==='function')mostrarSync(true);
  }catch(e){console.warn('Compras sync',e);try{localStorage.setItem('seda_pendiente','1')}catch(_){} if(typeof mostrarSync==='function')mostrarSync(false)}
  subiendo=false; if(otraVez){otraVez=false;subir()}
}
const firma=o=>JSON.stringify(((o&&o.alb)||[]).map(r=>r.id+(r.anulado?'x':'')).concat(((o&&o.hist)||[]).map(r=>r.id)).sort());
window.comprasDesdeNube=v=>{
  const nube=firma(v); compras=fusion(C(),v);
  setTimeout(()=>{guardarLocal(); if(firma(C())!==nube)subir();},0);
  if(ge('tab-costes')&&ge('tab-costes').offsetParent!==null)pintar();
};
window.comprasSubir=subir;
window.comprasBajoMinimo=()=>Object.keys(C().min).filter(n=>{const a=artPorNombre(n),s=a&&stockEstimado(n);return s&&s.est<C().min[n]}); // avisos.js

/* ── Precios ── */
// Guarda el precio nuevo del artículo en el inventario y en el historial; si está enlazado, también en el escandallo.
function ponerPrecio(a,p,origen,prov){
  if(!a||!(p>0))return;
  const ant=a.p;
  if(ant!==p){
    a.p=Math.round(p*10000)/10000; INV().ts=Date.now();
    try{localStorage.setItem('seda_inventario',JSON.stringify(inventario))}catch(e){}
    if(typeof syncConfig==='function')syncConfig('seda_inventario',inventario);
  }
  const ult=histDe(a.n).slice(-1)[0];
  if(!ult||Math.abs(ult.p-p)>1e-9)C().hist.push({id:uid(),f:new Date().toISOString(),a:a.n,p:a.p,u:a.u,prov:prov||'',origen,ant:ant??null});
  const ing=C().enl[a.n];
  if(ing&&typeof preciosIng!=='undefined'&&preciosIng){
    const ud=(preciosIng[ing]&&preciosIng[ing].ud)||'';
    const f=convertir(1,ud||unidad(a.u),a.u); // cuánto artículo es una unidad del ingrediente
    if(f!==null){preciosIng[ing]={...(preciosIng[ing]||{}),precio:Math.round(a.p*f*1e6)/1e6,ud:ud||unidad(a.u)}; if(typeof savePrecios==='function')savePrecios(preciosIng)}
  }
}
const histDe=n=>C().hist.filter(h=>h.a===n).sort((x,y)=>x.f.localeCompare(y.f));
// Subidas y bajadas: precio actual frente al primero registrado dentro de la ventana (o el anterior).
function cambios(dias){
  const desde=Date.now()-dias*864e5, out=[];
  const porArt={}; C().hist.forEach(h=>{(porArt[h.a]=porArt[h.a]||[]).push(h)});
  Object.entries(porArt).forEach(([n,l])=>{
    l.sort((x,y)=>x.f.localeCompare(y.f)); const ult=l[l.length-1]; if(new Date(ult.f)<desde)return;
    const antes=l.filter(h=>new Date(h.f)<desde).pop(); const ref=antes?antes.p:(l.find(h=>h.ant!=null)||{}).ant;
    if(!(ref>0))return; const d=(ult.p-ref)/ref; if(Math.abs(d)<0.005)return;
    out.push({n,ref,p:ult.p,u:ult.u,d,f:ult.f,prov:ult.prov});
  });
  return out.sort((x,y)=>y.d-x.d);
}
function recetasCon(art){
  const ing=C().enl[art]; if(!ing||typeof recetas==='undefined')return [];
  return recetas.filter(r=>(r.ingredientes||[]).some(i=>norm(i.nombre)===norm(ing))).map(r=>r.nombre);
}

/* ── Stock y consumo ── */
function entradas(n,desde,hasta){ // desde exclusivo, hasta inclusivo (fechas AAAA-MM-DD)
  let t=0; albVivos().forEach(al=>{if(al.fecha>desde&&al.fecha<=hasta)(al.lineas||[]).forEach(l=>{if(l.a===n){const c=convertir(l.cant,l.u,artPorNombre(n)?.u||l.u);if(c!==null)t+=c}})});
  return t;
}
// Consumo teórico de los eventos entre dos fechas, por artículo enlazado. Devuelve {articulo: cantidad en su unidad}
function teorico(desde,hasta){
  const evs=(typeof eventos!=='undefined'?eventos:[]).filter(e=>e.fecha>desde&&e.fecha<=hasta);
  if(!evs.length||typeof calcIngredientesPedido!=='function')return {};
  const ings=calcIngredientesPedido(evs,[]), porIng={};
  ings.forEach(i=>{(porIng[norm(i.nombre)]=porIng[norm(i.nombre)]||[]).push(i)});
  const out={};
  Object.entries(C().enl).forEach(([art,ing])=>{
    const a=artPorNombre(art); if(!a)return;
    (porIng[norm(ing)]||[]).forEach(i=>{const c=convertir(i.total,i.ud,a.u);if(c!==null)out[art]=(out[art]||0)+c});
  });
  return out;
}
function idx(n){return arts().findIndex(a=>a.n===n)}
function stockEstimado(n){
  const ks=recuentos(); const k=ks[ks.length-1]; if(!k)return null;
  const i=idx(n); const base=(INV().conteos[k].c||{})[i]; if(base==null)return null;
  const hoy=hoyK(); const t=teorico(k,hoy)[n]||0;
  return {base,k,ent:entradas(n,k,hoy),teo:t,est:base+entradas(n,k,hoy)-t};
}

/* ── Interfaz ── */
let vista='alb',msg='',lineas=[],cab={prov:'',num:'',fecha:''},buscaP='',buscaS='',buscaE='',rk1='',rk2='',abierto=null;
const VISTAS_TODAS=[['alb','Albaranes'],['gasto','Gasto'],['precios','Precios'],['stock','Stock mínimo'],['mermas','Mermas'],['enl','Enlaces']];
const VISTAS_SUELTA=['alb','gasto','precios'];
const vistas=()=>window.CO_SUELTA?VISTAS_TODAS.filter(v=>VISTAS_SUELTA.includes(v[0])):VISTAS_TODAS;
let mesG='';
const UMS=['KG','LITRO','UNID','PQT'];
const secciones=()=>{const o=[];arts().forEach(a=>{if(a.s&&!o.includes(a.s))o.push(a.s)});return o};
function yo(){try{return localStorage.getItem('seda_appcc_yo')||''}catch(e){return''}}
function datalists(){
  const provs=(typeof proveedores!=='undefined'&&Array.isArray(proveedores)?proveedores:[]).map(p=>p.nombre).filter(Boolean);
  return `<datalist id="co-arts">${arts().map(a=>`<option value="${esc(a.n)}">`).join('')}</datalist><datalist id="co-provs">${provs.map(p=>`<option value="${esc(p)}">`).join('')}</datalist>`;
}

function vAlb(){
  if(!lineas.length)lineas=[{a:'',cant:'',imp:''}];
  const filas=lineas.map((l,i)=>{
    const a=artPorNombre(l.a);
    return `<div class="co-lin"><input list="co-arts" data-l="${i}" data-k="a" value="${esc(l.a)}" placeholder="Artículo" aria-label="Artículo">
      <input inputmode="decimal" data-l="${i}" data-k="cant" value="${esc(l.cant)}" placeholder="Cantidad${a?' ('+esc(unidad(a.u))+')':''}" aria-label="Cantidad">
      <input inputmode="decimal" data-l="${i}" data-k="imp" value="${esc(l.imp)}" placeholder="Importe €" aria-label="Importe de la línea">
      <button class="btn-sec co-sm" data-co="quitalin" data-i="${i}" aria-label="Quitar línea">✕</button><div class="co-lin-i" id="co-li-${i}">${infoLinea(l,i)}</div></div>`}).join('');
  const lista=C().alb.slice().reverse().slice(0,30);
  return `${datalists()}<datalist id="co-secs">${secciones().map(x=>`<option value="${esc(x)}">`).join('')}</datalist><div class="card"><div class="co-cab"><b>Nuevo albarán</b>${fotoDisponible()?`<label class="btn-sec co-foto"><i class="ti ti-camera"></i> Leer con foto<input type="file" accept="image/*" capture="environment" id="co-foto" hidden></label>`:''}</div><p class="co-ayuda">Una línea por producto: cantidad en la unidad del inventario e importe total de la línea (sin IVA, como en el albarán). El precio del artículo se actualiza solo.</p>
  <div class="co-form"><label>Proveedor<input id="co-prov" list="co-provs" type="text" value="${esc(cab.prov)}"></label><label>Nº de albarán<input id="co-num" type="text" value="${esc(cab.num)}"></label><label>Fecha<input id="co-fecha" type="date" value="${esc(cab.fecha||hoyK())}"></label></div>
  <div id="co-lineas">${filas}</div>
  <div class="co-acc"><button class="btn-sec" data-co="addlin">Añadir línea</button><span class="co-tot" id="co-tot"></span><button class="btn btn-p" data-co="guardaralb">Guardar albarán</button></div></div>
  <div class="card"><b>Últimos albaranes</b>${lista.length?lista.map(al=>{const tot=(al.lineas||[]).reduce((s,l)=>s+(l.imp||0),0);return `<div class="co-fila ${al.anulado?'co-anul':''}"><div class="co-n"><b>${esc(al.prov||'Sin proveedor')}${al.num?' · nº '+esc(al.num):''}</b><small>${dmy(al.fecha)} · ${(al.lineas||[]).length} línea${(al.lineas||[]).length===1?'':'s'} · ${eur(tot)}${al.por?' · '+esc(al.por):''}${al.anulado?' · anulado: '+esc(al.anulado.motivo):''}</small>
    ${abierto===al.id?`<div class="co-det">${(al.lineas||[]).map(l=>`<div>${esc(l.a)}: ${fmt(l.cant)} ${esc(unidad(l.u))} · ${eur(l.imp)} (${eur(l.cant?l.imp/l.cant:0)}/${esc(unidad(l.u))})</div>`).join('')}</div>`:''}</div>
    <button class="btn-sec co-sm" data-co="ver" data-id="${esc(al.id)}">${abierto===al.id?'Ocultar':'Ver'}</button>${al.anulado?'':`<button class="btn-sec co-sm" data-co="anular" data-id="${esc(al.id)}">Anular</button>`}</div>`}).join(''):'<p class="co-vacio">Todavía no hay albaranes.</p>'}</div>`;
}
function infoLinea(l,i){
  const a=artPorNombre(l.a), c=num(l.cant), imp=num(l.imp), pu=c&&imp?imp/c:null;
  if(l.a&&!a){
    if(!l.alta)return `<small class="co-sube">«${esc(l.a.trim())}» no está en el inventario.</small> <button class="btn-sec co-sm" data-co="altaart" data-i="${i}"><i class="ti ti-plus"></i> Añadirlo al inventario</button>`;
    return `<div class="co-alta"><b>Nuevo artículo: ${esc(l.a.trim())}</b>
      <label>Familia<input list="co-secs" data-l="${i}" data-k="s" value="${esc(l.s||'')}" placeholder="Ej: Carnes"></label>
      <label>Unidad<select data-l="${i}" data-k="u">${UMS.map(u=>`<option ${(l.u||'KG')===u?'selected':''}>${u}</option>`).join('')}</select></label>
      <button class="btn btn-p co-sm" data-co="creaart" data-i="${i}">Crear</button><button class="btn-sec co-sm" data-co="noalta" data-i="${i}">Cancelar</button></div>`;
  }
  if(!a)return '';
  if(!pu)return `<small>${esc(unidad(a.u))} · precio actual ${eur(a.p)}/${esc(unidad(a.u))}</small>`;
  return `<small class="${a.p&&pu>a.p*1.005?'co-sube':a.p&&pu<a.p*0.995?'co-baja':''}">${eur(pu)}/${esc(unidad(a.u))}${a.p?` · antes ${eur(a.p)} (${pct((pu-a.p)/a.p)})`:''}</small>`;
}
/* ── Foto del albarán ──
   Si la lectura con IA está activada (función «leer-albaran» de Supabase con su clave), se usa esa. Si no (o sin
   sesión), se lee GRATIS en el propio móvil (albaran-ocr.js). En los dos casos se rellena todo para revisar. */
const fotoDisponible=()=>typeof reducirImagen==='function'&&(typeof ocrAlbaran==='function'||(typeof supa!=='undefined'&&supa&&supa.functions));
let leyendo=false;
function progresoFoto(t){const m=document.querySelector('#co-root .hz-aviso');if(m)m.textContent=t}
async function leerConIA(img){
  if(typeof supa==='undefined'||!supa||!supa.functions||typeof _uid==='undefined'||!_uid)return null;
  const provs=(typeof proveedores!=='undefined'&&Array.isArray(proveedores)?proveedores:[]).map(p=>p.nombre).filter(Boolean);
  try{
    const {data,error}=await supa.functions.invoke('leer-albaran',{body:{imagen:img.split(',')[1],tipo:'image/jpeg',articulos:arts().map(a=>`${a.n} (${a.u})`),proveedores:provs}});
    if(error||!data||!Array.isArray(data.lineas))return null; // sin activar o sin conexión: se lee en el móvil
    return data;
  }catch(e){return null}
}
async function leerFotoDirecto(file){
  if(!file||leyendo)return; if(!fotoDisponible())return aviso('!Este aparato no puede leer fotos.');
  leyendo=true; aviso('Leyendo el albarán…');
  try{
    const img=await reducirImagen(await new Promise((ok,mal)=>{const r=new FileReader();r.onload=e=>ok(e.target.result);r.onerror=mal;r.readAsDataURL(file)}),1600,0.82);
    let data=await leerConIA(img);
    if(!data){
      if(typeof ocrAlbaran!=='function')throw new Error('La lectura con foto no está disponible ahora.');
      progresoFoto('Leyendo en el móvil… la primera vez tarda un poco más.');
      const provs=(typeof proveedores!=='undefined'&&Array.isArray(proveedores)?proveedores:[]).map(p=>p.nombre).filter(Boolean);
      data=await ocrAlbaran(img,arts(),provs,pct=>progresoFoto(`Leyendo en el móvil… ${pct} %`));
    }
    aplicarLeido(data);
  }catch(e){aviso('!'+(e.message||'No se ha podido leer el albarán.'))}
  finally{leyendo=false}
}
// Rellena «Nuevo albarán» con lo leído de la foto
function aplicarLeido(data){
  vista='alb';
  if(data.proveedor)cab.prov=data.proveedor; if(data.numero)cab.num=data.numero; if(/^\d{4}-\d{2}-\d{2}$/.test(data.fecha||''))cab.fecha=data.fecha;
  const coma=v=>v==null?'':String(v).replace('.',',');
  lineas=data.lineas.map(l=>{const a=l.articulo&&artPorNombre(l.articulo);return {a:a?a.n:(l.texto||''),cant:coma(l.cantidad),imp:coma(l.importe)}});
  if(!lineas.length){lineas=[{a:'',cant:'',imp:''}];return aviso('!No se han encontrado líneas en la foto. Prueba con más luz y el albarán recto, o apúntalo a mano.')}
  const sinEnlace=lineas.filter(l=>l.a&&!artPorNombre(l.a)).length;
  aviso(`Leído: ${data.lineas.length} línea${data.lineas.length===1?'':'s'}. Revisa cantidades e importes antes de guardar.${sinEnlace?` ${sinEnlace} no están en el inventario: puedes añadirlas desde su línea o borrarlas.`:''}${data.notas?' Nota: '+data.notas:''}`);
}
const intacto=()=>!cab.prov&&!cab.num&&lineas.every(l=>!l.a&&!l.cant&&!l.imp);
// «En pantalla»: la sección de costes está abierta (en la app suelta no hay acordeón) y se ve «Albaranes»
const enPantalla=()=>{const r=ge('co-root'),acc=ge('acc-costes');return !!(r&&r.offsetParent!==null&&vista==='alb'&&(!acc||acc.classList.contains('open')))};
async function leerImagen(file,progreso,ceder){
  progreso(5,'Preparando la foto…');
  const img=await reducirImagen(await new Promise((ok,mal)=>{const r=new FileReader();r.onload=e=>ok(e.target.result);r.onerror=mal;r.readAsDataURL(file)}),1600,0.82);
  await ceder();
  progreso(15,'Probando la lectura con IA…');
  let data=await leerConIA(img);
  if(!data){
    if(typeof ocrAlbaran!=='function')throw new Error('La lectura con foto no está disponible ahora.');
    progreso(20,'Leyendo en el móvil… la primera vez tarda un poco más.');
    const provs=(typeof proveedores!=='undefined'&&Array.isArray(proveedores)?proveedores:[]).map(p=>p.nombre).filter(Boolean);
    data=await ocrAlbaran(img,arts(),provs,pct=>progreso(20+pct*0.75,'Leyendo en el móvil…'));
  }
  return data;
}
// Pasa el albarán leído al formulario (si hay uno a medias, pregunta antes de sustituirlo)
function verLeido(data){
  if(!intacto()&&!confirm('Ya tienes un albarán a medias. ¿Sustituirlo por el leído de la foto?'))return 'Se mantiene tu albarán actual.';
  if(!window.CO_SUELTA&&typeof showTab==='function')showTab('costes');
  aplicarLeido(data); return 'Rellenado en «Nuevo albarán». Revisa y guarda.';
}
// La foto se lee en segundo plano (cola.js): se sigue usando la app y, al acabar, se avisa
function leerFoto(file){
  if(!file)return; if(!fotoDisponible())return aviso('!Este aparato no puede leer fotos.');
  if(typeof window.colaTarea!=='function')return leerFotoDirecto(file);
  aviso('La foto se lee en segundo plano: puedes seguir usando la app. Cuando termine, te aviso abajo a la izquierda.');
  window.colaTarea({titulo:'Leer albarán de la foto',
    ejecutar:(progreso,ceder)=>leerImagen(file,progreso,ceder),
    listo:data=>{
      const n=(data.lineas||[]).length;
      // Si seguías en «Nuevo albarán» sin tocarlo, se rellena solo, como siempre
      if(n&&enPantalla()&&intacto()){aplicarLeido(data);return {texto:'Leído y rellenado en «Nuevo albarán» ('+n+' línea'+(n===1?'':'s')+')',acciones:[]}}
      return {texto:n?'Leído: '+n+' línea'+(n===1?'':'s'):'No se han encontrado líneas en la foto',acciones:n?[{t:'Ver albarán',primaria:true,fn:()=>verLeido(data)}]:[]};
    },
    alFallar:e=>(e&&e.message)||'No se ha podido leer el albarán.'});
}
function totalLineas(){return lineas.reduce((s,l)=>s+(num(l.imp)||0),0)}

/* ── Gasto: sumas por mes ── */
const mesDe=k=>String(k||'').slice(0,7);
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const nomMes=m=>{const[y,mm]=m.split('-');return MESES[+mm-1]+' '+y};
const totAlb=al=>(al.lineas||[]).reduce((s,l)=>s+(l.imp||0),0);
function mesAnterior(m){const[y,mm]=m.split('-').map(Number);const d=new Date(y,mm-2,1);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
function sumar(lista,clave){const m={};lista.forEach(x=>{const k=clave(x);if(!m[k])m[k]={k,eur:0,n:0,cant:0,u:x.u};m[k].eur+=x.eur;m[k].n++;m[k].cant+=x.cant||0});return Object.values(m).sort((a,b)=>b.eur-a.eur)}
function barras(lista,total,extra){
  const max=Math.max(...lista.map(x=>x.eur),0)||1;
  return lista.map(x=>`<div class="co-bar"><div class="co-bar-t"><span>${esc(x.k)}</span><b>${eur(x.eur)}</b></div><div class="co-bar-f"><i style="width:${Math.max(2,x.eur/max*100)}%"></i></div><small>${total?Math.round(x.eur/total*100)+' % · ':''}${extra(x)}</small></div>`).join('');
}
function vGasto(){
  const vivos=albVivos();
  const meses=[...new Set(vivos.map(a=>mesDe(a.fecha)).concat([mesDe(hoyK())]))].filter(Boolean).sort().reverse();
  if(!meses.includes(mesG))mesG=meses[0];
  const delMes=vivos.filter(a=>mesDe(a.fecha)===mesG).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));
  const total=delMes.reduce((s,a)=>s+totAlb(a),0);
  const ant=vivos.filter(a=>mesDe(a.fecha)===mesAnterior(mesG)).reduce((s,a)=>s+totAlb(a),0);
  const anio=vivos.filter(a=>String(a.fecha).slice(0,4)===mesG.slice(0,4)&&mesDe(a.fecha)<=mesG).reduce((s,a)=>s+totAlb(a),0);
  const lineas_=delMes.flatMap(al=>(al.lineas||[]).map(l=>({prov:al.prov||'Sin proveedor',a:l.a,sec:(artPorNombre(l.a)||{}).s||'Sin familia',eur:l.imp||0,cant:l.cant,u:unidad(l.u)})));
  const porProv=sumar(lineas_.map(x=>({...x,cant:0})),x=>x.prov);
  porProv.forEach(p=>{p.alb=delMes.filter(a=>(a.prov||'Sin proveedor')===p.k).length});
  const porSec=sumar(lineas_,x=>x.sec);
  const porArt=sumar(lineas_,x=>x.a).slice(0,15);
  const dif=ant?(total-ant)/ant:null;
  return `<div class="card"><div class="co-form"><label>Mes<select id="co-mes">${meses.map(m=>`<option value="${m}" ${m===mesG?'selected':''}>${nomMes(m)}</option>`).join('')}</select></label></div>
    <div class="co-tiles"><div><small>Total del mes</small><b>${eur(total)}</b><small>${delMes.length} ${delMes.length===1?'albarán':'albaranes'}${dif!=null?` · <span class="${dif>0?'co-sube':'co-baja'}">${pct(dif)} vs ${MESES[+mesAnterior(mesG).slice(5)-1]}</span>`:''}</small></div>
    <div><small>Acumulado ${mesG.slice(0,4)}</small><b>${eur(anio)}</b><small>hasta ${MESES[+mesG.slice(5)-1]}</small></div></div>
    <p class="co-ayuda">Importes sin IVA, tal como se apuntan en los albaranes. Los anulados no cuentan.</p>
    ${delMes.length?`<button class="btn-sec" data-co="copiagasto"><i class="ti ti-copy"></i> Copiar resumen</button>`:''}</div>
  ${delMes.length?`<div class="card"><b>Por proveedor</b>${barras(porProv,total,x=>`${x.alb} ${x.alb===1?'albarán':'albaranes'}`)}</div>
  <div class="card"><b>Por familia</b>${barras(porSec,total,x=>`${x.n} línea${x.n===1?'':'s'}`)}</div>
  <div class="card"><b>Artículos con más gasto</b>${barras(porArt,0,x=>`${fmt(x.cant)} ${esc(x.u)} · ${eur(x.cant?x.eur/x.cant:0)}/${esc(x.u)} de media`)}</div>
  <div class="card"><b>Albaranes de ${nomMes(mesG)}</b>${delMes.map(al=>`<div class="co-fila"><div class="co-n"><b>${esc(al.prov||'Sin proveedor')}${al.num?' · nº '+esc(al.num):''}</b><small>${dmy(al.fecha)} · ${(al.lineas||[]).length} línea${(al.lineas||[]).length===1?'':'s'}</small>
    ${abierto===al.id?`<div class="co-det">${(al.lineas||[]).map(l=>`<div>${esc(l.a)}: ${fmt(l.cant)} ${esc(unidad(l.u))} · ${eur(l.imp)}</div>`).join('')}</div>`:''}</div><b class="co-imp">${eur(totAlb(al))}</b><button class="btn-sec co-sm" data-co="ver" data-id="${esc(al.id)}">${abierto===al.id?'Ocultar':'Ver'}</button></div>`).join('')}
    <div class="co-fila co-suma"><div class="co-n"><b>Total</b></div><b class="co-imp">${eur(total)}</b></div></div>`
  :'<div class="card"><p class="co-vacio">No hay albaranes en este mes.</p></div>'}`;
}
function textoGasto(){
  const vivos=albVivos().filter(a=>mesDe(a.fecha)===mesG), total=vivos.reduce((s,a)=>s+totAlb(a),0);
  const porProv={}; vivos.forEach(a=>{const k=a.prov||'Sin proveedor';porProv[k]=(porProv[k]||0)+totAlb(a)});
  return `*Gasto en albaranes · ${nomMes(mesG)}*\n`+Object.entries(porProv).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`— ${k}: ${eur(v)}`).join('\n')+`\n*Total: ${eur(total)}* (sin IVA)`;
}

function vPrecios(){
  const c=cambios(60);
  const q=norm(buscaP); const res=q?arts().filter(a=>norm(a.n).includes(q)).slice(0,20):[];
  return `<div class="card"><b>Cambios de precio en los últimos 60 días</b><p class="co-ayuda">Sale de los albaranes y de los cambios que hagas a mano. Las subidas de más del 10 % salen en rojo.</p>
  ${c.length?c.map(x=>{const rs=recetasCon(x.n);return `<div class="co-fila"><div class="co-n"><b>${esc(x.n)}</b><small>${eur(x.ref)} → ${eur(x.p)} /${esc(unidad(x.u))} · ${dmy(x.f.slice(0,10))}${x.prov?' · '+esc(x.prov):''}${rs.length?' · en '+rs.map(esc).join(', '):''}</small></div><span class="co-chip ${x.d>=0.1?'mal':x.d>0?'aviso':'bien'}">${pct(x.d)}</span></div>`}).join(''):'<p class="co-vacio">Sin cambios todavía. Aparecerán al apuntar albaranes.</p>'}</div>
  <div class="card"><b>Historial de un artículo</b><input id="co-buscap" type="search" placeholder="Buscar artículo" value="${esc(buscaP)}" aria-label="Buscar artículo" style="margin-top:6px">
  ${res.map(a=>{const h=histDe(a.n);return `<div class="co-fila"><div class="co-n"><b>${esc(a.n)}</b><small>Ahora ${eur(a.p)}/${esc(unidad(a.u))}${h.length?' · '+h.slice(-5).map(x=>`${dmy(x.f.slice(0,10))}: ${eur(x.p)}`).join(' · '):' · sin cambios registrados'}</small></div></div>`}).join('')}</div>`;
}

function vStock(){
  const ks=recuentos(), k=ks[ks.length-1];
  const conMin=Object.keys(C().min).map(n=>({n,min:C().min[n],a:artPorNombre(n),s:stockEstimado(n)})).filter(x=>x.a);
  const pedir=conMin.filter(x=>x.s&&x.s.est<x.min);
  const q=norm(buscaS); const res=q?arts().filter(a=>norm(a.n).includes(q)).slice(0,20):[];
  return `<div class="card"><b>Hay que pedir</b><p class="co-ayuda">${k?`Stock estimado = recuento del ${dmy(k)} + albaranes desde entonces − lo que gastan los eventos (solo artículos enlazados a recetas).`:'Haz un recuento en Inventario para poder calcular el stock.'}</p>
  ${pedir.length?pedir.map(x=>`<div class="co-fila"><div class="co-n"><b>${esc(x.n)}</b><small>Quedan ~${fmt(x.s.est)} ${esc(unidad(x.a.u))} · mínimo ${fmt(x.min)} · pedir al menos ${fmt(x.min-x.s.est)}</small></div><span class="co-chip mal">Pedir</span></div>`).join('')+`<button class="btn-sec" data-co="copiapedido" style="margin-top:8px"><i class="ti ti-copy"></i> Copiar pedido para WhatsApp</button>`:`<p class="co-vacio">${conMin.length?'Todo por encima del mínimo.':'Aún no hay mínimos. Ponlos abajo.'}</p>`}</div>
  <div class="card"><b>Mínimos</b>${conMin.map(x=>`<div class="co-fila"><div class="co-n"><b>${esc(x.n)}</b><small>${x.s?`Estimado ${fmt(x.s.est)} ${esc(unidad(x.a.u))} (recuento ${fmt(x.s.base)}${x.s.ent?' + entradas '+fmt(x.s.ent):''}${x.s.teo?' − eventos '+fmt(x.s.teo):''})`:'Sin recuento'}</small></div><input class="co-min" inputmode="decimal" data-min="${esc(x.n)}" value="${fmt(x.min)}" aria-label="Mínimo de ${esc(x.n)}"><button class="btn-sec co-sm" data-co="quitamin" data-n="${esc(x.n)}" aria-label="Quitar mínimo">✕</button></div>`).join('')}
  <input id="co-buscas" type="search" placeholder="Buscar artículo para poner mínimo" value="${esc(buscaS)}" aria-label="Buscar artículo" style="margin-top:8px">
  ${res.filter(a=>C().min[a.n]==null).map(a=>`<div class="co-fila"><div class="co-n"><b>${esc(a.n)}</b><small>${esc(a.s||'')} · ${esc(unidad(a.u))}</small></div><input class="co-min" inputmode="decimal" data-min="${esc(a.n)}" placeholder="Mínimo" aria-label="Mínimo de ${esc(a.n)}"></div>`).join('')}</div>`;
}

function vMermas(){
  const ks=recuentos();
  if(ks.length<2)return `<div class="card"><b>Mermas</b><p class="co-ayuda">Hacen falta dos recuentos de inventario para comparar. ${ks.length?`Tienes uno, del ${dmy(ks[0])}. Cuando hagas el siguiente en Inventario, aquí verás lo que se ha gastado de cada artículo frente a lo que tocaba según los eventos.`:'Todavía no hay ninguno.'}</p><p class="co-ayuda">Mientras tanto: apunta los albaranes y enlaza los artículos con las recetas en «Enlaces».</p></div>`;
  if(!ks.includes(rk1))rk1=ks[ks.length-2]; if(!ks.includes(rk2)||rk2<=rk1)rk2=ks[ks.length-1];
  const c1=INV().conteos[rk1].c||{}, c2=INV().conteos[rk2].c||{}, teo=teorico(rk1,rk2);
  const filas=arts().map((a,i)=>{
    if(c1[i]==null||c2[i]==null)return null;
    const ent=entradas(a.n,rk1,rk2), real=c1[i]+ent-c2[i], t=teo[a.n];
    const dif=t!=null?real-t:null;
    return {a,real,ent,ini:c1[i],fin:c2[i],t,dif,eur:dif!=null?dif*(a.p||0):null};
  }).filter(Boolean);
  const conTeo=filas.filter(f=>f.t!=null).sort((x,y)=>(y.eur||0)-(x.eur||0));
  const consumoEur=filas.reduce((s,f)=>s+Math.max(0,f.real)*(f.a.p||0),0);
  const mermaEur=conTeo.reduce((s,f)=>s+Math.max(0,f.eur||0),0);
  const top=filas.filter(f=>f.real>0).sort((x,y)=>y.real*(y.a.p||0)-x.real*(x.a.p||0)).slice(0,15);
  return `<div class="card"><div class="co-form"><label>Desde el recuento<select id="co-rk1">${ks.slice(0,-1).map(k=>`<option value="${k}" ${k===rk1?'selected':''}>${dmy(k)}</option>`).join('')}</select></label>
    <label>Hasta el recuento<select id="co-rk2">${ks.filter(k=>k>rk1).map(k=>`<option value="${k}" ${k===rk2?'selected':''}>${dmy(k)}</option>`).join('')}</select></label></div>
    <div class="co-tiles"><div><small>Consumo real</small><b>${eur(consumoEur)}</b></div><div><small>Merma en artículos enlazados</small><b class="${mermaEur>0?'co-sube':''}">${eur(mermaEur)}</b></div></div>
    <p class="co-ayuda">Consumo real = recuento inicial + albaranes − recuento final. La merma solo se calcula en los artículos enlazados con recetas (${conTeo.length} de ${filas.length}).</p></div>
  <div class="card co-tabla-w"><b>Artículos enlazados: real frente a eventos</b>${conTeo.length?`<table class="co-tabla"><thead><tr><th>Artículo</th><th>Real</th><th>Eventos</th><th>Diferencia</th><th>€</th></tr></thead><tbody>${conTeo.map(f=>`<tr><td>${esc(f.a.n)}</td><td>${fmt(f.real)} ${esc(unidad(f.a.u))}</td><td>${fmt(f.t)}</td><td class="${f.dif>0?'co-sube':''}">${f.dif>0?'+':''}${fmt(f.dif)} (${f.t?pct(f.dif/f.t):'—'})</td><td class="${f.eur>0?'co-sube':''}">${eur(f.eur)}</td></tr>`).join('')}</tbody></table>`:'<p class="co-vacio">Enlaza artículos con recetas en «Enlaces» para ver la merma.</p>'}</div>
  <div class="card co-tabla-w"><b>Lo que más se ha gastado</b><table class="co-tabla"><thead><tr><th>Artículo</th><th>Inicial</th><th>Entradas</th><th>Final</th><th>Gastado</th><th>€</th></tr></thead><tbody>${top.map(f=>`<tr><td>${esc(f.a.n)}</td><td>${fmt(f.ini)}</td><td>${fmt(f.ent)}</td><td>${fmt(f.fin)}</td><td>${fmt(f.real)} ${esc(unidad(f.a.u))}</td><td>${eur(f.real*(f.a.p||0))}</td></tr>`).join('')}</tbody></table></div>`;
}

function ingredientes(){
  const s=new Set(); (typeof recetas!=='undefined'?recetas:[]).forEach(r=>(r.ingredientes||[]).forEach(i=>{ if(i.nombre&&!(typeof subRecetaDe==='function'&&subRecetaDe(i))) s.add(i.nombre); })); // las elaboraciones base no se compran
  return [...s].sort((a,b)=>a.localeCompare(b,'es'));
}
// Propuesta automática: el ingrediente cuyo nombre contiene el del artículo (o al revés), con unidades compatibles.
function sugerencia(a){
  const n=norm(a.n); if(n.length<3)return null;
  const cand=ingredientes().filter(i=>{const m=norm(i);return m===n||m.startsWith(n+' ')||m.includes(' '+n)||n.startsWith(m+' ')});
  return cand[0]||null;
}
function vEnl(){
  const ings=ingredientes(); const enl=C().enl;
  const sug=arts().filter(a=>!enl[a.n]).map(a=>({a,s:sugerencia(a)})).filter(x=>x.s).slice(0,40);
  const q=norm(buscaE); const res=q?arts().filter(a=>norm(a.n).includes(q)).slice(0,20):[];
  return `<datalist id="co-ings">${ings.map(i=>`<option value="${esc(i)}">`).join('')}</datalist>
  <div class="card"><b>Para qué sirven</b><p class="co-ayuda">Enlazar un artículo del inventario con un ingrediente de las recetas permite calcular lo que deberían gastar los eventos (stock y mermas) y pasar el precio del albarán al escandallo.</p>
  <p class="co-ayuda">${Object.keys(enl).length} artículo${Object.keys(enl).length===1?'':'s'} enlazado${Object.keys(enl).length===1?'':'s'} de ${arts().length}.</p></div>
  ${sug.length?`<div class="card"><b>Propuestas</b>${sug.map(x=>`<div class="co-fila"><div class="co-n"><b>${esc(x.a.n)}</b><small>→ ${esc(x.s)}</small></div><button class="btn-sec co-sm" data-co="aceptaenl" data-n="${esc(x.a.n)}" data-i="${esc(x.s)}">Enlazar</button></div>`).join('')}</div>`:''}
  <div class="card"><b>Enlazados</b>${Object.entries(enl).map(([n,i])=>`<div class="co-fila"><div class="co-n"><b>${esc(n)}</b><small>→ ${esc(i)}</small></div><button class="btn-sec co-sm" data-co="quitaenl" data-n="${esc(n)}" aria-label="Quitar enlace">✕</button></div>`).join('')||'<p class="co-vacio">Ninguno todavía.</p>'}
  <input id="co-buscae" type="search" placeholder="Buscar artículo para enlazar" value="${esc(buscaE)}" aria-label="Buscar artículo" style="margin-top:8px">
  ${res.filter(a=>!enl[a.n]).map(a=>`<div class="co-fila"><div class="co-n"><b>${esc(a.n)}</b><small>${esc(unidad(a.u))}</small></div><input list="co-ings" data-enl="${esc(a.n)}" placeholder="Ingrediente de receta" aria-label="Ingrediente para ${esc(a.n)}"></div>`).join('')}</div>`;
}

function pintar(){
  const root=ge('co-root'); if(!root)return;
  if(!vistas().some(v=>v[0]===vista))vista='alb';
  const f={alb:vAlb,gasto:vGasto,precios:vPrecios,stock:vStock,mermas:vMermas,enl:vEnl}[vista];
  root.innerHTML=`${!arts().length?`<div class="hz-aviso warn">${window.CO_SUELTA&&!window.CO_INV_OK?'No se ha podido cargar el inventario. Conéctate a internet y vuelve a abrir la app.':'No hay artículos en el inventario. Puedes darlos de alta desde las líneas del albarán o cargarlos en Inventario.'}</div>`:''}
  <div class="co-tabs" role="tablist">${vistas().map(([k,t])=>`<button role="tab" aria-selected="${k===vista}" class="${k===vista?'on':''}" data-v="${k}">${t}</button>`).join('')}</div>
  ${msg?`<div class="hz-aviso ${msg.startsWith('!')?'warn':'ok'}">${esc(msg.replace(/^!/,''))}</div>`:''}${f()}`;
  msg=''; const t=ge('co-tot'); if(t)t.textContent=totalLineas()?'Total '+eur(totalLineas()):'';
}
function aviso(t){msg=t;pintar()}
function textoPedido(){
  const pedir=Object.keys(C().min).map(n=>({n,min:C().min[n],a:artPorNombre(n),s:stockEstimado(n)})).filter(x=>x.a&&x.s&&x.s.est<x.min);
  const porSec={}; pedir.forEach(x=>{(porSec[x.a.s||'Otros']=porSec[x.a.s||'Otros']||[]).push(x)});
  return `*Pedido · ${dmy(hoyK())}*\n`+Object.entries(porSec).map(([s,l])=>`\n*${s}*\n`+l.map(x=>`— ${x.n}: ${fmt(Math.ceil((x.min-x.s.est)*10)/10)} ${unidad(x.a.u)}`).join('\n')).join('\n');
}
function copiar(t,ok){
  const resp=()=>{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(e){}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,resp);else resp();
}

function accion(a,b){
  if(a==='addlin'){lineas.push({a:'',cant:'',imp:''});pintar();const l=document.querySelectorAll('#co-lineas [data-k="a"]');if(l.length)l[l.length-1].focus();return}
  if(a==='quitalin'){lineas.splice(+b.dataset.i,1);return pintar()}
  if(a==='guardaralb'){
    const prov=(ge('co-prov').value||'').trim(), num_=(ge('co-num').value||'').trim(), fecha=ge('co-fecha').value||hoyK();
    const ok=[],mal=[];
    lineas.forEach(l=>{const ar=artPorNombre(l.a),c=num(l.cant),imp=num(l.imp); if(!l.a&&!l.cant&&!l.imp)return; if(ar&&c>0&&imp!=null&&imp>=0)ok.push({a:ar.n,cant:c,u:ar.u,imp}); else mal.push(l.a||'(sin nombre)')});
    if(mal.length)return aviso('!Revisa estas líneas: '+mal.join(', ')+'. Cada línea necesita un artículo del inventario, una cantidad y un importe.');
    if(!ok.length)return aviso('!Añade al menos una línea.');
    C().alb.push({id:uid(),f:new Date().toISOString(),fecha,prov,num:num_,por:yo(),lineas:ok});
    let subidas=0; ok.forEach(l=>{const ar=artPorNombre(l.a);const pu=l.imp/l.cant;if(ar.p&&pu>ar.p*1.1)subidas++;if(pu>0)ponerPrecio(ar,pu,'albarán',prov)});
    lineas=[]; cab={prov:'',num:'',fecha:''}; subir();
    return aviso(`Albarán guardado: ${ok.length} línea${ok.length===1?'':'s'}, ${eur(ok.reduce((s,l)=>s+l.imp,0))}.${subidas?` ${subidas} artículo${subidas===1?' ha':'s han'} subido más de un 10 %: míralo en «Precios».`:''}`);
  }
  if(a==='altaart'){lineas[+b.dataset.i].alta=true;pintar();const s_=document.querySelector(`#co-li-${b.dataset.i} [data-k="s"]`);if(s_)s_.focus();return}
  if(a==='noalta'){lineas[+b.dataset.i].alta=false;return pintar()}
  if(a==='creaart'){
    const l=lineas[+b.dataset.i]; if(!l)return;
    const n=String(l.a||'').trim(), sec=String(l.s||'').trim(), u=l.u||'KG';
    if(!n)return; if(!sec)return aviso('!Escribe la familia del artículo (por ejemplo: Carnes, Pescados, Verduras).');
    if(window.CO_SUELTA&&!window.CO_INV_OK&&!(typeof inventario!=='undefined'&&inventario))return aviso('!No se ha podido cargar el inventario. Conéctate a internet para dar de alta artículos.');
    if(typeof inventario==='undefined')return;
    if(!inventario)inventario={articulos:[],conteos:{},ts:0};
    if(!Array.isArray(inventario.articulos))inventario.articulos=[];
    if(artPorNombre(n)){l.alta=false;return pintar()}
    inventario.articulos.push({s:sec,n,u,p:0}); inventario.ts=Date.now();
    try{localStorage.setItem('seda_inventario',JSON.stringify(inventario))}catch(e){}
    if(typeof syncConfig==='function')syncConfig('seda_inventario',inventario);
    l.a=n; l.alta=false; delete l.s; delete l.u;
    return aviso(`«${n}» añadido al inventario, en ${sec}. Su precio saldrá de este albarán.`);
  }
  if(a==='copiagasto')return copiar(textoGasto(),()=>aviso('Resumen copiado.'));
  if(a==='ver'){abierto=abierto===b.dataset.id?null:b.dataset.id;return pintar()}
  if(a==='anular'){
    const al=C().alb.find(x=>x.id===b.dataset.id); if(!al)return;
    const motivo=(prompt('¿Por qué anulas este albarán? Dejará de contar como entrada de stock (los precios no cambian).')||'').trim(); if(!motivo)return;
    al.anulado={por:yo(),f:new Date().toISOString(),motivo}; subir(); return aviso('Albarán anulado.');
  }
  if(a==='quitamin'){delete C().min[b.dataset.n];C().cts=Date.now();subir();return pintar()}
  if(a==='copiapedido')return copiar(textoPedido(),()=>aviso('Pedido copiado. Pégalo en WhatsApp.'));
  if(a==='aceptaenl'){C().enl[b.dataset.n]=b.dataset.i;C().cts=Date.now();subir();return pintar()}
  if(a==='quitaenl'){delete C().enl[b.dataset.n];C().cts=Date.now();subir();return pintar()}
}

let enlazado=false;
window.initCostes=function(){
  const root=ge('co-root'); if(!root)return;
  if(!ge('co-css')){const st=document.createElement('style');st.id='co-css';st.textContent=CSS;document.head.appendChild(st)}
  if(!enlazado){
    enlazado=true;
    root.addEventListener('click',e=>{
      const v=e.target.closest('[data-v]'); if(v){vista=v.dataset.v;return pintar()}
      const b=e.target.closest('[data-co]'); if(b)accion(b.dataset.co,b);
    });
    root.addEventListener('input',e=>{
      const t=e.target;
      if(t.dataset.l!=null){const i=+t.dataset.l;lineas[i][t.dataset.k]=t.value; if(t.dataset.k==='s'||t.dataset.k==='u')return; const tt=ge('co-tot'); if(tt)tt.textContent=totalLineas()?'Total '+eur(totalLineas()):''; const li=ge('co-li-'+i); if(li)li.innerHTML=infoLinea(lineas[i],i); return}
      if(t.id==='co-prov'||t.id==='co-num'||t.id==='co-fecha'){cab[t.id.slice(3)]=t.value;return}
      if(t.id==='co-buscap'||t.id==='co-buscas'||t.id==='co-buscae'){
        if(t.id==='co-buscap')buscaP=t.value;else if(t.id==='co-buscas')buscaS=t.value;else buscaE=t.value;
        const id=t.id,pos=t.selectionStart; pintar(); const n=ge(id); if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}
      }
    });
    root.addEventListener('change',e=>{
      const t=e.target;
      if(t.id==='co-foto'){const f=t.files&&t.files[0];t.value='';return leerFoto(f)}
      if(t.dataset.min!=null){const n=num(t.value);if(n===null||n<0)delete C().min[t.dataset.min];else C().min[t.dataset.min]=n;C().cts=Date.now();subir();return pintar()}
      if(t.dataset.enl!=null){const v=t.value.trim();if(v){C().enl[t.dataset.enl]=v;C().cts=Date.now();subir();return pintar()}return}
      if(t.dataset.l!=null&&t.dataset.k==='u'){lineas[+t.dataset.l].u=t.value;return}
      if(t.id==='co-mes'){mesG=t.value;return pintar()}
      if(t.id==='co-rk1'){rk1=t.value;return pintar()}
      if(t.id==='co-rk2'){rk2=t.value;return pintar()}
    });
  }
  pintar();
};

const CSS=`#co-root .card{margin-bottom:10px}
.co-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:10px;padding-bottom:2px}
.co-tabs button{border:.5px solid var(--border);background:var(--bg-primary);color:var(--text-secondary);border-radius:999px;padding:6px 12px;font-size:13px;white-space:nowrap;cursor:pointer}
.co-tabs button.on{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.co-ayuda{font-size:12px;color:var(--text-secondary);margin:4px 0 8px}
.co-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:8px}
.co-form label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary);min-width:0}
.co-lin{display:grid;grid-template-columns:1fr 92px 92px auto;gap:6px;margin-top:6px;align-items:center}
.co-lin-i{grid-column:1/-1;font-size:12px;min-height:0}.co-lin-i:empty{display:none}
@media(max-width:600px){.co-lin{grid-template-columns:1fr 1fr auto}.co-lin input[data-k="a"]{grid-column:1/-1}}
.co-acc{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}.co-tot{flex:1;font-weight:600;text-align:right}
.co-fila{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 0;border-top:.5px solid var(--border)}
.co-n{flex:1;min-width:150px;display:flex;flex-direction:column;gap:2px}.co-n small{font-size:12px;color:var(--text-secondary)}
.co-det{font-size:12px;color:var(--text-secondary);margin-top:4px;display:grid;gap:2px}
.co-anul .co-n b{text-decoration:line-through;color:var(--text-tertiary)}
.co-chip{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:2px 9px;background:var(--bg-secondary);color:var(--text-secondary);font-variant-numeric:tabular-nums}
.co-chip.mal{background:var(--danger-bg);color:var(--danger-text)}.co-chip.aviso{background:var(--warn-bg);color:var(--warn-text)}.co-chip.bien{background:var(--success-bg);color:var(--success-text)}
.co-sube{color:var(--danger-text)}.co-baja{color:var(--success-text)}
.co-min{width:90px}
.co-sm{padding:3px 8px;font-size:12px}
.co-vacio{color:var(--text-secondary);font-size:13px;text-align:center;margin:8px 0}
.co-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:4px 0}
.co-tiles div{background:var(--bg-secondary);border-radius:var(--radius);padding:8px 10px;display:flex;flex-direction:column;gap:2px}.co-tiles small{font-size:11px;color:var(--text-secondary)}.co-tiles b{font-size:18px;font-variant-numeric:tabular-nums}
.co-tabla-w{overflow-x:auto}.co-tabla{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;font-variant-numeric:tabular-nums}
.co-tabla th,.co-tabla td{text-align:left;padding:5px 6px;border-bottom:.5px solid var(--border);white-space:nowrap}.co-tabla td:first-child{white-space:normal;min-width:120px}
.co-tabla th{font-size:11px;color:var(--text-secondary);font-weight:600}
.co-cab{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.co-foto{cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px}
.co-alta{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:flex-end;padding:8px;margin-top:2px;border-radius:var(--radius);background:var(--bg-secondary)}
.co-alta>b{flex-basis:100%;font-size:12px}.co-alta label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--text-secondary);flex:1;min-width:110px}
.co-bar{padding:7px 0;border-top:.5px solid var(--border)}.co-bar:first-of-type{border-top:0}
.co-bar-t{display:flex;justify-content:space-between;gap:8px;font-size:13px}.co-bar-t span{min-width:0;overflow-wrap:anywhere}.co-bar-t b{font-variant-numeric:tabular-nums;white-space:nowrap}
.co-bar-f{height:6px;border-radius:3px;background:var(--bg-secondary);margin:4px 0 2px;overflow:hidden}.co-bar-f i{display:block;height:100%;background:#c9a84c;border-radius:3px}
.co-bar small{font-size:11px;color:var(--text-secondary)}
.co-imp{font-variant-numeric:tabular-nums;white-space:nowrap}.co-suma{border-top:1px solid var(--text-primary)}`;
})();
