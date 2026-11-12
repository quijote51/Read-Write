/* ══════════════════════════════════════
   OÍDO COCINA · Buscador y ayuda
   Lupa en la cabecera. Busca a la vez en:
   - Tus datos: eventos, recetas y artículos del inventario (solo lo que tu rol puede ver).
   - Las secciones de la app («temperaturas» → APPCC).
   - Preguntas de «¿cómo hago…?»: explicación corta con botón «Llévame».
   Todo en el aparato: sin conexión y sin IA.
   Usa del principal: eventos, recetas, inventario, ACC_TABS, ROLES, rolActual, seccionActiva, showTab,
   verReceta (recetario.js), editarEvento, irProdDashboard, hojasAbrir (hojas.js).
   ══════════════════════════════════════ */
(function(){
const ge = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Sin tildes ni mayúsculas: «Pescádo» encuentra «pescado»
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const rol = () => (typeof rolActual !== 'undefined' && rolActual) || 'admin';
const veo = tab => { if(tab === 'pasos') return ['admin','direccion','chef'].includes(rol()); if(tab === 'secciones') return true; const r = typeof ROLES !== 'undefined' && ROLES[rol()]; return !!r && r.tabs.includes(tab) && (typeof seccionActiva !== 'function' || seccionActiva(tab)) && !(typeof window.seccionOcultaUsuario === 'function' && window.seccionOcultaUsuario(tab)); };
const ir = (tab, luego) => { cerrar(); if(typeof showTab === 'function') showTab(tab); if(luego) setTimeout(luego, 120); };

// Palabras que la gente usa para cada sección (además de su nombre)
const SINONIMOS = {
  dashboard: 'inicio resumen portada hoy',
  eventos: 'eventos bodas banquetes comuniones lista de eventos',
  calendario: 'calendario mes fechas agenda',
  produccion: 'produccion raciones cantidades mise en place cuanto hacer como fue cerrar evento prevision',
  conjunta: 'conjunta varios eventos juntos produccion conjunta',
  recetario: 'recetas fichas tecnicas platos elaboraciones base salsas fondos masas',
  pedidos: 'pedidos proveedores whatsapp lista de la compra encargar',
  escandallo: 'escandallo coste precio de los platos margen food cost rendimiento merma aprovechable',
  bebidas: 'bebidas vinos barra',
  plantillas: 'plantillas menus tipo',
  vajilla: 'vajilla platos copas cubiertos menaje montaje',
  compras: 'compras',
  cocina: 'pantalla cocina pase comandas',
  historial: 'historial estadisticas eventos pasados',
  personal: 'personal extras camareros plantilla',
  horarios: 'horarios turnos cuadrante vacaciones libranzas cambio de turno',
  inventario: 'inventario recuento stock almacen camara existencias',
  appcc: 'appcc temperaturas camaras neveras limpieza muestra testigo etiquetas recepcion sanidad inspeccion',
  desperdicio: 'desperdicio sobras tirar basura envase taper ley plan de prevencion',
  cartas: 'carta qr alergenos comensal codigo qr menu',
  fichaje: 'fichaje fichar entrada salida jornada horas registro horario',
  hojas: 'hojas de evento imprimir hoja cocina sala montaje',
  costes: 'albaranes facturas costes gasto proveedores precios subidas stock minimo mermas',
  ajustes: 'ajustes configuracion datos del hotel logo equipo usuarios cuentas apps',
  nuevo: 'nuevo evento crear evento alta evento'
};

// Preguntas frecuentes: [pregunta, palabras extra, sección, pasos]
const AYUDA = [
  ['¿Cómo quito secciones que no uso?', 'quitar esconder ocultar secciones menu lista corta simplificar no uso elegir mostrar', 'secciones', ['Al final de la lista de secciones pulsa «Elegir qué secciones ves».', 'Quita las que no usas y pulsa «Guardar». Solo cambia en tu móvil y para tu rol.', 'Para recuperarlas, vuelve ahí y pulsa «Mostrar todas».']],
  ['¿Por dónde empiezo? (primeros pasos)', 'primeros pasos empezar empiezo inicio configurar nuevo cliente guia tutorial', 'pasos', ['En Inicio está la tarjeta «Primeros pasos» con lo mínimo para empezar: nombre del hotel, 3 recetas, precios, cámaras del APPCC, primer evento y equipo.', 'Cada paso tiene su botón «Hacerlo» y se marca solo cuando está hecho.', 'Si la ocultaste, «Llévame» la vuelve a mostrar.']],
  ['¿Cómo creo un evento?', 'nuevo evento boda alta crear', 'nuevo', ['En Inicio pulsa «Nuevo evento» (o abre la sección «Nuevo evento»).', 'Rellena nombre, fecha, hora, personas, lugar y tipo.', 'Añade los platos del menú y las alergias de los invitados, y guarda.']],
  ['¿Cómo cambio un evento?', 'editar evento modificar cambiar fecha pax', 'eventos', ['Abre «Eventos» y busca el evento.', 'Pulsa editar (el lápiz), cambia lo que haga falta y guarda.']],
  ['¿Cómo apunto las alergias de un evento?', 'alergias alergicos celiacos intolerancias invitados', 'eventos', ['Edita el evento.', 'En «Alergias», escribe cuántas personas y a qué (por ejemplo «2 pax celíacos»). Si no hay, déjalo vacío.', 'La app las cruza con los platos y avisa en Inicio, Producción y la campana.']],
  ['¿Cómo saco la ficha de alérgenos para el cliente?', 'ficha alergenos cliente imprimir whatsapp', 'eventos', ['En el evento pulsa «Alérgenos».', 'Revisa los platos marcados y pon quién lo ha revisado.', 'Imprímela o compártela por WhatsApp.']],
  ['¿Cuánto tengo que preparar para un evento?', 'raciones cantidades produccion cuanto', 'produccion', ['Abre «Producción» y elige el evento.', 'Verás las raciones y los ingredientes de cada plato, y las elaboraciones base que hay que hacer antes.']],
  ['¿Cómo cierro un evento (cuántos vinieron y qué sobró)?', 'como fue cerrar evento sobro falto prevision', 'produccion', ['Abre «Producción» y elige un evento que ya haya pasado.', 'En «¿Cómo fue?» pon cuántas personas vinieron y, plato a plato, si sobró, fue justo o faltó.', 'Con 3 eventos cerrados, la app empieza a sugerir cantidades.']],
  ['¿Cómo imprimo las hojas de cocina, sala y montaje?', 'hojas imprimir departamento cocina sala montaje', 'hojas', ['En la tarjeta del evento (Inicio) pulsa «Hojas», o abre «Hojas de evento».', 'Elige el departamento e imprime o comparte.', 'Si el evento cambia después, la campana te avisa de que hay que reimprimir.']],
  ['¿Cómo creo una receta?', 'nueva receta ficha tecnica plato alta dictar voz microfono ingredientes', 'recetario', ['Abre «Recetario» y pulsa «Nueva receta».', 'Pon el nombre y rellena una fila por ingrediente: ingrediente, cantidad por ración y unidad. «Añadir ingrediente» crea otra fila.', 'O pulsa «Dictar receta» y di: «Croquetas, ingredientes: leche cien mililitros, harina veinte gramos… alérgenos: gluten y lácteos». Revisa y guarda.']],
  ['¿Qué es una elaboración base y cómo la hago?', 'elaboracion base subreceta fondo salsa masa rinde tanda', 'recetario', ['En «Nueva receta», marca que es una elaboración base y di cuánto rinde una tanda (por ejemplo 2 litros).', 'Luego úsala como ingrediente dentro de otros platos: su coste y sus alérgenos pasan al plato.']],
  ['¿Cómo sé lo que cuesta un plato?', 'coste plato escandallo margen precio racion', 'escandallo', ['Abre «Escandallo».', 'Verás el coste por ración de cada plato con los precios de los ingredientes.', 'Si falta el precio de un ingrediente, ponlo en «Precios».']],
  ['¿Cómo pongo la merma de limpiar pescado o carne?', 'rendimiento merma aprovechable limpio bruto pescado carne', 'escandallo', ['En «Escandallo» → «Precios», columna «Aprov.».', 'Pon el % que queda tras limpiar, o usa la calculadora ⚖ con el peso antes y después.', 'El coste del plato y los pedidos se calculan con el producto limpio.']],
  ['¿Cómo apunto un albarán?', 'albaran factura entrada mercancia proveedor', 'costes', ['Abre «Albaranes y costes» → «Nuevo albarán».', 'Pon proveedor, número y fecha, y una línea por producto con la cantidad y el importe.', 'Con «Leer con foto» la app intenta rellenarlo sola desde una foto. Revisa siempre lo que lee.']],
  ['¿Cómo veo cuánto gasto por proveedor o por mes?', 'gasto proveedor mes familia compras', 'costes', ['Abre «Albaranes y costes» → pestaña «Gasto».', 'Puedes verlo por mes, proveedor, familia o artículo.']],
  ['¿Cómo pongo un stock mínimo?', 'stock minimo falta avisar reponer', 'costes', ['Abre «Albaranes y costes» → «Stock mínimo» y pon el mínimo de cada artículo.', 'Cuando el stock estimado baje de ahí, la campana avisa.']],
  ['¿Cómo veo las mermas del almacén?', 'mermas perdidas diferencia inventario almacen', 'costes', ['Abre «Albaranes y costes» → «Mermas».', 'Compara dos recuentos de inventario con lo que entró en los albaranes. Hacen falta al menos dos recuentos.', 'La merma de limpiar un producto (pescado, carne) va en «Escandallo» → «Precios» → «Aprov.».']],
  ['¿Cómo hago el inventario del mes?', 'inventario recuento contar almacen mes', 'inventario', ['Abre «Inventario» y elige la fecha del recuento.', 'Apunta la cantidad de cada artículo. Se guarda solo.', 'Desde el segundo recuento salen las mermas.']],
  ['¿Cómo apunto las temperaturas de las cámaras?', 'temperaturas camaras neveras congelador appcc registrar', 'appcc', ['Abre «APPCC» → «Hoy».', 'Escribe la temperatura de cada cámara y pulsa «Guardar». Se hace por la mañana y por la tarde.', 'Si sale fuera de rango, la app te pide qué has hecho.']],
  ['¿Cómo apunto la limpieza?', 'limpieza limpiar zonas appcc', 'appcc', ['Abre «APPCC» → «Hoy» y marca las zonas limpiadas.']],
  ['¿Cómo guardo la muestra testigo?', 'muestra testigo banquete appcc', 'appcc', ['Abre «APPCC» → «Hoy».', 'En «Muestra testigo», marca la del evento de hoy cuando la guardes.']],
  ['¿Cómo apunto la recepción de mercancía?', 'recepcion mercancia temperatura llegada appcc', 'appcc', ['Abre «APPCC» → «Recepción» y apunta proveedor, producto, temperatura y si se acepta.']],
  ['¿Cómo hago una etiqueta de producto?', 'etiqueta caducidad elaboracion vida util appcc', 'appcc', ['Abre «APPCC» → «Etiquetas».', 'Elige el producto y el tipo (refrigerado, vacío, congelado): la fecha de caducidad sale sola.']],
  ['¿Cómo saco la hoja de temperaturas o de limpieza firmada?', 'hoja planilla firmar firma temperaturas limpieza pdf enviar archivo imprimir mes responsable', 'appcc', ['Abre «APPCC» → «Registros» → «Hojas firmadas».', 'Elige Temperaturas o Limpieza y el mes, escribe el nombre del responsable y firma con el dedo.', 'Pulsa «Imprimir» o «Enviar archivo» (crea un PDF para WhatsApp o correo).']],
  ['¿Cómo saco los registros para la inspección?', 'registros inspeccion imprimir csv appcc sanidad', 'appcc', ['Abre «APPCC» → «Registros».', 'Elige las fechas e imprime o descarga el CSV.']],
  ['¿Cómo cambio las cámaras y zonas del APPCC?', 'ajustes appcc camaras zonas rangos', 'appcc', ['Abre «APPCC» → «Ajustes».', 'Pon tus cámaras con su rango de temperatura y tus zonas de limpieza.']],
  ['¿Cómo apunto lo que se tira o sobra?', 'desperdicio sobras tirar basura donar kg', 'desperdicio', ['Abre «Desperdicio» y apunta qué es, cuántos kg y a dónde va (donación, animales, compost, basura…).', 'El resumen del mes y el plan de prevención salen solos.']],
  ['¿Cómo saco el plan contra el desperdicio (ley 1/2025)?', 'plan prevencion desperdicio ley obligatorio cartel envase', 'desperdicio', ['Abre «Desperdicio» y pulsa el plan de prevención para imprimirlo.', 'También está el cartel del envase gratis para las sobras.']],
  ['¿Cómo pongo la carta QR de alérgenos en la mesa?', 'carta qr alergenos codigo comensal mesa publicar', 'cartas', ['Abre «Carta QR» y crea una carta con platos del recetario o del menú de un evento.', 'Pulsa publicar e imprime el cartel con el QR.', 'Si cambias platos, pulsa «Actualizar». Revisa antes que todos los platos tengan los alérgenos marcados.']],
  ['¿Cómo ficho la entrada y la salida?', 'fichar entrada salida pausa jornada', 'fichaje', ['Abre «Fichaje» y pulsa el botón grande: entrada, pausa, vuelta o salida.', 'Si no hay conexión, se guarda y se sube luego.']],
  ['¿Cómo veo los horarios o pido un cambio de turno?', 'horario turno cambio libranza vacaciones cuadrante', 'horarios', ['Abre «Horarios cocina».', 'Para cambiar un turno, elige el día y con quién, y pulsa «Pedir cambio». El compañero lo acepta y el jefe lo aprueba.']],
  ['¿Cómo hago el pedido a los proveedores?', 'pedido proveedor whatsapp encargar compra', 'pedidos', ['Abre «Pedidos» y elige los eventos.', 'La app suma los ingredientes por proveedor y prepara el mensaje de WhatsApp.']],
  ['¿Cómo recibo avisos en el móvil?', 'avisos notificaciones campana movil push', null, ['Pulsa la campana de arriba.', 'Abajo, en «Avisos en el móvil», elige qué avisos quieres y pulsa «Activar avisos en este móvil».']],
  ['¿Cómo invito a alguien del equipo?', 'invitar equipo usuario cuenta codigo alta empleado', 'ajustes', ['Abre «Ajustes» → «Equipo».', 'Crea un código con su rol y envíaselo. Lo usa en «Tengo un código de invitación».']],
  ['¿Cómo pongo el logo y los datos del hotel?', 'logo datos hotel nombre direccion telefono', 'ajustes', ['Abre «Ajustes» → «Datos del hotel».', 'Rellena los datos y pulsa «Subir logo». Saldrá en las hojas impresas y en la carta QR.']],
  ['¿Cómo instalo la app en el móvil?', 'instalar app pantalla de inicio icono acceso directo', null, ['Android: abre la app en Chrome, toca ⋮ y «Instalar aplicación» o «Añadir a pantalla de inicio».', 'iPhone: en Safari, botón Compartir → «Añadir a pantalla de inicio».', 'En «Ajustes» → «Apps con acceso directo» hay apps sueltas (APPCC, Fichaje, Albaranes…).']],
  ['¿Cómo cambio de rol?', 'rol cambiar chef sala direccion cocina', null, ['Pulsa el botón del rol en la cabecera (al lado de la campana) y elige otro.']]
];

// ── Buscar ──
function buscar(q){
  const t = norm(q).trim(); if(t.length < 2) return null;
  const pal = t.split(/\s+/).filter(Boolean);
  const casa = txt => { const n = norm(txt); return pal.every(p => n.includes(p)); };
  const puntua = txt => { const n = norm(txt); return pal.reduce((s, p) => s + (n.includes(p) ? 1 : 0), 0); };
  const out = {datos: [], secciones: [], ayuda: []};
  // Eventos
  const verEv = veo('nuevo') || veo('eventos') || veo('produccion') || veo('hojas') || veo('dashboard');
  if(verEv && typeof eventos !== 'undefined' && Array.isArray(eventos)){
    eventos.filter(e => casa([e.nombre, e.lugar, e.tipo, e.fecha, e.alergias_txt, (e.platos || []).map(p => typeof p === 'string' ? p : p && (p.nombre || p.n)).join(' ')].join(' ')))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 8)
      .forEach(e => out.datos.push({ic: 'ti-calendar-event', t: e.nombre, d: `Evento · ${String(e.fecha || '').split('-').reverse().join('/')} ·${e.pax || 0} pax${e.lugar ? ' · ' + e.lugar : ''}`, ir: () => abrirEvento(e.id)}));
  }
  // Recetas
  if(veo('recetario') && typeof recetas !== 'undefined' && Array.isArray(recetas)){
    recetas.filter(r => !r.borrado && casa([r.nombre, (r.ingredientes || []).map(i => i.nombre).join(' ')].join(' ')))
      .slice(0, 8)
      .forEach(r => {
        const enNombre = casa(r.nombre);
        const ing = enNombre ? '' : ' · lleva ' + (r.ingredientes || []).filter(i => casa(i.nombre)).map(i => i.nombre).slice(0, 2).join(', ');
        out.datos.push({ic: 'ti-book', t: r.nombre, d: (r.base ? 'Elaboración base' : 'Receta') + ing, ir: () => ir('recetario', () => { if(typeof verReceta === 'function') verReceta(r.id); })});
      });
  }
  // Inventario
  let inv = null; try{ inv = typeof inventario !== 'undefined' ? inventario : null; }catch(e){}
  if(veo('inventario') && inv && Array.isArray(inv.articulos)){
    inv.articulos.filter(a => a && casa([a.n, a.s].join(' '))).slice(0, 8)
      .forEach(a => out.datos.push({ic: 'ti-clipboard-list', t: a.n, d: `Inventario · ${a.s || ''}${a.u ? ' · ' + a.u : ''}${a.p ? ' · ' + Number(a.p).toFixed(2) + ' €' : ''}`, ir: () => ir('inventario')}));
  }
  // Secciones
  if(typeof ACC_TABS !== 'undefined'){
    Object.keys(ACC_TABS).filter(k => veo(k)).map(k => ({k, p: puntua(ACC_TABS[k].label + ' ' + (SINONIMOS[k] || ''))}))
      .filter(x => x.p === pal.length || (pal.length > 2 && x.p >= pal.length - 1))
      .sort((a, b) => b.p - a.p).slice(0, 4)
      .forEach(({k}) => out.secciones.push({ic: ACC_TABS[k].icon, t: ACC_TABS[k].label, d: 'Ir a la sección', ir: () => ir(k)}));
  }
  // Ayuda: se quitan palabras vacías («cómo», «el»…) para que «cómo apunto una merma» funcione
  const VACIAS = ['como','hago','hacer','el','la','los','las','un','una','unos','unas','de','del','en','a','al','y','o','que','se','me','mi','mis','para','por','con','donde','puedo','quiero','veo','ver','es','lo','le','apunto','apuntar','anoto','anotar','pongo','poner','saco','sacar','meto','meter','esta','estan','hay'];
  const clave = pal.filter(p => !VACIAS.includes(p));
  if(clave.length){
    AYUDA.filter(([, , tab]) => !tab || veo(tab))
      .map(a => ({a, p: clave.reduce((s, p) => s + (norm(a[0] + ' ' + a[1]).includes(p) ? 1 : 0), 0)}))
      .filter(x => x.p > 0 && x.p >= Math.ceil(clave.length / 2))
      .sort((x, y) => y.p - x.p).slice(0, 4)
      .forEach(({a}) => out.ayuda.push({q: a[0], pasos: a[3], tab: a[2]}));
  }
  return out;
}

function abrirEvento(id){
  if(veo('nuevo') && typeof editarEvento === 'function'){ cerrar(); return editarEvento(id); }
  if(veo('produccion') && typeof irProdDashboard === 'function'){ cerrar(); return irProdDashboard(id); }
  if(veo('hojas') && typeof hojasAbrir === 'function'){ cerrar(); return hojasAbrir(id); }
  ir(veo('eventos') ? 'eventos' : 'dashboard');
}

// ── Pantalla ──
let acciones = [];
function pintar(){
  const q = ge('bus-q').value, r = buscar(q), cuerpo = ge('bus-res');
  acciones = [];
  const item = x => { acciones.push(x.ir); return `<button class="bus-item" data-i="${acciones.length - 1}"><i class="ti ${esc(x.ic)}"></i><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span><i class="ti ti-chevron-right"></i></button>`; };
  if(!r){
    const sug = AYUDA.filter(([, , tab]) => !tab || veo(tab)).slice(0, 6);
    cuerpo.innerHTML = `<p class="bus-ayuda">Escribe un plato, un evento, un producto o una pregunta (por ejemplo «temperaturas» o «cómo apunto un albarán»).</p>
      <div class="bus-tit">Preguntas frecuentes</div>${sug.map(a => ayudaHtml({q: a[0], pasos: a[3], tab: a[2]})).join('')}`;
    return;
  }
  let h = '';
  if(r.datos.length) h += `<div class="bus-tit">En tus datos</div>${r.datos.map(item).join('')}`;
  if(r.secciones.length) h += `<div class="bus-tit">Secciones</div>${r.secciones.map(item).join('')}`;
  if(r.ayuda.length) h += `<div class="bus-tit">Cómo se hace</div>${r.ayuda.map(ayudaHtml).join('')}`;
  cuerpo.innerHTML = h || `<p class="bus-vacio"><i class="ti ti-mood-empty"></i> No he encontrado nada con «${esc(q)}». Prueba con otra palabra.</p>`;
}
function ayudaHtml(a){
  if(a.tab === 'pasos') acciones.push(() => { cerrar(); if(typeof window.pasosMostrar === 'function') window.pasosMostrar(); });
  else if(a.tab === 'secciones') acciones.push(() => { cerrar(); if(typeof window.seccionesElegir === 'function') window.seccionesElegir(); });
  else if(a.tab) acciones.push(() => ir(a.tab)); else acciones.push(null);
  const i = acciones.length - 1;
  return `<details class="bus-faq"><summary><i class="ti ti-help-circle"></i> ${esc(a.q)}</summary><ol>${a.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>${a.tab ? `<button class="btn btn-p bus-ir" data-i="${i}"><i class="ti ti-arrow-right"></i> Llévame</button>` : ''}</details>`;
}

function abrir(){
  let m = ge('bus-modal');
  if(!m){
    m = document.createElement('div'); m.id = 'bus-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Buscar');
    m.innerHTML = `<div class="bus-caja"><div class="bus-cab"><i class="ti ti-search"></i><input id="bus-q" type="search" placeholder="Buscar o preguntar…" autocomplete="off" aria-label="Buscar o preguntar"><button class="bus-x" data-x aria-label="Cerrar">✕</button></div><div class="bus-cuerpo" id="bus-res" aria-live="polite"></div></div>`;
    m.addEventListener('click', e => {
      if(e.target === m || e.target.closest('[data-x]')) return cerrar();
      const b = e.target.closest('[data-i]'); if(b){ const f = acciones[+b.dataset.i]; if(f) f(); }
    });
    let t = null;
    m.querySelector('#bus-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(pintar, 120); });
    m.addEventListener('keydown', e => {
      if(e.key === 'Escape') cerrar();
      if(e.key === 'Enter' && e.target.id === 'bus-q'){ const b = m.querySelector('.bus-item'); if(b) b.click(); }
    });
    document.body.appendChild(m);
  }
  m.style.display = 'flex';
  const q = ge('bus-q'); q.value = ''; pintar(); setTimeout(() => q.focus(), 50);
}
function cerrar(){ const m = ge('bus-modal'); if(m) m.style.display = 'none'; }

function boton(){
  if(ge('bus-btn')) return;
  const rolBtn = ge('rol-btn'); if(!rolBtn) return;
  if(!ge('bus-css')){ const st = document.createElement('style'); st.id = 'bus-css'; st.textContent = CSS; document.head.appendChild(st); }
  const b = document.createElement('button'); b.id = 'bus-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Buscar y ayuda'); b.setAttribute('aria-haspopup', 'dialog');
  // Lupa dibujada aquí: se ve aunque no cargue la fuente de iconos
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m21 21-6-6"/></svg>';
  b.onclick = abrir;
  const av = ge('av-btn');
  (av || rolBtn).parentNode.insertBefore(b, av || rolBtn);
}
window.buscarAbrir = abrir;
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boton); else boton();
// Por si la cabecera se vuelve a pintar
setInterval(boton, 3000);

