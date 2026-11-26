# Pendientes (actualizado el 26 de noviembre de 2026)
Solo lo abierto. Lo hecho y las notas largas están en `PENDIENTES-HISTORIAL.md` (no hace falta leerlo al empezar).

## Estado
- Web en vivo en v109 (comprobar tras cada PR con `curl https://oidococina-xu7i.vercel.app/sw.js` que `CACHE` coincide con `main`; si no, lanzar la publicación a mano con el conector de Vercel). Protección del equipo de Horarios activa en la base de datos. 18/11: móviles del equipo solo para jefes (`seda_horarios_tel`) aplicado y publicado; aún no había ningún móvil puesto, así que la migración no tuvo nada que mover. 18/11: las copias guardan también fichajes, cartas QR, datos del hotel e invitaciones (`copias-completas.sql` aplicado) y GitHub pasa todas las pruebas en cada PR (`pruebas/todas.sh`).
- 26/11: ayuda «¿Cómo se hace…?» en la app suelta de Horarios (`horarios-ayuda.js`, rama `claude/horarios-ayuda`, v110), pendiente de fusionar. Semanas del 23/11 y del 30/11 cargadas desde las fotos del usuario (copias nº 19 y 20); falta dar de alta en Vacaciones las de Rubén (30/11–6/12) y Darío (23–29/11).
- 16/11: los 10 fichajes de prueba (3/11 Álvaro ×4 y Fabián; 13/11 Darío y Ana) quedaron anulados con el motivo «prueba de la app».

## Esperan una respuesta
- [ ] Fichajes de Jimena y David (15/11): entrada sin salida. Falta la hora de salida de cada uno para ponerla a mano con motivo.
- [ ] Rubén, viernes 27/11: guardado 14:30-23:30 según la foto; confirmar si es hasta las 22:30.
- [ ] Horarios de sala: faltan los datos de la metre (ver memoria `horarios-sala-pendiente`).
- [ ] Alérgenos del almuerzo de jubilación del 13/11: confirmar con cocina los platos sin receta y los choques con alergias (lo lleva otra sesión).

## Por programar
- [ ] Horarios: calendario del año calculado una sola vez (queda de la prueba de tiempos).
- [ ] Ideas de diseño: iconos en vez de emojis y agrupar el formulario de evento.
- [ ] Ideas por decidir: foto de receta con IA (de pago), hotel de pruebas para enseñar la app, cliente piloto.

## Por probar con datos reales del Seda
- [ ] Horarios: envío por WhatsApp (poner antes el móvil de cada uno en Equipo), vista por días, año de vacaciones, organizador, parámetros y avisos nuevos. Probar con dos móviles a la vez.
- [ ] Horarios (app suelta): probar la barra «¿Cómo se hace…?» con un móvil de cocina (solo consulta) y con un jefe; apuntar qué pregunta no encuentra.
- [ ] Dictado de recetas con el micrófono, «Leer receta de foto» con ficha impresa, Primeros pasos.
- [ ] Fichar entrada y salida con cuenta real; carta QR escaneada con otro móvil; avisos en el móvil; imprimir hojas; PDF de APPCC por WhatsApp; «Enviar archivo» y «Leer con foto» en segundo plano.
- [ ] Tras publicar: abrir la app dos veces con internet y pulsar «Actualizar». Si un móvil se queda con la versión vieja, cerrarla del todo y abrirla.
- [ ] Que alguien que no conozca la app la ponga en marcha con «Primeros pasos» y apuntar dónde se atasca.

## Datos y ajustes del Seda
- [ ] Cambiar las cámaras, zonas y plazos de ejemplo de APPCC por los reales; confirmar rangos, vida útil y muestra testigo con el consultor.
- [ ] En APPCC, cambiar «30» por el nombre en «Quién registra»; anular con motivo «nombre mal puesto» los registros del 12/11.
- [ ] Crear las elaboraciones base reales (fondo oscuro, bordalesa, masas…) y las recetas de croquetas y bacalao.
- [ ] Pesar y poner el aprovechable real de pescados, carnes y verduras.
- [ ] Apuntar los albaranes, enlazar artículos con ingredientes y poner mínimos de stock. Las mermas salen desde el segundo recuento.
- [ ] Cerrar cada evento al terminar («¿Cómo fue?») para que la previsión aprenda.
- [ ] Subir el logo del Seda y crear un código de alta para cada persona del equipo.
- [ ] Carta QR: revisar recetas sin alérgenos marcados antes de poner el QR.
- [ ] Boda peps (10/11): confirmar croquetas de cabra y bacalao con alioli; preguntar alergias; revisar si «Cumpleaños Eva» es duplicado.

## Seguridad
- [ ] Contraseñas de tu cuenta y de cocina@oidococina.com de al menos 10 caracteres (Authentication → Email: longitud mínima 10 con mayúsculas, minúsculas y números; *leaked password protection* no existe en el plan gratuito).
- [ ] Los miembros con rol «cocina» no pueden usar APPCC con su propia cuenta (haría falta una tabla con permisos).

## Otros
- [ ] Vercel gratis: máximo 100 publicaciones al día.
- [ ] Opcional: pasar Inventario a `app-base.js`; cuenta de revisor de solo lectura; más prueba de carga desde varias redes.
- Estudio de mercado: https://claude.ai/artifact/1r653St1bewnFA4Z395pcV
- App para el amigo: https://oidococina-xu7i.vercel.app («Seguir sin cuenta»).
