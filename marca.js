/* MARCA DE CADA CLIENTE (fase 3): nombre, ciudad, dirección, teléfono y web del hotel o restaurante.
   Salen de Ajustes (config.seda_ajustes) y, si no, del perfil (hoteles.nombre / ciudad). Nada de «Seda» fijo en el código.
   - hN(): nombre · hLinea(): «nombre · ciudad» · hFirma(): firma para mensajes al cliente.
   - aplicarMarca(): pone el nombre (y el logo) en la cabecera, la hoja impresa y el título de la pestaña.
   - Logo: ajustes.hotel_logo (enlace del almacén de fotos, carpeta «logo», o la imagen dentro si no hay conexión).
     hLogo(alto) da la etiqueta <img> para las hojas impresas; subirLogo/quitarLogo desde Ajustes → Datos del hotel. */

function hotelDatos(){
  let a = typeof ajustes !== 'undefined' && ajustes;
  if(!a){ try{ a = JSON.parse(localStorage.getItem('seda_ajustes') || 'null'); }catch(e){} } // apps sueltas: los ajustes guardados en el aparato
  a = a || {};
  const p = (typeof _perfil !== 'undefined' && _perfil) || {};
  return {
    nombre: (a.hotel_nombre || p.hotel_nombre || '').trim(),
    ciudad: (a.hotel_ciudad || p.hotel_ciudad || '').trim(),
    dir: (a.hotel_dir || '').trim(), tel: (a.hotel_tel || '').trim(), web: (a.hotel_web || '').trim(),
    logo: logoValido(a.hotel_logo)
  };
}
// Solo imágenes propias: del almacén de Supabase o dentro de los datos
function logoValido(u){
  u = typeof u === 'string' ? u.trim() : '';
  return /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(u) || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^"'<>\s]+$/i.test(u) ? u : '';
}
// <img> del logo para hojas impresas ('' si no hay)
function hLogo(alto = 48){
  const l = hotelDatos().logo;
  return l ? `<img src="${l}" alt="" style="height:${alto}px;max-width:${alto * 4}px;object-fit:contain;vertical-align:middle">` : '';
}
const hN = () => hotelDatos().nombre || 'nuestro restaurante';
const hLinea = () => { const d = hotelDatos(); return [d.nombre || 'Oído Cocina', d.ciudad].filter(Boolean).join(' · '); };
function hFirma(){
  const d = hotelDatos();
  const l1 = [d.nombre ? `*${d.nombre}*` : '', d.dir, d.ciudad].filter(Boolean).join(' · ');
  const l2 = [d.tel ? 'T: ' + d.tel : '', d.web].filter(Boolean).join(' · ');
  return [l1, l2].filter(Boolean).join('\n');
}
function aplicarMarca(){
  const d = hotelDatos(), linea = hLinea();
  const pon = (id, t) => { const e = document.getElementById(id); if(e) e.textContent = t; };
  pon('header-hotel-nombre', linea);
  pon('marca-linea', linea);
  pon('print-hotel-nombre', (d.nombre || 'Oído Cocina').toUpperCase());
  pon('print-hotel-linea', [d.nombre, d.dir, d.ciudad].filter(Boolean).join(' · '));
  document.querySelectorAll('.marca-badge').forEach(e => { e.lastChild.textContent = ' ' + (d.nombre ? linea.toUpperCase() : 'OÍDO COCINA'); });
  // Logo: en el cuadro de la cabecera (en lugar de «Oí») y en la cabecera impresa
  const cuadro = document.getElementById('marca-cuadro');
  if(cuadro){
    let img = cuadro.querySelector('img.marca-logo');
    if(d.logo){
      if(!img){ img = document.createElement('img'); img.className = 'marca-logo'; img.alt = d.nombre || 'Logo'; img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;padding:2px;box-sizing:border-box'; cuadro.appendChild(img); }
      if(img.getAttribute('src') !== d.logo) img.src = d.logo;
    } else if(img) img.remove();
  }
  const pl = document.getElementById('print-hotel-logo');
  if(pl) pl.innerHTML = d.logo ? hLogo(40) : '';
  const vista = document.getElementById('aj-logo-vista');
  if(vista){ vista.innerHTML = d.logo ? `<img src="${d.logo}" alt="Logo" style="max-height:56px;max-width:180px;object-fit:contain;background:#fff;border-radius:6px;padding:4px">` : '<span style="font-size:12px;color:var(--text-secondary)">Sin logo</span>';
    const q = document.getElementById('aj-logo-quitar'); if(q) q.style.display = d.logo ? '' : 'none'; }
  if(d.nombre && !/·/.test(document.title)) document.title = document.title + ' · ' + d.nombre;
}

// Ajustes → Datos del hotel: subir o quitar el logo (se reduce a 400 px; con sesión va al almacén de fotos)
async function subirLogo(input){
  const file = input && input.files && input.files[0]; if(input) input.value = '';
  if(!file || typeof ajustes === 'undefined') return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)) return alert('El logo tiene que ser una imagen PNG, JPG o WEBP.');
  const datos = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = e => ok(e.target.result); r.onerror = mal; r.readAsDataURL(file); });
  const peq = typeof reducirImagen === 'function' ? await reducirImagen(datos, 400, 0.9) : datos;
  if(peq.length > 400000) return alert('El logo es demasiado grande. Prueba con una imagen más pequeña.');
  const anterior = ajustes.hotel_logo;
  const url = typeof fotoANube === 'function' ? await fotoANube(peq, 'logo', 'logo') : null;
  ajustes.hotel_logo = url || peq;
  if(anterior && anterior !== ajustes.hotel_logo && typeof fotoBorrarNube === 'function') fotoBorrarNube(anterior);
  if(typeof saveAjustes === 'function') saveAjustes(ajustes);
  aplicarMarca();
}
function quitarLogo(){
  if(typeof ajustes === 'undefined' || !ajustes.hotel_logo || !confirm('¿Quitar el logo?')) return;
  const anterior = ajustes.hotel_logo; delete ajustes.hotel_logo;
  if(typeof fotoBorrarNube === 'function') fotoBorrarNube(anterior);
  if(typeof saveAjustes === 'function') saveAjustes(ajustes);
  aplicarMarca();
}
