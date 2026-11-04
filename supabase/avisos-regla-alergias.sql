-- Avisos: «Sin gluten» o «Sin lactosa, 2 pax» SÍ son alergias. Pegar en el SQL Editor y Run. Se puede ejecutar varias veces.
-- Solo cambia la regla que decide si la nota del evento dice «sin alergias» (misma regla que algSinAlergias de alergenos.js).
-- No toca datos ni permisos.
do $do$
declare def text := pg_get_functiondef('public.avisos_calcular(timestamptz)'::regprocedure);
  viejo text := $v$'^\s*(sin|ninguna|no hay)'$v$;
  nuevo text := $n$'^\s*(sin|ning[uú]n[ao]?|nada|no(\s+hay|\s+tienen?)?)(\s+(alergias?|al[eé]rgenos?|intolerancias?|nada))?(\s+(ni\s+intolerancias?|conocidas?|registradas?|declaradas?|indicadas?))*\s*[.!]*\s*$'$n$;
begin
  if position(viejo in def) > 0 then execute replace(def, viejo, nuevo); end if;
end $do$;
-- Comprobación: debe salir «true»
select position('ning[uú]n' in pg_get_functiondef('public.avisos_calcular(timestamptz)'::regprocedure)) > 0 as listo;
