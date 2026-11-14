/* Botón «Instalar en el móvil» para todas las apps (principal y sueltas).
   - Android (Chrome, Edge, Samsung Internet): cuando el navegador lo permite, sale un botón dorado abajo
     que abre directamente la ventana de instalación. Así no hay que buscar el menú ⋮.
   - iPhone (Safari) no deja instalar desde un botón: se muestra una vez cómo hacerlo con «Compartir».
   - Android sin botón (p. ej. dentro de WhatsApp o Gmail): se explica que hay que abrirla en Chrome.
   - No sale nada si la app ya está instalada (se abre como app) o si se cerró el aviso en esta página. */
(function(){
  if(typeof window==='undefined') return;
  const enApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if(enApp()) return;
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const clave = 'oido_inst_' + (location.pathname.replace(/[^a-z]/gi, '') || 'index');
  const cerrado = () => { try{ return localStorage.getItem(clave) === '1'; }catch(e){ return false; } };
  const cerrar = () => { try{ localStorage.setItem(clave, '1'); }catch(e){} quitar(); };
  let aviso = null, prompt = null;

  function css(){
    if(document.getElementById('inst-css')) return;
    const st = document.createElement('style'); st.id = 'inst-css';
    st.textContent = `#inst-av{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9999;
      background:#1a1a1a;color:#f0efe9;border:1px solid #c9a84c;border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:center;
      box-shadow:0 6px 24px rgba(0,0,0,.35);font:14px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto}
      #inst-av .t{flex:1;min-width:0}#inst-av b{color:#c9a84c}
      #inst-av button{font:inherit;cursor:pointer;border-radius:8px;min-height:44px;min-width:44px}
      #inst-av .si{background:#c9a84c;color:#1a1a1a;border:0;padding:8px 14px;font-weight:600;white-space:nowrap}
      #inst-av .no{background:transparent;color:rgba(255,255,255,.7);border:0;padding:4px 8px;font-size:20px;line-height:1}
      @media print{#inst-av{display:none}}`;
    document.head.appendChild(st);
  }
  function quitar(){ if(aviso){ aviso.remove(); aviso = null; } if(document.body) document.body.style.paddingBottom = ''; }
  function mostrar(html, conBoton){
    if(cerrado() || !document.body) return;
    css(); quitar();
    aviso = document.createElement('div'); aviso.id = 'inst-av'; aviso.setAttribute('role', 'dialog'); aviso.setAttribute('aria-label', 'Instalar la app');
    aviso.innerHTML = `<div class="t">${html}</div>${conBoton ? '<button class="si" type="button">Instalar</button>' : ''}<button class="no" type="button" aria-label="Cerrar">×</button>`;
    aviso.querySelector('.no').onclick = cerrar;
    const si = aviso.querySelector('.si');
    if(si) si.onclick = async () => {
      if(!prompt) return quitar();
      prompt.prompt();
      try{ const r = await prompt.userChoice; if(r && r.outcome === 'accepted') cerrar(); }catch(e){}
      prompt = null; quitar();
    };
    document.body.appendChild(aviso);
    // Deja sitio debajo para que el aviso no tape el final de la pantalla
    document.body.style.paddingBottom = (aviso.offsetHeight + 24) + 'px';
  }
  const nombre = () => (document.querySelector('meta[name="apple-mobile-web-app-title"]') || {}).content || 'Oído Cocina';

  // Android y escritorio: el navegador avisa cuando se puede instalar
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); prompt = e;
    mostrar(`<b>Instala ${nombre()}</b><br>Tendrás el icono en la pantalla de inicio, como una app.`, true);
  });
  window.addEventListener('appinstalled', () => { prompt = null; cerrar(); });

  window.addEventListener('load', () => setTimeout(() => {
    if(prompt || aviso || enApp()) return;
    if(ios) mostrar(`<b>Para instalar ${nombre()}:</b> toca <b>Compartir</b> (el cuadrado con la flecha ↑) y luego <b>«Añadir a pantalla de inicio»</b>.`, false);
    else if(android) mostrar(`<b>Para instalar ${nombre()}:</b> abre esta página en <b>Chrome</b>, toca <b>⋮</b> (arriba o abajo a la derecha) y elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.`, false);
  }, 4000));
})();
