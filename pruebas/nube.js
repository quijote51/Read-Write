// Nube simulada compartida entre páginas: la base de datos vive en Node y las páginas la usan vía window.__db
const HOTEL='h1';
function nuevaDB(){return {config:[],eventos:[],plantillas:[],vajilla:[],proveedores:[],personal:[],recetas:[],miembros:[]};}
let DB=nuevaDB(); let fallar=null; const log=[]; const ALMACEN={}; let almacenListo=true;
// Como Postgres (jsonb): dentro de objetos y listas, las claves salen ordenadas por longitud y luego alfabéticamente
function jsonb(v){if(Array.isArray(v))return v.map(jsonb);if(v&&typeof v==='object'){const o={};Object.keys(v).sort((a,b)=>a.length-b.length||(a<b?-1:a>b?1:0)).forEach(k=>o[k]=jsonb(v[k]));return o}return v}
// Columnas reales de Supabase (3/11/2026): la nube rechaza cualquier otra, como PostgREST
const COLS={invitaciones:'codigo,hotel_id,rol,nombre',eventos:'id,nombre,fecha,hora,pax,tipo,lugar,alergias_txt,alergenos_menu,platos,infantil,factor_custom,precio_venta,notas,personal_ids,bebidas,notas_bebidas,hotel_id',
 recetas:'id,nombre,cat,emoji,alg,ingredientes,img,hotel_id,base,rinde,extra,borrado,updated_at',
 plantillas:'id,nombre,color,factor,precio,descripcion,bodega,platos,hotel_id',vajilla:'id,nombre,cat,stock,factor_coctel,factor_menu,notas,img,hotel_id',
 proveedores:'id,nombre,tel,cat,hotel_id',personal:'id,nombre,rol,tel,hotel_id',config:'key,value,updated_at,hotel_id',miembros:'user_id,hotel_id,rol,creado,nombre'};
