-- Avisos en el móvil (notificaciones). Pegar en el SQL Editor y Run. Se puede ejecutar varias veces.
-- - Cada móvil que activa los avisos se apunta en avisos_push (con su hotel, rol y nombre).
-- - Cada hora, Supabase llama a la función «avisos-push» (pg_cron + pg_net). Esa función pide a avisos_calcular()
--   los avisos que tocan (hora de Madrid) y manda a cada móvil una notificación vacía; el móvil pide el texto con
--   aviso_push(endpoint). Cada aviso sale una sola vez al día.
--   · 11:00  temperaturas de la mañana sin apuntar (módulo seguridad; admin, chef, cocina)
--   · 19:00  temperaturas de la tarde sin apuntar
--   · 10:00  eventos de mañana con alergias (todos)
--   ·  9:00 y 16:00  cambios de turno: «te piden un cambio» (la persona) y «esperan tu aprobación» (admin, chef,
--     dirección) (módulo equipo)
-- Todo gratis: Web Push lo dan los navegadores; pg_cron y pg_net vienen en el plan gratuito.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.avisos_push (
  endpoint text primary key,
  hotel_id uuid not null,
  user_id uuid not null,
  rol text,
  nombre text,
  sub jsonb not null,
  tipos text[] not null default array['temp','alergias','cambios'],
  enviados jsonb not null default '{}'::jsonb,   -- {"d": "2026-11-03", "k": ["temp_m", ...]}
  mensaje jsonb,                                  -- último aviso: {titulo, cuerpo, url}
  creado timestamptz not null default now()
);
alter table public.avisos_push enable row level security;  -- sin reglas: solo con las funciones de abajo

-- Clave VAPID (firma de los avisos). La crea la función avisos-push la primera vez; la privada no sale de aquí.
create table if not exists public.avisos_clave (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada jsonb not null
);
alter table public.avisos_clave enable row level security;  -- sin reglas: solo service_role
create or replace function public.avisos_clave_publica() returns text
language sql stable security definer set search_path = '' as $$ select publica from public.avisos_clave where id = 1 $$;

