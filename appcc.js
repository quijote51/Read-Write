/* ══════════════════════════════════════
   OÍDO COCINA · APPCC (autocontrol)
   Registros que pide la inspección: temperaturas de cámaras y mantenimiento en caliente,
   recepción de mercancía, limpieza, muestras testigo de eventos y etiquetas de elaboración.
   Datos en config 'seda_appcc':
     { equipos:[{id,n,min,max}], zonas:[{id,n,frec:'diaria'|'semanal'}], vida:{refrigerado,vacio,congelado},
       testigoDias, cts (fecha de la última edición de equipos/zonas/ajustes), reg:[registro] }
     registro = {id,t:'temp'|'recep'|'limp'|'testigo'|'etiq', f:ISO, por, ...campos, anulado?:{por,f,motivo}}
   Los registros no se editan: solo se anulan con motivo (queda constancia).
   Varios aparatos pueden registrar a la vez: al subir se fusiona con la nube por id, sin pisar lo de otros.
   Usa del principal, solo al ejecutarse: supa, _uid, eventos, proveedores, recetas, recetaDePlato, algDePlato, algLabel, fmtFecha.
   ══════════════════════════════════════ */
let appcc=(()=>{try{return JSON.parse(localStorage.getItem('seda_appcc')||'null')}catch(e){return null}})();
(function(){
const ge=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return isNaN(n)?null:n};
const pad=n=>String(n).padStart(2,'0');
const hoyK=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dmy=k=>k.slice(0,10).split('-').reverse().join('/');
const hm=iso=>{const d=new Date(iso);return pad(d.getHours())+':'+pad(d.getMinutes())};
const diaK=iso=>hoyK(new Date(iso));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmtT=v=>(Math.round(v*10)/10).toLocaleString('es-ES')+' °C';

const BASE=()=>({
  equipos:[
    {id:'carne',n:'Cámara de carne',min:0,max:4},{id:'pescado',n:'Cámara de pescado',min:0,max:2},
    {id:'verdura',n:'Cámara de verduras',min:0,max:8},{id:'lacteos',n:'Cámara de lácteos y postres',min:0,max:4},
    {id:'cong1',n:'Congelador 1',min:-30,max:-18},{id:'caliente',n:'Mantenimiento en caliente',min:63,max:100}],
  zonas:[
    {id:'sup',n:'Superficies y tablas de trabajo',frec:'diaria'},{id:'suelo',n:'Suelos',frec:'diaria'},
    {id:'freg',n:'Fregaderos y lavavajillas',frec:'diaria'},{id:'tir',n:'Puertas y tiradores de cámaras',frec:'diaria'},
    {id:'intcam',n:'Interior de cámaras',frec:'semanal'},{id:'campana',n:'Campana y filtros',frec:'semanal'},{id:'horno',n:'Hornos',frec:'semanal'}],
  vida:{refrigerado:3,vacio:7,congelado:90}, testigoDias:7, cts:0, reg:[]
});
const A=()=>{if(!appcc||typeof appcc!=='object')appcc=BASE();if(!Array.isArray(appcc.reg))appcc.reg=[];return appcc};
const vivos=()=>A().reg.filter(r=>!r.anulado);

/* ── Guardado y nube ── */
function guardarLocal(){try{localStorage.setItem('seda_appcc',JSON.stringify(A()))}catch(e){}}
// Une dos copias: registros por id (un registro anulado gana), equipos/zonas/ajustes de la copia editada más tarde.
function fusion(a,b){
  if(!b||typeof b!=='object')return a; if(!a||typeof a!=='object')return b;
  const m=new Map();
  (a.reg||[]).concat(b.reg||[]).forEach(r=>{if(!r||!r.id)return;const x=m.get(r.id);if(!x||(r.anulado&&!x.anulado))m.set(r.id,r)});
  const cfg=(b.cts||0)>(a.cts||0)?b:a;
  return {equipos:cfg.equipos||[],zonas:cfg.zonas||[],vida:cfg.vida||BASE().vida,testigoDias:cfg.testigoDias??7,cts:cfg.cts||0,
    reg:[...m.values()].sort((x,y)=>x.f.localeCompare(y.f))};
}
let subiendo=false,otraVez=false;
async function subir(){
  guardarLocal();
  if(typeof _uid==='undefined'||!_uid||typeof supa==='undefined'){try{if(typeof _uid!=='undefined'&&!_uid)return;localStorage.setItem('seda_pendiente','1')}catch(e){}return}
  if(subiendo){otraVez=true;return} subiendo=true;
  try{
    const {data,error}=await supa.from('config').select('value').eq('key','seda_appcc').maybeSingle();
    if(error)throw error;
    if(data&&data.value)appcc=fusion(A(),data.value);
    const r=await supa.from('config').upsert({hotel_id:_uid,key:'seda_appcc',value:A(),updated_at:new Date().toISOString()},{onConflict:'hotel_id,key'});
    if(r.error)throw r.error;
    guardarLocal(); if(typeof mostrarSync==='function')mostrarSync(true);
  }catch(e){console.warn('APPCC sync',e);try{localStorage.setItem('seda_pendiente','1')}catch(_){} if(typeof mostrarSync==='function')mostrarSync(false)}
  subiendo=false; if(otraVez){otraVez=false;subir()}
}
// Lo llama la carga de la nube: fusiona en vez de sustituir, para no perder registros hechos sin conexión.
window.appccDesdeNube=v=>{
  appcc=fusion(A(),v);
  const nube=JSON.stringify(((v&&v.reg)||[]).map(r=>r.id+(r.anulado?'x':'')).sort());
  setTimeout(()=>{guardarLocal(); if(JSON.stringify(A().reg.map(r=>r.id+(r.anulado?'x':'')).sort())!==nube)subir();},0);
  if(ge('tab-appcc')&&ge('tab-appcc').offsetParent!==null)pintar();
};
window.appccSubir=subir;

function nuevoReg(t,campos){ A().reg.push({id:uid(),t,f:new Date().toISOString(),por:yo(),...campos}); subir(); }
function yo(){try{return localStorage.getItem('seda_appcc_yo')||''}catch(e){return''}}

/* ── Estado de la interfaz ── */
let vista='hoy',msg='',mes=hoyK().slice(0,7),filtro='todos';
const VISTAS=[['hoy','Hoy'],['recep','Recepción'],['etiq','Etiquetas'],['reg','Registros'],['ajustes','Ajustes']];
const TIPOS={temp:'Temperatura',recep:'Recepción',limp:'Limpieza',testigo:'Muestra testigo',etiq:'Etiqueta'};
const fuera=(e,v)=>v<e.min||v>e.max;

/* ── Vista: Hoy ── */
function lecturasHoy(eq){const k=hoyK();return vivos().filter(r=>r.t==='temp'&&r.eq===eq.id&&diaK(r.f)===k)}
function franjaHecha(eq,manana){return lecturasHoy(eq).some(r=>(new Date(r.f).getHours()<15)===manana)}
function limpiezaPendiente(z){
  const ult=vivos().filter(r=>r.t==='limp'&&r.zona===z.id).map(r=>r.f).sort().pop();
  if(!ult)return true;
  if(z.frec==='diaria')return diaK(ult)!==hoyK();
  return (Date.now()-new Date(ult))>7*864e5-36e5;
}
function eventosHoy(){const k=hoyK();return (typeof eventos!=='undefined'?eventos:[]).filter(e=>e.fecha===k).sort((a,b)=>(a.hora||'').localeCompare(b.hora||''))}
function testigoDe(ev){return vivos().find(r=>r.t==='testigo'&&String(r.ev)===String(ev.id))}
function pendientes(){
  const tarde=new Date().getHours()>=15;
  let n=0; A().equipos.forEach(e=>{if(!franjaHecha(e,true))n++; if(tarde&&!franjaHecha(e,false))n++;});
  n+=A().zonas.filter(z=>z.frec==='diaria'&&limpiezaPendiente(z)).length;
  n+=eventosHoy().filter(e=>!testigoDe(e)).length;
  return n;
}
function vHoy(){
  const tarde=new Date().getHours()>=15;
  const temps=A().equipos.map(e=>{
    const l=lecturasHoy(e), ult=l[l.length-1];
    const fr=[['Mañana',franjaHecha(e,true)],['Tarde',franjaHecha(e,false)]];
    return `<div class="ap-fila"><div class="ap-n"><b>${esc(e.n)}</b><small>${fmtT(e.min)} a ${fmtT(e.max)}</small>
      <small>${fr.map(([t,h])=>`<span class="ap-chip ${h?'ok':(t==='Tarde'&&!tarde?'':'pend')}">${t}${h?' ✓':''}</span>`).join(' ')}${ult?` · última ${hm(ult.f)}: <b class="${fuera(e,ult.v)?'ap-mal':''}">${fmtT(ult.v)}</b>`:''}</small></div>
      <div class="ap-in"><input type="text" inputmode="decimal" id="ap-t-${esc(e.id)}" placeholder="°C" aria-label="Temperatura de ${esc(e.n)}">
      <button class="btn-sec" data-ap="temp" data-id="${esc(e.id)}">Guardar</button></div>
      <div class="ap-nota" id="ap-nota-${esc(e.id)}" hidden><input type="text" id="ap-tn-${esc(e.id)}" placeholder="Fuera de rango: ¿qué has hecho? (acción correctora)" aria-label="Acción correctora"></div></div>`}).join('');
  const zonas=A().zonas.map(z=>{const p=limpiezaPendiente(z);return `<div class="ap-fila"><div class="ap-n"><b>${esc(z.n)}</b><small>${z.frec==='diaria'?'Cada día':'Cada semana'}${p?'':' · hecho'}</small></div>
    ${p?`<button class="btn-sec" data-ap="limp" data-id="${esc(z.id)}">Hecho</button>`:'<span class="ap-chip ok">✓</span>'}</div>`}).join('');
  const evs=eventosHoy();
  const test=evs.length?evs.map(e=>{const t=testigoDe(e);return `<div class="ap-fila"><div class="ap-n"><b>${esc(e.nombre)}</b><small>${esc(e.hora||'')} · ${Number(e.pax)||0} pax${t?` · guardada ${hm(t.f)} por ${esc(t.por||'—')}, retirar a partir del ${dmy(hoyK(new Date(new Date(t.f).getTime()+(A().testigoDias||7)*864e5)))}`:''}</small></div>
    ${t?'<span class="ap-chip ok">✓</span>':`<button class="btn-sec" data-ap="testigo" data-id="${esc(e.id)}">Muestra guardada</button>`}</div>`}).join(''):'<p class="ap-vacio">No hay eventos hoy.</p>';
  return `<div class="card"><b>Temperaturas</b><p class="ap-ayuda">Dos lecturas al día por equipo: antes y después de las 15:00. Si sale fuera de rango, apunta qué has hecho.</p>${temps}</div>
  <div class="card"><b>Limpieza</b>${zonas}</div>
  <div class="card"><b>Muestras testigo de hoy</b><p class="ap-ayuda">Una ración de cada plato, identificada y fechada, en refrigeración o congelación durante ${A().testigoDias||7} días. Confirma con tu inspector si tus banquetes la necesitan.</p>${test}</div>`;
}

/* ── Vista: Recepción ── */
function vRecep(){
  const provs=(typeof proveedores!=='undefined'&&Array.isArray(proveedores)?proveedores:[]).map(p=>p.nombre||p.n).filter(Boolean);
  const hoy=vivos().filter(r=>r.t==='recep'&&diaK(r.f)===hoyK()).reverse();
  return `<div class="card"><b>Recepción de mercancía</b><p class="ap-ayuda">Refrigerado hasta 4 °C, congelado −18 °C o menos. Revisa envase, etiqueta y caducidad.</p>
  <div class="ap-form">
    <label>Proveedor<input id="ap-r-prov" list="ap-provs" type="text"></label><datalist id="ap-provs">${provs.map(p=>`<option value="${esc(p)}">`).join('')}</datalist>
    <label>Producto<input id="ap-r-prod" type="text"></label>
    <label>Temperatura (°C)<input id="ap-r-temp" type="text" inputmode="decimal" placeholder="Si aplica"></label>
    <label>Lote<input id="ap-r-lote" type="text"></label>
    <label>Caducidad<input id="ap-r-cad" type="date"></label>
    <label>Estado<select id="ap-r-ok"><option value="1">Aceptado</option><option value="0">Rechazado o con incidencia</option></select></label>
    <label class="ap-ancho">Observaciones<input id="ap-r-nota" type="text" placeholder="Obligatorio si hay incidencia"></label>
  </div><button class="btn btn-p" data-ap="recep" style="margin-top:8px">Guardar recepción</button></div>
  <div class="card"><b>Hoy</b>${hoy.length?hoy.map(r=>`<div class="ap-fila"><div class="ap-n"><b>${esc(r.prod)}</b><small>${hm(r.f)} · ${esc(r.prov||'—')}${r.temp!=null?' · '+fmtT(r.temp):''}${r.lote?' · lote '+esc(r.lote):''}${r.nota?' · '+esc(r.nota):''}</small></div><span class="ap-chip ${r.ok?'ok':'pend'}">${r.ok?'Aceptado':'Incidencia'}</span></div>`).join(''):'<p class="ap-vacio">Nada recibido todavía.</p>'}</div>`;
}

/* ── Vista: Etiquetas ── */
function vEtiq(){
  const recs=(typeof recetas!=='undefined'&&Array.isArray(recetas)?recetas:[]).map(r=>r.nombre).filter(Boolean);
  const ult=vivos().filter(r=>r.t==='etiq').slice(-8).reverse();
  return `<div class="card"><b>Etiqueta de elaboración</b><p class="ap-ayuda">Calcula la caducidad, pone un lote y los alérgenos de la receta. Imprímela en papel adhesivo.</p>
  <div class="ap-form">
    <label class="ap-ancho">Elaboración<input id="ap-e-prod" list="ap-recs" type="text"></label><datalist id="ap-recs">${recs.map(r=>`<option value="${esc(r)}">`).join('')}</datalist>
    <label>Conservación<select id="ap-e-cons"><option value="refrigerado">Refrigerado (${A().vida.refrigerado} días)</option><option value="vacio">Al vacío (${A().vida.vacio} días)</option><option value="congelado">Congelado (${A().vida.congelado} días)</option></select></label>
    <label>Días de vida útil<input id="ap-e-dias" type="number" min="0" placeholder="Por defecto"></label>
    <label>Cantidad<input id="ap-e-cant" type="text" placeholder="Ej. 2 kg"></label>
  </div><button class="btn btn-p" data-ap="etiq" style="margin-top:8px"><i class="ti ti-printer"></i> Guardar e imprimir</button></div>
  <div class="card"><b>Últimas etiquetas</b>${ult.length?ult.map(r=>`<div class="ap-fila"><div class="ap-n"><b>${esc(r.prod)}</b><small>Lote ${esc(r.lote)} · caduca ${dmy(r.cad)} · ${esc(r.por||'—')}</small></div><button class="btn-sec" data-ap="reimp" data-id="${esc(r.id)}">Imprimir</button></div>`).join(''):'<p class="ap-vacio">Aún no hay etiquetas.</p>'}</div>`;
}
function htmlEtiqueta(r){
  return `<div class="et"><div class="et-p">${esc(r.prod)}</div>
  <div class="et-l"><span>Elaborado</span><b>${dmy(diaK(r.f))} ${hm(r.f)}</b></div>
  <div class="et-l"><span>Caduca</span><b>${dmy(r.cad)}</b></div>
  <div class="et-l"><span>Lote</span><b>${esc(r.lote)}</b></div>
  <div class="et-l"><span>Conservación</span><b>${esc({refrigerado:'Refrigerado 0–4 °C',vacio:'Al vacío 0–4 °C',congelado:'Congelado −18 °C'}[r.cons]||r.cons)}</b></div>
  ${r.cant?`<div class="et-l"><span>Cantidad</span><b>${esc(r.cant)}</b></div>`:''}
  <div class="et-a">${r.alg&&r.alg.length?'Alérgenos: '+r.alg.map(a=>esc(typeof algLabel==='function'?algLabel(a):a)).join(', '):'Alérgenos: consultar receta'}</div>
  <div class="et-f">${esc(r.por||'')}</div></div>`;
}
function imprimirEtiqueta(r){
  const css=`@page{size:62mm 45mm;margin:2mm}body{margin:0;font-family:system-ui,Arial,sans-serif;color:#000}.et{width:58mm;font-size:8.5pt;line-height:1.25}
.et-p{font-size:11pt;font-weight:700;border-bottom:1px solid #000;margin-bottom:2px;padding-bottom:1px}.et-l{display:flex;justify-content:space-between;gap:4px}.et-l span{color:#333}
.et-a{margin-top:2px;font-weight:700}.et-f{font-size:7pt;color:#333}`;
  const doc=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta ${esc(r.prod)}</title><style>${css}</style></head><body>${htmlEtiqueta(r)}</body></html>`;
  const f=document.createElement('iframe'); f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f); const d=f.contentWindow.document; d.open(); d.write(doc); d.close();
  setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){} setTimeout(()=>f.remove(),60000)},250);
}

/* ── Vista: Registros ── */
function delMes(){return A().reg.filter(r=>r.f.slice(0,7)===mes&&(filtro==='todos'||r.t===filtro)).slice().reverse()}
function detalle(r){
  if(r.t==='temp'){const e=A().equipos.find(x=>x.id===r.eq);return `${esc(e?e.n:r.eqn||r.eq)}: <b class="${r.fuera?'ap-mal':''}">${fmtT(r.v)}</b>${r.nota?' · '+esc(r.nota):''}`}
  if(r.t==='limp'){const z=A().zonas.find(x=>x.id===r.zona);return esc(z?z.n:r.zonan||r.zona)}
  if(r.t==='recep')return `${esc(r.prod)} · ${esc(r.prov||'—')}${r.temp!=null?' · '+fmtT(r.temp):''}${r.lote?' · lote '+esc(r.lote):''} · ${r.ok?'aceptado':'<b class="ap-mal">incidencia</b>'}${r.nota?' · '+esc(r.nota):''}`;
  if(r.t==='testigo')return `${esc(r.evn||r.ev)}`;
  if(r.t==='etiq')return `${esc(r.prod)} · lote ${esc(r.lote)} · caduca ${dmy(r.cad)}`;
  return '';
}
function vReg(){
  const meses=[...new Set(A().reg.map(r=>r.f.slice(0,7)).concat([hoyK().slice(0,7)]))].sort().reverse();
  const l=delMes();
  return `<div class="card"><div class="ap-form">
    <label>Mes<select id="ap-mes">${meses.map(m=>`<option value="${m}" ${m===mes?'selected':''}>${m.split('-').reverse().join('/')}</option>`).join('')}</select></label>
    <label>Tipo<select id="ap-filtro"><option value="todos">Todos</option>${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}" ${k===filtro?'selected':''}>${v}</option>`).join('')}</select></label>
  </div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn-sec" data-ap="csv">Descargar CSV</button><button class="btn-sec" data-ap="impreg"><i class="ti ti-printer"></i> Imprimir</button></div>
  <p class="ap-ayuda">${l.length} registro${l.length===1?'':'s'}. Los registros no se borran: si uno está mal, anúlalo y explica por qué.</p></div>
  <div class="card ap-tabla-w"><table class="ap-tabla"><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Quién</th><th></th></tr></thead><tbody>
  ${l.map(r=>`<tr class="${r.anulado?'ap-anul':''}"><td>${dmy(diaK(r.f))} ${hm(r.f)}</td><td>${TIPOS[r.t]||r.t}</td><td>${detalle(r)}${r.anulado?`<br><small>Anulado por ${esc(r.anulado.por||'—')}: ${esc(r.anulado.motivo)}</small>`:''}</td><td>${esc(r.por||'—')}</td><td>${r.anulado?'':`<button class="btn-sec ap-sm" data-ap="anular" data-id="${esc(r.id)}">Anular</button>`}</td></tr>`).join('')||'<tr><td colspan="5" class="ap-vacio">Sin registros.</td></tr>'}
  </tbody></table></div>`;
}
function textoPlano(r){return detalle(r).replace(/<br>/g,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")}
function csv(){
  const q=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
  const filas=[['Fecha','Hora','Tipo','Detalle','Quién','Anulado','Motivo anulación']].concat(delMes().reverse().map(r=>[dmy(diaK(r.f)),hm(r.f),TIPOS[r.t]||r.t,textoPlano(r),r.por||'',r.anulado?'Sí':'',r.anulado?r.anulado.motivo:'']));
  const blob=new Blob(['﻿'+filas.map(f=>f.map(q).join(';')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`appcc-${mes}${filtro==='todos'?'':'-'+filtro}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
}
function imprimirRegistros(){
  const l=delMes().reverse();
  const doc=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>APPCC ${mes}</title><style>body{font-family:system-ui,Arial,sans-serif;font-size:10pt;margin:12mm}h1{font-size:14pt;margin:0 0 4px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:3px 4px;text-align:left;vertical-align:top}th{font-size:9pt;text-transform:uppercase;color:#444}.an{color:#888;text-decoration:line-through}</style></head><body>
  <h1>Registros APPCC · ${mes.split('-').reverse().join('/')}${filtro==='todos'?'':' · '+TIPOS[filtro]}</h1><p>${l.length} registros. Impreso el ${dmy(hoyK())} a las ${hm(new Date().toISOString())}.</p>
  <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Quién</th></tr></thead><tbody>${l.map(r=>`<tr class="${r.anulado?'an':''}"><td>${dmy(diaK(r.f))} ${hm(r.f)}</td><td>${TIPOS[r.t]||r.t}</td><td>${esc(textoPlano(r))}${r.anulado?' (anulado: '+esc(r.anulado.motivo)+')':''}</td><td>${esc(r.por||'')}</td></tr>`).join('')}</tbody></table></body></html>`;
  const f=document.createElement('iframe'); f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f); const d=f.contentWindow.document; d.open(); d.write(doc); d.close();
  setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){} setTimeout(()=>f.remove(),60000)},250);
}

/* ── Vista: Ajustes ── */
function vAjustes(){
  return `<div class="card"><b>Cámaras y equipos</b><p class="ap-ayuda">Nombre y rango correcto en °C. Congelador: de −30 a −18. Mantenimiento en caliente: 63 o más.</p>
  ${A().equipos.map((e,i)=>`<div class="ap-aj"><input type="text" data-eq="${i}" data-k="n" value="${esc(e.n)}" aria-label="Nombre del equipo"><input type="text" inputmode="decimal" data-eq="${i}" data-k="min" value="${e.min}" aria-label="Mínimo"><input type="text" inputmode="decimal" data-eq="${i}" data-k="max" value="${e.max}" aria-label="Máximo"><button class="btn-sec ap-sm" data-ap="quitaeq" data-i="${i}" aria-label="Quitar">✕</button></div>`).join('')}
  <button class="btn-sec" data-ap="addeq" style="margin-top:6px">Añadir equipo</button></div>
  <div class="card"><b>Zonas de limpieza</b>
  ${A().zonas.map((z,i)=>`<div class="ap-aj"><input type="text" data-zo="${i}" data-k="n" value="${esc(z.n)}" aria-label="Zona"><select data-zo="${i}" data-k="frec" aria-label="Frecuencia"><option value="diaria" ${z.frec==='diaria'?'selected':''}>Cada día</option><option value="semanal" ${z.frec==='semanal'?'selected':''}>Cada semana</option></select><button class="btn-sec ap-sm" data-ap="quitazo" data-i="${i}" aria-label="Quitar">✕</button></div>`).join('')}
  <button class="btn-sec" data-ap="addzo" style="margin-top:6px">Añadir zona</button></div>
  <div class="card"><b>Plazos</b><div class="ap-form">
    <label>Refrigerado (días)<input type="number" min="0" data-vida="refrigerado" value="${A().vida.refrigerado}"></label>
    <label>Al vacío (días)<input type="number" min="0" data-vida="vacio" value="${A().vida.vacio}"></label>
    <label>Congelado (días)<input type="number" min="0" data-vida="congelado" value="${A().vida.congelado}"></label>
    <label>Muestra testigo (días)<input type="number" min="1" data-testigo="1" value="${A().testigoDias||7}"></label>
  </div><p class="ap-ayuda">Ajusta los plazos a lo que diga tu plan APPCC.</p></div>`;
}
function tocaAjustes(){A().cts=Date.now();subir()}

/* ── Pintar ── */
function pintar(){
  const root=ge('ap-root'); if(!root)return;
  const n=pendientes();
  const f={hoy:vHoy,recep:vRecep,etiq:vEtiq,reg:vReg,ajustes:vAjustes}[vista];
  root.innerHTML=`<div class="ap-cab"><label class="ap-yo">Quién registra<input id="ap-yo" type="text" value="${esc(yo())}" placeholder="Tu nombre"></label>
    <span class="ap-chip ${n?'pend':'ok'}">${n?n+' pendiente'+(n===1?'':'s')+' hoy':'Todo al día'}</span></div>
  <div class="ap-tabs" role="tablist">${VISTAS.map(([k,t])=>`<button role="tab" aria-selected="${k===vista}" class="${k===vista?'on':''}" data-v="${k}">${t}</button>`).join('')}</div>
  ${msg?`<div class="hz-aviso ${msg.startsWith('!')?'warn':'ok'}">${esc(msg.replace(/^!/,''))}</div>`:''}
  ${f()}`;
  msg='';
}
function aviso(t){msg=t;pintar()}
function necesitaNombre(){if(yo())return false;aviso('!Escribe tu nombre en «Quién registra» para que quede constancia.');setTimeout(()=>{const i=ge('ap-yo');if(i)i.focus()},0);return true}

function accion(a,b){
  const id=b.dataset.id;
  if(['temp','limp','testigo','recep','etiq'].includes(a)&&necesitaNombre())return;
  if(a==='temp'){
    const e=A().equipos.find(x=>x.id===id); const v=num(ge('ap-t-'+id)?.value); if(!e)return;
    if(v===null)return aviso('!Escribe la temperatura de '+e.n+'.');
    const nota=(ge('ap-tn-'+id)?.value||'').trim();
    if(fuera(e,v)&&!nota){const c=ge('ap-nota-'+id);if(c){c.hidden=false;ge('ap-tn-'+id).focus()}msg='';return}
    nuevoReg('temp',{eq:e.id,eqn:e.n,v,fuera:fuera(e,v),nota});
    return aviso(`${e.n}: ${fmtT(v)} guardado${fuera(e,v)?' con acción correctora':''}.`);
  }
  if(a==='limp'){const z=A().zonas.find(x=>x.id===id);if(!z)return;nuevoReg('limp',{zona:z.id,zonan:z.n});return aviso(z.n+': limpieza registrada.')}
  if(a==='testigo'){const e=(typeof eventos!=='undefined'?eventos:[]).find(x=>String(x.id)===id);if(!e)return;nuevoReg('testigo',{ev:String(e.id),evn:e.nombre});return aviso('Muestra testigo de '+e.nombre+' registrada.')}
  if(a==='recep'){
    const prod=(ge('ap-r-prod').value||'').trim(); if(!prod)return aviso('!Escribe el producto recibido.');
    const ok=ge('ap-r-ok').value==='1', nota=(ge('ap-r-nota').value||'').trim();
    if(!ok&&!nota)return aviso('!Explica la incidencia en Observaciones.');
    nuevoReg('recep',{prov:(ge('ap-r-prov').value||'').trim(),prod,temp:num(ge('ap-r-temp').value),lote:(ge('ap-r-lote').value||'').trim(),cad:ge('ap-r-cad').value||'',ok,nota});
    return aviso('Recepción de '+prod+' guardada.');
  }
  if(a==='etiq'){
    const prod=(ge('ap-e-prod').value||'').trim(); if(!prod)return aviso('!Escribe qué has elaborado.');
    const cons=ge('ap-e-cons').value, dias=num(ge('ap-e-dias').value)??A().vida[cons]??3;
    const ahora=new Date(), cad=hoyK(new Date(ahora.getTime()+dias*864e5));
    const delDia=A().reg.filter(r=>r.t==='etiq'&&diaK(r.f)===hoyK()).length+1;
    const lote=`${String(ahora.getFullYear()).slice(2)}${pad(ahora.getMonth()+1)}${pad(ahora.getDate())}-${pad(delDia)}`;
    const rec=typeof recetaDePlato==='function'?recetaDePlato({nombre:prod}):null;
    const alg=rec&&typeof algDePlato==='function'?algDePlato({nombre:prod,receta_id:rec.id}):[];
    nuevoReg('etiq',{prod,cons,dias,cad,lote,alg,cant:(ge('ap-e-cant').value||'').trim()});
    imprimirEtiqueta(A().reg[A().reg.length-1]);
    return aviso(`Etiqueta de ${prod}: lote ${lote}, caduca el ${dmy(cad)}.`);
  }
  if(a==='reimp'){const r=A().reg.find(x=>x.id===id);if(r)imprimirEtiqueta(r);return}
  if(a==='anular'){
    const r=A().reg.find(x=>x.id===id); if(!r)return;
    const motivo=(prompt('¿Por qué anulas este registro? Quedará anotado.')||'').trim(); if(!motivo)return;
    r.anulado={por:yo(),f:new Date().toISOString(),motivo}; subir(); return aviso('Registro anulado.');
  }
  if(a==='csv')return csv();
  if(a==='impreg')return imprimirRegistros();
  if(a==='addeq'){A().equipos.push({id:uid(),n:'Equipo nuevo',min:0,max:4});tocaAjustes();return pintar()}
  if(a==='addzo'){A().zonas.push({id:uid(),n:'Zona nueva',frec:'diaria'});tocaAjustes();return pintar()}
  if(a==='quitaeq'){A().equipos.splice(+b.dataset.i,1);tocaAjustes();return pintar()}
  if(a==='quitazo'){A().zonas.splice(+b.dataset.i,1);tocaAjustes();return pintar()}
}

let enlazado=false;
window.initAPPCC=function(){
  const root=ge('ap-root'); if(!root)return;
  if(!ge('ap-css')){const st=document.createElement('style');st.id='ap-css';st.textContent=CSS;document.head.appendChild(st)}
  if(!enlazado){
    enlazado=true;
    root.addEventListener('click',e=>{
      const v=e.target.closest('[data-v]'); if(v){vista=v.dataset.v;return pintar()}
      const b=e.target.closest('[data-ap]'); if(b)accion(b.dataset.ap,b);
    });
    root.addEventListener('change',e=>{
      const t=e.target;
      if(t.id==='ap-yo'){try{localStorage.setItem('seda_appcc_yo',t.value.trim())}catch(_){}return pintar()}
      if(t.id==='ap-mes'){mes=t.value;return pintar()}
      if(t.id==='ap-filtro'){filtro=t.value;return pintar()}
      if(t.dataset.eq!=null){const e2=A().equipos[+t.dataset.eq];if(!e2)return;if(t.dataset.k==='n')e2.n=t.value.trim()||e2.n;else{const n=num(t.value);if(n!==null)e2[t.dataset.k]=n}return tocaAjustes()}
      if(t.dataset.zo!=null){const z=A().zonas[+t.dataset.zo];if(!z)return;z[t.dataset.k]=t.dataset.k==='n'?(t.value.trim()||z.n):t.value;return tocaAjustes()}
      if(t.dataset.vida){const n=num(t.value);if(n!==null&&n>=0){A().vida[t.dataset.vida]=n;tocaAjustes()}return}
      if(t.dataset.testigo){const n=num(t.value);if(n!==null&&n>=1){A().testigoDias=n;tocaAjustes()}return}
    });
    root.addEventListener('keydown',e=>{
      if(e.key!=='Enter')return; const t=e.target; const m=(t.id||'').match(/^ap-tn?-(.+)$/);
      if(m){e.preventDefault();const b=root.querySelector(`[data-ap="temp"][data-id="${CSS_ESC(m[1])}"]`);if(b)b.click()}
    });
  }
  pintar();
};
const CSS_ESC=s=>(window.CSS&&window.CSS.escape)?window.CSS.escape(s):s.replace(/"/g,'\\"');

const CSS=`#ap-root .card{margin-bottom:10px}
.ap-cab{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;justify-content:space-between;margin-bottom:8px}
.ap-yo{display:flex;flex-direction:column;font-size:12px;color:var(--text-secondary);gap:3px;flex:1;min-width:160px}
.ap-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:10px;padding-bottom:2px}
.ap-tabs button{border:.5px solid var(--border);background:var(--bg-primary);color:var(--text-secondary);border-radius:999px;padding:6px 12px;font-size:13px;white-space:nowrap;cursor:pointer}
.ap-tabs button.on{background:var(--text-primary);color:var(--bg-primary);border-color:var(--text-primary)}
.ap-ayuda{font-size:12px;color:var(--text-secondary);margin:4px 0 8px}
.ap-fila{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 0;border-top:.5px solid var(--border)}
.ap-n{flex:1;min-width:150px;display:flex;flex-direction:column;gap:2px}.ap-n small{font-size:12px;color:var(--text-secondary)}
.ap-in{display:flex;gap:6px}.ap-in input{width:80px}
.ap-nota{flex-basis:100%}.ap-nota input{width:100%}
.ap-chip{display:inline-block;font-size:11px;font-weight:600;border-radius:999px;padding:2px 8px;background:var(--bg-secondary);color:var(--text-secondary)}
.ap-chip.ok{background:var(--success-bg);color:var(--success-text)}.ap-chip.pend{background:var(--warn-bg);color:var(--warn-text)}
.ap-mal{color:var(--danger-text)}
.ap-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.ap-form label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--text-secondary);min-width:0}
.ap-ancho{grid-column:1/-1}
.ap-vacio{color:var(--text-secondary);font-size:13px;text-align:center;margin:8px 0}
.ap-tabla-w{overflow-x:auto;padding:0}.ap-tabla{width:100%;border-collapse:collapse;font-size:12px}
.ap-tabla th,.ap-tabla td{text-align:left;padding:6px 8px;border-bottom:.5px solid var(--border);vertical-align:top}
.ap-tabla th{font-size:11px;color:var(--text-secondary);font-weight:600}
.ap-anul td{color:var(--text-tertiary);text-decoration:line-through}.ap-anul small{text-decoration:none;display:inline-block}
.ap-sm{padding:3px 8px;font-size:12px}
@media(max-width:600px){.ap-tabla thead{display:none}.ap-tabla,.ap-tabla tbody{display:block}
.ap-tabla tr{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:8px 10px;border-bottom:.5px solid var(--border)}
.ap-tabla td{border:0;padding:0}.ap-tabla td:nth-child(1){font-weight:600}.ap-tabla td:nth-child(2){text-align:right;color:var(--text-secondary)}
.ap-tabla td:nth-child(3){grid-column:1/-1}.ap-tabla td:nth-child(4){color:var(--text-secondary)}.ap-tabla td:nth-child(5){text-align:right}}
.ap-aj{display:grid;grid-template-columns:1fr 64px 64px auto;gap:6px;margin-top:6px}
.ap-aj:has(select){grid-template-columns:1fr 120px auto}`;
})();
