// Prueba de carga CONTROLADA de Oído Cocina: usuarios simulados que hacen lo mismo que los de verdad.
// Solo apunta a la app publicada del Seda y a su Supabase (están escritos aquí; no se pueden cambiar con argumentos),
// solo LEE (no guarda nada) y tiene topes de usuarios, tiempo, peticiones y descarga, más un freno de emergencia.
// Sin dependencias: solo Node 18+.
//
//   node pruebas/carga.js comensales --vus 40 --seg 60 [--rampa 20] [--pensar 8] [--espera 0] [--salida fichero.json]
//   node pruebas/carga.js equipo     --vus 100 --seg 60
//
// Escenarios:
//   comensales  Invitados de un evento que escanean la carta QR: abren carta.html y piden la carta a Supabase
//               (rpc/carta_publica). El 10 % pide un código que no existe. Es el único tráfico que llega sin cuenta.
//   equipo      Móviles del equipo: 80 % «calientes» (el service worker solo comprueba sw.js) y 20 % «fríos» (móvil nuevo:
//               descarga la app entera, 64 archivos, con 6 en paralelo como un navegador).
// NO simula (necesitaría una cuenta): sincronizar datos, fichar, guardar. Eso se mide aparte, en la base de datos.
// --pensar 0 = «pico»: cada usuario repite sin pausa (para buscar el límite). Úsalo con pocos usuarios y pocos segundos.
const HOST = 'https://oidococina-xu7i.vercel.app';
const SUPA = 'https://gxkxslkdqgwovgxcuzkr.supabase.co';
const KEY = 'sb_publishable_xAUprOgWQi0HhYms69zUhA_yiTwDYPK'; // la clave pública que ya va en la app
const CARTA = 'c4gpqqbf8a';
const LIMITES = {comensales: {vus: 100, req: 9000, seg: 240}, equipo: {vus: 160, req: 30000, seg: 240}};
const MAX_MB = 400;           // tope de descarga (ya descomprimida)
const FRENO_ERR = 0.10;       // más de un 10 % de errores en 10 s → parar
const FRENO_P95 = 8000;       // p95 por encima de 8 s durante 10 s → parar

const a = process.argv.slice(2), esc = a[0];
if(!LIMITES[esc]){ console.error('Uso: node pruebas/carga.js comensales|equipo --vus N --seg S [--rampa S] [--pensar S] [--espera S] [--salida f.json]'); process.exit(2); }
const arg = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? parseFloat(a[i + 1]) : d; };
const L = LIMITES[esc];
const VUS = Math.max(1, Math.min(arg('vus', 10), L.vus)), SEG = Math.max(5, Math.min(arg('seg', 30), L.seg));
const RAMPA = Math.max(0, Math.min(arg('rampa', Math.round(SEG / 3)), SEG)), PENSAR = Math.max(0, arg('pensar', esc === 'comensales' ? 8 : 20));
const ESPERA = Math.max(0, Math.min(arg('espera', 0), 300)), MAX_REQ = L.req;
const iSal = a.indexOf('--salida'), SALIDA = iSal >= 0 ? a[iSal + 1] : null;

const reg = []; let enMarcha = true, motivo = 'tiempo cumplido', bytes = 0, total = 0, vivos = 0;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const pausa = () => PENSAR === 0 ? Promise.resolve() : dormir(PENSAR * 1000 * (0.5 + Math.random()));
const T0 = () => performance.now();

