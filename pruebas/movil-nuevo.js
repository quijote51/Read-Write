const {chromium}=require('playwright');const N=require('./nube.js');
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';
N.DB.config.push({hotel_id:'h1',key:'seda_precios',updated_at:T,value:{'Presa ibérica':{precio:0.05,ud:'g'}}});
N.DB.config.push({hotel_id:'h1',key:'seda_tipos',updated_at:T,value:[{id:'banquete',label:'Banquete real'}]});
N.DB.vajilla.push({hotel_id:'h1',id:'v1',nombre:'Plato llano REAL',cat:'platos',stock:7,factor_coctel:1,factor_menu:1,notas:'nuestro',img:null});
// Móvil nuevo (o tras cerrar sesión): no tiene nada guardado
const A=await N.pagina(b,'http://localhost:8765/index.html');await A.waitForTimeout(1500);
ok(N.DB.config.find(c=>c.key==='seda_precios').value['Presa ibérica'].precio===0.05,'los precios reales no se pisan con los de ejemplo');
ok(JSON.stringify(N.DB.config.find(c=>c.key==='seda_tipos').value)==='[{"id":"banquete","label":"Banquete real"}]','los tipos de servicio reales no se pisan');
const v=N.DB.vajilla.find(x=>x.id==='v1');ok(v.nombre==='Plato llano REAL'&&v.stock===7,'la vajilla real no se pisa con la de ejemplo');
ok(await A.evaluate(()=>preciosIng['Presa ibérica'].precio)===0.05&&await A.evaluate(()=>vajilla.find(x=>x.id==='v1').stock)===7,'el móvil nuevo se queda con los datos reales');
ok(!A.errs.length,'sin errores '+A.errs.join(';'));
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
