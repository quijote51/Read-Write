/* ══════════════════════════════════════
   OÍDO COCINA · Alérgenos
   - Lista de los 14 alérgenos y utilidades (etiqueta, icono).
   - Alérgenos de cada plato: lo marcado en el plato + su receta + sus ingredientes.
   - Cruce con las alergias de los invitados.
   - Ficha de alérgenos por evento para el cliente (Reglamento UE 1169/2011 y RD 126/2015):
     imprimible, con avisos internos (platos sin receta, posible huevo crudo) y «revisado por».
   Se carga antes del script principal de index.html. Usa del principal, solo al ejecutarse:
   recetaDePlato, eventos, fmtFecha, syncConfig, getTipoById.
   ══════════════════════════════════════ */

const ALERGENOS=[
  {id:'gluten',icon:'🌾',label:'Gluten'},{id:'crustaceos',icon:'🦐',label:'Crustáceos'},
  {id:'huevo',icon:'🥚',label:'Huevo'},{id:'pescado',icon:'🐟',label:'Pescado'},
  {id:'cacahuetes',icon:'🥜',label:'Cacahuetes'},{id:'soja',icon:'🫘',label:'Soja'},
  {id:'lacteo',icon:'🥛',label:'Lácteos'},{id:'frutos_secos',icon:'🌰',label:'Frutos secos'},
  {id:'apio',icon:'🌿',label:'Apio'},{id:'mostaza',icon:'🟡',label:'Mostaza'},
  {id:'sesamo',icon:'🌱',label:'Sésamo'},{id:'sulfitos',icon:'🍷',label:'Sulfitos'},
  {id:'altramuces',icon:'🫛',label:'Altramuces'},{id:'moluscos',icon:'🦪',label:'Moluscos'}
];
function algLabel(id){return ALERGENOS.find(a=>a.id===id)?.label||id}
function algIcon(id){return ALERGENOS.find(a=>a.id===id)?.icon||'<i class="ti ti-alert-triangle"></i>'}
const _algEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ── Alérgenos automáticos: unión de lo marcado en el plato + lo que declara su receta (y los ingredientes) ──
function algDePlato(p){
  const set=new Set(p.alg||[]);
  const r=typeof recetaDePlato==='function'?recetaDePlato(p):null;
  if(r){
    if(typeof algDeRecetaCompleta==='function') algDeRecetaCompleta(r).forEach(a=>set.add(a)); // con sus elaboraciones base (recetario.js)
    else { (r.alg||[]).forEach(a=>set.add(a)); (r.ingredientes||[]).forEach(i=>(i.alg||[]).forEach(a=>set.add(a))); }
  }
  return [...set];
}
const ALG_PALABRAS={
  gluten:['gluten','celiac','celíac','trigo'], crustaceos:['crustace','marisco','gamba','langostino'], moluscos:['molusco','marisco'],
  huevo:['huevo'], pescado:['pescado'], cacahuetes:['cacahuete','cacahuet','maní'], soja:['soja'],
  lacteo:['lácteo','lacteo','lactosa','leche'], frutos_secos:['frutos secos','fruto seco','nuez','nueces','almendra','avellana'],
  apio:['apio'], mostaza:['mostaza'], sesamo:['sésamo','sesamo'], sulfitos:['sulfito'], altramuces:['altramuz']
};
// ¿La nota de alergias del evento dice que NO hay alergias? Solo si TODA la nota lo dice: «Sin gluten» o «Sin lactosa,
// 2 pax» SÍ son alergias. Ante la duda se avisa. La misma regla está en avisos_calcular (supabase/avisos.sql).
function algSinAlergias(t){
  return !String(t||'').trim() || /^\s*(sin|ning[uú]n[ao]?|nada|no(\s+hay|\s+tienen?)?)(\s+(alergias?|al[eé]rgenos?|intolerancias?|nada))?(\s+(ni\s+intolerancias?|conocidas?|registradas?|declaradas?|indicadas?))*\s*[.!]*\s*$/i.test(t);
}
function algDeTexto(txt){
  const t=String(txt||'').toLowerCase();
  return Object.keys(ALG_PALABRAS).filter(id=>ALG_PALABRAS[id].some(k=>t.includes(k)));
}
function analisisAlergenos(ev){
  const porPlato=(ev.platos||[]).map(p=>({nombre:p.nombre,alg:algDePlato(p)}));
  const presentes=[...new Set(porPlato.flatMap(x=>x.alg))];
  const declarados=ev.alergenos_menu||[];
  const faltan=presentes.filter(a=>!declarados.includes(a));
  const invitados=algDeTexto(ev.alergias_txt).map(id=>({id,label:algLabel(id),platos:porPlato.filter(x=>x.alg.includes(id)).map(x=>x.nombre)}));
  return {presentes,faltan,invitados};
}
function htmlAlertaAlergenos(ev,compacto){
  const a=analisisAlergenos(ev), l=[];
  a.invitados.forEach(g=>l.push(g.platos.length
    ? `<b>${_algEsc(g.label)}</b>: lo llevan ${g.platos.map(_algEsc).join(', ')} → preparar alternativa`
    : `<b>${_algEsc(g.label)}</b>: ningún plato lo declara. Comprueba las recetas por si falta alguna marca.`));
  if(a.faltan.length) l.push(`En los platos pero sin marcar en el menú: ${a.faltan.map(x=>_algEsc(algLabel(x))).join(', ')}`);
  if(!l.length) return '';
  if(compacto) return `<div style="margin-top:6px;font-size:12px;color:#fca5a5;font-weight:600"><i class="ti ti-shield-exclamation"></i> ${l.length} aviso(s) de alérgenos: ${l.map(x=>x.replace(/<[^>]+>/g,'')).join(' · ')}</div>`;
  return `<div class="card" style="border:.5px solid var(--danger-text);background:var(--danger-bg);margin-bottom:10px"><div style="font-size:13px;font-weight:600;color:var(--danger-text);margin-bottom:4px"><i class="ti ti-shield-exclamation"></i> Cruce de alérgenos</div>${l.map(x=>`<div style="font-size:13px;padding:2px 0">${x}</div>`).join('')}</div>`;
}

