-- Almacén de fotos (recetas y vajilla). Pegar entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.
-- Carpeta «fotos», máx. 2 MB por foto (la app las reduce a ~100 KB). Cada cuenta solo sube, cambia o borra
-- en su propia carpeta (fotos/<id de la cuenta>/...). Ver una foto: con su enlace, que lleva un nombre al azar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: subir en su carpeta" on storage.objects;
drop policy if exists "fotos: cambiar en su carpeta" on storage.objects;
drop policy if exists "fotos: borrar en su carpeta" on storage.objects;

create policy "fotos: subir en su carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: cambiar en su carpeta" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: borrar en su carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Comprobación: debe salir «fotos» con public = true
select id, public, file_size_limit from storage.buckets where id = 'fotos';
