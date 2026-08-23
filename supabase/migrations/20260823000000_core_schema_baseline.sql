-- Idempotent baseline for rebuilding the English30 production schema.
-- Existing tables and data are preserved; later migrations reconcile policies,
-- grants, extended columns, media, question bank, and launch entitlements.

begin;

do $$ begin
  create type public.app_role as enum ('student', 'admin', 'owner');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.course_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.lesson_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.video_provider as enum ('bunny', 'cloudflare', 'mux', 'custom');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'canceled');
exception when duplicate_object then null; end $$;

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  locale text default 'ar',
  timezone text default 'Asia/Riyadh',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  phone_number text,
  level text,
  is_suspended boolean not null default false,
  xp_points integer not null default 0,
  streak_days integer not null default 0,
  last_active_at timestamptz
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  thumbnail_url text,
  status public.course_status not null default 'draft',
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_ar text,
  title_en text,
  description_en text,
  level text,
  category text,
  category_ar text,
  duration_hours numeric,
  lessons_count integer not null default 0,
  rating numeric not null default 0,
  students_count integer not null default 0,
  image text,
  color text,
  is_free boolean not null default false
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  status public.lesson_status not null default 'draft',
  sort_order integer not null default 0,
  estimated_minutes integer,
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_ar text,
  title_en text,
  level text,
  duration_minutes integer,
  summary_ar text,
  arabic_explanation text,
  video_url text,
  video_duration text,
  video_title_ar text,
  unit_number integer not null default 1,
  unique (course_id, slug)
);

create table if not exists public.lesson_content (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  provider public.video_provider not null,
  provider_video_id text not null,
  title text,
  duration_seconds integer,
  thumbnail_url text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  resource_type text not null,
  url text,
  storage_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  passing_score numeric(5,2) not null default 70 check (passing_score between 0 and 100),
  max_attempts integer check (max_attempts is null or max_attempts > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  explanation text,
  points numeric(8,2) not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  currency text not null default 'SAR',
  amount numeric(12,2) not null check (amount >= 0),
  interval text not null default 'one_time' check (interval in ('month', 'year', 'one_time')),
  provider text,
  provider_price_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  max_redemptions integer,
  redeemed_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_price_id uuid references public.plan_prices(id) on delete set null,
  coupon_id uuid references public.coupons(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'SAR',
  status public.payment_status not null default 'pending',
  provider text,
  provider_payment_id text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  video_position_seconds integer not null default 0 check (video_position_seconds >= 0),
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  watch_percentage numeric(5,2) not null default 0 check (watch_percentage between 0 and 100),
  is_completed boolean not null default false,
  completed_at timestamptz,
  last_watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_lessons integer not null default 0,
  total_lessons integer not null default 0,
  progress_percentage numeric(5,2) not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score numeric(5,2) not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_catalog
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_catalog
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'); $$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_catalog
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_roles','site_settings','courses','lessons','lesson_content',
    'video_assets','lesson_resources','quizzes','quiz_questions','quiz_options',
    'plans','plan_prices','coupons','subscriptions','payments','lesson_progress',
    'course_progress','quiz_attempts','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

commit;
