# Pendientes (actualizado el 3 de noviembre de 2026)

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
- Horarios (`/horarios.html`), Inventario (`/inventario.html`), APPCC (`/appcc.html`), Alérgenos (`/alergenos.html`) y Albaranes (`/albaranes.html`), con enlaces en Ajustes.
- APPCC y Alérgenos comparten `app-base.js` y `app-base.css` (sesión, nube y estilos).
- [ ] Opcional: pasar Inventario a `app-base.js` para quitar código repetido.
- [ ] Los miembros con rol «cocina» no pueden usar APPCC con su propia cuenta (solo ven horarios). Para eso hace falta una tabla con permisos en Supabase.

## Otros
- Ficha de alérgenos para revisar: https://claude.ai/artifact/UgZsEDQXMzQQ33YPzSHJqR (privada; se comparte desde su botón Compartir).
- App para el amigo: https://oidococina-xu7i.vercel.app («Seguir sin cuenta»).
- [ ] Opcional: cuenta de revisor de solo lectura para ver eventos y recetas reales.

## Hecho (3/11/2026): mejoras tras comparar con otras apps
- [x] Arreglado el botón «Añadir foto» de las recetas (no funcionaba). Las fotos se reducen al guardarlas (de varios MB a unos 20-100 KB), también las que ya había.
- [x] Elaboraciones base (sub-recetas): fondos, salsas y masas como receta propia con su rinde, usadas dentro de otros platos. Su coste, alérgenos e ingredientes pasan al plato; Producción y Pedidos dicen cuánto preparar. Las recetas ya se pueden editar y borrar.
- [ ] Crear las elaboraciones base reales (fondo oscuro, bordalesa, masas…) y usarlas en los platos.
- Próximas mejoras propuestas, por orden: rendimiento de ingredientes (merma al limpiar), avisos en el móvil, hoja de evento por departamento, registro de sobras por evento, cambios al momento entre aparatos y foto del albarán que se rellena sola (IA).

## Estado al cierre del 3/11/2026
- Fase 1 terminada y activada (PR #6 a #11, almacén de fotos y protección del inventario).
- Copias de seguridad en `copias`: nº 1 a 4 (la 4, antes de juntar config: 312 artículos, 65 precios, 9 plantillas).
- Plan para vender la app (fases): 1) varias personas sin pisarse — HECHA salvo activar fotos; 2) una cuenta por persona y permisos reales; 3) varios clientes (quitar «Seda» del código, nombre y logo por cliente, módulos activables con bloqueo en la base de datos); 4) copias automáticas, pruebas, planes de pago de Vercel/Supabase y lo legal (RGPD: las alergias son datos de salud).

## Fase 2: una cuenta por persona (3/11/2026)
- [x] Base de datos: `supabase/fase2-cuentas.sql` (roles, permisos por tabla y por clave, invitaciones). Probado en PostgreSQL local.
- [x] App: `equipo.js` (perfil, rol fijo para miembros, alta con código, Ajustes → Equipo).
- [x] SQL aplicado y PR #12 fusionada (3/11/2026).
- [ ] Crear un código para cada persona del equipo y enviárselo.
- [ ] Más adelante: quién hizo cada cambio (columna «cambiado por»).

## Fase 1: varias personas a la vez sin pisarse (empezada el 3/11/2026)
- [x] Copia de seguridad de todos los datos (tabla `copias`, función `hacer_copia`).
- [x] Recetas: una fila por receta; solo se sube lo cambiado; si dos personas tocan la misma receta se juntan por campos.
- [ ] Abrir la app una vez con internet en TODOS los aparatos después de publicar (los que no se actualicen siguen guardando en el sistema antiguo).
- [x] Eventos, vajilla, plantillas, proveedores y personal: solo se sube lo cambiado (campo a campo) y no se pisan cambios de otros.
- [x] Precios, inventario, horarios y demás configuración: se juntan dato a dato; guardar a la vez no pisa nada. Un móvil nuevo ya no sube los datos de ejemplo encima de los reales.
- [x] Fotos al almacén de archivos de Supabase (activado el 3/11/2026).

- [x] Plantillas: nunca llegaban a la nube (campo `desc` frente a columna `descripcion`). Arreglado el 3/11/2026; al abrir la app se suben solas.

- [x] Inventario en blanco tras publicar (3/11/2026): el móvil mezclaba la página nueva con un archivo viejo guardado y la carga se cortaba. Arreglado: archivos propios siempre de la red, cada parte de la carga por separado y nunca se sube un inventario vacío. Copia nº 3 con los 312 artículos.
- [x] Protección del inventario en la base de datos (activada el 3/11/2026).

## Siguiente
- [x] Compras hecho (`compras.js`, sección «Albaranes y costes»).
- [ ] Apuntar los albaranes que lleguen y enlazar en «Enlaces» los artículos que se usan en recetas (hay propuestas automáticas).
- [ ] Poner mínimos a los artículos que no pueden faltar.
- [ ] Las mermas salen a partir del segundo recuento de inventario (el primero es del 26/10/2026).
- [x] App suelta de Albaranes (`/albaranes.html`) con pestaña «Gasto» (sumas por mes, proveedor, familia y artículo) y alta de productos nuevos desde el albarán.
- [ ] Instalarla en el móvil: abrir oidococina-xu7i.vercel.app/albaranes.html → «Añadir a pantalla de inicio».
