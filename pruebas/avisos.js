// Avisos: campana con lo pendiente según el rol, activar/desactivar avisos en el móvil y el service worker
// mostrando el aviso que llega (push simulado con las herramientas de Chrome).
const {chromium}=require('playwright');const N=require('./nube.js');const U='http://localhost:8765/index.html';
(async()=>{const b=await chromium.launch();let f=0;const ok=(c,t)=>{if(!c)f++;console.log((c?'✔':'✘ FALLO')+' '+t)};
const d=n=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const ev=(id,nombre,fecha,alergias_txt)=>({hotel_id:'h1',id,nombre,fecha,hora:'14:00',pax:40,tipo:'banquete',lugar:'Salón',alergias_txt,alergenos_menu:[],platos:[],infantil:null,factor_custom:null,precio_venta:50,notas:'',personal_ids:[],bebidas:null,notas_bebidas:''});
N.DB.eventos.push(ev('1700000000001','Boda Peps',d(1),'2 pax celíacos'),ev('1700000000002','Comida empresa',d(1),'Sin alergias registradas'),ev('1700000000003','Cena gala',d(0),'1 pax marisco'));
N.DB.config.push({hotel_id:'h1',key:'seda_appcc',updated_at:'2026-11-03T10:00:00.000Z',value:{equipos:[{id:'c1',n:'Cámara 1',min:0,max:4},{id:'c2',n:'Congelador',min:-30,max:-18}],zonas:[{id:'z1',n:'Suelos',frec:'diaria'}],vida:{refrigerado:3,vacio:7,congelado:90},testigoDias:7,cts:1,reg:[]}});
N.DB.cambios=[{id:'k1',hotel_id:'h1',semana:d(0),dia:2,de:'Ana',a:'Rubén',turno_de:'M',turno_a:'T',estado:'pendiente'},{id:'k2',hotel_id:'h1',semana:d(0),dia:3,de:'Rocío',a:'Darío',turno_de:'M',turno_a:'T',estado:'aceptado'}];
const A=await N.pagina(b,U);await A.waitForTimeout(500);
await A.evaluate(()=>aplicarRol('admin'));await A.waitForTimeout(200);
const n=await A.textContent('#av-n');ok(+n>=5,'campana con avisos para administración ('+n+')');
await A.click('#av-btn');await A.waitForTimeout(300);
let t=await A.textContent('#av-modal');
ok(/Temperaturas de la (mañana|tarde) sin apuntar/.test(t)&&/Cámara 1, Congelador/.test(t),'temperaturas sin apuntar');
ok(/Limpiezas de hoy sin apuntar/.test(t)&&/Muestra testigo sin guardar/.test(t)&&/Cena gala/.test(t),'limpieza y muestra testigo');
ok(/Mañana hay alergias/.test(t)&&/2 pax celíacos/.test(t)&&!/Comida empresa/.test(t),'mañana con alergias (sin contar «Sin alergias»)');
ok(/Hoy hay alergias/.test(t)&&/1 pax marisco/.test(t),'hoy con alergias');
ok(/1 cambio de turno espera tu aprobación/.test(t),'cambio de turno que espera aprobación');
await A.screenshot({path:'/tmp/claude-0/-home-user-Read-Write/9fb26a66-dda6-56b4-a9d5-014c50dc7b1a/scratchpad/av-panel.png'});
// Ir al aviso
await A.click('.av-item:has-text("Limpiezas")');await A.waitForTimeout(300);
ok(await A.evaluate(()=>document.querySelector('#acc-appcc').classList.contains('open')&&getComputedStyle(document.getElementById('av-modal')).display==='none'),'tocar el aviso abre APPCC');
// Apuntar las temperaturas quita el aviso
await A.evaluate(()=>{const ah=new Date().toISOString();appcc.reg.push({id:'x1',t:'temp',eq:'c1',f:ah,v:2},{id:'x2',t:'temp',eq:'c2',f:ah,v:-20});avisosRecalcular()});
await A.click('#av-btn');await A.waitForTimeout(200);t=await A.textContent('#av-modal');ok(!/Temperaturas de la/.test(t),'apuntadas: el aviso desaparece');
// Rol de eventos: no ve APPCC ni cambios
await A.evaluate(()=>{document.getElementById('av-modal').style.display='none';rolActual='eventos';aplicarRol('eventos')});await A.click('#av-btn');await A.waitForTimeout(200);t=await A.textContent('#av-modal');
ok(!/Limpiezas|Temperaturas|cambio de turno/.test(t)&&/hay alergias/.test(t),'eventos: solo lo suyo');
await A.evaluate(()=>{document.getElementById('av-modal').style.display='none';rolActual='admin';aplicarRol('admin')});
// Cocina con nombre: le piden un cambio
N.PERFILES['u-rub']={hotel:'h1',rol:'cocina',nombre:'Rubén',hotel_nombre:'Seda Club Hotel',modulos:['base','costes','seguridad','equipo']};
const K=await N.pagina(b,U,{yo:'u-rub'});await K.waitForTimeout(800);await K.click('#av-btn');await K.waitForTimeout(300);t=await K.textContent('#av-modal');
ok(/Te piden un cambio de turno/.test(t)&&/Ana/.test(t)&&!/tu aprobación/.test(t),'cocina: le piden un cambio; no aprueba');
// Activar avisos en el móvil (push simulado)
N.FUNCIONES['avisos-push']=body=>{if(!body||!body.clave)return {error:'sin clave'};N.FUNCIONES.__clave='BHKawbWuw5tmj5lqGz_Ga06ouVCF1nYhesGr-k8Gsm_oCsZLi__RU8fWn9L7619fkKF-NKIWWX3za-TqGFsSGkU';return {data:{publica:N.FUNCIONES.__clave}}};
const P=await N.pagina(b,U);
await P.evaluate(()=>{const sub={endpoint:'https://fcm.googleapis.com/fcm/send/abc',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'x',auth:'y'}}},unsubscribe:async()=>{window.__sub=null;return true}};
  window.__sub=null;const reg={pushManager:{getSubscription:async()=>window.__sub,subscribe:async o=>{window.__opts=o;window.__sub=sub;return sub}}};
  Object.defineProperty(navigator,'serviceWorker',{value:{ready:Promise.resolve(reg),getRegistration:async()=>reg,register:async()=>reg,addEventListener(){}},configurable:true});
  window.PushManager=window.PushManager||function(){};window.Notification={permission:'default',requestPermission:async()=>'granted'};});
