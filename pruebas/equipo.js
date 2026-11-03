// Fase 2: cuentas por persona. Dueño, nube sin fase 2, chef, cocina, sala, cuenta sin equipo y alta con código.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';
N.DB.config.push({hotel_id:'h1',key:'seda_precios',updated_at:T,value:{'Salmón':{precio:0.022,ud:'g'}}});
N.DB.recetas.push({hotel_id:'h1',id:'r1',nombre:'Tarta',cat:'P',emoji:'🍰',alg:[],ingredientes:[],img:null,base:false,rinde:null,extra:{},borrado:false});
N.DB.plantillas.push({hotel_id:'h1',id:'plt1',nombre:'Menú',descripcion:'x',platos:[]});
const visibles=p=>p.evaluate(()=>[...document.querySelectorAll('.acc-item[data-tab]')].filter(i=>i.style.display!=='none').map(i=>i.dataset.tab).join(','));
// 1) Nube sin fase 2 todavía: todo como antes
N.setRpc(false);
const V=await N.pagina(b,U+'index.html');await V.waitForTimeout(800);
ok(await V.evaluate(()=>_uid)==='h1'&&await V.evaluate(()=>miRol())==='admin','nube sin fase 2: la app sigue igual (dueño, admin)');
ok(await V.evaluate(()=>document.getElementById('equipo-card').style.display)==='none','nube sin fase 2: no sale «Equipo»');
N.setRpc(true);
// 2) Dueño: crea un código de chef y uno de cocina
const A=await N.pagina(b,U+'index.html');await A.waitForTimeout(800);
ok(await A.evaluate(()=>getComputedStyle(document.getElementById('equipo-card')).display)!=='none','dueño: ve «Equipo» en Ajustes');
await A.evaluate(()=>{aplicarRol('admin');showTab('ajustes')});await A.waitForTimeout(300);
await A.selectOption('#eq-rol','chef');await A.fill('#eq-nombre','Darío');await A.click('[data-eq-crear]');await A.waitForTimeout(600);
await A.selectOption('#eq-rol','cocina');await A.fill('#eq-nombre','Rubén');await A.click('[data-eq-crear]');await A.waitForTimeout(600);
const cods=Object.values(N.INVIT);ok(cods.length===2&&cods.every(i=>i.hotel_id==='h1'),'dueño: crea 2 códigos para su hotel ('+cods.map(i=>i.codigo+' '+i.rol).join(', ')+')');
ok(/Código .* creado/.test(await A.textContent('#eq-msg')),'aviso con el código creado');
await A.locator('#equipo-card').screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/equipo.png'});
const cChef=cods.find(i=>i.rol==='chef').codigo, cCoc=cods.find(i=>i.rol==='cocina').codigo;
// 3) Alta con código desde la pantalla de entrada (persona nueva)
const R=await N.pagina(b,U+'index.html',{yo:'nadie'});await R.waitForTimeout(500);
ok(await R.isVisible('#reg-ver'),'pantalla de entrada: botón «Tengo un código de invitación»');
await R.click('#reg-ver');await R.fill('#login-email','dario@x');await R.fill('#login-pass','contraseña-larga');await R.fill('#reg-codigo',cChef.toLowerCase());await R.fill('#reg-nombre','Darío');
await R.evaluate(()=>{window.__YO='u-chef'});await R.click('#reg-btn');await R.waitForTimeout(800);
ok(N.PERFILES['u-chef']&&N.PERFILES['u-chef'].rol==='chef','se crea la cuenta y entra al equipo como chef');
// 4) Chef: guarda en el hotel, rol fijo, no intenta guardar lo que no puede
const C=await N.pagina(b,U+'index.html',{yo:'u-chef'});await C.waitForTimeout(1000);
ok(await C.evaluate(()=>_uid)==='h1'&&await C.evaluate(()=>_yo)==='u-chef','chef: trabaja sobre el hotel (h1) con su propia cuenta');
ok(await C.evaluate(()=>rolActual)==='chef'&&await C.evaluate(()=>getComputedStyle(document.getElementById('rol-btn')).display)==='none','chef: rol fijo, sin selector ni PIN');
ok(await C.evaluate(()=>recetas.some(r=>r.id==='r1')),'chef: ve las recetas del hotel');
N.log.length=0;
await C.evaluate(()=>{recetas.find(r=>r.id==='r1').nombre='Tarta de queso';saveRec(recetas);plantillas.find(p=>p.id==='plt1').nombre='HACK';savePlt(plantillas);preciosIng['Salmón'].precio=0.03;savePrecios(preciosIng)});await C.waitForTimeout(1500);
ok(N.DB.recetas.find(r=>r.id==='r1').nombre==='Tarta de queso'&&N.DB.config.find(c=>c.key==='seda_precios').value['Salmón'].precio===0.03,'chef: guarda recetas y precios del hotel');
ok(!N.log.some(l=>l.startsWith('plantillas'))&&N.DB.plantillas[0].nombre==='Menú','chef: no intenta guardar plantillas (no es de su rol)');
ok(await C.evaluate(()=>localStorage.getItem('seda_pendiente'))!=='1','chef: no queda nada «pendiente» por eso');
ok(await C.evaluate(()=>document.getElementById('equipo-card').style.display)==='none','chef: no ve «Equipo»');
// 5) Cocina: ve horarios, producción, recetario y APPCC
N.PERFILES['u-coc']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Seda Club Hotel'};
const K=await N.pagina(b,U+'index.html',{yo:'u-coc'});await K.waitForTimeout(1000);
ok(await visibles(K)==='produccion,recetario,horarios,appcc,desperdicio','cocina: ve '+await visibles(K));
// 6) Cuenta sin equipo: pide el código; con el código entra
const S=await N.pagina(b,U+'index.html',{yo:'u-sin'});await S.waitForTimeout(800);
ok(await S.isVisible('#eq-unirse'),'cuenta sin equipo: pide el código');
await S.fill('#eq-cod','MAL-0000');await S.click('#eq-unirse button[type=submit]');await S.waitForTimeout(400);
ok(/no vale/.test(await S.textContent('#eq-err')),'código malo: avisa');
await S.fill('#eq-cod',cCoc);await S.click('#eq-unirse button[type=submit]');await S.waitForTimeout(1200);
ok(N.PERFILES['u-sin']&&N.PERFILES['u-sin'].rol==='cocina'&&N.PERFILES['u-sin'].nombre==='Rubén','con el código bueno entra como cocina (Rubén)');
// 7) Apps sueltas: sala no usa Albaranes; horarios en solo lectura para sala
N.PERFILES['u-sala']={hotel:'h1',rol:'sala',nombre:'Ana',hotel_nombre:'Seda Club Hotel'};
const AL=await N.pagina(b,U+'albaranes.html',{yo:'u-sala'});await AL.waitForTimeout(800);
ok(/Tu rol no usa esta app/.test(await AL.textContent('main')),'Albaranes con rol sala: «Tu rol no usa esta app»');
const HZ=await N.pagina(b,U+'horarios.html',{yo:'u-sala'});await HZ.waitForTimeout(800);
ok(await HZ.evaluate(()=>window.HZ_SOLO_LEER===true&&_uid==='h1'),'Horarios con rol sala: solo ver, del hotel h1');
const HC=await N.pagina(b,U+'horarios.html',{yo:'u-chef'});await HC.waitForTimeout(800);
ok(await HC.evaluate(()=>window.HZ_SOLO_LEER===false),'Horarios con rol chef: puede cambiar');
const IV=await N.pagina(b,U+'inventario.html',{yo:'u-coc'});await IV.waitForTimeout(800);
ok(/solo para dirección y chef/.test(await IV.textContent('body')),'Inventario con rol cocina: no entra');
// 8) Dueño ve el equipo y quita a alguien
await A.evaluate(()=>equipoPintar());await A.waitForTimeout(500);
const txt=await A.textContent('#equipo-card');ok(/Darío/.test(txt)&&/Ana/.test(txt),'dueño ve a Darío y Ana en el equipo');
A.on('dialog',d=>d.accept());await A.click('[data-eq-quitar="u-sala"]');await A.waitForTimeout(500);
ok(!N.PERFILES['u-sala'],'dueño quita a Ana');
for(const [n,p] of [['V',V],['A',A],['R',R],['C',C],['K',K],['S',S],['AL',AL],['HZ',HZ],['IV',IV]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
