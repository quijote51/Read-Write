// Previsión de producción: cerrar eventos pasados (cuántos vinieron, qué sobró), campana y sugerencia para el siguiente.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const d=n=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const pl=()=>[{nombre:'Croquetas de jamón',cat:'C',alg:[]},{nombre:'Merluza',cat:'M',alg:[]},{nombre:'Tarta',cat:'P',alg:[]}];
const ev=(id,n,dia,pax)=>({hotel_id:'h1',id:String(id),nombre:n,fecha:d(dia),hora:'14:00',pax,tipo:'menu',lugar:'Salón',alergias_txt:'',alergenos_menu:[],platos:pl(),infantil:null,factor_custom:1,precio_venta:50,notas:'',personal_ids:[],bebidas:{}});
N.DB.eventos.push(ev(1700000000001,'Boda A',-3,100),ev(1700000000002,'Boda B',-2,100),ev(1700000000003,'Boda C',-1,100),ev(1700000000004,'Boda D',5,100));
const A=await N.pagina(b,U);await A.waitForTimeout(600);
await A.evaluate(()=>{rolActual='admin';aplicarRol('admin');avisosRecalcular()});await A.waitForTimeout(200);
await A.click('#av-btn');await A.waitForTimeout(300);
ok(/3 eventos sin cerrar/.test(await A.textContent('#av-modal')),'campana: 3 eventos sin cerrar');
await A.evaluate(()=>{document.getElementById('av-modal').style.display='none'});
const abrir=async id=>{await A.evaluate(id=>{showTab('produccion');ge('prod-sel').value=id;renderProd()},id);await A.waitForTimeout(150)};
// Futuro sin datos
await abrir('1700000000004');ok(/sin datos todavía/.test(await A.textContent('#prod-cont')),'evento futuro sin cierres: explica qué hacer');
// Cerrar Boda A desde la pantalla: vinieron 90, sobró la tarta
await abrir('1700000000001');ok(await A.isVisible('#pv-form'),'evento pasado: «¿Cómo fue?»');
await A.fill('#pv-real','90');await A.locator('#pv-form .pv-pl').nth(2).locator('label:has-text("Sobró")').click();await A.click('#pv-form .pv-btn');await A.waitForTimeout(1500);
let t=await A.textContent('#prod-cont');ok(/Vinieron 90 de 100/.test(t)&&/Sobró: Tarta/.test(t),'cerrado: resumen');
const nube=()=>(N.DB.config.find(c=>c.key==='seda_prevision')||{}).value;
ok(nube()&&nube().cierres['1700000000001']&&nube().cierres['1700000000001'].pax_real===90,'se guarda en la nube');
// Con 1 evento: pocos datos
await abrir('1700000000004');t=await A.textContent('#prod-cont');ok(/pocos datos \(1 de 3\)/.test(t)&&/90 %/.test(t),'con 1 cierre: aviso de pocos datos y 90 %');
// Cerrar B y C (tarta sobró otra vez; merluza faltó dos veces)
for(const [id,real] of [['1700000000002',80],['1700000000003',100]]){await abrir(id);await A.fill('#pv-real',String(real));
  await A.locator('#pv-form .pv-pl').nth(2).locator('label:has-text("Sobró")').click();await A.locator('#pv-form .pv-pl').nth(1).locator('label:has-text("Faltó")').click();await A.click('#pv-form .pv-btn');await A.waitForTimeout(300)}
await abrir('1700000000004');t=await A.textContent('#prod-cont');
ok(!/pocos datos/.test(t)&&/con 3 eventos cerrados de/.test(t)&&/90 %/.test(t),'con 3 cierres: 90 % de media');
const sug=await A.evaluate(()=>[...document.querySelectorAll('.pv-t tbody tr')].map(r=>r.cells[0].firstChild.textContent+'='+r.cells[2].textContent));
ok(sug.join()==='Croquetas de jamón=90,Merluza=99,Tarta=81','sugerido por plato: '+sug.join());
// Cambiar un cierre
await abrir('1700000000001');await A.click('text=Cambiar');ok(await A.isVisible('#pv-form')&&await A.inputValue('#pv-real')==='90','cambiar: vuelve el formulario con los datos');
ok(!(await A.evaluate(()=>prevSinCerrar().length)),'ya no quedan eventos sin cerrar');
// Desperdicio: sobras por persona
await A.evaluate(()=>{desperdicio={reg:[{id:'x',ev:'1700000000001',tipo:'plato',kg:9,dest:'basura',fecha:'',serv:'evento'}],plan:{}};});
await abrir('1700000000004');ok(/100 g/.test(await A.textContent('#prod-cont')),'sobras de Desperdicio: 100 g por persona');
// Rol sala: ve la previsión pero no cierra
N.PERFILES['u-sala']={hotel:'h1',rol:'sala',nombre:'Ana',hotel_nombre:'Hotel'};
const S=await N.pagina(b,U,{yo:'u-sala'});await S.waitForTimeout(800);
ok(await S.evaluate(()=>puedeConfig('seda_prevision'))===false,'sala: no puede cerrar eventos');
const sw=await A.evaluate(()=>document.documentElement.scrollWidth);
await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/prevision.png',fullPage:true});
ok(!A.errs.length&&!S.errs.length&&sw<=390,`sin errores (${A.errs.concat(S.errs).join(';')}) ancho ${sw}`);
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
