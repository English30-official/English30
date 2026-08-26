-- Allow the trusted public-site image upload Edge Function to perform only
-- the metadata operations it requires after server-side binary validation.
-- RLS remains authoritative for authenticated browser users; service_role is
-- used only inside the trusted Edge Function runtime.

begin;

grant select, insert on table public.media_assets to service_role;

commit;
