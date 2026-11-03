// Hojas de evento por departamento: cocina, sala y montaje; roles; imprimir y aviso si el evento cambia; compartir.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const d=n=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
N.DB.eventos.push({hotel_id:'h1',id:'1700000000001',nombre:'Boda Peps',fecha:d(1),hora:'14:00',pax:40,tipo:'menu',lugar:'Salón Alhambra',alergias_txt:'2 pax celíacos',alergenos_menu:[],
  platos:[{nombre:'Croquetas de jamón',cat:'C',alg:['gluten','lacteo']},{nombre:'Merluza a la bilbaína',cat:'M',alg:['pescado']},{nombre:'Tarta de queso',cat:'P',alg:['lacteo','huevo']}],
  infantil:null,factor_custom:1,precio_venta:60,notas:'Brindis a las 16:00',personal_ids:['p1'],bebidas:{vino_blanco:{activo:true,botellas_extra:2},agua:{activo:true,botellas_extra:0}},notas_bebidas:'Cava en la llegada'});
N.DB.personal.push({hotel_id:'h1',id:'p1',nombre:'Lucía',rol:'maitre',tel:''});
N.DB.vajilla.push({hotel_id:'h1',id:'v1',nombre:'Plato llano',cat:'platos',stock:30,factor_coctel:0,factor_menu:1,notas:'',img:null},{hotel_id:'h1',id:'v2',nombre:'Copa de vino',cat:'cristal',stock:100,factor_coctel:1,factor_menu:1,notas:'',img:null});
const A=await N.pagina(b,U);await A.waitForTimeout(500);
await A.evaluate(()=>{aplicarRol('admin');showTab('hojas')});await A.waitForTimeout(300);
const hoja=()=>A.textContent('#hj-hoja');
ok(await A.isVisible('[data-hjd="sala"]')&&await A.isVisible('[data-hjd="montaje"]'),'admin: las tres hojas');
let t=await hoja();
ok(/Hoja de cocina/.test(t)&&/Boda Peps/.test(t)&&/40 raciones/.test(t)&&/Croquetas de jamón/.test(t)&&/2 pax celíacos/.test(t)&&/Brindis/.test(t),'cocina: raciones, platos, alergias y notas');
await A.click('[data-hjd="sala"]');t=await hoja();
ok(/Orden del menú/.test(t)&&/Merluza/.test(t)&&/Pescado/.test(t)&&/Vino blanco/.test(t)&&/Cava en la llegada/.test(t)&&/Lucía \(Maître\)/.test(t)&&!/raciones/.test(t),'sala: menú con alérgenos, bebidas y personal (sin raciones)');
await A.click('[data-hjd="montaje"]');t=await hoja();
ok(/Vajilla necesaria/.test(t)&&/Plato llano/.test(t)&&/faltan 10/.test(t)&&/Salón Alhambra/.test(t),'montaje: vajilla con faltas y lugar');
// Imprimir la de sala y cambiar el evento
await A.click('[data-hjd="sala"]');await A.evaluate(()=>{window.print=()=>{}});await A.click('[data-hj="imprimir"]');await A.waitForTimeout(1700);
ok(/Igual que la impresa/.test(await A.textContent('#hj-root')),'impresa: «igual que la impresa»');
const pr=await A.evaluate(()=>document.getElementById('hj-print').innerText);ok(/Hoja de sala/.test(pr)&&/Seda|Oído/.test(pr),'hoja impresa');
await A.evaluate(()=>{const e=eventos.find(x=>x.nombre==='Boda Peps');e.pax=45;e.platos.push({nombre:'Sorbete de limón',cat:'P',alg:[]});initHojas();avisosRecalcular()});await A.waitForTimeout(200);
t=await A.textContent('#hj-root');
ok(/Ha cambiado desde que la imprimiste/.test(t)&&/Personas/.test(t)&&/Menú/.test(t),'tras cambiar el evento: aviso con lo cambiado (personas, menú)');
await A.click('#av-btn');await A.waitForTimeout(300);ok(/Hoja de sala cambiada: Boda Peps/.test(await A.textContent('#av-modal')),'aviso en la campana');
await A.evaluate(()=>{document.getElementById('av-modal').style.display='none'});
await A.click('[data-hjd="cocina"]');ok(!/Ha cambiado/.test(await A.textContent('#hj-root')),'la de cocina no se imprimió: sin aviso');
// Compartir como texto
const txt=await A.evaluate(async()=>{let r='';navigator.share=async o=>{r=o.text};document.querySelector('[data-hj="compartir"]').click();await new Promise(z=>setTimeout(z,100));return r});
ok(/\*Hoja de cocina · Boda Peps\*/.test(txt)&&/Croquetas de jamón ×45/.test(txt),'compartir: texto con 45 raciones');
// Roles
await A.evaluate(()=>{rolActual='cocina';aplicarRol('cocina');showTab('hojas');initHojas()});await A.waitForTimeout(200);
ok(!(await A.$('[data-hjd]'))&&/Hoja de cocina/.test(await hoja()),'cocina: solo su hoja');
await A.evaluate(()=>{rolActual='sala';aplicarRol('sala');showTab('hojas');initHojas()});await A.waitForTimeout(200);
ok(await A.isVisible('[data-hjd="montaje"]')&&!(await A.$('[data-hjd="cocina"]'))&&/Hoja de sala/.test(await hoja()),'sala: sala y montaje');
const sw=await A.evaluate(()=>document.documentElement.scrollWidth);ok(!A.errs.length&&sw<=390,`sin errores (${A.errs.join(';')}) ancho ${sw}`);
await A.evaluate(()=>{rolActual='admin';aplicarRol('admin');showTab('hojas');initHojas()});await A.click('[data-hjd="cocina"]');
await (await A.$('#tab-hojas')).screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/hj.png'});
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
