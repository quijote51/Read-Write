/* Horarios de cocina para Oído Cocina.
   Datos en localStorage 'seda_horarios' y en la nube (tabla config, misma clave).
   Forma: {equipo:[{n,rol,g,desde,hasta}], semanas:{lunesISO:{nombre:[7 turnos]}}, extras:{}, practicas:{}, vac:[{e,t,i,f,n}]} */
const HZ_KEY = 'seda_horarios';
const HZ_ABR = {L:'LIBRE',V:'VACACIONES',B:'BAJA MATERNAL',P:'12:00-16:00\n20:00-00:00',a:'08:00-16:00',b:'06:30-14:30',c:'16:00-00:00',d:'14:30-22:30',e:'12:00-20:00',f:'09:00-17:00',R:'RECUPERACIÓN DÍA LIBRE TRABAJADO','-':''};
// Horarios vacíos para empezar (los datos de cada hotel están en su nube; nada de nombres de un cliente en el código)
function hzSeed(){ return {equipo:[],semanas:{},extras:{},practicas:{},vac:[]}; }
function hzNormaliza(v){
  if(!v||typeof v!=='object') return hzSeed();
  v.equipo=Array.isArray(v.equipo)?v.equipo:hzSeed().equipo; v.semanas=v.semanas||{}; v.extras=v.extras||{}; v.practicas=v.practicas||{}; v.vac=v.vac||[]; v.ts=v.ts||0; v.wts=v.wts||{};
  return v;
}
const hzClon=o=>JSON.parse(JSON.stringify(o));
/* Combina lo local con lo de la nube: gana el conjunto más reciente (ts) y, semana a semana, la semana editada más tarde (wts). */
function hzElige(l,c){
  l=hzNormaliza(hzClon(l)); if(!c) return l; c=hzNormaliza(hzClon(c));
  const base=(l.ts||0)>(c.ts||0)?l:c, otro=base===l?c:l, r=hzClon(base);
  for(const k in otro.semanas){const tb=(base.wts||{})[k]||0,to=(otro.wts||{})[k]||0;
    if(!(k in r.semanas)||to>tb){r.semanas[k]=hzClon(otro.semanas[k]);r.wts[k]=to}}
  // Lo ya enviado por WhatsApp también se junta: por persona gana el envío más reciente
  r.enviado=r.enviado||{};for(const k in (otro.enviado||{})){r.enviado[k]=r.enviado[k]||{};for(const n in otro.enviado[k]){const a=r.enviado[k][n],b=otro.enviado[k][n];if(!a||(b.ts||0)>(a.ts||0))r.enviado[k][n]=b}}
  r.ts=Math.max(l.ts||0,c.ts||0); return r}
