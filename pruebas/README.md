# Pruebas automáticas (nube simulada)

Simulan varios móviles sobre una misma nube de Supabase (tablas, `config` y almacén de fotos), que reordena los
jsonb como Postgres y rechaza columnas inexistentes (`nube.js`).

```
python3 -m http.server 8765 &          # desde la raíz del proyecto
cd pruebas
for f in recetas recetas-mismo-dato tablas plantillas inventario-vacio config config-a-la-vez movil-nuevo fotos equipo clientes desperdicio cartas avisos rendimiento apps-nuevas fichaje hojas prevision logo albaran-foto albaran-ocr; do
  echo "== $f"; NODE_PATH=$(npm root -g) node $f.js
done
```
Cada prueba imprime ✔ / ✘ y «TODO BIEN» o el número de fallos. Pasarlas todas antes de cada PR que toque la sincronización.

## Prueba de carga (13/11/2026)
`node pruebas/carga.js comensales|equipo --vus N --seg S` simula tráfico real contra la app publicada del Seda (solo lee; topes y freno de emergencia; destinos fijos en el script). Resultados del 13/11 en `pruebas/resultados/`: hasta 80 invitados con QR y 150 móviles del equipo sin errores; picos de ~350 y ~500 peticiones/s sin errores. No simula nada que necesite cuenta (sincronizar, fichar): eso se midió en la base de datos con 51 hoteles falsos dentro de una transacción que se deshace sola.

## Service worker (sin navegador)
`node pruebas/sw-shell.js` comprueba que todo lo de `SHELL` existe, que todo lo que cargan las páginas está en `SHELL` y que `CACHE` ha subido de versión si cambia algún archivo de la app respecto a `origin/main`. Pasarla antes de cada PR.

## Reglas de la base de datos (PostgreSQL local)
Hay PostgreSQL 16 en el contenedor. Para probar un SQL de reglas antes de dárselo al usuario: crear un cluster
(`initdb` como usuario `postgres`), una base con roles `anon`/`authenticated`, esquema `auth` (tabla `users` y
`auth.uid()` que lee `request.jwt.claim.sub`), `storage` (buckets, objects, `storage.foldername`) y las tablas
públicas; aplicar el SQL y comprobar con `set role authenticated` + `set_config('request.jwt.claim.sub', …)`
qué ve y qué puede cambiar cada cuenta.

`albaran-ocr.js` lee una foto de verdad con Tesseract: necesita `npm i tesseract.js@5.1.1 @tesseract.js-data/spa@1.0.0` en una carpeta y su ruta en `OCR_NM` (por defecto, la del scratchpad).
`cartas.js` sirve el generador de QR desde una copia local: `npm i qrcode-generator@1.4.4` en una carpeta y su ruta en `QR_NM`.

## Horarios sin navegador (14/11/2026)
`node pruebas/horarios.js` (solo Node 18+, sin servidor, sin Playwright ni dependencias): carga los `horarios*.js` que cargan `index.html` en un contexto de Node con un `document` falso y la fecha fija en el viernes 13/11/2026, con datos como los del Seda. Comprueba cálculos (turnos, horas, avisos, cobertura), fusión con la nube (`hzElige`), pantallas (Plantilla, Mi semana, Vacaciones del año, cobertura por horas…), botones y formularios (editar turno, repetir semana, WhatsApp, fechas sin vacaciones, equipo), generador de semanas y modo solo lectura. Para vigilar que un cambio de código no altera lo que se ve: `--golden-escribir f.json` guarda una huella de 28 pantallas y `--golden f.json` la compara.
