/* Horarios de cocina para Oído Cocina.
   Datos en localStorage 'seda_horarios' y en la nube (tabla config, misma clave).
   Forma: {equipo:[{n,rol,g,desde,hasta}], semanas:{lunesISO:{nombre:[7 turnos]}}, extras:{}, practicas:{}, vac:[{e,t,i,f,n}]} */
const HZ_KEY = 'seda_horarios';
const HZ_ABR = {L:'LIBRE',V:'VACACIONES',B:'BAJA MATERNAL',P:'12:00-16:00\n20:00-00:00',a:'08:00-16:00',b:'06:30-14:30',c:'16:00-00:00',d:'14:30-22:30',e:'12:00-20:00',f:'09:00-17:00',R:'RECUPERACIÓN DÍA LIBRE TRABAJADO','-':''};
// Horarios vacíos para empezar (los datos de cada hotel están en su nube; nada de nombres de un cliente en el código)
function hzSeed(){ return {equipo:[],semanas:{},extras:{},practicas:{},vac:[]}; }
// Un periodo (vacaciones o fechas sin vacaciones) solo vale con inicio y fin AAAA-MM-DD; si no, se descarta
const hzFechasOk=o=>!!o&&typeof o==='object'&&/^\d{4}-\d{2}-\d{2}$/.test(o.i)&&/^\d{4}-\d{2}-\d{2}$/.test(o.f);
function hzNormaliza(v){
  if(!v||typeof v!=='object') return hzSeed();
  v.equipo=(Array.isArray(v.equipo)?v.equipo:hzSeed().equipo).filter(e=>e&&typeof e==='object'&&typeof e.n==='string'&&e.n);
  v.semanas=(v.semanas&&typeof v.semanas==='object')?v.semanas:{}; v.extras=v.extras||{}; v.practicas=v.practicas||{};
  v.vac=(Array.isArray(v.vac)?v.vac:[]).filter(hzFechasOk); v.bloqueos=(Array.isArray(v.bloqueos)?v.bloqueos:[]).filter(hzFechasOk); v.ts=v.ts||0; v.wts=v.wts||{};
  v.vp=Object.assign({ver:15,inv:15,fest:18,primer:15,lunes:true,vuelta:true},(v.vp&&typeof v.vp==='object')?v.vp:{});
  v.hp=Object.assign({minCob:3,maxH:40,minDesc:12,libres:2},(v.hp&&typeof v.hp==='object')?v.hp:{});
  // Un turno siempre es texto y cada persona de una semana, una lista (un dato raro no debe tumbar las pantallas)
  for(const k in v.semanas){const s=v.semanas[k];if(!s||typeof s!=='object'){delete v.semanas[k];continue}
    for(const n in s){if(!Array.isArray(s[n])){delete s[n];continue}s[n]=s[n].map(x=>typeof x==='string'?x:'')}}
  return v;
}
const hzClon=o=>JSON.parse(JSON.stringify(o));
/* Combina lo local con lo de la nube. Si se conoce cómo estaba la nube la última vez (cfgBase), se junta DATO A DATO:
   cada persona dentro de cada semana, y las listas (equipo, vacaciones, bloqueos) por elemento, respetando lo que cada lado
   borró. Sin esa referencia: gana el conjunto más reciente (ts) y, semana a semana, la semana editada más tarde (wts). */
const HZ_CLAVE={equipo:o=>o&&o.n,vac:o=>o&&[o.e,o.t,o.i,o.f].join('|'),bloqueos:o=>o&&[o.i,o.f,o.n].join('|')};
function hzListas(b,m,n,clave,pref){
  // b = cómo estaba, m = lado preferido, n = el otro. Se quita lo que cualquiera de los dos borró y se suma lo añadido.
  const kb=new Set((b||[]).map(clave)),km=new Set(m.map(clave)),kn=new Set(n.map(clave));
  const hay=Array.isArray(b);
  const res=[];const visto=new Set();
  const poner=(o,k)=>{if(visto.has(k))return;visto.add(k);res.push(o)};
  m.forEach(o=>{const k=clave(o);if(hay&&kb.has(k)&&!kn.has(k))return;poner(o,k)});
  n.forEach(o=>{const k=clave(o);if(hay&&kb.has(k)&&!km.has(k))return;poner(o,k)});
  return res}
