/* Horarios de cocina para Oído Cocina.
   Datos en localStorage 'seda_horarios' y en la nube (tabla config, misma clave).
   Forma: {equipo:[{n,rol,g,desde,hasta}], semanas:{lunesISO:{nombre:[7 turnos]}}, extras:{}, practicas:{}, vac:[{e,t,i,f,n}]} */
const HZ_KEY = 'seda_horarios';
const HZ_ABR = {L:'LIBRE',V:'VACACIONES',B:'BAJA MATERNAL',P:'12:00-16:00\n20:00-00:00',a:'08:00-16:00',b:'06:30-14:30',c:'16:00-00:00',d:'14:30-22:30',e:'12:00-20:00',f:'09:00-17:00','-':''};
function hzSeed(){
  const eq=[['Rubén','Jefe de cocina',0],['Darío','Cocinero',1],['Fabián','Cocinero',1],['Álvaro','Cocinero',1],['Rocío','Segunda cocina',2],['John','Ayudante',3],['David','Ayudante',3],['Ana','Ayudante',3],['Rosa','Fregantina',4],['Camila','Fregantina',4],['Jimena','Fregantina',4]]
    .map(([n,rol,g])=>({n,rol,g,desde:n==='Jimena'?'2026-11-09':'',hasta:n==='Rosa'?'2026-11-08':''}));
  const S={
  '2026-04-20':['c c a a a L L','P P L L d a a','a a b b L L P','L L c c c P P','B B B B B B B','b b L L b b b','V V V V V V V','L L P P c c c','- - c f P P c','B B B B B B B'],
  '2026-04-27':['e e L L a a a','L L d d d P P','L L P P 10:00-18:00 b b','c c L L P P d','B B B B B B B','b b b b b L L','V V V V V V V','P P L L c c c','L L c c P P e','B B B B B B B'],
  '2026-05-04':['a P a L L a a','P P L L d d c','b b L L P P e','d d P L L P c','B B B B B B B','V V V V V V V','L L b b b b b','08:00-12:00|20:00-00:00 c c P c L L','L L c c c c P','B B B B B B B'],
  '2026-05-11':['a P a L L a a','c c P P f L L','P e L L c P 17:00-00:00','V V V V V V V','B B B B B B B','L L b b c P P','b b L L b b b','L L c d P f P','L L a a P P a','B B B B B B B'],
  '2026-05-18':['e P a a a L L','d d L L d P P','V V V V V V V','L L c c c P P','B B B B B B B','L L b b b b b','b b P L L a a','c L L P P d c','c c c P P P P','B B B B B B B'],
  '2026-05-25':['a L L P a a a','c P P c L L c','L L c d P P c','d 08:00-12:00|16:00-20:00 L L c c P','B B B B B B B','b b b L L b b','P P f b b L L','V V V V V V V','L L a a P P f','B B B B B B B'],
  '2026-11-09':['c c L L a a a','a a P P c L L','V V V V V V V','L L a a a P P','B B B B B B B','L L b b b b b','06:00-14:00 06:00-14:00 L L P P 10:00-18:00','P P c c L L c','- - - - - - -','B B B B B B B','L L c c c P P']};
  const semanas={};
  for(const k in S){semanas[k]={};S[k].forEach((l,i)=>{semanas[k][eq[i].n]=l.split(' ').map(x=>x in HZ_ABR?HZ_ABR[x]:x.replace('|','\n'))})}
  const vac=[['Rubén','verano','2026-08-01','2026-08-22','Verano principal'],['Rubén','invierno','2026-12-24','2026-12-31','Navidad'],['Fabián','verano','2026-07-15','2026-08-04','Verano'],['Álvaro','verano','2026-07-01','2026-07-14','Verano'],['Rocío','maternal','2026-01-15','2026-12-31','Baja maternal'],['John','verano','2026-08-10','2026-08-25','Verano'],['David','verano','2026-07-20','2026-08-10','Verano'],['Ana','verano','2026-08-01','2026-08-15','Verano'],['Rosa','verano','2026-07-01','2026-07-21','Verano principal'],['Camila','maternal','2026-01-20','2026-12-31','Baja maternal'],['Fabián','extra','2026-11-09','2026-11-15','Semana de noviembre']].map(([e,t,i,f,n])=>({e,t,i,f,n}));
  return {equipo:eq,semanas,extras:{},practicas:{},vac};
}
function hzNormaliza(v){
  if(!v||typeof v!=='object') return hzSeed();
  v.equipo=Array.isArray(v.equipo)?v.equipo:hzSeed().equipo; v.semanas=v.semanas||{}; v.extras=v.extras||{}; v.practicas=v.practicas||{}; v.vac=v.vac||[];
  return v;
}
function hzLoad(){
  try{const g=JSON.parse(localStorage.getItem(HZ_KEY)||'null'); if(g) return hzNormaliza(g)}catch(e){}
  const s=hzSeed(); try{localStorage.setItem(HZ_KEY,JSON.stringify(s))}catch(e){} return s;
}
let horarios = hzLoad();

