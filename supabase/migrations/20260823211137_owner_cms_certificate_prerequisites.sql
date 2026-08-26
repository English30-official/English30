-- Prerequisite certificate tables for the Owner CMS foundation.
--
-- The foundation defines private.can_access_media_asset() before its later
-- certificate section, and PostgreSQL resolves referenced relations when the
-- SQL function is created. Creating these additive tables first keeps fresh
-- deployments and production upgrades deterministic. The foundation retains
-- CREATE TABLE IF NOT EXISTS for idempotency.

begin;

create table if not exists public.course_certificate_settings (
  course_id uuid primary key references public.courses(id) on delete cascade,
  enabled boolean not null default false,
  certificate_title text not null default 'شهادة إتمام الدورة',
  minimum_final_score numeric(5,2) not null default 70 check (minimum_final_score between 0 and 100),
  require_all_lessons boolean not null default true,
  require_final_quiz boolean not null default true,
  constraint course_certificate_has_requirement check (require_all_lessons or require_final_quiz),
  template_settings jsonb not null default '{}'::jsonb,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  signatory_name text,
  signatory_title text,
  signature_asset_id uuid references public.media_assets(id) on delete set null,
  wording text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  verification_code text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked', 'superseded')),
  student_name_snapshot text not null,
  course_title_snapshot text not null,
  course_level_snapshot text,
  certificate_title_snapshot text not null,
  wording_snapshot text,
  template_snapshot jsonb not null default '{}'::jsonb,
  completion_snapshot jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,
  supersedes_id uuid references public.certificates(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_certificates_active_completion
  on public.certificates(user_id, course_id) where status = 'active';
create index if not exists idx_certificates_verification on public.certificates(verification_code);
create index if not exists idx_certificates_user_issued on public.certificates(user_id, issued_at desc);

create table if not exists public.certificate_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  action text not null check (action in ('issued', 'revoked', 'reissued', 'verified')),
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

commit;
