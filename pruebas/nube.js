// Nube simulada compartida entre páginas: la base de datos vive en Node y las páginas la usan vía window.__db
const HOTEL='h1';
function nuevaDB(){return {config:[],eventos:[],plantillas:[],vajilla:[],proveedores:[],personal:[],recetas:[],miembros:[]};}
let DB=nuevaDB(); let fallar=null; const log=[]; const ALMACEN={}; let almacenListo=true;
// Como Postgres (jsonb): dentro de objetos y listas, las claves salen ordenadas por longitud y luego alfabéticamente
function jsonb(v){if(Array.isArray(v))return v.map(jsonb);if(v&&typeof v==='object'){const o={};Object.keys(v).sort((a,b)=>a.length-b.length||(a<b?-1:a>b?1:0)).forEach(k=>o[k]=jsonb(v[k]));return o}return v}
// Columnas reales de Supabase (3/11/2026): la nube rechaza cualquier otra, como PostgREST
const COLS={eventos:'id,nombre,fecha,hora,pax,tipo,lugar,alergias_txt,alergenos_menu,platos,infantil,factor_custom,precio_venta,notas,personal_ids,bebidas,notas_bebidas,hotel_id',
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
function aplicar(t,q){
  if((q.op==='upsert'||q.op==='update')&&COLS[t]){const k=columnasMal(t,[].concat(q.v));if(k){rechazos.push(t+'.'+k);return {data:null,error:{message:`Could not find the '${k}' column of '${t}'`}}}}
  let filas=DB[t]||(DB[t]=[]);
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
 then(a,b){return window.__db(t,JSON.parse(JSON.stringify(st))).then(a,b)}};return o}
const st=b=>({upload:async(n,blob)=>{const buf=await blob.arrayBuffer();return window.__almacen('upload',[n,String(buf.byteLength)])},remove:async(l)=>window.__almacen('remove',[l]),getPublicUrl:n=>({data:{publicUrl:'https://gxkxslkdqgwovgxcuzkr.supabase.co/storage/v1/object/public/'+b+'/'+n}})});
window.supabase={createClient:()=>({storage:{from:st},auth:{getSession:async()=>({data:{session:{user:{id:'${HOTEL}',email:'hotel@x'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{}},from:q})};})();`;
async function pagina(b,url,{w=390}={}){
  const ctx=await b.newContext({viewport:{width:w,height:800},serviceWorkers:'block'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.exposeFunction('__db',(t,q)=>aplicar(t,q));
  await p.exposeFunction('__almacen',(op,a)=>almacen(op,a));
  await p.route(/supabase\.co\/storage/,r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}));
  await p.route(/fonts\.g|tabler|cdn\.jsdelivr/,r=>r.abort());
  await p.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:MOCK}));
  await p.addInitScript(()=>{try{localStorage.setItem('seda_rol','admin')}catch(e){}});
  await p.goto(url);await p.waitForTimeout(1500);
  await p.evaluate(()=>{const m=document.getElementById('rol-modal');if(m)m.style.display='none'});
  return p;
}
module.exports={ALMACEN,setAlmacen:v=>{almacenListo=v},rechazos,get DB(){return DB},set DB(v){DB=v},nuevaDB,log,pagina,setFallar:f=>{fallar=f},HOTEL};
