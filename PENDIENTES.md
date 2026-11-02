# Pendientes (2 de noviembre de 2026)

## Seguridad
- [ ] Ejecutar `supabase/seguridad-cambios.sql` en Supabase → SQL Editor → New query → Run.
- [ ] Apuntar en `miembros.nombre` qué persona del horario es el miembro de cocina.
- [ ] Activar *Leaked password protection* en Supabase → Authentication → Passwords.
- [ ] Pasar a `main` los arreglos de la rama `ccr-06f5e2e7-sstw9j` (borrar datos locales al cerrar sesión y proteger textos), para que lleguen a la app publicada.

## Boda peps (10/11/2026, 12:30, 15 pax, Restaurante Clandestino)
- Alérgenos del menú marcados en la nube: gluten, crustáceos, huevo, pescado, lácteos, frutos secos, sulfitos.
- [ ] Confirmar en cocina las croquetas de queso de cabra (gluten, lácteos, huevo) y el bacalao con alioli (pescado, gluten, huevo, lácteos, sulfitos) y quitar lo que no lleven.
- [ ] Preguntar si algún invitado tiene alergias y apuntarlas en el evento.
- [ ] Revisar si «Cumpleaños Eva» (mismo día, hora, pax y sitio) es un duplicado.
- [ ] Crear en el recetario las recetas de las croquetas y del bacalao.

## Hecho: ficha de alérgenos por evento (alergenos.js)
- Botón «Alérgenos» en cada evento y en Producción: ficha para el cliente, imprimible y en texto para WhatsApp.
- Avisa de platos sin receta y de posible huevo crudo; «revisado por» que caduca si cambia el menú.
- [ ] Más adelante: QR público de la ficha (necesita una página pública y un cambio en Supabase).

## Hecho: APPCC básico (appcc.js)
- Sección «APPCC» (roles Chef, Dirección y Administración): Hoy (temperaturas mañana/tarde, limpieza, muestras testigo), Recepción, Etiquetas, Registros (CSV e impresión) y Ajustes.
- Las cámaras, zonas y plazos son de ejemplo: [ ] cambiarlos en APPCC → Ajustes por los reales.
- [ ] Confirmar con el inspector o el consultor APPCC: rangos de temperatura, días de vida útil y si los banquetes necesitan muestra testigo (por defecto 7 días).
- [ ] Más adelante: mover los registros a una tabla propia en Supabase cuando haya muchos (ahora van en config 'seda_appcc').

## Otros
- Ficha de alérgenos para revisar: https://claude.ai/artifact/UgZsEDQXMzQQ33YPzSHJqR (privada; se comparte desde su botón Compartir).
- App para el amigo: https://oidococina-xu7i.vercel.app («Seguir sin cuenta»).
- [ ] Opcional: cuenta de revisor de solo lectura para ver eventos y recetas reales.
