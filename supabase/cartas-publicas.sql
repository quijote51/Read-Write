-- Cartas públicas de alérgenos (QR para el comensal). Pegar en el SQL Editor y Run. Se puede ejecutar varias veces.
-- - El equipo (admin, dirección, chef, eventos; módulo «seguridad») crea y actualiza sus cartas.
-- - Cualquiera con el enlace o el QR ve UNA carta publicada, sin cuenta, con carta_publica(id): nombre de cada plato y
--   sus alérgenos. No hay acceso público a la tabla (no se pueden listar las cartas de nadie).
create table if not exists public.cartas_publicas (
  id text primary key,                         -- código al azar del enlace
  hotel_id uuid not null default public.mi_hotel(),
  titulo text not null,
  contenido jsonb not null default '{}'::jsonb, -- {hotel, ciudad, platos:[{cat, nombre, alg:[id]}], nota}
  publicada boolean not null default true,
  actualizado timestamptz not null default now()
);
alter table public.cartas_publicas enable row level security;
drop policy if exists cartas_equipo on public.cartas_publicas;
create policy cartas_equipo on public.cartas_publicas for all to authenticated
  using (hotel_id = public.mi_hotel() and public.modulo_activo('seguridad') and public.rol_en(array['admin','direccion','chef','eventos']))
  with check (hotel_id = public.mi_hotel() and public.modulo_activo('seguridad') and public.rol_en(array['admin','direccion','chef','eventos']));

create or replace function public.carta_publica(p_id text) returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('titulo', c.titulo, 'contenido', c.contenido, 'actualizado', c.actualizado)
  from public.cartas_publicas c where c.id = p_id and c.publicada
$$;
revoke all on function public.carta_publica(text) from public;
grant execute on function public.carta_publica(text) to anon, authenticated;

-- Comprobación: debe salir «cartas_publicas»
select to_regclass('public.cartas_publicas') as tabla;