function hzSync(nube){
  horarios=hzElige(horarios,nube);
  try{localStorage.setItem(HZ_KEY,JSON.stringify(horarios))}catch(e){}
  if(JSON.stringify(horarios)!==JSON.stringify(hzNormaliza(hzClon(nube)))){try{syncConfig(HZ_KEY,horarios)}catch(e){}}
}
function hzLoad(){
  try{const g=JSON.parse(localStorage.getItem(HZ_KEY)||'null'); if(g) return hzNormaliza(g)}catch(e){}
  const s=hzNormaliza(hzSeed()); try{localStorage.setItem(HZ_KEY,JSON.stringify(s))}catch(e){} return s;
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
const SOLO=()=>window.HZ_SOLO_LEER===true;
const TABS=[['plantilla','Plantilla'],['mi','Mi semana'],['horas','Horas'],['cambios','Cambios'],['ahora','Ahora'],['eventos','Eventos'],['extras','Extras'],['practicas','Prácticas'],['vacaciones','Vacaciones'],['equipo','Equipo']];
const root=()=>document.getElementById('hz-root');
function guardar(ks){
  if(SOLO())return;
  const t=Date.now();H().ts=t;H().wts=H().wts||{};[].concat(ks||[]).forEach(k=>{H().wts[k]=t});
  try{localStorage.setItem(HZ_KEY,JSON.stringify(horarios))}catch(e){} try{syncConfig(HZ_KEY,horarios)}catch(e){}}

function avisos(k){
  const av=[],s=H().semanas[k];if(!s)return av;
  equipoSem(k).forEach(e=>{const a=s[e.n];if(!a)return;
    const h=a.reduce((x,t)=>x+horas(t),0);if(h>MAX_H)av.push(`${e.n} suma ${fmtH(h)} h (máximo ${MAX_H} h)`);
    for(let i=0;i<6;i++){const t1=tramos(a[i]),t2=tramos(a[i+1]);if(!t1.length||!t2.length)continue;
      const d=Math.min(...t2.map(x=>x[0]))+24-Math.max(...t1.map(x=>x[1]));if(d<MIN_DESC)av.push(`${e.n}: solo ${fmtH(d)} h de descanso entre ${DL[i]} y ${DL[i+1]}`)}});
  const kp=iso(sumar(fd(k),-7));
  if(H().semanas[kp]&&!sinTurnos(kp))equipoSem(k).forEach(e=>{const t1=tramos((H().semanas[kp][e.n]||[])[6]),t2=tramos((s[e.n]||[])[0]);if(!t1.length||!t2.length)return;
    const d=Math.min(...t2.map(x=>x[0]))+24-Math.max(...t1.map(x=>x[1]));if(d<MIN_DESC)av.push(`${e.n}: solo ${fmtH(d)} h de descanso entre el domingo anterior y el lunes`)});
  for(let i=0;i<7;i++){const c=cobertura(k,i);if(c<MIN_COB)av.push(`${cap(DL[i])}: ${c} persona${c===1?'':'s'} (mínimo ${MIN_COB})`)}
  [5,6].forEach(i=>{const l=equipoSem(k).filter(e=>tipo((s[e.n]||[])[i])==='libre').length;if(l>1)av.push(`${cap(DL[i])}: ${l} personas libres (máximo 1)`)});
  return av}

/* ---- vistas ---- */
function barraIn(){const f=sumar(semana,6);return `<button class="btn-sec" data-a="ant" aria-label="Semana anterior">←</button><div class="hz-sem">${corto(semana)} – ${corto(f)}</div><button class="btn-sec" data-a="sig" aria-label="Semana siguiente">→</button><button class="btn-sec" data-a="hoy">Esta semana</button>`}
function barra(){return `<div class="hz-bar">${barraIn()}</div>`}
/* Vista de móvil: una tarjeta por día. Quien trabaja va en filas (por hora de entrada) y el resto (libre, vacaciones, baja) en chips pequeños.
   En pantallas anchas se ve la tabla de siempre; en estrechas (≤ 700 px) solo esta (CSS en horarios.css). */
const ORDEN_ESTADO={libre:1,vac:2,baja:3,vacio:4};
const ETQ_ESTADO={libre:'Libre',vac:'Vacaciones',baja:'Baja',vacio:'Sin turno'};
function vDias(k,eq,vacia,ed){
  const s=H().semanas[k]||{},hoyIso=iso(new Date());let h='<div class="hz-dvista">';
  for(let i=0;i<7;i++){
    const d=sumar(semana,i),esHoy=iso(d)===hoyIso,c=cobertura(k,i);
    const lista=eq.map(e=>{const t=(s[e.n]||[])[i]||'';let est=tipo(t);if(est==='trab'&&e.g===0)est='jefe';return{e,t,est,ini:tramos(t).length?Math.min(...tramos(t).map(x=>x[0])):99}});
    const trab=lista.filter(x=>x.est==='trab'||x.est==='jefe').sort((a,b)=>a.ini-b.ini),otros=lista.filter(x=>x.est!=='trab'&&x.est!=='jefe').sort((a,b)=>ORDEN_ESTADO[a.est]-ORDEN_ESTADO[b.est]);
    const attr=x=>SOLO()?'':` data-e="${esc(x.e.n)}" data-i="${i}"`,tag=SOLO()?'div':'button',tp=SOLO()?'':' type="button"';
    const sel=x=>edit&&edit.k===k&&edit.e===x.e.n&&edit.i===i?' sel':'';
    h+=`<section class="hz-dia${esHoy?' hoy':''}" aria-label="${DL[i]} ${d.getDate()}">
      <div class="hz-dh"><b>${DIAS[i]} ${d.getDate()}</b><small>${MES[d.getMonth()]}${esHoy?' · hoy':''}</small><span class="hz-cobp ${vacia?'':c>=MIN_COB?'ok':c===2?'warn':'bad'}" title="Personas en cocina">${vacia?'–':c+' en cocina'}</span></div>`;
    trab.forEach(x=>{h+=`<${tag}${tp} class="hz-dfila ${x.est}${sel(x)}"${attr(x)} aria-label="${esc(x.e.n)}, ${DL[i]}"><span class="hz-dn"><b>${esc(x.e.n)}</b><small>${esc(x.e.rol)}</small></span><span class="hz-dt">${x.t.split('\n').map(z=>`<span>${esc(z)}</span>`).join('')}</span></${tag}>`});
    if(otros.length)h+=`<div class="hz-dotros">${otros.map(x=>`<${tag}${tp} class="hz-dchip ${x.est}${sel(x)}"${attr(x)} aria-label="${esc(x.e.n)}, ${DL[i]}: ${ETQ_ESTADO[x.est]}">${esc(x.e.n)} <i>${x.est==='vacio'?(SOLO()?'–':'+'):ETQ_ESTADO[x.est]}</i></${tag}>`).join('')}</div>`;
    if(ed&&edit&&edit.k===k&&edit.i===i)h+=ed;
    h+=`</section>`}
  return h+'</div>'}
function editorHtml(k){
  if(SOLO()||!edit||edit.k!==k)return '';
  {const t=fila(k,edit.e)[edit.i],d=sumar(semana,edit.i);
    // «Igual que ayer» (el domingo anterior si es lunes) e «Igual que hace una semana»: copian solo el turno de esta persona
    const ayer=edit.i>0?(fila(k,edit.e)[edit.i-1]||''):((H().semanas[iso(sumar(fd(k),-7))]||{})[edit.e]||[])[6]||'';
    const sPas=((H().semanas[iso(sumar(fd(k),-7))]||{})[edit.e]||[])[edit.i]||'';
    const copias=[['Igual que ayer',ayer],['Igual que hace 1 semana',sPas]].filter(([,v])=>v);
    return `<div class="hz-editor"><b>${esc(edit.e)} · ${DL[edit.i]} ${d.getDate()} ${MES[d.getMonth()]}</b>
    <label for="hz-turno" style="font-size:12px;color:var(--text-secondary)">Turno (un bloque por línea; el partido son dos líneas)</label>
    <textarea id="hz-turno" rows="2" placeholder="08:00-16:00">${esc(t)}</textarea>
    <div class="hz-chips">${copias.map(([n,v])=>`<button class="btn-sec hz-sm hz-copia" data-q="${esc(v)}" title="${esc(v.replace('\n',' + '))}">${n}</button>`).join('')}${[['Libre','LIBRE'],['Vacaciones','VACACIONES'],['Baja','BAJA MATERNAL'],['06:30-14:30','06:30-14:30'],['08:00-16:00','08:00-16:00'],['12:00-20:00','12:00-20:00'],['14:30-22:30','14:30-22:30'],['16:00-00:00','16:00-00:00'],['Partido','12:00-16:00\n20:00-00:00']].map(([n,v])=>`<button class="btn-sec hz-sm" data-q="${esc(v)}">${n}</button>`).join('')}</div>
    <div class="hz-bar"><button class="btn btn-p" data-a="gturno">Guardar</button><button class="btn-sec" data-a="cturno">Cancelar</button><button class="btn-sec" data-a="bturno">Borrar celda</button></div></div>`}
  return ''}
/* ---- Cobertura por horas: cuántas personas de cocina hay a cada hora (6:00–24:00) y qué evento cae en cada hora ----
   Colores de cada hora: 1 persona naranja, 2 amarillo, 3 o más verde (la hora de un evento lleva un marco dorado).
   Debajo, una línea por evento de la semana con quién hay a su hora (misma ventana que htmlHorarioEvento) y aviso si falta gente. */
const CH_0=6,CH_1=24;
function eventosSemana(k){
  const ev=(typeof eventos!=='undefined'&&Array.isArray(eventos))?eventos:[],r=[[],[],[],[],[],[],[]];
  ev.forEach(e=>{if(!e||!e.fecha)return;const d=fd(e.fecha);if(isNaN(d)||iso(lunes(d))!==k)return;r[(d.getDay()+6)%7].push(e)});
  r.forEach(a=>a.sort((x,y)=>String(x.hora||'').localeCompare(String(y.hora||''))));return r}
function vCobHoras(k){
  const evs=eventosSemana(k),hoyI=iso(new Date()),rp=(typeof ajustes!=='undefined'&&ajustes&&Number(ajustes.raciones_por_persona))||80;
  const horasCab=Array.from({length:CH_1-CH_0},(_,j)=>`<i>${(CH_0+j)%3===0?CH_0+j:''}</i>`).join('');
  let h=`<div class="card hz-ch"><b>Cobertura por horas</b><p class="hz-ch-ay">Cuántas personas de cocina hay a cada hora. El marco dorado es la hora de un evento.</p>
    <div class="hz-ch-fila hz-ch-esc" aria-hidden="true"><span></span><div class="hz-ch-celdas">${horasCab}</div></div>`;
  let lineas='';
  for(let i=0;i<7;i++){
    const gente=personasDia(k,i).filter(p=>p.g<=3),d=sumar(fd(k),i),horasEv=new Set(evs[i].map(e=>e.hora?Math.floor(pHM(e.hora)):-1));
    const celdas=Array.from({length:CH_1-CH_0},(_,j)=>{const hr=CH_0+j,n=gente.filter(p=>tramos(p.t).some(([a,b])=>a<hr+1&&b>hr)).length,ev=horasEv.has(hr);
      return `<span class="n${Math.min(n,3)}${ev?' ev':''}" title="${hr}:00 · ${n} en cocina${ev?' · evento':''}">${n||''}</span>`}).join('');
    h+=`<div class="hz-ch-fila${iso(d)===hoyI?' hoy':''}"><b>${DIAS[i]} ${d.getDate()}</b><div class="hz-ch-celdas">${celdas}</div></div>`;
    evs[i].forEach(e=>{
      const hh=e.hora?pHM(e.hora):null,pax=Number(e.pax)||0;
      const alli=hh==null?gente:gente.filter(p=>tramos(p.t).some(([a,b])=>(b>hh-1&&a<hh+1.5)||(b>hh+23&&a<hh+25.5)));
      let cls='ok',txt=`${alli.length} en cocina${alli.length?' ('+alli.map(p=>esc(p.n)).join(', ')+')':''}`;
      if(!alli.length){cls='bad';txt='nadie en turno a esa hora'}
      else if(pax/alli.length>rp){cls='warn';txt+=` · ${Math.round(pax/alli.length)} pax por persona: refuerza`}
      else if(alli.length<MIN_COB){cls='warn';txt+=` · menos de ${MIN_COB}`}
      lineas+=`<div class="hz-ch-ev ${cls}"><b>${DIAS[i]} ${d.getDate()}${e.hora?' · '+esc(e.hora):''}</b> ${esc(e.nombre)}${pax?' · '+pax+' pax':''}<br><small>${txt}</small></div>`});
  }
  return h+`<div class="hz-ch-leyenda"><span class="n1">1</span><span class="n2">2</span><span class="n3">3+</span><small>personas de cocina</small></div>${lineas?`<div class="hz-ch-evs">${lineas}</div>`:''}</div>`}
function vPlantilla(){
  const k=iso(semana),hoy=iso(new Date()),vacia=sinTurnos(k),eq=equipoSem(k);
  const prev=Object.keys(H().semanas).filter(x=>x<k&&!sinTurnos(x)).sort().pop();
  let h=`<div class="hz-bar">${barraIn()}<span style="flex:1"></span> ${prev&&!SOLO()?(vacia?`<button class="btn btn-p" data-a="copiar" data-p="${prev}">Copiar semana del ${corto(fd(prev))}</button>`:`<button class="btn-sec hz-sm" data-a="copiar" data-p="${prev}" title="Sustituye esta semana por la del ${corto(fd(prev))}">Repetir semana anterior</button>`):''}</div>`;
  if(vacia)h+=`<div class="hz-aviso warn">Esta semana no tiene turnos. Toca una celda para escribirlos${prev?' o copia la última semana con datos':''}.</div>`;
  else if(!SOLO()){const av=avisos(k);h+=av.length?`<div class="hz-aviso warn"><b>${av.length} aviso${av.length===1?'':'s'}</b><ul>${av.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:`<div class="hz-aviso ok">Sin avisos: cobertura, descansos y horas dentro de las reglas.</div>`}
  h+=`<div class="hz-tabla hz-plan"><table><thead><tr><th class="nom">Equipo</th>${DIAS.map((n,i)=>`<th class="${iso(sumar(semana,i))===hoy?'hoy':''}">${n}<br>${sumar(semana,i).getDate()}</th>`).join('')}<th>h/sem</th></tr></thead><tbody>`;
  GRUPOS.forEach((g,gi)=>{const m=eq.filter(e=>e.g===gi);if(!m.length)return;h+=`<tr class="grp"><td colspan="9">${g}</td></tr>`;
    m.forEach(e=>{const a=fila(k,e.n),tot=a.reduce((x,t)=>x+horas(t),0);
      h+=`<tr><td class="nom"><b>${esc(e.n)}</b><small>${esc(e.rol)}</small></td>${a.map((t,i)=>{let c=tipo(t);if(c==='trab'&&e.g===0)c='jefe';
        const sel=edit&&edit.k===k&&edit.e===e.n&&edit.i===i?' sel':'';
        const cont=c==='vacio'?(SOLO()?'':'+'):t.split('\n').map(s=>`<span>${esc(s)}</span>`).join('');
        return SOLO()?`<td><div class="hz-cel ${c}" style="cursor:default">${cont}</div></td>`:`<td><button class="hz-cel ${c}${sel}" data-e="${esc(e.n)}" data-i="${i}" aria-label="${esc(e.n)}, ${DL[i]}">${cont}</button></td>`}).join('')}<td class="h ${tot>MAX_H?'alta':''}">${tot?fmtH(tot):'–'}</td></tr>`})});
  h+=`<tr class="cob"><td class="nom">Cobertura</td>${[0,1,2,3,4,5,6].map(i=>{const c=cobertura(k,i);return`<td><span class="hz-cobp ${vacia?'':c>=MIN_COB?'ok':c===2?'warn':'bad'}">${vacia?'–':c}</span></td>`}).join('')}<td></td></tr></tbody></table></div>`;
  const movil=window.matchMedia&&window.matchMedia('(max-width:700px)').matches,ed=editorHtml(k);
  h+=vDias(k,eq,vacia,movil?ed:'');
  if(!movil)h+=ed;
  if(!vacia)h+=vCobHoras(k);
  return h+(SOLO()?'':waPanel(k)+panelGenerar())}

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
/* ---- Todo el año de un vistazo: quién está de vacaciones cada día y dónde coinciden ----
   Una fila por mes y una casilla por día; el color es cuántas personas están fuera ese día (1 azul, 2 amarillo, 3 o más rojo).
   Las bajas maternales no cuentan (duran todo el año y taparían el resto). Tocar un día muestra quién está fuera. */
let diaSel='';
function vAnioVac(y){
  const eqN=new Set(H().equipo.filter(e=>(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y)).map(e=>e.n));
  const fuera={},ini=y+'-01-01',fin=y+'-12-31';
  H().vac.filter(v=>v.t!=='maternal'&&eqN.has(v.e)&&v.f>=ini&&v.i<=fin).forEach(v=>{
    for(let d=fd(v.i<ini?ini:v.i),f=fd(v.f>fin?fin:v.f);d<=f;d=sumar(d,1)){const k=iso(d);(fuera[k]=fuera[k]||[]);if(!fuera[k].includes(v.e))fuera[k].push(v.e)}});
  const hoyK=iso(new Date()),nom=k=>k?(fuera[k]||[]):[];
  const cab=`<div class="hz-an-fila hz-an-cab" aria-hidden="true"><b></b><div class="hz-an-dias">${Array.from({length:31},(_,j)=>`<i>${[1,5,10,15,20,25,30].includes(j+1)?j+1:''}</i>`).join('')}</div></div>`;
  const meses=Array.from({length:12},(_,m)=>{
    const nd=new Date(y,m+1,0).getDate();
    const cel=Array.from({length:31},(_,j)=>{
      if(j>=nd)return '<span class="hz-an-no"></span>';
      const k=y+'-'+String(m+1).padStart(2,'0')+'-'+String(j+1).padStart(2,'0'),n=nom(k);
      return `<button type="button" class="hz-an-c n${Math.min(n.length,3)}${k===hoyK?' hoy':''}${k===diaSel?' sel':''}" data-vd="${k}" aria-label="${j+1} ${MES[m]}: ${n.length?esc(n.join(', ')):'nadie fuera'}" title="${n.length?esc(n.join(', ')):'nadie fuera'}"></button>`}).join('');
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
  const sel=diaSel&&diaSel.slice(0,4)==y?`<div class="hz-an-sel"><b>${fe(diaSel)}:</b> ${nom(diaSel).length?nom(diaSel).map(esc).join(', ')+' (fuera)':'nadie fuera'}</div>`:'';
  return `<div class="card hz-an"><b>Todo el año: quién está fuera cada día</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">Cada casilla es un día. Toca una para ver quién está fuera.</p>
    ${cab}${meses}<div class="hz-an-ley"><span class="hz-an-c n1"></span>1 <span class="hz-an-c n2"></span>2 <span class="hz-an-c n3"></span>3 o más <small>personas fuera (sin bajas maternales)</small></div>${sel}
    <div class="hz-an-res"><div><b>${conAlguien}</b><small>días con alguien fuera</small></div><div><b>${sinNadie}</b><small>días sin nadie fuera</small></div><div><b>${conChoque}</b><small>días con coincidencia${maximo>=2?` (hasta ${maximo} a la vez, el ${fe(diaMax)})`:''}</small></div></div>
    <div class="hz-an-lista"><b>Dónde coinciden</b>${lista}</div>
    ${quien?`<div class="hz-an-lista"><b>Quién coincide con quién</b><p style="font-size:12px;color:var(--text-secondary);margin:2px 0 6px">Toca un nombre para ver con quién y qué días.</p>${quien}</div>`:''}
    <div class="hz-an-lista"><b>Fechas sin nadie fuera</b><p style="font-size:12px;color:var(--text-secondary);margin:2px 0 6px">Huecos del año en los que nadie tiene vacaciones (en azul oscuro los de 14 días o más: los mejores para repartir).</p>${libres}</div></div>`}
function vVac(){
  const y=anio,eqY=H().equipo.filter(e=>(!e.desde||e.desde.slice(0,4)<=y)&&(!e.hasta||e.hasta.slice(0,4)>=y));
  let h=`<div class="hz-bar"><button class="btn-sec" data-a="aant" aria-label="Año anterior">←</button><div class="hz-sem">${y}</div><button class="btn-sec" data-a="asig" aria-label="Año siguiente">→</button></div>`;
  if(msg)h+=`<div class="hz-aviso warn">${msg}</div>`;
  h+=vAnioVac(y);
  h+=`<div class="hz-cols">`;
  eqY.forEach(e=>{const ps=H().vac.filter(v=>v.e===e.n&&v.i.slice(0,4)<=y&&v.f.slice(0,4)>=y);
    const usados=ps.filter(v=>v.t!=='maternal').reduce((s,v)=>s+diasEn(v.i,v.f,y),0),res=VAC_ANUAL-usados,mat=ps.some(v=>v.t==='maternal');
    const col=res>10?'#5dcaa5':res>=5?'#ef9f27':'#e24b4a';
    const meses=Array.from({length:12},(_,m)=>{const a=new Date(y,m,1),b=new Date(y,m+1,0);const p=ps.find(v=>fd(v.i)<=b&&fd(v.f)>=a);return`<span class="${p?({verano:'v',invierno:'i',extra:'x',maternal:'m'}[p.t]):''}" title="${MES[m]}"></span>`}).join('');
    h+=`<div class="card"><div class="hz-fila" style="border:0;padding:0"><b>${esc(e.n)}</b><small>${mat&&!usados?'Baja':`${res} de ${VAC_ANUAL} días`}</small></div>${mat&&!usados?'':`<div class="hz-saldo"><i style="width:${Math.max(0,Math.min(100,usados/VAC_ANUAL*100))}%;background:${col}"></i></div>`}<div class="hz-meses">${meses}</div>
    ${ps.map(v=>`<div class="hz-fila"><span><small>${esc(v.t)} · ${corto(fd(v.i))} – ${corto(fd(v.f))}${v.n?' · '+esc(v.n):''}</small></span><span style="display:flex;gap:6px;align-items:center"><small>${diasEn(v.i,v.f,y)} d</small><button class="btn-sec hz-sm" data-vdel="${H().vac.indexOf(v)}">Quitar</button></span></div>`).join('')}</div>`});
  h+=`</div><form class="card" id="hz-f-vac"><b>Añadir periodo</b> <small style="color:var(--text-secondary)">(rellena el horario con VACACIONES y avisa si baja la cobertura)</small><div class="hz-form"><label>Empleado<select id="hz-ve">${H().equipo.filter(activo).map(e=>`<option>${esc(e.n)}</option>`).join('')}</select></label><label>Tipo<select id="hz-vt"><option value="verano">verano</option><option value="invierno">invierno</option><option value="extra">extra</option><option value="maternal">maternal</option></select></label><label>Desde<input type="date" id="hz-vi" required></label><label>Hasta<input type="date" id="hz-vf" required></label><label>Nota<input id="hz-vn"></label></div><button class="btn btn-p" type="submit">Añadir</button></form>`;
  return h}

const activo=e=>!e.hasta||e.hasta>=iso(new Date());
function vEquipo(){
  const op=g=>GRUPOS.map((n,i)=>`<option value="${i}"${i===g?' selected':''}>${n}</option>`).join('');
  let h=(msg?`<div class="hz-aviso warn">${msg}</div>`:'')+`<div class="card"><b>Equipo</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">Pon la fecha «hasta» a quien se va y «desde» a quien entra: cada uno conserva su historial y solo aparece en las semanas que le corresponden.</p>`;
  h+=H().equipo.map((e,i)=>({e,i})).filter(x=>activo(x.e)).map(({e,i})=>`<div class="hz-eq"><b>${esc(e.n)}</b><input data-eq="${i}" data-f="rol" value="${esc(e.rol)}" aria-label="Puesto"><input data-eq="${i}" data-f="tel" type="tel" inputmode="tel" value="${esc(e.tel||'')}" placeholder="Móvil (WhatsApp)" aria-label="Móvil para WhatsApp"><select data-eq="${i}" data-f="g" aria-label="Grupo">${op(e.g)}</select><label>Desde<input type="date" data-eq="${i}" data-f="desde" value="${e.desde||''}"></label><label>Hasta<input type="date" data-eq="${i}" data-f="hasta" value="${e.hasta||''}"></label></div>`).join('');
  const baja=H().equipo.map((e,i)=>({e,i})).filter(x=>!activo(x.e));
  if(baja.length)h+=`<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;color:var(--text-secondary)">Ya no están (${baja.length}) · se conserva su historial</summary>`+baja.map(({e,i})=>`<div class="hz-eq"><b>${esc(e.n)}</b><input data-eq="${i}" data-f="rol" value="${esc(e.rol)}" aria-label="Puesto"><select data-eq="${i}" data-f="g" aria-label="Grupo">${op(e.g)}</select><label>Desde<input type="date" data-eq="${i}" data-f="desde" value="${e.desde||''}"></label><label>Hasta<input type="date" data-eq="${i}" data-f="hasta" value="${e.hasta||''}"></label></div>`).join('')+`</details>`;
  h+=`</div><form class="card" id="hz-f-eq"><b>Añadir persona</b><div class="hz-form"><label>Nombre<input id="hz-en" required></label><label>Puesto<input id="hz-er" required></label><label>Grupo<select id="hz-eg">${op(3)}</select></label><label>Desde<input type="date" id="hz-ed"></label></div><button class="btn btn-p" type="submit">Añadir</button></form>`;
  return h}


/* ---- eventos y necesidad de gente ---- */
function factorEv(ev){
  try{ if(typeof getFactorEvento==='function') return getFactorEvento(ev) }catch(e){}
  if(ev.factor_custom>0) return Number(ev.factor_custom);
  const t=(typeof tiposServicio!=='undefined'&&tiposServicio?tiposServicio:[]).find(x=>x.id===ev.tipo);return (t&&t.factor)||1}
function vEventos(){
  const hoy=new Date(),a=iso(hoy),b=iso(sumar(hoy,21));
  const evs=(typeof eventos!=='undefined'?eventos:[]).filter(e=>e.fecha>=a&&e.fecha<=b).sort((x,y)=>(x.fecha+(x.hora||'')).localeCompare(y.fecha+(y.hora||'')));
  if(!evs.length)return`<div class="hz-vacio">No hay eventos en los próximos 21 días.</div>`;
  const rp=(typeof ajustes!=='undefined'&&ajustes&&Number(ajustes.raciones_por_persona))||80;
  const dias={};evs.forEach(e=>(dias[e.fecha]=dias[e.fecha]||[]).push(e));
  let h=`<p style="font-size:12px;color:var(--text-secondary);margin:0 0 10px">Próximos 21 días. Referencia: una persona de cocina cubre ${rp} raciones; mínimo ${MIN_COB} personas.</p>`;
  Object.keys(dias).forEach(f=>{
    const lista=dias[f],d=fd(f),rac=lista.reduce((s,e)=>s+Math.round((Number(e.pax)||0)*factorEv(e)),0),nec=Math.max(MIN_COB,Math.ceil(rac/rp));
    const z=window.hzDia(f),coc=z?z.gente.filter(p=>p.g<=3):null,falta=coc?Math.max(0,nec-coc.length):null;
    const cls=!z?'b-info':falta>0?'b-danger':'b-success';
    const txt=!z?'Horario de esa semana sin cargar':falta>0?`Faltan ${falta}: hay ${coc.length}, hacen falta ${nec}`:`Cubierto: ${coc.length} en cocina (hacen falta ${nec})`;
    h+=`<div class="card"><div class="hz-fila" style="border:0;padding:0 0 6px"><b>${cap(DL[(d.getDay()+6)%7])} ${d.getDate()} ${MES[d.getMonth()]}</b><span class="badge ${cls}">${txt}</span></div>
    <small style="color:var(--text-secondary)">${lista.length} evento${lista.length===1?'':'s'} · ${rac} raciones${coc&&coc.length?' · Cocina: '+coc.map(p=>esc(p.n)).join(', '):''}</small>
    ${lista.map(e=>`<div class="hz-fila" style="flex-wrap:wrap;align-items:flex-start"><span><b>${esc(e.hora||'')} ${esc(e.nombre)}</b><br><small>${Number(e.pax)||0} pax${e.lugar?' · '+esc(e.lugar):''}</small></span><span>${window.htmlHorarioEvento(e)}</span></div>`).join('')}</div>`});
  return h}

/* ---- generador automático de semanas ---- */
const MENU_BASE=['08:00-16:00','14:30-22:30','16:00-00:00','12:00-16:00\n20:00-00:00'];
function menuDe(e){
  if(e.n==='David')return{t:['06:00-14:00']};
  if(e.n==='John')return{t:['06:30-14:30','16:00-00:00','12:00-16:00\n20:00-00:00'],pref:'06:30-14:30'};
  if(e.g===0)return{t:['08:00-16:00','14:30-22:30','16:00-00:00']};
  if(e.g>=3)return{t:['12:00-16:00\n20:00-00:00','16:00-00:00','08:00-16:00']};
  return{t:MENU_BASE,noDes:e.n==='Fabián'};
}
const finDe=tr=>tr.length?Math.max(...tr.map(x=>x[1])):null;
const iniDe=tr=>tr.length?Math.min(...tr.map(x=>x[0])):null;
const solapa=(tr,a,b)=>tr.reduce((s,[i,f])=>s+Math.max(0,Math.min(f,b)-Math.max(i,a)),0);
const cubre=(tr,h)=>tr.some(([i,f])=>(h>=i&&h<f)||(h+24>=i&&h+24<f));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function forzado(e,fechaIso){
  const v=H().vac.find(x=>x.e===e.n&&x.i<=fechaIso&&x.f>=fechaIso);
  return v?(v.t==='maternal'?'BAJA MATERNAL':'VACACIONES'):null}
function candidatos(e,forz,finPrev,R){
  const menu=menuDe(e),F=[0,1,2,3,4,5,6].filter(d=>!forz[d]),out=[];
  const pares=[];for(let d=0;d<6;d++)if(!forz[d]&&!forz[d+1])pares.push([d,d+1]);
  let opciones;
  if(F.length<=2)opciones=[F];else if(pares.length&&F.length>=3)opciones=pares;else opciones=[[]];
  opciones.forEach(libres=>{
    const trab=F.filter(d=>!libres.includes(d));
    const sh=Array(7).fill(null);
    const dfs=(ix)=>{
      if(ix===trab.length){
        const t=Array(7).fill('');for(let d=0;d<7;d++)t[d]=forz[d]||(libres.includes(d)||!trab.includes(d)?'LIBRE':sh[d]);
        out.push({t,tr:t.map(tramos),libre:t.map(x=>x==='LIBRE'),des:t.map(x=>x&&x!=='LIBRE'&&tramos(x).length&&iniDe(tramos(x))<=7)});return}
      const d=trab[ix];
      for(const x of menu.t){
        const tr=tramos(x);
        if(menu.noDes&&iniDe(tr)<=7&&!R.sinDesayuno[d])continue;
        const prev=d===0?finPrev:(sh[d-1]&&trab.includes(d-1)?finDe(tramos(sh[d-1])):null);
        if(prev!=null&&iniDe(tr)+24-prev<MIN_DESC)continue;
        sh[d]=x;dfs(ix+1);sh[d]=null}
    };
    dfs(0)});
  return out}
function penal(sol,pers,R){
  let p=0;
  for(let d=0;d<7;d++){
    let cov=0,lib=0,mediodia=false,noche=false,desayuno=false;
    sol.forEach((c,i)=>{const tr=c.tr[d];if(tr.length){cov++;if(pers[i].g<=1){if(solapa(tr,12,16)>=3)mediodia=true;if(solapa(tr,20,24)>=3)noche=true}if(iniDe(tr)<=7)desayuno=true}if(c.libre[d])lib++});
    if(cov<MIN_COB)p+=100*(MIN_COB-cov);
    if(d>=5&&lib>1)p+=100*(lib-1);
    if(lib>2)p+=10*(lib-2);
    if(!mediodia)p+=80;if(!noche)p+=80;if(!desayuno&&R.hayDesayuno[d])p+=80;
    R.ev[d].forEach(ev=>{const pres=sol.filter((c,i)=>pers[i].g<=3&&cubre(c.tr[d],ev.h)).length;if(pres<ev.nec)p+=60*(ev.nec-pres)});
  }
  sol.forEach((c,i)=>{
    const tipos=new Set(c.t.filter(x=>x&&x!=='LIBRE'&&!/VACACIONES|BAJA/.test(x)));if(tipos.size>2)p+=tipos.size-2;
    const m=menuDe(pers[i]);if(m.pref)p+=2*c.t.filter(x=>x&&x!=='LIBRE'&&!/VACACIONES|BAJA/.test(x)&&x!==m.pref).length;
    if((c.libre[5]||c.libre[6])&&R.finde[i])p+=4});
  return p}
function generarSemana(k,seed){
  const pers=equipoSem(k),lun=fd(k),prevK=iso(sumar(lun,-7)),prev=H().semanas[prevK]||{};
  const rp=(typeof ajustes!=='undefined'&&ajustes&&Number(ajustes.raciones_por_persona))||80;
  const R={sinDesayuno:[],hayDesayuno:[],ev:[],finde:[]};
  const forz=pers.map(e=>[0,1,2,3,4,5,6].map(d=>forzado(e,iso(sumar(lun,d)))));
  const evs=(typeof eventos!=='undefined'?eventos:[]);
  for(let d=0;d<7;d++){
    const f=iso(sumar(lun,d));
    const dsf=pers.filter((e,i)=>menuDe(e).t.some(x=>tramos(x).length&&iniDe(tramos(x))<=7)&&!menuDe(e).noDes&&!forz[i][d]);
    R.hayDesayuno[d]=dsf.length>0;
    R.sinDesayuno[d]=!dsf.length; // Fabián solo hace desayuno si David y John no pueden
    const dia=evs.filter(e=>e.fecha===f),rac=dia.reduce((x,e)=>x+Math.round((Number(e.pax)||0)*factorEv(e)),0),nec=Math.max(2,Math.ceil(rac/rp));
    R.ev[d]=dia.filter(e=>e.hora).map(e=>({h:pHM(e.hora),nec}));
  }
  const finPrev=pers.map(e=>{const t=tramos((prev[e.n]||[])[6]);return finDe(t)});
  R.finde=pers.map(e=>{const a=prev[e.n]||[];return tipo(a[5])==='libre'||tipo(a[6])==='libre'});
  // los desayunos dependen de cada persona: R.sinDesayuno se usa por día
  const cands=pers.map((e,i)=>{let c=candidatos(e,forz[i],finPrev[i],R);const r=rng(seed+i*7919);if(c.length>2500){c=c.map(x=>[r(),x]).sort((a,b)=>a[0]-b[0]).slice(0,2500).map(x=>x[1])}return c});
  if(cands.some(c=>!c.length))return{pers,sol:null,pen:Infinity};
  const r=rng(seed);let best=null;
  for(let rs=0;rs<14&&!(best&&best.pen===0);rs++){
    const cur=cands.map(c=>c[r()*c.length|0]);let pen=penal(cur,pers,R);
    for(let it=0;it<2500&&pen>0;it++){const i=r()*pers.length|0,old=cur[i];cur[i]=cands[i][r()*cands[i].length|0];const p2=penal(cur,pers,R);if(p2<=pen||r()<0.005)pen=p2;else cur[i]=old;
      if(!best||pen<best.pen)best={pen,sol:cur.slice()}}
    if(!best||pen<best.pen)best={pen,sol:cur.slice()}}
  return{pers,sol:best.sol,pen:best.pen}}
/* ---- Contador de horas ---- */
let mesH=new Date(new Date().getFullYear(),new Date().getMonth(),1);
function horasMes(ym){ // ym 'YYYY-MM': semanas cuyo lunes cae en el mes y tienen turnos
  const res={};
  Object.keys(H().semanas).filter(k=>k.slice(0,7)===ym&&!sinTurnos(k)).sort().forEach(k=>{
    equipoSem(k).forEach(e=>{const a=fila(k,e.n);if(a.every(x=>!x))return;
      const h=a.reduce((x,t)=>x+horas(t),0),aus=a.filter(t=>{const u=(t||'').toUpperCase();return u.includes('VACACIONES')||u.includes('BAJA')}).length;
      const esp=Math.max(0,MAX_H-Math.min(5,aus)*8),r=res[e.n]||(res[e.n]={h:0,esp:0,sem:[]});
      r.h+=h;r.esp+=esp;r.sem.push({k,h,esp})})});
  return res}
function vHoras(){
  const ym=mesH.getFullYear()+'-'+String(mesH.getMonth()+1).padStart(2,'0'),R=horasMes(ym);
  const nom=Object.keys(R).filter(n=>R[n].h||R[n].esp).sort((a,b)=>(R[b].h-R[b].esp)-(R[a].h-R[a].esp));
  const bar=`<div class="hz-bar"><button class="btn-sec" data-a="mesant" aria-label="Mes anterior">←</button><div class="hz-sem">${cap(mesH.toLocaleDateString('es-ES',{month:'long',year:'numeric'}))}</div><button class="btn-sec" data-a="messig" aria-label="Mes siguiente">→</button></div>`;
  if(!nom.length)return bar+'<div class="card hz-vacio">No hay semanas con turnos en este mes.</div>';
  const yoN=SOLO()?yo():'';
  const fila_=n=>{const r=R[n],d=r.h-r.esp,c=d>0.05?'alta':'';
    return`<tr${n===yoN?' style="font-weight:700"':''}><td class="n">${esc(n)}</td><td>${fmtH(r.h)}</td><td>${fmtH(r.esp)}</td><td class="h ${c}">${d>0?'+':''}${fmtH(d)}</td></tr>`};
  const lista=SOLO()?(yoN&&R[yoN]?[yoN]:[]):nom;
  return bar+`<div class="card"><div class="hz-tabla"><table class="hz-t"><thead><tr><th>Persona</th><th>Hechas</th><th>Debidas</th><th>Saldo</th></tr></thead><tbody>${lista.map(fila_).join('')}</tbody></table></div><p style="font-size:12px;color:var(--text-secondary);margin:10px 0 0">Debidas = ${MAX_H} h por semana con turnos, menos 8 h por cada día de vacaciones o baja. Saldo positivo = horas a devolver en descanso o pagar. Cuenta las semanas que empiezan en este mes.</p></div>`}

/* ---- Cambios de turno ---- */
const CH=()=>window.HZ_CAMB;
let cf={dia:'',con:'',de:''},cmsg='';
const ESTADO={pendiente:['Espera respuesta','libre'],aceptado:['Espera tu OK','extra'],aprobado:['Aprobado','trab'],rechazado:['Rechazado','vac']};
function diasCambio(){const o=[],hoy=new Date();for(let i=1;i<15;i++){const d=sumar(new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()),i),k=iso(lunes(d));if(sinTurnos(k))continue;o.push({v:k+'|'+((d.getDay()+6)%7),d,k,i:(d.getDay()+6)%7})}return o}
function vCambios(){
  const me=SOLO()?yo():(cf.de||yo()),lista=CH().lista();
  let h=cmsg?`<div class="hz-aviso warn">${cmsg}</div>`:'';
  if(SOLO()&&!me)return h+`<div class="card hz-vacio">Primero elige quién eres en <b>Mi semana</b>.</div>`;
  const dias=diasCambio(),sel=dias.find(x=>x.v===cf.dia);
  let con=[];
  if(sel&&me){const mio=fila(sel.k,me)[sel.i]||'';con=equipoSem(sel.k).filter(e=>e.n!==me).map(e=>({n:e.n,t:fila(sel.k,e.n)[sel.i]||''})).filter(x=>x.t&&x.t!==mio&&!/VACACIONES|BAJA/i.test(x.t))}
  const mioT=sel&&me?(fila(sel.k,me)[sel.i]||''):'';
  h+=`<div class="card"><b>Pedir un cambio de turno</b><div style="display:grid;gap:8px;margin-top:10px">`+
    (SOLO()?'':`<label>Quién<select data-cf="de"><option value="">—</option>${equipoSem(iso(lunes(new Date()))).map(e=>`<option ${e.n===me?'selected':''}>${esc(e.n)}</option>`).join('')}</select></label>`)+
    `<label>Día<select data-cf="dia"><option value="">Elige el día</option>${dias.map(x=>`<option value="${x.v}" ${x.v===cf.dia?'selected':''}>${DIAS[x.i]} ${x.d.getDate()} ${MES[x.d.getMonth()]}${me&&fila(x.k,me)[x.i]?' · '+esc(fila(x.k,me)[x.i].replace('\n',' + ')):''}</option>`).join('')}</select></label>`+
    (sel&&me?`<label>Cambiar con<select data-cf="con"><option value="">Elige compañero</option>${con.map(x=>`<option value="${esc(x.n)}" ${x.n===cf.con?'selected':''}>${esc(x.n)} · ${esc(x.t.replace('\n',' + '))}</option>`).join('')}</select></label>`:'')+
    `<button class="btn btn-p" data-a="cpedir" ${sel&&me&&cf.con?'':'disabled'}>Pedir cambio</button></div>${sel&&me&&cf.con?`<p style="font-size:12px;color:var(--text-secondary);margin:8px 0 0">${esc(me)} hace ${esc((con.find(x=>x.n===cf.con)||{t:''}).t.replace('\n',' + '))} y ${esc(cf.con)} hace ${esc(mioT.replace('\n',' + ')||'libre')}.</p>`:''}</div>`;
  const vis=lista.filter(c=>SOLO()?(c.de===me||c.a===me||c.estado==='aprobado'):true).slice(0,30);
  h+=`<div class="card"><b>Solicitudes</b>${vis.length?vis.map(c=>{
    const d=sumar(fd(c.semana),c.dia),[et,cl]=ESTADO[c.estado]||[c.estado,'libre'];let ac='';
    if(c.estado==='pendiente'&&c.a===me)ac=`<button class="btn btn-p hz-sm" data-cc="${c.id}" data-a="cacepta">Aceptar</button><button class="btn-sec hz-sm" data-cc="${c.id}" data-a="crechaza">Rechazar</button>`;
    else if(c.estado==='pendiente'&&c.de===me)ac=`<button class="btn-sec hz-sm" data-cc="${c.id}" data-a="crechaza">Cancelar</button>`;
    if(!SOLO()){if(c.estado==='aceptado')ac=`<button class="btn btn-p hz-sm" data-cc="${c.id}" data-a="caprueba">Aprobar</button><button class="btn-sec hz-sm" data-cc="${c.id}" data-a="crechaza">Rechazar</button>`;else if(c.estado==='pendiente')ac+=`<button class="btn-sec hz-sm" data-cc="${c.id}" data-a="crechaza">Rechazar</button>`}
    return`<div class="hz-fila" style="align-items:flex-start;flex-wrap:wrap"><span><b>${DIAS[(d.getDay()+6)%7]} ${d.getDate()} ${MES[d.getMonth()]}</b> · ${esc(c.de)} ⇄ ${esc(c.a)}<br><small>${esc(c.de)} pasa de ${esc((c.turno_de||'libre').replace('\n',' + '))} a ${esc((c.turno_a||'libre').replace('\n',' + '))}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="hz-pill ${cl}">${et}</span>${ac}</span></div>`}).join(''):'<div class="hz-vacio">No hay solicitudes.</div>'}</div>`;
  return h}
async function aprobarCambio(c){
  const a=fila(c.semana,c.de),b=fila(c.semana,c.a);
  if((a[c.dia]||'')!==(c.turno_de||'')||(b[c.dia]||'')!==(c.turno_a||'')){cmsg='El horario cambió desde que se pidió. Rechaza la solicitud y que la pidan de nuevo.';return}
  a[c.dia]=c.turno_a;b[c.dia]=c.turno_de;guardar(c.semana);
  await CH().estado(c.id,'aprobado');
  const av=avisos(c.semana).filter(x=>x.includes(c.de)||x.includes(c.a));
  cmsg=av.length?`Aplicado al horario. Ojo: ${av.join('; ')}`:'Aplicado al horario.'}

/* ---- Mi semana ---- */
// Tarjeta grande con lo siguiente que le toca a esa persona (hoy si aún no ha acabado, o el próximo día con turno, hasta 14 días)
function proximoTurno(me){
  const ahora=new Date(),hr=ahora.getHours()+ahora.getMinutes()/60;
  for(let n=0;n<14;n++){
    const d=sumar(new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()),n),k=iso(lunes(d)),i=(d.getDay()+6)%7;
    if(sinTurnos(k))continue;
    const t=((H().semanas[k]||{})[me]||[])[i]||'',tr=tramos(t);
    if(!tr.length)continue;
    if(n===0&&!tr.some(([,f])=>f>hr))continue; // el turno de hoy ya acabó
    const ini=Math.min(...tr.map(x=>x[0])),dentro=n===0&&tr.some(([a,f])=>hr>=a&&hr<f);
    const cuando=n===0?'Hoy':n===1?'Mañana':cap(DL[i])+' '+d.getDate();
    const sub=n===0?(dentro?'En turno ahora':'Entras en '+fmtH(ini-hr)+' h'):cap(DL[i])+' '+d.getDate()+' '+MES[d.getMonth()];
    const jefe=(H().equipo.find(e=>e.n===me)||{}).g===0;
    return `<div class="hz-prox${n===0?' hoy':''}"><small>Tu próximo turno</small><b>${cuando}</b><div class="hz-dt ${jefe?'jefe':'trab'}">${t.split('\n').map(z=>`<span>${esc(z)}</span>`).join('')}</div><small>${sub}</small></div>`}
  return `<div class="hz-prox"><small>Tu próximo turno</small><b>Sin turnos en los próximos 14 días</b></div>`}
