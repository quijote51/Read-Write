/* Inventario mensual — datos en config 'seda_inventario' (solo la cuenta del hotel; lleva precios).
   inventario = { articulos:[{s,n,u,p}], conteos:{'AAAA-MM-DD':{c:{idx:cant}, r:[idx revisar], p:{idx:precio congelado}}}, ts } */
let inventario=(()=>{try{return JSON.parse(localStorage.getItem('seda_inventario')||'null')}catch(e){return null}})();
(function(){
const ge=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=n=>(Math.round(n*100)/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:'always'})+' €';
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?null:n};
const dmy=k=>k.split('-').reverse().join('-');
let fecha='',q='',modo='todos',msg='',abiertas=new Set(),tmr=null;

const I=()=>{if(!inventario)inventario={articulos:[],conteos:{},ts:0};return inventario};
const claves=()=>Object.keys(I().conteos).sort();
const cont=()=>I().conteos[fecha];
const precio=(i,c)=>{c=c||cont();const p=c.p&&c.p[i];return p!=null?p:I().articulos[i].p};
const cant=(i,c)=>{c=c||cont();return c.c[i]};
const valor=(i,c)=>precio(i,c)*(cant(i,c)||0);
const total=c=>I().articulos.reduce((s,_,i)=>s+valor(i,c),0);
const secciones=()=>{const o=[];I().articulos.forEach(a=>{if(!o.includes(a.s))o.push(a.s)});return o};
const prev=()=>{const k=claves(),i=k.indexOf(fecha);return i>0?I().conteos[k[i-1]]:null};

function guardar(){
  clearTimeout(tmr);tmr=setTimeout(()=>{
    I().ts=Date.now();
    try{localStorage.setItem('seda_inventario',JSON.stringify(inventario))}catch(e){}
    if(typeof syncConfig==='function')syncConfig('seda_inventario',inventario)},500)}

function cabecera(){
  const ks=claves(),c=cont(),pv=prev(),t=total(c);
  const dif=pv?t-total(pv):null;
  return `<div class="card">
    <div class="iv-top">
      <label class="iv-f">Inventario del<select id="iv-fecha">${ks.slice().reverse().map(k=>`<option value="${k}" ${k===fecha?'selected':''}>${dmy(k)}</option>`).join('')}</select></label>
      <div class="iv-tot"><small>Valor total</small><b id="iv-total">${eur(t)}</b>${dif!==null?`<small id="iv-dif" class="${dif>0?'sube':'baja'}">${dif>0?'+':''}${eur(dif)} vs ${dmy(ks[ks.indexOf(fecha)-1])}</small>`:'<small id="iv-dif"></small>'}</div>
    </div>
    <div class="iv-acc"><button class="btn-sec" data-iv="nuevo">Nuevo inventario</button><button class="btn-sec" data-iv="csv">Descargar CSV</button><button class="btn-sec" data-iv="add">Añadir artículo</button></div>
    ${msg?`<div class="hz-aviso warn" style="margin-top:10px">${msg}</div>`:''}
    <div id="iv-form"></div>
    <div class="iv-filtros"><input id="iv-q" type="search" placeholder="Buscar artículo…" value="${esc(q)}" autocomplete="off">
      ${[['todos','Todos'],['sin','Sin cantidad'],['rev','A revisar']].map(([k,n])=>`<button class="btn-sec ${modo===k?'on':''}" data-iv="m-${k}">${n}</button>`).join('')}</div>
  </div>`}

function filaHtml(a,i,c,pv){
  const ct=cant(i,c),rev=(c.r||[]).includes(i),ant=pv?cant(i,pv):null;
  return `<div class="iv-row" data-i="${i}">
    <div class="iv-n"><b>${esc(a.n)}</b><small>${esc(a.u)}</small></div>
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
      ids.push(i)});
    if(!ids.length)return;
    const st=ids.reduce((x,i)=>x+valor(i,c),0),abre=b||modo!=='todos'||abiertas.has(s);
    out.push(`<details class="iv-sec" data-s="${esc(s)}" ${abre?'open':''}><summary><span>${esc(s)}</span><small>${ids.length} art.</small><b data-st="${esc(s)}">${eur(st)}</b></summary>${ids.map(i=>filaHtml(I().articulos[i],i,c,pv)).join('')}</details>`)});
  return out.length?out.join(''):'<div class="card hz-vacio">No hay artículos con ese filtro.</div>'}

function pintar(){
  const r=ge('iv-root');if(!r)return;
  if(!I().articulos.length&&!claves().length){r.innerHTML='<div class="card hz-vacio">Todavía no hay inventario cargado.</div>';return}
  if(!fecha||!I().conteos[fecha])fecha=claves().pop();
  r.innerHTML=cabecera()+`<div id="iv-lista">${lista()}</div>`}

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
  const sec=row.closest('details');const st=sec.querySelector('[data-st]');
  st.textContent=eur([...sec.querySelectorAll('.iv-row')].reduce((x,r)=>x+valor(+r.dataset.i,c),0));
  actualiza();guardar()});
document.addEventListener('change',e=>{if(e.target.id==='iv-fecha'){fecha=e.target.value;msg='';pintar()}});
document.addEventListener('toggle',e=>{const d=e.target;if(d.classList&&d.classList.contains('iv-sec')){d.open?abiertas.add(d.dataset.s):abiertas.delete(d.dataset.s)}},true);
document.addEventListener('click',e=>{
  const r=ge('iv-root');if(!r||!r.contains(e.target))return;
  const rv=e.target.closest('[data-r]');if(rv){const i=+rv.dataset.r,c=cont();c.r=c.r||[];const p=c.r.indexOf(i);p>=0?c.r.splice(p,1):c.r.push(i);rv.classList.toggle('on');guardar();if(modo==='rev')ge('iv-lista').innerHTML=lista();return}
  const b=e.target.closest('[data-iv]');if(!b)return;const a=b.dataset.iv;
  if(a==='nuevo')nuevo();else if(a==='csv')csv();else if(a==='add')formAdd();
  else if(a.startsWith('m-')){modo=a.slice(2);pintar()}});
document.addEventListener('submit',e=>{if(e.target.id!=='iv-fadd')return;e.preventDefault();
  const s=ge('iv-as').value.trim(),n=ge('iv-an').value.trim();if(!s||!n)return;
  I().articulos.push({s,n,u:ge('iv-au').value,p:num(ge('iv-ap').value)||0});abiertas.add(s);msg='Artículo añadido en '+esc(s)+'.';guardar();pintar()});

window.initInventario=pintar;
})();