async function pedir(tipo, url, o = {}){
  if(!enMarcha) return null;
  total++; const t0 = T0(); let st = 0, b = 0, buf = null;
  try{
    const r = await fetch(url, {...o, signal: AbortSignal.timeout(15000)});
    buf = Buffer.from(await r.arrayBuffer()); st = r.status; b = buf.length;
  }catch(e){ st = e && e.name === 'TimeoutError' ? -1 : -2; }
  const ms = T0() - t0; bytes += b; reg.push({t: Date.now(), tipo, ms, st, b});
  if(total >= MAX_REQ){ enMarcha = false; motivo = 'tope de peticiones (' + MAX_REQ + ')'; }
  if(bytes > MAX_MB * 1048576){ enMarcha = false; motivo = 'tope de descarga (' + MAX_MB + ' MB)'; }
  return {st, buf};
}
const ok = st => st >= 200 && st < 400;
const pct = (v, p) => { if(!v.length) return 0; const s = v.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

let SHELL = [];
async function cargarShell(){
  const r = await fetch(HOST + '/sw.js'); const t = await r.text();
  SHELL = JSON.parse(/const SHELL = (\[[^\]]*\]);/.exec(t)[1].replace(/'/g, '"')).filter(u => u !== '/');
}

async function usuarioComensal(){
  while(enMarcha){
    await pedir('carta.html', HOST + '/carta.html?c=' + CARTA);
    const codigo = Math.random() < 0.1 ? 'noexiste' + Math.floor(Math.random() * 1e6) : CARTA;
    await pedir('rpc/carta_publica', SUPA + '/rest/v1/rpc/carta_publica', {method: 'POST', headers: {apikey: KEY, 'Content-Type': 'application/json'}, body: JSON.stringify({p_id: codigo})});
    await pausa();
  }
}
async function usuarioEquipo(){
  while(enMarcha){
    if(Math.random() < 0.2){
      // móvil nuevo: la app entera, 6 archivos a la vez
      const t0 = T0(); await pedir('fria:index', HOST + '/');
      const cola = SHELL.slice(); let bien = true;
      await Promise.all(Array.from({length: 6}, async () => { while(cola.length && enMarcha){ const u = cola.shift(); const r = await pedir(/\.(png|json)$/.test(u) ? 'fria:icono' : 'fria:codigo', HOST + u); if(r && !ok(r.st)) bien = false; } }));
      reg.push({t: Date.now(), tipo: 'CARGA FRIA COMPLETA', ms: T0() - t0, st: bien ? 200 : 500, b: 0});
    }else{
      await pedir('caliente:sw.js', HOST + '/sw.js', {cache: 'no-store'});
    }
    await pausa();
  }
}

function ventana(seg){
  const des = Date.now() - seg * 1000, v = reg.filter(x => x.t >= des && x.tipo !== 'CARGA FRIA COMPLETA');
  return {n: v.length, err: v.length ? v.filter(x => !ok(x.st)).length / v.length : 0, p95: pct(v.map(x => x.ms), 95)};
}
async function vigilar(ini){
  let altos = 0;
  while(enMarcha){
    await dormir(5000); const t = (Date.now() - ini) / 1000, w = ventana(10);
    console.log(`  ${String(Math.round(t)).padStart(3)} s · usuarios ${vivos} · peticiones ${total} · ${(w.n / 10).toFixed(1)}/s · errores ${(w.err * 100).toFixed(1)} % · p95 ${Math.round(w.p95)} ms · ${(bytes / 1048576).toFixed(1)} MB`);
    if(w.n >= 50 && w.err > FRENO_ERR){ enMarcha = false; motivo = 'FRENO: errores ' + (w.err * 100).toFixed(0) + ' % en 10 s'; }
    altos = w.n >= 50 && w.p95 > FRENO_P95 ? altos + 1 : 0;
    if(altos >= 2){ enMarcha = false; motivo = 'FRENO: p95 ' + Math.round(w.p95) + ' ms sostenido'; }
  }
}

(async () => {
  console.log(`Carga «${esc}»: hasta ${VUS} usuarios, ${SEG} s (rampa ${RAMPA} s), pausa media ${PENSAR} s${ESPERA ? ', empieza en ' + ESPERA + ' s' : ''}. Topes: ${MAX_REQ} peticiones, ${MAX_MB} MB.`);
  if(ESPERA) await dormir(ESPERA * 1000);
  if(esc === 'equipo') await cargarShell();
  const ini = Date.now(); console.log('  empieza a las ' + new Date(ini).toISOString().slice(11, 19) + ' UTC');
  const usuario = esc === 'comensales' ? usuarioComensal : usuarioEquipo, lanzados = [];
  const vig = vigilar(ini);
  while(enMarcha && (Date.now() - ini) / 1000 < SEG){
    const quiero = RAMPA ? Math.max(1, Math.ceil(VUS * Math.min(1, (Date.now() - ini) / 1000 / RAMPA))) : VUS;
    while(lanzados.length < quiero){ vivos++; lanzados.push(usuario().finally(() => vivos--)); }
    await dormir(500);
  }
  if(enMarcha){ enMarcha = false; }
  await Promise.race([Promise.all(lanzados), dormir(20000)]); await vig;
  const dur = (Date.now() - ini) / 1000, porTipo = {};
  reg.forEach(x => { (porTipo[x.tipo] = porTipo[x.tipo] || []).push(x); });
  const filas = Object.entries(porTipo).map(([tipo, v]) => { const m = v.map(x => x.ms); return {tipo, n: v.length, errores: v.filter(x => !ok(x.st)).length, estados: [...new Set(v.map(x => x.st))].sort().join('/'), p50: Math.round(pct(m, 50)), p95: Math.round(pct(m, 95)), p99: Math.round(pct(m, 99)), max: Math.round(Math.max(...m))}; });
  const lineaTiempo = []; for(let s = 0; s < dur; s += 10){ const v = reg.filter(x => x.t >= ini + s * 1000 && x.t < ini + (s + 10) * 1000 && x.tipo !== 'CARGA FRIA COMPLETA'); if(v.length) lineaTiempo.push({desde_s: s, rps: +(v.length / 10).toFixed(1), p95_ms: Math.round(pct(v.map(x => x.ms), 95)), err_pct: +(v.filter(x => !ok(x.st)).length / v.length * 100).toFixed(1)}); }
  const res = {inicio_utc: new Date(ini).toISOString().slice(11, 19), fin_utc: new Date().toISOString().slice(11, 19), escenario: esc, usuarios_max: VUS, duracion_s: Math.round(dur), motivo_fin: motivo, peticiones: total, errores: reg.filter(x => !ok(x.st) && x.tipo !== 'CARGA FRIA COMPLETA').length, descarga_MB: +(bytes / 1048576).toFixed(1), por_tipo: filas, linea_de_tiempo: lineaTiempo};
  console.log('\nRESULTADO (' + motivo + ')'); console.table(filas); console.log(JSON.stringify({...res, por_tipo: undefined, linea_de_tiempo: undefined}));
  if(SALIDA) require('fs').writeFileSync(SALIDA, JSON.stringify(res, null, 1));
  process.exit(0);
})();
