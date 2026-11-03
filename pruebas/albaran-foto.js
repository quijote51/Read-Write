// Foto del albarán: el botón manda la foto reducida y la lista de artículos, y rellena el albarán para revisar.
const {chromium}=require('playwright');const N=require('./nube.js');
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';
N.DB.config.push({hotel_id:'h1',key:'seda_inventario',updated_at:T,value:{articulos:[{s:'Carne',n:'PRESA',u:'KG',p:23.9},{s:'Lácteos',n:'MANTEQUILLA',u:'KG',p:10.89}],conteos:{'2026-10-26':{c:{0:1}}},ts:1}});
N.DB.proveedores.push({hotel_id:'h1',id:'p1',nombre:'Cárnicas Granada',tel:'',cat:'carne'});
N.FUNCIONES['leer-albaran']=body=>({data:{proveedor:'Cárnicas Granada',numero:'A-101',fecha:'2026-11-02',lineas:[{texto:'PRESA IBERICA',articulo:'PRESA',cantidad:5.2,unidad:'KG',importe:124.28},{texto:'CHORIZO CULAR',articulo:null,cantidad:2,unidad:'KG',importe:31}],total:155.28,notas:'Importes sin IVA'}});
const big=await (async()=>{const p2=await b.newPage({viewport:{width:2400,height:3200}});await p2.setContent('<div style="font:40px serif;padding:40px">ALBARÁN A-101<br>PRESA IBERICA 5,2 KG 124,28</div>');const x=await p2.screenshot({type:'png'});await p2.close();return x})();
for(const url of ['index.html','albaranes.html']){
  N.LLAMADAS.length=0;
  const p=await N.pagina(b,'http://localhost:8765/'+url);await p.waitForTimeout(800);
  if(url==='index.html')await p.evaluate(()=>{aplicarRol('admin');showTab('costes')}),await p.waitForTimeout(300);
  ok(await p.isVisible('label.co-foto'),url+': botón «Leer con foto»');
  await p.setInputFiles('#co-foto',{name:'a.png',mimeType:'image/png',buffer:big});await p.waitForTimeout(1500);
  const ll=N.LLAMADAS[0];
  ok(ll&&ll.body.tipo==='image/jpeg'&&ll.body.imagen.length>1000&&ll.body.articulos.includes('PRESA (KG)')&&ll.body.proveedores.includes('Cárnicas Granada'),url+': manda la foto reducida, los artículos y los proveedores');
  ok(ll&&ll.body.imagen.length<700000,url+': la foto va reducida ('+Math.round((ll?ll.body.imagen.length:0)/1024)+' KB en texto)');
  const v=await p.evaluate(()=>({prov:document.getElementById('co-prov').value,num:document.getElementById('co-num').value,fecha:document.getElementById('co-fecha').value,arts:[...document.querySelectorAll('#co-lineas [data-k="a"]')].map(i=>i.value),cant:[...document.querySelectorAll('#co-lineas [data-k="cant"]')].map(i=>i.value),imp:[...document.querySelectorAll('#co-lineas [data-k="imp"]')].map(i=>i.value),msg:(document.querySelector('#co-root .hz-aviso')||{}).textContent||''}));
  ok(v.prov==='Cárnicas Granada'&&v.num==='A-101'&&v.fecha==='2026-11-02','rellena proveedor, número y fecha');
  ok(v.arts.join('|')==='PRESA|CHORIZO CULAR'&&v.cant.join('|')==='5,2|2'&&v.imp.join('|')==='124,28|31','rellena las líneas ('+v.arts.join('|')+')');
  ok(/Revisa/.test(v.msg)&&/1 no están en el inventario/.test(v.msg)&&/sin IVA/.test(v.msg),'avisa de revisar, del artículo nuevo y de la nota');
  ok(await p.isVisible('[data-co="altaart"]'),'la línea nueva ofrece «Añadirlo al inventario»');
  if(url==='index.html'){await p.locator('#co-root .card').first().screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/alb-foto.png'})}
  ok(!p.errs.length&&await p.evaluate(()=>document.documentElement.scrollWidth)<=390,url+': sin errores ('+p.errs.join(';')+')');
}
// Error del servidor (p. ej. sin activar): mensaje claro
N.FUNCIONES['leer-albaran']=()=>({error:'La lectura con foto no está activada todavía.'});
const q=await N.pagina(b,'http://localhost:8765/albaranes.html');await q.waitForTimeout(800);
await q.setInputFiles('#co-foto',{name:'a.png',mimeType:'image/png',buffer:big});await q.waitForTimeout(1200);
await q.route(/cdn\.jsdelivr/,r=>r.abort());ok(/no se ha podido descargar|internet/i.test(await q.textContent('#co-root')),'IA sin activar y sin poder descargar el lector gratis: lo explica');
// Sin cuenta: no sale el botón
const s=await N.pagina(b,'about:blank');await s.route(/supabase-js/,r=>r.abort());await s.goto('http://localhost:8765/index.html');
const sin=s.locator('text=Seguir sin cuenta');if(await sin.isVisible().catch(()=>false))await sin.click();await s.waitForTimeout(600);
await s.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none';aplicarRol('admin');showTab('costes')});
ok(await s.isVisible('label.co-foto'),'sin cuenta también sale el botón (lectura gratis en el móvil)');
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