function yo(){try{return localStorage.getItem('hz_yo')||''}catch(e){return''}}
function vMi(){
  const hoy=new Date(),k0=iso(lunes(hoy)),k1=iso(sumar(lunes(hoy),7)),me=yo();
  const activos=equipoSem(k0).filter(e=>e.g<5||true);
  if(!me||!H().equipo.some(e=>e.n===me))
    return `<div class="card"><b>¿Quién eres?</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 10px">Se guarda en este móvil; después verás directamente tu semana.</p><div class="hz-chips">${activos.map(e=>`<button class="btn-sec" data-yo="${esc(e.n)}">${esc(e.n)}</button>`).join('')}</div></div>`;
  const sem=(k,tit)=>{
    if(sinTurnos(k))return`<div class="card"><b>${tit}</b><div class="hz-vacio">Todavía no hay horario cargado.</div></div>`;
    const a=fila(k,me),hoyI=iso(hoy);let tot=0;
    const filas=a.map((t,i)=>{const d=sumar(fd(k),i),h=horas(t);tot+=h;const c=tipo(t),esHoy=iso(d)===hoyI;
      return`<div class="hz-fila" style="${esHoy?'background:var(--bg-tertiary);margin:0 -8px;padding:8px;border-radius:8px':''}"><span><b>${DIAS[i]} ${d.getDate()}</b> <small>${MES[d.getMonth()]}${esHoy?' · hoy':''}</small></span><span class="hz-pill ${c==='trab'?'trab':c==='vacio'?'libre':c}" style="white-space:pre-line;text-align:right">${esc(t?t.replace('\n',' + '):'—')}${h?` · ${fmtH(h)} h`:''}</span></div>`}).join('');
    return`<div class="card"><div class="hz-fila" style="border:0;padding:0 0 4px"><b>${tit}</b><small>${fmtH(tot)} h</small></div>${filas}</div>`};
  return `<div class="hz-bar" style="justify-content:space-between"><b style="font-size:16px">${esc(me)}</b><button class="btn-sec hz-sm" data-yo="">No soy yo</button></div>`+proximoTurno(me)+sem(k0,'Esta semana · '+corto(fd(k0))+' – '+corto(sumar(fd(k0),6)))+sem(k1,'Semana siguiente · '+corto(fd(k1))+' – '+corto(sumar(fd(k1),6)))}

