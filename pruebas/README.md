# Pruebas automáticas (nube simulada)

Simulan varios móviles sobre una misma nube de Supabase (tablas, `config` y almacén de fotos), que reordena los
jsonb como Postgres y rechaza columnas inexistentes (`nube.js`).

```
python3 -m http.server 8765 &          # desde la raíz del proyecto
cd pruebas
for f in recetas recetas-mismo-dato tablas plantillas inventario-vacio config config-a-la-vez movil-nuevo fotos; do
  echo "== $f"; NODE_PATH=$(npm root -g) node $f.js
done
```
Cada prueba imprime ✔ / ✘ y «TODO BIEN» o el número de fallos. Pasarlas todas antes de cada PR que toque la sincronización.
