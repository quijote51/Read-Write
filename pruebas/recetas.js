const {chromium}=require('playwright');const N=require('./nube.js');
const U='http://localhost:8765/';
(async()=>{const b=await chromium.launch();const ok=(c,t)=>console.log((c?'✔':'✘ FALLO')+' '+t);
// Nube con el estado actual del hotel: 3 recetas en config.seda_rec, tabla vacía
N.DB.config.push({hotel_id:'h1',key:'seda_rec',value:[
 {id:'presa-iberica',nombre:'Presa ibérica',cat:'M',emoji:'🥩',alg:['sulfitos'],ingredientes:[{nombre:'Presa ibérica',cant:180,ud:'g',alg:[]}]},
 {id:'c-1',nombre:'Salsa bordalesa',cat:'C',emoji:'🥣',alg:['sulfitos'],ingredientes:[{nombre:'Vino tinto',cant:600,ud:'ml',alg:[]}],base:true,rinde:{cant:1,ud:'kg'}},
 {id:'c-2',nombre:'Croquetas',cat:'C',emoji:'🍘',alg:['gluten'],ingredientes:[{nombre:'Harina',cant:20,ud:'g',alg:['gluten']}],nota:'campo raro'}]});
// 1) Migración
const A=await N.pagina(b,U+'index.html');
ok(N.DB.recetas.length===3,'migración: la tabla tiene '+N.DB.recetas.length+' recetas');
ok(await A.evaluate(()=>recetas.length)===3,'el móvil A ve 3 recetas');
const fil=N.DB.recetas.find(r=>r.id==='c-1');ok(fil.base===true&&fil.rinde.ud==='kg','la elaboración base conserva rinde');
ok(N.DB.recetas.find(r=>r.id==='c-2').extra.nota==='campo raro','campos sin columna van a «extra»');
ok(N.DB.config.find(c=>c.key==='seda_rec').value.length===3,'config.seda_rec queda intacta como copia');
// 2) Segundo móvil
const B=await N.pagina(b,U+'index.html');
ok(await B.evaluate(()=>recetas.length)===3,'el móvil B ve 3 recetas');
N.log.length=0;
// A cambia Presa, B (sin recargar) cambia Croquetas a la vez
await A.evaluate(()=>{const r=recetas.find(x=>x.id==='presa-iberica');r.ingredientes[0].cant=200;saveRec(recetas)});
await B.evaluate(()=>{const r=recetas.find(x=>x.id==='c-2');r.nombre='Croquetas de jamón';saveRec(recetas)});
await A.waitForTimeout(1500);
console.log('   subidas:',N.log.join(' | '));
ok(N.DB.recetas.find(r=>r.id==='presa-iberica').ingredientes[0].cant===200,'se guarda el cambio de A (presa 200 g)');
ok(N.DB.recetas.find(r=>r.id==='c-2').nombre==='Croquetas de jamón','se guarda el cambio de B (croquetas) sin pisar el de A');
ok(N.log.every(l=>!/upsert .*,/.test(l)),'cada móvil sube solo la receta que ha cambiado');
// 3) Nueva receta en A, borrar en B
await A.evaluate(()=>{recetas.push({id:'c-9',nombre:'Fondo oscuro',cat:'C',emoji:'🥣',alg:['apio'],ingredientes:[{nombre:'Huesos',cant:3,ud:'kg',alg:[]}],base:true,rinde:{cant:5,ud:'l'}});saveRec(recetas)});
await B.evaluate(()=>{recetas.splice(recetas.findIndex(x=>x.id==='c-1'),1);saveRec(recetas)});
await A.waitForTimeout(1500);
ok(N.DB.recetas.find(r=>r.id==='c-1').borrado===true,'la receta borrada en B queda marcada como borrada (no se pierde)');
ok(!!N.DB.recetas.find(r=>r.id==='c-9'),'la receta nueva de A está en la nube');
console.log('   pendiente B antes de recargar:',await B.evaluate(()=>localStorage.getItem('seda_pendiente')));B.on('console',m=>{if(m.type()!=='log')console.log('   B',m.type(),m.text())});N.log.length=0;await B.reload();await B.waitForTimeout(1500);console.log('   log recarga B:',N.log.join(' / '));
const nb=await B.evaluate(()=>recetas.map(r=>r.nombre).sort().join(', '));
ok(nb==='Croquetas de jamón, Fondo oscuro, Presa ibérica','B tras recargar: '+nb);
ok(await B.evaluate(()=>recetas.find(r=>r.id==='presa-iberica').ingredientes[0].cant)===200,'B ve el cambio de A');
// 4) Sin conexión: A cambia algo, falla la subida, luego vuelve la conexión
N.setFallar((t,q)=>t==='recetas'&&q.op!=='select');
await A.evaluate(()=>{const r=recetas.find(x=>x.id==='c-9');r.nombre='Fondo oscuro de ternera';saveRec(recetas)});
await A.waitForTimeout(1200);
ok(await A.evaluate(()=>localStorage.getItem('seda_pendiente'))==='1','sin conexión: queda marcado como pendiente');
N.setFallar(null);
await A.evaluate(()=>reenviarTodo());await A.waitForTimeout(800);
ok(N.DB.recetas.find(r=>r.id==='c-9').nombre==='Fondo oscuro de ternera','al volver la conexión se sube lo pendiente');
// 5) Pendiente que sobrevive a cerrar la app: A cambia sin conexión y recarga con conexión
N.setFallar((t,q)=>t==='recetas'&&q.op!=='select');
await A.evaluate(()=>{const r=recetas.find(x=>x.id==='c-2');r.emoji='🧆';saveRec(recetas)});await A.waitForTimeout(1200);
N.setFallar(null);await A.reload();await A.waitForTimeout(1800);
ok(N.DB.recetas.find(r=>r.id==='c-2').emoji==='🧆','tras cerrar y abrir la app, lo pendiente se sube');
// 6) Escandallo y alérgenos siguen funcionando con la sub-receta borrada/nueva
ok(await A.evaluate(()=>algDeRecetaCompleta(recetas.find(r=>r.id==='c-9')).includes('apio')),'alérgenos de la elaboración base OK');
// 7) App suelta de alérgenos lee de la tabla
const C=await N.pagina(b,U+'alergenos.html');
await C.waitForTimeout(1000);const nc=await C.evaluate(()=>recetas.map(r=>r.nombre).sort().join(', '));ok(nc==='Croquetas de jamón, Fondo oscuro de ternera, Presa ibérica','la app suelta de Alérgenos lee las recetas de la tabla: '+nc);
for(const [n,p] of [['A',A],['B',B],['Alérgenos',C]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) y ancho ${sw}`)}
await b.close()})();
