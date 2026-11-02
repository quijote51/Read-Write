/* Inventario mensual — datos en config 'seda_inventario' (solo la cuenta del hotel; lleva precios).
   inventario = { articulos:[{s,n,u,p}], conteos:{'AAAA-MM-DD':{c:{idx:cant}, r:[idx revisar], p:{idx:precio congelado}}}, ts } */
let inventario=(()=>{try{return JSON.parse(localStorage.getItem('seda_inventario')||'null')}catch(e){return null}})();
(function(){
const ge=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=n=>(Math.round(n*100)/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'})+' €';
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?null:n};
const dmy=k=>k.split('-').reverse().join('-');
let fecha='',q='',modo='todos',msg='',abiertas=new Set(),tmr=null,provAb=false;
const PCAT=[['carnico','Cárnico'],['pescado','Pescadero'],['verdura','Fruta y verdura'],['lacteo','Lácteos y huevos'],['panaderia','Panadería'],['otros','Otros']];
const PV=()=>window.IV_PROV;

const I=()=>{if(!inventario)inventario={articulos:[],conteos:{},ts:0};return inventario};
const claves=()=>Object.keys(I().conteos).sort();
const cont=()=>I().conteos[fecha];
const precio=(i,c)=>{c=c||cont();const p=c.p&&c.p[i];return p!=null?p:I().articulos[i].p};
const cant=(i,c)=>{c=c||cont();return c.c[i]};
const valor=(i,c)=>precio(i,c)*(cant(i,c)||0);
const total=c=>I().articulos.reduce((s,_,i)=>s+valor(i,c),0);
const secciones=()=>{const o=[];I().articulos.forEach(a=>{if(!o.includes(a.s))o.push(a.s)});return o};
const prev=()=>{const k=claves(),i=k.indexOf(fecha);return i>0?I().conteos[k[i-1]]:null};

const vari=(i,c,pv)=>{if(!pv)return null;const ct=cant(i,c),an=cant(i,pv);if(ct==null||!an)return null;const d=ct-an,pc=d/an;return{d,pc,big:Math.abs(pc)>=.5&&Math.abs(d)*precio(i,c)>=10}};
const fmt=n=>(Math.round(n*100)/100).toLocaleString('es-ES',{maximumFractionDigits:2});
function deltaHtml(i,c,pv){const v=vari(i,c,pv);if(!v||!v.d)return '';return `${v.d>0?'+':''}${fmt(v.d)} (${v.d>0?'+':''}${Math.round(v.pc*100)}%) vs mes ant.`}
function guardar(){
  clearTimeout(tmr);tmr=setTimeout(()=>{
    I().ts=Date.now();
    try{localStorage.setItem('seda_inventario',JSON.stringify(inventario))}catch(e){}
    if(typeof syncConfig==='function')syncConfig('seda_inventario',inventario)},500)}

function nGrandes(){const c=cont(),pv=prev();if(!pv)return 0;return I().articulos.reduce((n,_,i)=>n+((vari(i,c,pv)||{}).big?1:0),0)}
function cabecera(){
  const ks=claves(),c=cont(),pv=prev(),t=total(c);
  const dif=pv?t-total(pv):null;
  return `<div class="card">
    <div class="iv-top">
      <label class="iv-f">Inventario del<select id="iv-fecha">${ks.slice().reverse().map(k=>`<option value="${k}" ${k===fecha?'selected':''}>${dmy(k)}</option>`).join('')}</select></label>
      <div class="iv-tot"><small>Valor total</small><b id="iv-total">${eur(t)}</b>${dif!==null?`<small id="iv-dif" class="${dif>0?'sube':'baja'}">${dif>0?'+':''}${eur(dif)} vs ${dmy(ks[ks.indexOf(fecha)-1])}</small>`:'<small id="iv-dif"></small>'}</div>
    </div>
    <div class="iv-acc"><button class="btn-sec" data-iv="nuevo">Nuevo inventario</button><button class="btn-sec" data-iv="csv">Descargar CSV</button><button class="btn-sec" data-iv="add">Añadir artículo</button><button class="btn-sec ${provAb?'on':''}" data-iv="prov">Proveedores</button><button class="btn-sec ${vozOn?'on':''}" data-iv="voz">${vozOn?'⏹ Parar dictado':'🎤 Dictar'}</button></div>
    <div id="iv-voz"></div>
    ${msg?`<div class="hz-aviso warn" style="margin-top:10px">${msg}</div>`:''}
    <div id="iv-form"></div>
    <div id="iv-prov">${provAb&&PV()?provHtml():''}</div>
    <div class="iv-filtros"><input id="iv-q" type="search" placeholder="Buscar artículo…" value="${esc(q)}" autocomplete="off">
      ${[['todos','Todos'],['sin','Sin cantidad'],['rev','A revisar'],['var','Cambios grandes'+(nGrandes()?' ('+nGrandes()+')':'')]].map(([k,n])=>`<button class="btn-sec ${modo===k?'on':''}" data-iv="m-${k}">${n}</button>`).join('')}</div>
  </div>`}

function filaHtml(a,i,c,pv){
  const ct=cant(i,c),rev=(c.r||[]).includes(i),ant=pv?cant(i,pv):null;
  return `<div class="iv-row" data-i="${i}">
    <div class="iv-n"><b>${esc(a.n)}</b><small>${esc(a.u)}</small><small class="iv-d ${(vari(i,c,pv)||{}).big?'big':''}">${deltaHtml(i,c,pv)}</small></div>
    <label class="iv-in">€/${esc(a.u.toLowerCase())}<input class="iv-p" type="text" inputmode="decimal" value="${precio(i,c)}"></label>
    <label class="iv-in">Cant.<input class="iv-c" type="text" inputmode="decimal" value="${ct??''}" placeholder="${ant?ant:''}"></label>
    <div class="iv-v">${eur(valor(i,c))}</div>
    <button class="iv-r ${rev?'on':''}" data-r="${i}" aria-label="Marcar para revisar" title="Revisar">⚑</button></div>`}

function lista(){
  const c=cont(),pv=prev(),b=q.trim().toLowerCase(),out=[];
  secciones().forEach(s=>{
    const ids=[];I().articulos.forEach((a,i)=>{if(a.s!==s)return;
      if(b&&!a.n.toLowerCase().includes(b))return;
      if(modo==='sin'&&cant(i,c))return;
      if(modo==='rev'&&!(c.r||[]).includes(i))return;
      if(modo==='var'&&!(vari(i,c,pv)||{}).big)return;
      ids.push(i)});
    if(!ids.length)return;
    const st=ids.reduce((x,i)=>x+valor(i,c),0),abre=b||modo!=='todos'||abiertas.has(s);
    out.push(`<details class="iv-sec" data-s="${esc(s)}" ${abre?'open':''}><summary><span>${esc(s)}</span><small>${ids.length} art.</small><b data-st="${esc(s)}">${eur(st)}</b></summary>${ids.map(i=>filaHtml(I().articulos[i],i,c,pv)).join('')}</details>`)});
  return out.length?out.join(''):'<div class="card hz-vacio">No hay artículos con ese filtro.</div>'}

function provHtml(){
  const L=PV().lista();
  const opt=c=>PCAT.map(([k,n])=>`<option value="${k}" ${k===c?'selected':''}>${n}</option>`).join('');
  return `<div class="iv-prov"><b>Proveedores</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 10px">Teléfono con prefijo y sin +, por ejemplo 34612345678. Se usan en los pedidos por WhatsApp.</p>
    ${L.map(p=>`<div class="iv-pv" data-id="${esc(p.id)}"><input data-pv="nombre" value="${esc(p.nombre)}" aria-label="Nombre"><input data-pv="tel" value="${esc(p.tel||'')}" inputmode="tel" placeholder="34612345678" aria-label="Teléfono"><select data-pv="cat" aria-label="Categoría">${opt(p.cat)}</select><button class="iv-r" data-pdel="${esc(p.id)}" aria-label="Eliminar" title="Eliminar">✕</button></div>`).join('')||'<div class="hz-vacio">Todavía no hay proveedores.</div>'}
    <form id="iv-fprov" class="iv-form"><label>Nombre<input id="iv-pn" required></label><label>Teléfono<input id="iv-pt" inputmode="tel" placeholder="34612345678"></label><label>Qué vende<select id="iv-pc">${opt('otros')}</select></label><button class="btn btn-p" type="submit">Agregar proveedor</button></form></div>`}
const limpiaTel=t=>{let d=String(t||'').replace(/[^\d]/g,'');if(d.length===9&&/^[679]/.test(d))d='34'+d;return d};

/* ---- Dictado por voz: "pechuga de pollo tres coma cinco" ---- */
let vozOn=false,vozLog=[],rec=null,vozMsg='';
const norm=t=>String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9,. ]/g,' ').replace(/(\d)\s*[.,]\s*(?=\d)/g,'$1,').replace(/[.,](?!\d)/g,' ').replace(/(?<!\d)[.,]/g,' ').replace(/\s+/g,' ').trim();
const UNI=new Set(['kilos','kilo','hilos','hilo','kilogramos','kilogramo','kg','kgs','gramos','gramo','unidades','unidad','uds','litros','litro','cajas','caja','piezas','pieza','botellas','botella','bolsas','bolsa','paquetes','paquete','latas','lata','bandejas','bandeja','sacos','saco']);
const UN={cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiun:21,veintiuno:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,medio:.5,media:.5};
const esNum=w=>/^\d+([.,]\d+)?$/.test(w)||w in UN||w==='coma'||w==='y'||w==='con';
function parseCantidad(txt){
  let w=norm(txt).split(' ').filter(Boolean);
  w=w.map((t,k)=>UNI.has(t)&&w[k+1]==='y'&&(w[k+2]==='medio'||w[k+2]==='media')&&!(k>0&&esNum(w[k-1])&&!['y','con','coma'].includes(w[k-1]))?'un':t); // «kilo y medio»
  w=w.filter((t,k)=>!(UNI.has(t)&&k>0&&esNum(w[k-1])&&!['y','con','coma'].includes(w[k-1]))); // «tres kilos y medio» → «tres y medio»
  while(w.length&&UNI.has(w[w.length-1]))w.pop(); // «… tres kilos»
  if(w.length>1&&!esNum(w[w.length-1])&&esNum(w[0])&&!['y','con','coma'].includes(w[0])){ // cantidad primero: «tres quisquilla»
    let k=0;while(k<w.length&&esNum(w[k]))k++;while(k>0&&['y','con','coma'].includes(w[k-1]))k--;
    if(k>0&&k<w.length)w=w.slice(k).concat(w.slice(0,k));}
  let fin=w.length;
  while(fin>0&&esNum(w[fin-1])&&!(w[fin-1]==='y'||w[fin-1]==='con'||w[fin-1]==='coma'))fin--;
  if(fin===w.length)return null;
  let st=fin;while(st>0&&esNum(w[st-1]))st--;
  while(st<w.length&&(w[st]==='y'||w[st]==='con'||w[st]==='coma'))st++;
  const seg=w.slice(st);let tot=0,dec=null,vio=false;
  for(let k=0;k<seg.length;k++){const t=seg[k];
    if(t==='coma'){dec='';continue}
    if(t==='y'||t==='con')continue;
    if(/^\d+([.,]\d+)?$/.test(t)){const n=parseFloat(t.replace(',','.'));if(dec!==null)dec+=String(n);else tot+=n;vio=true;continue}
    const n=UN[t];if(n===undefined)continue;vio=true;
    if(dec!==null)dec+=String(n);else tot+=n}
  if(!vio)return null;
  if(dec)tot+=parseFloat('0.'+dec);
  return{v:Math.round(tot*100)/100,nombre:w.slice(0,st).filter(x=>!['de','del','la','el','los','las','kilos','kilo','kg','kgs','unidades','unidad','litros','litro','cajas','caja','piezas','pieza','botellas','botella'].includes(x)).join(' ')};
}
const stem=t=>t.length>3?t.replace(/(es|s)$/,''):t;
function candidatos(nombre){
  const d=nombre.split(' ').filter(Boolean).map(stem);if(!d.length)return[];
  const res=[];I().articulos.forEach((a,i)=>{
    const at=norm(a.n).split(' ').filter(Boolean).map(stem);
    const m=d.filter(x=>at.some(y=>y===x||(x.length>3&&y.startsWith(x))||(y.length>3&&x.startsWith(y))));
    if(m.length<d.length)return;
    res.push({i,sc:m.length/d.length*.6+d.length/at.length*.4-(at.length>d.length?0:0)})});
  return res.sort((a,b)=>b.sc-a.sc);
}
function aplicarCant(i,v){
  const c=cont(),a=I().articulos[i];abiertas.add(a.s);
  const inp=document.querySelector(`#iv-root .iv-row[data-i="${i}"] .iv-c`);
  if(inp){const sec=inp.closest('details');if(sec)sec.open=true;inp.value=v===undefined?'':v;inp.dispatchEvent(new Event('input',{bubbles:true}));
    const row=inp.closest('.iv-row');row.classList.add('iv-flash');setTimeout(()=>row.classList.remove('iv-flash'),1500);row.scrollIntoView({block:'center',behavior:'smooth'})}
  else{if(v===undefined)delete c.c[i];else c.c[i]=v;guardar();pintar()}}
