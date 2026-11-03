-- Foto del albarán con IA: contador de fotos leídas por hotel y día (límite de gasto).
-- Pegar en el SQL Editor y Run. Se puede ejecutar varias veces. Solo lo usa la función «leer-albaran» con su clave
-- de servicio: la app no puede leer ni cambiar esta tabla.
create table if not exists public.uso_ia (
  hotel_id uuid not null,
  dia date not null default current_date,
  tipo text not null,
  n integer not null default 0,
  primary key (hotel_id, dia, tipo)
);
alter table public.uso_ia enable row level security;

create or replace function public.uso_ia_sumar(p_hotel uuid, p_tipo text) returns integer language sql security definer set search_path = '' as $$
  insert into public.uso_ia as u (hotel_id, dia, tipo, n) values (p_hotel, current_date, p_tipo, 1)
  on conflict (hotel_id, dia, tipo) do update set n = u.n + 1
  returning n
$$;
revoke all on function public.uso_ia_sumar(uuid, text) from public, anon, authenticated;
grant execute on function public.uso_ia_sumar(uuid, text) to service_role;

-- Comprobación: debe salir «uso_ia»
select to_regclass('public.uso_ia') as tabla;