-- El móvil se apunta (o cambia qué avisos quiere)
create or replace function public.avisos_suscribir(p_sub jsonb, p_tipos text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.mi_hotel() is null then raise exception 'Hace falta entrar con tu cuenta'; end if;
  if coalesce(p_sub->>'endpoint', '') !~ '^https://' then raise exception 'Suscripción no válida'; end if;
  insert into public.avisos_push(endpoint, hotel_id, user_id, rol, nombre, sub, tipos)
  values (p_sub->>'endpoint', public.mi_hotel(), auth.uid(), public.mi_rol(),
          (select m.nombre from public.miembros m where m.user_id = auth.uid()), p_sub, coalesce(p_tipos, array[]::text[]))
  on conflict (endpoint) do update set hotel_id = excluded.hotel_id, user_id = excluded.user_id, rol = excluded.rol,
    nombre = excluded.nombre, sub = excluded.sub, tipos = excluded.tipos;
end $$;

create or replace function public.avisos_baja(p_endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.avisos_push where endpoint = p_endpoint and user_id = auth.uid()
$$;

-- El móvil (service worker, sin sesión) pide el texto de su último aviso con su endpoint (largo y secreto)
create or replace function public.aviso_push(p_endpoint text) returns json
language sql stable security definer set search_path = '' as $$
  select a.mensaje::json from public.avisos_push a where a.endpoint = p_endpoint
$$;

-- Avisos que tocan ahora. Solo la función «avisos-push» (service_role). Marca lo enviado y guarda el mensaje.
create or replace function public.avisos_calcular(p_ahora timestamptz default now())
returns table(endpoint text, sub jsonb, titulo text, cuerpo text)
language plpgsql security definer set search_path = '' as $$
declare
  loc timestamp := p_ahora at time zone 'Europe/Madrid';
  h int := extract(hour from loc);
  d date := loc::date;
  s record; ap jsonb; txt text; mods text[]; ya text[]; nuevos text[]; lineas text[]; t text; n int;
begin
  for s in select * from public.avisos_push order by hotel_id loop
    nuevos := array[]::text[]; lineas := array[]::text[];
    ya := case when s.enviados->>'d' = d::text then array(select jsonb_array_elements_text(s.enviados->'k')) else array[]::text[] end;
    select h2.modulos into mods from public.hoteles h2 where h2.owner = s.hotel_id;
    mods := coalesce(mods, array[]::text[]);

    -- Temperaturas sin apuntar (mañana: antes de las 15:00; tarde: desde las 15:00)
    if 'temp' = any(s.tipos) and 'seguridad' = any(mods) and s.rol in ('admin', 'chef', 'cocina') then
      select c.value into ap from public.config c where c.hotel_id = s.hotel_id and c.key = 'seda_appcc';
      foreach t in array array['temp_m', 'temp_t'] loop
        continue when t = any(ya) or (t = 'temp_m' and h < 11) or (t = 'temp_t' and h < 19) or ap is null;
        select string_agg(e->>'n', ', '), count(*) into txt, n
        from jsonb_array_elements(coalesce(ap->'equipos', '[]')) e
        where not exists (
          select 1 from jsonb_array_elements(coalesce(ap->'reg', '[]')) r
          where r->>'t' = 'temp' and r->>'eq' = e->>'id' and r->'anulado' is null
            and ((r->>'f')::timestamptz at time zone 'Europe/Madrid')::date = d
            and (extract(hour from (r->>'f')::timestamptz at time zone 'Europe/Madrid') < 15) = (t = 'temp_m'));
        if n > 0 then
          nuevos := nuevos || t;
          lineas := lineas || format('Temperaturas de la %s sin apuntar: %s.', case when t = 'temp_m' then 'mañana' else 'tarde' end, txt);
        end if;
      end loop;
    end if;

    -- Eventos de mañana con alergias
    if 'alergias' = any(s.tipos) and h >= 10 and not ('alg' = any(ya)) then
      select string_agg(format('%s (%s)', e.nombre, e.alergias_txt), '; ' order by e.hora), count(*) into txt, n
      from public.eventos e
      where e.hotel_id = s.hotel_id and e.fecha = d + 1 and coalesce(trim(e.alergias_txt), '') <> ''
        and e.alergias_txt !~* '^\s*(sin|ninguna|no hay)';
      if n > 0 then nuevos := nuevos || 'alg'::text; lineas := lineas || ('Mañana hay alergias: ' || txt || '.'); end if;
    end if;

    -- Cambios de turno (a las 9 y a las 16)
    if 'cambios' = any(s.tipos) and 'equipo' = any(mods) and h >= 9 then
      t := 'camb' || case when h >= 16 then '16' else '9' end;
      if not (t = any(ya)) then
        if s.nombre is not null then
          select string_agg(format('%s te pide cambiar el turno del %s', c.de, to_char(to_date(c.semana, 'YYYY-MM-DD') + c.dia, 'DD/MM')), '; '), count(*)
            into txt, n
          from public.cambios c where c.hotel_id = s.hotel_id and c.estado = 'pendiente' and c.a = s.nombre;
          if n > 0 then nuevos := nuevos || t; lineas := lineas || (txt || '.'); end if;
        end if;
        if s.rol in ('admin', 'chef', 'direccion') then
          select count(*) into n from public.cambios c where c.hotel_id = s.hotel_id and c.estado = 'aceptado';
          if n > 0 then
            nuevos := array(select distinct x from unnest(nuevos || t) x);
            lineas := lineas || format('%s cambio%s de turno espera%s tu aprobación.', n, case when n = 1 then '' else 's' end, case when n = 1 then '' else 'n' end);
          end if;
        end if;
      end if;
    end if;

    if cardinality(nuevos) > 0 then
      update public.avisos_push a set
        enviados = jsonb_build_object('d', d::text, 'k', to_jsonb(ya || nuevos)),
        mensaje = jsonb_build_object('titulo', 'Oído Cocina', 'cuerpo', array_to_string(lineas, E'\n'), 'url', '/index.html#avisos', 'f', p_ahora)
      where a.endpoint = s.endpoint;
      endpoint := s.endpoint; sub := s.sub; titulo := 'Oído Cocina'; cuerpo := array_to_string(lineas, E'\n');
      return next;
    end if;
  end loop;
end $$;

-- Móvil que ya no existe (el navegador responde 404/410): se borra
create or replace function public.avisos_quitar(p_endpoint text) returns void
language sql security definer set search_path = '' as $$ delete from public.avisos_push where endpoint = p_endpoint $$;

revoke all on function public.avisos_clave_publica(), public.avisos_suscribir(jsonb, text[]), public.avisos_baja(text), public.aviso_push(text),
  public.avisos_calcular(timestamptz), public.avisos_quitar(text) from public, anon, authenticated;
grant execute on function public.avisos_clave_publica(), public.avisos_suscribir(jsonb, text[]), public.avisos_baja(text) to authenticated;
grant execute on function public.aviso_push(text) to anon, authenticated;
grant execute on function public.avisos_calcular(timestamptz), public.avisos_quitar(text) to service_role;

-- Cada hora (minuto 5), llamar a la función que manda los avisos
select cron.unschedule(jobid) from cron.job where jobname = 'avisos-cada-hora';
select cron.schedule('avisos-cada-hora', '5 * * * *',
  $$select net.http_post(url := 'https://gxkxslkdqgwovgxcuzkr.supabase.co/functions/v1/avisos-push',
    headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb)$$);

-- Comprobación: debe salir «avisos_push» y «avisos-cada-hora»
select to_regclass('public.avisos_push') as tabla, (select jobname from cron.job where jobname = 'avisos-cada-hora') as tarea;
