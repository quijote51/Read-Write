#!/usr/bin/env bash
# Pasa TODAS las pruebas y dice cuáles fallan. Uso: bash pruebas/todas.sh   (desde la raíz del proyecto)
# Necesita Node y Playwright (con Chromium). Las librerías de QR y de lectura de fotos se instalan solas la primera vez
# en la carpeta de pruebas (PRUEBAS_TMP o la temporal del sistema). Sale con error si alguna falla: así lo usa GitHub.
cd "$(dirname "$0")/.." || exit 1
export PRUEBAS_TMP="${PRUEBAS_TMP:-${TMPDIR:-/tmp}/oido-pruebas}"; mkdir -p "$PRUEBAS_TMP"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
[ -f "$PRUEBAS_TMP/qr/node_modules/qrcode-generator/qrcode.js" ] || (mkdir -p "$PRUEBAS_TMP/qr" && cd "$PRUEBAS_TMP/qr" && npm i --silent --no-save qrcode-generator@1.4.4 >/dev/null)
[ -d "$PRUEBAS_TMP/ocr/node_modules/tesseract.js" ] || (mkdir -p "$PRUEBAS_TMP/ocr" && cd "$PRUEBAS_TMP/ocr" && npm i --silent --no-save tesseract.js@5.1.1 @tesseract.js-data/spa@1.0.0 >/dev/null)
python3 -m http.server 8765 >/dev/null 2>&1 & SERV=$!; trap 'kill $SERV 2>/dev/null' EXIT; sleep 1
mal=()
prueba(){ local nombre="$1"; shift; local salida; salida=$(timeout 600 "$@" 2>&1); local cod=$?
  if [ $cod -eq 0 ] && grep -q "TODO BIEN" <<<"$salida" && ! grep -q "✘" <<<"$salida"; then echo "✔ $nombre"
  else echo "✘ $nombre"; grep "✘" <<<"$salida" | head -5; [ $cod -ne 0 ] && tail -5 <<<"$salida"; mal+=("$nombre"); fi; }
prueba sw-shell node pruebas/sw-shell.js
prueba horarios node pruebas/horarios.js
for f in recetas recetas-mismo-dato tablas plantillas inventario-vacio config config-a-la-vez movil-nuevo fotos equipo clientes desperdicio cartas avisos rendimiento apps-nuevas fichaje hojas prevision logo albaran-foto albaran-ocr moviles; do
  prueba "$f" bash -c "cd pruebas && node $f.js"
done
if [ ${#mal[@]} -eq 0 ]; then echo "TODAS BIEN"; else echo "FALLAN ${#mal[@]}: ${mal[*]}"; exit 1; fi
