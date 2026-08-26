-- Additive production migration: dedicated public images for branding, courses and certificates.
-- Private paid lesson media remains in lesson-media and is intentionally untouched.

begin;

do $$
begin
  if exists (
    select 1 from storage.buckets b
    where b.id = 'site-assets' and b.public = false
      and exists (select 1 from storage.objects o where o.bucket_id = b.id)
  ) then
    raise exception 'Refusing to make a populated private site-assets bucket public; reconcile it manually first.';
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.validate_public_site_asset()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_extension text := lower(substring(new.storage_path from '\.([^.]+)$'));
begin
  if new.bucket_id <> 'site-assets' then
    return new;
  end if;

  if new.kind <> 'image'
     or new.mime_type not in ('image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon')
     or coalesce(new.size_bytes, 0) <= 0
     or new.size_bytes > 5242880
     or new.storage_path !~ '^(branding|courses|certificates|library)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|ico)$'
  then
    raise exception 'Invalid public site asset metadata';
  end if;

  if (v_extension = 'png' and new.mime_type <> 'image/png')
     or (v_extension = 'jpg' and new.mime_type <> 'image/jpeg')
     or (v_extension = 'webp' and new.mime_type <> 'image/webp')
     or (v_extension = 'ico' and new.mime_type not in ('image/x-icon','image/vnd.microsoft.icon'))
  then
    raise exception 'Public site asset extension and MIME type do not match';
  end if;

  return new;
end
$$;

drop trigger if exists validate_public_site_asset on public.media_assets;
create trigger validate_public_site_asset
before insert or update of bucket_id, storage_path, mime_type, size_bytes, kind
on public.media_assets
for each row execute function private.validate_public_site_asset();

-- Table privileges only expose operations to PostgREST; RLS below and the
-- existing media_assets policy remain the authoritative authorization layer.
grant select, insert, update, delete on table public.media_assets to authenticated;

drop policy if exists site_assets_staff_select on storage.objects;
create policy site_assets_staff_select on storage.objects
for select to authenticated
using (
  bucket_id = 'site-assets'
  and (select private.has_permission('media.manage'))
);

drop policy if exists site_assets_staff_insert on storage.objects;
create policy site_assets_staff_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'site-assets'
  and name ~ '^(branding|courses|certificates|library)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|ico)$'
  and (select private.has_permission('media.manage'))
);

drop policy if exists site_assets_staff_update on storage.objects;
create policy site_assets_staff_update on storage.objects
for update to authenticated
using (
  bucket_id = 'site-assets'
  and (select private.has_permission('media.manage'))
)
with check (
  bucket_id = 'site-assets'
  and name ~ '^(branding|courses|certificates|library)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|ico)$'
  and (select private.has_permission('media.manage'))
);

drop policy if exists site_assets_staff_delete on storage.objects;
create policy site_assets_staff_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'site-assets'
  and (select private.has_permission('media.manage'))
);

comment on function private.validate_public_site_asset() is
  'Validates metadata rows for intentionally public, non-SVG site images. Binary upload limits are also enforced by the Storage bucket.';

commit;
