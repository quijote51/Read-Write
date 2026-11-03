# Oído Cocina

App web (PWA) para la gestión de la cocina y los eventos de hoteles y restaurantes, con varios clientes. El primero y la cuenta «plataforma» es el Seda Club Hotel (Granada). HTML, CSS y JS sin compilar, sin framework y sin npm. Responder **en español**, claro y sin tecnicismos: el usuario es de cocina, no programador.

## Despliegue y datos
- Vercel: proyecto `oidococina-xu7i` → https://oidococina-xu7i.vercel.app. Se publica solo al fusionar en `main`. Hay otra copia, `read-write-tau.vercel.app`; usar la primera. Las versiones de prueba de las ramas piden cuenta de Vercel.
- Supabase: proyecto `gxkxslkdqgwovgxcuzkr` (plan gratuito). Las tablas `eventos`, `plantillas`, `vajilla`, `proveedores`, `personal` y `recetas` tienen una fila por elemento. **Recetas** usa la tabla desde el 3/11/2026 (clave `hotel_id`+`id`, `base`, `rinde`, `extra`, `borrado`, `updated_at` puesto por la base de datos); `config.seda_rec` se dejó de copia y ya no se escribe.
- Copias de seguridad: tabla `copias` (sin reglas de acceso: solo desde el panel) y función `hacer_copia(hotel, motivo)`. Hacer una copia antes de cada cambio de datos. La tabla `config` guarda (`hotel_id`, `key`, `value` en JSON), con una fila por clave. La tabla `miembros` lleva (`user_id`, `hotel_id`, `rol`, `nombre`) y `cambios` guarda los cambios de turno.
- Seguridad (RLS), fase 2 (`supabase/fase2-cuentas.sql`): cada persona tiene su cuenta. `mi_hotel()` = hotel de la cuenta (el dueño, `hoteles.owner`; un miembro, `miembros.hotel_id`) y `mi_rol()` = admin (dueño), direccion, chef, eventos, sala o cocina. Las reglas de cada tabla y de cada clave de `config` (`puede_config`) dicen qué rol ve y cambia qué. Altas con código: tabla `invitaciones` y función `unirse(codigo, nombre)`; equipo con `mi_equipo()`. La cuenta compartida cocina@oidococina.com sigue valiendo (rol cocina sin nombre). Probar los cambios de reglas en el PostgreSQL local (ver `pruebas/README.md`) antes de dárselos al usuario.
- `apply_migration` de Supabase pide una confirmación que caduca a los 60 s, y `execute_sql` también la pide para cambios de estructura (`ALTER TABLE`, `DROP`…). Si caduca, dejar el SQL en `supabase/*.sql` para que el usuario lo pegue en el SQL Editor. `ALTER POLICY` y las consultas no la piden.
- Fase 3 (`supabase/fase3-clientes.sql`): `hoteles` lleva `nombre`, `ciudad`, `modulos` (base, costes, seguridad, equipo) y `plataforma` (el Seda). `modulo_activo()` entra en `puede_config`. Códigos de cliente en `codigos_cliente` (solo la plataforma); `unirse()` acepta también un código de cliente y crea su hotel. `clientes()`, `cambiar_modulos()` y `guardar_hotel()`.
- **Nada de «Seda» fijo en el código ni en los datos de ejemplo**: el nombre y los datos de cada cliente salen de sus Ajustes (`marca.js`).
- La clave de Supabase que hay en el código es la publicable: es normal que esté ahí.

