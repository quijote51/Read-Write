const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const big=await (async()=>{const p2=await b.newPage({viewport:{width:2400,height:1800}});await p2.setContent('<div style="width:2400px;height:1800px;background:linear-gradient(45deg,red,blue,green)"></div>');const x=await p2.screenshot({type:'png'});await p2.close();return x})();
const filaRec=id=>N.DB.recetas.find(r=>r.id===id);
// 0) Ya había una receta con la foto dentro de los datos (sistema viejo)
const viejo='data:image/png;base64,'+big.toString('base64').slice(0,0)+'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
N.DB.recetas.push({hotel_id:'h1',id:'r1',nombre:'Tarta',cat:'P',emoji:'🍰',alg:[],ingredientes:[],img:viejo,base:false,rinde:null,extra:{},borrado:false});
N.DB.vajilla.push({hotel_id:'h1',id:'v1',nombre:'Plato',cat:'platos',stock:5,factor_coctel:1,factor_menu:1,notas:'',img:null});
// A) Almacén aún sin crear (no se ha pegado el SQL): todo sigue como antes, sin errores
N.setAlmacen(false);
const A=await N.pagina(b,U);await A.waitForTimeout(1500);
await A.evaluate(()=>verReceta('r1'));await A.setInputFiles('#receta-detalle-view input[type=file]',{name:'f.png',mimeType:'image/png',buffer:big});await A.waitForTimeout(2000);
ok((await A.evaluate(()=>recetas.find(r=>r.id==='r1').img)).startsWith('data:image/jpeg'),'sin almacén: la foto se guarda dentro, como antes');
ok(!A.errs.length,'sin almacén: sin errores');
// B) Almacén creado: al abrir, la foto vieja pasa al almacén
N.setAlmacen(true);N.log.length=0;
await A.reload();await A.waitForTimeout(2500);
let img=filaRec('r1').img;
ok(/\/storage\/v1\/object\/public\/fotos\/h1\/recetas\/r1-/.test(img),'al abrir, la foto que iba dentro pasa al almacén y en la nube queda solo el enlace ('+img.length+' letras)');
ok(Object.keys(N.ALMACEN).length===1,'hay 1 foto en el almacén');
// C) Cambiar la foto: se sube la nueva y se borra la vieja
await A.evaluate(()=>{if(!document.getElementById('receta-detalle-view').offsetParent){showTab('recetario')};verReceta('r1')});
await A.setInputFiles('#receta-detalle-view input[type=file]',{name:'g.png',mimeType:'image/png',buffer:big});await A.waitForTimeout(2500);
const img2=filaRec('r1').img;ok(img2!==img&&/fotos\/h1\/recetas\/r1-/.test(img2)&&Object.keys(N.ALMACEN).length===1,'al cambiar la foto: se sube la nueva y se borra la vieja (queda 1)');
const vis=await A.evaluate(()=>{const i=document.querySelector('#receta-detalle-view img');return i&&i.complete&&i.naturalWidth>0});ok(vis,'la foto se ve en la ficha');
// D) Vajilla
await A.evaluate(()=>{showTab('vajilla');verDetallePieza('v1')});await A.waitForTimeout(300);
await A.setInputFiles('input[onchange^="subirFotoVajilla"]',{name:'h.png',mimeType:'image/png',buffer:big});await A.waitForTimeout(2500);
ok(/fotos\/h1\/vajilla\/v1-/.test(N.DB.vajilla.find(v=>v.id==='v1').img||''),'foto de vajilla en el almacén');
// E) Otro móvil ve las fotos
const B=await N.pagina(b,U);await B.waitForTimeout(1500);
ok(await B.evaluate(()=>recetas.find(r=>r.id==='r1').img)===filaRec('r1').img,'otro móvil recibe el enlace de la foto');
// F) Sin cuenta: dentro, como antes
const C=await N.pagina(b,'about:blank');await C.route(/supabase-js/,r=>r.abort());await C.goto(U);
const sin=C.locator('text=Seguir sin cuenta');if(await sin.isVisible().catch(()=>false))await sin.click();await C.waitForTimeout(800);
await C.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none';aplicarRol('admin');showTab('recetario');verReceta('presa-iberica')});
await C.setInputFiles('#receta-detalle-view input[type=file]',{name:'f.png',mimeType:'image/png',buffer:big});await C.waitForTimeout(1500);
ok((await C.evaluate(()=>recetas.find(r=>r.id==='presa-iberica').img)).startsWith('data:image/jpeg'),'sin cuenta: la foto se guarda en el móvil');
console.log('   almacén:',N.log.filter(l=>l.startsWith('foto')).join(' | '));
for(const [n,p] of [['A',A],['B',B],['C',C]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')})`)}
ok(!N.rechazos.length,'ninguna columna rechazada');
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
