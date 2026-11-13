# Pendientes (actualizado el 12 de noviembre de 2026, cierre del día)

## Para seguir mañana
- [ ] Segundo plano (13/11): probar en el móvil «Enviar archivo» de una hoja de APPCC (mientras prepara, cambia de sección; al acabar, pulsa «Enviar» en la pastilla) y «Leer con foto» de un albarán.
- [ ] Caché por capas (13/11): tras publicar, abre la app 2 veces con internet; a partir de la siguiente publicación saldrá la barra «Hay una versión nueva · Actualizar». Si un móvil se queda con la versión vieja, ciérrale la app del todo y ábrela.
- [ ] Pegar `supabase/rendimiento-consultas.sql` en el SQL Editor de Supabase y pulsar Run (índices y reglas más rápidas; no cambia datos ni permisos). Debe salir 0 y 14.
- [ ] Probar con la cuenta real lo de abajo («Por probar con la cuenta real»), sobre todo el **dictado de recetas** con el micrófono del móvil y los **Primeros pasos** con los datos del Seda.
- [ ] Que alguien que no conozca la app la ponga en marcha con «Primeros pasos» y apuntar dónde se atasca.
- [ ] Ideas pendientes de decidir: foto de la receta (gratis para fichas impresas; con IA de pago para letra a mano), hotel de pruebas para enseñar la app, cliente piloto.
- Estudio de mercado actualizado: https://claude.ai/artifact/1r653St1bewnFA4Z395pcV

