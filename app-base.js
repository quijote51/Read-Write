/* ══════════════════════════════════════
   OÍDO COCINA · Base común de las apps sueltas (APPCC, Alérgenos)
   - Sesión con la misma cuenta de Oído Cocina (Supabase) y pantalla de entrada.
   - Lectura de eventos, recetas y proveedores de la nube (solo lectura).
   - syncConfig/mostrarSync con la misma firma que la app principal, para que los módulos funcionen igual.
   La página define window.APP = {nombre:'APPCC', arrancar: async ()=>{...}} y tiene
   <span id="sync">, <button id="salir"> y <main>.
   ══════════════════════════════════════ */
const SUPA_URL='https://gxkxslkdqgwovgxcuzkr.supabase.co', SUPA_KEY='sb_publishable_xAUprOgWQi0HhYms69zUhA_yiTwDYPK';
const supa=(typeof supabase!=='undefined')?supabase.createClient(SUPA_URL,SUPA_KEY):null;
let _uid=null,_email='';
let eventos=[],recetas=[],proveedores=[];
const _t={};
const $=id=>document.getElementById(id);
const LS=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
const escH=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ── Estado de sincronización ── */
function estado(ok,txt){const e=$('sync');if(!e)return;e.className=ok?'':'mal';e.textContent=txt||(ok?'☁ Sincronizado':(_uid?'Sin conexión':'Sin sesión'))}
function mostrarSync(ok){estado(ok)}
function syncConfig(key,val){clearTimeout(_t[key]);_t[key]=setTimeout(()=>subirConfig(key,val),700)}
async function subirConfig(key,val){
  if(!_uid||!supa){estado(false);return}
  // Nunca se sube un inventario vacío: si este aparato no ha podido cargarlo, no puede borrar el de la nube
  if(key==='seda_inventario'&&!(val&&Array.isArray(val.articulos)&&val.articulos.length)){console.warn('Inventario vacío: no se sube');return}
  try{const{error}=await supa.from('config').upsert({hotel_id:_uid,key,value:val,updated_at:new Date().toISOString()},{onConflict:'hotel_id,key'});
    if(error)throw error;estado(true)}
  catch(e){console.warn('Sync',e);try{localStorage.setItem('seda_pendiente','1')}catch(_){}estado(false)}
}

