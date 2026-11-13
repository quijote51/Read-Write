/* ══════════════════════════════════════
   OÍDO COCINA · Horarios: enviar el horario por WhatsApp
   Texto de toda la semana y, para cada persona, un mensaje solo con sus turnos (se abre WhatsApp con su móvil; tú pulsas enviar).
   Marca ✓ Enviado y avisa si el horario cambia después del envío (config.seda_horarios → enviado).
   Parte de Horarios (horarios.js): usa lo que comparte window.hzKit y registra aquí sus pantallas.
   ══════════════════════════════════════ */
(function(){
const K=window.hzKit;
const {H,fd,iso,lunes,sumar,corto,fmtH,cap,esc,pHM,tramos,horas,tipo,trabaja,equipoSem,fila,sinTurnos,personasDia,cobertura,enHora,guardar,avisos,pintar,SOLO,root,yo,DIAS,DL,MES,MESL,GRUPOS,MIN_COB,MAX_H,MIN_DESC,VAC_ANUAL}=K;
const activo=e=>K.activo(e);
/* ---- Texto para WhatsApp ---- */
const DC=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function corta(t){if(!t)return'–';const u=t.toUpperCase();if(u.includes('RECUPERA'))return'libre (recup.)';if(u.includes('LIBRE'))return'libre';if(u.includes('VACACIONES'))return'vacaciones';if(u.includes('BAJA'))return'baja';return t.split('\n').map(x=>x.replace(/:00/g,'')).join(' + ')}
function textoSemana(k){
  const f=sumar(fd(k),6);
  let o=`*Horario de cocina · ${corto(fd(k))} – ${corto(f)}*\n`;
  equipoSem(k).forEach(e=>{const a=fila(k,e.n);if(a.every(x=>!x))return;o+=`\n*${e.n}*: `+a.map((t,i)=>`${DC[i]} ${corta(t)}`).join(' · ')});
  return o}
let waAbierto=false;
// Texto personal (solo los turnos de esa persona) y enlace de WhatsApp a su móvil; si no hay móvil, WhatsApp deja elegir el contacto
function textoPersona(k,e){
  const a=fila(k,e.n),tot=a.reduce((x,t)=>x+horas(t),0);
  let o=`Hola ${e.n}, este es tu horario de cocina de la semana del ${corto(fd(k))} al ${corto(sumar(fd(k),6))}:\n`;
  a.forEach((t,i)=>{o+=`\n*${DC[i]} ${sumar(fd(k),i).getDate()}*: ${corta(t)}`});
  if(tot)o+=`\n\nTotal: ${fmtH(tot)} h`;
  return o+'\n\nSi algo no te encaja, avísame.'}
const hashT=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return h};
function waLink(tel,txt){let d=String(tel||'').replace(/[^\d]/g,'');if(d.length===9&&/^[679]/.test(d))d='34'+d;return 'https://wa.me/'+d+'?text='+encodeURIComponent(txt)}
// Marca como enviado (con la huella del texto, para avisar si el horario cambia después). No toca las semanas, solo el registro de envíos.
function marcarEnviado(k,n,txt){
  const E=H().enviado=H().enviado||{};(E[k]=E[k]||{})[n]={ts:Date.now(),h:hashT(txt)};H().ts=Date.now();
  try{localStorage.setItem(HZ_KEY,JSON.stringify(horarios))}catch(e){} try{syncConfig(HZ_KEY,horarios)}catch(e){}}
const fHM=ts=>{const d=new Date(ts);return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
function waPanel(k){
  if(sinTurnos(k))return'';
  const env=(H().enviado||{})[k]||{};
  const filas=equipoSem(k).filter(e=>fila(k,e.n).some(t=>!['vacio','baja','bajan'].includes(tipo(t)))).map(e=>{
    const x=env[e.n],igual=x&&x.h===hashT(textoPersona(k,e));
    const est=!x?'<small>Sin enviar</small>':igual?`<small class="hz-ok">✓ Enviado ${fHM(x.ts)}</small>`:`<small class="hz-cambio">Cambió desde el envío (${fHM(x.ts)}) · reenviar</small>`;
    return `<div class="hz-fila hz-envio"><span><b>${esc(e.n)}</b>${e.tel?'':' <small>· sin móvil</small>'}<br>${est}</span><button class="btn-sec" data-a="wasend" data-n="${esc(e.n)}" aria-label="Enviar su horario a ${esc(e.n)} por WhatsApp">${x?'Reenviar':'Enviar'}</button></div>`}).join('');
  return `<div class="card"><b>Enviar el horario a cada uno por WhatsApp</b><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 6px">Cada persona recibe solo sus turnos. Pon su móvil en la pestaña Equipo (sin móvil, WhatsApp te deja elegir el contacto). Se abre WhatsApp con el mensaje listo: tú pulsas enviar.</p>${filas}<div class="hz-bar" style="margin:10px 0 0"><button class="btn-sec" data-a="wa">${waAbierto?'Ocultar':'Texto de todo el equipo'}</button></div>${waAbierto?`<textarea id="hz-wa" rows="10" readonly style="margin-top:10px;font-size:12px">${esc(textoSemana(k))}</textarea><div class="hz-bar" style="margin:8px 0 0"><button class="btn btn-p" data-a="wacopiar">Copiar texto</button><span id="hz-wa-msg" style="font-size:12px;color:var(--text-secondary)"></span></div>`:''}</div>`}

K.reg({vistas:{waPanel},util:{textoPersona,textoSemana,waLink,hashT,marcarEnviado}});
document.addEventListener('click',e=>{
  const r=root();if(!r||!r.contains(e.target))return;
  const a=e.target.closest('[data-a]')?.dataset.a;
  if(a==='wasend'){const n=e.target.closest('[data-n]').dataset.n,k=iso(K.semana),p=equipoSem(k).find(x=>x.n===n);if(!p)return;const txt=textoPersona(k,p);marcarEnviado(k,n,txt);window.open(waLink(p.tel,txt),'_blank','noopener');pintar()}
  else if(a==='wa'){waAbierto=!waAbierto;pintar()}
  else if(a==='wacopiar'){const ta=document.getElementById('hz-wa'),m=document.getElementById('hz-wa-msg');ta.select();
    (navigator.clipboard?navigator.clipboard.writeText(ta.value):Promise.reject()).then(()=>{m.textContent='Copiado'},()=>{try{document.execCommand('copy');m.textContent='Copiado'}catch(e){m.textContent='Selecciona el texto y cópialo'}})}
});
})();
