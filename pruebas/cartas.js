// Carta QR de alérgenos: crear desde el recetario y desde un evento, QR, página del comensal (filtro), retirar y permisos.
// El generador de QR se sirve desde una copia local (QR_NM: carpeta node_modules con qrcode-generator@1.4.4).
const {chromium}=require('playwright');const N=require('./nube.js');const fs=require('fs');const U='http://localhost:8765/index.html';
const NM=process.env.QR_NM||'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/qr/node_modules';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const hoy=new Date().toISOString().slice(0,10);
const rec=(id,nombre,cat,alg,base)=>({hotel_id:'h1',id,nombre,cat,emoji:'🍽',alg,ingredientes:[{n:'Secreto',q:1,u:'kg'}],img:null,base:!!base,rinde:base?{cant:1,ud:'kg'}:null,extra:{},borrado:false});
N.DB.recetas.push(rec('r1','Tarta de queso','Postres',['lacteo','gluten','huevo']),rec('r2','Ensalada de la huerta','Entrantes',[]),rec('r3','Fondo oscuro','Bases',['apio'],true));
N.DB.eventos.push({hotel_id:'h1',id:'1700000000001',nombre:'Boda Peps',fecha:hoy,hora:'14:00',pax:40,tipo:'banquete',lugar:'Salón',alergias_txt:'',alergenos_menu:[],platos:[{nombre:'Merluza a la bilbaína',cat:'Principal',alg:['pescado']},{nombre:'Plato sin ficha',cat:'Postre',alg:[]}],infantil:null,factor_custom:null,precio_venta:50,notas:'',personal_ids:[],bebidas:null,notas_bebidas:''});
N.DB.config.push({hotel_id:'h1',key:'seda_ajustes',updated_at:'2026-11-03T10:00:00.000Z',value:{hotel_nombre:'Seda Club Hotel',hotel_ciudad:'Granada',lugares:[]}});
const qrLib=r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(NM+'/qrcode-generator/qrcode.js','utf8')});
const abrir=async p=>{await p.route(/qrcode-generator/,qrLib);await p.evaluate(()=>{aplicarRol('admin');showTab('cartas')});await p.waitForTimeout(500)};
const A=await N.pagina(b,U);await abrir(A);
ok(await A.isVisible('[data-cq="nueva"]'),'sección Carta QR visible');
// 1) Desde el recetario
await A.click('[data-cq="nueva"]');await A.fill('#cq-titulo','Carta de otoño');
ok(!(await A.$('[data-rec="r3"]')),'las elaboraciones base no salen para elegir');
await A.check('[data-rec="r1"]');await A.check('[data-rec="r2"]');await A.fill('#cq-nota','Tenemos pan sin gluten.');
await A.click('[data-cq="guardar"]');await A.waitForTimeout(1200);
const filas=()=>N.DB.cartas_publicas||[];
const c1=filas()[0];
ok(filas().length===1&&c1.titulo==='Carta de otoño'&&c1.publicada===true,'carta guardada en la nube');
const tarta=(c1.contenido.platos||[]).find(p=>p.nombre==='Tarta de queso')||{};
ok(JSON.stringify(tarta.alg)==='["gluten","huevo","lacteo"]','alérgenos de la tarta calculados ('+JSON.stringify(tarta.alg)+')');
ok(!JSON.stringify(c1.contenido).includes('Secreto'),'no se publican ingredientes ni recetas');
ok(c1.contenido.hotel==='Seda Club Hotel','nombre del hotel en la carta');
ok(N.rechazos.length===0,'sin columnas que no existen ('+N.rechazos.join(',')+')');
ok(!!(await A.$('#cq-poster svg')),'cartel con el QR');
const url=await A.inputValue('#cq-url');ok(url.endsWith('/carta.html?c='+c1.id),'enlace del QR: '+url);
await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/cq-qr.png'});
// 2) Página del comensal (sin cuenta, fetch a la función carta_publica)
const C=await (await b.newContext({viewport:{width:390,height:800},serviceWorkers:'block'})).newPage();C.errs=[];C.on('pageerror',e=>C.errs.push(e.message));
let llamadas=0;
await C.route(/rest\/v1\/rpc\/carta_publica/,r=>{llamadas++;const h=r.request().headers();const id=JSON.parse(r.request().postData()).p_id;const c=filas().find(x=>x.id===id&&x.publicada);
  if(!h.apikey)return r.fulfill({status:401,body:'{}'});r.fulfill({contentType:'application/json',body:JSON.stringify(c?{titulo:c.titulo,contenido:c.contenido,actualizado:c.actualizado}:null)})});
