// Horarios sin navegador: carga horarios*.js (los que cargan index.html) en un contexto de Node con un document falso,
// con la fecha fija en el viernes 13/11/2026, y comprueba cálculos, pantallas y botones con datos como los del Seda.
// Sin dependencias (solo Node 18+):   node pruebas/horarios.js
// Para comprobar que un cambio de código no altera lo que se ve:
//   node pruebas/horarios.js --golden-escribir f.json     (guarda una huella de cada pantalla)
//   node pruebas/horarios.js --golden f.json              (compara con esa huella)
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const RAIZ = path.join(__dirname, '..');
const args = process.argv.slice(2), arg = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
let fallos = 0;
const ok = (c, t) => { if(!c) fallos++; console.log((c ? '✔ ' : '✘ FALLO ') + t); };
const sha = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);

// Los scripts de Horarios, en el orden en que los carga index.html
const SCRIPTS = [...fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').matchAll(/<script src="\/?(horarios[^"]*\.js)"><\/script>/g)].map(m => m[1]);

// ── Datos como los del Seda (equipo, semana 9 y 16 de nov, vacaciones reales, eventos) ──
const P = '12:00-16:00\n20:00-00:00', V7 = Array(7).fill('VACACIONES'), B7 = Array(7).fill('BAJA MATERNAL');
const datos = () => ({
  ts: 1000, wts: {},
  equipo: ['Rubén', 'Darío', 'Fabián', 'Álvaro', 'Rocío', 'John', 'David', 'Ana', 'Rosa', 'Camila', 'Jimena'].map((n, i) => ({g: i === 0 ? 0 : 1, n, rol: i === 0 ? 'Jefe de cocina' : 'Cocinero', desde: '', hasta: '', tel: n === 'Ana' ? '600 11 22 33' : ''})),
  semanas: {
    '2026-11-09': {'Rubén': ['16:00-00:00', '16:00-00:00', 'LIBRE', 'LIBRE', '08:00-16:00', '08:00-16:00', '08:00-16:00'], 'Darío': ['08:00-16:00', '08:00-16:00', P, P, '16:00-00:00', 'LIBRE', 'LIBRE'], 'Ana': [P, P, '16:00-00:00', '16:00-00:00', 'LIBRE', 'LIBRE', '16:00-00:00'], 'Fabián': V7, 'Rocío': B7, 'Camila': B7},
    '2026-11-16': {
      'Darío': ['16:00-00:00', '16:00-00:00', '16:00-00:00', 'LIBRE', 'LIBRE', P, P],
      'Álvaro': ['LIBRE', 'LIBRE', P, P, '10:00-18:00', '08:00-16:00', '08:00-16:00'],
      'John': ['LIBRE', 'LIBRE', '06:30-14:30', '06:30-14:30', '06:30-14:30', '06:30-14:30', '06:30-14:30'],
      'Ana': [P, P, 'LIBRE', 'LIBRE', '16:00-00:00', '16:00-00:00', '16:00-00:00'],
      'Jimena': ['LIBRE', 'LIBRE', '08:00-12:00\n16:00-20:00', '08:00-12:00\n20:00-00:00', '14:30-22:30', '14:30-22:30', '14:30-22:30'],
      'David': ['06:00-14:00', '06:00-14:00', 'LIBRE', 'LIBRE', P, P, '12:00-20:00'],
      'Rubén': ['08:00-16:00', '08:00-16:00', '14:00-22:00', '14:00-22:30', '08:00-16:00', 'LIBRE', 'LIBRE'],
      'Fabián': V7, 'Rocío': B7, 'Camila': B7, 'Rosa': Array(7).fill('')}},
  extras: {}, practicas: {}, bloqueos: [], enviado: {},
  vac: [{e: 'Rubén', f: '2026-08-22', i: '2026-08-01', n: 'Verano principal', t: 'verano'}, {e: 'Rubén', f: '2026-12-31', i: '2026-12-24', n: 'Navidad', t: 'invierno'}, {e: 'Fabián', f: '2026-08-04', i: '2026-07-15', n: 'Verano', t: 'verano'}, {e: 'Álvaro', f: '2026-07-14', i: '2026-07-01', n: 'Verano', t: 'verano'}, {e: 'Rocío', f: '2026-12-31', i: '2026-01-15', n: 'Baja maternal', t: 'maternal'}, {e: 'John', f: '2026-08-25', i: '2026-08-10', n: 'Verano', t: 'verano'}, {e: 'David', f: '2026-08-10', i: '2026-07-20', n: 'Verano', t: 'verano'}, {e: 'Ana', f: '2026-08-15', i: '2026-08-01', n: 'Verano', t: 'verano'}, {e: 'Camila', f: '2026-12-31', i: '2026-01-20', n: 'Baja maternal', t: 'maternal'}, {e: 'Fabián', f: '2026-11-15', i: '2026-11-09', n: 'Semana de noviembre', t: 'extra'}, {e: 'David', f: '2026-10-25', i: '2026-10-19', n: 'Vacaciones octubre', t: 'extra'}, {e: 'Álvaro', f: '2026-11-08', i: '2026-10-26', n: 'Vacaciones octubre-noviembre', t: 'extra'}, {e: 'Fabián', f: '2026-11-22', i: '2026-11-16', n: 'Semana de noviembre', t: 'extra'}]});
const EVENTOS = [{id: 'e1', nombre: 'Almuerzo cóctel jubilación', fecha: '2026-11-13', hora: '14:45', pax: 66}, {id: 'e2', nombre: 'Cóctel Cumpleaños Nieves', fecha: '2026-11-17', hora: '14:00', pax: 66}];

// ── Entorno falso: document, localStorage, fecha fija, sincronización y ventanas que se abren ──
function entorno({solo = false, d = datos(), yo = ''} = {}){
  const NOW = new Date('2026-11-13T12:00:00').getTime(), Real = Date;
  class Fecha extends Real{ constructor(...a){ a.length ? super(...a) : super(NOW); } static now(){ return NOW; } }
  const ls = {seda_horarios: JSON.stringify(d)}; if(yo) ls.hz_yo = yo;
  const campos = {}, manej = {click: [], change: [], submit: [], input: []};
  const root = {innerHTML: '', contains: () => true};
  const S = {subidas: [], abiertas: [], campos, root, manej, confirmaciones: 0, confirmar: true};
  const sb = {
    Date: Fecha, eventos: JSON.parse(JSON.stringify(EVENTOS)), console, setTimeout, clearTimeout, navigator: {},
    HZ_SOLO_LEER: solo, HZ_CAMB: {lista: () => [], recargar: () => Promise.resolve(), crear: () => Promise.resolve(true), estado: () => Promise.resolve(true)}, matchMedia: () => ({matches: false, addEventListener(){}}),
    localStorage: {getItem: k => k in ls ? ls[k] : null, setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; }},
    document: {getElementById: id => id === 'hz-root' ? root : (campos[id] || null), addEventListener: (t, f) => (manej[t] = manej[t] || []).push(f), querySelector: () => null, querySelectorAll: () => []},
    syncConfig: (k, v) => S.subidas.push(JSON.parse(JSON.stringify(v))), confirm: () => { S.confirmaciones++; return S.confirmar; },
    open: u => { S.abiertas.push(u); return null; }};
  sb.window = sb; vm.createContext(sb);
  SCRIPTS.forEach(f => vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), sb, {filename: f}));
  S.sb = sb; S.T = sb.hzPruebas; S.F = sb.hzPruebas.fn;
  S.fecha = s => new Fecha(s + 'T00:00');
  S.H = () => vm.runInContext('horarios', sb);
  S.pantalla = o => { if(o) S.T.fijar(o); sb.initHorarios(); return root.innerHTML; };
  // Un elemento falso: closest(selector) devuelve lo que se haya preparado para ese selector
  S.el = (mapa) => { const e = {closest: s => (s in mapa ? mapa[s] : null)}; Object.values(mapa).forEach(x => { if(x && !x.closest) x.closest = e.closest; }); return e; };
  S.clic = mapa => { const target = S.el(mapa); manej.click.forEach(f => f({target})); };
  S.enviar = (id, valores = {}) => { Object.keys(valores).forEach(k => { campos[k] = {value: valores[k]}; }); manej.submit.forEach(f => f({target: {id, dataset: {}}, preventDefault(){}})); };
  S.poner = v => { Object.keys(v).forEach(k => { campos[k] = {value: v[k]}; }); };
  return S;
}
const lun16 = '2026-11-16';
const trabaja = t => t && !/LIBRE|VACACIONES|BAJA/i.test(t) && /\d/.test(t);

