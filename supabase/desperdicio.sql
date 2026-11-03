-- Desperdicio alimentario (Ley 1/2025): permisos de config.seda_desperdicio. Pegar en el SQL Editor y Run.
-- Ver y apuntar: admin, dirección, chef y cocina, con el módulo «seguridad» activo. Lo demás, igual que antes.
create or replace function public.puede_config(clave text, escribir boolean) returns boolean language sql stable set search_path = '' as $$
  select case
    when clave = 'seda_precios'    then public.modulo_activo('costes') and public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos'] end)
    when clave in ('seda_inventario','seda_compras') then public.modulo_activo('costes') and public.rol_en(array['admin','direccion','chef'])
    when clave in ('seda_appcc','seda_desperdicio') then public.modulo_activo('seguridad') and public.rol_en(array['admin','direccion','chef','cocina'])
    when clave = 'seda_alg_rev'    then public.modulo_activo('seguridad') and public.rol_en(case when escribir then array['admin','direccion','chef','eventos'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave = 'seda_horarios'   then public.modulo_activo('equipo') and public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave in ('seda_pin','seda_rec') then public.rol_en(array['admin'])
    else public.rol_en(case when escribir then array['admin','direccion'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
  end
$$;
-- Comprobación: debe salir «true»
select position('seda_desperdicio' in pg_get_functiondef('public.puede_config(text,boolean)'::regprocedure)) > 0 as listo;
