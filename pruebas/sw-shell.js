// Comprueba el service worker (sw.js) sin navegador, solo con Node:
//  1) Todo lo que hay en SHELL existe en el proyecto (si falta uno, la versión nueva no se instalaría nunca).
//  2) Todo archivo propio que cargan las páginas (script, css, manifest, iconos) está en SHELL (si no, esa app
//     no abriría sin conexión).
//  3) Si cambia algún archivo de la app respecto a origin/main, CACHE ha subido de versión (si no, los móviles
//     se quedarían con la versión vieja).
// Uso:  node pruebas/sw-shell.js      (desde la raíz del proyecto o desde pruebas/)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const raiz = fs.existsSync('sw.js') ? '.' : '..';
const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
let f = 0; const ok = (c, t) => { if(!c) f++; console.log((c ? '✔' : '✘ FALLO') + ' ' + t); };

const shell = JSON.parse(/const SHELL = (\[[^\]]*\]);/.exec(sw)[1].replace(/'/g, '"'));
const version = (/const CACHE = '([^']+)'/.exec(sw) || [])[1];
const aDisco = u => path.join(raiz, u === '/' ? 'index.html' : u.replace(/^\//, ''));

// 1) existen
const faltan = shell.filter(u => !fs.existsSync(aDisco(u)));
ok(!faltan.length, `SHELL (${shell.length} archivos): todos existen${faltan.length ? ' — faltan: ' + faltan.join(', ') : ''}`);
ok(new Set(shell).size === shell.length, 'SHELL sin repetidos');

// 2) lo que cargan las páginas está en SHELL
const sinShell = [];
fs.readdirSync(raiz).filter(n => n.endsWith('.html')).forEach(p => {
  const h = fs.readFileSync(path.join(raiz, p), 'utf8');
  for(const m of h.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["']/gi)){
    const u = m[1]; if(/^(https?:)?\/\//.test(u) || u.startsWith('data:') || u.startsWith('#')) continue;
    const ruta = '/' + u.replace(/^\.?\//, '').split(/[?#]/)[0];
    if(/\.(png|ico|svg|webp)$/.test(ruta)) continue; // iconos sueltos (favicon, apple-touch): los guarda la capa ESTATICOS al verlos
    if(!shell.includes(ruta)) sinShell.push(`${p} → ${ruta}`);
  }
});
ok(!sinShell.length, 'todo lo que cargan las páginas está en SHELL' + (sinShell.length ? ': ' + [...new Set(sinShell)].join('; ') : ''));
ok(/^oido-cocina-v\d+$/.test(version || ''), 'CACHE con formato oido-cocina-vN (ahora ' + version + ')');

// 3) versión subida si cambia algo de la app
try{
  const git = c => cp.execSync(c, {cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  const base = git('git rev-parse --verify -q origin/main');
  const cambiados = git(`git diff --name-only ${base}`).split('\n').filter(Boolean)
    .filter(n => shell.includes('/' + n) || (n.endsWith('.html') && !n.startsWith('pruebas')));
  const antes = (/const CACHE = '([^']+)'/.exec(git(`git show ${base}:sw.js`)) || [])[1];
  const alsw = cambiados.filter(n => n !== 'sw.js');
  if(!alsw.length) console.log('· sin cambios de la app respecto a origin/main: no hace falta subir la versión');
  else ok(version !== antes, `cambian ${alsw.length} archivo(s) de la app (${alsw.slice(0, 4).join(', ')}${alsw.length > 4 ? '…' : ''}): CACHE ${antes} → ${version}`);
}catch(e){ console.log('· no se pudo comparar con origin/main (haz «git fetch» y vuelve a probar)'); }

console.log(f ? f + ' FALLOS' : 'TODO BIEN'); process.exit(f ? 1 : 0);