## Archivos
| Archivo | Qué es |
|---|---|
| `index.html` | App principal (unos 288 KB). Tiene un acordeón por sección (`ACC_TABS`), roles (`ROLES`, solo cambian lo que se ve), la sincronización (`syncConfig`, `syncTabla`, `cargarNube`, `reenviarTodo`) y casi todo el resto. **No hacerlo crecer:** cada función nueva va en su propio `.js`. |
| `horarios.js` + `horarios.html/.css` | Horarios de cocina (`config.seda_horarios`). |
| `inventario.js` + `inventario.html` | Inventario mensual (`config.seda_inventario`). |
| `alergenos.js` + `alergenos.html` | Los 14 alérgenos, `algDePlato`, cruce con invitados y ficha para el cliente. La revisión se guarda en `config.seda_alg_rev`. |
| `appcc.js` + `appcc.html` | APPCC: temperaturas, limpieza, recepción, muestra testigo, etiquetas y registros (`config.seda_appcc`). Fusiona con la nube por id. Los registros solo se anulan con motivo; nunca se editan. |
| `desperdicio.js` | Desperdicio alimentario (Ley 1/2025, módulo seguridad): registro de sobras (tipo, destino según la jerarquía de la ley, kg, evento), resumen por mes con % aprovechado y g/persona en eventos, plan de prevención imprimible y cartel del envase gratis (`config.seda_desperdicio`, registros solo se anulan). Permisos en `supabase/desperdicio.sql`. |
| `compras.js` | «Albaranes y costes» sobre los artículos del inventario: albaranes (actualizan precio e historial), subidas de precio, gasto por mes/proveedor/familia/artículo, stock mínimo con stock estimado, mermas entre dos recuentos y enlaces artículo ↔ ingrediente de receta (`config.seda_compras`). Desde una línea de albarán se puede dar de alta un artículo nuevo en el inventario. Fusiona con la nube por id, como APPCC. |
| `albaranes.html` | App suelta de Albaranes (usa `compras.js` con `window.CO_SUELTA`: solo Albaranes, Gasto y Precios). Lee `seda_inventario`, `seda_precios` y `seda_compras`; los precios del escandallo solo se suben si se han leído de la nube. |
| `recetario.js` | Recetario: ficha, alta, edición y borrado de recetas, y **elaboraciones base** (sub-recetas: `base:true`, `rinde:{cant,ud}`; ingredientes de una tanda). Su coste (`precioSubreceta`, usado por `getPrecioIng`), alérgenos (`algDeRecetaCompleta`) e ingredientes (`ingredientesBrutos`, usado en pedidos) pasan al plato. `htmlElaboracionesBase` en Producción y Pedidos. También se carga en `alergenos.html`. |
| `config-nube.js` | Claves de `config` (precios, inventario, horarios, ajustes…): `cfgSubir(clave, valor, aplicar)` junta dato a dato con la nube a partir de la última versión conocida (`seda_cfgbase_<clave>`, se fija en cada carga) y guarda solo si `updated_at` no ha cambiado (si no, vuelve a juntar). Listas que crecen: se suman las altas de los dos. Si la nube no tenía la clave al cargar, se recuerda como `null` y se junta partiendo de vacío. Lo usan `_subirConfig` (principal), `subirConfig` (`app-base.js`), `subir` de `inventario.html` y `horarios.html`. También `canonJSON` y `recAviso`. Se carga antes que `recetas-nube.js`. |
| `recetas-nube.js` | Recetas en la tabla `recetas`, una fila por receta: `saveRec` → `recProgramar` sube solo las cambiadas (diferencia con `seda_rec_sync`) y de cada una solo los campos cambiados; las borradas se marcan `borrado`. Avisa (`recAviso`) si otro aparato cambió el mismo campo. `recCargar` en `cargarNube` (primero sube lo pendiente); la primera vez pasa `config.seda_rec` a la tabla. Las apps sueltas leen con `recDeFila` desde `app-base.js`. |
| `tablas-nube.js` | Eventos, plantillas, vajilla, proveedores y personal: `syncTabla` → `tabSubir`, que sube solo las filas cambiadas en el aparato (memoria en `seda_sync_<tabla>`) y de cada una **solo los campos cambiados** (`update` con `.select()`); borra solo lo borrado aquí. `cargarNube` sube primero lo pendiente y luego toma la nube. Sin memoria (primera vez) no borra nada. `TAB_RENOMBRA` traduce campos con otro nombre en la nube (plantillas: `desc` ↔ `descripcion`). `canonJSON` (en `recetas-nube.js`) compara sin depender del orden de los campos. |
| `equipo.js` | Fase 2: `perfilAlEntrar()` (pregunta `mi_perfil`; `_uid` pasa a ser el HOTEL y `_yo` la persona; sin fase 2 en la nube sigue como antes), `puedeTabla`/`puedeConfig` (copia de los permisos: no se intenta guardar lo que el rol no cambia), alta con código (pantalla de entrada y pantalla «Únete a tu equipo») y Ajustes → Equipo (`equipoPintar`: invitar, ver, quitar). Las apps sueltas declaran `APP.roles` y `APP.modulo`. Fase 3: `moduloActivo`, `seccionActiva` (oculta secciones de módulos no contratados), `guardarHotelNube` y Ajustes → Clientes (`clientesPintar`, solo la plataforma: códigos de cliente y módulos de cada uno). |
| `marca.js` | `hotelDatos()`, `hN()`, `hLinea()`, `hFirma()` y `aplicarMarca()`: nombre, ciudad, dirección, teléfono y web de cada cliente (de Ajustes o del perfil) en cabeceras, hoja impresa y mensajes. |
| `fotos.js` | Reduce las fotos (900 px, JPEG) y, con sesión, las sube al almacén `fotos` de Supabase Storage (`fotos/<cuenta>/recetas|vajilla/…`, `supabase/fotos-almacen.sql`); en los datos solo queda el enlace. `fotoGuardar` borra la anterior. Sin sesión o si falla, la foto va dentro como antes y `reducirFotosGuardadas` la pasa al almacén en la siguiente carga. |
| `instalar.js` | Aviso «Instalar» en todas las apps: botón dorado cuando Android lo permite (`beforeinstallprompt`) y, si no, instrucciones (iPhone: Compartir; Android: abrir en Chrome → ⋮). No sale si ya está instalada o se cerró. |
| `app-base.js` + `app-base.css` | Base común de las apps sueltas: sesión, carga de eventos, recetas y proveedores, `syncConfig`, `recetaDePlato` y estilos. |
| `sw.js` | Service worker. **Subir `CACHE` (ahora `oido-cocina-v29`) y añadir a `SHELL` cada archivo nuevo. Cada app suelta nueva va también en la lista `clave` de navegación.** Archivos propios: red primero (si no, la página nueva se mezcla con un .js viejo guardado); CDN: caché primero. |
| `manifest-*.json` + `*-192/512/maskable/apple-180/favicon-32.png` | Una app instalable por módulo. Iconos dorados (#c9a84c) sobre fondo #1a1a1a. |
| `supabase/*.sql` | Referencia, todos aplicados (fase 2 y fase 3 el 3/11/2026). |
| `PENDIENTES.md` | Lista de tareas pendientes. **Leerla al empezar.** |

## Cómo añadir un módulo
1. Crear `modulo.js` con estado en `config.seda_x`, `window.initX()` y CSS propio inyectado.
2. En `index.html`: añadir `<script src>` en el `<head>`, `<div class="sec" id="tab-x">`, la entrada en `ACC_TABS`, `init` en la función que abre cada pestaña, los roles en `ROLES`, la clave en `cfgs` de `cargarNube`, en `reenviarTodo` y en `resetearTodo`.
3. Si va como app suelta: `x.html` (copiar `appcc.html`), su manifest e iconos, el enlace en Ajustes → «Apps con acceso directo» y la entrada en `sw.js`.

## Reglas del código
- Los datos de ejemplo de la primera vez (`_semilla`) solo se guardan en el aparato: nunca se suben solos (pisaban la nube en un móvil nuevo).
- Nunca se sube un inventario vacío (`_subirConfig`, `subirConfig` de `app-base.js` y `subir` de `inventario.html`); en la base de datos lo impide además el trigger de `supabase/proteger-inventario.sql`.
- En `cargarNube`, cada tabla y cada clave de config van en su propio `try`: un fallo en una no corta las demás.
- Escapar todo texto del usuario con `escH()` (principal) o `esc()` / `_algEsc()` (módulos). Los mensajes de WhatsApp, el CSV y `textContent` van sin escapar.
- Los eventos de demostración (`id < 1e6`) nunca se suben a la nube.
- Al cerrar sesión se borran las claves `seda_*`, `oido_*`, `hz_*`, `iv_*` y `ap_*` del aparato.

## Probar
- Servir con `python3 -m http.server 8765` y usar Playwright con un ancho de 390 px, entrando con «Seguir sin cuenta».
- Desde la sesión no se llega a la CDN ni a Supabase. Para probar con nube, simular `supabase-js` con `page.route` (registrar antes el bloqueo de la CDN: gana la última ruta) y crear el contexto con `serviceWorkers:'block'`, o el service worker se salta la simulación al recargar. La simulación debe desordenar las claves de los jsonb como Postgres y rechazar columnas que no existen.
- Pruebas de sincronización ya hechas en `pruebas/` (ver su README): pasarlas antes de cada PR que toque la nube.
- Comprobar siempre: sin `pageerror`, `scrollWidth` de 390 y que nada se sale de la pantalla.

## Git
- Trabajar en la rama asignada. Si su PR ya está fusionada, reiniciarla desde `origin/main` antes de seguir.
- **No subir nada a una PR después de que el usuario diga que va a fusionarla**: el cambio se quedaría fuera.
- El usuario fusiona; Claude no puede.
