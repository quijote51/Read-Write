const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let fallos=0;const ok=(c,t)=>{if(!c)fallos++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const ev=(id,nombre,pax)=>({hotel_id:'h1',id:String(id),nombre,fecha:'2026-11-20',hora:'14:00',pax,tipo:'banquete',lugar:'Salón',alergias_txt:'',alergenos_menu:[],platos:[{nombre:'Presa ibérica',cat:'M',alg:[]}],infantil:null,factor_custom:null,precio_venta:50,notas:'',personal_ids:[],bebidas:null,notas_bebidas:''});
N.DB.eventos.push(ev(1700000000001,'Boda Peps',15),ev(1700000000002,'Cumpleaños Eva',20));
N.DB.vajilla.push({hotel_id:'h1',id:'v1',nombre:'Plato llano',cat:'platos',stock:100,factor_coctel:1,factor_menu:1,notas:'',img:null});
N.DB.recetas.push({hotel_id:'h1',id:'r1',nombre:'Tarta',cat:'P',emoji:'🍰',alg:[],ingredientes:[{nombre:'Queso',cant:80,ud:'g',alg:[]}],img:null,base:false,rinde:null,extra:{},borrado:false});
// Un aparato «antiguo» con una versión vieja de la boda guardada en el móvil y sin memoria de la nube
const A=await N.pagina(b,U),B=await N.pagina(b,U);
const evNube=id=>N.DB.eventos.find(e=>e.id===String(id));
ok(await A.evaluate(()=>eventos.filter(e=>e.id>1e6).length)===2,'A ve los 2 eventos de la nube');
// 1) Cambios a la vez en eventos distintos
N.log.length=0;
await A.evaluate(()=>{eventos.find(e=>e.id===1700000000001).pax=18;saveEv(eventos)});
await B.evaluate(()=>{eventos.find(e=>e.id===1700000000002).nombre='Cumple Eva (50 años)';saveEv(eventos)});
await A.waitForTimeout(1500);
console.log('   subidas:',N.log.join(' | '));
ok(evNube(1700000000001).pax===18,'cambio de A guardado (boda 18 pax)');
ok(evNube(1700000000002).nombre==='Cumple Eva (50 años)','cambio de B guardado sin pisar el de A');
ok(N.log.length===2&&N.log.every(l=>!/,/.test(l)),'cada uno sube solo el evento que ha cambiado');
ok(!N.DB.eventos.some(e=>+e.id<1e6),'los eventos de demostración no se suben');
// 2) B lleva rato sin recargar (tiene la boda con 15 pax) y cambia las notas de la boda
await B.evaluate(()=>{eventos.find(e=>e.id===1700000000001).notas='Mesa presidencial redonda';saveEv(eventos)});
await B.waitForTimeout(1500);
ok(evNube(1700000000001).pax===18&&evNube(1700000000001).notas==='Mesa presidencial redonda','se juntan: quedan los 18 pax de A y las notas de B');
ok(await B.evaluate(()=>eventos.find(e=>e.id===1700000000001).pax)===18,'B se queda con lo juntado (18 pax)');
ok(!/otra persona cambió/.test(await B.evaluate(()=>document.body.innerText)),'sin aviso: no tocaron el mismo dato');
// 3) A borra el cumpleaños; B (sin recargar) guarda otra cosa: no debe resucitarlo
await A.evaluate(()=>{eventos=eventos.filter(e=>e.id!==1700000000002);saveEv(eventos)});await A.waitForTimeout(1200);
ok(!evNube(1700000000002),'borrado en la nube');
await B.evaluate(()=>{eventos.find(e=>e.id===1700000000001).hora='13:30';saveEv(eventos)});await B.waitForTimeout(1500);
ok(!evNube(1700000000002),'B guardando otra cosa no resucita el evento borrado');
// 4) Evento nuevo en A, B recarga y ve todo
await A.evaluate(()=>{eventos.push({id:1793800000000,nombre:'Cóctel Navidad',fecha:'2026-12-20',hora:'20:00',pax:80,tipo:'coctel',lugar:'Azotea',alergias_txt:'',alergenos_menu:[],platos:[],notas:'',personal_ids:[]});saveEv(eventos)});await A.waitForTimeout(1200);
await B.reload();await B.waitForTimeout(1800);
const nb=await B.evaluate(()=>eventos.filter(e=>e.id>1e6).map(e=>e.nombre+':'+e.pax+':'+e.hora).sort().join(' | '));
ok(nb==='Boda Peps:18:13:30 | Cóctel Navidad:80:20:00','B tras recargar: '+nb);
// 5) Vajilla: mismo plato, campos distintos
await A.evaluate(()=>{vajilla.find(v=>v.id==='v1').stock=90;saveVaj(vajilla)});
await B.evaluate(()=>{vajilla.find(v=>v.id==='v1').notas='3 rotos';saveVaj(vajilla)});await B.waitForTimeout(1500);
const v=N.DB.vajilla.find(v=>v.id==='v1');ok(v.stock===90&&v.notas==='3 rotos','vajilla: se juntan stock de A y notas de B');
// 6) Recetas con campos desordenados por la nube: sin avisos falsos
await A.evaluate(()=>{recetas[0].ingredientes[0].cant=90;saveRec(recetas)});await A.waitForTimeout(1200);
await A.reload();await A.waitForTimeout(1800);
await A.evaluate(()=>{recetas[0].ingredientes[0].cant=95;saveRec(recetas)});await A.waitForTimeout(1500);
ok(N.DB.recetas[0].ingredientes[0].cant===95,'receta guardada tras recargar (95 g)');
ok(!/otra persona cambió/.test(await A.evaluate(()=>document.body.innerText)),'sin avisos falsos por el orden de los campos');
N.log.length=0;await A.reload();await A.waitForTimeout(1800);
ok(!N.log.length,'al abrir sin cambios no se sube nada: '+N.log.join(' | '));
// 7) Aparato que abre por primera vez la versión nueva con datos viejos en el móvil: no pisa la nube
const C=await N.pagina(b,'about:blank');
await C.goto(U.replace('index.html','sw.js'));await C.evaluate(()=>{localStorage.setItem('seda_rol','admin');localStorage.setItem('seda_ev',JSON.stringify([{id:1700000000001,nombre:'Boda Peps',fecha:'2026-11-20',hora:'14:00',pax:15,tipo:'banquete',lugar:'Salón',platos:[],alergenos_menu:[]}]))});
await C.goto(U);await C.waitForTimeout(1800);
ok(evNube(1700000000001).pax===18,'un aparato con datos viejos no pisa la nube al abrir (sigue en 18 pax)');
ok(await C.evaluate(()=>eventos.find(e=>e.id===1700000000001).pax)===18,'y se queda con lo de la nube');
// 8) Sin conexión: cambio pendiente que se sube al reabrir
N.setFallar((t,q)=>t==='eventos'&&q.op!=='select');
await A.evaluate(()=>{eventos.find(e=>e.id===1793800000000).pax=90;saveEv(eventos)});await A.waitForTimeout(1200);
N.setFallar(null);await A.reload();await A.waitForTimeout(1800);
ok(evNube(1793800000000).pax===90,'cambio hecho sin conexión se sube al reabrir');
for(const [n,p] of [['A',A],['B',B],['C',C]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) y ancho ${sw}`)}
console.log(fallos?`\n${fallos} FALLOS`:'\nTODO BIEN');await b.close()})();
