-- Fichaje de jornada (registro horario, art. 34.9 del Estatuto de los Trabajadores). Pegar en el SQL Editor y Run.
-- Se puede ejecutar varias veces.
-- - Cada fichaje es una fila que NO se cambia ni se borra (se conservan 4 años). Un error se corrige con una
--   fila de anulación (tipo 'anula', con motivo) y, si hace falta, un fichaje manual nuevo con su motivo.
-- - La hora la pone la base de datos (no el móvil). Sin conexión, el móvil guarda su hora y se marca «sin_conexion»
--   (hasta 3 días). Los manuales solo los hacen admin, dirección y chef, siempre con motivo.
-- - Cada persona ficha con su cuenta (miembros.nombre) y ve lo suyo. La cuenta compartida de cocina (sin nombre)
--   puede fichar eligiendo el nombre (queda marcado «compartida») y ve los fichajes del hotel.
--   Admin, dirección y chef ven todos los del hotel.
create table if not exists public.fichajes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null default public.mi_hotel(),
  user_id uuid not null default auth.uid(),
  persona text not null check (length(trim(persona)) > 0),
  tipo text not null check (tipo in ('entrada', 'salida', 'pausa', 'vuelta', 'anula')),
  hora timestamptz not null default now(),
  registrado timestamptz not null default now(),
  origen text not null default 'movil' check (origen in ('movil', 'compartida', 'manual', 'sin_conexion')),
  nota text,
  corrige uuid references public.fichajes(id)
);
create index if not exists fichajes_hotel_hora on public.fichajes(hotel_id, hora);
alter table public.fichajes enable row level security;

create or replace function public.mi_nombre() returns text language sql stable security definer set search_path = '' as $$
  select m.nombre from public.miembros m where m.user_id = auth.uid()
$$;
grant execute on function public.mi_nombre() to authenticated;

-- Antes de guardar: la hora y el registro los pone el servidor; se comprueba quién ficha por quién
create or replace function public.fichaje_antes() returns trigger language plpgsql security definer set search_path = '' as $$
declare jefe boolean := public.mi_rol() in ('admin', 'direccion', 'chef'); yo text := public.mi_nombre();
begin
  new.registrado := now(); new.user_id := auth.uid(); new.hotel_id := public.mi_hotel();
  if new.tipo = 'anula' then
    if new.corrige is null or coalesce(trim(new.nota), '') = '' then raise exception 'Para anular hace falta el fichaje y el motivo'; end if;
    if not exists (select 1 from public.fichajes f where f.id = new.corrige and f.hotel_id = new.hotel_id and f.tipo <> 'anula') then raise exception 'Fichaje no encontrado'; end if;
    if not jefe and new.persona is distinct from yo then raise exception 'Solo puedes anular tus fichajes'; end if;
    new.hora := now();
  elsif new.origen = 'manual' then
    if not jefe then raise exception 'Solo admin, dirección o chef añaden fichajes a mano'; end if;
    if coalesce(trim(new.nota), '') = '' then raise exception 'Un fichaje a mano necesita el motivo'; end if;
    if new.hora > now() + interval '5 minutes' then raise exception 'No se puede fichar en el futuro'; end if;
  elsif new.origen = 'sin_conexion' then
    if new.hora > now() + interval '5 minutes' or new.hora < now() - interval '3 days' then raise exception 'Hora sin conexión fuera de plazo (máx. 3 días)'; end if;
  else
    new.hora := now();
  end if;
  -- Quién: uno mismo; la cuenta compartida (sin nombre) elige; los jefes, a cualquiera
  if new.tipo <> 'anula' and not jefe then
    if yo is not null and new.persona <> yo then raise exception 'Solo puedes fichar con tu nombre'; end if;
    if yo is null and new.origen <> 'sin_conexion' then new.origen := 'compartida'; end if;
    if yo is not null and new.origen = 'compartida' then new.origen := 'movil'; end if;
  end if;
  return new;
end $$;
drop trigger if exists fichaje_antes on public.fichajes;
create trigger fichaje_antes before insert on public.fichajes for each row execute function public.fichaje_antes();

drop policy if exists fichajes_ver on public.fichajes;
create policy fichajes_ver on public.fichajes for select to authenticated using (
  hotel_id = public.mi_hotel() and public.modulo_activo('equipo')
  and (public.mi_rol() in ('admin', 'direccion', 'chef') or persona = public.mi_nombre() or public.mi_nombre() is null));
drop policy if exists fichajes_fichar on public.fichajes;
create policy fichajes_fichar on public.fichajes for insert to authenticated with check (
  hotel_id = public.mi_hotel() and public.modulo_activo('equipo'));
-- Sin reglas de update ni delete: nadie cambia ni borra un fichaje
revoke update, delete, truncate on public.fichajes from anon, authenticated;

-- Comprobación: debe salir «fichajes»
select to_regclass('public.fichajes') as tabla;
