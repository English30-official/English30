-- The first-owner Edge Function is the only caller of these privileges.
-- service_role still remains server-only and bypasses RLS by design; granting
-- only SELECT/INSERT here keeps the bootstrap path least-privileged.

grant usage on schema public to service_role;
grant usage on type public.app_role to service_role;
grant select, insert on table public.user_roles to service_role;
