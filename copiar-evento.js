/* Copiar un evento anterior (Nuevo evento). Tarjeta arriba del formulario: se elige un evento ya hecho y se rellena
   el formulario con sus datos. No guarda nada: el usuario pone la fecha, revisa y pulsa «Guardar evento».
   NO se copian la fecha ni las alergias (los invitados son otros). Los platos se copian sin alérgenos fijos:
   se vuelven a enlazar con las recetas al guardar, como siempre. */
(function(){
  const g = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const lista = () => (typeof eventos !== 'undefined' && Array.isArray(eventos) ? eventos : []).filter(e => e && e.nombre)
    .slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  const fechaCorta = f => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(f || ''); if (!m) return ''; const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return +m[3] + ' ' + M[+m[2] - 1] + ' ' + m[1]; };
  const editando = () => { const a = g('n-edit-aviso'); return !!(a && a.style.display === 'block'); };

  function opciones(){
    const s = g('ce-sel'); if (!s) return;
    const v = s.value;
    s.innerHTML = '<option value="">Elige un evento anterior…</option>' + lista().slice(0, 60).map(e =>
      `<option value="${esc(e.id)}">${esc(fechaCorta(e.fecha))} · ${esc(e.nombre)}${e.pax ? ' · ' + esc(e.pax) + ' pax' : ''}</option>`).join('');
    s.value = v;
  }
  function aviso(t, mal){ const a = g('ce-aviso'); if (!a) return; a.textContent = t || ''; a.style.display = t ? 'block' : 'none'; a.style.color = mal ? 'var(--warn-text)' : 'var(--text-secondary)'; }

  function copiar(){
    const s = g('ce-sel'); if (!s || !s.value) return;
    const ev = lista().find(e => String(e.id) === s.value); if (!ev) return;
    if (editando()) { aviso('Estás editando un evento. Termina o cancela primero y luego copia.', true); s.value = ''; return; }
    const pl = c => (ev.platos || []).filter(p => p.cat === c).map(p => p.nombre).join('\n');
    const set = (id, v) => { const el = g(id); if (el) el.value = v; };
    set('n-nom', ev.nombre); set('n-fecha', ''); set('n-hora', ev.hora || '');
    set('n-pax', ev.pax || ''); if (ev.tipo) set('n-tipo', ev.tipo); set('n-lugar', ev.lugar || '');
    set('n-alerg-txt', '');
    const f = ev.factor_custom || (typeof getFactorEvento === 'function' ? getFactorEvento(ev) : ''); set('n-factor', f); set('n-factor-slider', f);
    set('n-precio-venta', ev.precio_venta || '');
    set('n-fr', pl('F')); set('n-ca', pl('C')); set('n-po', pl('P')); set('n-pr', pl('M'));
    set('n-ninos', ev.infantil ? ev.infantil.ninos || 0 : ''); set('n-precio-nino', ev.infantil ? ev.infantil.precio_nino || '' : '');
    try { renderAlgSel('alg-selector', ev.alergenos_menu || []); renderPlatosInfantil(ev.infantil ? ev.infantil.platos || [] : []); } catch (e) {}
    aviso('Copiado de «' + ev.nombre + '». Falta poner la fecha y las alergias de este evento; revisa lo demás y pulsa Guardar.');
    s.value = '';
    const d = g('n-fecha'); if (d) { try { d.scrollIntoView({block: 'center'}); d.focus(); } catch (e) {} }
  }

  function montar(){
    const t = g('tab-nuevo'); if (!t || g('ce-card')) return;
    const c = document.createElement('div'); c.id = 'ce-card'; c.className = 'card'; c.style.cssText = 'margin-bottom:12px;background:var(--bg-secondary)';
    c.innerHTML = '<div style="font-size:13px;font-weight:500;margin-bottom:8px"><i class="ti ti-copy"></i> Copiar un evento anterior (opcional)</div>' +
      '<select id="ce-sel" aria-label="Copiar un evento anterior" style="width:100%;font-size:13px"><option value="">Elige un evento anterior…</option></select>' +
      '<div id="ce-aviso" style="display:none;margin-top:8px;font-size:12px"></div>';
    t.insertBefore(c, t.firstChild);
    const s = g('ce-sel');
    s.addEventListener('change', copiar);
    ['focus', 'pointerdown'].forEach(ev => s.addEventListener(ev, opciones));
    opciones();
  }

  window.copiarEventoOpciones = opciones;
  const ini = () => { montar(); opciones(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ini); else ini();
  const _st = window.showTab;
  if (typeof _st === 'function') window.showTab = function(name){ const r = _st.apply(this, arguments); if (name === 'nuevo') { montar(); opciones(); aviso(''); } return r; };
})();