// ── 1. Cálculos básicos ──
{ const S = entorno(), F = S.F;
  ok(JSON.stringify(F.tramos(P)) === '[[12,16],[20,24]]', 'tramos: turno partido');
  ok(JSON.stringify(F.tramos('22:00-02:00')) === '[[22,26]]', 'tramos: turno que pasa de medianoche');
  ok(F.horas('06:30-14:30') === 8 && F.horas(P) === 8 && F.horas('LIBRE') === 0, 'horas: 8 h, partido 8 h, libre 0');
  ok(['LIBRE', 'VACACIONES', 'BAJA MATERNAL', '08:00-16:00', ''].map(F.tipo).join() === 'libre,vac,baja,trab,vacio', 'tipo de cada turno');
  const d = S.H().semanas[lun16];
  const esperado = i => Object.values(d).filter(a => trabaja(a[i])).length;
  ok([0, 1, 2, 3, 4, 5, 6].every(i => F.cobertura(lun16, i) === esperado(i)), 'cobertura de cada día = personas con turno ese día (' + [0, 1, 2, 3, 4, 5, 6].map(i => F.cobertura(lun16, i)).join(',') + ')');
  const av = F.avisos(lun16);
  ok(av.some(x => /Rubén suma 40,5 h/.test(x)), 'aviso: Rubén se pasa de 40 h');
  ok(av.some(x => /Rubén: solo 9,5 h de descanso entre jueves y viernes/.test(x)), 'aviso: descanso de 9,5 h entre jueves y viernes');
  ok(!av.some(x => /\(mínimo 3\)/.test(x)), 'aviso: esta semana hay 4 o más en cocina cada día, sin avisos de cobertura');
  ok(F.avisos('2026-11-09').some(x => /Jueves: 2 personas \(mínimo 3\)/.test(x)), 'aviso: la semana del 9 nov, el jueves solo hay 2 en cocina');
  ok(F.sinTurnos('2026-11-23') && !F.sinTurnos(lun16), 'sinTurnos: semana vacía y semana con datos');
  const dia = S.sb.hzDia('2026-11-17');
  ok(dia && dia.i === 1 && dia.gente.length === F.cobertura(lun16, 1), 'hzDia (lo usan Hojas y Eventos): quién trabaja el martes 17');
  const h = S.sb.htmlHorarioEvento(EVENTOS[1]);
  ok(/Cocina ese día/.test(h) && /a las 14:00/.test(h), 'htmlHorarioEvento: aviso de cocina a la hora del evento');
}

