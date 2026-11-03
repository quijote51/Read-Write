// Rendimiento de los ingredientes: % aprovechable en Precios, coste real en el escandallo y peso bruto en pedidos.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
N.DB.recetas.push({hotel_id:'h1',id:'r1',nombre:'Merluza a la bilbaína',cat:'Principal',emoji:'🐟',alg:['pescado'],ingredientes:[{nombre:'Merluza',cant:150,ud:'g'},{nombre:'Ajo',cant:5,ud:'g'},{nombre:'Lomo de bacalao',cant:10,ud:'g'}],img:null,base:false,rinde:null,extra:{},borrado:false});
N.DB.config.push({hotel_id:'h1',key:'seda_precios',updated_at:'2026-11-03T10:00:00.000Z',value:{Merluza:{precio:0.012,ud:'g'},Ajo:{precio:0.004,ud:'g'},'Lomo de bacalao':{precio:0.02,ud:'g'}}});
const A=await N.pagina(b,U);await A.waitForTimeout(500);
const coste=()=>A.evaluate(()=>Math.round(calcCosteReceta(recetas.find(r=>r.id==='r1'),1)*1000)/1000);
ok(await coste()===2.02,'sin rendimiento: 150×0,012 + 5×0,004 + 10×0,02 = 2,02 € ('+await coste()+')');
await A.evaluate(()=>{aplicarRol('admin');showTab('escandallo');switchEsc('precios')});await A.waitForTimeout(300);
const fila=n=>A.locator('#esc-precios-cont tr',{hasText:n});
ok(await fila('Merluza').locator('.rd-tip').textContent()==='Típico: 45 %','merluza: valor típico 45 %');
ok(await fila('Lomo de bacalao').locator('.rd-tip').count()===0,'«lomo» ya viene limpio: sin típico');
// Calculadora: 1000 g bruto → 500 g limpio
const respuestas=['1000','500'];A.on('dialog',d=>d.accept(respuestas.shift()));
await fila('Merluza').locator('.rd-calc').click();await A.waitForTimeout(1500);
ok(await fila('Merluza').locator('.rd-in').inputValue()==='50','calculadora: 50 %');
ok(await coste()===3.82,'escandallo con la merluza al 50 %: 3,82 € ('+await coste()+')');
ok(await fila('Merluza').locator('input[type=number]').inputValue()==='0.012','el precio de compra no cambia');
const nube=(N.DB.config.find(c=>c.key==='seda_precios')||{}).value||{};
ok(nube.Merluza&&nube.Merluza.rend===50&&nube.Merluza.precio===0.012,'guardado en la nube con el precio');
// Típico con un toque
await fila('Ajo').locator('.rd-tip').click();await A.waitForTimeout(200);ok(await fila('Ajo').locator('.rd-in').inputValue()==='85','ajo: típico 85 % con un toque');
// Fuera de rango
await fila('Ajo').locator('.rd-in').fill('150');await fila('Ajo').locator('.rd-in').press('Tab');await A.waitForTimeout(200);
ok(await A.evaluate(()=>preciosIng.Ajo.rend)===85,'150 % no se acepta');
// Escandallo del plato: nota
await A.evaluate(()=>switchEsc('plato'));await A.waitForTimeout(200);
ok(/aprovechable 50 %/.test(await A.textContent('#esc-plato-cont')),'el escandallo del plato indica el aprovechable');
// Pedido: 40 raciones de merluza al 50 % → 12 kg brutos
const ped=await A.evaluate(()=>{const ev={id:1,nombre:'X',pax:40,tipo:'banquete',factor_custom:1,platos:[{nombre:'Merluza a la bilbaína',receta_id:'r1'}]};return calcIngredientesPedido([ev],[]).find(i=>i.nombre==='Merluza').total});
ok(ped===12000,'pedido: 40 × 150 g / 50 % = 12 kg en bruto ('+ped+')');
// Borrar el rendimiento vuelve al 100 %
await A.evaluate(()=>switchEsc('precios'));await A.waitForTimeout(200);
await fila('Merluza').locator('.rd-in').fill('');await fila('Merluza').locator('.rd-in').press('Tab');await A.waitForTimeout(200);
ok(await A.evaluate(()=>preciosIng.Merluza.rend===undefined)&&await coste()===2.024,'vacío = 100 % (el ajo sigue al 85 %): '+await coste());
const sw=await A.evaluate(()=>document.documentElement.scrollWidth);ok(!A.errs.length&&sw<=390,`sin errores (${A.errs.join(';')}) ancho ${sw}`);
await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/rd.png',fullPage:false});
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