function hzElige(l,c){
  l=hzNormaliza(hzClon(l)); if(!c) return l; c=hzNormaliza(hzClon(c));
  const base=(l.ts||0)>(c.ts||0)?l:c, otro=base===l?c:l, r=hzClon(base);
  let ref=null;try{if(typeof cfgBase==='function'){const g=cfgBase(HZ_KEY);if(g&&typeof g==='object')ref=hzNormaliza(hzClon(g))}}catch(e){}
  for(const k in otro.semanas){const tb=(base.wts||{})[k]||0,to=(otro.wts||{})[k]||0;
    if(!(k in r.semanas)){r.semanas[k]=hzClon(otro.semanas[k]);r.wts[k]=to;continue}
    if(ref&&typeof cfgMezcla==='function'&&ref.semanas[k]&&JSON.stringify(r.semanas[k])!==JSON.stringify(otro.semanas[k])){
      try{r.semanas[k]=cfgMezcla(ref.semanas[k],base.semanas[k],otro.semanas[k],[],[]);r.wts[k]=Math.max(tb,to);continue}catch(e){}}
    if(to>tb){r.semanas[k]=hzClon(otro.semanas[k]);r.wts[k]=to}}
  if(ref){
    for(const f in HZ_CLAVE)r[f]=hzListas(ref[f],base[f]||[],otro[f]||[],HZ_CLAVE[f]);
    ['extras','practicas'].forEach(f=>{if(typeof cfgMezcla==='function'){try{r[f]=cfgMezcla(ref[f],base[f],otro[f],[],[])}catch(e){}}})}
  else{r.bloqueos=Array.isArray(r.bloqueos)?r.bloqueos:[];if(!r.bloqueos.length&&Array.isArray(otro.bloqueos)&&otro.bloqueos.length)r.bloqueos=hzClon(otro.bloqueos)}
  // Lo ya enviado por WhatsApp también se junta: por persona gana el envío más reciente
  r.bloqueos=Array.isArray(r.bloqueos)?r.bloqueos:[];if(!r.bloqueos.length&&Array.isArray(otro.bloqueos)&&otro.bloqueos.length)r.bloqueos=hzClon(otro.bloqueos);
  r.enviado=r.enviado||{};for(const k in (otro.enviado||{})){r.enviado[k]=r.enviado[k]||{};for(const n in otro.enviado[k]){const a=r.enviado[k][n],b=otro.enviado[k][n];if(!a||(b.ts||0)>(a.ts||0))r.enviado[k][n]=b}}
  r.ts=Math.max(l.ts||0,c.ts||0); return r}