// ── 2. Fusión con la nube (hzElige) ──
{ const S = entorno(), E = S.sb.hzElige;
  const a = datos(), b = datos();
  a.ts = 2000; a.wts = {'2026-11-16': 2000}; a.semanas['2026-11-16'].Ana[0] = 'LIBRE';
  b.ts = 1500; b.wts = {'2026-11-23': 1500}; b.semanas['2026-11-23'] = {Ana: Array(7).fill('08:00-16:00')};
  const r = E(a, b);
  ok(r.semanas['2026-11-16'].Ana[0] === 'LIBRE' && r.semanas['2026-11-23'], 'fusión: se conservan las semanas de los dos móviles (gana el cambio más reciente en cada una)');
  b.ts = 3000; b.wts = {'2026-11-16': 3000}; b.semanas['2026-11-16'].Ana[0] = 'VACACIONES';
  ok(E(a, b).semanas['2026-11-16'].Ana[0] === 'VACACIONES', 'fusión: la semana editada más tarde gana');
  const c = datos(), e = datos(); c.ts = 5000; e.ts = 4000;
  c.enviado = {'2026-11-16': {Ana: {ts: 10, h: 1}}}; e.enviado = {'2026-11-16': {Ana: {ts: 20, h: 2}, Darío: {ts: 5, h: 3}}};
  const re = E(c, e);
  ok(re.enviado['2026-11-16'].Ana.ts === 20 && re.enviado['2026-11-16'].Darío, 'fusión: lo enviado por WhatsApp se junta (gana el envío más reciente de cada persona)');
  c.bloqueos = []; e.bloqueos = [{i: '2026-08-05', f: '2026-08-12', n: 'Feria'}];
  ok(E(c, e).bloqueos.length === 1, 'fusión: si un móvil no tenía fechas sin vacaciones, se toman las del otro');
  ok(S.sb.hzNormaliza({}).bloqueos.length === 0 && Array.isArray(S.sb.hzNormaliza({vac: null}).vac), 'hzNormaliza: rellena lo que falta (bloqueos, vac…)');
}