/* ---- Texto para WhatsApp ---- */
const DC=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function corta(t){if(!t)return'–';const u=t.toUpperCase();if(u.includes('RECUPERA'))return'libre (recup.)';if(u.includes('LIBRE'))return'libre';if(u.includes('VACACIONES'))return'vacaciones';if(u.includes('BAJA'))return'baja';return t.split('\n').map(x=>x.replace(/:00/g,'')).join(' + ')}
function textoSemana(k){
  const f=sumar(fd(k),6);
  let o=`*Horario de cocina · ${corto(fd(k))} – ${corto(f)}*\n`;
  equipoSem(k).forEach(e=>{const a=fila(k,e.n);if(a.every(x=>!x))return;o+=`\n*${e.n}*: `+a.map((t,i)=>`${DC[i]} ${corta(t)}`).join(' · ')});
  return o}
let waAbierto=false;
// Texto personal (solo los turnos de esa persona) y enlace de WhatsApp a su móvil; si no hay móvil, WhatsApp deja elegir el contacto
function textoPersona(k,e){
  const a=fila(k,e.n),tot=a.reduce((x,t)=>x+horas(t),0);
  let o=`Hola ${e.n}, este es tu horario de cocina de la semana del ${corto(fd(k))} al ${corto(sumar(fd(k),6))}:\n`;
  a.forEach((t,i)=>{o+=`\n*${DC[i]} ${sumar(fd(k),i).getDate()}*: ${corta(t)}`});
  if(tot)o+=`\n\nTotal: ${fmtH(tot)} h`;
  return o+'\n\nSi algo no te encaja, avísame.'}
