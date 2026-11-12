-- Copias de seguridad automáticas: cada lunes a las 3:00 (hora UTC) se hace una copia de cada cliente con hacer_copia().
-- Se guardan las 12 últimas automáticas de cada cliente (unos 3 meses); las hechas a mano no se borran nunca.
-- Aplicado el 12/11/2026. Para volver a aplicarlo: pegar en el SQL Editor y Run.
create or replace function public.copias_semanales() returns integer language plpgsql security definer set search_path = '' as $$
declare h record; n integer := 0;
begin
  for h in select owner from public.hoteles loop
    perform public.hacer_copia(h.owner, 'Copia automática semanal');
    n := n + 1;
  end loop;
  delete from public.copias c
   where c.motivo = 'Copia automática semanal'
     and c.id not in (select c2.id from public.copias c2
                       where c2.hotel_id = c.hotel_id and c2.motivo = 'Copia automática semanal'
                       order by c2.creado desc limit 12);
  return n;
end $$;
-- Solo la usa el programador de tareas: nadie puede llamarla desde la app
revoke execute on function public.copias_semanales() from public, anon, authenticated;

select cron.unschedule('copias-semanales') where exists (select 1 from cron.job where jobname = 'copias-semanales');
select cron.schedule('copias-semanales', '0 3 * * 1', 'select public.copias_semanales()');

-- Comprobación: debe salir una fila con «0 3 * * 1»
select jobname, schedule, command from cron.job where jobname = 'copias-semanales';
