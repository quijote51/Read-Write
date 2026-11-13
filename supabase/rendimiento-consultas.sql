-- Rendimiento de las consultas (13/11/2026). Pegar en el SQL Editor de Supabase y pulsar Run.
-- No cambia ningún dato ni ningún permiso: solo añade índices y hace que las reglas de acceso calculen
-- «de qué hotel eres» una vez por consulta en vez de una vez por fila (aviso «Auth RLS Initialization Plan»).
-- Va todo en una transacción: si algo falla, no se cambia nada.
begin;

-- 1) Índices por hotel. Todas las consultas filtran por hotel_id (la regla de acceso lo exige) y estas tablas
--    solo tenían índice por id: con muchos clientes, Postgres tendría que recorrer la tabla entera.
create index if not exists eventos_hotel_fecha   on public.eventos (hotel_id, fecha);
create index if not exists plantillas_hotel      on public.plantillas (hotel_id);
create index if not exists proveedores_hotel     on public.proveedores (hotel_id);
create index if not exists personal_hotel        on public.personal (hotel_id);
create index if not exists vajilla_hotel         on public.vajilla (hotel_id);
create index if not exists cambios_hotel_estado  on public.cambios (hotel_id, estado);
create index if not exists cartas_hotel          on public.cartas_publicas (hotel_id);
create index if not exists invitaciones_hotel    on public.invitaciones (hotel_id);
create index if not exists miembros_hotel        on public.miembros (hotel_id);
create index if not exists copias_hotel_creado   on public.copias (hotel_id, creado desc);

-- 2) Claves ajenas sin índice (aviso «Unindexed foreign keys»)
create index if not exists fichajes_corrige           on public.fichajes (corrige);
create index if not exists hz_peticiones_empleado     on public.hz_peticiones (empleado_id);
create index if not exists hz_peticiones_con_empleado on public.hz_peticiones (con_empleado_id);
create index if not exists hz_vacaciones_empleado     on public.hz_vacaciones (empleado_id);

-- 3) Reglas de acceso: envolver auth.uid(), mi_hotel(), mi_rol(), mi_nombre() y soy_plataforma() en (select …)
--    para que se calculen una sola vez por consulta. Mismo significado; se reescribe cada regla tal cual está.
do $$
declare p record; q text; c text; s text;
begin
  for p in select * from pg_policies where schemaname = 'public' loop
    q := p.qual; c := p.with_check;
    -- (?<!select ) evita envolver dos veces si ya estaba envuelto
    q := regexp_replace(q, '(?<!select )\m(auth\.uid|mi_hotel|mi_rol|mi_nombre|soy_plataforma)\(\)', '(select \1())', 'gi');
    c := regexp_replace(c, '(?<!select )\m(auth\.uid|mi_hotel|mi_rol|mi_nombre|soy_plataforma)\(\)', '(select \1())', 'gi');
    if q is distinct from p.qual or c is distinct from p.with_check then
      s := format('alter policy %I on public.%I', p.policyname, p.tablename);
      if q is not null then s := s || format(' using (%s)', q); end if;
      if c is not null then s := s || format(' with check (%s)', c); end if;
      execute s;
    end if;
  end loop;
end $$;

commit;

-- Comprobación: tiene que salir «0» en la primera columna (ninguna regla sin envolver) y los índices nuevos.
select (select count(*) from pg_policies where schemaname = 'public'
          and (coalesce(qual,'') ~* '(?<!select )\m(auth\.uid|mi_hotel)\(\)' or coalesce(with_check,'') ~* '(?<!select )\m(auth\.uid|mi_hotel)\(\)')) as reglas_sin_envolver,
       (select count(*) from pg_indexes where schemaname = 'public' and indexname in
          ('eventos_hotel_fecha','plantillas_hotel','proveedores_hotel','personal_hotel','vajilla_hotel','cambios_hotel_estado',
           'cartas_hotel','invitaciones_hotel','miembros_hotel','copias_hotel_creado','fichajes_corrige','hz_peticiones_empleado',
           'hz_peticiones_con_empleado','hz_vacaciones_empleado')) as indices_nuevos_de_14;
