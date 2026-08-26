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

  -- Public site assets are registered only by the trusted upload function after
  -- server-side binary validation. Authenticated browser clients may still edit
  -- non-structural fields such as alt_text/archive state through existing RLS,
  -- but cannot forge a new accepted public asset record.
  if auth.role() <> 'service_role' then
    raise exception 'Public site assets must be registered through the trusted upload service';
  end if;

  if new.kind <> 'image'
     or new.mime_type not in ('image/png','image/jpeg','image/webp','image/x-icon','image/vnd.microsoft.icon')
     or coalesce(new.size_bytes, 0) <= 0
     or new.size_bytes > 5242880
     or new.storage_path !~ '^(branding|courses|certificates|library)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|ico)$'
     or coalesce((new.metadata->>'binaryValidated')::boolean, false) is not true
     or coalesce(new.metadata->>'sha256','') !~ '^[0-9a-f]{64}$'
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
before insert or update of bucket_id, storage_path, mime_type, size_bytes, kind, metadata
on public.media_assets
for each row execute function private.validate_public_site_asset();

-- Keep metadata management available through the existing media.manage RLS
-- policy, while structural public-asset registration is enforced by the trigger.
grant select, insert, update, delete on table public.media_assets to authenticated;

-- Public site asset bytes are written only by the trusted Edge Function using
-- the server-side service role. Do not grant browser-side Storage write paths.
drop policy if exists site_assets_staff_select on storage.objects;
drop policy if exists site_assets_staff_insert on storage.objects;
drop policy if exists site_assets_staff_update on storage.objects;
drop policy if exists site_assets_staff_delete on storage.objects;

comment on function private.validate_public_site_asset() is
  'Requires service-role registration after trusted server-side binary validation for intentionally public, non-SVG site images.';

commit;
