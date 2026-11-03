// Apps sueltas de Desperdicio y Carta QR: abren, guardan en la misma nube y respetan rol y módulo.
const {chromium}=require('playwright');const N=require('./nube.js');const fs=require('fs');const H='http://localhost:8765/';
const NM=process.env.QR_NM||'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/qr/node_modules';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
N.DB.recetas.push({hotel_id:'h1',id:'r1',nombre:'Tarta de queso',cat:'Postres',emoji:'🍰',alg:['lacteo','gluten'],ingredientes:[],img:null,base:false,rinde:null,extra:{},borrado:false});
N.DB.config.push({hotel_id:'h1',key:'seda_ajustes',updated_at:'2026-11-03T10:00:00.000Z',value:{hotel_nombre:'Seda Club Hotel',hotel_ciudad:'Granada',lugares:[]}});
// Desperdicio
const D=await N.pagina(b,H+'desperdicio.html');await D.waitForTimeout(800);
ok(await D.isVisible('#dp-root .dp-tabs'),'app Desperdicio abre');
await D.selectOption('#dp-tipo','produccion');await D.selectOption('#dp-dest','donado');await D.fill('#dp-kg','3');await D.click('[data-dp="guardar"]');await D.waitForTimeout(1500);
const reg=((N.DB.config.find(c=>c.key==='seda_desperdicio')||{value:{}}).value.reg||[]);
ok(reg.length===1&&reg[0].kg===3,'el registro llega a la nube');
ok(await D.evaluate(()=>!!document.querySelector('link[rel=manifest][href="/manifest-desperdicio.json"]')),'manifest propio');
// Carta QR
const C=await N.pagina(b,H+'cartas.html');await C.route(/qrcode-generator/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(NM+'/qrcode-generator/qrcode.js','utf8')}));await C.waitForTimeout(800);
ok(await C.isVisible('[data-cq="nueva"]'),'app Carta QR abre');
await C.click('[data-cq="nueva"]');await C.fill('#cq-titulo','Postres');await C.check('[data-rec="r1"]');await C.click('[data-cq="guardar"]');await C.waitForTimeout(1200);
const c1=(N.DB.cartas_publicas||[])[0]||{contenido:{}};
ok(c1.titulo==='Postres'&&JSON.stringify(c1.contenido.platos[0].alg)==='["gluten","lacteo"]'&&c1.contenido.hotel==='Seda Club Hotel','carta guardada con sus alérgenos y el nombre del hotel');
ok(!!(await C.$('#cq-poster svg')),'cartel con QR');
await C.click('[data-cq="volver"]');await C.waitForTimeout(200);
// Roles y módulos
N.PERFILES['u-coc']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
N.PERFILES['u-ev']={hotel:'h1',rol:'eventos',nombre:'Eva',hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
N.PERFILES['u-pepe']={hotel:'u-pepe',rol:'admin',hotel_nombre:'Bar Pepe',modulos:['base']};
const Kd=await N.pagina(b,H+'desperdicio.html',{yo:'u-coc'});await Kd.waitForTimeout(800);ok(await Kd.isVisible('#dp-root .dp-tabs'),'cocina usa Desperdicio');
const Kc=await N.pagina(b,H+'cartas.html',{yo:'u-coc'});await Kc.waitForTimeout(800);ok(/Tu rol no usa esta app/.test(await Kc.textContent('main')),'cocina no usa Carta QR');
const Ec=await N.pagina(b,H+'cartas.html',{yo:'u-ev'});await Ec.waitForTimeout(800);ok(await Ec.isVisible('[data-cq="nueva"]'),'eventos usa Carta QR');
const Ed=await N.pagina(b,H+'desperdicio.html',{yo:'u-ev'});await Ed.waitForTimeout(800);ok(/Tu rol no usa esta app/.test(await Ed.textContent('main')),'eventos no usa Desperdicio');
const Pd=await N.pagina(b,H+'cartas.html',{yo:'u-pepe'});await Pd.waitForTimeout(800);ok(/no está incluida en vuestro plan/.test(await Pd.textContent('main')),'cliente sin «Seguridad»: no incluida');
// Enlaces en Ajustes
const A=await N.pagina(b,H+'index.html');ok(await A.evaluate(()=>!!document.querySelector('a[href="/desperdicio.html"]')&&!!document.querySelector('a[href="/cartas.html"]')),'enlaces en Ajustes → Apps con acceso directo');
for(const [n,p] of [['D',D],['C',C],['Kd',Kd],['Kc',Kc],['Ec',Ec],['Ed',Ed],['Pd',Pd],['A',A]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
await D.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/app-dp.png'});await C.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/app-cq.png'});
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