function hzSync(nube){
  horarios=hzElige(horarios,nube);hzParams();
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
const MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const GRUPOS=['Jefatura','Cocineros','Segunda cocina','Ayudantes','Fregantinas'];
let MIN_COB=3, MAX_H=40, MIN_DESC=12, LIBRES=2;const VAC_ANUAL=30;
// Reglas de la plantilla (Plantilla → Parámetros): se leen de horarios.hp y se vuelven a leer al sincronizar y al guardar
function hzParams(){const p=(horarios&&horarios.hp)||{};MIN_COB=+p.minCob||3;MAX_H=+p.maxH||40;MIN_DESC=+p.minDesc||12;LIBRES=+p.libres||2}
hzParams();
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
function tipo(t){if(!t)return'vacio';const u=t.toUpperCase();if(u.includes('LIBRE'))return'libre';if(u.includes('VACACIONES'))return'vac';if(u.includes('BAJA'))return u.includes('MATERNAL')?'baja':'bajan';return'trab'}
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
    const pax=(typeof eventos!=='undefined'?eventos:[]).filter(e=>e&&e.fecha===ev.fecha).reduce((s,e)=>s+(Number(e.pax)||0),0);
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
const CH=()=>window.HZ_CAMB;
// Las pantallas que viven en otros archivos (horarios-*.js) se registran en window.hzKit.vistas; si falta alguno, esa parte sale vacía
const vv=(n,...a)=>{const f=window.hzKit&&window.hzKit.vistas[n];return f?f(...a):''};
function guardar(ks){
  if(SOLO())return;
  const t=Date.now();H().ts=t;H().wts=H().wts||{};[].concat(ks||[]).forEach(k=>{H().wts[k]=t});
  try{localStorage.setItem(HZ_KEY,JSON.stringify(horarios))}catch(e){} try{syncConfig(HZ_KEY,horarios)}catch(e){}}

function avisos(k){
  const av=[],s=H().semanas[k];if(!s)return av;
  equipoSem(k).forEach(e=>{const a=s[e.n];if(!a)return;
    const h=a.reduce((x,t)=>x+horas(t),0);if(h>MAX_H)av.push(`${e.n} suma ${fmtH(h)} h (máximo ${MAX_H} h)`);
    if(LIBRES>1&&a.some(t=>tipo(t)==='trab')){let r=0,m=0;a.forEach(t=>{if(tipo(t)!=='trab'){r++;if(r>m)m=r}else r=0});if(m<LIBRES)av.push(`${e.n}: ${m?'solo '+m+' día libre seguido':'ningún día libre'} esta semana (mínimo ${LIBRES} seguidos)`)}
    for(let i=0;i<6;i++){const t1=tramos(a[i]),t2=tramos(a[i+1]);if(!t1.length||!t2.length)continue;
      const d=Math.min(...t2.map(x=>x[0]))+24-Math.max(...t1.map(x=>x[1]));if(d<MIN_DESC)av.push(`${e.n}: solo ${fmtH(d)} h de descanso entre ${DL[i]} y ${DL[i+1]}`)}});
  const kp=iso(sumar(fd(k),-7));
  if(H().semanas[kp]&&!sinTurnos(kp))equipoSem(k).forEach(e=>{const t1=tramos((H().semanas[kp][e.n]||[])[6]),t2=tramos((s[e.n]||[])[0]);if(!t1.length||!t2.length)return;
    const d=Math.min(...t2.map(x=>x[0]))+24-Math.max(...t1.map(x=>x[1]));if(d<MIN_DESC)av.push(`${e.n}: solo ${fmtH(d)} h de descanso entre el domingo anterior y el lunes`)});
  for(let i=0;i<7;i++){const c=cobertura(k,i);if(c<MIN_COB)av.push(`${cap(DL[i])}: ${c} persona${c===1?'':'s'} (mínimo ${MIN_COB})`)}
  [5,6].forEach(i=>{const l=equipoSem(k).filter(e=>tipo((s[e.n]||[])[i])==='libre').length;if(l>1)av.push(`${cap(DL[i])}: ${l} personas libres (máximo 1)`)});
  return av}

/* ---- vistas ---- */
function barraIn(){const f=sumar(semana,6);return `<div class="hz-nav"><button class="btn-sec" data-a="ant" aria-label="Semana anterior">←</button><div class="hz-sem">${corto(semana)} – ${corto(f)}</div><button class="btn-sec" data-a="sig" aria-label="Semana siguiente">→</button><button class="btn-sec hz-hoy" data-a="hoy" aria-label="Ir a esta semana">Hoy</button></div>`}
function barra(){return `<div class="hz-bar">${barraIn()}</div>`}
/* Vista de móvil: una tarjeta por día. Quien trabaja va en filas (por hora de entrada) y el resto (libre, vacaciones, baja) en chips pequeños.
   En pantallas anchas se ve la tabla de siempre; en estrechas (≤ 700 px) solo esta (CSS en horarios.css). */
const ORDEN_ESTADO={libre:1,vac:2,baja:3,bajan:3,vacio:4};
const ETQ_ESTADO={libre:'Libre',vac:'Vacaciones',baja:'Baja maternal',bajan:'Baja',vacio:'Sin turno'};
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
    <div class="hz-chips">${copias.map(([n,v])=>`<button class="btn-sec hz-sm hz-copia" data-q="${esc(v)}" title="${esc(v.replace('\n',' + '))}">${n}</button>`).join('')}${[['Libre','LIBRE'],['Vacaciones','VACACIONES'],['Baja','BAJA'],['Baja maternal','BAJA MATERNAL'],['06:30-14:30','06:30-14:30'],['08:00-16:00','08:00-16:00'],['12:00-20:00','12:00-20:00'],['14:30-22:30','14:30-22:30'],['16:00-00:00','16:00-00:00'],['Partido','12:00-16:00\n20:00-00:00']].map(([n,v])=>`<button class="btn-sec hz-sm" data-q="${esc(v)}">${n}</button>`).join('')}</div>
    <div class="hz-bar"><button class="btn btn-p" data-a="gturno">Guardar</button><button class="btn-sec" data-a="cturno">Cancelar</button><button class="btn-sec" data-a="bturno">Borrar celda</button></div></div>`}
  return ''}
let plegAbierto={};
let modoVista='dias';try{modoVista=localStorage.getItem('hz_vista')==='tabla'?'tabla':'dias'}catch(e){}
function vPlantilla(){
  const k=iso(semana),hoy=iso(new Date()),vacia=sinTurnos(k),eq=equipoSem(k);
  const prev=Object.keys(H().semanas).filter(x=>x<k&&!sinTurnos(x)).sort().pop();
  let h=`<div class="hz-bar">${barraIn()}<span style="flex:1"></span> ${prev&&!SOLO()?(vacia?`<button class="btn btn-p" data-a="copiar" data-p="${prev}">Copiar semana del ${corto(fd(prev))}</button>`:`<button class="btn-sec hz-sm" data-a="copiar" data-p="${prev}" title="Sustituye esta semana por la del ${corto(fd(prev))}">Repetir semana anterior</button>`):''}</div>`;
  if(vacia)h+=`<div class="hz-aviso warn">Esta semana no tiene turnos. Toca una celda para escribirlos${prev?' o copia la última semana con datos':(SOLO()?'':' o usa «Generar semanas automáticamente» más abajo')}.</div>`;
  else if(!SOLO()){const av=avisos(k);h+=av.length?`<div class="hz-aviso warn"><b>${av.length} aviso${av.length===1?'':'s'}</b><ul>${av.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:`<div class="hz-aviso ok">Sin avisos: cobertura, descansos y horas dentro de las reglas.</div>`}
  const movil=window.matchMedia&&window.matchMedia('(max-width:700px)').matches,dias=modoVista!=='tabla';
  h+=`<div class="hz-modo" role="group" aria-label="Cómo ver la plantilla"><button type="button" data-vista="dias" aria-pressed="${modoVista!=='tabla'}">Por días</button><button type="button" data-vista="tabla" aria-pressed="${modoVista==='tabla'}">Plantilla completa</button></div>`;
  h+=`<div class="hz-tabla hz-plan${dias?' hz-ocultar':''}${movil?' hz-compacta':''}"><table><thead><tr><th class="nom">Equipo</th>${DIAS.map((n,i)=>`<th class="${iso(sumar(semana,i))===hoy?'hoy':''}">${n}<br>${sumar(semana,i).getDate()}</th>`).join('')}<th>h/sem</th></tr></thead><tbody>`;
  GRUPOS.forEach((g,gi)=>{const m=eq.filter(e=>e.g===gi);if(!m.length)return;h+=`<tr class="grp"><td colspan="9">${g}</td></tr>`;
    m.forEach(e=>{const a=fila(k,e.n),tot=a.reduce((x,t)=>x+horas(t),0);
      h+=`<tr><td class="nom"><b>${esc(e.n)}</b><small>${esc(e.rol)}</small></td>${a.map((t,i)=>{let c=tipo(t);if(c==='trab'&&e.g===0)c='jefe';
        const sel=edit&&edit.k===k&&edit.e===e.n&&edit.i===i?' sel':'';
        const cont=c==='vacio'?(SOLO()?'':'+'):t.split('\n').map(s=>`<span>${esc(s)}</span>`).join('');
        return SOLO()?`<td><div class="hz-cel ${c}" style="cursor:default">${cont}</div></td>`:`<td><button class="hz-cel ${c}${sel}" data-e="${esc(e.n)}" data-i="${i}" aria-label="${esc(e.n)}, ${DL[i]}">${cont}</button></td>`}).join('')}<td class="h ${tot>MAX_H?'alta':''}">${tot?fmtH(tot):'–'}</td></tr>`})});
  h+=`<tr class="cob"><td class="nom">Cobertura</td>${[0,1,2,3,4,5,6].map(i=>{const c=cobertura(k,i);return`<td><span class="hz-cobp ${vacia?'':c>=MIN_COB?'ok':c===2?'warn':'bad'}">${vacia?'–':c}</span></td>`}).join('')}<td></td></tr></tbody></table></div>`;
  const ed=editorHtml(k);
  if(dias)h+=vDias(k,eq,vacia,movil?ed:'');
  if(!(dias&&movil))h+=ed;
  if(!vacia)h+=vv('cobHoras',k);
  const pleg=(id,tit,ico,cont)=>cont?`<details class="hz-pleg" data-pleg="${id}"${plegAbierto[id]?' open':''}><summary><i class="ti ${ico}" aria-hidden="true"></i> ${tit}</summary>${cont}</details>`:'';
  return h+(SOLO()?'':pleg('wa','Enviar el horario por WhatsApp','ti-brand-whatsapp',vv('waPanel',k))+pleg('gen','Generar semanas automáticamente','ti-wand',vv('panelGenerar')))}