// ── 2b. Fusión dato a dato con referencia (casos de pérdida de datos entre móviles) ──
{ const S = entorno(), sb = S.sb;
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'config-nube.js'), 'utf8'), sb, {filename: 'config-nube.js'});
  const E = sb.hzElige, clon = o => JSON.parse(JSON.stringify(o));
  const ref = datos(); ref.ts = 1000; ref.wts = {}; ref.vac = [{e: 'Ana', t: 'extra', i: '2026-08-01', f: '2026-08-10', n: ''}];
  const fijar = () => sb.localStorage.setItem('seda_cfgbase_seda_horarios', JSON.stringify(ref));
  fijar();
  // 1) Dos móviles cambian turnos de PERSONAS distintas de la misma semana
  const m1 = clon(ref), m2 = clon(ref); m1.ts = 3000; m2.ts = 2000;
  m1.wts = {'2026-11-16': 3000}; m2.wts = {'2026-11-16': 2000};
  m1.semanas['2026-11-16'].Ana[0] = 'LIBRE'; m2.semanas['2026-11-16'].Darío[1] = 'VACACIONES';
  let r = E(m1, m2);
  ok(r.semanas['2026-11-16'].Ana[0] === 'LIBRE' && r.semanas['2026-11-16'].Darío[1] === 'VACACIONES', 'sincronización: dos cambios en la misma semana (personas distintas) se conservan los dos');
  // 2) Vacaciones añadidas en cada móvil: se suman
  m1.vac.push({e: 'Darío', t: 'extra', i: '2026-09-01', f: '2026-09-05', n: ''}); m2.vac.push({e: 'Rubén', t: 'extra', i: '2026-10-01', f: '2026-10-05', n: ''});
  r = E(m1, m2);
  ok(r.vac.length === 3, 'sincronización: vacaciones añadidas en dos móviles se suman (' + r.vac.length + ')');
  // 3) Una vacación borrada en un móvil no vuelve desde el otro
  const m3 = clon(ref), m4 = clon(ref); m3.ts = 3000; m4.ts = 2000; m3.vac = []; m4.equipo[0].tel = '600';
  r = E(m3, m4);
  ok(r.vac.length === 0, 'sincronización: una vacación borrada no resucita');
  r = E(m4, m3);
  ok(r.vac.length === 0, 'sincronización: igual si el móvil que borró es el más antiguo');
  // 4) Un cambio en equipo en un móvil y vacaciones en el otro
  const m5 = clon(ref), m6 = clon(ref); m5.ts = 3000; m6.ts = 2000; m5.equipo.push({n: 'Nuevo', rol: 'Cocinero', g: 'Cocineros'}); m6.vac.push({e: 'Ana', t: 'extra', i: '2026-12-01', f: '2026-12-03', n: ''});
  r = E(m6, m5);
  ok(r.equipo.some(x => x.n === 'Nuevo') && r.vac.length === 2, 'sincronización: alta de persona en un móvil y vacaciones en otro se conservan');
  // 5) Sin referencia sigue valiendo lo de siempre (gana el más reciente)
  sb.localStorage.removeItem('seda_cfgbase_seda_horarios');
  r = E(m1, m2);
  ok(r.vac.length === 2 && r.ts === 3000, 'sincronización: sin referencia gana el conjunto más reciente');
}

// ── 2c. Datos raros: no tumban ninguna pantalla ──
{ const d = datos();
  d.vac.push({e: 'Ana', t: 'extra', i: null, f: null}, {e: 'Ana', t: 'extra', i: '', f: '2026-08-10'}, null);
  d.bloqueos.push({i: undefined, f: '2026-08-01', n: 'x'});
  d.equipo.push(null, {rol: 'sin nombre'});
  d.semanas['2026-11-16'].Ana[2] = 5; d.semanas['2026-11-23'] = null; d.semanas['2026-11-30'] = {Darío: 'no es lista'};
  const S = entorno({d}), F = S.F, T = S.T, H = S.H();
  ok(H.vac.every(v => /^\d{4}/.test(v.i)) && H.equipo.every(e => e.n), 'datos raros: se descartan vacaciones sin fechas, personas sin nombre y entradas vacías');
  ok(typeof H.semanas['2026-11-16'].Ana[2] === 'string' && !H.semanas['2026-11-23'], 'datos raros: un turno que no es texto pasa a vacío y una semana vacía se quita');
  S.sb.eventos.push(null);
  let err = '';
  ['plantilla', 'mi', 'horas', 'cambios', 'ahora', 'eventos', 'vacaciones'].forEach(tab => { try { T.fijar({semana: S.fecha(lun16), tab}); S.pantalla(); } catch(e) { err += tab + ': ' + e.message + ' '; } });
  ok(!err, 'datos raros: ninguna pantalla da error' + (err ? ' (' + err + ')' : ''));
  S.sb.eventos.length = 0; S.H().equipo.length = 0;
  let g = 'ok'; try { F.generar('2026-11-30', 1, 1); } catch(e) { g = e.message; }
  ok(g === 'ok', 'datos raros: generar con el equipo vacío no da error (' + g + ')');
}

