// Móviles del equipo solo para jefes: van en config.seda_horarios_tel (admin, dirección y chef), no dentro de seda_horarios.
// Un móvil con rol cocina no recibe ni sube móviles; un jefe sí los ve, los cambia y los envía por WhatsApp.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const hoy=new Date(),lun=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()-((hoy.getDay()+6)%7)),K=iso(lun);
const turnos=['08:00-16:00','08:00-16:00','LIBRE','LIBRE','16:00-00:00','16:00-00:00','16:00-00:00'];
const equipo=()=>[{n:'Ana',rol:'Cocinera',g:1},{n:'Darío',rol:'Cocinero',g:1},{n:'Rubén',rol:'Jefe de cocina',g:0}];
const horariosNube=()=>({equipo:equipo(),semanas:{[K]:{Ana:[...turnos],'Darío':[...turnos],'Rubén':[...turnos]}},extras:{},practicas:{},vac:[],bloqueos:[],ts:1,wts:{}});
const cfg=k=>(N.DB.config.find(c=>c.key===k&&c.hotel_id==='h1')||{}).value;
const telDentro=()=>(cfg('seda_horarios').equipo||[]).some(e=>'tel' in e);
N.DB.config.push({hotel_id:'h1',key:'seda_horarios',updated_at:T,value:horariosNube()});
N.DB.config.push({hotel_id:'h1',key:'seda_horarios_tel',updated_at:T,value:{'Ana':'600 11 22 33'}});
N.PERFILES['u-chef']={hotel:'h1',rol:'chef',nombre:'Darío',hotel_nombre:'Hotel',modulos:['base','costes','seguridad','equipo']};
N.PERFILES['u-coc']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Hotel',modulos:['base','costes','seguridad','equipo']};
N.PERFILES['u-sala']={hotel:'h1',rol:'sala',nombre:'Ana',hotel_nombre:'Hotel',modulos:['base','costes','seguridad','equipo']};
const tels=p=>p.evaluate(()=>JSON.stringify((horarios.equipo||[]).filter(e=>e.tel).map(e=>e.n+':'+e.tel)));
const guardado=p=>p.evaluate(()=>localStorage.getItem('seda_horarios')||'');

// 1) Jefe (chef): recibe los móviles aparte y los pone a cada persona
const C=await N.pagina(b,U+'index.html',{yo:'u-chef'});await C.waitForTimeout(1200);
ok(await tels(C)==='["Ana:600 11 22 33"]','chef: ve el móvil de Ana que está en seda_horarios_tel');
// Cambia el móvil de Darío en Equipo
await C.evaluate(()=>{showTab('horarios');hzPruebas.fijar({tab:'equipo'});initHorarios()});await C.waitForTimeout(300);
const i=await C.evaluate(()=>horarios.equipo.findIndex(e=>e.n==='Darío'));
await C.fill(`#hz-root input[data-eq="${i}"][data-f="tel"]`,'611 22 33 44');await C.dispatchEvent(`#hz-root input[data-eq="${i}"][data-f="tel"]`,'change');
await C.waitForTimeout(2200);
ok(cfg('seda_horarios_tel')['Darío']==='611 22 33 44'&&cfg('seda_horarios_tel')['Ana']==='600 11 22 33','chef: el móvil nuevo de Darío se guarda en seda_horarios_tel (y sigue el de Ana)');
ok(!telDentro(),'chef: seda_horarios (que lee todo el equipo) no lleva ningún móvil');
// WhatsApp con el móvil de la nube
await C.evaluate(()=>{window.__abiertas=[];window.open=u=>{window.__abiertas.push(u);return null};hzPruebas.fijar({tab:'plantilla'});initHorarios()});await C.waitForTimeout(300);
await C.evaluate(()=>document.querySelector('#hz-root [data-a="wasend"][data-n="Darío"]').click());
const ab=await C.evaluate(()=>window.__abiertas);
ok(ab.length===1&&ab[0].startsWith('https://wa.me/34611223344?text='),'chef: envía el horario a Darío por WhatsApp con su móvil ('+(ab[0]||'').slice(0,32)+')');