function vAhora(){
  const n=new Date(),k=iso(lunes(n)),di=(n.getDay()+6)%7,hr=n.getHours()+n.getMinutes()/60;
  if(sinTurnos(k))return`<div class="hz-aviso warn">Sin turnos esta semana. Cárgalos en Plantilla.</div>`;
  const en=[],pr=[],fu=[];
  const todos=equipoSem(k).map(e=>({n:e.n,rol:e.rol,t:(fila(k,e.n)[di])||''}));
  (H().extras[k]||[]).forEach(p=>todos.push({n:p.n,rol:'Extra · '+p.rol,t:p.t[di]||''}));
  todos.forEach(p=>{let est='fu';for(const[i,f]of tramos(p.t)){let x=hr;if(f>24&&hr<i-12)x=hr+24;if(x>=i&&x<f){est='en';break}if(i>x&&i-x<2)est='pr'}(est==='en'?en:est==='pr'?pr:fu).push(p)});
  const lista=(a,v)=>a.length?a.map(p=>`<div class="hz-fila"><span><b>${esc(p.n)}</b><br><small>${esc(p.rol)}</small></span><span class="hz-pill ${tipo(p.t)==='trab'?'trab':tipo(p.t)}">${esc(p.t.replace('\n',' · ')||'—')}</span></div>`).join(''):`<div class="hz-vacio">${v}</div>`;
  return`<div class="hz-cols"><div class="card"><b>En turno ahora (${en.length})</b>${lista(en,'Nadie en este momento.')}</div><div class="card"><b>Entran en menos de 2 h (${pr.length})</b>${lista(pr,'Nadie entra pronto.')}</div><div class="card"><b>Fuera hoy (${fu.length})</b>${lista(fu,'Todos están en turno.')}</div></div>`}

