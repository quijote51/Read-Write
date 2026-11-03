/* Lectura GRATIS de la foto de un albarán, en el propio móvil (Tesseract.js: reconocimiento de texto, sin IA de pago
   y sin mandar la foto a nadie). La primera vez descarga unos MB (programa y diccionario de español); después
   queda guardado en el aparato.
   - ocrAlbaran(foto, articulos, proveedores, progreso) → {proveedor, numero, fecha, lineas:[{texto, articulo,
     cantidad, unidad, importe}], notas}: el mismo formato que la lectura con IA (supabase/functions/leer-albaran).
   - interpretarAlbaran(texto, …): de texto a datos, cruzando con los artículos del inventario y los proveedores.
   Acierta menos que la IA (letra pequeña, papel arrugado, fotos torcidas): siempre se revisa antes de guardar. */

const OCR_LIB = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
function _ocrScript(src){
  return new Promise((ok, mal) => {
    if(document.querySelector(`script[src="${src}"]`) && window.Tesseract) return ok();
    const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se ha podido descargar el lector de fotos. Hace falta internet la primera vez.'));
    document.head.appendChild(s);
  });
}
async function ocrAlbaran(foto, articulos, proveedores, progreso){
  if(!window.Tesseract) await _ocrScript(OCR_LIB);
  const worker = await Tesseract.createWorker('spa', 1, {logger: m => { if(progreso && m.status === 'recognizing text') progreso(Math.round((m.progress || 0) * 100)); }});
  try{
    const {data} = await worker.recognize(foto);
    return interpretarAlbaran(data.text || '', articulos, proveedores);
  }finally{ try{ await worker.terminate(); }catch(e){} }
}

const _ocrNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
const _OCR_UNID = new Set(['kg','kgs','kilo','kilos','gr','g','grs','l','lt','litro','litros','ml','ud','uds','unid','unidad','unidades','pqt','paquete','caja','cajas','x','de','la','el','con','sin','y']);
const _OCR_FUERA = /\b(total|subtotal|base|imponible|iva|i\.v\.a|cif|nif|tel|telf|tlf|fax|pagina|pag|forma de pago|vencimiento|cuenta|iban|recargo|portes|descuento|dto|firma|recibi|albar[aá]n|factura|fecha|descripci[oó]n|cliente|pedido|direcci[oó]n|c\.?p\.?)\b/i;
// Números de una línea: «1.234,56» → 1234.56 · «5,2» → 5.2 · «12» → 12
function _ocrNumeros(linea){
  return (String(linea).match(/\d{1,3}(?:\.\d{3})+,\d+|\d+(?:[.,]\d+)?/g) || []).map(t => {
    const s = /\.\d{3}(?:\.|,)/.test(t) || /^\d{1,3}(\.\d{3})+,\d+$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.');
    return parseFloat(s);
  }).filter(n => !isNaN(n));
}
function _ocrFecha(texto){
  const m = String(texto).match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if(!m) return null;
  let [, d, mes, a] = m; if(a.length === 2) a = '20' + a;
  if(+mes < 1 || +mes > 12 || +d < 1 || +d > 31) return null;
  return `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
// Número del albarán: lo que va detrás de «Albarán», «Nº», «Número»… (el lector a veces confunde «º» con «9», «o» o «*»)
function _ocrNumero(texto){
  const re = /(?:albar[aá]n|factura|documento|n[uú]mero|num\.?)\s*(?:n\s*[º°o9*.]+)?\s*[:#.\-—]?\s*([A-Z]{0,4}[\-\/]?\d[A-Z0-9\-\/]{0,14})/gi;
  for(const m of String(texto).matchAll(re)){ const c = m[1]; if(!/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(c) && /\d/.test(c) && c.length >= 2) return c; }
  const m = String(texto).match(/\bn\s*[º°]\.?\s*([A-Z0-9][A-Z0-9\-\/]{1,15})/i);
  return m ? m[1] : null;
}
// Artículo del inventario que mejor encaja con una línea (todas o casi todas sus palabras aparecen en la línea)
function _ocrArticulo(linea, articulos){
  const pal = _ocrNorm(linea).split(' ');
  const esta = t => pal.some(p => p === t || (t.length >= 4 && (p.startsWith(t) || t.startsWith(p) && p.length >= 4)));
  let mejor = null, puntos = 0;
  for(const a of articulos || []){
    const toks = _ocrNorm(a.n).split(' ').filter(t => t.length >= 3 && !_OCR_UNID.has(t) && !/^\d+$/.test(t));
    if(!toks.length) continue;
    const hay = toks.filter(esta).length, p = hay / toks.length;
    const vale = toks.length <= 2 ? hay === toks.length : p >= 0.67;
    if(vale && (p > puntos || (p === puntos && mejor && a.n.length > mejor.n.length))){ mejor = a; puntos = p; }
  }
  return mejor;
}
function interpretarAlbaran(texto, articulos, proveedores){
  const lineasTxt = String(texto).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const todo = _ocrNorm(texto);
  const proveedor = (proveedores || []).find(p => { const t = _ocrNorm(p).split(' ').filter(x => x.length >= 3); return t.length && t.every(x => todo.includes(x)); }) || null;
  const lineas = [];
  for(const l of lineasTxt){
    if(_OCR_FUERA.test(l) || !/[a-záéíóúñ]{3}/i.test(l)) continue;
    const nums = _ocrNumeros(l), art = _ocrArticulo(l, articulos);
    if(!art && nums.length < 2) continue;
    if(!nums.length) { lineas.push({texto: l, articulo: art ? art.n : null, cantidad: null, unidad: art ? art.u : null, importe: null}); continue; }
    const cantidad = nums.length >= 2 ? nums[0] : null, importe = nums[nums.length - 1];
    // Nombre de la línea sin los números (para darla de alta si no está en el inventario)
    const nombre = l.replace(/\d{1,3}(?:\.\d{3})+,\d+|\d+(?:[.,]\d+)?/g, ' ').replace(/[€%|*_=]+/g, ' ').replace(/\b(kg|kgs|ud|uds|unid|l|lt)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim();
    lineas.push({texto: (nombre || l).slice(0, 80), articulo: art ? art.n : null, cantidad, unidad: art ? art.u : null, importe});
  }
  return {proveedor, numero: _ocrNumero(texto), fecha: _ocrFecha(texto), lineas: lineas.slice(0, 60), total: null,
    notas: 'Leído en el móvil (gratis): revisa artículos, cantidades e importes, y borra las líneas que sobren.'};
}
