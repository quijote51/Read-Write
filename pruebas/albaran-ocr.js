// Lectura GRATIS en el móvil: foto de un albarán impreso → texto real con Tesseract → proveedor, número, fecha y líneas.
// La librería y el diccionario se sirven desde node_modules (sin internet en las pruebas).
const path=require('path'),fs=require('fs');const {chromium}=require('playwright');const N=require('./nube.js');
const NM=process.env.OCR_NM||'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/ocr/node_modules';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const T='2026-11-03T10:00:00.000Z';
N.DB.config.push({hotel_id:'h1',key:'seda_inventario',updated_at:T,value:{articulos:[{s:'Carne',n:'PRESA',u:'KG',p:23.9},{s:'Carne',n:'SOLOMILLO CERDO',u:'KG',p:8.25},{s:'Lácteos',n:'MANTEQUILLA',u:'KG',p:10.89},{s:'Verdura',n:'CHALOTAS',u:'KG',p:2.95}],conteos:{'2026-10-26':{c:{0:1}}},ts:1}});
N.DB.proveedores.push({hotel_id:'h1',id:'p1',nombre:'Cárnicas Granada',tel:'',cat:'carne'});
// Foto del albarán (impreso, como uno de verdad)
const foto=await (async()=>{const p2=await b.newPage({viewport:{width:1100,height:900}});await p2.setContent(`<div style="font:28px Arial;padding:40px;background:#fff;color:#111">
<b style="font-size:40px">CÁRNICAS GRANADA S.L.</b><br>CIF B18000000 · Tel 958 000 000<br><br>
ALBARÁN Nº A-1043 &nbsp;&nbsp;&nbsp; Fecha: 02/11/2026<br><br>
<table style="font:28px Arial;border-collapse:collapse" cellpadding="6"><tr><th align=left>Descripción</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr>
<tr><td>PRESA IBERICA</td><td>5,20</td><td>23,90</td><td>124,28</td></tr>
<tr><td>SOLOMILLO DE CERDO</td><td>3,00</td><td>8,25</td><td>24,75</td></tr>
<tr><td>CHORIZO CULAR</td><td>2,00</td><td>15,50</td><td>31,00</td></tr></table><br>
Base imponible 180,03 &nbsp; IVA 10% 18,00 &nbsp; TOTAL 198,03</div>`);const x=await p2.screenshot({type:'png'});await p2.close();return x})();
const p=await N.pagina(b,'http://localhost:8765/albaranes.html');await p.waitForTimeout(800);
// La IA no está activada: la función contesta error → se lee en el móvil
N.FUNCIONES['leer-albaran']=()=>({error:'La lectura con foto no está activada todavía.'});
const desvio=r=>{const u=new URL(r.request().url());let m=u.pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)(?:@v?[^/]+)?\/(.*)$/);
  const file=m&&path.join(NM,m[1],m[2]);if(file&&fs.existsSync(file))return r.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream'});console.log('   sin archivo:',u.pathname);r.abort()};
await p.context().route(/cdn\.jsdelivr\.net\/npm\//,desvio);await p.route(/cdn\.jsdelivr\.net\/npm\//,desvio);
const t0=Date.now();
await p.setInputFiles('#co-foto',{name:'a.png',mimeType:'image/png',buffer:foto});
await p.waitForFunction(()=>/Leído|No se han encontrado|No se ha podido|no está disponible|descargar/.test((document.querySelector('#co-root .hz-aviso')||{}).textContent||''),null,{timeout:90000});
console.log('   tardó',Math.round((Date.now()-t0)/1000),'s');
const v=await p.evaluate(()=>({prov:document.getElementById('co-prov').value,num:document.getElementById('co-num').value,fecha:document.getElementById('co-fecha').value,arts:[...document.querySelectorAll('#co-lineas [data-k="a"]')].map(i=>i.value),cant:[...document.querySelectorAll('#co-lineas [data-k="cant"]')].map(i=>i.value),imp:[...document.querySelectorAll('#co-lineas [data-k="imp"]')].map(i=>i.value),msg:document.querySelector('#co-root .hz-aviso').textContent}));
console.log('   ',JSON.stringify(v));
ok(v.prov==='Cárnicas Granada','proveedor reconocido');
ok(v.num==='A-1043','número de albarán: '+v.num);
ok(v.fecha==='2026-11-02','fecha: '+v.fecha);
const i=v.arts.indexOf('PRESA'),j=v.arts.indexOf('SOLOMILLO CERDO');
ok(i>=0&&v.cant[i]==='5,2'&&v.imp[i]==='124,28','presa: 5,2 kg y 124,28 €');
ok(j>=0&&v.cant[j]==='3'&&v.imp[j]==='24,75','solomillo de cerdo enlazado: 3 kg y 24,75 €');
ok(v.arts.some(a=>/CHORIZO/i.test(a)),'línea sin artículo (chorizo) para darla de alta');
ok(!v.arts.some(a=>/TOTAL|IVA|Base/i.test(a)),'no mete los totales como líneas');
ok(/gratis/.test(v.msg),'avisa de que se ha leído gratis en el móvil');
ok(!p.errs.length&&await p.evaluate(()=>document.documentElement.scrollWidth)<=390,'sin errores ('+p.errs.join(';')+')');
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