/* ── Avisos internos de la ficha ── */
// Elaboraciones que suelen llevar huevo crudo o poco cocinado (RD 1021/2022: si no llegan a 70 °C, ovoproducto pasteurizado).
const ALG_HUEVO_CRUDO=/al+i ?ol+i|alioli|allioli|mayonesa|mahonesa|ensaladilla|tartar|tiramis|mousse|holandesa|bearnesa|merengue|carbonara|huevo (a baja|poco hecho|crudo)|yema curada/i;
const ALG_PASTEURIZADO=/pasteuriz|ovoproducto|huevina/i;
function avisosFichaAlergenos(ev){
  const sinReceta=[], huevo=[];
  (ev.platos||[]).forEach(p=>{
    const r=typeof recetaDePlato==='function'?recetaDePlato(p):null;
    if(!r && !(p.alg||[]).length) sinReceta.push(p.nombre);
    const ings=r?(typeof ingredientesBrutos==='function'?ingredientesBrutos(r).map(i=>i.nombre+(i.via?' · '+i.via:'')):(r.ingredientes||[]).map(i=>i.nombre)):[]; // con lo de dentro de sus elaboraciones base
    const textos=[p.nombre].concat(ings).join(' · ');
    if(ALG_HUEVO_CRUDO.test(textos) && !ALG_PASTEURIZADO.test(textos)) huevo.push(p.nombre);
  });
  return {sinReceta, huevo};
}

function _algSinDatos(p){ return !(p.alg||[]).length && !(typeof recetaDePlato==='function'&&recetaDePlato(p)); }

/* ── Revisión («revisado por»): se guarda en la nube como config 'seda_alg_rev' = {idEvento:{por,fecha,firma}} ── */
let algRevisiones=(()=>{try{return JSON.parse(localStorage.getItem('seda_alg_rev')||'{}')||{}}catch{return {}}})();
function setAlgRevisiones(v){ algRevisiones=v&&typeof v==='object'?v:{}; }
// Huella del menú: si cambian los platos o sus alérgenos, la revisión deja de valer.
function _firmaAlergenos(ev){
  const s=JSON.stringify([(ev.platos||[]).map(p=>[p.nombre,algDePlato(p).sort()]),(ev.alergenos_menu||[]).slice().sort()]);
  let h=0; for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0} return String(h>>>0);
}
function revisionAlergenos(ev){
  const r=algRevisiones[String(ev.id)]; if(!r) return null;
  return {...r, vigente:r.firma===_firmaAlergenos(ev)};
}
function marcarRevisionAlergenos(id,por){
  const ev=(typeof eventos!=='undefined'?eventos:[]).find(e=>String(e.id)===String(id)); if(!ev) return;
  algRevisiones={...algRevisiones,[String(ev.id)]:{por:String(por).trim().slice(0,60),fecha:new Date().toISOString(),firma:_firmaAlergenos(ev)}};
  try{localStorage.setItem('seda_alg_rev',JSON.stringify(algRevisiones))}catch{}
  if(typeof syncConfig==='function') syncConfig('seda_alg_rev',algRevisiones);
}