/* ── Utilidades que usan los módulos ── */
function fmtFecha(f){if(!f)return'';const[y,m,d]=String(f).split('-');const mes=['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return d+' '+mes[+m]+' '+y}
const _norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
// Igual que la app principal: primero por receta_id; si no, por nombre exacto (sin tildes ni mayúsculas).
function recetaDePlato(p){
  if(!p)return null;
  if(p.receta_id){const r=recetas.find(x=>x.id===p.receta_id);if(r)return r}
  const n=_norm(p.nombre);return n?(recetas.find(x=>_norm(x.nombre)===n)||null):null;
}

/* ── Datos de la nube ── */
// Lo guardado en el aparato primero (abre sin conexión), luego la nube.
function cargarLocal(){
  eventos=(LS('seda_ev')||[]); recetas=(LS('seda_rec')||[]); proveedores=(LS('seda_prov')||[]);
}
async function cargarNube(claves){
  if(!supa||!_uid||navigator.onLine===false){estado(false);return false}
  try{
    const [ev,pr,cf,rc]=await Promise.all([
      supa.from('eventos').select('*').order('fecha'),
      supa.from('proveedores').select('*'),
      // Recetas: tabla propia, una fila por receta (recetas-nube.js). Si aún está vacía, se usa config.seda_rec.
      supa.from('config').select('key,value').in('key',['seda_rec'].concat(Object.keys(claves||{}))),
      supa.from('recetas').select('*').eq('hotel_id',_uid)]);
    if(ev.error||pr.error||cf.error)throw ev.error||pr.error||cf.error;
    eventos=ev.data.map(({hotel_id,...e})=>({...e,id:/^\d+$/.test(e.id)?Number(e.id):e.id})); LS('seda_ev',eventos);
    proveedores=pr.data.map(({hotel_id,...p})=>p); LS('seda_prov',proveedores);
    const m={}; cf.data.forEach(r=>m[r.key]=r.value);
    if(!rc.error&&rc.data&&rc.data.length&&typeof recDeFila==='function'){recetas=rc.data.filter(f=>!f.borrado).map(recDeFila);LS('seda_rec',recetas)}
    else if(Array.isArray(m.seda_rec)){recetas=m.seda_rec;LS('seda_rec',recetas)}
    Object.entries(claves||{}).forEach(([k,fn])=>{if(m[k]!==undefined&&m[k]!==null)fn(m[k])});
    estado(true); return true;
  }catch(e){console.warn('Carga',e);estado(false);return false}
}

/* ── Sesión ── */
async function leerSesion(){
  try{if(supa){const{data}=await supa.auth.getSession();_uid=data?.session?.user?.id||null;_email=data?.session?.user?.email||''}}catch(e){_uid=null}
  if(_uid)LS('seda_cuenta',{uid:_uid,email:_email});
  else if(navigator.onLine===false){const c=LS('seda_cuenta');if(c&&c.uid){_uid=c.uid;_email=c.email||''}}
  return _uid}
async function entrar(ev){
  ev.preventDefault();const b=$('l-btn'),er=$('login-error');er.style.display='none';b.disabled=true;b.textContent='Entrando…';
  try{if(!supa)throw new Error('sin conexión');
    const{data,error}=await supa.auth.signInWithPassword({email:$('l-email').value.trim(),password:$('l-pass').value});
    if(error)throw error;_uid=data.user.id;_email=data.user.email||'';LS('seda_cuenta',{uid:_uid,email:_email});$('l-pass').value='';
    $('login').style.display='none';await _arrancar()}
  catch(e){er.textContent=/invalid|credentials/i.test(String(e&&e.message))?'Correo o contraseña incorrectos.':'No se pudo entrar. Revisa la conexión e inténtalo de nuevo.';er.style.display='block'}
  b.disabled=false;b.textContent='Entrar';return false}
// Igual que la app principal: al salir se borra la copia del aparato (aparatos compartidos).
async function salir(){
  let pend=false;try{pend=localStorage.getItem('seda_pendiente')==='1'}catch(e){}
  if(pend&&!confirm('Hay cambios que todavía no se han subido a la nube. Si sales ahora se borrarán de este dispositivo. ¿Salir igualmente?'))return;
  try{await supa.auth.signOut()}catch(e){}
  try{Object.keys(localStorage).filter(k=>/^(seda_|oido_|hz_|iv_|ap_)/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
  location.reload()}
async function esCocina(){
  let r=LS('ap_rol');
  if(supa&&_uid&&navigator.onLine!==false){
    try{const{data,error}=await supa.from('miembros').select('rol').eq('user_id',_uid);if(!error){r=(data&&data[0]&&data[0].rol)||'admin';LS('ap_rol',r)}}catch(e){}}
  return r==='cocina'}

function _pintarLogin(){
  if($('login'))return;
  const n=escH((window.APP&&APP.nombre)||'Oído Cocina');
  const d=document.createElement('div'); d.id='login'; d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); d.setAttribute('aria-labelledby','login-t');
  d.innerHTML=`<form onsubmit="return entrar(event)"><h2 id="login-t">${n} <span>Seda</span></h2><p>Entra con tu cuenta de Oído Cocina</p>
    <label for="l-email">Correo</label><input id="l-email" type="email" autocomplete="username" inputmode="email" required>
    <label for="l-pass">Contraseña</label><input id="l-pass" type="password" autocomplete="current-password" required>
    <div id="login-error" role="alert"></div><button class="btn" id="l-btn" type="submit">Entrar</button></form>`;
  document.body.appendChild(d);
}
async function _arrancar(){
  const s=$('salir'); if(s)s.style.display='';
  if(await esCocina()){document.querySelector('main').innerHTML=`<div class="card hz-vacio">Esta app es para la cuenta del hotel (dirección y chef). Los horarios están en la app Horarios.</div>`;estado(true);return}
  if(window.APP&&APP.arrancar)await APP.arrancar();
}
window.addEventListener('online',()=>{if(_uid&&window.APP&&APP.recargar)APP.recargar()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&_uid&&navigator.onLine!==false&&window.APP&&APP.recargar&&!(document.activeElement&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)))APP.recargar()});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
window.addEventListener('DOMContentLoaded',async()=>{
  _pintarLogin(); cargarLocal();
  if(await leerSesion())_arrancar();
  else{estado(false,'Sin sesión');$('login').style.display='flex';setTimeout(()=>$('l-email').focus(),50)}
});
