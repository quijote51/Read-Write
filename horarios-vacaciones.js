/* ══════════════════════════════════════
   OÍDO COCINA · Horarios: pestaña Vacaciones
   Una tarjeta por persona con sus días, el calendario de todo el año (quién está fuera cada día y dónde coinciden),
   las fechas en las que nadie puede coger vacaciones y el alta de periodos (que rellenan el horario con VACACIONES).
   Parte de Horarios (horarios.js): usa lo que comparte window.hzKit y registra aquí sus pantallas.
   ══════════════════════════════════════ */
(function(){
const K=window.hzKit;
const {H,fd,iso,lunes,sumar,corto,fmtH,cap,esc,pHM,tramos,horas,tipo,trabaja,equipoSem,fila,sinTurnos,personasDia,cobertura,enHora,guardar,avisos,pintar,SOLO,root,yo,DIAS,DL,MES,MESL,GRUPOS,MIN_COB,MAX_H,MIN_DESC,VAC_ANUAL}=K;
const activo=e=>K.activo(e);
// Las bajas (maternal o de otro tipo) no son vacaciones: no gastan días ni cuentan como coincidencia
const esBaja=v=>v.t==='maternal'||v.t==='baja';
function diasEn(i,f,y){const a=new Date(Math.max(fd(i),fd(y+'-01-01'))),b=new Date(Math.min(fd(f),fd(y+'-12-31')));return b<a?0:Math.round((b-a)/864e5)+1}
/* ---- Todo el año de un vistazo: quién está de vacaciones cada día y dónde coinciden ----
   Una fila por mes y una casilla por día; el color es cuántas personas están fuera ese día (1 azul, 2 amarillo, 3 o más rojo).
   Las bajas maternales no cuentan (duran todo el año y taparían el resto). Tocar un día muestra quién está fuera. */
let diaSel='';
function vAnioVac(y,parte){
  const eqN=new Set(H().equipo.filter(e=>(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y)).map(e=>e.n));
  const fuera={},ini=y+'-01-01',fin=y+'-12-31';
  H().vac.filter(v=>!esBaja(v)&&eqN.has(v.e)&&v.f>=ini&&v.i<=fin).forEach(v=>{
    for(let d=fd(v.i<ini?ini:v.i),f=fd(v.f>fin?fin:v.f);d<=f;d=sumar(d,1)){const k=iso(d);(fuera[k]=fuera[k]||[]);if(!fuera[k].includes(v.e))fuera[k].push(v.e)}});
  const hoyK=iso(new Date()),nom=k=>k?(fuera[k]||[]):[];
  // Fechas en las que nadie puede coger vacaciones (las apunta el jefe: «Feria», «Semana Santa», «este mes»…)
  const bq={};(H().bloqueos||[]).forEach(b=>{if(!b.i||!b.f||b.f<ini||b.i>fin)return;for(let d=fd(b.i<ini?ini:b.i),f=fd(b.f>fin?fin:b.f);d<=f;d=sumar(d,1)){const k=iso(d);(bq[k]=bq[k]||[]).push(b.n||'sin motivo')}});
  const cab=`<div class="hz-an-fila hz-an-cab" aria-hidden="true"><b></b><div class="hz-an-dias">${Array.from({length:31},(_,j)=>`<i>${[1,5,10,15,20,25,30].includes(j+1)?j+1:''}</i>`).join('')}</div></div>`;
  const meses=Array.from({length:12},(_,m)=>{
    const nd=new Date(y,m+1,0).getDate();
    const cel=Array.from({length:31},(_,j)=>{
      if(j>=nd)return '<span class="hz-an-no"></span>';
      const k=y+'-'+String(m+1).padStart(2,'0')+'-'+String(j+1).padStart(2,'0'),n=nom(k);
      const bl=bq[k]?' · sin vacaciones: '+esc(bq[k].join(', ')):'';
      return `<button type="button" class="hz-an-c n${Math.min(n.length,3)}${bq[k]?' blq':''}${k===hoyK?' hoy':''}${k===diaSel?' sel':''}" data-vd="${k}" aria-label="${j+1} ${MES[m]}: ${n.length?esc(n.join(', ')):'nadie fuera'}${bl}" title="${n.length?esc(n.join(', ')):'nadie fuera'}${bl}"></button>`}).join('');
    return `<div class="hz-an-fila"><b>${MES[m]}</b><div class="hz-an-dias">${cel}</div></div>`}).join('');
  // Coincidencias: tramos seguidos de días con 2 o más personas fuera a la vez (se corta cuando cambia quién está fuera)
  const tramos2=[];let cur=null;
  for(let d=fd(ini);d<=fd(fin);d=sumar(d,1)){
    const k=iso(d),n=nom(k).slice().sort(),clave=n.length>=2?n.join('+'):'';
    if(clave&&cur&&cur.clave===clave&&cur.fin===iso(sumar(d,-1)))cur.fin=k;
    else{cur=clave?{clave,n,ini:k,fin:k}:null;if(cur)tramos2.push(cur)}}
  const fe=k=>{const d=fd(k);return d.getDate()+' '+MES[d.getMonth()]};
  const nDias=(a,b)=>Math.round((fd(b)-fd(a))/864e5)+1;
  const rango=(a,b)=>a===b?fe(a):fe(a)+' – '+fe(b);
  // Cuentas del año: días con alguien fuera, días sin nadie, días con coincidencia, máximo a la vez; huecos sin nadie; y quién coincide con quién
  let conAlguien=0,sinNadie=0,conChoque=0,maximo=0,diaMax='';
  const huecos=[],pares={};let hueco=null;
  for(let d=fd(ini);d<=fd(fin);d=sumar(d,1)){
    const k=iso(d),n=nom(k).slice().sort();
    if(n.length){conAlguien++;if(n.length>maximo){maximo=n.length;diaMax=k}}else sinNadie++;
    if(n.length>=2){conChoque++;for(let a=0;a<n.length;a++)for(let b=a+1;b<n.length;b++){const p=n[a]+'|'+n[b];(pares[p]=pares[p]||[]).push(k)}}
    if(!n.length){if(hueco&&hueco.fin===iso(sumar(d,-1)))hueco.fin=k;else{hueco={ini:k,fin:k};huecos.push(hueco)}}}
  // Días seguidos de un par -> tramos (para decir «Ana y David coinciden del 1 al 10 ago»)
  const tramosPar=ks=>{const r=[];ks.forEach(k=>{const u=r[r.length-1];if(u&&u.fin===iso(sumar(fd(k),-1)))u.fin=k;else r.push({ini:k,fin:k})});return r};
  const personas={};Object.keys(pares).forEach(p=>{const[a,b]=p.split('|');[[a,b],[b,a]].forEach(([x,y2])=>{(personas[x]=personas[x]||{}) [y2]=pares[p]})});
  const diasDe=x=>{const s=new Set();Object.values(personas[x]).forEach(ks=>ks.forEach(k=>s.add(k)));return s.size};
  const lista=tramos2.length?tramos2.map(t=>`<div class="hz-an-co ${t.n.length>=3?'bad':'warn'}"><b>${rango(t.ini,t.fin)}</b> · ${nDias(t.ini,t.fin)} día${nDias(t.ini,t.fin)===1?'':'s'} · ${t.n.length} fuera a la vez<br><small>${t.n.map(esc).join(', ')}</small></div>`).join(''):'<div class="hz-vacio">Nadie coincide de vacaciones este año.</div>';
  const quien=Object.keys(personas).sort((a,b)=>diasDe(b)-diasDe(a)).map(x=>`<details class="hz-an-per"><summary><b>${esc(x)}</b> · coincide ${diasDe(x)} día${diasDe(x)===1?'':'s'} con ${Object.keys(personas[x]).length} persona${Object.keys(personas[x]).length===1?'':'s'}</summary>${Object.keys(personas[x]).sort((a,b)=>personas[x][b].length-personas[x][a].length).map(o=>`<div class="hz-an-par"><b>${esc(o)}</b> · ${personas[x][o].length} día${personas[x][o].length===1?'':'s'}<br><small>${tramosPar(personas[x][o]).map(t=>rango(t.ini,t.fin)).join(' · ')}</small></div>`).join('')}</details>`).join('');
  const libres=huecos.length?huecos.map(t=>`<div class="hz-an-hu${nDias(t.ini,t.fin)>=14?' largo':''}"><b>${rango(t.ini,t.fin)}</b> · ${nDias(t.ini,t.fin)} día${nDias(t.ini,t.fin)===1?'':'s'}</div>`).join(''):'<div class="hz-vacio">Siempre hay alguien de vacaciones.</div>';
  const sel=diaSel&&diaSel.slice(0,4)==y?`<div class="hz-an-sel"><b>${fe(diaSel)}:</b> ${nom(diaSel).length?nom(diaSel).map(esc).join(', ')+' (fuera)':'nadie fuera'}${bq[diaSel]?`<br><span class="hz-an-blq">Sin vacaciones: ${bq[diaSel].map(esc).join(', ')}</span>`:''}</div>`:'';
  // Fechas sin vacaciones: lista (con «Quitar»), choques con vacaciones ya apuntadas y formulario para añadir
  const bloqs=(H().bloqueos||[]).map((b,ix)=>({b,ix})).filter(x=>x.b.f>=ini&&x.b.i<=fin).sort((a,c)=>a.b.i<c.b.i?-1:1);
  const choques=[];H().vac.filter(v=>!esBaja(v)&&eqN.has(v.e)).forEach(v=>(H().bloqueos||[]).forEach(b=>{const a=v.i>b.i?v.i:b.i,c=v.f<b.f?v.f:b.f;if(a<=c&&c>=ini&&a<=fin)choques.push({e:v.e,ini:a,fin:c,n:b.n||'sin motivo'})}));
  const hoyD=new Date(),mesIni=m=>iso(new Date(hoyD.getFullYear(),hoyD.getMonth()+m,1)),mesFin=m=>iso(new Date(hoyD.getFullYear(),hoyD.getMonth()+m+1,0));
  const blqHtml=`<div class="hz-an-lista"><b>Fechas en las que nadie puede coger vacaciones</b><p style="font-size:12px;color:var(--text-secondary);margin:2px 0 6px">Apunta un mes o unas fechas (feria, Semana Santa, eventos grandes…). Salen en violeta en el calendario y avisan al apuntar unas vacaciones que caigan dentro.</p>
    ${bloqs.length?bloqs.map(({b,ix})=>`<div class="hz-an-bl"><span><b>${rango(b.i,b.f)}</b> · ${nDias(b.i,b.f)} día${nDias(b.i,b.f)===1?'':'s'}<br><small>${esc(b.n||'sin motivo')}</small></span><button type="button" class="btn-sec hz-sm" data-bdel="${ix}" aria-label="Quitar ${esc(b.n||'')}">Quitar</button></div>`).join(''):'<div class="hz-vacio">Todavía no hay fechas sin vacaciones.</div>'}
    ${choques.length?`<div class="hz-aviso warn" style="margin-top:8px"><b>Vacaciones que caen en fechas sin vacaciones</b><ul>${choques.map(c=>`<li>${esc(c.e)}: ${rango(c.ini,c.fin)} · ${esc(c.n)}</li>`).join('')}</ul></div>`:''}
    <form id="hz-f-blq" class="hz-an-form"><div class="hz-chips"><button type="button" class="btn-sec hz-sm" data-a="blqmes" data-i="${mesIni(0)}" data-f="${mesFin(0)}">Este mes</button><button type="button" class="btn-sec hz-sm" data-a="blqmes" data-i="${mesIni(1)}" data-f="${mesFin(1)}">Mes que viene</button></div>
      <div class="hz-form"><label>Desde<input type="date" id="hz-bi" required></label><label>Hasta<input type="date" id="hz-bf" required></label><label>Motivo<input id="hz-bn" placeholder="Feria, Semana Santa…"></label></div><button class="btn btn-p" type="submit">Añadir fechas sin vacaciones</button></form></div>`;
  const cal=`<div class="card hz-an"><b>Todo el año: quién está fuera cada día</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">Cada casilla es un día. Toca una para ver quién está fuera.</p>
    ${cab}${meses}<div class="hz-an-ley"><span class="hz-an-c n1"></span>1 <span class="hz-an-c n2"></span>2 <span class="hz-an-c n3"></span>3 o más <small>personas fuera (sin bajas maternales)</small><span class="hz-an-l"><span class="hz-an-c blq"></span>sin vacaciones</span></div>${sel}
    <div class="hz-an-res"><div><b>${conAlguien}</b><small>días con alguien fuera</small></div><div><b>${sinNadie}</b><small>días sin nadie fuera</small></div><div><b>${conChoque}</b><small>días con coincidencia${maximo>=2?` (hasta ${maximo} a la vez, el ${fe(diaMax)})`:''}</small></div></div></div>`,
    coin=`<div class="card hz-an"><div class="hz-an-lista"><b>Dónde coinciden</b>${lista}</div>
    ${quien?`<div class="hz-an-lista"><b>Quién coincide con quién</b><p style="font-size:12px;color:var(--text-secondary);margin:2px 0 6px">Toca un nombre para ver con quién y qué días.</p>${quien}</div>`:''}
    <div class="hz-an-lista"><b>Fechas sin nadie fuera</b><p style="font-size:12px;color:var(--text-secondary);margin:2px 0 6px">Huecos del año en los que nadie tiene vacaciones (en azul oscuro los de 14 días o más: los mejores para repartir).</p>${libres}</div></div>`,
    blq=`<div class="card hz-an">${blqHtml}</div>`;
  return parte==='cal'?cal:parte==='coin'?coin:parte==='blq'?blq:cal+coin+blq}
/* ---- Parámetros de vacaciones y organizador ----
   48 días al año = 30 de vacaciones (15 de verano + 15 de invierno) + 18 de festivos que se devuelven en vacaciones («extra»).
   Los 18 festivos se dan sueltos (por días o por semanas): se apuntan con tipo «extra» en Añadir; el organizador solo propone verano e invierno.
   Se guardan en horarios.vp (se sincroniza con el resto). Verano = del 15 jun al 15 sep; invierno = el resto del año. */
const VP0={ver:15,inv:15,fest:18,primer:15,lunes:true,vuelta:true};
const vpGet=()=>Object.assign({},VP0,H().vp||{});
const verano=y=>[y+'-06-15',y+'-09-15'];
function vParam(){
  const p=vpGet(),tot=(+p.ver||0)+(+p.inv||0)+(+p.fest||0);
  return `<form class="card" id="hz-f-vp"><b>Parámetros de vacaciones</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">Total al año: <b>${tot} días</b> (vacaciones ${(+p.ver||0)+(+p.inv||0)} + festivos devueltos ${+p.fest||0}). Los festivos se dan sueltos, por días o por semanas: apúntalos en «Añadir» con tipo «extra».</p>
    <div class="hz-form"><label>Días de verano<input type="number" min="0" max="60" id="hz-vp-ver" value="${+p.ver||0}"></label><label>Días de invierno<input type="number" min="0" max="60" id="hz-vp-inv" value="${+p.inv||0}"></label><label>Festivos devueltos (tipo «extra»)<input type="number" min="0" max="60" id="hz-vp-fest" value="${+p.fest||0}"></label><label>Primer bloque (mínimo de días)<input type="number" min="1" max="60" id="hz-vp-primer" value="${+p.primer||1}"></label></div>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="hz-vp-lunes"${p.lunes?' checked':''} style="width:auto;min-height:0"> Las vacaciones empiezan siempre en lunes (el organizador solo propone lunes)</label>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="hz-vp-vuelta"${p.vuelta?' checked':''} style="width:auto;min-height:0"> Al apuntar un bloque de verano o invierno, ofrecer que al volver libre lunes y martes (opcional: sale un botón en el aviso)</label><button class="btn btn-p" type="submit">Guardar parámetros</button></form>`}
// Sugiere fechas para los días de verano o invierno que le faltan a una persona: sin chocar con otras vacaciones ni con fechas sin vacaciones
function sugerir(nom,t,y){
  const p=vpGet(),need=t==='verano'?+p.ver||0:+p.inv||0,ps=H().vac.filter(v=>v.e===nom&&v.t===t&&v.i.slice(0,4)<=y&&v.f.slice(0,4)>=y),usados=ps.reduce((s,v)=>s+diasEn(v.i,v.f,y),0),falta=need-usados;
  if(falta<=0)return{falta:0,sug:[]};
  const L=usados===0?Math.min(falta,Math.max(1,+p.primer||falta)):falta;
  const eq=H().equipo.filter(e=>activo(e)&&(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y)),N=eq.length;
  const fuera={};H().vac.filter(v=>!esBaja(v)&&v.e!==nom).forEach(v=>{for(let d=fd(v.i),f=fd(v.f);d<=f;d=sumar(d,1)){const k=iso(d);(fuera[k]=fuera[k]||[]).includes(v.e)||fuera[k].push(v.e)}});
  const prop=new Set();H().vac.filter(v=>v.e===nom).forEach(v=>{for(let d=fd(v.i),f=fd(v.f);d<=f;d=sumar(d,1))prop.add(iso(d))});
  const bq=new Set();(H().bloqueos||[]).forEach(b=>{for(let d=fd(b.i),f=fd(b.f);d<=f;d=sumar(d,1))bq.add(iso(d))});
  const [vi,vf]=verano(y),enRango=k=>t==='verano'?(k>=vi&&k<=vf):(k<vi||k>vf);
  const cand=[];
  for(let d=fd(y+'-01-01');d<=fd(y+'-12-31');d=sumar(d,1)){
    const fin=sumar(d,L-1),k0=iso(d),k1=iso(fin);if(k1>y+'-12-31'||!enRango(k0)||!enRango(k1))continue;
    let sc=0,bad=false;const con=new Set();
    for(let x=d;x<=fin;x=sumar(x,1)){const k=iso(x);if(bq.has(k)||prop.has(k)){bad=true;break}
      const o=fuera[k]||[];o.forEach(n=>con.add(n));sc+=o.length*10;if(N-o.length-1<MIN_COB)sc+=200}
    if(bad)continue;
    if(p.lunes&&d.getDay()!==1)continue;
    cand.push({i:k0,f:k1,sc,con:[...con]})}
  cand.sort((a,b)=>a.sc-b.sc||(a.i<b.i?-1:1));
  const sug=[];for(const c of cand){if(sug.every(s=>Math.abs(fd(s.i)-fd(c.i))>=7*864e5))sug.push(c);if(sug.length>=3)break}
  return{falta,L,sug}}
function vOrg(y){
  const eqY=H().equipo.filter(e=>activo(e)&&(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y)&&!H().vac.some(v=>v.e===e.n&&esBaja(v)&&v.i.slice(0,4)<=y&&v.f.slice(0,4)>=y));
  const fe=k=>{const d=fd(k);return d.getDate()+' '+MES[d.getMonth()]};
  let h=`<div class="card"><b>Organizador de vacaciones ${y}</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 0">Propone las mejores fechas para los días de verano e invierno que le faltan a cada persona: sin chocar con otras vacaciones, fuera de las fechas sin vacaciones, empezando siempre en lunes (se puede quitar en Parámetros) y dejando al menos ${MIN_COB} personas en cocina. Tú decides: pulsa «Apuntar» en la que te guste. Los festivos devueltos se apuntan aparte, sueltos.</p></div>`;
  let hay=false;
  const sug1=s=>`<div class="hz-fila"><span><b>${fe(s.i)} – ${fe(s.f)}</b><br><small>${s.con.length?'Coincide con '+s.con.map(esc).join(', '):'No coincide con nadie'}</small></span><button type="button" class="btn-sec hz-sm" data-sug="${esc(e_n)}|${e_t}|${s.i}|${s.f}">Apuntar</button></div>`;
  let e_n='',e_t='';
  eqY.forEach(e=>{const filas=['verano','invierno'].map(t=>({t,r:sugerir(e.n,t,y)})).filter(x=>x.r.falta>0);if(!filas.length)return;hay=true;
    h+=`<div class="card"><b>${esc(e.n)}</b>`+filas.map(({t,r})=>{e_n=e.n;e_t=t;return `<div style="margin-top:8px"><small style="color:var(--text-secondary)">${cap(t)}: faltan ${r.falta} días${r.L&&r.L<r.falta?' · primer bloque de '+r.L:''}</small>`+(r.sug.length?r.sug.map(sug1).join(''):'<div class="hz-vacio">No hay un hueco de esa duración sin problemas.</div>')+'</div>'}).join('')+'</div>'});
  if(!hay)h+='<div class="card hz-vacio">Todos tienen ya apuntados sus días de verano e invierno.</div>';
  return h}
let subVac='cal';
const SUBV=[['cal','Calendario'],['coin','Coincidencias'],['per','Personas'],['add','Añadir'],['org','Organizador'],['par','Parámetros']];
function vVac(){
  const y=K.anio,eqY=H().equipo.filter(e=>(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y));
  let h=`<div class="hz-bar"><button class="btn-sec" data-a="aant" aria-label="Año anterior">←</button><div class="hz-sem">${y}</div><button class="btn-sec" data-a="asig" aria-label="Año siguiente">→</button></div>`;
  if(K.msg)h+=`<div class="hz-aviso warn">${K.msg}</div>`;
  h+=`<div class="hz-sub hz-sub-v" role="group" aria-label="Vacaciones">${SUBV.map(([k,n])=>`<button type="button" data-subv="${k}" aria-pressed="${k===subVac}">${n}</button>`).join('')}</div>`;
  if(subVac==='cal'||subVac==='coin')h+=vAnioVac(y,subVac);
  if(subVac==='par')h+=vParam()+vAnioVac(y,'blq');
  if(subVac==='org')h+=vOrg(y);
  if(subVac==='per'){h+=`<div class="hz-cols">`;
  eqY.forEach(e=>{const ps=H().vac.filter(v=>v.e===e.n&&v.i.slice(0,4)<=y&&v.f.slice(0,4)>=y);
    const vp=H().vp||{},tot=(+vp.ver||0)+(+vp.inv||0)+(+vp.fest||0)||VAC_ANUAL,usados=ps.filter(v=>!esBaja(v)).reduce((s,v)=>s+diasEn(v.i,v.f,y),0),res=tot-usados,mat=ps.some(esBaja),por=t=>ps.filter(v=>v.t===t).reduce((s,v)=>s+diasEn(v.i,v.f,y),0);
    const col=res>tot*.3?'#5dcaa5':res>=tot*.15?'#ef9f27':'#e24b4a';
    const meses=Array.from({length:12},(_,m)=>{const a=new Date(y,m,1),b=new Date(y,m+1,0);const p=ps.find(v=>fd(v.i)<=b&&fd(v.f)>=a);return`<span class="${p?({verano:'v',invierno:'i',extra:'x',maternal:'m',baja:'m'}[p.t]):''}" title="${MES[m]}"></span>`}).join('');
    h+=`<div class="card"><div class="hz-fila" style="border:0;padding:0"><b>${esc(e.n)}</b><small>${mat&&!usados?'Baja':`${res} de ${tot} días`}</small></div>${mat&&!usados?'':`<div class="hz-saldo"><i style="width:${Math.max(0,Math.min(100,usados/tot*100))}%;background:${col}"></i></div>`}<div class="hz-meses">${meses}</div>${mat&&!usados?'':`<div style="font-size:11px;color:var(--text-secondary);margin:2px 0 4px">Verano ${por('verano')}/${+vp.ver||0} · Invierno ${por('invierno')}/${+vp.inv||0} · Festivos ${por('extra')}/${+vp.fest||0}</div>`}
    ${ps.map(v=>`<div class="hz-fila"><span><small>${esc(v.t)} · ${corto(fd(v.i))} – ${corto(fd(v.f))}${v.n?' · '+esc(v.n):''}</small></span><span style="display:flex;gap:6px;align-items:center"><small>${diasEn(v.i,v.f,y)} d</small><button class="btn-sec hz-sm" data-vdel="${H().vac.indexOf(v)}">Quitar</button></span></div>`).join('')}</div>`});
  h+=`</div>`}
  if(subVac==='add')h+=`<form class="card" id="hz-f-vac"><b>Añadir periodo</b> <small style="color:var(--text-secondary)">(rellena el horario con VACACIONES o BAJA y avisa si baja la cobertura; las bajas no gastan días de vacaciones)</small><div class="hz-form"><label>Empleado<select id="hz-ve">${H().equipo.filter(activo).map(e=>`<option>${esc(e.n)}</option>`).join('')}</select></label><label>Tipo<select id="hz-vt"><option value="verano">verano</option><option value="invierno">invierno</option><option value="extra">extra</option><option value="baja">baja</option><option value="maternal">baja maternal</option></select></label><label>Desde<input type="date" id="hz-vi" required></label><label>Hasta<input type="date" id="hz-vf" required></label><label>Nota o motivo de la baja<input id="hz-vn"></label></div><button class="btn btn-p" type="submit">Añadir</button></form>`;
  return h}

/* ---- vacaciones -> horario ---- */
const tocadas=[];
function aplicarVac(v,poner){
  const txt=v.t==='maternal'?'BAJA MATERNAL':v.t==='baja'?'BAJA':'VACACIONES',falta=[];tocadas.length=0;
  for(let d=fd(v.i),f=fd(v.f);d<=f;d=sumar(d,1)){
    const k=iso(lunes(d)),i=(d.getDay()+6)%7,a=fila(k,v.e);if(!tocadas.includes(k))tocadas.push(k);
    if(poner)a[i]=txt;else if(/VACACIONES|BAJA/i.test(a[i]))a[i]='';
    if(poner&&!sinTurnos(k)&&cobertura(k,i)<MIN_COB)falta.push(`${DL[i]} ${d.getDate()} ${MES[d.getMonth()]} (${cobertura(k,i)})`);
  }
  return falta}

/* Al volver de un bloque de verano o invierno se OFRECE librar lunes y martes (no es obligatorio): un botón en el aviso, solo en casillas vacías */
function ofertaVuelta(v){
  if(!vpGet().vuelta||(v.t!=='verano'&&v.t!=='invierno'))return '';
  const L0=lunes(sumar(fd(v.f),1)),dias=[0,1].filter(j=>sumar(L0,j)>fd(v.f));if(!dias.length)return '';
  const nom=dias.map(j=>DL[j]).join(' y ');
  return `Al volver puede librar ${nom} <button type="button" class="btn-sec hz-sm" data-vuelta="${esc(v.e)}|${v.f}">Poner LIBRE</button> <small>(opcional)</small>`}
function ponerVuelta(nom,f){
  const fin=fd(f),L0=lunes(sumar(fin,1)),k=iso(L0);
  [0,1].forEach(j=>{if(sumar(L0,j)<=fin)return;const a=fila(k,nom);if(!a[j]||tipo(a[j])==='vacio')a[j]='LIBRE'});
  return k}

K.reg({vistas:{vacaciones:vVac},util:{vVac,vAnioVac,diasEn,aplicarVac,sugerir,vOrg,vParam,ofertaVuelta,ponerVuelta}});
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  const sg=e.target.closest('[data-sug]');if(sg){const[n,t,i,f]=sg.dataset.sug.split('|'),v={e:n,t,i,f,n:''};H().vac.push(v);const falta=aplicarVac(v,true);K.msg=(falta.length?`<b>Cuidado:</b> con estas vacaciones la cobertura baja de ${MIN_COB} en: ${falta.slice(0,8).join(', ')}${falta.length>8?'…':''}.`:'')+(ofertaVuelta(v)?(falta.length?'<br>':'')+ofertaVuelta(v):'');guardar(tocadas.slice());pintar();return}
  const vu=e.target.closest('[data-vuelta]');if(vu){const[n,f]=vu.dataset.vuelta.split('|');const k=ponerVuelta(n,f);K.msg='';guardar([k]);pintar();return}
  const sv=e.target.closest('[data-subv]');if(sv){subVac=sv.dataset.subv;K.msg='';pintar();return}
  const vd=e.target.closest('[data-vd]');if(vd){diaSel=diaSel===vd.dataset.vd?'':vd.dataset.vd;pintar();return}
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='aant'){K.anio--;pintar()}else if(a==='asig'){K.anio++;pintar()}
  else if(a==='blqmes'){const b=e.target.closest('[data-a="blqmes"]'),i=document.getElementById('hz-bi'),f=document.getElementById('hz-bf'),n=document.getElementById('hz-bn');if(i&&f){i.value=b.dataset.i;f.value=b.dataset.f;if(n&&!n.value)n.value=cap(MESL[fd(b.dataset.i).getMonth()])}}
  const bd=e.target.closest('[data-bdel]');if(bd){H().bloqueos.splice(+bd.dataset.bdel,1);guardar();pintar();return}
  const v=e.target.closest('[data-vdel]');if(v){const p=H().vac.splice(+v.dataset.vdel,1)[0];aplicarVac(p,false);K.msg='';guardar(tocadas.slice());pintar()}
});
document.addEventListener('submit',e=>{
  const id=e.target.id;if(id!=='hz-f-vac'&&id!=='hz-f-blq'&&id!=='hz-f-vp')return;e.preventDefault();const $=s=>document.getElementById(s);
  if(id==='hz-f-vp'){const n=x=>Math.max(0,Math.min(60,parseInt($(x).value)||0));H().vp={ver:n('hz-vp-ver'),inv:n('hz-vp-inv'),fest:n('hz-vp-fest'),primer:Math.max(1,n('hz-vp-primer')),lunes:!!$('hz-vp-lunes').checked,vuelta:!!($('hz-vp-vuelta')||{}).checked};K.msg='';guardar();pintar();return}
  if(id==='hz-f-vac'){if($('hz-vf').value<$('hz-vi').value)return;
    const v={e:$('hz-ve').value,t:$('hz-vt').value,i:$('hz-vi').value,f:$('hz-vf').value,n:$('hz-vn').value.trim()};
    H().vac.push(v);const falta=aplicarVac(v,true);
    const enBloq=(H().bloqueos||[]).filter(b=>b.i<=v.f&&b.f>=v.i);
    K.msg=(falta.length?`<b>Cuidado:</b> con estas vacaciones la cobertura baja de ${MIN_COB} en: ${falta.slice(0,8).join(', ')}${falta.length>8?'…':''}.`:'')
      +(enBloq.length?`${falta.length?'<br>':''}<b>Ojo:</b> caen en fechas sin vacaciones: ${enBloq.map(b=>esc(b.n||'sin motivo')+' ('+corto(fd(b.i))+' – '+corto(fd(b.f))+')').join(', ')}.`:'')+(ofertaVuelta(v)?(falta.length||enBloq.length?'<br>':'')+ofertaVuelta(v):'');
    subVac='per';guardar(tocadas.slice());pintar()}
  else{const i=$('hz-bi').value,f=$('hz-bf').value;if(!i||!f||f<i)return;
    (H().bloqueos=H().bloqueos||[]).push({i,f,n:$('hz-bn').value.trim()});K.msg='';guardar();pintar()}
});
})();
