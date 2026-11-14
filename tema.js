/* OÍDO COCINA · Aspecto (fondo oscuro, claro o automático).
   Por defecto SIEMPRE oscuro (fondo negro, letras blancas o doradas). En Ajustes → «Aspecto» se puede pasar a claro o
   a «como el móvil». Se guarda solo en el aparato (clave `tema_app`, que no se borra al cerrar sesión).
   Se carga lo primero de <head> para que no parpadee el blanco. El CSS oscuro vale salvo `html[data-tema=claro]`. */
(function(){
  const K = 'tema_app';
  const leer = () => { try{ const v = localStorage.getItem(K); return v === 'claro' || v === 'auto' ? v : 'oscuro'; }catch(e){ return 'oscuro'; } };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function aplicar(){
    const m = leer();
    const claro = m === 'claro' || (m === 'auto' && mq && mq.matches);
    if(claro) document.documentElement.setAttribute('data-tema', 'claro'); else document.documentElement.removeAttribute('data-tema');
  }
  aplicar();
  if(mq && mq.addEventListener) mq.addEventListener('change', aplicar);
  window.temaLeer = leer;
  window.temaPoner = m => { try{ localStorage.setItem(K, m); }catch(e){} aplicar(); pintar(); };

  // Selector en Ajustes (solo en la app principal)
  const OPC = [['oscuro', 'Oscuro'], ['claro', 'Claro'], ['auto', 'Como el móvil']];
  function pintar(){
    const caja = document.getElementById('tema-card'); if(!caja) return;
    const m = leer();
    caja.innerHTML = '<div class="form-sec" style="margin-top:0"><i class="ti ti-moon" aria-hidden="true"></i> Aspecto</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap" role="radiogroup" aria-label="Aspecto de la app">' +
      OPC.map(([k, n]) => `<button type="button" class="btn-sec" role="radio" aria-checked="${k === m}" data-tema-op="${k}" style="flex:1;justify-content:center;min-width:90px${k === m ? ';background:#c9a84c;color:#1a1a1a;border-color:#c9a84c;font-weight:600' : ''}">${n}</button>`).join('') +
      '</div>';
  }
  function montar(){
    const sec = document.getElementById('tab-ajustes'); if(!sec || document.getElementById('tema-card')) return;
    const c = document.createElement('div'); c.className = 'card'; c.id = 'tema-card'; c.style.marginBottom = '12px';
    sec.insertBefore(c, sec.firstChild); pintar();
    c.addEventListener('click', e => { const b = e.target.closest('[data-tema-op]'); if(b) window.temaPoner(b.dataset.temaOp); });
  }
  document.addEventListener('DOMContentLoaded', montar);
})();
