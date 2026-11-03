-- FASE 2: una cuenta por persona y permisos de verdad (en la base de datos, no solo en pantalla).
-- Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces. No borra datos.
-- Con la cuenta del dueño todo sigue igual: mi_hotel() es su propia cuenta y mi_rol() es 'admin'.
--
-- Roles: admin (dueño y quien él nombre), direccion, chef, eventos, sala, cocina (cocineros).
-- Permisos («como ahora»):
--   recetas ............ ver: todos · cambiar: admin, chef
--   eventos ............ ver: todos · cambiar: todos menos cocina
--   plantillas ......... ver: todos menos cocina · cambiar: admin, direccion, eventos
--   vajilla ............ ver: todos menos cocina · cambiar: admin, direccion, sala, eventos
--   proveedores ........ ver y cambiar: admin, direccion, chef
--   personal ........... ver: todos menos cocina · cambiar: admin, direccion
--   precios ............ ver: admin, direccion, chef, eventos · cambiar: admin, direccion, chef   (cocina NO ve precios)
--   inventario, albaranes (compras) ... admin, direccion, chef
--   APPCC .............. admin, direccion, chef, cocina (los cocineros apuntan temperaturas)
--   horarios ........... ver: todos · cambiar: admin, direccion, chef
--   alérgenos (revisión) ver: todos · cambiar: admin, direccion, chef, eventos
--   resto de ajustes ... ver: todos · cambiar: admin, direccion
--   fotos .............. en la carpeta del hotel; suben quienes pueden cambiar recetas o vajilla

-- 1) Hoteles (dueños) y roles nuevos ---------------------------------------------------------------
create table if not exists public.hoteles (
  owner uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  creado timestamptz not null default now()
);
alter table public.hoteles enable row level security;
insert into public.hoteles (owner, nombre) values ('0e01c302-9200-4539-a157-90e68a85aa1b', 'Seda Club Hotel')
  on conflict (owner) do nothing;

alter table public.miembros drop constraint if exists miembros_rol_check;
alter table public.miembros add constraint miembros_rol_check
  check (rol in ('admin', 'direccion', 'chef', 'eventos', 'sala', 'cocina'));

-- 2) ¿De qué hotel soy y con qué rol? ----------------------------------------------------------------
create or replace function public.mi_hotel() returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce((select m.hotel_id from public.miembros m where m.user_id = auth.uid() limit 1), auth.uid())
$$;
create or replace function public.mi_rol() returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.rol from public.miembros m where m.user_id = auth.uid() limit 1),
    (select 'admin' from public.hoteles h where h.owner = auth.uid()))
$$;
create or replace function public.rol_en(roles text[]) returns boolean language sql stable set search_path = '' as $$
  select coalesce(public.mi_rol() = any(roles), false)
$$;
-- Lo que la app necesita saber al entrar
create or replace function public.mi_perfil() returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('hotel', public.mi_hotel(), 'rol', public.mi_rol(),
    'nombre', (select m.nombre from public.miembros m where m.user_id = auth.uid()),
    'hotel_nombre', (select h.nombre from public.hoteles h where h.owner = public.mi_hotel()))
$$;
grant execute on function public.mi_hotel(), public.mi_rol(), public.rol_en(text[]), public.mi_perfil() to authenticated;

-- 3) Reglas de cada tabla ---------------------------------------------------------------------------
-- (ver = mismo hotel y rol permitido; cambiar = además rol que puede cambiar)
do $$
declare t text; ver text[]; cambiar text[];
begin
  for t, ver, cambiar in values
    ('recetas',     array['admin','direccion','chef','eventos','sala','cocina'], array['admin','chef']),
    ('eventos',     array['admin','direccion','chef','eventos','sala','cocina'], array['admin','direccion','chef','eventos','sala']),
    ('plantillas',  array['admin','direccion','chef','eventos','sala'],          array['admin','direccion','eventos']),
    ('vajilla',     array['admin','direccion','chef','eventos','sala'],          array['admin','direccion','sala','eventos']),
    ('proveedores', array['admin','direccion','chef'],                           array['admin','direccion','chef']),
    ('personal',    array['admin','direccion','chef','eventos','sala'],          array['admin','direccion'])
  loop
    execute format('drop policy if exists hotel_isolation on public.%I', t);
    execute format('drop policy if exists ver on public.%I', t);
    execute format('drop policy if exists cambiar on public.%I', t);
    execute format('create policy ver on public.%I for select to authenticated using (hotel_id = public.mi_hotel() and public.rol_en(%L))', t, ver);
    execute format('create policy cambiar on public.%I for all to authenticated using (hotel_id = public.mi_hotel() and public.rol_en(%L)) with check (hotel_id = public.mi_hotel() and public.rol_en(%L))', t, cambiar, cambiar);
    execute format('alter table public.%I alter column hotel_id set default public.mi_hotel()', t);
  end loop;
end $$;

