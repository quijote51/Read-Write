const {chromium}=require('playwright');const N=require('./nube.js');
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const arts=[];for(let i=0;i<312;i++)arts.push({s:'Pescado',n:'A'+i,u:'KG',p:1});
N.DB.config.push({hotel_id:'h1',key:'seda_inventario',value:{articulos:arts,conteos:{'2026-10-26':{c:{0:1}}},ts:1}});
// 1) Mezcla de archivos (recetas-nube.js viejo): el inventario debe llegar igualmente
const p=await N.pagina(b,'http://localhost:8765/index.html');
await p.route('**/recetas-nube.js',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace(/function canonJSON\(v\)\{[\s\S]*?\n\}\n/,'');r.fulfill({body:t,contentType:'application/javascript'})});
await p.evaluate(()=>localStorage.removeItem('seda_inventario'));await p.reload();await p.waitForTimeout(1800);
await p.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none';aplicarRol('admin')});
const h=p.locator('#acc-inventario .acc-header');await h.scrollIntoViewIfNeeded();await h.click();await p.waitForTimeout(800);
const txt=await p.evaluate(()=>document.getElementById('tab-inventario').innerText.slice(0,40).replace(/\n/g,' / '));
ok(/Inventario del/.test(txt),'aunque falle otra parte de la carga, el inventario se ve: '+txt);
// 2) Inventario vacío en el móvil: nunca se sube
await p.evaluate(()=>{inventario={articulos:[],conteos:{},ts:0};localStorage.setItem('seda_pendiente','1')});
await p.evaluate(()=>reenviarTodo());await p.evaluate(()=>syncConfig('seda_inventario',inventario));await p.waitForTimeout(1200);
ok(N.DB.config.find(c=>c.key==='seda_inventario').value.articulos.length===312,'un inventario vacío no borra el de la nube (sigue con 312)');
// 3) Inventario con datos sí se sube
await p.evaluate(()=>{inventario={articulos:[{s:'X',n:'Y',u:'KG',p:1}],conteos:{},ts:2};syncConfig('seda_inventario',inventario)});await p.waitForTimeout(1200);
ok(N.DB.config.find(c=>c.key==='seda_inventario').value.articulos.length===1,'un inventario con datos sí se guarda');
// 4) App suelta de inventario y de albaranes: tampoco suben vacío
N.DB.config.find(c=>c.key==='seda_inventario').value={articulos:arts,conteos:{},ts:3};
for(const u of ['inventario.html','albaranes.html']){const q=await N.pagina(b,'http://localhost:8765/'+u);
 await q.evaluate(()=>{try{(typeof subir==='function'?subir:subirConfig)('seda_inventario',{articulos:[],conteos:{}})}catch(e){}});await q.waitForTimeout(600);
 ok(N.DB.config.find(c=>c.key==='seda_inventario').value.articulos.length===312,u+': no sube un inventario vacío');ok(!q.errs.length,u+' sin errores '+q.errs.join(';'))}
ok(!p.errs.length,'sin errores '+p.errs.join(';'));
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
