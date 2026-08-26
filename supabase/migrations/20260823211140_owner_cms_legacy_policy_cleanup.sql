-- Remove legacy per-table staff policies that would otherwise remain additive
-- alongside the new granular permission policies from owner_cms_foundation.
-- PostgreSQL combines permissive RLS policies with OR semantics, so leaving
-- these private.is_admin() policies in place would let any admin bypass the
-- owner-configured media.manage / ai.generate / audit.view permissions.

begin;

-- Legacy AI draft CRUD policies from the pre-RBAC media/AI foundation.
drop policy if exists "ai_drafts_staff_select" on public.ai_content_drafts;
drop policy if exists "ai_drafts_staff_insert" on public.ai_content_drafts;
drop policy if exists "ai_drafts_staff_update" on public.ai_content_drafts;
drop policy if exists "ai_drafts_staff_delete" on public.ai_content_drafts;

-- Legacy media metadata CRUD policies from the pre-RBAC media foundation.
drop policy if exists "media_staff_select" on public.media_assets;
drop policy if exists "media_staff_insert" on public.media_assets;
drop policy if exists "media_staff_update" on public.media_assets;
drop policy if exists "media_staff_delete" on public.media_assets;

-- The old ALL policy includes SELECT, so it would bypass the new audit.view
-- permission even though direct client writes remain ungranted.
drop policy if exists "staff manage audit logs" on public.audit_logs;

commit;
