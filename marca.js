/* MARCA DE CADA CLIENTE (fase 3): nombre, ciudad, dirección, teléfono y web del hotel o restaurante.
   Salen de Ajustes (config.seda_ajustes) y, si no, del perfil (hoteles.nombre / ciudad). Nada de «Seda» fijo en el código.
   - hN(): nombre · hLinea(): «nombre · ciudad» · hFirma(): firma para mensajes al cliente.
   - aplicarMarca(): pone el nombre en la cabecera, la hoja impresa y el título de la pestaña. */

function hotelDatos(){
  const a = (typeof ajustes !== 'undefined' && ajustes) || {};
  const p = (typeof _perfil !== 'undefined' && _perfil) || {};
  return {
    nombre: (a.hotel_nombre || p.hotel_nombre || '').trim(),
    ciudad: (a.hotel_ciudad || p.hotel_ciudad || '').trim(),
    dir: (a.hotel_dir || '').trim(), tel: (a.hotel_tel || '').trim(), web: (a.hotel_web || '').trim()
  };
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
  if(d.nombre && !/·/.test(document.title)) document.title = document.title + ' · ' + d.nombre;
}