-- config: permisos por clave
create or replace function public.puede_config(clave text, escribir boolean) returns boolean language sql stable set search_path = '' as $$
  select case
    when clave = 'seda_precios'    then public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos'] end)
    when clave in ('seda_inventario','seda_compras') then public.rol_en(array['admin','direccion','chef'])
    when clave = 'seda_appcc'      then public.rol_en(array['admin','direccion','chef','cocina'])
    when clave = 'seda_horarios'   then public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave = 'seda_alg_rev'    then public.rol_en(case when escribir then array['admin','direccion','chef','eventos'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave in ('seda_pin','seda_rec') then public.rol_en(array['admin'])
    else public.rol_en(case when escribir then array['admin','direccion'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
  end
$$;
drop policy if exists hotel_isolation on public.config;
drop policy if exists cocina_lee_horarios on public.config;
drop policy if exists ver on public.config;
drop policy if exists cambiar on public.config;
create policy ver on public.config for select to authenticated using (hotel_id = public.mi_hotel() and public.puede_config(key, false));
create policy cambiar on public.config for all to authenticated
  using (hotel_id = public.mi_hotel() and public.puede_config(key, true))
  with check (hotel_id = public.mi_hotel() and public.puede_config(key, true));
alter table public.config alter column hotel_id set default public.mi_hotel();

-- cambios de turno: el dueño y quien lleva horarios los gestionan (los de cocina siguen como estaban)
drop policy if exists cambios_dueno on public.cambios;
create policy cambios_dueno on public.cambios for all to authenticated
  using (hotel_id = public.mi_hotel() and public.rol_en(array['admin','direccion','chef']))
  with check (hotel_id = public.mi_hotel() and public.rol_en(array['admin','direccion','chef']));

-- miembros: cada uno ve su fila; admin y dirección ven y quitan a los de su hotel
drop policy if exists miembros_equipo on public.miembros;
create policy miembros_equipo on public.miembros for select to authenticated
  using (hotel_id = public.mi_hotel() and public.rol_en(array['admin','direccion']));
drop policy if exists miembros_quitar on public.miembros;
create policy miembros_quitar on public.miembros for delete to authenticated
  using (hotel_id = public.mi_hotel() and public.rol_en(array['admin']) and user_id <> auth.uid());
drop policy if exists miembros_cambiar on public.miembros;
create policy miembros_cambiar on public.miembros for update to authenticated
  using (hotel_id = public.mi_hotel() and public.rol_en(array['admin']))
  with check (hotel_id = public.mi_hotel() and public.rol_en(array['admin']));

-- 4) Invitaciones -----------------------------------------------------------------------------------
create table if not exists public.invitaciones (
  codigo text primary key,
  hotel_id uuid not null default public.mi_hotel(),
  rol text not null check (rol in ('admin', 'direccion', 'chef', 'eventos', 'sala', 'cocina')),
  nombre text,
  creado timestamptz not null default now(),
  caduca timestamptz not null default now() + interval '7 days',
  usado_por uuid,
  usado_en timestamptz
);
alter table public.invitaciones enable row level security;
drop policy if exists invitaciones_admin on public.invitaciones;
create policy invitaciones_admin on public.invitaciones for all to authenticated
  using (hotel_id = public.mi_hotel() and public.rol_en(array['admin','direccion']))
  with check (hotel_id = public.mi_hotel() and public.rol_en(array['admin','direccion'])
              and (rol <> 'admin' or public.rol_en(array['admin'])));

-- Entrar en un hotel con un código (la persona ya tiene su cuenta)
create or replace function public.unirse(p_codigo text, p_nombre text) returns json language plpgsql security definer set search_path = '' as $$
declare inv public.invitaciones;
begin
  if auth.uid() is null then raise exception 'Hay que iniciar sesión'; end if;
  if exists (select 1 from public.hoteles h where h.owner = auth.uid()) then raise exception 'Esta cuenta ya es la de un hotel'; end if;
  if exists (select 1 from public.miembros m where m.user_id = auth.uid()) then raise exception 'Esta cuenta ya está en un equipo'; end if;
  select * into inv from public.invitaciones i where i.codigo = upper(trim(p_codigo)) for update;
  if not found or inv.usado_por is not null or inv.caduca < now() then raise exception 'Código no válido o caducado'; end if;
  insert into public.miembros (user_id, hotel_id, rol, nombre)
    values (auth.uid(), inv.hotel_id, inv.rol, coalesce(nullif(trim(inv.nombre), ''), nullif(trim(p_nombre), '')));
  update public.invitaciones set usado_por = auth.uid(), usado_en = now() where codigo = inv.codigo;
  return public.mi_perfil();
end $$;
revoke all on function public.unirse(text, text) from public, anon;
grant execute on function public.unirse(text, text) to authenticated;

-- Lista del equipo con su correo (solo admin y dirección)
create or replace function public.mi_equipo() returns table (user_id uuid, email text, rol text, nombre text, creado timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text, m.rol, m.nombre, m.creado
  from public.miembros m join auth.users u on u.id = m.user_id
  where m.hotel_id = public.mi_hotel() and public.rol_en(array['admin','direccion'])
  order by m.creado
$$;
grant execute on function public.mi_equipo() to authenticated;

-- 5) Fotos: carpeta del hotel (no de la persona) ------------------------------------------------------
drop policy if exists "fotos: subir en su carpeta" on storage.objects;
drop policy if exists "fotos: cambiar en su carpeta" on storage.objects;
drop policy if exists "fotos: borrar en su carpeta" on storage.objects;
create policy "fotos: subir en su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.mi_hotel()::text
              and public.rol_en(array['admin','direccion','chef','sala','eventos']));
create policy "fotos: cambiar en su carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.mi_hotel()::text and public.rol_en(array['admin','direccion','chef','sala','eventos']))
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.mi_hotel()::text);
create policy "fotos: borrar en su carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.mi_hotel()::text and public.rol_en(array['admin','direccion','chef','sala','eventos']));

-- Comprobación: debe salir el perfil del dueño cuando se ejecuta desde la app; aquí, la lista de reglas
select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('recetas','config','invitaciones') order by 1, 2;