(function(){
const DIAS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DL=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const GRUPOS=['Jefatura','Cocineros','Segunda cocina','Ayudantes','Fregantinas'];
const MIN_COB=3, MAX_H=40, MIN_DESC=12, VAC_ANUAL=30;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fd=s=>new Date(s+'T00:00');
const lunes=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const sumar=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const corto=d=>d.getDate()+' '+MES[d.getMonth()];
const fmtH=h=>(Math.round(h*10)/10).toString().replace('.',',');
const cap=s=>s[0].toUpperCase()+s.slice(1);
function pHM(x){const[h,m]=x.trim().replace('.',':').split(':').map(Number);return h+(m||0)/60}
function tramos(t){
  if(!t)return[];const u=t.toUpperCase();if(['LIBRE','VACACIONES','BAJA'].some(k=>u.includes(k)))return[];
  const r=[];t.split('\n').forEach(seg=>{const p=seg.trim().split(/[-aA]/);if(p.length<2)return;const i=pHM(p[0]);let f=pHM(p[1]);if(isNaN(i)||isNaN(f))return;if(f<=i)f+=24;r.push([i,f])});return r}
const horas=t=>tramos(t).reduce((s,[i,f])=>s+f-i,0);
const trabaja=t=>tramos(t).length>0;
function tipo(t){if(!t)return'vacio';const u=t.toUpperCase();if(u.includes('LIBRE'))return'libre';if(u.includes('VACACIONES'))return'vac';if(u.includes('BAJA'))return'baja';return'trab'}
const H=()=>horarios;
function equipoSem(k){const a=fd(k),b=sumar(a,6),ia=iso(a),ib=iso(b);return H().equipo.filter(e=>(!e.desde||e.desde<=ib)&&(!e.hasta||e.hasta>=ia))}
function fila(k,n){const s=H().semanas[k]||(H().semanas[k]={});return s[n]||(s[n]=['','','','','','',''])}
function sinTurnos(k){const s=H().semanas[k];return !s||!Object.values(s).some(a=>a.some(trabaja))}
function personasDia(k,i){const s=H().semanas[k]||{};const r=[];
  equipoSem(k).forEach(e=>{const t=(s[e.n]||[])[i];if(trabaja(t))r.push({n:e.n,rol:e.rol,g:e.g,t})});
  (H().extras[k]||[]).forEach(p=>{if(trabaja(p.t[i]))r.push({n:p.n,rol:'Extra',g:3,t:p.t[i]})});return r}
const cobertura=(k,i)=>personasDia(k,i).length;
function enHora(t,h){return tramos(t).some(([i,f])=>(h>=i&&h<f)||(h+24>=i&&h+24<f))}

/* ---- API para el resto de la app ---- */
window.hzDia=function(fecha){const d=fd(fecha),k=iso(lunes(d)),i=(d.getDay()+6)%7;
  if(sinTurnos(k))return null;return {k,i,gente:personasDia(k,i)}};
window.htmlHorarioEvento=function(ev){
  try{
    if(!ev||!ev.fecha)return'';const d=window.hzDia(ev.fecha);if(!d)return'';
    const coc=d.gente.filter(p=>p.g<=3);
    const h=ev.hora?pHM(ev.hora):null;
    const vent=h==null?coc:coc.filter(p=>tramos(p.t).some(([a,b])=>b>h-1&&a<h+1.5||b>h+23&&a<h+25.5));
    const pax=(typeof eventos!=='undefined'?eventos:[]).filter(e=>e.fecha===ev.fecha).reduce((s,e)=>s+(Number(e.pax)||0),0);
    const rp=(typeof ajustes!=='undefined'&&ajustes&&Number(ajustes.raciones_por_persona))||80;
    const mal=coc.length<MIN_COB, carga=vent.length&&pax/vent.length>rp;
    const cls=mal?'b-danger':(carga||!vent.length)?'b-warn':'b-success';
    let txt=`<i class="ti ti-users"></i> Cocina ese día: ${coc.length}`+(h!=null?` · a las ${esc(ev.hora)}: ${vent.length}${vent.length?' ('+vent.map(p=>esc(p.n)).join(', ')+')':''}`:'');
    if(mal)txt+=` · menos de ${MIN_COB} personas`;
    else if(carga)txt+=` · ${pax} pax del día para ${vent.length} persona${vent.length===1?'':'s'}: refuerza`;
    else if(!vent.length)txt+=` · nadie en turno a esa hora`;
    return `<div style="margin:6px 0"><span class="badge ${cls}">${txt}</span></div>`;
  }catch(e){return''}
};

/* ---- estado de la interfaz ---- */
let tab='plantilla', semana=lunes(new Date()), edit=null, anio=new Date().getFullYear(), msg='';
const TABS=[['plantilla','Plantilla'],['ahora','Ahora'],['extras','Extras'],['practicas','Prácticas'],['vacaciones','Vacaciones'],['equipo','Equipo']];
const root=()=>document.getElementById('hz-root');
function guardar(){try{localStorage.setItem(HZ_KEY,JSON.stringify(horarios))}catch(e){} try{syncConfig(HZ_KEY,horarios)}catch(e){}}

function avisos(k){
  const av=[],s=H().semanas[k];if(!s)return av;
  equipoSem(k).forEach(e=>{const a=s[e.n];if(!a)return;
    const h=a.reduce((x,t)=>x+horas(t),0);if(h>MAX_H)av.push(`${e.n} suma ${fmtH(h)} h (máximo ${MAX_H} h)`);
    for(let i=0;i<6;i++){const t1=tramos(a[i]),t2=tramos(a[i+1]);if(!t1.length||!t2.length)continue;
      const d=Math.min(...t2.map(x=>x[0]))+24-Math.max(...t1.map(x=>x[1]));if(d<MIN_DESC)av.push(`${e.n}: solo ${fmtH(d)} h de descanso entre ${DL[i]} y ${DL[i+1]}`)}});
  for(let i=0;i<7;i++){const c=cobertura(k,i);if(c<MIN_COB)av.push(`${cap(DL[i])}: ${c} persona${c===1?'':'s'} (mínimo ${MIN_COB})`)}
  [5,6].forEach(i=>{const l=equipoSem(k).filter(e=>tipo((s[e.n]||[])[i])==='libre').length;if(l>1)av.push(`${cap(DL[i])}: ${l} personas libres (máximo 1)`)});
  return av}

/* ---- vistas ---- */
function barraIn(){const f=sumar(semana,6);return `<button class="btn-sec" data-a="ant" aria-label="Semana anterior">←</button><div class="hz-sem">${corto(semana)} – ${corto(f)}</div><button class="btn-sec" data-a="sig" aria-label="Semana siguiente">→</button><button class="btn-sec" data-a="hoy">Esta semana</button>`}
function barra(){return `<div class="hz-bar">${barraIn()}</div>`}
function vPlantilla(){
  const k=iso(semana),hoy=iso(new Date()),vacia=sinTurnos(k),eq=equipoSem(k);
  const prev=Object.keys(H().semanas).filter(x=>x<k&&!sinTurnos(x)).sort().pop();
  let h=`<div class="hz-bar">${barraIn()}<span style="flex:1"></span>${vacia&&prev?`<button class="btn btn-p" data-a="copiar" data-p="${prev}">Copiar semana del ${corto(fd(prev))}</button>`:''}</div>`;
  if(vacia)h+=`<div class="hz-aviso warn">Esta semana no tiene turnos. Toca una celda para escribirlos${prev?' o copia la última semana con datos':''}.</div>`;
  else{const av=avisos(k);h+=av.length?`<div class="hz-aviso warn"><b>${av.length} aviso${av.length===1?'':'s'}</b><ul>${av.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:`<div class="hz-aviso ok">Sin avisos: cobertura, descansos y horas dentro de las reglas.</div>`}
  h+=`<div class="hz-tabla"><table><thead><tr><th class="nom">Equipo</th>${DIAS.map((n,i)=>`<th class="${iso(sumar(semana,i))===hoy?'hoy':''}">${n}<br>${sumar(semana,i).getDate()}</th>`).join('')}<th>h/sem</th></tr></thead><tbody>`;
  GRUPOS.forEach((g,gi)=>{const m=eq.filter(e=>e.g===gi);if(!m.length)return;h+=`<tr class="grp"><td colspan="9">${g}</td></tr>`;
    m.forEach(e=>{const a=fila(k,e.n),tot=a.reduce((x,t)=>x+horas(t),0);
      h+=`<tr><td class="nom"><b>${esc(e.n)}</b><small>${esc(e.rol)}</small></td>${a.map((t,i)=>{let c=tipo(t);if(c==='trab'&&e.g===0)c='jefe';
        const sel=edit&&edit.k===k&&edit.e===e.n&&edit.i===i?' sel':'';
        return`<td><button class="hz-cel ${c}${sel}" data-e="${esc(e.n)}" data-i="${i}" aria-label="${esc(e.n)}, ${DL[i]}">${c==='vacio'?'+':t.split('\n').map(s=>`<span>${esc(s)}</span>`).join('')}</button></td>`}).join('')}<td class="h ${tot>MAX_H?'alta':''}">${tot?fmtH(tot):'–'}</td></tr>`})});
  h+=`<tr class="cob"><td class="nom">Cobertura</td>${[0,1,2,3,4,5,6].map(i=>{const c=cobertura(k,i);return`<td><span class="hz-cobp ${vacia?'':c>=MIN_COB?'ok':c===2?'warn':'bad'}">${vacia?'–':c}</span></td>`}).join('')}<td></td></tr></tbody></table></div>`;
  if(edit&&edit.k===k){const t=fila(k,edit.e)[edit.i],d=sumar(semana,edit.i);
    h+=`<div class="hz-editor"><b>${esc(edit.e)} · ${DL[edit.i]} ${d.getDate()} ${MES[d.getMonth()]}</b>
    <label for="hz-turno" style="font-size:12px;color:var(--text-secondary)">Turno (un bloque por línea; el partido son dos líneas)</label>
    <textarea id="hz-turno" rows="2" placeholder="08:00-16:00">${esc(t)}</textarea>
    <div class="hz-chips">${[['Libre','LIBRE'],['Vacaciones','VACACIONES'],['Baja','BAJA MATERNAL'],['06:30-14:30','06:30-14:30'],['08:00-16:00','08:00-16:00'],['12:00-20:00','12:00-20:00'],['14:30-22:30','14:30-22:30'],['16:00-00:00','16:00-00:00'],['Partido','12:00-16:00\n20:00-00:00']].map(([n,v])=>`<button class="btn-sec hz-sm" data-q="${esc(v)}">${n}</button>`).join('')}</div>
    <div class="hz-bar"><button class="btn btn-p" data-a="gturno">Guardar</button><button class="btn-sec" data-a="cturno">Cancelar</button><button class="btn-sec" data-a="bturno">Borrar celda</button></div></div>`}
  return h}

function vAhora(){
  const n=new Date(),k=iso(lunes(n)),di=(n.getDay()+6)%7,hr=n.getHours()+n.getMinutes()/60;
  if(sinTurnos(k))return`<div class="hz-aviso warn">Sin turnos esta semana. Cárgalos en Plantilla.</div>`;
  const en=[],pr=[],fu=[];
  const todos=equipoSem(k).map(e=>({n:e.n,rol:e.rol,t:(fila(k,e.n)[di])||''}));
  (H().extras[k]||[]).forEach(p=>todos.push({n:p.n,rol:'Extra · '+p.rol,t:p.t[di]||''}));
  todos.forEach(p=>{let est='fu';for(const[i,f]of tramos(p.t)){let x=hr;if(f>24&&hr<i-12)x=hr+24;if(x>=i&&x<f){est='en';break}if(i>x&&i-x<2)est='pr'}(est==='en'?en:est==='pr'?pr:fu).push(p)});
  const lista=(a,v)=>a.length?a.map(p=>`<div class="hz-fila"><span><b>${esc(p.n)}</b><br><small>${esc(p.rol)}</small></span><span class="hz-pill ${tipo(p.t)==='trab'?'trab':tipo(p.t)}">${esc(p.t.replace('\n',' · ')||'—')}</span></div>`).join(''):`<div class="hz-vacio">${v}</div>`;
  return`<div class="hz-cols"><div class="card"><b>En turno ahora (${en.length})</b>${lista(en,'Nadie en este momento.')}</div><div class="card"><b>Entran en menos de 2 h (${pr.length})</b>${lista(pr,'Nadie entra pronto.')}</div><div class="card"><b>Fuera hoy (${fu.length})</b>${lista(fu,'Todos están en turno.')}</div></div>`}

function vPersonas(t){
  const k=iso(semana),lista=H()[t][k]||[],ex=t==='extras';
  let h=barra()+`<div class="card"><b>${ex?'Personal extra':'Alumnos en prácticas'} de la semana</b>`;
  h+=lista.length?lista.map((p,ix)=>`<div class="hz-fila" style="flex-wrap:wrap;align-items:flex-start"><span><b>${esc(p.n)}</b><br><small>${esc(p.rol)}</small></span><span style="display:flex;gap:4px;flex-wrap:wrap">${p.t.map((x,i)=>`<span class="hz-pill ${x?'extra':'libre'}">${DIAS[i]} ${esc((x||'—').replace('\n',' · '))}</span>`).join('')}</span><button class="btn-sec hz-sm" data-del="${ix}">Quitar</button></div>`).join(''):`<div class="hz-vacio">Nadie apuntado esta semana.</div>`;
  h+=`</div><form class="card" id="hz-f-pers" data-t="${t}"><b>Añadir ${ex?'extra':'alumno'}</b><div class="hz-form"><label>Nombre<input id="hz-pn" required></label><label>${ex?'Puesto':'Centro educativo'}<input id="hz-pr" required></label></div><div class="hz-dias">${DIAS.map((n,i)=>`<label>${n}<input id="hz-pt${i}" placeholder="08:00-16:00"></label>`).join('')}</div><button class="btn btn-p" type="submit">Añadir</button></form>`;
  return h}

function diasEn(i,f,y){const a=new Date(Math.max(fd(i),fd(y+'-01-01'))),b=new Date(Math.min(fd(f),fd(y+'-12-31')));return b<a?0:Math.round((b-a)/864e5)+1}
function vVac(){
  const y=anio,eqY=H().equipo.filter(e=>(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y));
  let h=`<div class="hz-bar"><button class="btn-sec" data-a="aant" aria-label="Año anterior">←</button><div class="hz-sem">${y}</div><button class="btn-sec" data-a="asig" aria-label="Año siguiente">→</button></div>`;
  if(msg)h+=`<div class="hz-aviso warn">${msg}</div>`;
  h+=`<div class="hz-cols">`;
  eqY.forEach(e=>{const ps=H().vac.filter(v=>v.e===e.n&&v.i.slice(0,4)<=y&&v.f.slice(0,4)>=y);
    const usados=ps.filter(v=>v.t!=='maternal').reduce((s,v)=>s+diasEn(v.i,v.f,y),0),res=VAC_ANUAL-usados,mat=ps.some(v=>v.t==='maternal');
    const col=res>10?'#5dcaa5':res>=5?'#ef9f27':'#e24b4a';
    const meses=Array.from({length:12},(_,m)=>{const a=new Date(y,m,1),b=new Date(y,m+1,0);const p=ps.find(v=>fd(v.i)<=b&&fd(v.f)>=a);return`<span class="${p?({verano:'v',invierno:'i',extra:'x',maternal:'m'}[p.t]):''}" title="${MES[m]}"></span>`}).join('');
    h+=`<div class="card"><div class="hz-fila" style="border:0;padding:0"><b>${esc(e.n)}</b><small>${mat&&!usados?'Baja':`${res} de ${VAC_ANUAL} días`}</small></div>${mat&&!usados?'':`<div class="hz-saldo"><i style="width:${Math.max(0,Math.min(100,usados/VAC_ANUAL*100))}%;background:${col}"></i></div>`}<div class="hz-meses">${meses}</div>
    ${ps.map(v=>`<div class="hz-fila"><span><small>${esc(v.t)} · ${corto(fd(v.i))} – ${corto(fd(v.f))}${v.n?' · '+esc(v.n):''}</small></span><span style="display:flex;gap:6px;align-items:center"><small>${diasEn(v.i,v.f,y)} d</small><button class="btn-sec hz-sm" data-vdel="${H().vac.indexOf(v)}">Quitar</button></span></div>`).join('')}</div>`});
  h+=`</div><form class="card" id="hz-f-vac"><b>Añadir periodo</b> <small style="color:var(--text-secondary)">(rellena el horario con VACACIONES y avisa si baja la cobertura)</small><div class="hz-form"><label>Empleado<select id="hz-ve">${H().equipo.map(e=>`<option>${esc(e.n)}</option>`).join('')}</select></label><label>Tipo<select id="hz-vt"><option value="verano">verano</option><option value="invierno">invierno</option><option value="extra">extra</option><option value="maternal">maternal</option></select></label><label>Desde<input type="date" id="hz-vi" required></label><label>Hasta<input type="date" id="hz-vf" required></label><label>Nota<input id="hz-vn"></label></div><button class="btn btn-p" type="submit">Añadir</button></form>`;
  return h}

function vEquipo(){
  const op=g=>GRUPOS.map((n,i)=>`<option value="${i}"${i===g?' selected':''}>${n}</option>`).join('');
  let h=`<div class="card"><b>Equipo</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">Pon la fecha «hasta» a quien se va y «desde» a quien entra: cada uno conserva su historial y solo aparece en las semanas que le corresponden.</p>`;
  h+=H().equipo.map((e,i)=>`<div class="hz-eq"><b>${esc(e.n)}</b><input data-eq="${i}" data-f="rol" value="${esc(e.rol)}" aria-label="Puesto"><select data-eq="${i}" data-f="g" aria-label="Grupo">${op(e.g)}</select><label>Desde<input type="date" data-eq="${i}" data-f="desde" value="${e.desde||''}"></label><label>Hasta<input type="date" data-eq="${i}" data-f="hasta" value="${e.hasta||''}"></label></div>`).join('');
  h+=`</div><form class="card" id="hz-f-eq"><b>Añadir persona</b><div class="hz-form"><label>Nombre<input id="hz-en" required></label><label>Puesto<input id="hz-er" required></label><label>Grupo<select id="hz-eg">${op(3)}</select></label><label>Desde<input type="date" id="hz-ed"></label></div><button class="btn btn-p" type="submit">Añadir</button></form>`;
  return h}

function pintar(){
  const r=root();if(!r)return;
  const f={plantilla:vPlantilla,ahora:vAhora,extras:()=>vPersonas('extras'),practicas:()=>vPersonas('practicas'),vacaciones:vVac,equipo:vEquipo}[tab];
  r.innerHTML=`<div class="hz-tabs" role="tablist">${TABS.map(([k,n])=>`<button role="tab" aria-selected="${k===tab}" data-t="${k}">${n}</button>`).join('')}</div>`+f();
}
window.initHorarios=function(){pintar()};

/* ---- vacaciones -> horario ---- */
function aplicarVac(v,poner){
  const txt=v.t==='maternal'?'BAJA MATERNAL':'VACACIONES',falta=[];
  for(let d=fd(v.i),f=fd(v.f);d<=f;d=sumar(d,1)){
    const k=iso(lunes(d)),i=(d.getDay()+6)%7,a=fila(k,v.e);
    if(poner)a[i]=txt;else if(/VACACIONES|BAJA/i.test(a[i]))a[i]='';
    if(poner&&!sinTurnos(k)&&cobertura(k,i)<MIN_COB)falta.push(`${DL[i]} ${d.getDate()} ${MES[d.getMonth()]} (${cobertura(k,i)})`);
  }
  return falta}

/* ---- eventos de la interfaz ---- */
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  const t=e.target.closest('[data-t]');if(t&&t.closest('.hz-tabs')){tab=t.dataset.t;edit=null;msg='';pintar();return}
  const c=e.target.closest('.hz-cel');if(c){edit={k:iso(semana),e:c.dataset.e,i:+c.dataset.i};pintar();const x=document.getElementById('hz-turno');if(x)x.focus();return}
  const q=e.target.closest('[data-q]');if(q){document.getElementById('hz-turno').value=q.dataset.q;return}
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='ant'){semana=sumar(semana,-7);edit=null;pintar()}else if(a==='sig'){semana=sumar(semana,7);edit=null;pintar()}
  else if(a==='hoy'){semana=lunes(new Date());edit=null;pintar()}
  else if(a==='aant'){anio--;pintar()}else if(a==='asig'){anio++;pintar()}
  else if(a==='copiar'){const p=e.target.closest('[data-p]').dataset.p,k=iso(semana);H().semanas[k]={};equipoSem(k).forEach(m=>{H().semanas[k][m.n]=[...fila(p,m.n)]});guardar();pintar()}
  else if(a==='gturno'){fila(edit.k,edit.e)[edit.i]=document.getElementById('hz-turno').value.trim();guardar();edit=null;pintar()}
  else if(a==='bturno'){fila(edit.k,edit.e)[edit.i]='';guardar();edit=null;pintar()}
  else if(a==='cturno'){edit=null;pintar()}
  const d=e.target.closest('[data-del]');if(d){H()[tab][iso(semana)].splice(+d.dataset.del,1);guardar();pintar()}
  const v=e.target.closest('[data-vdel]');if(v){const p=H().vac.splice(+v.dataset.vdel,1)[0];aplicarVac(p,false);msg='';guardar();pintar()}
});
document.addEventListener('change',e=>{
  const x=e.target.closest('[data-eq]');if(!x)return;
  const p=H().equipo[+x.dataset.eq],f=x.dataset.f;p[f]=f==='g'?+x.value:x.value.trim();guardar()});