const puestos=()=>{const u=['Cocinero','Ayudante de cocina','Fregantina'],v=new Set(u.map(x=>x.toLowerCase()));const o=[];Object.values(H().extras||{}).forEach(l=>(l||[]).forEach(p=>{const r=String((p&&p.rol)||'').trim();if(r&&!v.has(r.toLowerCase())){v.add(r.toLowerCase());o.push(r)}}));return u.concat(o)};
function vPersonas(t){
  const k=iso(semana),lista=H()[t][k]||[],ex=t==='extras';
  let h=barra()+`<div class="card"><b>${ex?'Personal extra':'Alumnos en prácticas'} de la semana</b>`;
  h+=lista.length?lista.map((p,ix)=>`<div class="hz-fila" style="flex-wrap:wrap;align-items:flex-start"><span><b>${esc(p.n)}</b><br><small>${esc(p.rol)}</small></span><span style="display:flex;gap:4px;flex-wrap:wrap">${p.t.map((x,i)=>`<span class="hz-pill ${x?'extra':'libre'}">${DIAS[i]} ${esc((x||'—').replace('\n',' · '))}</span>`).join('')}</span><button class="btn-sec hz-sm" data-del="${ix}">Quitar</button></div>`).join(''):`<div class="hz-vacio">Nadie apuntado esta semana.</div>`;
  h+=`</div><form class="card" id="hz-f-pers" data-t="${t}"><b>Añadir ${ex?'extra':'alumno'}</b><div class="hz-form"><label>Nombre<input id="hz-pn" required></label><label>${ex?'Puesto':'Centro educativo'}<input id="hz-pr" required${ex?' list="hz-puestos" autocomplete="off" placeholder="Elige o escribe"':''}></label>${ex?`<datalist id="hz-puestos">${puestos().map(p=>`<option value="${esc(p)}">`).join('')}</datalist>`:''}</div><div class="hz-dias">${DIAS.map((n,i)=>`<label>${n}<input id="hz-pt${i}" placeholder="08:00-16:00"></label>`).join('')}</div><button class="btn btn-p" type="submit">Añadir</button></form>`;
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

function vParamH(){
  const p=H().hp||{};
  return (msg?`<div class="hz-aviso ok">${msg}</div>`:'')+`<form class="card" id="hz-f-hp"><b>Parámetros del horario</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 8px">Las reglas con las que se calculan los avisos, la cobertura y el generador de semanas.</p>
    <div class="hz-form"><label>Personas mínimas en cocina cada día<input type="number" min="1" max="20" id="hz-hp-cob" value="${+p.minCob||3}"></label><label>Horas máximas por semana<input type="number" min="10" max="80" id="hz-hp-h" value="${+p.maxH||40}"></label><label>Descanso mínimo entre turnos (horas)<input type="number" min="0" max="24" id="hz-hp-desc" value="${+p.minDesc||12}"></label><label>Días libres seguidos cada semana (mínimo)<input type="number" min="1" max="3" id="hz-hp-libres" value="${+p.libres||2}"></label></div><button class="btn btn-p" type="submit">Guardar parámetros</button></form>`}

let tabIni=false;
const PRINC=()=>SOLO()?['plantilla','mi','horas','cambios']:['plantilla','mi','eventos','vacaciones'],SUBG={get plantilla(){return [['plantilla','Horario'],['equipo','Equipo'],['extras','Extras'],['practicas','Prácticas'],['parametros','Parámetros']].concat(window.HZ_CAMB?[['cambios','Cambios']]:[])},mi:[['mi','Mi semana'],['ahora','Ahora'],['horas','Horas']]},grupoDe=t=>SOLO()?null:Object.keys(SUBG).find(g=>SUBG[g].some(x=>x[0]===t))||null;let masTabs=false;
const tabsVisibles=()=>(SOLO()?[['mi','Mi semana'],['horas','Horas'],['cambios','Cambios'],['plantilla','Cuadrante'],['ahora','Ahora']]:TABS).filter(x=>x[0]!=='cambios'||window.HZ_CAMB);
function pintar(){
  const r=root();if(!r)return;
  if(SOLO()&&!tabIni){tab='mi';tabIni=true}
  if(SOLO()&&!tabsVisibles().some(x=>x[0]===tab))tab='mi';
  const f={plantilla:vPlantilla,mi:vMi,horas:vHoras,cambios:()=>vv('cambios'),ahora:vAhora,eventos:()=>vv('eventos'),extras:()=>vPersonas('extras'),practicas:()=>vPersonas('practicas'),vacaciones:()=>vv('vacaciones'),equipo:vEquipo,parametros:vParamH}[tab];
  const tv=tabsVisibles(),pri=tv.filter(x=>PRINC().includes(x[0])),res=tv.filter(x=>!PRINC().includes(x[0])&&!grupoDe(x[0])),abierto=masTabs,enRes=res.some(x=>x[0]===tab),nomRes=(res.find(x=>x[0]===tab)||[])[1],btn=([k,n])=>`<button role="tab" aria-selected="${k===tab||k===grupoDe(tab)}" data-t="${k}">${n}</button>`;
  const GR=[['Planificar',['ahora','eventos','vacaciones']]],usado=new Set(),grupos=GR.map(([t,ks])=>{const it=res.filter(x=>ks.includes(x[0]));it.forEach(x=>usado.add(x[0]));return it.length?`<div class="hz-gr"><span class="hz-gt">${t}</span><div class="hz-gb">${it.map(btn).join('')}</div></div>`:''}).join('')+(()=>{const o=res.filter(x=>!usado.has(x[0]));return o.length?`<div class="hz-gb">${o.map(btn).join('')}</div>`:''})();
  r.innerHTML=`<div class="hz-tabs" role="tablist"><div class="hz-tabs-p" style="--n:${pri.length||1}">${pri.map(btn).join('')}</div>${res.length?`<button type="button" class="hz-mas${enRes?' act':''}" data-mas aria-expanded="${abierto}">${enRes?nomRes:(abierto?'Menos opciones':'Más opciones')} <i class="ti ti-chevron-${abierto?'up':'down'}" aria-hidden="true"></i></button>`:''}${res.length&&abierto?`<div class="hz-tabs-s">${grupos}${window.HZ_APARTE?'':`<a class="hz-aparte" href="/horarios.html" target="_blank" rel="noopener">Abrir como app aparte ↗</a>`}</div>`:''}</div>`+(!res.length&&!window.HZ_APARTE?'<a class="hz-aparte hz-aparte-s" href="/horarios.html" target="_blank" rel="noopener">Abrir como app aparte ↗</a>':'')+(grupoDe(tab)?`<div class="hz-sub" role="group" aria-label="Dentro de ${grupoDe(tab)==='mi'?'Mi semana':'Plantilla'}">${SUBG[grupoDe(tab)].map(([k,n])=>`<button type="button" data-sub="${k}" aria-pressed="${k===tab}">${n}</button>`).join('')}</div>`:'')+f();
}
window.initHorarios=function(){pintar()};
if(window.matchMedia)window.matchMedia("(max-width:700px)").addEventListener("change",()=>{try{if(root())pintar()}catch(e){}});

/* ---- eventos de la interfaz ---- */
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.pleg)plegAbierto[d.dataset.pleg]=d.open},true);
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  {const vb=e.target.closest('[data-vista]');if(vb){modoVista=vb.dataset.vista==='tabla'?'tabla':'dias';try{localStorage.setItem('hz_vista',modoVista)}catch(x){}pintar();return}}
  {const sb=e.target.closest('[data-sub]');if(sb){tab=sb.dataset.sub;edit=null;msg='';pintar();if(tab==='cambios'&&CH())CH().recargar().then(pintar);return}}
  if(e.target.closest('[data-mas]')){masTabs=!masTabs;pintar();return}
  const t=e.target.closest('[data-t]');if(t&&t.closest('.hz-tabs')){tab=t.dataset.t;if(!PRINC().includes(tab)&&!grupoDe(tab))masTabs=true;edit=null;msg='';pintar();if(tab==='cambios'&&CH())CH().recargar().then(pintar);return}
  const c=e.target.closest('.hz-cel,.hz-dfila,.hz-dchip');if(c){if(SOLO()||!c.dataset.e)return;edit={k:iso(semana),e:c.dataset.e,i:+c.dataset.i};pintar();const x=document.getElementById('hz-turno');if(x)x.focus();return}
  const y=e.target.closest('[data-yo]');if(y){try{localStorage.setItem('hz_yo',y.dataset.yo)}catch(er){}pintar();return}
  const q=e.target.closest('[data-q]');if(q){document.getElementById('hz-turno').value=q.dataset.q;return}
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='mesant'){mesH=new Date(mesH.getFullYear(),mesH.getMonth()-1,1);pintar();return}
  if(a==='messig'){mesH=new Date(mesH.getFullYear(),mesH.getMonth()+1,1);pintar();return}
  if(a==='ant'){semana=sumar(semana,-7);edit=null;pintar()}else if(a==='sig'){semana=sumar(semana,7);edit=null;pintar()}
  else if(a==='hoy'){semana=lunes(new Date());edit=null;pintar()}
  else if(a==='copiar'){const p=e.target.closest('[data-p]').dataset.p,k=iso(semana);
    if(!sinTurnos(k)&&!confirm('Esta semana ya tiene turnos. ¿Sustituirlos por los de la semana del '+corto(fd(p))+'?'))return;
    H().semanas[k]={};equipoSem(k).forEach(m=>{H().semanas[k][m.n]=[...fila(p,m.n)]});guardar(k);pintar()}
  else if(a==='gturno'){fila(edit.k,edit.e)[edit.i]=document.getElementById('hz-turno').value.trim();guardar(edit.k);edit=null;pintar()}
  else if(a==='bturno'){fila(edit.k,edit.e)[edit.i]='';guardar(edit.k);edit=null;pintar()}
  else if(a==='cturno'){edit=null;pintar()}
  const d=e.target.closest('[data-del]');if(d){H()[tab][iso(semana)].splice(+d.dataset.del,1);guardar(iso(semana));pintar()}
});
document.addEventListener('change',e=>{
  const x=e.target.closest('[data-eq]');if(!x)return;
  const p=H().equipo[+x.dataset.eq],f=x.dataset.f;p[f]=f==='g'?+x.value:x.value.trim();guardar()});
