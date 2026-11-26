/* ══════════════════════════════════════
   OÍDO COCINA · Horarios: ayuda con preguntas
   Lupa en la cabecera de Horarios para quien aún no conoce la app: escribe una pregunta o una palabra
   («vacaciones», «móvil», «cambiar un turno») y salen los pasos, con botón «Llévame» a la pantalla.
   Todo en el aparato, sin conexión y sin IA. Quien solo consulta (cocina, sala…) solo ve lo suyo (`s`).
   Parte de Horarios (horarios.js): usa window.hzKit (irTab, SOLO, esc) y registra la barra con reg().
   Al añadir una pestaña o cambiar un botón de Horarios, actualizar ENTRADAS.
   ══════════════════════════════════════ */
(function(){
const K=window.hzKit;if(!K)return;
const {esc,SOLO}=K;
// [pregunta, palabras que usa la gente, pestaña a la que llevar, pasos, ¿la ve quien solo consulta?]
const ENTRADAS=[
['¿Por dónde empiezo?','empezar empiezo primeros pasos nuevo comenzar guia tutorial aprender como funciona','plantilla',['Primero apunta a tu gente: «Plantilla» → «Equipo» → «Añadir persona».','Luego, en «Plantilla» → «Horario», elige la semana con las flechas ← →.','Toca una celda (persona y día), escribe el turno y pulsa «Guardar».','Si quieres que lo rellene solo, usa «Generar semanas automáticamente» más abajo.'],false],
['¿Cómo cargo el horario de una semana?','cargar poner escribir apuntar horario semana turnos rellenar plantilla cuadrante','plantilla',['Abre «Plantilla» → «Horario».','Elige la semana con las flechas ← → (el botón «Hoy» vuelve a esta semana).','Toca la celda de la persona y el día, escribe el turno (por ejemplo 08:00-16:00) o pulsa uno de los botones rápidos.','Pulsa «Guardar». Se sube solo a la nube.'],false],
['¿Cómo escribo un turno partido?','partido dos bloques mediodia noche turno cortado','plantilla',['Toca la celda y, en el recuadro del turno, escribe un bloque por línea:','12:00-16:00','20:00-00:00','O pulsa el botón rápido «Partido» y ajusta las horas. Después «Guardar».'],false],
['¿Cómo pongo libre, vacaciones o baja en un día?','libre vacaciones baja maternal descanso dia ausencia','plantilla',['Toca la celda de la persona y el día.','Pulsa el botón rápido «Libre», «Vacaciones», «Baja» o «Baja maternal» y «Guardar».','Si es un periodo largo de vacaciones, es más rápido en «Vacaciones» → «Añadir».'],false],
['¿Cómo copio la semana anterior?','copiar repetir semana anterior igual pasada duplicar','plantilla',['En «Plantilla» → «Horario», ve a la semana vacía.','Pulsa «Repetir semana anterior» (o «Copiar semana del…»). Luego cambia lo que haga falta.'],false],
['¿Cómo hago que el horario se rellene solo?','generar automatico automaticamente solo rellenar semanas reglas variante deshacer','plantilla',['En «Plantilla» → «Horario», baja hasta «Generar semanas automáticamente».','Elige el lunes de partida y cuántas semanas, y pulsa «Generar».','Si no te gusta, «Otra variante» o «Deshacer». Solo rellena semanas vacías.','Las reglas (descansos, mínimo de gente…) se cambian en «Plantilla» → «Parámetros».'],false],
['¿Cómo añado a una persona nueva?','añadir alta nuevo nueva persona empleado cocinero ayudante equipo contratar','equipo',['Abre «Plantilla» → «Equipo».','Abajo, en «Añadir persona», pon nombre, puesto, grupo y la fecha «Desde» (cuando entra).','Pulsa «Añadir». Solo aparecerá en las semanas desde esa fecha.'],false],
['¿Cómo quito a alguien que se va?','quitar baja borrar eliminar persona se va despedir terminar contrato equipo hasta','equipo',['Abre «Plantilla» → «Equipo».','Pon la fecha «Hasta» (su último día). No lo borres: así se conserva su historial.','Pasa a «Ya no están» y deja de salir en las semanas siguientes.'],false],
['¿Dónde pongo el móvil de cada uno para el WhatsApp?','movil telefono whatsapp numero contacto','equipo',['Abre «Plantilla» → «Equipo».','En la casilla «Móvil (WhatsApp)» de cada persona escribe su número.','Solo lo ven los jefes. Luego se envía desde «Horario» → «Enviar el horario por WhatsApp».'],false],
['¿Cómo mando el horario por WhatsApp?','whatsapp enviar mandar mensaje horario equipo compartir copiar texto','plantilla',['En «Plantilla» → «Horario», baja hasta «Enviar el horario por WhatsApp».','«Texto de todo el equipo» da un mensaje para el grupo (puedes copiarlo).','«Enviar» abre WhatsApp con el horario de esa persona; tú pulsas enviar. Sale ✓ Enviado, y avisa si el horario cambia después.'],false],
['¿Cómo apunto las vacaciones de alguien?','vacaciones apuntar añadir periodo dias fechas libres cogerse','vacaciones',['Abre «Vacaciones» → «Añadir».','Elige la persona, el tipo (vacaciones, baja o baja maternal) y las fechas.','Rellena el horario solo con «VACACIONES» o «BAJA» y avisa si baja la cobertura. Las bajas no gastan días de vacaciones.'],false],
['¿Cómo veo quién está de vacaciones y cuándo?','ver vacaciones calendario año quien esta fuera coincidencias coinciden','vacaciones',['Abre «Vacaciones» → «Calendario»: todo el año, quién está fuera cada día.','«Coincidencias» te enseña qué días coinciden varios fuera.','«Personas» cuenta los días que lleva cada uno.'],false],
['¿Cómo evito vacaciones en fechas clave (feria, Semana Santa)?','bloquear fechas sin vacaciones feria semana santa prohibir nadie puede','vacaciones',['Abre «Vacaciones» → «Parámetros».','En «Fechas en las que nadie puede coger vacaciones» pon el motivo y las fechas, o usa «Este mes» / «Mes que viene».','Las vacaciones que caigan ahí saldrán marcadas con «Cuidado».'],false],
['¿Cómo reparto las vacaciones del año?','organizador repartir sugerir vacaciones año turnos propuesta','vacaciones',['Abre «Vacaciones» → «Organizador».','Te propone periodos para cada persona sin chocar con los demás.','Pulsa «Apuntar» en los que te valgan.'],false],
['¿Cómo apunto personal extra o alumnos en prácticas?','extra extras practicas alumno alumnos becario refuerzo eventual camarero suelto','extras',['«Plantilla» → «Extras» para personal de refuerzo y «Prácticas» para alumnos.','En «Añadir», pon nombre, puesto (o centro) y el turno de cada día de esa semana.','Pulsa «Añadir». Cuenta en la cobertura de esa semana.'],false],
['¿Cómo cambio las reglas del horario?','parametros reglas minimo personas cocina horas maximas descanso configurar','parametros',['Abre «Plantilla» → «Parámetros».','Cambia las personas mínimas por día, las horas máximas por semana o el descanso entre turnos.','Pulsa «Guardar parámetros». Se usan en los avisos, la cobertura y el generador.'],false],
['¿Cómo veo los eventos y si hay gente suficiente?','eventos banquete boda cobertura horas refuerzo gente suficiente personal evento','eventos',['Abre «Eventos»: salen los eventos de la semana con las personas que hay en cada hora.','Si falta gente en un evento, verás el aviso para reforzar ese día.'],false],
['¿Cómo veo mi horario?','mi semana mi horario que me toca turno cuando trabajo yo propio','mi',['Abre «Mi semana».','La primera vez elige tu nombre (se recuerda en este móvil). Si te equivocas, pulsa «No soy yo».','Verás tus turnos de esta semana y de la siguiente.'],true],
['¿Quién está trabajando ahora?','ahora quien esta hoy en turno entran fuera ahora mismo','ahora',['Abre «Mi semana» → «Ahora».','Ves quién está en turno, quién entra en menos de 2 horas y quién está fuera hoy.'],true],
['¿Cuántas horas llevo este mes?','horas mes contador cuantas llevo saldo debidas hechas','horas',['Abre «Mi semana» → «Horas».','Elige el mes con las flechas: horas hechas, debidas y saldo de cada persona.'],true],
['¿Cómo pido un cambio de turno con un compañero?','cambio cambiar turno compañero intercambiar permutar pedir cambio','cambios',['Abre «Cambios».','Elige tu día y con quién quieres cambiar, y pulsa «Pedir cambio».','Tu compañero lo acepta y después lo aprueba el jefe.'],true],
['¿Cómo apruebo un cambio de turno?','aprobar aceptar rechazar cambio turno jefe pendiente','cambios',['Abre «Cambios».','Los que ya aceptó el compañero salen para ti: «Aprobar» o «Rechazar».'],false],
['¿Cómo veo el cuadrante de toda la semana?','cuadrante plantilla completa tabla semana todos por dias vista','plantilla',['Abre «Plantilla» → «Horario» (en «Cuadrante» si solo consultas).','Con «Por días» ves un día tras otro (cómodo en el móvil) y con «Plantilla completa», la tabla de toda la semana.'],true],
['¿Cómo pongo Horarios en la pantalla de inicio del móvil?','instalar app movil icono acceso directo pantalla inicio descargar atajo','plantilla',['Si sale el botón dorado «Instalar», púlsalo.','Si no: en iPhone, «Compartir» → «Añadir a pantalla de inicio»; en Android, abre esta página en Chrome → ⋮ → «Instalar aplicación».'],true],
['Me falta una regla o algo que no encuentro','falta pedir sugerir parametro programador no encuentro idea','parametros',['En «Plantilla» → «Parámetros» (y en «Vacaciones» → «Parámetros») hay un botón «Pedir este parámetro».','Escribe qué necesitas y se lo envías al programador por WhatsApp o correo.'],false]
];
const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const VACIAS=['como','hago','hacer','el','la','los','las','un','una','unos','unas','de','del','en','a','al','y','o','que','se','me','mi','mis','para','por','con','donde','puedo','quiero','veo','ver','es','lo','le','apunto','apuntar','pongo','poner','saco','sacar','esta','estan','hay','cargar','cargo','quien','cuando','cuantas'];
const visibles=()=>ENTRADAS.filter(e=>!SOLO()||e[4]);
function buscar(q){
  const pal=norm(q).split(/[^a-z0-9ñ]+/).filter(p=>p.length>1),clave=pal.filter(p=>!VACIAS.includes(p));
  if(!clave.length)return pal.length?[]:null;
  return visibles().map(a=>{const t=norm(a[0]+' '+a[1]);return {a,p:clave.reduce((s,p)=>s+(t.includes(p)?1:0),0)}})
    .filter(x=>x.p>0&&x.p>=Math.ceil(clave.length/2)).sort((x,y)=>y.p-x.p).slice(0,6).map(x=>x.a)}
let acciones=[];
function faq(a){
  acciones.push(a[2]);const i=acciones.length-1;
  return `<details class="hza-faq"><summary>${esc(a[0])}</summary><ol>${a[3].map(p=>`<li>${esc(p)}</li>`).join('')}</ol><button type="button" class="btn btn-p hza-ir" data-hza-ir="${i}">Llévame</button></details>`}
function pintarRes(){
  const q=document.getElementById('hza-q').value,r=buscar(q),cuerpo=document.getElementById('hza-res');acciones=[];
  if(r===null)cuerpo.innerHTML=`<p class="hza-nota">Escribe lo que quieres hacer, por ejemplo «poner vacaciones», «añadir una persona» o «cambiar un turno». O mira las preguntas más habituales:</p>${visibles().slice(0,SOLO()?4:7).map(faq).join('')}`;
  else if(!r.length)cuerpo.innerHTML=`<p class="hza-nota">No he encontrado nada con «${esc(q)}». Prueba con otra palabra (por ejemplo «vacaciones», «móvil» o «turno»).</p>`+`<div class="hza-tit">Todas las preguntas</div>${visibles().map(faq).join('')}`;
  else cuerpo.innerHTML=r.map(faq).join('')+`<div class="hza-tit">Otras preguntas</div>`+visibles().filter(a=>!r.includes(a)).slice(0,4).map(faq).join('')}
function cerrar(){const m=document.getElementById('hza-modal');if(m)m.style.display='none'}
function abrir(){
  let m=document.getElementById('hza-modal');
  if(!m){
    if(!document.getElementById('hza-css')){const st=document.createElement('style');st.id='hza-css';st.textContent=CSS;document.head.appendChild(st)}
    m=document.createElement('div');m.id='hza-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Ayuda de Horarios');
    m.innerHTML=`<div class="hza-caja"><div class="hza-cab"><input id="hza-q" type="search" placeholder="Pregunta o busca ayuda…" autocomplete="off" aria-label="Pregunta o busca en la ayuda"><button type="button" class="hza-x" data-hza-x aria-label="Cerrar">✕</button></div><div class="hza-cuerpo" id="hza-res" aria-live="polite"></div></div>`;
    m.addEventListener('click',e=>{
      if(e.target===m||e.target.closest('[data-hza-x]'))return cerrar();
      const b=e.target.closest('[data-hza-ir]');if(b){const t=acciones[+b.dataset.hzaIr];cerrar();if(t&&typeof K.irTab==='function')K.irTab(t)}});
    let t=null;m.querySelector('#hza-q').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(pintarRes,120)});
    m.addEventListener('keydown',e=>{if(e.key==='Escape')cerrar()});
    document.body.appendChild(m)}
  m.style.display='flex';const q=document.getElementById('hza-q');q.value='';pintarRes();setTimeout(()=>q.focus(),50)}