function resolver(txt){
  const p=parseCantidad(txt);
  if(!p){const nm=norm(txt).split(' ').filter(x=>x&&!UNI.has(x)&&!['de','del','la','el','los','las'].includes(x)).join(' ');
    if(nm&&candidatos(nm).length)return{est:'espera',nombre:nm};
    return{est:'no',n:'No entendí cantidad o artículo.'}}
  if(!p.nombre)return{est:'cant',v:p.v};
  const cs=candidatos(p.nombre);
  if(!cs.length)return{est:'no',n:'No encontré «'+p.nombre+'» en el inventario.'};
  const top=cs.filter(x=>x.sc>=cs[0].sc-1e-9);
  if(top.length>1)return{est:'elige',v:p.v,op:cs.slice(0,4).map(x=>x.i)};
  return{est:'ok',i:cs[0].i,v:p.v}}
let pend=null; // trozo suelto: artículo sin cantidad (o cantidad sin artículo) esperando su pareja
function dictado(txts){
  const L=[].concat(txts).filter(Boolean);if(!L.length)return;
  const ahora=Date.now(),vivo=pend&&ahora-pend.t<10000;
  let r=null,txt=L[0];
  if(vivo)for(const t of L){const x=resolver(pend.txt+' '+t);if(x.est==='ok'||x.est==='elige'){r=x;txt=pend.txt+' '+t;break}}
  if(!r){for(const t of L){const x=resolver(t);if(x.est==='ok'||x.est==='elige'){r=x;txt=t;break}if(!r||(r.est==='no'&&x.est!=='no')){r=x;txt=t}}}
  vozLog=vozLog.filter(l=>l.est!=='espera');
  if(r.est==='espera'||r.est==='cant'){pend={txt,t:ahora};vozLog.unshift({txt,est:'espera',n:r.est==='espera'?'«'+r.nombre+'»: ahora di la cantidad…':'Cantidad '+fmt(r.v)+': ahora di el artículo…'});pintaVoz();return}
  pend=null;
  if(r.est==='ok'){const old=cant(r.i);aplicarCant(r.i,r.v);vozLog.unshift({txt,est:'ok',i:r.i,v:r.v,old})}
  else if(r.est==='elige')vozLog.unshift({txt,est:'elige',v:r.v,op:r.op});
  else vozLog.unshift({txt,est:'no',n:r.n});
  pintaVoz()}
