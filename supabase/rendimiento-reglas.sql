-- Reglas de acceso más rápidas (13/11/2026). Pegar en el SQL Editor de Supabase y pulsar Run.
-- La prueba de carga con 51 hoteles midió que cada fila que devuelve una consulta cuesta unos 0,15-0,19 ms porque
-- las reglas llaman a rol_en() y modulo_activo() UNA VEZ POR FILA (ya se arregló para mi_hotel() y auth.uid()).
-- Aquí se envuelven también en (select …): se calculan una vez por consulta. Mismo significado, mismos permisos.
-- Medido el 13/11/2026 con 402 eventos de un hotel (probado dentro de una transacción que se deshizo sola): leer los
-- eventos como usuario del hotel pasó de 64 ms a 0,8 ms, con las mismas 402 filas visibles. Cambian 25 de las 32 reglas.
-- No se tocan las llamadas que dependen de la fila (puede_config(key, …)). Todo en una transacción.
begin;
do $$
declare p record; q text; c text; s text; n int := 0;
begin
  for p in select * from pg_policies where schemaname = 'public' loop
    q := p.qual; c := p.with_check;
    -- (?<!select ) evita envolver dos veces; los argumentos de estas llamadas no llevan paréntesis dentro
    q := regexp_replace(q, '(?<!select )\m(rol_en|modulo_activo)\(([^()]*)\)', '(select \1(\2))', 'gi');
    c := regexp_replace(c, '(?<!select )\m(rol_en|modulo_activo)\(([^()]*)\)', '(select \1(\2))', 'gi');
    if q is distinct from p.qual or c is distinct from p.with_check then
      s := format('alter policy %I on public.%I', p.policyname, p.tablename);
      if q is not null then s := s || format(' using (%s)', q); end if;
      if c is not null then s := s || format(' with check (%s)', c); end if;
      execute s; n := n + 1;
    end if;
  end loop;
  raise notice 'reglas reescritas: %', n;
end $$;
commit;

-- Comprobación: «sin_envolver» debe ser 0 (ninguna llamada a rol_en/modulo_activo suelta) y hay 32 reglas.
select (select count(*) from pg_policies where schemaname = 'public'
          and (coalesce(qual,'') ~* '(?<!select )\m(rol_en|modulo_activo)\(' or coalesce(with_check,'') ~* '(?<!select )\m(rol_en|modulo_activo)\(')) as sin_envolver,
       (select count(*) from pg_policies where schemaname = 'public') as reglas_total;
