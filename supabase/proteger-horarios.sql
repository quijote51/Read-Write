-- Protección del equipo de Horarios: la base de datos no deja sustituir un equipo con gente por uno vacío.
-- (El 16/11/2026 un móvil recién instalado, sin datos, borró el equipo y las vacaciones de la nube. Ya está arreglado en la app;
--  esto es una segunda defensa.) Se ignora el cambio entero, sin error, y queda lo que había.
-- Solo mira el equipo: borrar vacaciones o semanas sigue funcionando. Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create or replace function public.proteger_horarios() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.key = 'seda_horarios'
     and jsonb_array_length(coalesce(new.value->'equipo', '[]'::jsonb)) = 0
     and jsonb_array_length(coalesce(old.value->'equipo', '[]'::jsonb)) > 0 then
    return old; -- se ignora el cambio: el equipo bueno sigue en su sitio
  end if;
  return new;
end $$;

drop trigger if exists config_proteger_horarios on public.config;
create trigger config_proteger_horarios before update on public.config
  for each row execute function public.proteger_horarios();

-- Comprobación: debe salir una fila con config_proteger_horarios
select tgname from pg_trigger where tgrelid = 'public.config'::regclass and tgname = 'config_proteger_horarios';