function pintaVoz(){const e=ge('iv-voz');if(!e)return;vozLog=vozLog.slice(0,8);
  e.innerHTML=vozOn||vozLog.length||vozMsg?`<div class="iv-voz"><div class="iv-vh"><b>${vozOn?'🎤 Escuchando… di el artículo y la cantidad':'Dictado'}</b>${vozOn?'':''}</div><small>Ejemplo: «pechuga de pollo tres coma cinco». Cada frase se aplica sola; puedes deshacerla.</small>${vozMsg?`<div class="hz-aviso warn">${esc(vozMsg)}</div>`:''}
    ${vozLog.map((l,k)=>l.est==='ok'?`<div class="iv-vl ok"><span>${esc(I().articulos[l.i].n)} → <b>${fmt(l.v)}</b> ${esc(I().articulos[l.i].u)}</span><button class="btn-sec" data-vundo="${k}">Deshacer</button></div>`
      :l.est==='elige'?`<div class="iv-vl"><span>«${esc(l.txt)}» ¿cuál?</span><span class="iv-vo">${l.op.map(i=>`<button class="btn-sec" data-vsel="${k}:${i}">${esc(I().articulos[i].n)}</button>`).join('')}</span></div>`
      :l.est==='espera'?`<div class="iv-vl"><span>⏳ ${esc(l.n)}</span></div>`
      :l.est==='deshecho'?`<div class="iv-vl"><span><s>${esc(l.txt)}</s> deshecho</span></div>`
      :`<div class="iv-vl no"><span>«${esc(l.txt)}» — ${esc(l.n)}</span></div>`).join('')}</div>`:''}
