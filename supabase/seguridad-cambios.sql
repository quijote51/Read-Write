-- Seguridad de cambios de turno: solo responde la persona afectada.
-- APLICADO el 2/11/2026 (con ALTER POLICY en lugar de DROP/CREATE; el resultado es el mismo).
-- Se guarda como referencia; no hace falta volver a ejecutarlo.
alter table public.miembros add column if not exists nombre text;

alter function public.cambios_solo_estado() set search_path = '';

drop policy if exists cambios_cocina_responder on public.cambios;
create policy cambios_cocina_responder on public.cambios for update to authenticated
using (
  estado = 'pendiente' and exists (
    select 1 from public.miembros m
    where m.user_id = auth.uid() and m.rol = 'cocina' and m.hotel_id = cambios.hotel_id
      and (m.nombre is null or m.nombre = cambios.a or m.nombre = cambios.de))
)
with check (
  estado in ('aceptado','rechazado') and exists (
    select 1 from public.miembros m
    where m.user_id = auth.uid() and m.rol = 'cocina' and m.hotel_id = cambios.hotel_id
      and (m.nombre is null
           or (cambios.estado = 'aceptado' and m.nombre = cambios.a)
           or (cambios.estado = 'rechazado' and (m.nombre = cambios.a or m.nombre = cambios.de))))
);

drop policy if exists cambios_cocina_crear on public.cambios;
create policy cambios_cocina_crear on public.cambios for insert to authenticated
with check (
  estado = 'pendiente' and exists (
    select 1 from public.miembros m
    where m.user_id = auth.uid() and m.rol = 'cocina' and m.hotel_id = cambios.hotel_id
      and (m.nombre is null or m.nombre = cambios.de))
);
