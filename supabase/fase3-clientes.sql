-- FASE 3: varios clientes (hoteles y restaurantes) con módulos de pago. Pegar en el SQL Editor y Run.
-- Se puede ejecutar varias veces. No borra datos. Necesita la fase 2 (fase2-cuentas.sql).
-- Módulos: base (eventos, producción, recetario…) · costes (escandallo, albaranes, inventario)
--          · seguridad (APPCC y alérgenos) · equipo (horarios). La base de datos no deja usar un módulo no activo.
-- La cuenta «plataforma» (la tuya) crea los códigos de cliente y activa o quita módulos a cada cliente.

alter table public.hoteles
  add column if not exists ciudad text,
  add column if not exists modulos text[] not null default array['base'],
  add column if not exists plataforma boolean not null default false;
update public.hoteles set modulos = array['base','costes','seguridad','equipo'], plataforma = true, ciudad = coalesce(ciudad, 'Granada')
  where owner = '0e01c302-9200-4539-a157-90e68a85aa1b';

create or replace function public.soy_plataforma() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hoteles h where h.owner = auth.uid() and h.plataforma)
$$;
create or replace function public.modulo_activo(m text) returns boolean language sql stable security definer set search_path = '' as $$
  select m = 'base' or coalesce((select m = any(h.modulos) from public.hoteles h where h.owner = public.mi_hotel()), false)
$$;
grant execute on function public.soy_plataforma(), public.modulo_activo(text) to authenticated;

-- Perfil con los datos del hotel y sus módulos
create or replace function public.mi_perfil() returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('hotel', public.mi_hotel(), 'rol', public.mi_rol(),
    'nombre', (select m.nombre from public.miembros m where m.user_id = auth.uid()),
    'hotel_nombre', h.nombre, 'hotel_ciudad', h.ciudad, 'modulos', h.modulos, 'plataforma', coalesce(h.plataforma and h.owner = auth.uid(), false))
  from (select 1) x left join public.hoteles h on h.owner = public.mi_hotel()
$$;

-- Permisos de config: además del rol, el módulo tiene que estar activo
create or replace function public.puede_config(clave text, escribir boolean) returns boolean language sql stable set search_path = '' as $$
  select case
    when clave = 'seda_precios'    then public.modulo_activo('costes') and public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos'] end)
    when clave in ('seda_inventario','seda_compras') then public.modulo_activo('costes') and public.rol_en(array['admin','direccion','chef'])
    when clave = 'seda_appcc'      then public.modulo_activo('seguridad') and public.rol_en(array['admin','direccion','chef','cocina'])
    when clave = 'seda_alg_rev'    then public.modulo_activo('seguridad') and public.rol_en(case when escribir then array['admin','direccion','chef','eventos'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave = 'seda_horarios'   then public.modulo_activo('equipo') and public.rol_en(case when escribir then array['admin','direccion','chef'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
    when clave in ('seda_pin','seda_rec') then public.rol_en(array['admin'])
    else public.rol_en(case when escribir then array['admin','direccion'] else array['admin','direccion','chef','eventos','sala','cocina'] end)
  end
$$;

-- Códigos de cliente (solo la plataforma los ve y los crea)
create table if not exists public.codigos_cliente (
  codigo text primary key,
  nombre text not null,
  ciudad text,
  modulos text[] not null default array['base'],
  creado timestamptz not null default now(),
  caduca timestamptz not null default now() + interval '30 days',
  usado_por uuid,
  usado_en timestamptz
);
alter table public.codigos_cliente enable row level security;
drop policy if exists codigos_plataforma on public.codigos_cliente;
create policy codigos_plataforma on public.codigos_cliente for all to authenticated
  using (public.soy_plataforma()) with check (public.soy_plataforma());

-- Usar un código: de equipo (entra en un hotel) o de cliente (crea su hotel y queda como admin)
create or replace function public.unirse(p_codigo text, p_nombre text) returns json language plpgsql security definer set search_path = '' as $$
declare inv public.invitaciones; cli public.codigos_cliente; c text := upper(trim(p_codigo));
begin
  if auth.uid() is null then raise exception 'Hay que iniciar sesión'; end if;
  if exists (select 1 from public.hoteles h where h.owner = auth.uid()) then raise exception 'Esta cuenta ya es la de un hotel'; end if;
  if exists (select 1 from public.miembros m where m.user_id = auth.uid()) then raise exception 'Esta cuenta ya está en un equipo'; end if;
  select * into inv from public.invitaciones i where i.codigo = c for update;
  if found and inv.usado_por is null and inv.caduca >= now() then
    insert into public.miembros (user_id, hotel_id, rol, nombre)
      values (auth.uid(), inv.hotel_id, inv.rol, coalesce(nullif(trim(inv.nombre), ''), nullif(trim(p_nombre), '')));
    update public.invitaciones set usado_por = auth.uid(), usado_en = now() where codigo = inv.codigo;
    return public.mi_perfil();
  end if;
  select * into cli from public.codigos_cliente k where k.codigo = c for update;
  if found and cli.usado_por is null and cli.caduca >= now() then
    insert into public.hoteles (owner, nombre, ciudad, modulos) values (auth.uid(), cli.nombre, cli.ciudad, cli.modulos);
    insert into public.config (hotel_id, key, value, updated_at)
      values (auth.uid(), 'seda_ajustes', jsonb_build_object('hotel_nombre', cli.nombre, 'hotel_ciudad', coalesce(cli.ciudad, ''), 'lugares', jsonb_build_array()), now())
      on conflict (hotel_id, key) do nothing;
    update public.codigos_cliente set usado_por = auth.uid(), usado_en = now() where codigo = cli.codigo;
    return public.mi_perfil();
  end if;
  raise exception 'Código no válido o caducado';
end $$;
revoke all on function public.unirse(text, text) from public, anon;
grant execute on function public.unirse(text, text) to authenticated;

-- El admin cambia el nombre y la ciudad de su hotel
create or replace function public.guardar_hotel(p_nombre text, p_ciudad text) returns void language sql security definer set search_path = '' as $$
  update public.hoteles set nombre = coalesce(nullif(trim(p_nombre), ''), nombre), ciudad = trim(p_ciudad)
  where owner = public.mi_hotel() and public.rol_en(array['admin'])
$$;
grant execute on function public.guardar_hotel(text, text) to authenticated;

-- La plataforma: lista de clientes y módulos de cada uno
create or replace function public.clientes() returns table (owner uuid, email text, nombre text, ciudad text, modulos text[], personas bigint, creado timestamptz)
language sql stable security definer set search_path = '' as $$
  select h.owner, u.email::text, h.nombre, h.ciudad, h.modulos, (select count(*) from public.miembros m where m.hotel_id = h.owner), h.creado
  from public.hoteles h join auth.users u on u.id = h.owner
  where public.soy_plataforma() order by h.creado
$$;
create or replace function public.cambiar_modulos(p_owner uuid, p_modulos text[]) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.soy_plataforma() then raise exception 'Solo la plataforma'; end if;
  update public.hoteles set modulos = (select array_agg(distinct x) from unnest(array['base'] || p_modulos) x
    where x in ('base','costes','seguridad','equipo')) where owner = p_owner;
end $$;
grant execute on function public.clientes(), public.cambiar_modulos(uuid, text[]) to authenticated;

-- Comprobación: debe salir Seda Club Hotel con los 4 módulos y plataforma = true
select nombre, ciudad, modulos, plataforma from public.hoteles;
