// Fichaje de jornada: fichar entrada/pausa/vuelta/salida, horas del día, sin conexión, jefe (ahora, informe,
// anular, a mano, imprimir), cuenta compartida, roles y app suelta.
const {chromium}=require('playwright');const N=require('./nube.js');const H='http://localhost:8765/';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const lun=(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
const dow=(new Date().getDay()+6)%7;const sem={Rubén:['L','L','L','L','L','L','L'],Ana:['a','a','a','a','a','a','a']};sem.Rubén[dow]='b';
N.DB.config.push({hotel_id:'h1',key:'seda_horarios',updated_at:'2026-11-03T10:00:00.000Z',value:{equipo:[{n:'Rubén',rol:'Cocinero',g:'Cocineros'},{n:'Ana',rol:'Ayudante',g:'Ayudantes'}],semanas:{[lun]:sem},extras:{},practicas:{},vac:[]}});
N.DB.config.push({hotel_id:'h1',key:'seda_ajustes',updated_at:'2026-11-03T10:00:00.000Z',value:{hotel_nombre:'Seda Club Hotel',hotel_ciudad:'Granada',lugares:[]}});
N.PERFILES['u-rub']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
N.PERFILES['u-coc']={hotel:'h1',rol:'cocina',nombre:null,hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
N.PERFILES['u-pepe']={hotel:'u-pepe',rol:'admin',hotel_nombre:'Bar Pepe',modulos:['base']};
const F=()=>N.DB.fichajes||[];
// Rubén ficha desde la app suelta
const R=await N.pagina(b,H+'fichaje.html',{yo:'u-rub'});await R.waitForTimeout(900);
ok(/Rubén/.test(await R.textContent('.fh-yo'))&&/Fuera/.test(await R.textContent('.fh-est')),'Rubén: su nombre y «Fuera»');
ok(!(await R.$('[data-fhv="informe"]')),'Rubén no ve el informe');
await R.click('[data-t="entrada"]');await R.waitForTimeout(500);
ok(F().length===1&&F()[0].persona==='Rubén'&&F()[0].tipo==='entrada','entrada guardada');
ok(await R.isVisible('[data-t="pausa"]')&&await R.isVisible('[data-t="salida"]')&&/Trabajando/.test(await R.textContent('.fh-est')),'trabajando: botones Pausa y Salida');
await R.click('[data-t="pausa"]');await R.waitForTimeout(400);ok(await R.isVisible('[data-t="vuelta"]'),'en pausa: botón Vuelvo');
await R.click('[data-t="vuelta"]');await R.waitForTimeout(400);
// Sin conexión: la salida se guarda en el aparato y se sube al volver
await R.context().setOffline(true);await R.evaluate(()=>window.dispatchEvent(new Event('offline')));
await R.click('[data-t="salida"]');await R.waitForTimeout(400);
ok(/guardada en el aparato/.test(await R.textContent('#fh-root'))&&F().length===3,'sin conexión: guardada en el aparato');
await R.context().setOffline(false);await R.evaluate(()=>window.dispatchEvent(new Event('online')));await R.waitForTimeout(1200);
ok(F().length===4&&F()[3].origen==='sin_conexion'&&F()[3].tipo==='salida','al volver la conexión se sube («sin conexión»)');
// Horas: ajustamos las horas para comprobar el cálculo (entrada 8:00, pausa 11:00-11:30, salida 16:00 → 7 h 30)
const hoy=new Date();const h=(H_,M)=>new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate(),H_,M).toISOString();
F()[0].hora=h(8,0);F()[1].hora=h(11,0);F()[2].hora=h(11,30);F()[3].hora=h(16,0);
// El jefe (admin, dueño)
const A=await N.pagina(b,H+'index.html');await A.evaluate(()=>{aplicarRol('admin');showTab('fichaje')});await A.waitForTimeout(800);
ok(await A.isVisible('#fh-persona'),'el dueño sin nombre elige quién ficha');
await A.click('[data-fhv="informe"]');await A.waitForTimeout(600);await A.selectOption('#fh-quien','Rubén');await A.waitForTimeout(200);
let t=await A.textContent('#fh-root');
ok(/7 h 30 min/.test(t)&&/7:30/.test(t)&&/30 min/.test(t),'informe: 7 h 30 min con 30 min de pausa');
ok(/06:30-14:30/.test(t),'informe: turno previsto de Horarios');
ok(/16:00\*/.test(t),'la salida sin conexión va marcada con *');
// Anular con motivo y añadir a mano
const resp=['salida',`${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()} 15:00`,'Se le olvidó; confirmado con el chef'];
A.on('dialog',d=>d.accept(d.message().startsWith('Anular')?'Hora mal (sin conexión)':resp.shift()));
await A.click('.fh-fila:has-text("Salida") [data-fh="anular"]');await A.waitForTimeout(800);
ok(F().some(x=>x.tipo==='anula'&&x.nota==='Hora mal (sin conexión)'),'anulación con motivo (no se borra nada)');
ok(F().length===5,'el fichaje anulado sigue guardado');
await A.click('[data-fh="manual"]');await A.waitForTimeout(900);
const man=F().find(x=>x.origen==='manual')||{};
ok(man.tipo==='salida'&&man.nota&&new Date(man.hora).getHours()===15,'fichaje a mano con motivo');
t=await A.textContent('#fh-root');ok(/6 h 30 min/.test(t),'informe recalculado: 6 h 30 min');
const imp=await A.evaluate(()=>{window.print=()=>{};document.querySelector('[data-fh="imprimir"]').click();return document.getElementById('fh-print').innerText});
ok(/Registro de jornada · Rubén/.test(imp)&&/Seda Club Hotel/.test(imp)&&/Firma de la persona trabajadora/.test(imp)&&/6 h 30 min/.test(imp),'hoja para la inspección');
// Ahora: Ana ficha desde la cuenta compartida
const C=await N.pagina(b,H+'fichaje.html',{yo:'u-coc'});await C.waitForTimeout(900);
ok(await C.isVisible('#fh-persona')&&await C.isVisible('[data-fhv="ahora"]'),'cuenta compartida: elige nombre y ve «Ahora»');
await C.selectOption('#fh-persona','Ana');await C.click('[data-t="entrada"]');await C.waitForTimeout(500);
ok(F().some(x=>x.persona==='Ana'&&x.tipo==='entrada'),'Ana ficha desde el aparato compartido');
await A.click('[data-fhv="ahora"]');await A.waitForTimeout(600);t=await A.textContent('#fh-root');
ok(/Ana/.test(t)&&/Trabajando/.test(t)&&!/Rubén/.test(t),'«Ahora»: Ana dentro, Rubén fuera');
// Cliente sin módulo Equipo
const P=await N.pagina(b,H+'fichaje.html',{yo:'u-pepe'});await P.waitForTimeout(800);ok(/no está incluida en vuestro plan/.test(await P.textContent('main')),'sin módulo Equipo: no incluida');
ok(await A.evaluate(()=>!!document.querySelector('a[href="/fichaje.html"]')),'enlace en Ajustes');
for(const [n,p] of [['R',R],['A',A],['C',C],['P',P]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
await R.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/fh1.png'});
await A.click('[data-fhv="informe"]');await A.waitForTimeout(500);await A.selectOption('#fh-quien','Rubén');await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/fh2.png',fullPage:true});
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