// ── 2d. Bajas normales (con motivo) distintas de la baja maternal ──
{ const S = entorno(), F = S.F, T = S.T, H = S.H();
  ok(F.tipo('BAJA') === 'bajan' && F.tipo('BAJA MATERNAL') === 'baja', 'bajas: «BAJA» es una baja normal y «BAJA MATERNAL» sigue siendo la de siempre');
  const v = {e: 'Ana', t: 'baja', i: '2026-11-17', f: '2026-11-19', n: 'gripe'};
  H.vac.push(v); F.aplicarVac(v, true);
  const a = H.semanas['2026-11-16'].Ana;
  ok(a[1] === 'BAJA' && a[2] === 'BAJA' && a[3] === 'BAJA' && a[0] !== 'BAJA', 'bajas: aplicarVac pone BAJA solo en los días del periodo');
  T.fijar({semana: S.fecha(lun16), tab: 'plantilla'});
  ok(/hz-cel bajan|bajan/.test(S.pantalla()), 'bajas: se pintan con su propio color en Plantilla');
  T.fijar({tab: 'vacaciones'});
  const p = S.pantalla();
  ok(/gripe/.test(p) && /<option value="baja">baja<\/option>/.test(p), 'bajas: el motivo se ve en Vacaciones y se puede elegir «baja» al añadir');
  F.aplicarVac(v, false);
  ok(!H.semanas['2026-11-16'].Ana.some(x => x === 'BAJA'), 'bajas: al quitar el periodo se limpian los días');
}

