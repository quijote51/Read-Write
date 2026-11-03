const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';const cfg=k=>N.DB.config.find(c=>c.key===k).value;
const arts=[];for(let i=0;i<20;i++)arts.push({s:'Pescado',n:'ART '+i,u:'KG',p:10+i});
N.DB.config.push({hotel_id:'h1',key:'seda_inventario',updated_at:T,value:{articulos:arts,conteos:{'2026-10-26':{c:{0:1,1:2}},'2026-11-03':{c:{}}},ts:1}});
N.DB.config.push({hotel_id:'h1',key:'seda_precios',updated_at:T,value:{'Salmón':{precio:0.022,ud:'g'},'Nata':{precio:0.003,ud:'ml'},'Queso':{precio:0.01,ud:'g'}}});
const A=await N.pagina(b,U+'index.html'),B=await N.pagina(b,U+'index.html');
// 1) Precios distintos a la vez
await A.evaluate(()=>{preciosIng['Salmón'].precio=0.025;savePrecios(preciosIng)});
await B.evaluate(()=>{preciosIng['Nata'].precio=0.004;savePrecios(preciosIng)});
await A.waitForTimeout(1600);
ok(cfg('seda_precios')['Salmón'].precio===0.025&&cfg('seda_precios')['Nata'].precio===0.004,'precios: se guardan los dos cambios (salmón de A y nata de B)');
ok(await B.evaluate(()=>preciosIng['Salmón'].precio)===0.025,'B se queda con lo juntado (ve el salmón de A)');
// 2) Contar artículos distintos del mismo inventario a la vez + cambiar un precio
await A.evaluate(()=>{inventario.conteos['2026-11-03'].c[0]=5;inventario.articulos[3].p=99;syncConfig('seda_inventario',inventario)});
await B.evaluate(()=>{inventario.conteos['2026-11-03'].c[7]=2.5;syncConfig('seda_inventario',inventario)});
await A.waitForTimeout(1600);
let inv=cfg('seda_inventario');
ok(inv.conteos['2026-11-03'].c['0']===5&&inv.conteos['2026-11-03'].c['7']===2.5,'inventario: se guardan las dos cantidades contadas (art. 0 de A y art. 7 de B)');
ok(inv.articulos[3].p===99&&inv.articulos.length===20,'inventario: el precio cambiado se mantiene y siguen los 20 artículos');
// 3) Los dos añaden un artículo nuevo a la vez
await A.evaluate(()=>{inventario.articulos.push({s:'Carne',n:'PRESA',u:'KG',p:23.9});syncConfig('seda_inventario',inventario)});
await B.evaluate(()=>{inventario.articulos.push({s:'Verdura',n:'CHALOTA',u:'KG',p:2.95});syncConfig('seda_inventario',inventario)});
await A.waitForTimeout(1600);
inv=cfg('seda_inventario');const nombres=inv.articulos.map(a=>a.n);
ok(nombres.includes('PRESA')&&nombres.includes('CHALOTA')&&nombres.length===22,'inventario: quedan los dos artículos nuevos ('+nombres.slice(20).join(', ')+')');
// 4) Guardar exactamente a la vez (sin esperar): el segundo nota que el otro se adelantó y vuelve a juntar
await Promise.all([A.evaluate(()=>{preciosIng['Queso'].precio=0.02;return _subirConfig('seda_precios',preciosIng)}),B.evaluate(()=>{preciosIng['Nueva']={precio:1,ud:'ud'};return _subirConfig('seda_precios',preciosIng)})]);
const pr=cfg('seda_precios');ok(pr['Queso'].precio===0.02&&pr['Nueva']&&pr['Salmón'].precio===0.025,'guardando en el mismo instante no se pierde nada');
// 5) Mismo dato a la vez: queda el último y avisa
await A.evaluate(()=>{preciosIng['Nata'].precio=0.005;savePrecios(preciosIng)});await A.waitForTimeout(1200);
await B.evaluate(()=>{preciosIng['Nata'].precio=0.006;savePrecios(preciosIng)});await B.waitForTimeout(1500);
ok(cfg('seda_precios')['Nata'].precio===0.006,'mismo precio cambiado por los dos: queda el último');
ok(/otra persona cambió lo mismo/.test(await B.evaluate(()=>document.body.innerText)),'y se avisa');
// 6) Horarios: semanas distintas
const sem=await A.evaluate(()=>Object.keys(horarios.semanas||{}));
console.log('   semanas:',sem.length);
await A.evaluate(()=>{horarios.semanas['2030-01-07']={prueba:'A'};horarios.wts=horarios.wts||{};horarios.wts['2030-01-07']=Date.now();syncConfig('seda_horarios',horarios)});
await B.evaluate(()=>{horarios.semanas['2030-01-14']={prueba:'B'};horarios.wts=horarios.wts||{};horarios.wts['2030-01-14']=Date.now();syncConfig('seda_horarios',horarios)});
await A.waitForTimeout(1600);
const hz=cfg('seda_horarios');ok(hz.semanas['2030-01-07']&&hz.semanas['2030-01-14'],'horarios: se guardan las dos semanas');
// 7) App suelta de Inventario y app principal contando a la vez
const C=await N.pagina(b,U+'inventario.html');
await C.evaluate(()=>{inventario.conteos['2026-11-03'].c[9]=4;return subir('seda_inventario',inventario)});
await A.evaluate(()=>{inventario.conteos['2026-11-03'].c[10]=6;return _subirConfig('seda_inventario',inventario)});
inv=cfg('seda_inventario');ok(inv.conteos['2026-11-03'].c['9']===4&&inv.conteos['2026-11-03'].c['10']===6&&inv.conteos['2026-11-03'].c['7']===2.5,'app de Inventario y app principal contando a la vez: se guarda todo');
// 8) Albaranes cambia un precio mientras la app principal cuenta
const D=await N.pagina(b,U+'albaranes.html');
await D.evaluate(()=>{inventario.articulos[5].p=55;return subirConfig('seda_inventario',inventario)});
await A.evaluate(()=>{inventario.conteos['2026-11-03'].c[11]=1;return _subirConfig('seda_inventario',inventario)});
inv=cfg('seda_inventario');ok(inv.articulos[5].p===55&&inv.conteos['2026-11-03'].c['11']===1,'albarán (precio) y recuento a la vez: se guardan los dos');
// 9) Inventario vacío sigue sin subirse
await A.evaluate(()=>_subirConfig('seda_inventario',{articulos:[],conteos:{}}));ok(cfg('seda_inventario').articulos.length===22,'un inventario vacío sigue sin poder borrar el de la nube');
for(const [n,p] of [['A',A],['B',B],['Inventario',C],['Albaranes',D]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=412,`${n}: sin errores (${p.errs.join(';')})`)}
ok(!N.rechazos.length,'ninguna columna rechazada '+N.rechazos.join(','));
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
