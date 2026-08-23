-- English30 security/RLS hardening and question bank
-- This migration is idempotent and documents the production database changes applied on 2026-08-23.

alter type public.app_role add value if not exists 'owner';

create schema if not exists private;
create or replace function private.is_admin() returns boolean
language sql security definer set search_path = public, pg_catalog stable
as $$ select exists (select 1 from public.user_roles where user_id=auth.uid() and role in ('admin'::public.app_role,'owner'::public.app_role)); $$;
revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
revoke all on function private.is_admin() from authenticated;

create table if not exists public.question_bank (
 id uuid primary key default gen_random_uuid(), type text not null check(type in ('multiple_choice','fill_in_blank','listening_choice','matching','speaking_evaluation')),
 level text not null check(level in ('A1','A2','B1','B2','C1','C2')), category text not null, prompt_en text not null, prompt_ar text,
 correct_option_key text, explanation_ar text not null default '', audio_url text, tags text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.question_bank_options (
 id uuid primary key default gen_random_uuid(), question_id uuid not null references public.question_bank(id) on delete cascade,
 option_key text not null, text_en text not null, text_ar text, sort_order integer not null default 0, created_at timestamptz not null default now(),
 unique(question_id,option_key)
);
create index if not exists idx_question_bank_level_category on public.question_bank(level,category);
create index if not exists idx_question_bank_options_question on public.question_bank_options(question_id,sort_order);
alter table public.question_bank enable row level security;
alter table public.question_bank_options enable row level security;
drop policy if exists "staff manage question bank" on public.question_bank;
create policy "staff manage question bank" on public.question_bank for all to authenticated using(private.is_admin()) with check(private.is_admin());
drop policy if exists "staff manage question options" on public.question_bank_options;
create policy "staff manage question options" on public.question_bank_options for all to authenticated using(private.is_admin()) with check(private.is_admin());
create or replace trigger set_question_bank_updated_at before update on public.question_bank for each row execute function public.set_updated_at();

-- The remaining existing public-table staff policies are expected to reference private.is_admin().
-- User-owned policies should use (select auth.uid()) for RLS performance.
