# Pendientes (actualizado el 2 de noviembre de 2026)

## Seguridad
- [x] SQL de seguridad de cambios de turno aplicado en Supabase (2/11/2026).
- [x] `miembros.nombre` no hace falta: cocina@oidococina.com es una cuenta compartida. Rellenarlo solo si cada cocinero tiene su propia cuenta.
- [ ] *Leaked password protection* no existe en el plan gratuito de Supabase. En su lugar: Authentication → Email → longitud mínima 10 y mayúsculas, minúsculas y números.
- [ ] Cambiar las contraseñas de tu cuenta y de cocina@oidococina.com por otras de al menos 10 caracteres.
- [x] Arreglos de seguridad, ficha de alérgenos, APPCC y apps sueltas publicados (PR #1 y #2).

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

## Apps con acceso directo
- Horarios (`/horarios.html`), Inventario (`/inventario.html`), APPCC (`/appcc.html`) y Alérgenos (`/alergenos.html`), con enlaces en Ajustes.
- APPCC y Alérgenos comparten `app-base.js` y `app-base.css` (sesión, nube y estilos).
- [ ] Opcional: pasar Inventario a `app-base.js` para quitar código repetido.
- [ ] Los miembros con rol «cocina» no pueden usar APPCC con su propia cuenta (solo ven horarios). Para eso hace falta una tabla con permisos en Supabase.

## Otros
- Ficha de alérgenos para revisar: https://claude.ai/artifact/UgZsEDQXMzQQ33YPzSHJqR (privada; se comparte desde su botón Compartir).
- App para el amigo: https://oidococina-xu7i.vercel.app («Seguir sin cuenta»).
- [ ] Opcional: cuenta de revisor de solo lectura para ver eventos y recetas reales.

## Siguiente
- [x] Compras hecho (`compras.js`, sección «Albaranes y costes»).
- [ ] Apuntar los albaranes que lleguen y enlazar en «Enlaces» los artículos que se usan en recetas (hay propuestas automáticas).
- [ ] Poner mínimos a los artículos que no pueden faltar.
- [ ] Las mermas salen a partir del segundo recuento de inventario (el primero es del 26/10/2026).
- [ ] Opcional: app suelta de Albaranes con acceso directo.