// 2) Cocina: no recibe móviles (aunque tuviera unos viejos guardados en el aparato) y no sube ninguno
await C.waitForTimeout(1500);N.log.length=0; // que termine de subir lo del chef (el «✓ Enviado»)
const viejo=horariosNube();viejo.equipo[0].tel='600 11 22 33';
const Kc=await N.pagina(b,U+'index.html',{yo:'u-coc'});
await Kc.evaluate(v=>{localStorage.setItem('seda_horarios',JSON.stringify(v))},viejo);await Kc.reload();await Kc.waitForTimeout(1500);
ok(await tels(Kc)==='[]','cocina: no tiene ningún móvil en pantalla');
ok(!/600 11|611 22/.test(await guardado(Kc)),'cocina: ni guardado en el aparato');
ok(await Kc.evaluate(()=>{hzPruebas.fijar({tab:'plantilla'});showTab('horarios');return !/600 11|611 22/.test(document.body.innerHTML)}),'cocina: ni en la página de Horarios');
await Kc.evaluate(()=>{_subirConfig('seda_horarios_tel',{'Ana':'000'});syncConfig('seda_horarios',horarios)});await Kc.waitForTimeout(1500);
ok(!N.log.some(l=>/^config/.test(l)),'cocina: no intenta subir nada de horarios ni de móviles ('+N.log.filter(l=>/config/.test(l)).join(' | ')+')');
ok(cfg('seda_horarios_tel')['Ana']==='600 11 22 33'&&cfg('seda_horarios_tel')['Darío']==='611 22 33 44','los móviles de la nube siguen intactos');
// La nube simulada aplica la regla de la base de datos: cocina no los puede leer aunque los pida
const leidos=await Kc.evaluate(async()=>{const r=await supa.from('config').select('key,value').eq('key','seda_horarios_tel');return r.data});
ok(Array.isArray(leidos)&&!leidos.length,'cocina: si los pidiera, la nube no se los da');

// 3) App suelta de Horarios: el jefe los ve, sala no
const HC=await N.pagina(b,U+'horarios.html',{yo:'u-chef'});await HC.waitForTimeout(1500);
ok(await tels(HC)==='["Ana:600 11 22 33","Darío:611 22 33 44"]','horarios.html con chef: ve los dos móviles');
const HS=await N.pagina(b,U+'horarios.html',{yo:'u-sala'});
await HS.evaluate(v=>{localStorage.setItem('seda_horarios',JSON.stringify(v))},viejo);await HS.reload();await HS.waitForTimeout(1500);
ok(await tels(HS)==='[]'&&!/600 11/.test(await guardado(HS)),'horarios.html con sala: ningún móvil');

// 4) Nube antigua (móviles aún dentro de seda_horarios, sin la clave nueva): el jefe los pasa a seda_horarios_tel
N.DB.config=N.DB.config.filter(c=>c.key!=='seda_horarios_tel'&&c.key!=='seda_horarios');
const ant=horariosNube();ant.equipo[1].tel='622 33 44 55';
N.DB.config.push({hotel_id:'h1',key:'seda_horarios',updated_at:T,value:ant});
const A=await N.pagina(b,U+'index.html',{yo:'u-chef'});await A.evaluate(()=>localStorage.clear());await A.reload();await A.waitForTimeout(2500);
ok((cfg('seda_horarios_tel')||{})['Darío']==='622 33 44 55','nube antigua: un jefe que abre la app copia los móviles a seda_horarios_tel');
ok(await tels(A)==='["Darío:622 33 44 55"]','nube antigua: el jefe sigue viendo el móvil');
// Y en cuanto un jefe guarda horarios, salen de seda_horarios
await A.evaluate(()=>{horarios.ts=Date.now();syncConfig('seda_horarios',horarios)});await A.waitForTimeout(1800);
ok(!telDentro(),'nube antigua: al guardar horarios, el móvil sale de seda_horarios');
ok((cfg('seda_horarios_tel')||{})['Darío']==='622 33 44 55','y queda en seda_horarios_tel');

// 5) Un aparato de jefe nuevo (sin nada) no borra los móviles de la nube
const Nn=await N.pagina(b,U+'index.html',{yo:'u-chef'});await Nn.evaluate(()=>localStorage.clear());
await Nn.evaluate(()=>_subirConfig('seda_horarios_tel',{}));
ok((cfg('seda_horarios_tel')||{})['Darío']==='622 33 44 55','una lista de móviles vacía nunca se sube');

for(const [n,p] of [['chef',C],['cocina',Kc],['horarios chef',HC],['horarios sala',HS],['nube antigua',A]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
ok(!N.rechazos.length,'ninguna columna rechazada '+N.rechazos.join(','));
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
