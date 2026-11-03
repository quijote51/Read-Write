/* ══════════════════════════════════════
   OÍDO COCINA · Rendimiento de los ingredientes (módulo «Costes»)
   Lo que queda de un producto después de limpiarlo (pescado entero, carne con hueso, verdura con piel…).
   - Se guarda en los precios: preciosIng[nombre].rend = % aprovechable (1-100; sin dato = 100 %).
   - Escandallo: el precio que cuenta es el del producto limpio → precio de compra / rendimiento (getPrecioIng).
   - Pedidos y stock estimado: la receta lleva peso limpio; se compra el bruto → cantidad / rendimiento
     (calcIngredientesPedido).
   - En Escandallo → Precios: columna «Aprovechable», calculadora (peso bruto y limpio) y valores típicos orientativos.
   Usa del principal: preciosIng, savePrecios, renderEscPrecios, escH.
   ══════════════════════════════════════ */
const _rdNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

// Valores típicos (orientativos: cada cocina debe pesar los suyos). Se comprueban en orden: lo más concreto primero.
const REND_TIPICO = [
  [/\b(lomo|filete|file|loncha|lonchas|limpio|limpia|pelad[oa]s?|congelad[oa] limpio)\b/, null], // ya viene limpio
  [/\bsalmon\b/, 60], [/\b(merluza|lubina|dorada|corvina|rodaballo|besugo|pargo|lenguado|rape|sargo|mero)\b/, 45],
  [/\bpulpo\b/, 50], [/\b(calamar|calamares|sepia|chipiron|chipirones)\b/, 70],
  [/\b(gamba|gambas|langostino|langostinos|carabinero|carabineros|cigala|cigalas)\b/, 45],
  [/\b(mejillon|mejillones)\b/, 30], [/\b(almeja|almejas|berberecho|berberechos)\b/, 25], [/\b(bogavante|langosta)\b/, 35],
  [/\b(pollo|gallina|pularda)\b/, 65], [/\b(pato)\b/, 60], [/\bsolomillo\b/, 80], [/\b(pierna|paletilla)\b/, 70],
  [/\b(costilla|costillas|chuleton|chuletero)\b/, 75],
  [/\balcachofa/, 35], [/\b(coliflor|romanesco)\b/, 55], [/\bbrocoli\b/, 60], [/\bpuerro/, 60], [/\b(esparrago|esparragos)\b/, 70],
  [/\b(calabaza)\b/, 70], [/\bapio\b/, 75], [/\b(lechuga|escarola|endivia)\b/, 70], [/\b(espinaca|espinacas|acelga|acelgas)\b/, 80],
  [/\b(patata|patatas)\b/, 80], [/\b(zanahoria|zanahorias)\b/, 85], [/\b(ajo|ajos)\b/, 85], [/\b(berenjena|berenjenas)\b/, 85],
  [/\b(pimiento|pimientos)\b/, 80], [/\b(cebolla|cebollas|chalota|chalotas)\b/, 90], [/\b(calabacin|calabacines)\b/, 90],
  [/\b(tomate|tomates)\b/, 90], [/\b(judia|judias)\b/, 90], [/\b(champinon|champinones|seta|setas)\b/, 90],
  [/\bpina\b/, 50], [/\b(melon)\b/, 55], [/\b(sandia)\b/, 50], [/\bmango\b/, 65], [/\baguacate\b/, 70], [/\b(platano)\b/, 65],
  [/\b(manzana|pera)\b/, 80], [/\b(fresa|fresas|freson)\b/, 90], [/\b(naranja|mandarina)\b/, 70]
];
function rendTipico(nombre){
  const n = _rdNorm(nombre);
  for(const [re, v] of REND_TIPICO) if(re.test(n)) return v;
  return null;
}
// % aprovechable guardado (1-100) o null
function rendPct(nombre){
  const v = typeof preciosIng !== 'undefined' && preciosIng && preciosIng[nombre] ? parseFloat(preciosIng[nombre].rend) : NaN;
  return isNaN(v) ? null : Math.min(100, Math.max(1, v));
}
// Factor para dividir: 0,45 si se aprovecha el 45 %; 1 si no hay dato
function rendDe(nombre){ const p = rendPct(nombre); return p ? p / 100 : 1; }

