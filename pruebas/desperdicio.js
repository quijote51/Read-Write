// Desperdicio alimentario: apuntar, juntar registros de dos móviles, resumen, plan, cartel y permisos.
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const hoy=new Date().toISOString().slice(0,10);
N.DB.eventos.push({hotel_id:'h1',id:'1700000000001',nombre:'Boda Peps',fecha:hoy,hora:'14:00',pax:40,tipo:'banquete',lugar:'Salón',alergias_txt:'',alergenos_menu:[],platos:[],infantil:null,factor_custom:null,precio_venta:50,notas:'',personal_ids:[],bebidas:null,notas_bebidas:''});
N.DB.config.push({hotel_id:'h1',key:'seda_ajustes',updated_at:'2026-11-03T10:00:00.000Z',value:{hotel_nombre:'Seda Club Hotel',hotel_ciudad:'Granada',lugares:[]}});
const abrir=async p=>{await p.evaluate(()=>{aplicarRol('admin');showTab('desperdicio')});await p.waitForTimeout(300)};
const A=await N.pagina(b,U),B=await N.pagina(b,U);await abrir(A);await abrir(B);
ok(await A.isVisible('#dp-root .dp-tabs'),'sección Desperdicio visible');
// A apunta sobras del evento; B apunta otra cosa a la vez
await A.selectOption('#dp-serv','evento');await A.selectOption('#dp-ev','1700000000001');await A.selectOption('#dp-tipo','plato');await A.selectOption('#dp-dest','basura');await A.fill('#dp-kg','4');await A.fill('#dp-que','guarnición');
await B.selectOption('#dp-tipo','produccion');await B.selectOption('#dp-dest','donado');await B.fill('#dp-kg','6,5');
await A.click('[data-dp="guardar"]');await B.click('[data-dp="guardar"]');await A.waitForTimeout(1800);
const nube=()=>(N.DB.config.find(c=>c.key==='seda_desperdicio')||{value:{reg:[]}}).value.reg;
ok(nube().length===2,'los dos registros llegan a la nube aunque se apunten a la vez ('+nube().length+')');
await A.evaluate(()=>{});
await A.reload();await A.waitForTimeout(1500);await A.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none'});await abrir(A);
await A.click('[data-dpv="res"]');await A.waitForTimeout(200);
const res=await A.textContent('#dp-root');
ok(/10,5 kg/.test(res),'resumen: 10,5 kg en el mes');
ok(/62 %/.test(res),'resumen: 62 % aprovechado (6,5 donados de 10,5)');
ok(/100 g/.test(res)&&/Boda Peps/.test(res),'resumen: 100 g por persona en la boda (4 kg / 40 pax)');
await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/dp-res.png',fullPage:false});
// Anular
await A.click('[data-dpv="reg"]');A.on('dialog',d=>d.accept('pesado dos veces'));await A.click('[data-dp="anular"]');await A.waitForTimeout(1500);
ok(nube().filter(r=>r.anulado).length===1,'anular deja constancia del motivo');
// Plan
await A.click('[data-dpv="plan"]');await A.fill('[data-plan="responsable"]','Fabián, jefe de cocina');await A.press('[data-plan="responsable"]','Tab');
await A.check('[data-med="sobras"][data-i="1"]');await A.waitForTimeout(1500);
const plan=(N.DB.config.find(c=>c.key==='seda_desperdicio')||{}).value.plan||{};
ok(plan.responsable==='Fabián, jefe de cocina'&&(plan.medidas.sobras||[]).includes(1),'plan de prevención guardado');
const imp=await A.evaluate(()=>{window.print=()=>{};document.querySelector('[data-dp="imprimir-plan"]').click();return document.getElementById('dp-print').innerText});
ok(/Seda Club Hotel/.test(imp)&&/Fabián/.test(imp)&&/Acuerdo de donación/.test(imp),'plan impreso con el nombre del hotel y las medidas');
await A.click('[data-dpv="cartel"]');ok(/envase gratis/.test(await A.textContent('.dp-cartel')),'cartel del envase gratis');
// Permisos: cocina ve la sección; un cliente sin «seguridad» no
N.PERFILES['u-coc']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
const K=await N.pagina(b,U,{yo:'u-coc'});await K.waitForTimeout(800);
ok(await K.evaluate(()=>document.querySelector('#acc-desperdicio').style.display!=='none'),'cocina ve Desperdicio');
N.PERFILES['u-pepe']={hotel:'u-pepe',rol:'admin',hotel_nombre:'Bar Pepe',modulos:['base']};
const P=await N.pagina(b,U,{yo:'u-pepe'});await P.waitForTimeout(800);await P.evaluate(()=>aplicarRol('admin'));
ok(await P.evaluate(()=>document.querySelector('#acc-desperdicio').style.display==='none'),'cliente sin «Seguridad alimentaria» no ve Desperdicio');
for(const [n,p] of [['A',A],['B',B],['K',K],['P',P]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${n}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