await C.goto('http://localhost:8765/carta.html?c='+c1.id);await C.waitForTimeout(600);
let t=await C.textContent('#app');
ok(/Carta de otoño/.test(t)&&/Tarta de queso/.test(t)&&/Ensalada de la huerta/.test(t)&&/pan sin gluten/.test(t),'el comensal ve la carta');
ok(/Alérgenos sin confirmar: pregunte al personal/.test(t)&&!/Sin alérgenos de declaración/.test(t),'plato sin alérgenos apuntados: pide preguntar, nunca dice que no lleva');
await C.click('[data-a="gluten"]');await C.waitForTimeout(100);t=await C.textContent('#app');
ok(/0 de 2 platos/.test(t)&&/1 sin confirmar: pregunte al personal/.test(t),'filtro «tengo alergia a gluten»: el plato sin datos no cuenta como apto');
ok(await C.textContent('.est.duda')==='Consultar'&&!(await C.$('.est.si')),'el plato sin datos sale como «Consultar», no como «Sin lo marcado»');
await C.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/cq-comensal.png',fullPage:true});
const swC=await C.evaluate(()=>document.documentElement.scrollWidth);ok(!C.errs.length&&swC<=390,`comensal: sin errores (${C.errs.join(';')}) ancho ${swC}`);
// 3) Retirar
await A.click('[data-cq="volver"]');await A.waitForTimeout(200);
ok(/Sin alérgenos registrados: Ensalada de la huerta/.test(await A.textContent('#cq-root')),'carta del recetario: avisa al equipo del plato sin alérgenos');
await A.click('[data-cq="retirar"]');await A.waitForTimeout(800);
ok(filas()[0].publicada===false,'carta retirada');
await C.reload();await C.waitForTimeout(600);ok(/ya no está disponible/.test(await C.textContent('#app')),'el QR retirado ya no muestra la carta');
await C.goto('http://localhost:8765/carta.html');await C.waitForTimeout(300);ok(/Falta el código/.test(await C.textContent('#app')),'sin código: aviso');
// 4) Desde un evento: avisa de platos sin alérgenos
await A.click('[data-cq="nueva"]');await A.fill('#cq-titulo','Menú boda Peps');await A.selectOption('#cq-origen','evento');await A.waitForTimeout(150);
await A.selectOption('#cq-evento','1700000000001');await A.click('[data-cq="guardar"]');await A.waitForTimeout(1200);
const c2=filas().find(x=>x.titulo==='Menú boda Peps')||{contenido:{}};
ok((c2.contenido.platos||[]).length===2&&(c2.contenido.platos[0].alg||[]).includes('pescado'),'carta del evento con sus platos');
await A.click('[data-cq="volver"]');await A.waitForTimeout(200);
ok(/Sin alérgenos registrados: Plato sin ficha/.test(await A.textContent('#cq-root')),'aviso de plato sin alérgenos registrados');
// 5) Actualizar recoge el cambio de receta
await A.evaluate(()=>{const r=recetas.find(x=>x.id==='r2');r.alg=['mostaza']});
await A.click(`[data-cq="actualizar"][data-id="${c1.id}"]`);await A.waitForTimeout(800);
ok(JSON.stringify(filas().find(x=>x.id===c1.id).contenido.platos.find(p=>p.nombre==='Ensalada de la huerta').alg)==='["mostaza"]','«Actualizar» recoge los alérgenos nuevos');
// Permisos
N.PERFILES['u-coc']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
const K=await N.pagina(b,U,{yo:'u-coc'});await K.waitForTimeout(800);
ok(await K.evaluate(()=>document.querySelector('#acc-cartas').style.display==='none'),'cocina no ve Carta QR');
N.PERFILES['u-pepe']={hotel:'u-pepe',rol:'admin',hotel_nombre:'Bar Pepe',modulos:['base']};
const P=await N.pagina(b,U,{yo:'u-pepe'});await P.waitForTimeout(800);await P.evaluate(()=>aplicarRol('admin'));
ok(await P.evaluate(()=>document.querySelector('#acc-cartas').style.display==='none'),'cliente sin «Seguridad alimentaria» no ve Carta QR');
for(const [n,p] of [['A',A],['K',K],['P',P]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
