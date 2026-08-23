begin;

create table if not exists public.ai_content_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('lesson','block','question_set','analysis')),
  title_ar text not null,
  level text not null check (level in ('A1','A2','B1','B2','C1','C2')),
  prompt text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','applied','discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_content_drafts_status_created on public.ai_content_drafts(status, created_at desc);
create index if not exists idx_ai_content_drafts_created_by on public.ai_content_drafts(created_by);
alter table public.ai_content_drafts enable row level security;
drop policy if exists "staff manage ai content drafts" on public.ai_content_drafts;
create policy "staff manage ai content drafts" on public.ai_content_drafts for all to authenticated using (private.is_admin()) with check (private.is_admin());

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id) on delete set null,
  bucket_id text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  alt_text text,
  kind text not null check (kind in ('image','video','audio','document','other')),
  created_at timestamptz not null default now()
);

create unique index if not exists ux_media_assets_bucket_path on public.media_assets(bucket_id, storage_path);
create index if not exists idx_media_assets_kind_created on public.media_assets(kind, created_at desc);
alter table public.media_assets enable row level security;
drop policy if exists "staff manage media assets" on public.media_assets;
create policy "staff manage media assets" on public.media_assets for all to authenticated using (private.is_admin()) with check (private.is_admin());

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_payment_events_provider_external on public.payment_events(provider, external_event_id) where external_event_id is not null;
create index if not exists idx_payment_events_created on public.payment_events(created_at desc);
alter table public.payment_events enable row level security;
drop policy if exists "staff manage payment events" on public.payment_events;
create policy "staff manage payment events" on public.payment_events for all to authenticated using (private.is_admin()) with check (private.is_admin());

commit;
