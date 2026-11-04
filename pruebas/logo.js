// Logo de cada cliente: subir en Ajustes (al almacén), cabecera, hoja impresa, ficha de alérgenos, carta QR y quitar.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
const LOGO=process.env.LOGO||'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/logo.png';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const A=await N.pagina(b,U);await A.waitForTimeout(600);
await A.evaluate(()=>{rolActual='admin';aplicarRol('admin');showTab('ajustes')});await A.waitForTimeout(300);
ok(/Sin logo/.test(await A.textContent('#aj-logo-vista')),'Ajustes: «Sin logo»');
await A.setInputFiles('input[onchange="subirLogo(this)"]',LOGO);await A.waitForTimeout(1500);
const url=await A.evaluate(()=>ajustes.hotel_logo);
ok(/^https:\/\/gxkxslkdqgwovgxcuzkr\.supabase\.co\/storage\/v1\/object\/public\/fotos\/h1\/logo\//.test(url||''),'el logo va al almacén: '+(url||'').slice(-40));
ok(N.log.some(l=>/foto sube logo/.test(l)),'subida registrada');
const cfg=()=>(N.DB.config.find(c=>c.key==='seda_ajustes')||{}).value||{};
ok(cfg().hotel_logo===url,'se guarda en los ajustes de la nube');
ok(await A.evaluate(()=>!!document.querySelector('#marca-cuadro img.marca-logo')),'cabecera: logo en el cuadro');
ok(await A.evaluate(()=>!!document.querySelector('#print-hotel-logo img')),'hoja impresa: logo');
ok(await A.evaluate(()=>!!document.querySelector('#aj-logo-vista img'))&&await A.isVisible('#aj-logo-quitar'),'Ajustes: vista previa y «Quitar»');
ok(await A.evaluate(()=>/<img/.test(htmlFichaAlergenos(eventos[0]))),'ficha de alérgenos: logo');
await A.evaluate(()=>scrollTo(0,0));await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/logo-cab.png',clip:{x:0,y:0,width:390,height:140}});
// Seguridad: un logo raro no se pinta
ok(await A.evaluate(()=>logoValido('javascript:alert(1)')===''&&logoValido('https://malo.com/x.png')===''&&logoValido('https://x.supabase.co/storage/v1/object/public/fotos/a" onerror="x')===''),'solo imágenes propias');
// Quitar
A.on('dialog',d=>d.accept());await A.click('#aj-logo-quitar');await A.waitForTimeout(1200);
ok(!(await A.evaluate(()=>ajustes.hotel_logo))&&!(await A.evaluate(()=>!!document.querySelector('#marca-cuadro img'))),'quitar: desaparece');
ok(N.log.some(l=>/foto borra logo/.test(l)),'borrado del almacén pedido');
// Sin sesión: el logo va dentro de los datos (reducido)
const S=await b.newPage({viewport:{width:390,height:800}});const errs=[];S.on('pageerror',e=>errs.push(e.message));
await S.route(/cdn\.jsdelivr|fonts\.g/,r=>r.abort());await S.goto(U);await S.waitForTimeout(500);
await S.click('text=Seguir sin cuenta');await S.waitForTimeout(500);
await S.evaluate(()=>{rolActual='admin';aplicarRol('admin');showTab('ajustes')});await S.setInputFiles('input[onchange="subirLogo(this)"]',LOGO);await S.waitForTimeout(800);
const loc=await S.evaluate(()=>ajustes.hotel_logo||'');ok(/^data:image\/(jpeg|png)/.test(loc)&&loc.length<60000,'sin sesión: dentro y reducido ('+loc.length+' car.)');
// App suelta (desperdicio) lee el logo guardado en el aparato
await S.goto('http://localhost:8765/desperdicio.html');await S.waitForTimeout(800);
ok(await S.evaluate(()=>hotelDatos().logo.startsWith('data:image')),'app suelta: usa el logo del aparato');
await S.goto(U);await S.waitForTimeout(600);
const sw=await A.evaluate(()=>document.documentElement.scrollWidth);
ok(!A.errs.length&&!errs.length&&sw<=390,`sin errores (${A.errs.concat(errs).join(';')}) ancho ${sw}`);
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
