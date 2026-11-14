/* ══════════════════════════════════════
   OÍDO COCINA · Horarios: eventos
   Cobertura por horas de la semana cruzada con los eventos (en Plantilla) y la pestaña «Eventos» (cuánta gente hace falta).
   Parte de Horarios (horarios.js): usa lo que comparte window.hzKit y registra aquí sus pantallas.
   ══════════════════════════════════════ */
(function(){
const K=window.hzKit;
const {H,fd,iso,lunes,sumar,corto,fmtH,cap,esc,pHM,tramos,horas,tipo,trabaja,equipoSem,fila,sinTurnos,personasDia,cobertura,enHora,guardar,avisos,pintar,SOLO,root,yo,DIAS,DL,MES,MESL,GRUPOS,VAC_ANUAL}=K;
const activo=e=>K.activo(e);
/* ---- Cobertura por horas: cuántas personas de cocina hay a cada hora (6:00–24:00) y qué evento cae en cada hora ----
   Colores de cada hora: 1 persona naranja, 2 amarillo, 3 o más verde (la hora de un evento lleva un marco dorado).
   Debajo, una línea por evento de la semana con quién hay a su hora (misma ventana que htmlHorarioEvento) y aviso si falta gente. */
const CH_0=6,CH_1=24;
function eventosSemana(k){
  const ev=(typeof eventos!=='undefined'&&Array.isArray(eventos))?eventos.filter(Boolean):[],r=[[],[],[],[],[],[],[]];
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
      else if(alli.length<K.MIN_COB){cls='warn';txt+=` · menos de ${K.MIN_COB}`}
      lineas+=`<div class="hz-ch-ev ${cls}"><b>${DIAS[i]} ${d.getDate()}${e.hora?' · '+esc(e.hora):''}</b> ${esc(e.nombre)}${pax?' · '+pax+' pax':''}<br><small>${txt}</small></div>`});
  }
  return h+`<div class="hz-ch-leyenda"><span class="n1">1</span><span class="n2">2</span><span class="n3">3+</span><small>personas de cocina</small></div>${lineas?`<div class="hz-ch-evs">${lineas}</div>`:''}</div>`}
/* ---- eventos y necesidad de gente ---- */
function factorEv(ev){
  try{ if(typeof getFactorEvento==='function') return getFactorEvento(ev) }catch(e){}
  if(ev.factor_custom>0) return Number(ev.factor_custom);
  const t=(typeof tiposServicio!=='undefined'&&tiposServicio?tiposServicio:[]).find(x=>x.id===ev.tipo);return (t&&t.factor)||1}
function vEventos(){
  const hoy=new Date(),a=iso(hoy),b=iso(sumar(hoy,21));
  const evs=(typeof eventos!=='undefined'?eventos:[]).filter(e=>e&&e.fecha>=a&&e.fecha<=b).sort((x,y)=>(x.fecha+(x.hora||'')).localeCompare(y.fecha+(y.hora||'')));
  if(!evs.length)return`<div class="hz-vacio">No hay eventos en los próximos 21 días.</div>`;
  const rp=(typeof ajustes!=='undefined'&&ajustes&&Number(ajustes.raciones_por_persona))||80;
  const dias={};evs.forEach(e=>(dias[e.fecha]=dias[e.fecha]||[]).push(e));
  let h=`<p style="font-size:12px;color:var(--text-secondary);margin:0 0 10px">Próximos 21 días. Referencia: una persona de cocina cubre ${rp} raciones; mínimo ${K.MIN_COB} personas.</p>`;
  Object.keys(dias).forEach(f=>{
    const lista=dias[f],d=fd(f),rac=lista.reduce((s,e)=>s+Math.round((Number(e.pax)||0)*factorEv(e)),0),nec=Math.max(K.MIN_COB,Math.ceil(rac/rp));
    const z=window.hzDia(f),coc=z?z.gente.filter(p=>p.g<=3):null,falta=coc?Math.max(0,nec-coc.length):null;
    const cls=!z?'b-info':falta>0?'b-danger':'b-success';
    const txt=!z?'Horario de esa semana sin cargar':falta>0?`Faltan ${falta}: hay ${coc.length}, hacen falta ${nec}`:`Cubierto: ${coc.length} en cocina (hacen falta ${nec})`;
    h+=`<div class="card"><div class="hz-fila" style="border:0;padding:0 0 6px"><b>${cap(DL[(d.getDay()+6)%7])} ${d.getDate()} ${MES[d.getMonth()]}</b><span class="badge ${cls}">${txt}</span></div>
    <small style="color:var(--text-secondary)">${lista.length} evento${lista.length===1?'':'s'} · ${rac} raciones${coc&&coc.length?' · Cocina: '+coc.map(p=>esc(p.n)).join(', '):''}</small>
    ${lista.map(e=>`<div class="hz-fila" style="flex-wrap:wrap;align-items:flex-start"><span><b>${esc(e.hora||'')} ${esc(e.nombre)}</b><br><small>${Number(e.pax)||0} pax${e.lugar?' · '+esc(e.lugar):''}</small></span><span>${window.htmlHorarioEvento(e)}</span></div>`).join('')}</div>`});
  return h}

K.factorEv=factorEv;
K.reg({vistas:{cobHoras:vCobHoras,eventos:vEventos},util:{vCobHoras,vEventos,eventosSemana,factorEv}});
})();