const CSS = `#bus-btn{display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:5px 10px;color:#c9a84c;cursor:pointer;min-height:34px;min-width:34px}
#bus-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1003;align-items:flex-start;justify-content:center;padding:16px 10px}
.bus-caja{background:var(--bg-primary);color:var(--text-primary);border-radius:var(--radius-lg);width:100%;max-width:520px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.35);overflow:hidden}
.bus-cab{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:.5px solid var(--border)}
.bus-cab>.ti{color:var(--gold);font-size:18px}
#bus-q{flex:1;min-width:0;font-size:16px;padding:10px 12px;border-radius:var(--radius);border:1px solid var(--border-md);background:var(--bg-secondary);color:var(--text-primary)}
.bus-x{background:none;border:0;font-size:16px;cursor:pointer;color:var(--text-secondary);min-width:40px;min-height:40px}
.bus-cuerpo{padding:8px 12px 14px;overflow:auto}
.bus-tit{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary);margin:12px 2px 6px}
.bus-item{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:var(--bg-secondary);border:.5px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:6px;cursor:pointer;color:var(--text-primary);font:inherit;min-height:48px}
.bus-item>.ti:first-child{font-size:18px;color:var(--gold)}.bus-item span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.bus-item small{font-size:12px;color:var(--text-secondary);overflow-wrap:anywhere}
.bus-faq{background:var(--bg-secondary);border:.5px solid var(--border);border-radius:var(--radius);margin-bottom:6px;padding:0 10px}
.bus-faq summary{cursor:pointer;padding:11px 0;font-size:14px;font-weight:500;list-style:none;display:flex;gap:8px;align-items:center}
.bus-faq summary::-webkit-details-marker{display:none}.bus-faq summary .ti{color:var(--gold)}
.bus-faq ol{margin:0 0 10px;padding-left:22px;font-size:13px;line-height:1.55;color:var(--text-secondary)}.bus-faq li{margin-bottom:4px}
.bus-ir{margin:0 0 10px;font-size:13px}
.bus-ayuda{font-size:13px;color:var(--text-secondary);margin:8px 2px}
.bus-vacio{text-align:center;color:var(--text-secondary);margin:18px 0}`;
})();