## Hecho el 12/11/2026, más fácil de empezar (PR #40 a #43, todo publicado)
- [x] Recetas: ingredientes en casillas y «Dictar receta» por voz (`recetas-entrada.js`, #40).
- [x] Platos de eventos y plantillas elegidos de la lista de recetas, con ✓ Receta / ≈ Usar / ⚠ Sin receta (`platos-entrada.js`, #41).
- [x] Tarjeta «Primeros pasos» en Inicio, por rol (`pasos.js`, #42).
- [x] «Elegir qué secciones ves», por rol y móvil (`secciones.js`, #43).
- [x] PENDIENTES al día y prueba de avisos corregida (#39).

## Hecho el 12/11/2026 (PR #27 a #38, todo publicado)
- [x] Copias de seguridad automáticas: cada lunes a las 3:00 UTC (`copias_semanales()` con pg_cron, guarda las 12 últimas). Copia nº 7 a mano.
- [x] `supabase/prevision.sql` aplicado: cocina y eventos ya pueden guardar «¿Cómo fue?».
- [x] **Fallo serio arreglado:** tras guardar un evento el botón se quedaba bloqueado y no se podía crear ni editar otro sin recargar (#30).
- [x] Diseño: cabecera siempre oscura y en una fila en el móvil; botones de 40 px y letra mínima 11 px en pantallas táctiles; solo una sección abierta; secciones agrupadas por tema; botones de icono con nombre (#28, #29, #30, #32, #34, #35).
- [x] «Sin alergias» en gris; el WhatsApp ya no dice «⚠️ ALERGIAS: Sin alergias registradas» (#28).
- [x] Buscador con ayuda (lupa): datos, secciones y ~35 preguntas «¿cómo hago…?» (`buscador.js`, #29).
- [x] Carta QR del comensal en 5 idiomas (ES, EN, FR, DE, IT) (#31).
- [x] Escandallo: precios en €/kg, €/l o €/ud, importes con coma; se escriben como se compran (40 €/kg); aviso de «faltan precios» (#34, #36).
- [x] Platos sin «F:», «M:» al editar eventos y plantillas (#33).
- [x] Inventario vacío con salida y «Pantalla completa» también en iPad (#30).
- [x] APPCC: hojas mensuales firmadas con el dedo (temperaturas, limpieza y recepción), imprimir o enviar en PDF; «Quién registra» tiene que ser un nombre; recepción muestra quién recibió (`appcc-hojas.js`, #37, #38).

## Por probar con la cuenta real (no se puede sin contraseña)
- [ ] Fichar entrada y salida; apps sueltas con sesión; carta QR escaneada con otro móvil; dos móviles a la vez; avisos en el móvil; imprimir hojas en papel; PDF de hojas firmadas por WhatsApp.
- [ ] En APPCC, cambiar «30» por el nombre en «Quién registra». Los registros del 12/11 con «30» se pueden anular con motivo «nombre mal puesto».

## Copias
- [ ] Las copias no incluyen fichajes, cartas QR ni avisos (los fichajes no se pueden borrar desde la app).

## Alergias (4/11/2026)
- [x] `supabase/avisos-regla-alergias.sql` aplicado (4/11/2026): los avisos del móvil ya no toman «Sin gluten» como «sin alergias».
- [ ] Carta QR: un plato sin alérgenos apuntados dice «pregunte al personal». Revisar las recetas sin marcas antes de poner el QR.
- [ ] La ficha de alérgenos del cliente aún dice «Sin alérgenos» si el plato tiene receta sin marcas: decidir si cambiarlo.
- [x] `pruebas/avisos.js` «eventos: solo lo suyo»: el fallo era de la prueba (leía la casilla «Temperaturas sin apuntar» de los avisos del móvil); ahora mira solo la lista de avisos (12/11/2026).

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
- [x] QR público de alérgenos: sección «Carta QR» (`cartas.js`) y página del comensal (`carta.html`).

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

## Mejoras del estudio de mercado (3/11/2026)
- [x] 1. Desperdicio alimentario (Ley 1/2025): `desperdicio.js`. Activado (PR #14 y SQL, 3/11/2026).
- [x] 2. Foto del albarán: lectura GRATIS en el móvil (`albaran-ocr.js`). La versión con IA está hecha y desplegada, pero sin clave (el usuario no quiere pagar); se activaría poniendo `ANTHROPIC_API_KEY` en Supabase y pegando `supabase/albaran-ia.sql`.
- [x] 3. Carta QR de alérgenos: `cartas.js` + `carta.html`. Activada (PR #17 y SQL, 3/11/2026).
- [x] 4. Avisos: campana en la app y notificaciones en el móvil (`avisos.js`, función `avisos-push` desplegada). Activado (PR #18 y #19, SQL, 3/11/2026). El stock bajo mínimo solo sale en la campana (se calcula en el aparato).
- [x] 5. Rendimiento de ingredientes (`rendimiento.js`): % aprovechable en Escandallo → Precios.
- [ ] Pesar y poner el aprovechable real de pescados, carnes y verduras.
- [x] Apps con acceso directo de Desperdicio (`desperdicio.html`) y Carta QR (`cartas.html`).
- [x] 6. Fichaje de jornada (`fichaje.js`, app `fichaje.html`). Activado (PR #22 y SQL, 3/11/2026). Cada persona necesita su cuenta con su nombre igual que en Horarios (o fichar desde la cuenta compartida).
- [x] 7. Hojas de evento por departamento (`hojas.js`).
- [x] 8. Previsión de producción (`prevision.js`): cerrar cada evento en Producción (cuántos vinieron, qué sobró); con 3 eventos cerrados sugiere cantidades. `supabase/prevision.sql` aplicado el 12/11/2026.
- [ ] Cerrar cada evento al terminar para que la previsión aprenda.
- [ ] Vercel gratis: máximo 100 publicaciones al día (el 3/11 se agotó y la PR #23 no se publicó sola).
- Estudio: https://claude.ai/artifact/1r653St1bewnFA4Z395pcV

## Fase 3: varios clientes (3/11/2026)
- [x] Base de datos: `supabase/fase3-clientes.sql` (módulos, códigos de cliente, panel de la plataforma). Probado en PostgreSQL local.
- [x] App: sin «Seda» fijo (`marca.js`), secciones y apps según módulos, Ajustes → Clientes.
- [x] PR #13 fusionada y SQL aplicado (3/11/2026).
- [x] Logo de cada cliente: Ajustes → Datos del hotel → «Subir logo» (cabecera, hojas impresas y carta QR).
- [ ] Subir el logo del Seda. Las cartas QR ya publicadas lo muestran al pulsar «Actualizar».

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