const rechazos=[];
function columnasMal(t,filas){const ok=(COLS[t]||'').split(',');for(const f of filas)for(const k of Object.keys(f))if(!ok.includes(k))return k;return null}
function almacen(op,a){
  if(!almacenListo)return {data:null,error:{message:'Bucket not found'}};
  if(op==='upload'){const [n,b64]=a;if(!n.startsWith(HOTEL+'/'))return {data:null,error:{message:'new row violates row-level security policy'}};if(ALMACEN[n])return {data:null,error:{message:'The resource already exists'}};ALMACEN[n]=b64.length;log.push('foto sube '+n.split('/').slice(1).join('/').replace(/-.*/,''));return {data:{path:n},error:null}}
  if(op==='remove'){a[0].forEach(n=>{delete ALMACEN[n];log.push('foto borra '+n.split('/').slice(1).join('/').replace(/-.*/,''))});return {data:[],error:null}}
}
// Fase 2: perfiles por cuenta (yo → {hotel, rol, nombre}); sin entrada = cuenta sin hotel. rpcActivo=false: nube sin fase 2
const PERFILES={[HOTEL]:{hotel:HOTEL,rol:'admin',nombre:null,hotel_nombre:'Seda Club Hotel',hotel_ciudad:'Granada',modulos:['base','costes','seguridad','equipo'],plataforma:true}}; const INVIT={}; const CLIENTES={}; let rpcActivo=true;
const hotelDe=yo=>(PERFILES[yo]&&PERFILES[yo].hotel)||yo;
function rpc(n,a,yo){
  if(!rpcActivo)return {data:null,error:{message:'Could not find the function public.'+n}};
  if(n==='mi_perfil')return {data:PERFILES[yo]?{...PERFILES[yo],plataforma:!!PERFILES[yo].plataforma&&PERFILES[yo].hotel===yo}:{hotel:yo,rol:null,nombre:null,hotel_nombre:null},error:null};
  if(n==='unirse'&&CLIENTES[String(a.p_codigo).toUpperCase()]&&!CLIENTES[String(a.p_codigo).toUpperCase()].usado_por){const c=CLIENTES[String(a.p_codigo).toUpperCase()];c.usado_por=yo;
    PERFILES[yo]={hotel:yo,rol:'admin',nombre:null,hotel_nombre:c.nombre,hotel_ciudad:c.ciudad,modulos:c.modulos,plataforma:false};
    DB.config.push({hotel_id:yo,key:'seda_ajustes',updated_at:new Date().toISOString(),value:{hotel_nombre:c.nombre,hotel_ciudad:c.ciudad||'',lugares:[]}});log.push('cliente nuevo '+yo+' '+c.nombre);return {data:PERFILES[yo],error:null}}
  if(n==='clientes')return {data:Object.entries(PERFILES).filter(([u,p])=>p.hotel===u&&p.rol==='admin').map(([u,p])=>({owner:u,email:u+'@x',nombre:p.hotel_nombre,ciudad:p.hotel_ciudad,modulos:p.modulos,personas:Object.values(PERFILES).filter(q=>q.hotel===u&&q!==p).length})),error:null};
  if(n==='cambiar_modulos'){if(!(PERFILES[yo]||{}).plataforma)return {data:null,error:{message:'Solo la plataforma'}};const p=PERFILES[a.p_owner];if(p){p.modulos=['base',...a.p_modulos];Object.values(PERFILES).forEach(q=>{if(q.hotel===a.p_owner)q.modulos=p.modulos})}log.push('módulos '+a.p_owner+' '+a.p_modulos.join('+'));return {data:null,error:null}}
  if(n==='guardar_hotel'){const p=PERFILES[yo];if(p&&p.rol==='admin'){p.hotel_nombre=a.p_nombre;p.hotel_ciudad=a.p_ciudad}return {data:null,error:null}}
  if(n==='unirse'){const i=INVIT[String(a.p_codigo).toUpperCase()];if(!i||i.usado_por)return {data:null,error:{message:'Código no válido o caducado'}};
    i.usado_por=yo;const h=PERFILES[i.hotel_id]||{};PERFILES[yo]={hotel:i.hotel_id,rol:i.rol,nombre:i.nombre||a.p_nombre,hotel_nombre:h.hotel_nombre,hotel_ciudad:h.hotel_ciudad,modulos:h.modulos};log.push('unirse '+yo+' '+i.rol);return {data:PERFILES[yo],error:null}}
  if(n==='mi_equipo')return {data:Object.entries(PERFILES).filter(([u,p])=>u!==HOTEL&&p.rol).map(([u,p])=>({user_id:u,email:u+'@x',rol:p.rol,nombre:p.nombre,creado:'2026-11-03'})),error:null};
  return {data:null,error:{message:'rpc '+n}};
}
function aplicar(t,q){
  if(t==='codigos_cliente'){if(!(PERFILES[q.yo]||{}).plataforma)return {data:null,error:{message:'new row violates row-level security policy'}};
    if(q.op==='insert'){[].concat(q.v).forEach(r=>{CLIENTES[r.codigo]={...r,creado:new Date().toISOString(),caduca:new Date(Date.now()+30*864e5).toISOString(),usado_por:null};log.push('código cliente '+r.codigo+' '+r.nombre+' '+(r.modulos||[]).join('+'))});return {data:null,error:null}}
    if(q.op==='delete'){q.f.forEach(([o,k,v])=>{if(k==='codigo')delete CLIENTES[v]});return {data:null,error:null}}
    return {data:Object.values(CLIENTES).filter(i=>!i.usado_por),error:null}}
  if(t==='invitaciones'){if(q.op==='insert'){[].concat(q.v).forEach(r=>{INVIT[r.codigo]={...r,creado:new Date().toISOString(),caduca:new Date(Date.now()+7*864e5).toISOString(),usado_por:null};log.push('invitación '+r.codigo+' '+r.rol+' '+r.hotel_id)});return {data:null,error:null}}
    if(q.op==='delete'){q.f.forEach(([o,k,v])=>{if(k==='codigo')delete INVIT[v]});return {data:null,error:null}}
    return {data:Object.values(INVIT).filter(i=>!i.usado_por),error:null}}
  if(t==='miembros'&&q.op==='delete'){q.f.forEach(([o,k,v])=>{if(k==='user_id'){delete PERFILES[v];log.push('quitar '+v)}});return {data:null,error:null}}
  if((q.op==='upsert'||q.op==='update')&&COLS[t]){const k=columnasMal(t,[].concat(q.v));if(k){rechazos.push(t+'.'+k);return {data:null,error:{message:`Could not find the '${k}' column of '${t}'`}}}}
  let filas=DB[t]||(DB[t]=[]);
  const miHotel=hotelDe(q.yo||HOTEL);
  if(['config','recetas','eventos','plantillas','vajilla','proveedores','personal'].includes(t)){
    q.f=q.f.concat([['eq','hotel_id',miHotel]]);
    if(q.op==='upsert'||q.op==='insert')q.v=[].concat(q.v).map(r=>({...r,hotel_id:miHotel}));
  }
  const pasa=r=>q.f.every(([op,k,v])=>op==='is'?(r[k]??null)===v:op==='eq'?String(r[k])===String(v):op==='in'?v.map(String).includes(String(r[k])):true);
  if(fallar&&fallar(t,q))return {data:null,error:{message:'sin conexión (simulado)'}};
  if(q.op==='select'){let d=filas.filter(pasa);if(q.single)return {data:d[0]?JSON.parse(JSON.stringify(d[0])):null,error:null};return {data:JSON.parse(JSON.stringify(d)),error:null};}
  if(q.op==='upsert'){const rows=[].concat(q.v).map(r=>{const o={};Object.keys(r).forEach(k=>o[k]=jsonb(r[k]));return o});const keys=(q.on||'id').split(',');rows.forEach(r=>{r={hotel_id:HOTEL,...r};if(t==='recetas')r.updated_at=new Date().toISOString();const i=filas.findIndex(x=>keys.every(k=>String(x[k])===String(r[k])));if(i>=0)filas[i]={...filas[i],...r};else filas.push(r)});log.push(t+' upsert '+rows.map(r=>r.id||r.key).join(','));return {data:JSON.parse(JSON.stringify(filas.filter(x=>rows.some(r=>keys.every(k=>String(x[k])===String(r[k])))))),error:null};}
  if(q.op==='update'){const v={};Object.keys(q.v).forEach(k=>v[k]=jsonb(q.v[k]));const af=filas.filter(pasa);af.forEach(r=>Object.assign(r,v,t==='recetas'?{updated_at:new Date().toISOString()}:{}));log.push(t+' update '+Object.keys(q.v).join(',')+' '+JSON.stringify(q.f.map(f=>f[2])));return {data:JSON.parse(JSON.stringify(af)),error:null};}
  if(q.op==='insert'){const rows=[].concat(q.v).map(r=>{const o={hotel_id:HOTEL};Object.keys(r).forEach(k=>o[k]=jsonb(r[k]));return o});
    for(const r of rows){if(filas.some(x=>(t==='config'?['hotel_id','key']:['id']).every(k=>String(x[k])===String(r[k]))))return {data:null,error:{code:'23505',message:'duplicate key'}}}
    rows.forEach(r=>filas.push(r));log.push(t+' insert '+rows.map(r=>r.id||r.key).join(','));return {data:JSON.parse(JSON.stringify(rows)),error:null};}
  if(q.op==='delete'){DB[t]=filas.filter(r=>!pasa(r));log.push(t+' delete');return {data:null,error:null};}
}
const MOCK=`(function(){
function q(t){const st={op:'select',f:[],v:null,on:null,single:false};const o={
 select(){return o},order(){return o},limit(){return o},
 eq(k,v){st.f.push(['eq',k,v]);return o},is(k,v){st.f.push(['is',k,v]);return o},in(k,v){st.f.push(['in',k,v]);return o},
 maybeSingle(){st.single=true;return o},
 upsert(v,opt){st.op='upsert';st.v=v;st.on=opt&&opt.onConflict;return o},
 update(v){st.op='update';st.v=v;return o},insert(v){st.op='insert';st.v=v;return o},delete(){st.op='delete';return o},
 then(a,b){return window.__db(t,{...JSON.parse(JSON.stringify(st)),yo:window.__YO||'${HOTEL}'}).then(a,b)}};return o}
const st=b=>({upload:async(n,blob)=>{const buf=await blob.arrayBuffer();return window.__almacen('upload',[n,String(buf.byteLength)])},remove:async(l)=>window.__almacen('remove',[l]),getPublicUrl:n=>({data:{publicUrl:'https://gxkxslkdqgwovgxcuzkr.supabase.co/storage/v1/object/public/'+b+'/'+n}})});
window.supabase={createClient:()=>({rpc:(n,a)=>window.__rpc(n,a||{},window.__YO||'${HOTEL}'),storage:{from:st},auth:{signUp:async()=>({data:{session:{user:{id:window.__YO}}},error:null}),getSession:async()=>({data:{session:window.__YO==='nadie'?null:{user:{id:window.__YO||'${HOTEL}',email:'yo@x'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{}},from:q})};})();`;
async function pagina(b,url,{w=390,yo=HOTEL}={}){
  const ctx=await b.newContext({viewport:{width:w,height:800},serviceWorkers:'block'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.exposeFunction('__db',(t,q)=>aplicar(t,q));
  await p.exposeFunction('__almacen',(op,a)=>almacen(op,a));
  await p.exposeFunction('__rpc',(n,a,u)=>rpc(n,a,u));
  await p.addInitScript(y=>{window.__YO=y},yo);
  await p.route(/supabase\.co\/storage/,r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}));
  await p.route(/fonts\.g|tabler|cdn\.jsdelivr/,r=>r.abort());
  await p.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:MOCK}));
  await p.addInitScript(()=>{try{localStorage.setItem('seda_rol','admin')}catch(e){}});
  await p.goto(url);await p.waitForTimeout(1500);
  await p.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none'});
  return p;
}
module.exports={PERFILES,CLIENTES,INVIT,setRpc:v=>{rpcActivo=v},ALMACEN,setAlmacen:v=>{almacenListo=v},rechazos,get DB(){return DB},set DB(v){DB=v},nuevaDB,log,pagina,setFallar:f=>{fallar=f},HOTEL};
