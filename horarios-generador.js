/* ══════════════════════════════════════
   OÍDO COCINA · Horarios: generador automático de semanas
   Rellena semanas vacías con las reglas (2 días libres seguidos, 40 h, 12 h de descanso, cobertura mínima), las vacaciones y los
   eventos. «Otra variante» y «Deshacer». Aleatorio con semilla: la misma semilla da siempre lo mismo.
   Parte de Horarios (horarios.js): usa lo que comparte window.hzKit y registra aquí sus pantallas.
   ══════════════════════════════════════ */
(function(){
const K=window.hzKit;
const {H,fd,iso,lunes,sumar,corto,fmtH,cap,esc,pHM,tramos,horas,tipo,trabaja,equipoSem,fila,sinTurnos,personasDia,cobertura,enHora,guardar,avisos,pintar,SOLO,root,yo,DIAS,DL,MES,MESL,GRUPOS,MIN_COB,MAX_H,MIN_DESC,VAC_ANUAL}=K;
const activo=e=>K.activo(e);
const factorEv=ev=>K.factorEv(ev);
/* ---- generador automático de semanas ---- */
const MENU_BASE=['08:00-16:00','14:30-22:30','16:00-00:00','12:00-16:00\n20:00-00:00'];
function menuDe(e){
  if(e.n==='David')return{t:['06:00-14:00']};
  if(e.n==='John')return{t:['06:30-14:30','16:00-00:00','12:00-16:00\n20:00-00:00'],pref:'06:30-14:30'};
  if(e.g===0)return{t:['08:00-16:00','14:30-22:30','16:00-00:00']};
  if(e.g>=3)return{t:['12:00-16:00\n20:00-00:00','16:00-00:00','08:00-16:00']};
  return{t:MENU_BASE,noDes:e.n==='Fabián'};
}
const finDe=tr=>tr.length?Math.max(...tr.map(x=>x[1])):null;
const iniDe=tr=>tr.length?Math.min(...tr.map(x=>x[0])):null;
const solapa=(tr,a,b)=>tr.reduce((s,[i,f])=>s+Math.max(0,Math.min(f,b)-Math.max(i,a)),0);
const cubre=(tr,h)=>tr.some(([i,f])=>(h>=i&&h<f)||(h+24>=i&&h+24<f));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function forzado(e,fechaIso){
  const v=H().vac.find(x=>x.e===e.n&&x.i<=fechaIso&&x.f>=fechaIso);
  return v?(v.t==='maternal'?'BAJA MATERNAL':'VACACIONES'):null}
function candidatos(e,forz,finPrev,R){
  const menu=menuDe(e),F=[0,1,2,3,4,5,6].filter(d=>!forz[d]),out=[];
  const pares=[];for(let d=0;d<6;d++)if(!forz[d]&&!forz[d+1])pares.push([d,d+1]);
  let opciones;
  if(F.length<=2)opciones=[F];else if(pares.length&&F.length>=3)opciones=pares;else opciones=[[]];
  opciones.forEach(libres=>{
    const trab=F.filter(d=>!libres.includes(d));
    const sh=Array(7).fill(null);
    const dfs=(ix)=>{
      if(ix===trab.length){
        const t=Array(7).fill('');for(let d=0;d<7;d++)t[d]=forz[d]||(libres.includes(d)||!trab.includes(d)?'LIBRE':sh[d]);
        out.push({t,tr:t.map(tramos),libre:t.map(x=>x==='LIBRE'),des:t.map(x=>x&&x!=='LIBRE'&&tramos(x).length&&iniDe(tramos(x))<=7)});return}
      const d=trab[ix];
      for(const x of menu.t){
        const tr=tramos(x);
        if(menu.noDes&&iniDe(tr)<=7&&!R.sinDesayuno[d])continue;
        const prev=d===0?finPrev:(sh[d-1]&&trab.includes(d-1)?finDe(tramos(sh[d-1])):null);
        if(prev!=null&&iniDe(tr)+24-prev<MIN_DESC)continue;
        sh[d]=x;dfs(ix+1);sh[d]=null}
    };
    dfs(0)});
  return out}
function penal(sol,pers,R){
  let p=0;
  for(let d=0;d<7;d++){
    let cov=0,lib=0,mediodia=false,noche=false,desayuno=false;
    sol.forEach((c,i)=>{const tr=c.tr[d];if(tr.length){cov++;if(pers[i].g<=1){if(solapa(tr,12,16)>=3)mediodia=true;if(solapa(tr,20,24)>=3)noche=true}if(iniDe(tr)<=7)desayuno=true}if(c.libre[d])lib++});
    if(cov<MIN_COB)p+=100*(MIN_COB-cov);
    if(d>=5&&lib>1)p+=100*(lib-1);
    if(lib>2)p+=10*(lib-2);
    if(!mediodia)p+=80;if(!noche)p+=80;if(!desayuno&&R.hayDesayuno[d])p+=80;
    R.ev[d].forEach(ev=>{const pres=sol.filter((c,i)=>pers[i].g<=3&&cubre(c.tr[d],ev.h)).length;if(pres<ev.nec)p+=60*(ev.nec-pres)});
  }
  sol.forEach((c,i)=>{
    const tipos=new Set(c.t.filter(x=>x&&x!=='LIBRE'&&!/VACACIONES|BAJA/.test(x)));if(tipos.size>2)p+=tipos.size-2;
    const m=menuDe(pers[i]);if(m.pref)p+=2*c.t.filter(x=>x&&x!=='LIBRE'&&!/VACACIONES|BAJA/.test(x)&&x!==m.pref).length;
    if((c.libre[5]||c.libre[6])&&R.finde[i])p+=4});
  return p}
function generarSemana(k,seed){
  const pers=equipoSem(k),lun=fd(k),prevK=iso(sumar(lun,-7)),prev=H().semanas[prevK]||{};
  const rp=(typeof ajustes!=='undefined'&&ajustes&&Number(ajustes.raciones_por_persona))||80;
  const R={sinDesayuno:[],hayDesayuno:[],ev:[],finde:[]};
  const forz=pers.map(e=>[0,1,2,3,4,5,6].map(d=>forzado(e,iso(sumar(lun,d)))));
  const evs=(typeof eventos!=='undefined'?eventos:[]);
  for(let d=0;d<7;d++){
    const f=iso(sumar(lun,d));
    const dsf=pers.filter((e,i)=>menuDe(e).t.some(x=>tramos(x).length&&iniDe(tramos(x))<=7)&&!menuDe(e).noDes&&!forz[i][d]);
    R.hayDesayuno[d]=dsf.length>0;
    R.sinDesayuno[d]=!dsf.length; // Fabián solo hace desayuno si David y John no pueden
    const dia=evs.filter(e=>e.fecha===f),rac=dia.reduce((x,e)=>x+Math.round((Number(e.pax)||0)*factorEv(e)),0),nec=Math.max(2,Math.ceil(rac/rp));
    R.ev[d]=dia.filter(e=>e.hora).map(e=>({h:pHM(e.hora),nec}));
  }
  const finPrev=pers.map(e=>{const t=tramos((prev[e.n]||[])[6]);return finDe(t)});
  R.finde=pers.map(e=>{const a=prev[e.n]||[];return tipo(a[5])==='libre'||tipo(a[6])==='libre'});
  // los desayunos dependen de cada persona: R.sinDesayuno se usa por día
  const cands=pers.map((e,i)=>{let c=candidatos(e,forz[i],finPrev[i],R);const r=rng(seed+i*7919);if(c.length>2500){c=c.map(x=>[r(),x]).sort((a,b)=>a[0]-b[0]).slice(0,2500).map(x=>x[1])}return c});
  if(cands.some(c=>!c.length))return{pers,sol:null,pen:Infinity};
  const r=rng(seed);let best=null;
  for(let rs=0;rs<14&&!(best&&best.pen===0);rs++){
    const cur=cands.map(c=>c[r()*c.length|0]);let pen=penal(cur,pers,R);
    for(let it=0;it<2500&&pen>0;it++){const i=r()*pers.length|0,old=cur[i];cur[i]=cands[i][r()*cands[i].length|0];const p2=penal(cur,pers,R);if(p2<=pen||r()<0.005)pen=p2;else cur[i]=old;
      if(!best||pen<best.pen)best={pen,sol:cur.slice()}}
    if(!best||pen<best.pen)best={pen,sol:cur.slice()}}
  return{pers,sol:best.sol,pen:best.pen}}
let ultGen=null,genMsg='';
function primeraVacia(){let d=lunes(new Date());for(let i=0;i<60;i++){if(sinTurnos(iso(d)))return iso(d);d=sumar(d,7)}return iso(lunes(new Date()))}
function generar(k0,n,seed){
  const ks=[],prevs={},res=[];
  for(let w=0;w<n;w++){
    const k=iso(sumar(fd(k0),7*w));
    if(!sinTurnos(k)){res.push(`${corto(fd(k))}: ya tenía turnos, se respeta`);continue}
    const g=generarSemana(k,seed+w*101);
    if(!g.sol){res.push(`${corto(fd(k))}: no se pudo generar (revisa vacaciones y turnos permitidos)`);continue}
    prevs[k]=hzClon(H().semanas[k]||null);ks.push(k);
    H().semanas[k]=H().semanas[k]||{};
    g.pers.forEach((e,i)=>{H().semanas[k][e.n]=g.sol[i].t.slice()});
    const av=avisos(k);
    res.push(`${corto(fd(k))}: ${av.length?av.length+' aviso'+(av.length===1?'':'s')+' ('+av.slice(0,2).map(esc).join('; ')+(av.length>2?'…':'')+')':'sin avisos'}`)}
  ultGen={ks,prevs,k0,n,seed};
  if(ks.length)guardar(ks);
  genMsg=res.join('<br>');
}
function deshacerGen(){
  if(!ultGen)return;ultGen.ks.forEach(k=>{if(ultGen.prevs[k])H().semanas[k]=ultGen.prevs[k];else delete H().semanas[k]});
  guardar(ultGen.ks);const u=ultGen;ultGen=null;genMsg='';return u}
function panelGenerar(){
  const k0=primeraVacia();
  return `<div class="card"><b>Generar semanas automáticamente</b> <small style="color:var(--text-secondary)">con las reglas, las vacaciones y los eventos de la nube</small>
  <div class="hz-form"><label>Desde (lunes)<input type="date" id="hz-g0" value="${k0}"></label><label>Semanas<select id="hz-gn">${[1,2,3,4,5,6,8].map(n=>`<option${n===4?' selected':''}>${n}</option>`).join('')}</select></label></div>
  <div class="hz-bar" style="margin:0"><button class="btn btn-p" data-a="generar">Generar</button>${ultGen&&ultGen.ks.length?`<button class="btn-sec" data-a="otra">Otra variante</button><button class="btn-sec" data-a="deshacer">Deshacer</button>`:''}</div>
  ${genMsg?`<div class="hz-aviso ${ultGen&&ultGen.ks.length?'ok':'warn'}" style="margin:10px 0 0">${genMsg}</div>`:''}
  <p style="font-size:11px;color:var(--text-secondary);margin:8px 0 0">Solo rellena semanas vacías. Reglas: 2 días libres seguidos, 40 h, 12 h de descanso, cobertura mínima 3, máximo 1 libre en sábado y domingo, jefatura o cocinero a mediodía y de noche, desayuno cubierto. Si hay un evento, refuerza ese día según las raciones.</p></div>`}

K.reg({vistas:{panelGenerar},util:{generar,deshacerGen,generarSemana}});
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='generar'){const d=fd(document.getElementById('hz-g0').value||primeraVacia());generar(iso(lunes(d)),+document.getElementById('hz-gn').value,1);pintar()}
  else if(a==='otra'){const u=deshacerGen();generar(u.k0,u.n,u.seed+1);pintar()}
  else if(a==='deshacer'){deshacerGen();pintar()}
});
})();
