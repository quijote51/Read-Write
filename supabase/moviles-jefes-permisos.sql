-- Móviles del equipo solo para jefes (paso 1 de 3): permisos de la clave nueva config.seda_horarios_tel ({nombre: móvil}).
-- Ver y cambiar: solo admin, dirección y chef, con el módulo «equipo» activo (como seda_horarios). Cocina, sala y eventos no la ven.
-- Todo lo demás queda igual que en supabase/prevision.sql (la versión vigente el 18/11/2026).
-- Pegar entero en Supabase → SQL Editor → Run ANTES de fusionar la PR. Se puede ejecutar varias veces. No toca datos.
create or replace function public.puede_config(clave text, escribir boolean) returns boolean language sql stable set search_path = '' as $$
  select case
    when clave = 'seda_precios'    then public.modulo_activo('costes') and public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos'] end)
    when clave in ('seda_inventario','seda_compras') then public.modulo_activo('costes') and public.rol_en(array['admin','direccion','chef'])
    when clave in ('seda_appcc','seda_desperdicio') then public.modulo_activo('seguridad') and public.rol_en(array['admin','direccion','chef','cocina'])
    when clave = 'seda_alg_rev'    then public.modulo_activo('seguridad') and public.rol_en(case when escribir then array['admin','direccion','chef','eventos'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave = 'seda_horarios'   then public.modulo_activo('equipo') and public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave = 'seda_horarios_tel' then public.modulo_activo('equipo') and public.rol_en(array['admin','direccion','chef'])
    when clave = 'seda_prevision'  then public.rol_en(case when escribir then array['admin','direccion','chef','eventos','cocina'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave in ('seda_pin','seda_rec') then public.rol_en(array['admin'])
    else public.rol_en(case when escribir then array['admin','direccion'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
  end
$$;
-- Comprobación: debe salir «true»
select position('seda_horarios_tel' in pg_get_functiondef('public.puede_config(text,boolean)'::regprocedure)) > 0 as listo;