/* ── Ficha para el cliente ── */
function _fechaHora(iso){const d=new Date(iso),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`}
const ALG_CATS=[['F','Aperitivos fríos'],['C','Aperitivos calientes'],['M','Platos principales'],['P','Postres']];
// HTML de la ficha (lo que se imprime). Estilos propios para que se vea igual dentro de la app y en papel.
function htmlFichaAlergenos(ev){
  const platos=ev.platos||[];
  const presentes=new Set(platos.flatMap(p=>algDePlato(p)).concat(ev.alergenos_menu||[]));
  const rev=revisionAlergenos(ev);
  const fecha=typeof fmtFecha==='function'&&ev.fecha?fmtFecha(ev.fecha):(ev.fecha||'');
  const grupos=ALG_CATS.map(([k,t])=>[t,platos.filter(p=>p.cat===k)]).concat([['Otros',platos.filter(p=>!ALG_CATS.some(c=>c[0]===p.cat))]]).filter(g=>g[1].length);
  // Sin receta ni marcas no sabemos qué lleva: al cliente se le dice que consulte, nunca «sin alérgenos».
  const fila=p=>{const a=algDePlato(p);return `<tr><td class="fa-plato">${_algEsc(p.nombre)}</td><td>${a.length?a.map(x=>`<span class="fa-alg">${algIcon(x)} ${_algEsc(algLabel(x))}</span>`).join(' '):`<span class="fa-no">${_algSinDatos(p)?'Consultar al personal':'Sin alérgenos'}</span>`}</td></tr>`};
  return `<div class="fa-ficha">
  <div class="fa-cab">${typeof hLogo==='function'&&hLogo()?'<div style="float:right">'+hLogo(44)+'</div>':''}<div class="fa-tit">Información sobre alérgenos</div>
    <div class="fa-ev">${_algEsc(ev.nombre)}</div>
    <div class="fa-meta">${_algEsc(fecha)}${ev.hora?' · '+_algEsc(ev.hora):''}${ev.lugar?' · '+_algEsc(ev.lugar):''}${ev.pax?' · '+_algEsc(ev.pax)+' pax':''}</div></div>
  ${platos.length?`<table class="fa-tabla"><tbody>${grupos.map(([t,ps])=>`<tr><th colspan="2">${_algEsc(t)}</th></tr>${ps.map(fila).join('')}`).join('')}</tbody></table>`:'<p class="fa-no">Este evento todavía no tiene platos.</p>'}
  <div class="fa-res"><div class="fa-res-t">Alérgenos presentes en el menú</div>
    <div class="fa-grid">${ALERGENOS.map(a=>`<div class="fa-c${presentes.has(a.id)?' si':''}"><span>${a.icon}</span> ${_algEsc(a.label)}<b>${presentes.has(a.id)?'Sí':'No'}</b></div>`).join('')}</div></div>
  <p class="fa-legal">Información facilitada conforme al Reglamento (UE) 1169/2011 y al Real Decreto 126/2015. Si tiene alguna alergia o intolerancia, comuníquelo a nuestro personal antes del servicio.</p>
  <p class="fa-firma">${rev?`Revisado por ${_algEsc(rev.por)} el ${_fechaHora(rev.fecha)}${rev.vigente?'':' · el menú ha cambiado después'}`:'Pendiente de revisión por cocina'}</p>
</div>`;
}
const ALG_FICHA_CSS=`.fa-ficha{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;background:#fff;max-width:720px;margin:0 auto;padding:4px}
.fa-cab{border-bottom:2px solid #1a1a1a;padding-bottom:8px;margin-bottom:10px}.fa-tit{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#555}
.fa-ev{font-size:22px;font-weight:700;margin:2px 0}.fa-meta{font-size:13px;color:#444;font-family:system-ui,sans-serif}
.fa-tabla{width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px}.fa-tabla th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#555;padding:10px 0 4px;border-bottom:1px solid #ccc}
.fa-tabla td{padding:6px 0;border-bottom:1px solid #eee;vertical-align:top}.fa-plato{width:45%;padding-right:10px!important;font-weight:600}
.fa-alg{display:inline-block;background:#f3eee2;border-radius:10px;padding:1px 8px;margin:1px 0;white-space:nowrap}.fa-no{color:#777;font-style:italic}
.fa-res{margin-top:14px;font-family:system-ui,sans-serif}.fa-res-t{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#555;margin-bottom:6px}
.fa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px}.fa-c{display:flex;align-items:center;gap:5px;font-size:12px;border:1px solid #ddd;border-radius:6px;padding:4px 7px;color:#888}
.fa-c b{margin-left:auto;font-weight:600}.fa-c.si{border-color:#1a1a1a;color:#1a1a1a;background:#f3eee2}
.fa-legal{font-family:system-ui,sans-serif;font-size:11px;color:#555;margin:14px 0 4px}.fa-firma{font-family:system-ui,sans-serif;font-size:12px;font-weight:600;margin:0}
@media print{.fa-ficha{max-width:none}.fa-c,.fa-alg{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

// Texto plano para WhatsApp o correo.
function textoFichaAlergenos(ev){
  const l=[`*Alérgenos · ${ev.nombre}*`, `${ev.fecha&&typeof fmtFecha==='function'?fmtFecha(ev.fecha):ev.fecha||''}${ev.hora?' · '+ev.hora:''}`, ''];
  (ev.platos||[]).forEach(p=>{const a=algDePlato(p);l.push(`— ${p.nombre}: ${a.length?a.map(algLabel).join(', '):(_algSinDatos(p)?'consultar al personal':'sin alérgenos')}`)});
  const pres=[...new Set((ev.platos||[]).flatMap(p=>algDePlato(p)).concat(ev.alergenos_menu||[]))];
  l.push('', `Presentes en el menú: ${pres.length?pres.map(algLabel).join(', '):'ninguno'}`);
  const rev=revisionAlergenos(ev); l.push(rev?`Revisado por ${rev.por} el ${_fechaHora(rev.fecha)}${rev.vigente?'':' (el menú cambió después)'}`:'Pendiente de revisión por cocina');
  return l.join('\n');
}

/* ── Ventana de la ficha dentro de la app ── */
let _algFichaId=null;
function abrirFichaAlergenos(id){
  const ev=(typeof eventos!=='undefined'?eventos:[]).find(e=>String(e.id)===String(id)); if(!ev) return;
  _algFichaId=ev.id;
  let m=document.getElementById('alg-ficha-modal');
  if(!m){
    m=document.createElement('div'); m.id='alg-ficha-modal';
    m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Ficha de alérgenos');
    m.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:max(16px,env(safe-area-inset-top,0px)) 12px 24px';
    m.addEventListener('click',e=>{ if(e.target===m) cerrarFichaAlergenos(); const b=e.target.closest('[data-fa]'); if(b) _accionFicha(b.dataset.fa); });
    document.body.appendChild(m);
    const st=document.createElement('style'); st.textContent=ALG_FICHA_CSS+`
#alg-ficha-modal .fa-caja{background:var(--bg-primary,#fff);color:var(--text-primary,#1a1a1a);border-radius:12px;width:100%;max-width:760px;padding:14px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
#alg-ficha-modal .fa-hoja{background:#fff;border-radius:8px;padding:14px;margin-top:10px;border:1px solid #ddd}
#alg-ficha-modal .fa-acc{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#alg-ficha-modal .fa-av{border-radius:8px;padding:8px 12px;font-size:13px;margin-top:8px;background:var(--warn-bg,#fdf0d8);color:var(--warn-text,#7a4b07)}
#alg-ficha-modal .fa-av ul{margin:4px 0 0;padding-left:1.1rem}
#alg-ficha-modal .fa-rev{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#alg-ficha-modal .fa-rev input{flex:1;min-width:140px}`;
    document.head.appendChild(st);
  }
  _pintarFicha();
  m.style.display='flex';
  document.addEventListener('keydown',_escFicha);
}
function _escFicha(e){ if(e.key==='Escape') cerrarFichaAlergenos(); }
function cerrarFichaAlergenos(){ const m=document.getElementById('alg-ficha-modal'); if(m) m.style.display='none'; document.removeEventListener('keydown',_escFicha); if(typeof initAlergenosLista==='function'&&document.getElementById('al-root')) initAlergenosLista(); }
function _pintarFicha(msg){
  const m=document.getElementById('alg-ficha-modal'); const ev=(typeof eventos!=='undefined'?eventos:[]).find(e=>e.id===_algFichaId); if(!m||!ev) return;
  const av=avisosFichaAlergenos(ev), cruce=htmlAlertaAlergenos(ev), rev=revisionAlergenos(ev);
  const avisos=[];
  if(av.sinReceta.length) avisos.push(`<b>Sin receta ni alérgenos marcados:</b> ${av.sinReceta.map(_algEsc).join(', ')}. En la ficha saldrán como «Consultar al personal»: márcalos en el evento o crea su receta.`);
  if(av.huevo.length) avisos.push(`<b>Posible huevo crudo:</b> ${av.huevo.map(_algEsc).join(', ')}. Si no llega a 70 °C en el centro, usa huevo pasteurizado (RD 1021/2022).`);
  if(rev&&!rev.vigente) avisos.push('<b>El menú ha cambiado</b> desde la última revisión. Vuelve a revisarlo.');
  let yo=''; try{yo=localStorage.getItem('seda_alg_yo')||''}catch{}
  m.innerHTML=`<div class="fa-caja">
    <div class="fa-acc"><b style="font-size:15px;flex:1;min-width:150px"><i class="ti ti-shield-check"></i> Ficha de alérgenos</b>
      <button class="btn btn-p" data-fa="imprimir"><i class="ti ti-printer"></i> Imprimir</button>
      <button class="btn-sec" data-fa="copiar"><i class="ti ti-copy"></i> Copiar texto</button>
      <button class="btn-sec" data-fa="cerrar" aria-label="Cerrar">✕</button></div>
    ${avisos.length?`<div class="fa-av"><b>Antes de entregarla</b><ul>${avisos.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}
    ${cruce?`<div style="margin-top:8px">${cruce}</div>`:''}
    <div class="fa-rev"><input id="fa-rev-nombre" type="text" placeholder="Tu nombre (jefe de cocina)" value="${_algEsc(yo)}" aria-label="Nombre de quien revisa"><button class="btn-sec" data-fa="revisar"><i class="ti ti-check"></i> ${rev&&rev.vigente?'Volver a marcar revisado':'Marcar como revisado'}</button></div>
    ${msg?`<div style="font-size:12px;margin-top:6px;color:var(--success-text,#1f5a3c)">${_algEsc(msg)}</div>`:''}
    <div class="fa-hoja">${htmlFichaAlergenos(ev)}</div>
  </div>`;
}
function _accionFicha(a){
  const ev=(typeof eventos!=='undefined'?eventos:[]).find(e=>e.id===_algFichaId); if(!ev) return;
  if(a==='cerrar') return cerrarFichaAlergenos();
  if(a==='revisar'){
    const inp=document.getElementById('fa-rev-nombre'); const n=(inp&&inp.value||'').trim();
    if(!n){ if(inp){inp.focus();inp.style.outline='2px solid var(--danger-text,#b00)';} return; }
    try{localStorage.setItem('seda_alg_yo',n)}catch{}
    marcarRevisionAlergenos(ev.id,n); _pintarFicha('Revisión guardada.'); return;
  }
  if(a==='copiar'){
    const t=textoFichaAlergenos(ev);
    const ok=()=>_pintarFicha('Texto copiado. Pégalo en WhatsApp o en un correo.');
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok,()=>_copiarRespaldo(t,ok)); else _copiarRespaldo(t,ok);
    return;
  }
  if(a==='imprimir') imprimirFichaAlergenos(ev);
}
function _copiarRespaldo(t,ok){ const ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); ok();}catch{} ta.remove(); }
// Imprime solo la ficha, en un iframe aparte para no arrastrar los estilos de impresión de la app.
function imprimirFichaAlergenos(ev){
  const doc=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Alérgenos · ${_algEsc(ev.nombre)}</title><style>body{margin:16mm 14mm;background:#fff}${ALG_FICHA_CSS}</style></head><body>${htmlFichaAlergenos(ev)}</body></html>`;
  const f=document.createElement('iframe'); f.setAttribute('aria-hidden','true'); f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const d=f.contentWindow.document; d.open(); d.write(doc); d.close();
  setTimeout(()=>{ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch{ const w=window.open('','_blank'); if(w){w.document.write(doc);w.document.close();w.print();} } setTimeout(()=>f.remove(),60000); },250);
}

/* ── Lista de eventos para la app suelta de Alérgenos (alergenos.html) ── */
let _algPasados=false;
function estadoAlergenos(ev){
  const rev=revisionAlergenos(ev), av=avisosFichaAlergenos(ev), cruce=analisisAlergenos(ev);
  const n=av.sinReceta.length+av.huevo.length+cruce.invitados.length+(cruce.faltan.length?1:0);
  return {rev,n,av,cruce};
}
function htmlListaAlergenos(){
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const k=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const hoyK=k(hoy);
  const todos=(typeof eventos!=='undefined'?eventos:[]).filter(e=>e&&e.fecha);
  const lista=todos.filter(e=>_algPasados?e.fecha<hoyK:e.fecha>=hoyK).sort((a,b)=>_algPasados?b.fecha.localeCompare(a.fecha):a.fecha.localeCompare(b.fecha));
  const pend=todos.filter(e=>e.fecha>=hoyK&&!(revisionAlergenos(e)||{}).vigente).length;
  const tarjeta=ev=>{
    const s=estadoAlergenos(ev);
    const chip=s.rev&&s.rev.vigente?`<span class="badge b-success">Revisado por ${_algEsc(s.rev.por)}</span>`:s.rev?'<span class="badge b-warn">El menú cambió: revisar</span>':'<span class="badge b-warn">Sin revisar</span>';
    const detalle=[s.av.sinReceta.length?`${s.av.sinReceta.length} plato${s.av.sinReceta.length===1?'':'s'} sin datos`:'',s.av.huevo.length?'posible huevo crudo':'',s.cruce.invitados.length?`alergias de invitados: ${s.cruce.invitados.map(g=>g.label).join(', ')}`:''].filter(Boolean).join(' · ');
    return `<div class="card al-ev"><div class="al-ev-t"><b>${_algEsc(ev.nombre)}</b><small>${_algEsc(typeof fmtFecha==='function'?fmtFecha(ev.fecha):ev.fecha)}${ev.hora?' · '+_algEsc(ev.hora):''}${ev.pax?' · '+_algEsc(ev.pax)+' pax':''}${ev.lugar?' · '+_algEsc(ev.lugar):''}</small>
      <div class="al-ev-c">${chip}${s.n?` <span class="badge b-danger">${s.n} aviso${s.n===1?'':'s'}</span>`:''}</div>${detalle?`<small class="al-ev-d">${_algEsc(detalle)}</small>`:''}</div>
      <button class="btn btn-p" onclick="abrirFichaAlergenos('${_algEsc(String(ev.id))}')"><i class="ti ti-shield-check"></i> Ver ficha</button></div>`;
  };
  return `<style>.al-ev{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.al-ev-t{flex:1;min-width:200px;display:flex;flex-direction:column;gap:3px}.al-ev-t small{color:var(--text-secondary)}.al-ev-c{display:flex;flex-wrap:wrap;gap:4px}.al-ev-d{font-size:12px}
  .al-cab{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}.al-cab p{margin:0;flex:1;min-width:200px;color:var(--text-secondary);font-size:13px}</style>
  <div class="al-cab"><p>${_algPasados?'Eventos pasados':(pend?`${pend} evento${pend===1?'':'s'} próximo${pend===1?'':'s'} sin revisar`:'Todos los próximos eventos están revisados')}</p>
  <button class="btn-sec" onclick="_algPasados=!_algPasados;initAlergenosLista()">${_algPasados?'Ver próximos':'Ver pasados'}</button></div>
  ${lista.length?lista.map(tarjeta).join(''):`<div class="card hz-vacio">${_algPasados?'No hay eventos pasados.':'No hay eventos próximos. Créalos en Oído Cocina.'}</div>`}`;
}
function initAlergenosLista(){ const r=document.getElementById('al-root'); if(r) r.innerHTML=htmlListaAlergenos(); }