function vozToggle(){
  if(vozOn){vozOn=false;try{rec&&rec.stop()}catch(e){}pintar();return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){vozMsg='Este navegador no admite dictado. Usa Chrome (Android u ordenador) o Safari en iPhone.';pintar();pintaVoz();return}
  vozMsg='';rec=new SR();rec.lang='es-ES';rec.continuous=true;rec.interimResults=false;rec.maxAlternatives=3;
  rec.onresult=ev=>{for(let k=ev.resultIndex;k<ev.results.length;k++)if(ev.results[k].isFinal){const alts=[];for(let a=0;a<ev.results[k].length;a++)alts.push(ev.results[k][a].transcript);dictado(alts)}};
  rec.onerror=ev=>{if(ev.error==='not-allowed'||ev.error==='service-not-allowed'){vozOn=false;vozMsg='Sin permiso de micrófono. Actívalo en los ajustes del navegador.';pintar()}};
  rec.onend=()=>{if(vozOn){try{rec.start()}catch(e){vozOn=false;pintar()}}};
  vozOn=true;try{rec.start()}catch(e){}pintar()}
window.ivDictar=dictado;

function pintar(){
  const r=ge('iv-root');if(!r)return;
  if(!I().articulos.length&&!claves().length){r.innerHTML='<div class="card hz-vacio">Todavía no hay inventario cargado.</div>';return}
  if(!fecha||!I().conteos[fecha])fecha=claves().pop();
  r.innerHTML=cabecera()+`<div id="iv-lista">${lista()}</div>`;pintaVoz()}

