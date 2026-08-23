begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  false,
  524288000,
  array['video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lesson_media_staff_insert" on storage.objects;
create policy "lesson_media_staff_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'lesson-media' and private.is_admin());

drop policy if exists "lesson_media_staff_update" on storage.objects;
create policy "lesson_media_staff_update"
on storage.objects for update
to authenticated
using (bucket_id = 'lesson-media' and private.is_admin())
with check (bucket_id = 'lesson-media' and private.is_admin());

drop policy if exists "lesson_media_staff_delete" on storage.objects;
create policy "lesson_media_staff_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'lesson-media' and private.is_admin());

commit;
