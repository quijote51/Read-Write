/* ══════════════════════════════════════
   OÍDO COCINA · Horarios: cambios de turno entre compañeros
   Pedir un cambio, aceptarlo o rechazarlo y que el jefe lo apruebe (se aplica al horario). Usa window.HZ_CAMB (horarios.html).
   Parte de Horarios (horarios.js): usa lo que comparte window.hzKit y registra aquí sus pantallas.
   ══════════════════════════════════════ */
(function(){
const K=window.hzKit;
const {H,fd,iso,lunes,sumar,corto,fmtH,cap,esc,pHM,tramos,horas,tipo,trabaja,equipoSem,fila,sinTurnos,personasDia,cobertura,enHora,guardar,avisos,pintar,SOLO,root,yo,DIAS,DL,MES,MESL,GRUPOS,MIN_COB,MAX_H,MIN_DESC,VAC_ANUAL}=K;
const activo=e=>K.activo(e);
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

K.reg({vistas:{cambios:vCambios},util:{vCambios,aprobarCambio}});
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='cpedir'){const[k,i]=cf.dia.split('|'),me=SOLO()?yo():(cf.de||yo());if(!k||!cf.con||!me)return;
    const tm=fila(k,me)[+i]||'',tc=fila(k,cf.con)[+i]||'';
    cmsg='Enviando…';pintar();
    CH().crear({semana:k,dia:+i,de:me,a:cf.con,turno_de:tm,turno_a:tc}).then(ok=>{cmsg=ok?'Solicitud enviada. Avisa a '+esc(cf.con)+' para que la acepte.':'No se pudo enviar (¿sin conexión?).';if(ok)cf={dia:'',con:'',de:cf.de};pintar()});return}
  if(a==='cacepta'||a==='crechaza'||a==='caprueba'){const id=e.target.closest('[data-cc]').dataset.cc,c=CH().lista().find(x=>x.id===id);if(!c)return;cmsg='';
    (a==='caprueba'?aprobarCambio(c):CH().estado(id,a==='cacepta'?'aceptado':'rechazado').then(ok=>{cmsg=ok?'':'No se pudo guardar (¿sin conexión?).'})).then(()=>pintar());return}
});
document.addEventListener('change',e=>{
  const cfx=e.target.closest('[data-cf]');if(cfx){cf[cfx.dataset.cf]=cfx.value;if(cfx.dataset.cf!=='con')cf.con='';if(cfx.dataset.cf==='de')cf.dia='';cmsg='';pintar()}
});
})();