document.addEventListener('submit',e=>{
  const id=e.target.id;if(!id||!id.startsWith('hz-f-'))return;e.preventDefault();const $=s=>document.getElementById(s);
  if(id==='hz-f-pers'){const t=e.target.dataset.t,k=iso(semana);(H()[t][k]=H()[t][k]||[]).push({n:$('hz-pn').value.trim(),rol:$('hz-pr').value.trim(),t:DIAS.map((_,i)=>$('hz-pt'+i).value.trim())});guardar(k);pintar()}
  else if(id==='hz-f-hp'){const n=(x,a,b,d)=>Math.max(a,Math.min(b,parseInt($(x)&&$(x).value)||d));H().hp={minCob:n('hz-hp-cob',1,20,3),maxH:n('hz-hp-h',10,80,40),minDesc:n('hz-hp-desc',0,24,12),libres:n('hz-hp-libres',1,3,2)};hzParams();msg='Parámetros guardados.';guardar();pintar()}
  else if(id==='hz-f-eq'){const n=$('hz-en').value.trim();if(H().equipo.some(p=>p.n.toLowerCase()===n.toLowerCase())){msg=`Ya hay alguien llamado ${esc(n)} en el equipo.`;pintar();return}msg='';
    H().equipo.push({n,rol:$('hz-er').value.trim(),g:+$('hz-eg').value,desde:$('hz-ed').value,hasta:''});guardar();pintar()}
});
// Lo que comparten los archivos horarios-*.js: ayudas de fecha y turnos, el estado de la pantalla y dónde registrar sus pantallas
window.hzKit={
  H,fd,iso,lunes,sumar,corto,fmtH,cap,esc,pHM,tramos,horas,tipo,trabaja,equipoSem,fila,sinTurnos,personasDia,cobertura,enHora,guardar,avisos,pintar,SOLO,root,yo,activo:e=>activo(e),
  DIAS,DL,MES,MESL,GRUPOS,VAC_ANUAL,
  get semana(){return semana},set semana(v){semana=v},get anio(){return anio},set anio(v){anio=v},get msg(){return msg},set msg(v){msg=v},get edit(){return edit},set edit(v){edit=v},get tab(){return tab},
  vistas:{},util:{},
  reg(o){Object.assign(this.vistas,o.vistas||{});Object.assign(this.util,o.util||{})}};
Object.defineProperties(window.hzKit,{MIN_COB:{get:()=>MIN_COB,enumerable:true},MAX_H:{get:()=>MAX_H,enumerable:true},MIN_DESC:{get:()=>MIN_DESC,enumerable:true},LIBRES:{get:()=>LIBRES,enumerable:true}});
// Solo para las pruebas (pruebas/horarios.js): fijar el estado de la pantalla y llamar a las vistas y cálculos sin navegador
window.hzPruebas={
  fijar(o){if('tab' in o)tab=o.tab;if('semana' in o)semana=o.semana;if('anio' in o)anio=o.anio;if('edit' in o)edit=o.edit;if('msg' in o)msg=o.msg},
  estado(){return {tab,semana,anio,edit,msg}},
  get fn(){return Object.assign({vPlantilla,vMi,vAhora,vHoras,vEquipo,vPersonas,avisos,tramos,horas,tipo,cobertura,personasDia,equipoSem,sinTurnos,proximoTurno,horasMes},window.hzKit.util)}};
})();
