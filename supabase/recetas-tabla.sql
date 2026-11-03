-- Recetas: una fila por receta (antes iban todas juntas en config.seda_rec).
-- Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces sin problema.
-- La tabla recetas está vacía cuando se aplica: no se pierde ningún dato.

-- 1) Clave por hotel + receta (dos hoteles pueden tener una receta con el mismo id, p. ej. las de ejemplo).
alter table public.recetas drop constraint if exists recetas_pkey;
alter table public.recetas alter column hotel_id set not null;
alter table public.recetas add primary key (hotel_id, id);

-- 2) Elaboraciones base, borrado sin perder datos, campos futuros y fecha del último cambio.
alter table public.recetas
  add column if not exists base boolean not null default false,
  add column if not exists rinde jsonb,
  add column if not exists extra jsonb not null default '{}'::jsonb,
  add column if not exists borrado boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- 3) La fecha del cambio la pone la base de datos (no el reloj del móvil).
create or replace function public.poner_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists recetas_updated_at on public.recetas;
create trigger recetas_updated_at before insert or update on public.recetas
  for each row execute function public.poner_updated_at();

-- 4) Copias de seguridad: tabla sin reglas de acceso (solo se ve desde el panel) y función para hacer una copia.
create table if not exists public.copias (
  id bigserial primary key,
  creado timestamptz not null default now(),
  hotel_id uuid not null,
  motivo text,
  datos jsonb not null
);
alter table public.copias enable row level security;

create or replace function public.hacer_copia(p_hotel uuid, p_motivo text) returns bigint language sql security definer set search_path = '' as $$
  insert into public.copias (hotel_id, motivo, datos) values (p_hotel, p_motivo, jsonb_build_object(
    'config',      (select coalesce(jsonb_object_agg(c.key, c.value), '{}') from public.config c where c.hotel_id=p_hotel),
    'eventos',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.eventos t where t.hotel_id=p_hotel),
    'plantillas',  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.plantillas t where t.hotel_id=p_hotel),
    'vajilla',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.vajilla t where t.hotel_id=p_hotel),
    'proveedores', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.proveedores t where t.hotel_id=p_hotel),
    'personal',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.personal t where t.hotel_id=p_hotel),
    'recetas',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.recetas t where t.hotel_id=p_hotel),
    'miembros',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.miembros t where t.hotel_id=p_hotel),
    'cambios',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.cambios t where t.hotel_id=p_hotel)))
  returning id $$;
revoke all on function public.hacer_copia(uuid, text) from public, anon, authenticated;

-- Comprobación: debe salir la lista de columnas con base, rinde, extra, borrado y updated_at.
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='recetas' order by ordinal_position;
