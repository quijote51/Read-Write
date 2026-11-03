-- Protección del inventario: la base de datos no deja sustituir un inventario con artículos por uno vacío.
-- (Un móvil que no ha podido cargarlo podría subir uno vacío y borrar el bueno.) Se queda el que había, sin error.
-- Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create or replace function public.proteger_inventario() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.key = 'seda_inventario'
     and jsonb_array_length(coalesce(new.value->'articulos', '[]'::jsonb)) = 0
     and jsonb_array_length(coalesce(old.value->'articulos', '[]'::jsonb)) > 0 then
    return old; -- se ignora el cambio: el inventario bueno sigue en su sitio
  end if;
  return new;
end $$;

drop trigger if exists config_proteger_inventario on public.config;
create trigger config_proteger_inventario before update on public.config
  for each row execute function public.proteger_inventario();

-- Comprobación: debe salir una fila con config_proteger_inventario
select tgname from pg_trigger where tgrelid = 'public.config'::regclass and tgname = 'config_proteger_inventario';
