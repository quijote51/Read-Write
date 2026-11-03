const {chromium}=require('playwright');const N=require('./nube.js');
(async()=>{const b=await chromium.launch();
N.DB.config.push({hotel_id:'h1',key:'seda_precios',updated_at:'2026-11-03T10:00:00.000Z',value:{'Salmón':{precio:0.022,ud:'g'},'Nata':{precio:0.003,ud:'ml'}}});
const A=await N.pagina(b,'http://localhost:8765/index.html');
// Justo después de que A lea la nube, «otro aparato» cambia la nata (y la fecha de cambio)
let colado=false;
N.setFallar((t,q)=>{if(!colado&&t==='config'&&q.op==='update'){colado=true;setTimeout(()=>{},0);const c=N.DB.config.find(x=>x.key==='seda_precios');c.value={...c.value,'Nata':{precio:0.009,ud:'ml'}};c.updated_at='2026-11-03T10:00:05.000Z';}return false});
console.log('base antes:',JSON.stringify(await A.evaluate(()=>cfgBase('seda_precios'))).slice(0,120),'nube:',JSON.stringify(N.DB.config.find(x=>x.key==='seda_precios')).slice(0,200));N.log.length=0;
await A.evaluate(()=>{preciosIng['Salmón'].precio=0.03;return _subirConfig('seda_precios',preciosIng)});
const v=N.DB.config.find(x=>x.key==='seda_precios').value;
console.log('subidas:',N.log.join(' | '));
console.log(v['Salmón'].precio===0.03&&v['Nata'].precio===0.009?'✔ el otro se adelantó entre leer y guardar: se nota, se vuelve a juntar y quedan los dos cambios':'✘ FALLO '+JSON.stringify(v));
await b.close()})();
