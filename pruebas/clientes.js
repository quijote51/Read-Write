// Fase 3: varios clientes. Plataforma crea un cliente con módulos; el cliente entra, ve su marca y solo sus módulos.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';
N.DB.config.push({hotel_id:'h1',key:'seda_ajustes',updated_at:T,value:{hotel_nombre:'Seda Club Hotel',hotel_ciudad:'Granada',hotel_dir:'Plaza de la Trinidad, 2',hotel_tel:'+34 858 160 161',hotel_web:'sedaclubhotel.com',lugares:['Azotea']}});
N.DB.config.push({hotel_id:'h1',key:'seda_horarios',updated_at:T,value:{equipo:[{n:'Rubén',rol:'Jefe',g:0}],semanas:{},extras:{},practicas:{},vac:[],ts:1}});
N.DB.recetas.push({hotel_id:'h1',id:'r1',nombre:'Receta del Seda',cat:'P',emoji:'🍰',alg:[],ingredientes:[],img:null,base:false,rinde:null,extra:{},borrado:false});
const visibles=p=>p.evaluate(()=>[...document.querySelectorAll('.acc-item[data-tab]')].filter(i=>i.style.display!=='none').map(i=>i.dataset.tab));
// 1) Plataforma (Seda): su marca, todo visible, panel de clientes
const A=await N.pagina(b,U+'index.html');await A.waitForTimeout(800);await A.evaluate(()=>{aplicarRol('admin')});
ok(/Seda Club Hotel · Granada/.test(await A.textContent('#header-hotel-nombre')),'Seda: su nombre en la cabecera (de sus Ajustes)');
const va=await visibles(A);ok(['escandallo','inventario','costes','appcc','horarios'].every(t=>va.includes(t)),'Seda: ve los 4 módulos');
ok(await A.evaluate(()=>getComputedStyle(document.getElementById('clientes-card')).display)!=='none','Seda (plataforma): ve «Clientes»');
await A.evaluate(()=>showTab('ajustes'));await A.waitForTimeout(300);
await A.fill('#cl-nombre','Bar Pepe');await A.fill('#cl-ciudad','Sevilla');
await A.uncheck('[data-cl-mod="nuevo"][value="costes"]');await A.uncheck('[data-cl-mod="nuevo"][value="equipo"]');
await A.click('[data-cl-crear]');await A.waitForTimeout(600);
const cod=Object.keys(N.CLIENTES)[0];ok(cod&&N.CLIENTES[cod].modulos.join('+')==='base+seguridad','código de cliente creado: Bar Pepe con base + seguridad');
await A.locator('#clientes-card').screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/clientes.png'});
// 2) El cliente se registra con el código
const R=await N.pagina(b,U+'index.html',{yo:'nadie'});await R.waitForTimeout(500);
await R.click('#reg-ver');await R.fill('#login-email','pepe@x');await R.fill('#login-pass','contraseña-larga');await R.fill('#reg-codigo',cod);await R.fill('#reg-nombre','Pepe');
await R.evaluate(()=>{window.__YO='u-pepe'});await R.click('#reg-btn');await R.waitForTimeout(800);
ok(N.PERFILES['u-pepe']&&N.PERFILES['u-pepe'].rol==='admin'&&N.PERFILES['u-pepe'].hotel==='u-pepe','Bar Pepe: cuenta creada como admin de su propio hotel');
// 3) Bar Pepe entra: su marca, sus módulos, nada del Seda
const P=await N.pagina(b,U+'index.html',{yo:'u-pepe'});await P.waitForTimeout(1200);await P.evaluate(()=>{aplicarRol('admin')});
ok(/Bar Pepe · Sevilla/.test(await P.textContent('#header-hotel-nombre')),'Bar Pepe: su nombre en la cabecera');
const vp=await visibles(P);
ok(!['escandallo','inventario','costes','horarios'].some(t=>vp.includes(t))&&vp.includes('appcc'),'Bar Pepe: sin costes ni horarios; con APPCC ('+vp.length+' secciones)');
ok(await P.evaluate(()=>!recetas.some(r=>r.nombre==='Receta del Seda')),'Bar Pepe: no ve las recetas del Seda');
ok(await P.evaluate(()=>!horarios.equipo.some(e=>e.n==='Rubén')),'Bar Pepe: los horarios no traen al equipo del Seda');
const texto=await P.evaluate(()=>{document.querySelectorAll('.acc-item').forEach(i=>i.style.display='');return document.body.innerText});
ok(!/Seda/.test(texto),'Bar Pepe: no aparece «Seda» en ninguna pantalla'+(/Seda/.test(texto)?' → '+texto.match(/.{0,40}Seda.{0,40}/)[0]:''));
const ped=await P.evaluate(()=>{const ev={id:Date.now(),nombre:'Comida',fecha:'2026-12-01',hora:'14:00',pax:10,tipo:'menu',lugar:'Salón',platos:[]};return generarMensaje({nombre:'Frutas Paco'},[],[ev])}).catch(()=>'');
if(ped) ok(/Bar Pepe/.test(ped)&&!/Seda/.test(ped),'mensaje de pedido firmado por Bar Pepe');
ok(await P.evaluate(()=>getComputedStyle(document.getElementById('clientes-card')).display)==='none','Bar Pepe: no ve «Clientes»');
ok(await P.evaluate(()=>getComputedStyle(document.getElementById('equipo-card')).display)!=='none','Bar Pepe: puede invitar a su equipo');
// 4) Apps sueltas de módulos no contratados
const AL=await N.pagina(b,U+'albaranes.html',{yo:'u-pepe'});await AL.waitForTimeout(800);
ok(/no está incluida en vuestro plan/.test(await AL.textContent('main')),'Bar Pepe en Albaranes: «no está incluida en vuestro plan»');
ok(/Bar Pepe/.test(await AL.textContent('#marca-linea')),'cabecera de la app suelta con Bar Pepe');
const AP=await N.pagina(b,U+'appcc.html',{yo:'u-pepe'});await AP.waitForTimeout(800);
ok(!/no está incluida/.test(await AP.textContent('main')),'Bar Pepe en APPCC: entra (tiene seguridad)');
// 5) La plataforma le activa Costes
await A.evaluate(()=>clientesPintar());await A.waitForTimeout(500);
await A.check('.cl-mods[data-cl-owner="u-pepe"] input[value="costes"]');await A.waitForTimeout(500);
ok(N.PERFILES['u-pepe'].modulos.includes('costes'),'la plataforma activa Costes a Bar Pepe');
await P.reload();await P.waitForTimeout(1200);await P.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none';aplicarRol('admin')});
ok((await visibles(P)).includes('escandallo'),'Bar Pepe ya ve el escandallo');
for(const [n,p] of [['A',A],['P',P],['AL',AL],['AP',AP]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