function rendGuardar(nombre, valor){
  const t = String(valor ?? '').replace(',', '.').trim(), v = t === '' ? null : parseFloat(t);
  if(v != null && (isNaN(v) || v <= 0 || v > 100)){ alert('El aprovechable va de 1 a 100 %.'); if(typeof renderEscPrecios === 'function') renderEscPrecios(); return; }
  if(!preciosIng[nombre]) preciosIng[nombre] = {precio: 0, ud: ''};
  if(v == null || v === 100) delete preciosIng[nombre].rend; else preciosIng[nombre].rend = Math.round(v * 10) / 10;
  savePrecios(preciosIng);
  if(typeof renderEscPrecios === 'function') renderEscPrecios();
}
// Calculadora: peso antes y después de limpiar
function rendCalcular(nombre){
  const bruto = parseFloat(String(prompt(`${nombre}\nPeso ANTES de limpiar (bruto), en g o kg:`) || '').replace(',', '.'));
  if(!(bruto > 0)) return;
  const limpio = parseFloat(String(prompt(`${nombre}\nPeso DESPUÉS de limpiar (limpio), en la misma unidad:`) || '').replace(',', '.'));
  if(!(limpio > 0)) return;
  if(limpio > bruto) return alert('El peso limpio no puede ser mayor que el bruto.');
  rendGuardar(nombre, Math.round(limpio / bruto * 1000) / 10);
}
const _rdArg = n => escH(JSON.stringify(n));
// Celda de la tabla de precios
function htmlRendCelda(nombre){
  const p = rendPct(nombre), tip = rendTipico(nombre);
  return `<div class="rd-celda"><input type="text" inputmode="decimal" class="rd-in" value="${p != null ? String(p).replace('.', ',') : ''}" placeholder="100" aria-label="% aprovechable de ${escH(nombre)}"
      onchange="rendGuardar(${_rdArg(nombre)},this.value)"><span class="rd-pct">%</span>
    <button type="button" class="rd-calc" title="Calcular con el peso bruto y limpio" aria-label="Calcular rendimiento de ${escH(nombre)}" onclick="rendCalcular(${_rdArg(nombre)})">⚖</button></div>
    ${tip && p == null ? `<button type="button" class="rd-tip" onclick="rendGuardar(${_rdArg(nombre)},${tip})">Típico: ${tip} %</button>` : ''}`;
}
// Nota para el escandallo de un plato
function htmlRendNota(nombre){
  const p = rendPct(nombre);
  return p != null && p < 100 ? `<div class="rd-nota">aprovechable ${String(p).replace('.', ',')} %</div>` : '';
}
(function(){
  const st = document.createElement('style');
  st.textContent = `.rd-celda{display:inline-flex;align-items:center;gap:3px;justify-content:flex-end}
.rd-in{width:44px!important;padding-left:4px!important;padding-right:4px!important;font-size:13px;text-align:right}.rd-pct{font-size:12px;color:var(--text-secondary)}
.rd-calc{background:var(--bg-secondary);border:.5px solid var(--border);border-radius:6px;min-width:30px;min-height:30px;padding:0;cursor:pointer;font-size:14px;color:var(--text-primary)}
.rd-tip{display:block;margin:3px 0 0 auto;background:none;border:0;padding:0;font-size:11px;color:var(--info-text);cursor:pointer;text-decoration:underline}
@media(max-width:480px){#esc-precios-cont .ptable input[type=number]{width:74px!important;padding-left:4px!important;padding-right:4px!important}#esc-precios-cont .ptable th,#esc-precios-cont .ptable td{padding-left:5px;padding-right:5px}}
.rd-nota{font-size:10.5px;color:var(--text-secondary)}`;
  document.head.appendChild(st);
})();