// ── 3. Pantallas ──
{ const S = entorno({yo: 'Ana'}), F = S.F, T = S.T;
  T.fijar({semana: S.fecha(lun16), tab: 'plantilla'});
  const pl = F.vPlantilla();
  ok((pl.match(/class="hz-dia( hoy)?"/g) || []).length === 7, 'Plantilla: 7 tarjetas de día para el móvil');
  ok(/Repetir semana anterior/.test(pl) && /hz-plan/.test(pl), 'Plantilla: tabla de siempre y botón «Repetir semana anterior»');
  ok(/Cobertura por horas/.test(pl) && /Cóctel Cumpleaños Nieves · 66 pax/.test(pl), 'Plantilla: cobertura por horas con el evento del martes');
  ok(/Enviar el horario a cada uno por WhatsApp/.test(pl) && /Sin enviar/.test(pl), 'Plantilla: panel de WhatsApp');
  ok(/Generar semanas automáticamente/.test(pl), 'Plantilla: generador de semanas');
  const mi = F.vMi();
  ok(/Tu próximo turno/.test(mi) && /Esta semana/.test(mi), 'Mi semana: próximo turno y semanas');
  ok(/Ahora|En turno ahora/.test(F.vAhora()), 'Ahora: en turno / entran pronto');
  const an = F.vAnioVac(2026);
  ok(/<b>99<\/b><small>días con alguien fuera/.test(an) && /<b>266<\/b><small>días sin nadie fuera/.test(an), 'Año de vacaciones: 99 días con alguien fuera y 266 sin nadie (suman 365)');
  ok(/1 ago – 4 ago<\/b> · 4 días · 4 fuera a la vez/.test(an) && /Ana, David, Fabián, Rubén/.test(an), 'Año de vacaciones: del 1 al 4 de ago coinciden 4 personas');
  ok(/1 ene – 30 jun<\/b> · 181 días/.test(an), 'Año de vacaciones: hueco sin nadie fuera del 1 ene al 30 jun (181 días)');
  ok(/David<\/b> · coincide 22 días con 4 personas/.test(an), 'Año de vacaciones: David coincide 22 días con 4 personas');
  ok(!/Rocío|Camila/.test(an.split('hz-an-lista')[1] || ''), 'Año de vacaciones: las bajas maternales no cuentan');
  ok(/Verano principal/.test(F.vVac()) && /11 de\|?|días/.test(F.vVac()), 'Vacaciones: tarjeta por persona');
  ok(F.diasEn('2026-12-24', '2026-12-31', 2026) === 8 && F.diasEn('2025-12-30', '2026-01-02', 2026) === 2, 'diasEn: días de un periodo dentro del año');
  ok(/Equipo/.test(F.vEquipo()) && /Móvil \(WhatsApp\)/.test(F.vEquipo()), 'Equipo: lista con campo de móvil');
  ok(/Horas/.test(F.vHoras()) || F.vHoras().length > 50, 'Horas: se pinta');
  ok(F.vEventos().length > 20, 'Eventos: necesidad de gente');
  T.fijar({tab: 'vacaciones'});
  ok(/Todo el año/.test(S.pantalla()), 'pintar(): pestaña Vacaciones completa');
  const co = F.vCobHoras(lun16);
  ok((co.match(/hz-ch-fila(?! hz-ch-esc)/g) || []).length === 7 && /Cóctel Cumpleaños Nieves/.test(co) && /3 en cocina \(/.test(co), 'Cobertura por horas: 7 filas y, a las 14:00 del martes, 3 en cocina para el cóctel');
  ok(/hz-ch/.test(F.vCobHoras('2026-11-09')), 'Cobertura por horas: también se pinta con pocas personas');
}

// ── 4. Botones y formularios ──
{ const S = entorno(), F = S.F, T = S.T, H = S.H;
  T.fijar({semana: S.fecha(lun16), tab: 'vacaciones', anio: 2026});
  S.pantalla();
  S.enviar('hz-f-blq', {'hz-bi': '2026-08-05', 'hz-bf': '2026-08-12', 'hz-bn': 'Feria'});
  ok(H().bloqueos.length === 1 && H().bloqueos[0].n === 'Feria', 'fechas sin vacaciones: se añade «Feria» del 5 al 12 de ago');
  ok(S.subidas.length >= 1, 'fechas sin vacaciones: se sube a la nube');
  const an = F.vAnioVac(2026);
  ok((an.match(/hz-an-c n\d blq/g) || []).length === 8 && /Rubén: 5 ago – 12 ago · Feria/.test(an), 'fechas sin vacaciones: 8 casillas marcadas y choque con las vacaciones de Rubén');
  S.enviar('hz-f-blq', {'hz-bi': '2026-09-10', 'hz-bf': '2026-09-01', 'hz-bn': 'mal'});
  ok(H().bloqueos.length === 1, 'fechas sin vacaciones: no deja un «hasta» anterior al «desde»');
  S.enviar('hz-f-vac', {'hz-ve': 'Jimena', 'hz-vt': 'verano', 'hz-vi': '2026-08-08', 'hz-vf': '2026-08-09', 'hz-vn': ''});
  ok(/caen en fechas sin vacaciones: Feria/.test(T.estado().msg), 'vacaciones nuevas dentro de fechas sin vacaciones: avisa («Ojo…»)');
  ok(H().semanas['2026-08-03'] && H().semanas['2026-08-03'].Jimena[5] === 'VACACIONES', 'vacaciones nuevas: rellenan el horario con VACACIONES');
  S.clic({'[data-bdel]': {dataset: {bdel: '0'}}});
  ok(H().bloqueos.length === 0, 'fechas sin vacaciones: «Quitar»');
  S.poner({'hz-bi': '', 'hz-bf': '', 'hz-bn': ''});
  S.clic({'[data-a="blqmes"]': {dataset: {i: '2026-11-01', f: '2026-11-30'}}, '[data-a]': {dataset: {a: 'blqmes'}}});
  ok(S.sb.document.getElementById('hz-bi').value === '2026-11-01' && S.sb.document.getElementById('hz-bn').value === 'Noviembre', 'chip «Este mes»: rellena desde, hasta y motivo');
  S.poner({'hz-bi': '', 'hz-bf': '', 'hz-bn': ''});
}
{ const S = entorno(), F = S.F, T = S.T, H = S.H;
  T.fijar({semana: S.fecha(lun16), tab: 'plantilla'}); S.pantalla();
  // editar un turno
  S.clic({'.hz-cel,.hz-dfila,.hz-dchip': {dataset: {e: 'Ana', i: '3'}}});
  ok(T.estado().edit && T.estado().edit.e === 'Ana' && T.estado().edit.i === 3, 'tocar un turno: abre el editor de Ana, jueves');
  const ed = S.root.innerHTML;
  ok(/hz-editor/.test(ed) && /Igual que ayer/.test(ed) && /Igual que hace 1 semana/.test(ed), 'editor: botones «Igual que ayer» e «Igual que hace 1 semana»');
  S.poner({'hz-turno': '10:00-18:00'}); S.clic({'[data-a]': {dataset: {a: 'gturno'}}});
  ok(H().semanas[lun16].Ana[3] === '10:00-18:00' && T.estado().edit === null, 'guardar turno: Ana jueves 10:00-18:00');
  ok(H().wts[lun16] > 0 && S.subidas.length >= 1, 'guardar turno: marca la semana como editada y sube a la nube');
  // WhatsApp
  S.clic({'[data-a]': {dataset: {a: 'wasend'}}, '[data-n]': {dataset: {n: 'Ana'}}});
  ok(S.abiertas.length === 1 && S.abiertas[0].startsWith('https://wa.me/34600112233?text='), 'WhatsApp: abre el chat con el móvil de Ana (con 34 delante)');
  const txt = decodeURIComponent(S.abiertas[0].split('?text=')[1]);
  ok(/^Hola Ana, este es tu horario de cocina de la semana del 16 nov al 22 nov/.test(txt) && /\*Jue 19\*: 10-18/.test(txt) && /Total: 48 h/.test(txt), 'WhatsApp: mensaje personal con sus turnos y el total (' + (txt.match(/Total: [\d,]+ h/) || [''])[0] + ')');
  ok(H().enviado[lun16] && H().enviado[lun16].Ana, 'WhatsApp: queda marcado como enviado');
  ok(/✓ Enviado/.test(F.vPlantilla()), 'WhatsApp: se ve «✓ Enviado»');
  H().semanas[lun16].Ana[0] = 'LIBRE';
  ok(/Cambió desde el envío/.test(F.vPlantilla()), 'WhatsApp: si cambia el horario después, avisa de reenviar');
  ok(S.F.waLink('', 'a b') === 'https://wa.me/?text=a%20b' && S.F.waLink('+34 600-111-222', 'x').startsWith('https://wa.me/34600111222'), 'waLink: sin móvil deja elegir contacto; con móvil limpia espacios y signos');
  // Repetir semana anterior
  H().semanas['2026-11-23'] = {}; T.fijar({semana: S.fecha('2026-11-23')}); S.confirmaciones = 0;
  S.clic({'[data-a]': {dataset: {a: 'copiar'}}, '[data-p]': {dataset: {p: lun16}}});
  ok(!F.sinTurnos('2026-11-23') && JSON.stringify(H().semanas['2026-11-23'].Darío) === JSON.stringify(H().semanas[lun16].Darío), 'copiar semana: la de 23 nov queda igual que la del 16');
  ok(S.confirmaciones === 0, 'copiar semana vacía: no pregunta');
  S.clic({'[data-a]': {dataset: {a: 'copiar'}}, '[data-p]': {dataset: {p: '2026-11-09'}}});
  ok(S.confirmaciones === 1, 'copiar sobre una semana con turnos: pregunta antes de sustituir');
  // Equipo
  S.enviar('hz-f-eq', {'hz-en': 'Pedro', 'hz-er': 'Ayudante', 'hz-eg': '3', 'hz-ed': '2026-11-20'});
  ok(H().equipo.some(e => e.n === 'Pedro' && e.g === 3), 'equipo: añadir persona');
  S.enviar('hz-f-eq', {'hz-en': 'pedro', 'hz-er': 'x', 'hz-eg': '3', 'hz-ed': ''});
  ok(H().equipo.filter(e => e.n.toLowerCase() === 'pedro').length === 1 && /Ya hay alguien/.test(T.estado().msg), 'equipo: no deja repetir nombre');
}
// El «no» de confirmar tiene que dejar la semana como estaba
{ const S = entorno(), T = S.T, H = S.H;
  T.fijar({semana: S.fecha(lun16), tab: 'plantilla'}); S.pantalla(); S.confirmar = false;
  const antes = JSON.stringify(H().semanas[lun16]);
  S.clic({'[data-a]': {dataset: {a: 'copiar'}}, '[data-p]': {dataset: {p: '2026-11-09'}}});
  ok(S.confirmaciones === 1 && JSON.stringify(H().semanas[lun16]) === antes, 'copiar: diciendo que no, la semana sigue igual');
}

// ── 5. Generador de semanas (aleatorio con semilla fija: da siempre lo mismo) ──
{ const S = entorno(), F = S.F, H = S.H;
  F.generar('2026-11-30', 1, 1);
  const g = H().semanas['2026-11-30'];
  ok(g && !F.sinTurnos('2026-11-30'), 'generar: rellena la semana del 30 nov');
  const gente = H().equipo.filter(e => e.n !== 'Rocío' && e.n !== 'Camila' && e.n !== 'Rosa');
  ok(gente.every(e => g[e.n] && g[e.n].length === 7), 'generar: cada persona tiene 7 días');
  const g2 = JSON.stringify(g); H().semanas['2026-11-30'] = undefined; delete H().semanas['2026-11-30'];
  F.generar('2026-11-30', 1, 1);
  ok(JSON.stringify(H().semanas['2026-11-30']) === g2, 'generar: con la misma semilla sale siempre igual');
  F.deshacerGen();
  ok(F.sinTurnos('2026-11-30'), 'generar: «Deshacer» deja la semana vacía');
}
// Mismo resultado que antes de acelerar el generador (3 semillas × 4 semanas) y en poco tiempo
{ const S = entorno(), F = S.F, H = S.H, crypto = require('crypto'); let txt = ''; const t0 = Date.now();
  [1, 2, 3].forEach(sd => { F.generar('2026-11-30', 4, sd); txt += JSON.stringify(H().semanas); F.deshacerGen(); });
  const ms = Date.now() - t0, hash = crypto.createHash('md5').update(txt).digest('hex').slice(0, 10);
  console.log('   (generar 12 semanas: ' + ms + ' ms, huella ' + hash + ')');
  ok(hash === '9ad96eab52', 'generar: da exactamente las mismas semanas que antes de acelerarlo');
  ok(ms < 10000, 'generar: 12 semanas en menos de 10 s (' + ms + ' ms)');
}

// ── 6. Modo solo lectura (cocina y sala) ──
{ const S = entorno({solo: true, yo: 'Ana'}); S.T.fijar({semana: S.fecha(lun16), tab: 'plantilla'});
  const pl = S.F.vPlantilla();
  ok(!/data-e=/.test(pl) && !/Enviar el horario a cada uno/.test(pl) && !/Generar semanas/.test(pl), 'solo lectura: no hay botones para editar, enviar ni generar');
  ok(/Tu próximo turno/.test(S.F.vMi()), 'solo lectura: «Mi semana» sigue funcionando');
}

// ── Huella de las pantallas (para comprobar que un cambio de código no altera lo que se ve) ──
function huellas(){
  const out = {};
  const casos = [['plantilla-16', {tab: 'plantilla', semana: '2026-11-16'}], ['plantilla-09', {tab: 'plantilla', semana: '2026-11-09'}], ['plantilla-vacia', {tab: 'plantilla', semana: '2026-12-07'}],
    ['mi', {tab: 'mi'}], ['horas', {tab: 'horas'}], ['cambios', {tab: 'cambios'}], ['ahora', {tab: 'ahora'}], ['eventos', {tab: 'eventos', semana: '2026-11-16'}], ['extras', {tab: 'extras'}], ['practicas', {tab: 'practicas'}],
    ['vacaciones', {tab: 'vacaciones', anio: 2026}], ['vacaciones-2025', {tab: 'vacaciones', anio: 2025}], ['equipo', {tab: 'equipo'}]];
  [false, true].forEach(solo => casos.forEach(([n, o]) => {
    const S = entorno({solo, yo: 'Ana'}); S.T.fijar({semana: S.fecha(o.semana || '2026-11-16'), tab: o.tab, anio: o.anio || 2026});
    try{ const h = S.pantalla(); out[(solo ? 'solo-' : '') + n] = sha(h) + ':' + h.length; }catch(e){ out[(solo ? 'solo-' : '') + n] = 'ERROR ' + e.message; }
  }));
  // con una fecha sin vacaciones y un envío hechos, para las partes nuevas
  const S = entorno(); const d = S.H(); d.bloqueos = [{i: '2026-08-05', f: '2026-08-12', n: 'Feria'}]; d.enviado = {'2026-11-16': {Ana: {ts: 5, h: S.F.hashT(S.F.textoPersona('2026-11-16', d.equipo.find(e => e.n === 'Ana')))}}};
  S.T.fijar({tab: 'vacaciones', anio: 2026, semana: S.fecha(lun16)}); out['vacaciones-con-bloqueo'] = sha(S.pantalla());
  S.T.fijar({tab: 'plantilla'}); out['plantilla-con-envio'] = sha(S.pantalla());
  return out;
}
const hu = huellas();
ok(Object.values(hu).every(v => !/^ERROR/.test(v)), 'ninguna pantalla da error: ' + Object.entries(hu).filter(([, v]) => /^ERROR/.test(v)).map(([k, v]) => k + ' ' + v).join('; '));
if(arg('golden-escribir')){ fs.writeFileSync(arg('golden-escribir'), JSON.stringify(hu, null, 1)); console.log('Huellas guardadas en ' + arg('golden-escribir') + ' (' + Object.keys(hu).length + ' pantallas)'); }
if(arg('golden')){
  const g = JSON.parse(fs.readFileSync(arg('golden'), 'utf8')), dist = Object.keys(g).filter(k => g[k] !== hu[k]);
  ok(!dist.length, 'las pantallas se ven igual que en la huella' + (dist.length ? ': cambian ' + dist.join(', ') : ' (' + Object.keys(g).length + ' pantallas)'));
}
console.log('\nScripts cargados: ' + SCRIPTS.join(', '));
console.log(fallos ? fallos + ' FALLOS' : 'TODO BIEN');
process.exit(fallos ? 1 : 0);