const hashT=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return h};
function waLink(tel,txt){let d=String(tel||'').replace(/[^\d]/g,'');if(d.length===9&&/^[679]/.test(d))d='34'+d;return 'https://wa.me/'+d+'?text='+encodeURIComponent(txt)}
// Marca como enviado (con la huella del texto, para avisar si el horario cambia después). No toca las semanas, solo el registro de envíos.
function marcarEnviado(k,n,txt){
  const E=H().enviado=H().enviado||{};(E[k]=E[k]||{})[n]={ts:Date.now(),h:hashT(txt)};H().ts=Date.now();
  try{localStorage.setItem(HZ_KEY,JSON.stringify(horarios))}catch(e){} try{syncConfig(HZ_KEY,horarios)}catch(e){}}
const fHM=ts=>{const d=new Date(ts);return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
function waPanel(k){
  if(sinTurnos(k))return'';
  const env=(H().enviado||{})[k]||{};
  const filas=equipoSem(k).filter(e=>fila(k,e.n).some(t=>!['vacio','baja'].includes(tipo(t)))).map(e=>{
    const x=env[e.n],igual=x&&x.h===hashT(textoPersona(k,e));
    const est=!x?'<small>Sin enviar</small>':igual?`<small class="hz-ok">✓ Enviado ${fHM(x.ts)}</small>`:`<small class="hz-cambio">Cambió desde el envío (${fHM(x.ts)}) · reenviar</small>`;
    return `<div class="hz-fila hz-envio"><span><b>${esc(e.n)}</b>${e.tel?'':' <small>· sin móvil</small>'}<br>${est}</span><button class="btn-sec" data-a="wasend" data-n="${esc(e.n)}" aria-label="Enviar su horario a ${esc(e.n)} por WhatsApp">${x?'Reenviar':'Enviar'}</button></div>`}).join('');
  return `<div class="card"><b>Enviar el horario a cada uno por WhatsApp</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 6px">Cada persona recibe solo sus turnos. Pon su móvil en la pestaña Equipo (sin móvil, WhatsApp te deja elegir el contacto). Se abre WhatsApp con el mensaje listo: tú pulsas enviar.</p>${filas}<div class="hz-bar" style="margin:10px 0 0"><button class="btn-sec" data-a="wa">${waAbierto?'Ocultar':'Texto de todo el equipo'}</button></div>${waAbierto?`<textarea id="hz-wa" rows="10" readonly style="margin-top:10px;font-size:12px">${esc(textoSemana(k))}</textarea><div class="hz-bar" style="margin:8px 0 0"><button class="btn btn-p" data-a="wacopiar">Copiar texto</button><span id="hz-wa-msg" style="font-size:12px;color:var(--text-secondary)"></span></div>`:''}</div>`}

let ultGen=null,genMsg='';
function primeraVacia(){let d=lunes(new Date());for(let i=0;i<60;i++){if(sinTurnos(iso(d)))return iso(d);d=sumar(d,7)}return iso(lunes(new Date()))}
function generar(k0,n,seed){
  const ks=[],prevs={},res=[];
  for(let w=0;w<n;w++){
    const k=iso(sumar(fd(k0),7*w));
    if(!sinTurnos(k)){res.push(`${corto(fd(k))}: ya tenía turnos, se respeta`);continue}
    const g=generarSemana(k,seed+w*101);
    if(!g.sol){res.push(`${corto(fd(k))}: no se pudo generar (revisa vacaciones y turnos permitidos)`);continue}
    prevs[k]=hzClon(H().semanas[k]||null);ks.push(k);
    H().semanas[k]=H().semanas[k]||{};
    g.pers.forEach((e,i)=>{H().semanas[k][e.n]=g.sol[i].t.slice()});
    const av=avisos(k);
    res.push(`${corto(fd(k))}: ${av.length?av.length+' aviso'+(av.length===1?'':'s')+' ('+av.slice(0,2).map(esc).join('; ')+(av.length>2?'…':'')+')':'sin avisos'}`)}
  ultGen={ks,prevs,k0,n,seed};
  if(ks.length)guardar(ks);
  genMsg=res.join('<br>');
}
function deshacerGen(){
  if(!ultGen)return;ultGen.ks.forEach(k=>{if(ultGen.prevs[k])H().semanas[k]=ultGen.prevs[k];else delete H().semanas[k]});
  guardar(ultGen.ks);const u=ultGen;ultGen=null;genMsg='';return u}
function panelGenerar(){
  const k0=primeraVacia();
  return `<div class="card"><b>Generar semanas automáticamente</b> <small style="color:var(--text-secondary)">con las reglas, las vacaciones y los eventos de la nube</small>
  <div class="hz-form"><label>Desde (lunes)<input type="date" id="hz-g0" value="${k0}"></label><label>Semanas<select id="hz-gn">${[1,2,3,4,5,6,8].map(n=>`<option${n===4?' selected':''}>${n}</option>`).join('')}</select></label></div>
  <div class="hz-bar" style="margin:0"><button class="btn btn-p" data-a="generar">Generar</button>${ultGen&&ultGen.ks.length?`<button class="btn-sec" data-a="otra">Otra variante</button><button class="btn-sec" data-a="deshacer">Deshacer</button>`:''}</div>
  ${genMsg?`<div class="hz-aviso ${ultGen&&ultGen.ks.length?'ok':'warn'}" style="margin:10px 0 0">${genMsg}</div>`:''}
  <p style="font-size:11px;color:var(--text-secondary);margin:8px 0 0">Solo rellena semanas vacías. Reglas: 2 días libres seguidos, 40 h, 12 h de descanso, cobertura mínima 3, máximo 1 libre en sábado y domingo, jefatura o cocinero a mediodía y de noche, desayuno cubierto. Si hay un evento, refuerza ese día según las raciones.</p></div>`}

let tabIni=false;
const tabsVisibles=()=>(SOLO()?[['mi','Mi semana'],['horas','Horas'],['cambios','Cambios'],['plantilla','Cuadrante'],['ahora','Ahora']]:TABS).filter(x=>x[0]!=='cambios'||window.HZ_CAMB);
function pintar(){
  const r=root();if(!r)return;
  if(SOLO()&&!tabIni){tab='mi';tabIni=true}
  if(SOLO()&&!tabsVisibles().some(x=>x[0]===tab))tab='mi';
  const f={plantilla:vPlantilla,mi:vMi,horas:vHoras,cambios:vCambios,ahora:vAhora,eventos:vEventos,extras:()=>vPersonas('extras'),practicas:()=>vPersonas('practicas'),vacaciones:vVac,equipo:vEquipo}[tab];
  r.innerHTML=`<div class="hz-tabs" role="tablist">${tabsVisibles().map(([k,n])=>`<button role="tab" aria-selected="${k===tab}" data-t="${k}">${n}</button>`).join('')}</div>`+(window.HZ_APARTE?'':`<div style="text-align:right;margin:-6px 0 8px;font-size:12px"><a href="/horarios.html" target="_blank" rel="noopener" style="color:var(--text-secondary)">Abrir como app aparte ↗</a></div>`)+f();
}
window.initHorarios=function(){pintar()};
if(window.matchMedia)window.matchMedia("(max-width:700px)").addEventListener("change",()=>{try{if(root())pintar()}catch(e){}});

/* ---- vacaciones -> horario ---- */
const tocadas=[];
function aplicarVac(v,poner){
  const txt=v.t==='maternal'?'BAJA MATERNAL':'VACACIONES',falta=[];tocadas.length=0;
  for(let d=fd(v.i),f=fd(v.f);d<=f;d=sumar(d,1)){
    const k=iso(lunes(d)),i=(d.getDay()+6)%7,a=fila(k,v.e);if(!tocadas.includes(k))tocadas.push(k);
    if(poner)a[i]=txt;else if(/VACACIONES|BAJA/i.test(a[i]))a[i]='';
    if(poner&&!sinTurnos(k)&&cobertura(k,i)<MIN_COB)falta.push(`${DL[i]} ${d.getDate()} ${MES[d.getMonth()]} (${cobertura(k,i)})`);
  }
  return falta}

/* ---- eventos de la interfaz ---- */
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  const t=e.target.closest('[data-t]');if(t&&t.closest('.hz-tabs')){tab=t.dataset.t;edit=null;msg='';pintar();if(tab==='cambios'&&CH())CH().recargar().then(pintar);return}
  const c=e.target.closest('.hz-cel,.hz-dfila,.hz-dchip');if(c){if(SOLO()||!c.dataset.e)return;edit={k:iso(semana),e:c.dataset.e,i:+c.dataset.i};pintar();const x=document.getElementById('hz-turno');if(x)x.focus();return}
  const vd=e.target.closest('[data-vd]');if(vd){diaSel=diaSel===vd.dataset.vd?'':vd.dataset.vd;pintar();return}
  const y=e.target.closest('[data-yo]');if(y){try{localStorage.setItem('hz_yo',y.dataset.yo)}catch(er){}pintar();return}
  const q=e.target.closest('[data-q]');if(q){document.getElementById('hz-turno').value=q.dataset.q;return}
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='cpedir'){const[k,i]=cf.dia.split('|'),me=SOLO()?yo():(cf.de||yo());if(!k||!cf.con||!me)return;
    const tm=fila(k,me)[+i]||'',tc=fila(k,cf.con)[+i]||'';
    cmsg='Enviando…';pintar();
    CH().crear({semana:k,dia:+i,de:me,a:cf.con,turno_de:tm,turno_a:tc}).then(ok=>{cmsg=ok?'Solicitud enviada. Avisa a '+esc(cf.con)+' para que la acepte.':'No se pudo enviar (¿sin conexión?).';if(ok)cf={dia:'',con:'',de:cf.de};pintar()});return}
  if(a==='cacepta'||a==='crechaza'||a==='caprueba'){const id=e.target.closest('[data-cc]').dataset.cc,c=CH().lista().find(x=>x.id===id);if(!c)return;cmsg='';
    (a==='caprueba'?aprobarCambio(c):CH().estado(id,a==='cacepta'?'aceptado':'rechazado').then(ok=>{cmsg=ok?'':'No se pudo guardar (¿sin conexión?).'})).then(()=>pintar());return}
  if(a==='mesant'){mesH=new Date(mesH.getFullYear(),mesH.getMonth()-1,1);pintar();return}
  if(a==='messig'){mesH=new Date(mesH.getFullYear(),mesH.getMonth()+1,1);pintar();return}
  if(a==='ant'){semana=sumar(semana,-7);edit=null;pintar()}else if(a==='sig'){semana=sumar(semana,7);edit=null;pintar()}
  else if(a==='hoy'){semana=lunes(new Date());edit=null;pintar()}
  else if(a==='aant'){anio--;pintar()}else if(a==='asig'){anio++;pintar()}
  else if(a==='copiar'){const p=e.target.closest('[data-p]').dataset.p,k=iso(semana);
    if(!sinTurnos(k)&&!confirm('Esta semana ya tiene turnos. ¿Sustituirlos por los de la semana del '+corto(fd(p))+'?'))return;
    H().semanas[k]={};equipoSem(k).forEach(m=>{H().semanas[k][m.n]=[...fila(p,m.n)]});guardar(k);pintar()}
  else if(a==='gturno'){fila(edit.k,edit.e)[edit.i]=document.getElementById('hz-turno').value.trim();guardar(edit.k);edit=null;pintar()}
  else if(a==='bturno'){fila(edit.k,edit.e)[edit.i]='';guardar(edit.k);edit=null;pintar()}
  else if(a==='cturno'){edit=null;pintar()}
  else if(a==='wasend'){const n=e.target.closest('[data-n]').dataset.n,k=iso(semana),p=equipoSem(k).find(x=>x.n===n);if(!p)return;const txt=textoPersona(k,p);marcarEnviado(k,n,txt);window.open(waLink(p.tel,txt),'_blank','noopener');pintar()}
  else if(a==='wa'){waAbierto=!waAbierto;pintar()}
  else if(a==='wacopiar'){const ta=document.getElementById('hz-wa'),m=document.getElementById('hz-wa-msg');ta.select();
    (navigator.clipboard?navigator.clipboard.writeText(ta.value):Promise.reject()).then(()=>{m.textContent='Copiado'},()=>{try{document.execCommand('copy');m.textContent='Copiado'}catch(e){m.textContent='Selecciona el texto y cópialo'}})}
  else if(a==='generar'){const d=fd(document.getElementById('hz-g0').value||primeraVacia());generar(iso(lunes(d)),+document.getElementById('hz-gn').value,1);pintar()}
  else if(a==='otra'){const u=deshacerGen();generar(u.k0,u.n,u.seed+1);pintar()}
  else if(a==='deshacer'){deshacerGen();pintar()}
  const d=e.target.closest('[data-del]');if(d){H()[tab][iso(semana)].splice(+d.dataset.del,1);guardar(iso(semana));pintar()}
  const v=e.target.closest('[data-vdel]');if(v){const p=H().vac.splice(+v.dataset.vdel,1)[0];aplicarVac(p,false);msg='';guardar(tocadas.slice());pintar()}
});
document.addEventListener('change',e=>{
  const cfx=e.target.closest('[data-cf]');if(cfx){cf[cfx.dataset.cf]=cfx.value;if(cfx.dataset.cf!=='con')cf.con='';if(cfx.dataset.cf==='de')cf.dia='';cmsg='';pintar();return}
  const x=e.target.closest('[data-eq]');if(!x)return;
  const p=H().equipo[+x.dataset.eq],f=x.dataset.f;p[f]=f==='g'?+x.value:x.value.trim();guardar()});
