-- Móviles del equipo solo para jefes (paso 3 de 3): pasa los móviles de config.seda_horarios a config.seda_horarios_tel.
-- Pegar entero en Supabase → SQL Editor → Run DESPUÉS de pegar moviles-jefes-permisos.sql y de fusionar la PR.
-- Hace antes una copia de seguridad de cada hotel afectado («antes de mover móviles»). Se puede ejecutar varias veces:
-- si ya no queda ningún móvil dentro de seda_horarios, no hace nada.
-- Si un jefe ya abrió la app nueva, seda_horarios_tel puede existir: se juntan, y si una persona está en los dos, se queda el de seda_horarios_tel.
begin;

-- 1) Copia de seguridad de cada hotel que tenga algún móvil dentro de los horarios
select c.hotel_id, public.hacer_copia(c.hotel_id, 'antes de mover móviles') as copia
from public.config c
where c.key = 'seda_horarios'
  and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.value->'equipo') = 'array' then c.value->'equipo' else '[]'::jsonb end) e
              where jsonb_typeof(e) = 'object' and e ? 'tel');

-- 2) Copiar los móviles (los que no están vacíos) a seda_horarios_tel = {nombre: móvil}
insert into public.config (hotel_id, key, value, updated_at)
select c.hotel_id, 'seda_horarios_tel', m.mapa, now()
from public.config c
cross join lateral (
  select jsonb_object_agg(e->>'n', e->>'tel') as mapa
  from jsonb_array_elements(case when jsonb_typeof(c.value->'equipo') = 'array' then c.value->'equipo' else '[]'::jsonb end) e
  where jsonb_typeof(e) = 'object' and coalesce(e->>'n', '') <> '' and coalesce(btrim(e->>'tel'), '') <> ''
) m
where c.key = 'seda_horarios' and m.mapa is not null
on conflict (hotel_id, key) do update
  set value = excluded.value || coalesce(case when jsonb_typeof(public.config.value) = 'object' then public.config.value end, '{}'::jsonb),
      updated_at = now();

-- 3) Quitar el campo «tel» de cada persona de seda_horarios (el resto del equipo queda igual y en el mismo orden)
update public.config c
set value = jsonb_set(c.value, '{equipo}', (
      select jsonb_agg(case when jsonb_typeof(e) = 'object' then e - 'tel' else e end order by o)
      from jsonb_array_elements(c.value->'equipo') with ordinality x(e, o))),
    updated_at = now()
where c.key = 'seda_horarios'
  and jsonb_typeof(c.value->'equipo') = 'array'
  and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(c.value->'equipo') = 'array' then c.value->'equipo' else '[]'::jsonb end) e
              where jsonb_typeof(e) = 'object' and e ? 'tel');

commit;

-- Comprobación: la primera debe salir 0 (ningún móvil dentro de los horarios); la segunda, cuántos móviles hay en la clave nueva
select count(*) as moviles_en_horarios from public.config c, jsonb_array_elements(case when jsonb_typeof(c.value->'equipo') = 'array' then c.value->'equipo' else '[]'::jsonb end) e
  where c.key = 'seda_horarios' and jsonb_typeof(e) = 'object' and e ? 'tel';
select hotel_id, (select count(*) from jsonb_object_keys(value)) as moviles from public.config where key = 'seda_horarios_tel';