await P.click('#av-btn');await P.waitForTimeout(300);
ok(await P.isVisible('[data-av="alta"]'),'botón «Activar avisos en este móvil»');
await P.uncheck('[data-avt="cambios"]');await P.click('[data-av="alta"]');await P.waitForTimeout(500);
const s=(N.DB.avisos_push||[])[0]||{};
ok(s.endpoint==='https://fcm.googleapis.com/fcm/send/abc'&&s.tipos.join()==='temp,alergias','suscripción guardada con los avisos elegidos ('+(s.tipos||[]).join()+')');
ok(await P.evaluate(()=>window.__opts.userVisibleOnly&&window.__opts.applicationServerKey.length===65)&&N.LLAMADAS.some(l=>l.n==='avisos-push'),'la primera vez pide a Supabase la clave pública (65 bytes)');
ok(/Activados en este móvil/.test(await P.textContent('#av-modal')),'pantalla: activados');
await P.click('[data-av="baja"]');await P.waitForTimeout(400);ok(!(N.DB.avisos_push||[]).length&&await P.isVisible('[data-av="alta"]'),'desactivar');
for(const [nm,p] of [['A',A],['K',K],['P',P]]){const sw=await p.evaluate(()=>document.documentElement.scrollWidth);ok(!p.errs.length&&sw<=390,`${nm}: sin errores (${p.errs.join(';')}) ancho ${sw}`)}
// Service worker: llega un push vacío → pide el texto y muestra la notificación
const ctx=await b.newContext({viewport:{width:390,height:800}});await ctx.grantPermissions(['notifications'],{origin:'http://localhost:8765'});
let pedido=null;
await ctx.route(/rpc\/aviso_push/,r=>{pedido=JSON.parse(r.request().postData());r.fulfill({contentType:'application/json',body:JSON.stringify({titulo:'Oído Cocina',cuerpo:'Temperaturas de la mañana sin apuntar: Congelador.',url:'/index.html#avisos'})})});
await ctx.route(/fonts\.g|tabler|cdn\.jsdelivr|supabase-js/,r=>r.abort());
// Chrome sin pantalla no deja mostrar notificaciones: el service worker de la prueba avisa a la página en su lugar
await ctx.route(/\/sw\.js$/,r=>r.fulfill({contentType:'application/javascript',body:"self.registration.showNotification=async(t,o)=>{(await self.clients.matchAll({includeUncontrolled:true})).forEach(c=>c.postMessage(t+' | '+o.body+' | '+o.data.url))};\n"+require('fs').readFileSync(__dirname+'/../sw.js','utf8')}));
const W=await ctx.newPage();await W.goto('http://localhost:8765/carta.html?c=x');await W.evaluate(()=>{window.__notis=[];navigator.serviceWorker.addEventListener('message',e=>window.__notis.push(e.data))});
await W.evaluate(()=>navigator.serviceWorker.register('/sw.js'));await W.evaluate(()=>navigator.serviceWorker.ready);
const cdp=await ctx.newCDPSession(W);await cdp.send('ServiceWorker.enable');
const regs=[];cdp.on('ServiceWorker.workerRegistrationUpdated',e=>regs.push(...e.registrations));await W.waitForTimeout(500);
const rid=(regs.find(r=>r.scopeURL.startsWith('http://localhost:8765'))||{}).registrationId;
await cdp.send('ServiceWorker.deliverPushMessage',{origin:'http://localhost:8765',registrationId:rid,data:''});await W.waitForTimeout(1500);
const notis=await W.evaluate(()=>window.__notis);
ok(pedido&&'p_endpoint' in pedido,'el service worker pide el texto del aviso');
ok(notis.some(x=>/Congelador/.test(x)),'notificación mostrada: '+notis.join(' / '));
console.log(f?f+' FALLOS':'TODO BIEN');await b.close()})();