function actualiza(){
  const c=cont(),t=total(c);ge('iv-total').textContent=eur(t);
  const pv=prev(),d=ge('iv-dif');if(pv&&d){const x=t-total(pv);d.textContent=(x>0?'+':'')+eur(x)+' vs '+dmy(claves()[claves().indexOf(fecha)-1]);d.className=x>0?'sube':'baja'}
}

function nuevo(){
  const hoy=new Date(),k=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');
  if(I().conteos[k]){fecha=k;msg='Ya hay un inventario con la fecha de hoy.';pintar();return}
  const ult=claves().pop();
  if(ult){const u=I().conteos[ult];if(!u.p){u.p={};I().articulos.forEach((a,i)=>{u.p[i]=a.p})}} // congela los precios del anterior
  I().conteos[k]={c:{},r:[]};fecha=k;msg='Inventario nuevo creado: en gris verás lo que había la última vez.';guardar();pintar()}

function csv(){
  const c=cont(),f=x=>'"'+String(x).replace(/"/g,'""')+'"';
  let o='﻿Sección;Artículo;U.M.;€/Unid.;Cant.;Valor;Revisar\n';
  I().articulos.forEach((a,i)=>{o+=[f(a.s),f(a.n),f(a.u),String(precio(i,c)).replace('.',','),String(cant(i,c)||0).replace('.',','),String(Math.round(valor(i,c)*100)/100).replace('.',','),(c.r||[]).includes(i)?'Sí':''].join(';')+'\n'});
  o+=`;;;;TOTAL;${String(Math.round(total(c)*100)/100).replace('.',',')};\n`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/csv;charset=utf-8'}));a.download='inventario_'+fecha+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

function formAdd(){
  const f=ge('iv-form');if(f.innerHTML){f.innerHTML='';return}
  f.innerHTML=`<form id="iv-fadd" class="iv-form"><label>Sección<input id="iv-as" list="iv-secs" required><datalist id="iv-secs">${secciones().map(s=>`<option value="${esc(s)}">`).join('')}</datalist></label>
    <label>Artículo<input id="iv-an" required></label><label>U.M.<select id="iv-au"><option>KG</option><option>LITRO</option><option>UNID</option><option>PQT</option></select></label>
    <label>€/unidad<input id="iv-ap" type="text" inputmode="decimal" value="0"></label><button class="btn btn-p" type="submit">Añadir</button></form>`}

document.addEventListener('input',e=>{
  const row=e.target.closest('.iv-row');if(!row||!ge('iv-root')||!ge('iv-root').contains(row)){
    if(e.target.id==='iv-q'){q=e.target.value;ge('iv-lista').innerHTML=lista()}return}
  const i=+row.dataset.i,c=cont(),v=num(e.target.value);
  if(e.target.classList.contains('iv-c')){if(v===null||e.target.value.trim()==='')delete c.c[i];else c.c[i]=v}
  else if(e.target.classList.contains('iv-p')){if(v===null)return;if(!c.p)I().articulos[i].p=v;else c.p[i]=v}
  row.querySelector('.iv-v').textContent=eur(valor(i,c));
  const dd=row.querySelector('.iv-d');if(dd){const pv0=prev();dd.textContent=deltaHtml(i,c,pv0);dd.classList.toggle('big',!!(vari(i,c,pv0)||{}).big)}
  const sec=row.closest('details');const st=sec.querySelector('[data-st]');
  st.textContent=eur([...sec.querySelectorAll('.iv-row')].reduce((x,r)=>x+valor(+r.dataset.i,c),0));
  actualiza();guardar()});
document.addEventListener('change',e=>{if(e.target.id==='iv-fecha'){fecha=e.target.value;msg='';pintar();return}
  const f=e.target.closest('[data-pv]');if(f&&PV()){const row=f.closest('.iv-pv'),L=PV().lista().map(p=>({...p})),p=L.find(x=>x.id===row.dataset.id);if(!p)return;
    const k=f.dataset.pv;p[k]=k==='tel'?limpiaTel(f.value):f.value.trim();if(k==='nombre'&&!p.nombre)return;PV().guardar(L);if(k==='tel')f.value=p.tel}});
document.addEventListener('toggle',e=>{const d=e.target;if(d.classList&&d.classList.contains('iv-sec')){d.open?abiertas.add(d.dataset.s):abiertas.delete(d.dataset.s)}},true);
document.addEventListener('click',e=>{
  const r=ge('iv-root');if(!r||!r.contains(e.target))return;
  const rv=e.target.closest('[data-r]');if(rv){const i=+rv.dataset.r,c=cont();c.r=c.r||[];const p=c.r.indexOf(i);p>=0?c.r.splice(p,1):c.r.push(i);rv.classList.toggle('on');guardar();if(modo==='rev')ge('iv-lista').innerHTML=lista();return}
  const vu=e.target.closest('[data-vundo]');if(vu){const l=vozLog[+vu.dataset.vundo];if(l&&l.est==='ok'){aplicarCant(l.i,l.old);l.est='deshecho'}pintaVoz();return}
  const vs=e.target.closest('[data-vsel]');if(vs){const[k,i]=vs.dataset.vsel.split(':').map(Number),l=vozLog[k];if(l){const old=cant(i);aplicarCant(i,l.v);l.est='ok';l.i=i;l.old=old}pintaVoz();return}
  const pd=e.target.closest('[data-pdel]');if(pd&&PV()){const L=PV().lista(),p=L.find(x=>x.id===pd.dataset.pdel);if(p&&confirm('¿Eliminar a '+p.nombre+'?')){PV().guardar(L.filter(x=>x.id!==p.id));pintar()}return}
  const b=e.target.closest('[data-iv]');if(!b)return;const a=b.dataset.iv;
  if(a==='nuevo')nuevo();else if(a==='csv')csv();else if(a==='prov'){provAb=!provAb;pintar()}else if(a==='voz')vozToggle();else if(a==='add')formAdd();
  else if(a.startsWith('m-')){modo=a.slice(2);pintar()}});
document.addEventListener('submit',e=>{
  if(e.target.id==='iv-fprov'&&PV()){e.preventDefault();const n=ge('iv-pn').value.trim();if(!n)return;
    PV().guardar([...PV().lista(),{id:'p'+Date.now(),nombre:n,tel:limpiaTel(ge('iv-pt').value),cat:ge('iv-pc').value}]);msg='Proveedor agregado: '+esc(n)+'.';pintar();return}
  if(e.target.id!=='iv-fadd')return;e.preventDefault();
  const s=ge('iv-as').value.trim(),n=ge('iv-an').value.trim();if(!s||!n)return;
  I().articulos.push({s,n,u:ge('iv-au').value,p:num(ge('iv-ap').value)||0});abiertas.add(s);msg='Artículo añadido en '+esc(s)+'.';guardar();pintar()});

window.initInventario=pintar;
})();
