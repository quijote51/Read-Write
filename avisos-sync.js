/* Aviso claro cuando algo no se guarda en la nube (app principal).
   Hasta ahora solo cambiaba un icono pequeño («Sin conexión»). Ahora sale una barra abajo que dice QUÉ no se ha guardado,
   POR QUÉ (sin internet / sin permiso / otro fallo) y QUÉ hacer, con botón «Reintentar». Se quita sola al volver a sincronizar.
   Envuelve _fallo (fallos con error), mostrarSync (éxito) y los eventos offline/online. No cambia cómo se guarda nada. */
(function(){
  const NOM = {eventos:'eventos', plantillas:'plantillas', vajilla:'vajilla', proveedores:'proveedores', personal:'personal', recetas:'recetas'};
  const nombre = k => (typeof CFG_NOMBRES !== 'undefined' && CFG_NOMBRES[k]) || NOM[k] || String(k || 'datos').replace(/^seda_/, '').replace(/_/g, ' ');
  function tipoDe(err){
    const m = String((err && (err.message || err.error_description || err.details)) || err || '');
    const code = String((err && err.code) || ''), st = err && (err.status || err.statusCode);
    if(code === '42501' || st === 401 || st === 403 || /row-level security|permission denied|not authorized|jwt|violates row/i.test(m)) return 'permiso';
    if((typeof navigator !== 'undefined' && navigator.onLine === false) || /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(m)) return 'red';
    return 'otro';
  }
  const fallos = {};           // clave -> tipo
  let cerradoHasta = 0, timerOk = null;
  const PESO = {permiso: 3, otro: 2, red: 1};

  function barra(){
    let d = document.getElementById('av-sync');
    if(!d){
      d = document.createElement('div'); d.id = 'av-sync'; d.setAttribute('role', 'alert');
      d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9997;max-width:560px;margin:0 auto;background:#2a1a0a;color:#f5d9a8;border:1px solid #c9a84c;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.4;display:none;box-shadow:0 4px 18px rgba(0,0,0,.4)';
      d.innerHTML = '<div id="av-sync-txt"></div><div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end"><button type="button" id="av-sync-re" style="min-height:44px;padding:0 16px;border-radius:10px;border:0;background:#c9a84c;color:#1a1a1a;font:600 13px inherit;font-family:inherit;cursor:pointer">Reintentar</button><button type="button" id="av-sync-x" style="min-height:44px;padding:0 14px;border-radius:10px;border:1px solid rgba(201,168,76,.5);background:none;color:#f5d9a8;font:inherit;font-size:13px;cursor:pointer">Cerrar</button></div>';
      document.body.appendChild(d);
      d.querySelector('#av-sync-re').onclick = () => { if(typeof reenviarTodo === 'function') reenviarTodo(); else if(typeof mostrarSync === 'function') mostrarSync(true); texto('Reintentando…', true); };
      d.querySelector('#av-sync-x').onclick = () => { cerradoHasta = Date.now() + 60000; d.style.display = 'none'; };
    }
    return d;
  }
  function texto(t, sinBotones){
    const d = barra(); d.querySelector('#av-sync-txt').textContent = t;
    d.querySelector('#av-sync-re').style.display = sinBotones ? 'none' : '';
    d.style.display = 'block';
  }
  function pintar(){
    const ks = Object.keys(fallos); if(!ks.length) return;
    if(Date.now() < cerradoHasta) return;
    clearTimeout(timerOk);
    const peor = ks.map(k => fallos[k]).sort((a, b) => PESO[b] - PESO[a])[0];
    const lista = [...new Set(ks.filter(k => fallos[k] === peor && k !== 'red').map(nombre))].slice(0, 3).join(', ');
    let t;
    if(peor === 'permiso') t = `No se ha podido guardar${lista ? ' «' + lista + '»' : ''}: tu usuario no tiene permiso para cambiarlo. El cambio solo está en este móvil. Pide al jefe que lo haga o que te cambie el permiso.`;
    else if(peor === 'otro') t = `No se ha podido guardar${lista ? ' «' + lista + '»' : ''} en la nube. Tus cambios siguen en este móvil y se reintentará. Si sigue así, avisa al jefe.`;
    else t = 'Sin conexión. Tus cambios están guardados en este móvil y se subirán solos cuando vuelva internet.';
    texto(t);
  }
  function registrar(clave, tipo){
    if(typeof _uid !== 'undefined' && !_uid) return;   // modo «solo este dispositivo»: no es un error
    fallos[clave] = tipo; pintar();
  }
  function limpiar(){
    if(!Object.keys(fallos).length) return;
    Object.keys(fallos).forEach(k => delete fallos[k]);
    const d = document.getElementById('av-sync'); if(!d || d.style.display === 'none') return;
    texto('✓ Todo guardado en la nube.', true);
    timerOk = setTimeout(() => { d.style.display = 'none'; }, 3000);
  }

  function enganchar(){
    const f0 = window._fallo, m0 = window.mostrarSync;
    if(typeof f0 === 'function') window._fallo = function(clave, err){ const r = f0.apply(this, arguments); try{ registrar(clave, tipoDe(err)); }catch(e){} return r; };
    if(typeof m0 === 'function') window.mostrarSync = function(ok){
      const r = m0.apply(this, arguments);
      try{ let pend = false; try{ pend = localStorage.getItem('seda_pendiente') === '1'; }catch(e){} if(ok && !pend) limpiar(); }catch(e){}
      return r;
    };
    window.addEventListener('offline', () => { try{ registrar('red', 'red'); }catch(e){} });
    window.avisoSyncProbar = (clave, err) => registrar(clave, tipoDe(err));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enganchar); else enganchar();
})();