// Lupa en la cabecera de Horarios (como la de Oído Cocina); abre la ayuda
function boton(){
  if(document.getElementById('hza-btn'))return;
  const cab=document.querySelector('header');if(!cab)return;
  if(!document.getElementById('hza-css')){const st=document.createElement('style');st.id='hza-css';st.textContent=CSS;document.head.appendChild(st)}
  const b=document.createElement('button');b.id='hza-btn';b.type='button';b.setAttribute('aria-label','Buscar y ayuda');b.setAttribute('aria-haspopup','dialog');
  // Lupa dibujada aquí: se ve aunque no cargue la fuente de iconos
  b.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m21 21-6-6"/></svg>';
  b.onclick=abrir;
  const ref=document.getElementById('sync');ref&&ref.parentNode===cab?cab.insertBefore(b,ref):cab.appendChild(b)}
K.reg({vistas:{},util:{ayudaBuscar:buscar,ayudaEntradas:()=>ENTRADAS.slice(),ayudaAbrir:abrir}});
window.horariosAyudaAbrir=abrir;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boton);else boton();
setInterval(boton,3000);
const CSS=`#hza-btn{display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:5px 10px;color:#c9a84c;cursor:pointer;min-height:34px;min-width:34px}
#hza-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1100;align-items:flex-start;justify-content:center;padding:16px 10px}
.hza-caja{background:var(--bg-primary,#fff);color:var(--text-primary,#1a1a1a);border-radius:var(--radius-lg,12px);width:100%;max-width:520px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35);overflow:hidden}
.hza-cab{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--border,#ddd)}
#hza-q{flex:1;min-width:0;font-size:16px;padding:10px 12px;border-radius:var(--radius,8px);border:1px solid var(--border-md,#bbb);background:var(--bg-secondary,#f4f3ee);color:var(--text-primary,#1a1a1a)}
.hza-x{background:none;border:0;font-size:16px;cursor:pointer;color:var(--text-secondary,#777);min-width:40px;min-height:40px}
.hza-cuerpo{padding:8px 12px 14px;overflow:auto}
.hza-nota{font-size:13px;color:var(--text-secondary,#777);margin:8px 2px}
.hza-tit{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary,#999);margin:14px 2px 6px}
.hza-faq{background:var(--bg-secondary,#f4f3ee);border:.5px solid var(--border,#ddd);border-radius:var(--radius,8px);margin-bottom:6px;padding:0 10px}
.hza-faq summary{cursor:pointer;padding:12px 0;font-size:14px;font-weight:500;min-height:44px;box-sizing:border-box}
.hza-faq ol{margin:0 0 8px;padding-left:20px;font-size:13px;line-height:1.5}
.hza-faq li{margin-bottom:4px}
.hza-ir{margin:2px 0 10px}`;
})();
