const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let fallos=0;const ok=(c,t)=>{if(!c)fallos++;console.log((c?'✔':'✘ FALLO')+' '+t)};
// Como ahora en el hotel: plantillas solo en el móvil (nube vacía)
const A=await N.pagina(b,U);await A.waitForTimeout(800);
ok(N.DB.plantillas.length===9,'las 9 plantillas llegan a la nube: '+N.DB.plantillas.length);
ok(N.DB.plantillas.every(p=>p.descripcion&&!('desc' in p)),'la descripción se guarda en la columna «descripcion»');
ok(await A.evaluate(()=>localStorage.getItem('seda_pendiente'))!=='1','ya no queda nada «pendiente» para siempre');
// Otro móvil las ve con su descripción
const B=await N.pagina(b,U);
ok(await B.evaluate(()=>plantillas.length===9&&plantillas.every(p=>p.desc&&!p.descripcion)),'B ve las 9 plantillas con su descripción');
// Cambiar la descripción en B y el precio en A de la misma plantilla
await B.evaluate(()=>{plantillas.find(p=>p.id==='plt-seda').desc='Menú sentado renovado';savePlt(plantillas)});
await A.evaluate(()=>{plantillas.find(p=>p.id==='plt-seda').precio=70;savePlt(plantillas)});await A.waitForTimeout(1500);
const p=N.DB.plantillas.find(p=>p.id==='plt-seda');ok(p.descripcion==='Menú sentado renovado'&&p.precio===70,'se juntan descripción (B) y precio (A)');
// Plantilla nueva desde la app
await A.evaluate(()=>{plantillas.push({id:'plt-nueva',nombre:'Menú prueba',precio:40,color:'#000',factor:'menu',desc:'Prueba',bodega:'',platos:[]});savePlt(plantillas)});await A.waitForTimeout(1200);
ok(N.DB.plantillas.some(p=>p.id==='plt-nueva'&&p.descripcion==='Prueba'),'plantilla nueva guardada en la nube');
// Al abrir con algo pendiente, también se bajan los datos
await B.evaluate(()=>localStorage.setItem('seda_pendiente','1'));await B.reload();await B.waitForTimeout(2000);
ok(await B.evaluate(()=>plantillas.some(p=>p.id==='plt-nueva')),'al abrir con algo pendiente, también se bajan los cambios de los demás');
ok(!N.rechazos.length,'la nube no ha rechazado ninguna columna: '+N.rechazos.join(', '));
for(const [n,pg] of [['A',A],['B',B]]){const sw=await pg.evaluate(()=>document.documentElement.scrollWidth);ok(!pg.errs.length&&sw<=390,`${n}: sin errores (${pg.errs.join(';')}) y ancho ${sw}`)}
console.log(fallos?`\n${fallos} FALLOS`:'\nTODO BIEN');await b.close()})();
