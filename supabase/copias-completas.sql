-- Copias de seguridad completas (18/11/2026): hacer_copia() guarda ahora también los FICHAJES (la ley obliga a
-- conservarlos 4 años), las cartas QR publicadas, los datos del hotel (nombre, ciudad, módulos) y los códigos de alta.
-- Lo demás, igual que antes. Las copias automáticas de los lunes (copias_semanales) usan esta misma función.
-- No se guardan las suscripciones de avisos del móvil: son de cada aparato y se vuelven a activar con un toque.
-- Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces. No toca datos.
create or replace function public.hacer_copia(p_hotel uuid, p_motivo text) returns bigint language sql security definer set search_path to '' as $$
  insert into public.copias (hotel_id, motivo, datos) values (p_hotel, p_motivo, jsonb_build_object(
    'config',          (select coalesce(jsonb_object_agg(c.key, c.value), '{}') from public.config c where c.hotel_id=p_hotel),
    'eventos',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.eventos t where t.hotel_id=p_hotel),
    'plantillas',      (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.plantillas t where t.hotel_id=p_hotel),
    'vajilla',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.vajilla t where t.hotel_id=p_hotel),
    'proveedores',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.proveedores t where t.hotel_id=p_hotel),
    'personal',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.personal t where t.hotel_id=p_hotel),
    'recetas',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.recetas t where t.hotel_id=p_hotel),
    'miembros',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.miembros t where t.hotel_id=p_hotel),
    'cambios',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.cambios t where t.hotel_id=p_hotel),
    'fichajes',        (select coalesce(jsonb_agg(to_jsonb(t) order by t.hora), '[]') from public.fichajes t where t.hotel_id=p_hotel),
    'cartas_publicas', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.cartas_publicas t where t.hotel_id=p_hotel),
    'hotel',           (select to_jsonb(t) from public.hoteles t where t.owner=p_hotel),
    'invitaciones',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.invitaciones t where t.hotel_id=p_hotel)))
  returning id $$;
-- Que nadie con cuenta pueda lanzarla desde la app (solo el panel y las copias automáticas)
revoke all on function public.hacer_copia(uuid, text) from public, anon, authenticated;

-- Comprobación: debe salir «true» (la función ya incluye los fichajes)
select position('fichajes' in pg_get_functiondef('public.hacer_copia(uuid,text)'::regprocedure)) > 0 as listo;
