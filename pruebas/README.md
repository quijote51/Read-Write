# Pruebas automáticas (nube simulada)

Simulan varios móviles sobre una misma nube de Supabase (tablas, `config` y almacén de fotos), que reordena los
jsonb como Postgres y rechaza columnas inexistentes (`nube.js`).

```
python3 -m http.server 8765 &          # desde la raíz del proyecto
cd pruebas
for f in recetas recetas-mismo-dato tablas plantillas inventario-vacio config config-a-la-vez movil-nuevo fotos equipo clientes desperdicio cartas avisos rendimiento apps-nuevas albaran-foto albaran-ocr; do
  echo "== $f"; NODE_PATH=$(npm root -g) node $f.js
done
```
Cada prueba imprime ✔ / ✘ y «TODO BIEN» o el número de fallos. Pasarlas todas antes de cada PR que toque la sincronización.

## Reglas de la base de datos (PostgreSQL local)
Hay PostgreSQL 16 en el contenedor. Para probar un SQL de reglas antes de dárselo al usuario: crear un cluster
(`initdb` como usuario `postgres`), una base con roles `anon`/`authenticated`, esquema `auth` (tabla `users` y
`auth.uid()` que lee `request.jwt.claim.sub`), `storage` (buckets, objects, `storage.foldername`) y las tablas
públicas; aplicar el SQL y comprobar con `set role authenticated` + `set_config('request.jwt.claim.sub', …)`
qué ve y qué puede cambiar cada cuenta.

`albaran-ocr.js` lee una foto de verdad con Tesseract: necesita `npm i tesseract.js@5.1.1 @tesseract.js-data/spa@1.0.0` en una carpeta y su ruta en `OCR_NM` (por defecto, la del scratchpad).
`cartas.js` sirve el generador de QR desde una copia local: `npm i qrcode-generator@1.4.4` en una carpeta y su ruta en `QR_NM`.