document.addEventListener('submit',e=>{
  const id=e.target.id;if(!id||!id.startsWith('hz-f-'))return;e.preventDefault();const $=s=>document.getElementById(s);
  if(id==='hz-f-pers'){const t=e.target.dataset.t,k=iso(semana);(H()[t][k]=H()[t][k]||[]).push({n:$('hz-pn').value.trim(),rol:$('hz-pr').value.trim(),t:DIAS.map((_,i)=>$('hz-pt'+i).value.trim())});guardar(k);pintar()}
  else if(id==='hz-f-vac'){if($('hz-vf').value<$('hz-vi').value)return;
    const v={e:$('hz-ve').value,t:$('hz-vt').value,i:$('hz-vi').value,f:$('hz-vf').value,n:$('hz-vn').value.trim()};
    H().vac.push(v);const falta=aplicarVac(v,true);
    msg=falta.length?`<b>Cuidado:</b> con estas vacaciones la cobertura baja de ${MIN_COB} en: ${falta.slice(0,8).join(', ')}${falta.length>8?'…':''}.`:'';
    guardar(tocadas.slice());pintar()}
  else if(id==='hz-f-eq'){const n=$('hz-en').value.trim();if(H().equipo.some(p=>p.n.toLowerCase()===n.toLowerCase())){msg=`Ya hay alguien llamado ${esc(n)} en el equipo.`;pintar();return}msg='';
    H().equipo.push({n,rol:$('hz-er').value.trim(),g:+$('hz-eg').value,desde:$('hz-ed').value,hasta:''});guardar();pintar()}
});
})();