document.addEventListener('submit',e=>{
  const id=e.target.id;if(!id||!id.startsWith('hz-f-'))return;e.preventDefault();const $=s=>document.getElementById(s);
  if(id==='hz-f-pers'){const t=e.target.dataset.t,k=iso(semana);(H()[t][k]=H()[t][k]||[]).push({n:$('hz-pn').value.trim(),rol:$('hz-pr').value.trim(),t:DIAS.map((_,i)=>$('hz-pt'+i).value.trim())});guardar();pintar()}
  else if(id==='hz-f-vac'){if($('hz-vf').value<$('hz-vi').value)return;
    const v={e:$('hz-ve').value,t:$('hz-vt').value,i:$('hz-vi').value,f:$('hz-vf').value,n:$('hz-vn').value.trim()};
    H().vac.push(v);const falta=aplicarVac(v,true);
    msg=falta.length?`<b>Cuidado:</b> con estas vacaciones la cobertura baja de ${MIN_COB} en: ${falta.slice(0,8).join(', ')}${falta.length>8?'…':''}.`:'';
    guardar();pintar()}
  else if(id==='hz-f-eq'){const n=$('hz-en').value.trim();if(H().equipo.some(p=>p.n.toLowerCase()===n.toLowerCase()))return;
    H().equipo.push({n,rol:$('hz-er').value.trim(),g:+$('hz-eg').value,desde:$('hz-ed').value,hasta:''});guardar();pintar()}
});
})();
