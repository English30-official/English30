-- English30 owner CMS and certificates foundation.
-- Additive/idempotent for an existing production database; no tables are
-- recreated and no existing content, progress, subscription, or payment rows
-- are rewritten.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Granular RBAC foundation
-- ---------------------------------------------------------------------------

create table if not exists public.permissions (
  code text primary key,
  category text not null,
  name_ar text not null,
  description_ar text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role public.app_role not null,
  permission_code text not null references public.permissions(code) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (role, permission_code)
);

create table if not exists public.user_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  granted boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, permission_code)
);

insert into public.permissions (code, category, name_ar, description_ar) values
  ('content.manage', 'content', 'إدارة المحتوى', 'إنشاء وتعديل وأرشفة المحتوى التعليمي'),
  ('course.publish', 'content', 'نشر الدورات', 'معاينة ونشر وإلغاء نشر الدورات والدروس'),
  ('quiz.manage', 'content', 'إدارة الاختبارات', 'إدارة الاختبارات وبنك الأسئلة'),
  ('media.manage', 'media', 'إدارة الوسائط', 'رفع وتعديل وأرشفة الوسائط'),
  ('students.manage', 'users', 'إدارة الطلاب', 'عرض وإدارة حالات حسابات الطلاب'),
  ('subscriptions.manage', 'commerce', 'إدارة الاشتراكات', 'إدارة الخطط والاشتراكات والكوبونات'),
  ('payments.view', 'commerce', 'عرض المدفوعات', 'عرض المدفوعات وأحداث بوابة الدفع'),
  ('settings.manage', 'platform', 'إدارة الإعدادات', 'إدارة الهوية والإعدادات والصفحات والميزات'),
  ('ai.generate', 'ai', 'توليد محتوى AI', 'إنشاء واعتماد مسودات الذكاء الاصطناعي'),
  ('certificates.manage', 'certificates', 'إدارة الشهادات', 'إعداد وإلغاء وإعادة إصدار الشهادات'),
  ('audit.view', 'security', 'عرض سجل التدقيق', 'عرض العمليات الإدارية الحساسة'),
  ('roles.manage', 'security', 'إدارة الصلاحيات', 'إدارة أدوار وصلاحيات فريق الإدارة')
on conflict (code) do update set
  category = excluded.category,
  name_ar = excluded.name_ar,
  description_ar = excluded.description_ar;

insert into public.role_permissions (role, permission_code)
select 'admin'::public.app_role, code
from public.permissions
where code in (
  'content.manage', 'course.publish', 'quiz.manage', 'media.manage',
  'students.manage', 'subscriptions.manage', 'payments.view',
  'ai.generate', 'certificates.manage', 'audit.view'
)
on conflict (role, permission_code) do nothing;

create or replace function private.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_is_active()
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid()) and ur.role = p_role
    );
$$;

create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_is_active()
    and (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = (select auth.uid())
          and ur.role = 'owner'::public.app_role
      )
      or exists (
        select 1
        from public.user_permissions up
        where up.user_id = (select auth.uid())
          and up.permission_code = p_permission
          and up.granted = true
      )
      or (
        not exists (
          select 1 from public.user_permissions up
          where up.user_id = (select auth.uid())
            and up.permission_code = p_permission
            and up.granted = false
        )
        and exists (
          select 1
          from public.user_roles ur
          join public.role_permissions rp on rp.role = ur.role
          where ur.user_id = (select auth.uid())
            and rp.permission_code = p_permission
        )
      )
    );
$$;

revoke all on function private.has_role(public.app_role) from public, anon, authenticated;
revoke all on function private.has_permission(text) from public, anon, authenticated;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.has_permission(text) to authenticated;

create or replace function public.check_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.has_permission(p_permission); $$;
revoke all on function public.check_permission(text) from public, anon, authenticated;
grant execute on function public.check_permission(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Central settings, pages, feature flags, lifecycle metadata
-- ---------------------------------------------------------------------------

alter table public.site_settings add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.courses add column if not exists archived_at timestamptz;
alter table public.courses add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.courses add column if not exists thumbnail_asset_id uuid references public.media_assets(id) on delete set null;

alter table public.lessons add column if not exists archived_at timestamptz;
alter table public.lessons add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.quizzes add column if not exists status public.lesson_status not null default 'draft';
alter table public.quizzes add column if not exists is_final boolean not null default false;
alter table public.quizzes add column if not exists archived_at timestamptz;

alter table public.question_bank add column if not exists status public.lesson_status not null default 'draft';
alter table public.question_bank add column if not exists archived_at timestamptz;

alter table public.ai_content_drafts add column if not exists lifecycle_status public.lesson_status not null default 'draft';
alter table public.ai_content_drafts add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.ai_content_drafts add column if not exists approved_at timestamptz;

alter table public.media_assets add column if not exists provider text not null default 'supabase_storage';
alter table public.media_assets add column if not exists provider_asset_id text;
alter table public.media_assets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.media_assets add column if not exists updated_at timestamptz not null default now();
alter table public.media_assets add column if not exists archived_at timestamptz;

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description_ar text,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, description_ar) values
  ('ai_tutor', true, 'المعلم الذكي للطلاب'),
  ('ai_content_generation', true, 'توليد المحتوى من لوحة المالك'),
  ('quizzes', true, 'الاختبارات والتمارين'),
  ('certificates', true, 'الشهادات التلقائية'),
  ('annual_subscription', true, 'خيار الاشتراك السنوي'),
  ('navigation_vocab', true, 'إظهار المفردات في التنقل'),
  ('navigation_levels', true, 'إظهار المستويات في التنقل')
on conflict (key) do nothing;

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  page_type text not null default 'static' check (page_type in ('static', 'legal')),
  title_ar text not null,
  title_en text,
  body jsonb not null default '[]'::jsonb,
  status public.lesson_status not null default 'draft',
  seo_title text,
  seo_description text,
  open_graph_asset_id uuid references public.media_assets(id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.cms_pages (slug, page_type, title_ar, status) values
  ('terms', 'legal', 'شروط الاستخدام', 'draft'),
  ('privacy', 'legal', 'سياسة الخصوصية', 'draft'),
  ('refund', 'legal', 'سياسة الاسترداد', 'draft')
on conflict (slug) do nothing;

-- Structured lesson blocks are the canonical format for new/edited lessons.
-- Existing lesson_content JSON remains readable for backward compatibility.
create table if not exists public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_type text not null check (block_type in (
    'heading', 'rich_text', 'vocabulary', 'example', 'grammar', 'note',
    'flashcard', 'image', 'audio', 'video', 'exercise', 'quiz_reference',
    'downloadable_resource'
  )),
  title_ar text,
  title_en text,
  content jsonb not null default '{}'::jsonb,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  quiz_id uuid references public.quizzes(id) on delete set null,
  order_index integer not null default 0 check (order_index >= 0),
  status public.lesson_status not null default 'draft',
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lesson_blocks_lesson_order on public.lesson_blocks(lesson_id, order_index);
create index if not exists idx_lesson_blocks_media on public.lesson_blocks(media_asset_id) where media_asset_id is not null;

create table if not exists public.media_asset_links (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  entity_type text not null check (entity_type in ('course', 'lesson', 'lesson_block', 'page', 'certificate_template')),
  entity_id uuid not null,
  relation text not null default 'attachment',
  order_index integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (media_asset_id, entity_type, entity_id, relation)
);

-- ---------------------------------------------------------------------------
-- Version history and audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  version_number integer not null,
  snapshot jsonb not null,
  change_action text not null default 'update',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version_number)
);

create index if not exists idx_content_versions_entity on public.content_versions(entity_type, entity_id, version_number desc);

create or replace function private.capture_content_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_id uuid;
  v_version integer;
begin
  if to_jsonb(old) = to_jsonb(new) then return new; end if;
  v_entity_id := (to_jsonb(old)->>'id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(tg_table_name || ':' || v_entity_id::text, 0));
  select coalesce(max(cv.version_number), 0) + 1 into v_version
  from public.content_versions cv
  where cv.entity_type = tg_table_name and cv.entity_id = v_entity_id;
  insert into public.content_versions(entity_type, entity_id, version_number, snapshot, change_action, changed_by)
  values (tg_table_name, v_entity_id, v_version, to_jsonb(old), 'update', (select auth.uid()));
  return new;
end;
$$;

revoke all on function private.capture_content_version() from public, anon, authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array['courses','lessons','lesson_content','lesson_blocks','quizzes','cms_pages'] loop
    execute format('drop trigger if exists capture_content_version on public.%I', v_table);
    execute format('create trigger capture_content_version before update on public.%I for each row execute function private.capture_content_version()', v_table);
  end loop;
end $$;

create or replace function private.audit_cms_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_entity_id uuid;
begin
  begin v_entity_id := nullif(v_row->>'id', '')::uuid; exception when others then v_entity_id := null; end;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    lower(tg_op) || '_' || tg_table_name,
    tg_table_name,
    v_entity_id,
    jsonb_build_object(
      'status', coalesce(v_row->>'status', v_row->>'lifecycle_status'),
      'key', v_row->>'key',
      'permission_code', v_row->>'permission_code',
      'role', v_row->>'role',
      'target_user_id', coalesce(v_row->>'user_id', v_row->>'id'),
      'granted', v_row->>'granted',
      'course_id', v_row->>'course_id'
    )
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.audit_cms_change() from public, anon, authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'courses','lessons','lesson_content','lesson_blocks','quizzes','cms_pages',
    'site_settings','feature_flags','media_assets','ai_content_drafts','question_bank',
    'role_permissions','user_permissions','user_roles','profiles',
    'plans','plan_prices','coupons','subscriptions'
  ] loop
    execute format('drop trigger if exists audit_cms_change on public.%I', v_table);
    execute format('create trigger audit_cms_change after insert or update or delete on public.%I for each row execute function private.audit_cms_change()', v_table);
  end loop;
end $$;

create or replace function private.guard_role_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The service-role first-owner Edge Function has no auth.uid() and remains
  -- governed by the existing atomic bootstrap trigger. Interactive staff role
  -- changes require the dedicated owner-only permission.
  if (select auth.uid()) is not null and not private.has_permission('roles.manage') then
    raise exception using errcode = '42501', message = 'Role management permission required';
  end if;
  if tg_op = 'DELETE' and old.role = 'owner'::public.app_role then
    raise exception using errcode = '42501', message = 'The owner role cannot be removed';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists guard_role_changes on public.user_roles;
create trigger guard_role_changes before insert or update or delete on public.user_roles
for each row execute function private.guard_role_changes();
revoke all on function private.guard_role_changes() from public, anon, authenticated;

create or replace function private.guard_course_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status::text in ('preview', 'published')
     and (tg_op = 'INSERT' or old.status::text is distinct from new.status::text)
     and not private.has_permission('course.publish') then
    raise exception using errcode = '42501', message = 'Course publishing permission required';
  end if;
  return new;
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['courses','lessons','lesson_blocks'] loop
    execute format('drop trigger if exists guard_course_publication on public.%I', v_table);
    execute format('create trigger guard_course_publication before insert or update on public.%I for each row execute function private.guard_course_publication()', v_table);
  end loop;
end $$;
revoke all on function private.guard_course_publication() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Certificate configuration, authoritative issuance, and verification
-- ---------------------------------------------------------------------------

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

drop trigger if exists audit_cms_change on public.course_certificate_settings;
create trigger audit_cms_change after insert or update or delete on public.course_certificate_settings
for each row execute function private.audit_cms_change();

create or replace function private.issue_certificate_if_eligible(
  p_user_id uuid,
  p_course_id uuid,
  p_force_reissue boolean default false,
  p_supersedes_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.course_certificate_settings%rowtype;
  v_course public.courses%rowtype;
  v_profile public.profiles%rowtype;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_final_quiz_id uuid;
  v_best_score numeric;
  v_certificate_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('certificate:' || p_user_id::text || ':' || p_course_id::text, 0));

  if not exists (select 1 from public.feature_flags where key = 'certificates' and enabled) then return null; end if;

  select * into v_settings from public.course_certificate_settings where course_id = p_course_id;
  if not found or not v_settings.enabled then return null; end if;
  select * into v_course from public.courses where id = p_course_id and status = 'published'::public.course_status;
  if not found then return null; end if;
  select * into v_profile from public.profiles where id = p_user_id and is_active and not is_suspended;
  if not found or coalesce(trim(v_profile.full_name), '') = '' then return null; end if;

  select count(*) into v_total_lessons
  from public.lessons l
  where l.course_id = p_course_id and l.status = 'published'::public.lesson_status;
  select count(*) into v_completed_lessons
  from public.lessons l
  join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = p_user_id and lp.is_completed
  where l.course_id = p_course_id and l.status = 'published'::public.lesson_status;

  if v_settings.require_all_lessons and (v_total_lessons = 0 or v_completed_lessons < v_total_lessons) then return null; end if;

  select q.id into v_final_quiz_id
  from public.quizzes q
  join public.lessons l on l.id = q.lesson_id
  where l.course_id = p_course_id and q.is_final and q.status = 'published'::public.lesson_status
  order by q.created_at desc limit 1;

  if v_settings.require_final_quiz then
    if v_final_quiz_id is null then return null; end if;
    select max(qa.score) into v_best_score
    from public.quiz_attempts qa
    where qa.user_id = p_user_id and qa.quiz_id = v_final_quiz_id and qa.passed;
    if v_best_score is null or v_best_score < v_settings.minimum_final_score then return null; end if;
  end if;

  if exists (select 1 from public.certificates c where c.user_id = p_user_id and c.course_id = p_course_id and c.status = 'active') then
    if not p_force_reissue then
      select c.id into v_certificate_id from public.certificates c
      where c.user_id = p_user_id and c.course_id = p_course_id and c.status = 'active' limit 1;
      return v_certificate_id;
    end if;
    raise exception using errcode = '23505', message = 'An active certificate already exists';
  end if;

  insert into public.certificates(
    certificate_number, verification_code, user_id, course_id,
    student_name_snapshot, course_title_snapshot, course_level_snapshot,
    certificate_title_snapshot, wording_snapshot, template_snapshot,
    completion_snapshot, issued_by, supersedes_id
  ) values (
    'E30-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    upper(encode(gen_random_bytes(12), 'hex')),
    p_user_id, p_course_id, v_profile.full_name,
    coalesce(v_course.title_ar, v_course.title), v_course.level,
    v_settings.certificate_title, v_settings.wording,
    v_settings.template_settings || jsonb_build_object(
      'logoAssetId', v_settings.logo_asset_id,
      'signatureAssetId', v_settings.signature_asset_id,
      'signatoryName', v_settings.signatory_name,
      'signatoryTitle', v_settings.signatory_title
    ),
    jsonb_build_object(
      'totalLessons', v_total_lessons,
      'completedLessons', v_completed_lessons,
      'finalQuizId', v_final_quiz_id,
      'finalScore', v_best_score,
      'minimumScore', v_settings.minimum_final_score
    ),
    case when p_force_reissue then (select auth.uid()) else null end,
    p_supersedes_id
  ) returning id into v_certificate_id;

  insert into public.certificate_events(certificate_id, action, actor_id)
  values (v_certificate_id, case when p_force_reissue then 'reissued' else 'issued' end, (select auth.uid()));
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), case when p_force_reissue then 'reissue_certificate' else 'issue_certificate' end,
          'certificates', v_certificate_id, jsonb_build_object('course_id', p_course_id));
  return v_certificate_id;
end;
$$;

create or replace function private.trigger_certificate_after_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_course_id uuid;
begin
  if new.is_completed then
    select l.course_id into v_course_id from public.lessons l where l.id = new.lesson_id;
    perform private.issue_certificate_if_eligible(new.user_id, v_course_id);
  end if;
  return new;
end;
$$;

create or replace function private.trigger_certificate_after_quiz()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_course_id uuid;
begin
  if new.completed_at is not null and new.passed then
    select l.course_id into v_course_id
    from public.quizzes q join public.lessons l on l.id = q.lesson_id
    where q.id = new.quiz_id;
    perform private.issue_certificate_if_eligible(new.user_id, v_course_id);
  end if;
  return new;
end;
$$;

drop trigger if exists issue_certificate_after_progress on public.lesson_progress;
create trigger issue_certificate_after_progress after insert or update of is_completed on public.lesson_progress
for each row execute function private.trigger_certificate_after_progress();
drop trigger if exists issue_certificate_after_quiz on public.quiz_attempts;
create trigger issue_certificate_after_quiz after insert or update of completed_at, passed, score on public.quiz_attempts
for each row execute function private.trigger_certificate_after_quiz();

revoke all on function private.issue_certificate_if_eligible(uuid, uuid, boolean, uuid) from public, anon, authenticated;
revoke all on function private.trigger_certificate_after_progress() from public, anon, authenticated;
revoke all on function private.trigger_certificate_after_quiz() from public, anon, authenticated;

create or replace function public.verify_certificate(p_verification_code text)
returns table (
  valid boolean,
  status text,
  certificate_number text,
  student_name text,
  course_title text,
  course_level text,
  issued_at timestamptz,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.status = 'active', c.status, c.certificate_number,
    c.student_name_snapshot, c.course_title_snapshot, c.course_level_snapshot,
    c.issued_at, c.revoked_at
  from public.certificates c
  where c.verification_code = upper(trim(p_verification_code))
  limit 1;
$$;

create or replace function public.revoke_certificate(p_certificate_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('certificates.manage') then
    raise exception using errcode = '42501', message = 'Certificate management permission required';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception using errcode = '22023', message = 'Revocation reason is required';
  end if;
  update public.certificates set status = 'revoked', revoked_at = now(), revoked_by = (select auth.uid()), revocation_reason = trim(p_reason)
  where id = p_certificate_id and status = 'active';
  if not found then return false; end if;
  insert into public.certificate_events(certificate_id, action, actor_id, metadata)
  values (p_certificate_id, 'revoked', (select auth.uid()), jsonb_build_object('reason', trim(p_reason)));
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'revoke_certificate', 'certificates', p_certificate_id, jsonb_build_object('reason', trim(p_reason)));
  return true;
end;
$$;

create or replace function public.reissue_certificate(p_certificate_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_old public.certificates%rowtype; v_new_id uuid;
begin
  if not private.has_permission('certificates.manage') then
    raise exception using errcode = '42501', message = 'Certificate management permission required';
  end if;
  select * into v_old from public.certificates where id = p_certificate_id;
  if not found then raise exception using errcode = 'P0002', message = 'Certificate not found'; end if;
  if v_old.status = 'active' then
    update public.certificates set status = 'superseded', revoked_at = now(), revoked_by = (select auth.uid()), revocation_reason = 'Reissued'
    where id = p_certificate_id;
  end if;
  v_new_id := private.issue_certificate_if_eligible(v_old.user_id, v_old.course_id, true, p_certificate_id);
  if v_new_id is null then raise exception using errcode = 'P0001', message = 'Completion requirements are no longer satisfied'; end if;
  return v_new_id;
end;
$$;

revoke all on function public.verify_certificate(text) from public, anon, authenticated;
revoke all on function public.revoke_certificate(uuid, text) from public, anon, authenticated;
revoke all on function public.reissue_certificate(uuid) from public, anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.revoke_certificate(uuid, text) to authenticated;
grant execute on function public.reissue_certificate(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Authoritative quiz delivery/submission used by certificate eligibility
-- ---------------------------------------------------------------------------

create or replace function public.get_quiz_for_attempt(p_quiz_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_quiz public.quizzes%rowtype; v_result jsonb;
begin
  if (select auth.uid()) is null or not private.current_user_is_active() then
    raise exception using errcode='42501', message='Active authentication required';
  end if;
  select * into v_quiz from public.quizzes
  where id=p_quiz_id and status='published'::public.lesson_status and is_active;
  if not found or not private.can_access_lesson(v_quiz.lesson_id) then
    raise exception using errcode='42501', message='Quiz access denied';
  end if;
  select jsonb_build_object(
    'id',v_quiz.id,'lessonId',v_quiz.lesson_id,'title',v_quiz.title,
    'description',v_quiz.description,'passingScore',v_quiz.passing_score,
    'maxAttempts',v_quiz.max_attempts,'isFinal',v_quiz.is_final,
    'questions',coalesce(jsonb_agg(jsonb_build_object(
      'id',qq.id,'text',qq.question_text,'points',qq.points,'sortOrder',qq.sort_order,
      'options',coalesce((select jsonb_agg(jsonb_build_object('id',qo.id,'text',qo.option_text,'sortOrder',qo.sort_order) order by qo.sort_order) from public.quiz_options qo where qo.question_id=qq.id),'[]'::jsonb)
    ) order by qq.sort_order) filter (where qq.id is not null),'[]'::jsonb)
  ) into v_result
  from public.quiz_questions qq where qq.quiz_id=v_quiz.id;
  return v_result;
end;
$$;

create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes%rowtype; v_question_count integer; v_answered_count integer;
  v_total_points numeric; v_correct_points numeric; v_score numeric; v_passed boolean; v_attempt_id uuid;
begin
  if (select auth.uid()) is null or not private.current_user_is_active() then
    raise exception using errcode='42501', message='Active authentication required';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception using errcode='22023', message='Answers must be an object'; end if;
  select * into v_quiz from public.quizzes
  where id=p_quiz_id and status='published'::public.lesson_status and is_active for share;
  if not found or not private.can_access_lesson(v_quiz.lesson_id) then
    raise exception using errcode='42501', message='Quiz access denied';
  end if;
  if v_quiz.max_attempts is not null and (
    select count(*) from public.quiz_attempts qa where qa.quiz_id=p_quiz_id and qa.user_id=(select auth.uid())
  ) >= v_quiz.max_attempts then raise exception using errcode='22023', message='Maximum attempts reached'; end if;

  select count(*),coalesce(sum(points),0) into v_question_count,v_total_points
  from public.quiz_questions where quiz_id=p_quiz_id;
  if v_question_count=0 or v_total_points<=0 then raise exception using errcode='22023', message='Quiz has no scorable questions'; end if;
  select count(distinct qq.id) into v_answered_count
  from public.quiz_questions qq join public.quiz_options qo on qo.question_id=qq.id
  where qq.quiz_id=p_quiz_id and qo.id::text=p_answers->>qq.id::text;
  if v_answered_count<>v_question_count then raise exception using errcode='22023', message='Every question must have one valid answer'; end if;
  select coalesce(sum(qq.points),0) into v_correct_points
  from public.quiz_questions qq join public.quiz_options qo on qo.question_id=qq.id and qo.is_correct
  where qq.quiz_id=p_quiz_id and qo.id::text=p_answers->>qq.id::text;
  v_score:=round((v_correct_points/v_total_points)*100,2);
  v_passed:=v_score>=v_quiz.passing_score;
  insert into public.quiz_attempts(user_id,quiz_id,score,passed,answers,completed_at)
  values((select auth.uid()),p_quiz_id,v_score,v_passed,p_answers,now()) returning id into v_attempt_id;
  return jsonb_build_object('attemptId',v_attempt_id,'score',v_score,'passed',v_passed);
end;
$$;

create or replace function public.add_bank_question_to_quiz(p_quiz_id uuid, p_bank_question_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_bank public.question_bank%rowtype; v_question_id uuid; v_order integer;
begin
  if not private.has_permission('quiz.manage') then raise exception using errcode='42501', message='Quiz management permission required'; end if;
  select * into v_bank from public.question_bank where id=p_bank_question_id and status<>'archived'::public.lesson_status;
  if not found or not exists(select 1 from public.quizzes where id=p_quiz_id) then raise exception using errcode='P0002', message='Quiz or bank question not found'; end if;
  select coalesce(max(sort_order),-1)+1 into v_order from public.quiz_questions where quiz_id=p_quiz_id;
  insert into public.quiz_questions(quiz_id,question_text,explanation,points,sort_order)
  values(p_quiz_id,v_bank.prompt_en,v_bank.explanation_ar,1,v_order) returning id into v_question_id;
  insert into public.quiz_options(question_id,option_text,is_correct,sort_order)
  select v_question_id,o.text_en,o.option_key=v_bank.correct_option_key,o.sort_order
  from public.question_bank_options o where o.question_id=p_bank_question_id order by o.sort_order;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),'add_quiz_question','quizzes',p_quiz_id,jsonb_build_object('question_id',v_question_id,'bank_question_id',p_bank_question_id));
  return v_question_id;
end;
$$;

revoke all on function public.get_quiz_for_attempt(uuid) from public, anon, authenticated;
revoke all on function public.submit_quiz_attempt(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.add_bank_question_to_quiz(uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_quiz_for_attempt(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid,jsonb) to authenticated;
grant execute on function public.add_bank_question_to_quiz(uuid,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Restore, permanent delete, and portable import/export RPCs
-- ---------------------------------------------------------------------------

create or replace function public.restore_content_version(p_version_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v public.content_versions%rowtype; s jsonb;
begin
  if not private.has_permission('content.manage') then raise exception using errcode = '42501', message = 'Content management permission required'; end if;
  select * into v from public.content_versions where id = p_version_id;
  if not found then raise exception using errcode = 'P0002', message = 'Version not found'; end if;
  s := v.snapshot;
  case v.entity_type
    when 'courses' then
      update public.courses set slug=s->>'slug', title=s->>'title', title_ar=s->>'title_ar', title_en=s->>'title_en',
        description=s->>'description', description_en=s->>'description_en', thumbnail_url=s->>'thumbnail_url', image=s->>'image',
        status=(s->>'status')::public.course_status, level=s->>'level', category=s->>'category', category_ar=s->>'category_ar',
        duration_hours=nullif(s->>'duration_hours','')::numeric, color=s->>'color',
        thumbnail_asset_id=nullif(s->>'thumbnail_asset_id','')::uuid,
        archived_at=nullif(s->>'archived_at','')::timestamptz,
        is_free=coalesce((s->>'is_free')::boolean,false), updated_by=(select auth.uid()) where id=v.entity_id;
    when 'lessons' then
      update public.lessons set course_id=(s->>'course_id')::uuid, slug=s->>'slug', title=s->>'title', title_ar=s->>'title_ar', title_en=s->>'title_en',
        description=s->>'description', summary_ar=s->>'summary_ar', arabic_explanation=s->>'arabic_explanation',
        status=(s->>'status')::public.lesson_status, sort_order=coalesce((s->>'sort_order')::integer,0),
        estimated_minutes=nullif(s->>'estimated_minutes','')::integer, duration_minutes=nullif(s->>'duration_minutes','')::integer,
        level=s->>'level', unit_number=coalesce((s->>'unit_number')::integer,1),
        video_url=s->>'video_url', video_duration=s->>'video_duration', video_title_ar=s->>'video_title_ar',
        archived_at=nullif(s->>'archived_at','')::timestamptz,
        is_free=coalesce((s->>'is_free')::boolean,false), updated_by=(select auth.uid()) where id=v.entity_id;
    when 'lesson_content' then update public.lesson_content set content=s->'content' where id=v.entity_id;
    when 'lesson_blocks' then
      update public.lesson_blocks set block_type=s->>'block_type', title_ar=s->>'title_ar', title_en=s->>'title_en', content=s->'content',
        media_asset_id=nullif(s->>'media_asset_id','')::uuid, quiz_id=nullif(s->>'quiz_id','')::uuid,
        order_index=coalesce((s->>'order_index')::integer,0), status=(s->>'status')::public.lesson_status,
        archived_at=nullif(s->>'archived_at','')::timestamptz, updated_by=(select auth.uid()) where id=v.entity_id;
    when 'quizzes' then
      update public.quizzes set title=s->>'title', description=s->>'description', passing_score=(s->>'passing_score')::numeric,
        max_attempts=nullif(s->>'max_attempts','')::integer, status=(s->>'status')::public.lesson_status,
        is_final=coalesce((s->>'is_final')::boolean,false), archived_at=nullif(s->>'archived_at','')::timestamptz where id=v.entity_id;
    when 'cms_pages' then
      update public.cms_pages set slug=s->>'slug', page_type=s->>'page_type', title_ar=s->>'title_ar', title_en=s->>'title_en',
        body=s->'body', status=(s->>'status')::public.lesson_status, seo_title=s->>'seo_title', seo_description=s->>'seo_description',
        open_graph_asset_id=nullif(s->>'open_graph_asset_id','')::uuid,
        published_at=nullif(s->>'published_at','')::timestamptz, archived_at=nullif(s->>'archived_at','')::timestamptz,
        updated_by=(select auth.uid()) where id=v.entity_id;
    else raise exception using errcode = '22023', message = 'Unsupported version entity';
  end case;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'restore_version', v.entity_type, v.entity_id, jsonb_build_object('version_id', v.id, 'version_number', v.version_number));
  return true;
end;
$$;

create or replace function public.owner_permanently_delete_content(p_entity_type text, p_entity_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role('owner'::public.app_role) then raise exception using errcode='42501', message='Owner role required'; end if;
  case p_entity_type
    when 'course' then
      if exists (select 1 from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id where l.course_id=p_entity_id)
         or exists (select 1 from public.course_progress cp where cp.course_id=p_entity_id)
         or exists (select 1 from public.certificates c where c.course_id=p_entity_id)
      then raise exception using errcode='23503', message='Course has historical student activity and cannot be permanently deleted'; end if;
      delete from public.courses where id=p_entity_id and status='archived'::public.course_status;
    when 'lesson' then
      if exists (select 1 from public.lesson_progress where lesson_id=p_entity_id)
      then raise exception using errcode='23503', message='Lesson has historical student activity and cannot be permanently deleted'; end if;
      delete from public.lessons where id=p_entity_id and status='archived'::public.lesson_status;
    when 'page' then delete from public.cms_pages where id=p_entity_id and status='archived'::public.lesson_status;
    when 'lesson_block' then delete from public.lesson_blocks where id=p_entity_id and status='archived'::public.lesson_status;
    else raise exception using errcode='22023', message='Unsupported delete entity';
  end case;
  if not found then return false; end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id) values ((select auth.uid()),'permanent_delete',p_entity_type,p_entity_id);
  return true;
end;
$$;

create or replace function public.export_course(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not private.has_permission('content.manage') then raise exception using errcode='42501', message='Content management permission required'; end if;
  select jsonb_build_object(
    'schemaVersion', 1,
    'exportedAt', now(),
    'course', to_jsonb(c) - 'created_by' - 'updated_by',
    'certificateSettings', (select to_jsonb(cs) - 'updated_by' from public.course_certificate_settings cs where cs.course_id=c.id),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object(
      'lesson', to_jsonb(l) - 'created_by' - 'updated_by',
      'legacyContent', (select lc.content from public.lesson_content lc where lc.lesson_id=l.id),
      'blocks', coalesce((select jsonb_agg(to_jsonb(lb) - 'created_by' - 'updated_by' order by lb.order_index) from public.lesson_blocks lb where lb.lesson_id=l.id), '[]'::jsonb),
      'quizzes', coalesce((select jsonb_agg(jsonb_build_object(
        'quiz', to_jsonb(q),
        'questions', coalesce((select jsonb_agg(jsonb_build_object(
          'question', to_jsonb(qq),
          'options', coalesce((select jsonb_agg(to_jsonb(qo) order by qo.sort_order) from public.quiz_options qo where qo.question_id=qq.id), '[]'::jsonb)
        ) order by qq.sort_order) from public.quiz_questions qq where qq.quiz_id=q.id), '[]'::jsonb)
      )) from public.quizzes q where q.lesson_id=l.id), '[]'::jsonb)
    ) order by l.sort_order) from public.lessons l where l.course_id=c.id), '[]'::jsonb)
  ) into result from public.courses c where c.id=p_course_id;
  if result is null then raise exception using errcode='P0002', message='Course not found'; end if;
  return result;
end;
$$;

create or replace function public.import_course(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c jsonb := p_payload->'course';
  l_item jsonb; b jsonb; q_item jsonb; qq_item jsonb; qo jsonb;
  v_course_id uuid := gen_random_uuid(); v_lesson_id uuid; v_quiz_id uuid; v_question_id uuid;
  v_slug text;
begin
  if not private.has_permission('content.manage') then raise exception using errcode='42501', message='Content management permission required'; end if;
  if coalesce((p_payload->>'schemaVersion')::integer,0) <> 1 or c is null or jsonb_typeof(p_payload->'lessons') <> 'array'
  then raise exception using errcode='22023', message='Invalid or unsupported course package'; end if;
  if coalesce(nullif(trim(c->>'title'), ''), nullif(trim(c->>'title_en'), ''), nullif(trim(c->>'title_ar'), '')) is null
  then raise exception using errcode='22023', message='Course title is required'; end if;
  v_slug := coalesce(nullif(c->>'slug',''), 'imported-course') || '-' || lower(substr(replace(v_course_id::text,'-',''),1,8));
  insert into public.courses(id,slug,title,title_ar,title_en,description,description_en,thumbnail_url,image,color,status,sort_order,is_featured,is_free,level,category,category_ar,duration_hours,created_by,updated_by)
  values(v_course_id,v_slug,coalesce(nullif(trim(c->>'title'),''),nullif(trim(c->>'title_en'),''),nullif(trim(c->>'title_ar'),'')),c->>'title_ar',c->>'title_en',c->>'description',c->>'description_en',c->>'thumbnail_url',c->>'image',c->>'color','draft',
    coalesce((c->>'sort_order')::integer,0),false,coalesce((c->>'is_free')::boolean,false),c->>'level',c->>'category',c->>'category_ar',nullif(c->>'duration_hours','')::numeric,(select auth.uid()),(select auth.uid()));

  if jsonb_typeof(p_payload->'certificateSettings') = 'object' then
    insert into public.course_certificate_settings(
      course_id, enabled, certificate_title, minimum_final_score,
      require_all_lessons, require_final_quiz, template_settings,
      signatory_name, signatory_title, wording, updated_by
    ) values (
      v_course_id, false,
      coalesce(nullif(p_payload->'certificateSettings'->>'certificate_title',''),'شهادة إتمام الدورة'),
      coalesce((p_payload->'certificateSettings'->>'minimum_final_score')::numeric,70),
      coalesce((p_payload->'certificateSettings'->>'require_all_lessons')::boolean,true),
      coalesce((p_payload->'certificateSettings'->>'require_final_quiz')::boolean,true),
      coalesce(p_payload->'certificateSettings'->'template_settings','{}'::jsonb),
      p_payload->'certificateSettings'->>'signatory_name',
      p_payload->'certificateSettings'->>'signatory_title',
      p_payload->'certificateSettings'->>'wording',
      (select auth.uid())
    );
  end if;

  for l_item in select value from jsonb_array_elements(p_payload->'lessons') loop
    if jsonb_typeof(l_item->'lesson') <> 'object'
       or coalesce(nullif(trim(l_item->'lesson'->>'title'),''),nullif(trim(l_item->'lesson'->>'title_en'),''),nullif(trim(l_item->'lesson'->>'title_ar'),'')) is null then
      raise exception using errcode='22023', message='Every imported lesson must have a title';
    end if;
    v_lesson_id := gen_random_uuid();
    insert into public.lessons(id,course_id,slug,title,title_ar,title_en,description,status,sort_order,estimated_minutes,is_free,level,duration_minutes,summary_ar,arabic_explanation,unit_number,updated_by)
    values(v_lesson_id,v_course_id,coalesce(nullif(l_item->'lesson'->>'slug',''),'lesson')||'-'||lower(substr(replace(v_lesson_id::text,'-',''),1,8)),
      coalesce(nullif(trim(l_item->'lesson'->>'title'),''),nullif(trim(l_item->'lesson'->>'title_en'),''),nullif(trim(l_item->'lesson'->>'title_ar'),'')),l_item->'lesson'->>'title_ar',l_item->'lesson'->>'title_en',l_item->'lesson'->>'description','draft',
      coalesce((l_item->'lesson'->>'sort_order')::integer,0),nullif(l_item->'lesson'->>'estimated_minutes','')::integer,coalesce((l_item->'lesson'->>'is_free')::boolean,false),l_item->'lesson'->>'level',nullif(l_item->'lesson'->>'duration_minutes','')::integer,
      l_item->'lesson'->>'summary_ar',l_item->'lesson'->>'arabic_explanation',coalesce((l_item->'lesson'->>'unit_number')::integer,1),(select auth.uid()));
    if l_item ? 'legacyContent' and l_item->'legacyContent' is not null then
      insert into public.lesson_content(lesson_id,content) values(v_lesson_id,l_item->'legacyContent');
    end if;
    for b in select value from jsonb_array_elements(case when jsonb_typeof(l_item->'blocks')='array' then l_item->'blocks' else '[]'::jsonb end) loop
      insert into public.lesson_blocks(lesson_id,block_type,title_ar,title_en,content,order_index,status,created_by,updated_by)
      values(v_lesson_id,b->>'block_type',b->>'title_ar',b->>'title_en',coalesce(b->'content','{}'::jsonb),coalesce((b->>'order_index')::integer,0),'draft',(select auth.uid()),(select auth.uid()));
    end loop;
    for q_item in select value from jsonb_array_elements(case when jsonb_typeof(l_item->'quizzes')='array' then l_item->'quizzes' else '[]'::jsonb end) loop
      v_quiz_id := gen_random_uuid();
      insert into public.quizzes(id,lesson_id,title,description,passing_score,max_attempts,is_active,status,is_final)
      values(v_quiz_id,v_lesson_id,coalesce(q_item->'quiz'->>'title','Imported quiz'),q_item->'quiz'->>'description',coalesce((q_item->'quiz'->>'passing_score')::numeric,70),nullif(q_item->'quiz'->>'max_attempts','')::integer,true,'draft',coalesce((q_item->'quiz'->>'is_final')::boolean,false));
      for qq_item in select value from jsonb_array_elements(case when jsonb_typeof(q_item->'questions')='array' then q_item->'questions' else '[]'::jsonb end) loop
        v_question_id := gen_random_uuid();
        insert into public.quiz_questions(id,quiz_id,question_text,explanation,points,sort_order)
        values(v_question_id,v_quiz_id,qq_item->'question'->>'question_text',qq_item->'question'->>'explanation',coalesce((qq_item->'question'->>'points')::numeric,1),coalesce((qq_item->'question'->>'sort_order')::integer,0));
        for qo in select value from jsonb_array_elements(case when jsonb_typeof(qq_item->'options')='array' then qq_item->'options' else '[]'::jsonb end) loop
          insert into public.quiz_options(question_id,option_text,is_correct,sort_order)
          values(v_question_id,qo->>'option_text',coalesce((qo->>'is_correct')::boolean,false),coalesce((qo->>'sort_order')::integer,0));
        end loop;
      end loop;
    end loop;
  end loop;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),'import_course','courses',v_course_id,jsonb_build_object('schema_version',1));
  return v_course_id;
end;
$$;

revoke all on function public.restore_content_version(uuid) from public, anon, authenticated;
revoke all on function public.owner_permanently_delete_content(text, uuid) from public, anon, authenticated;
revoke all on function public.export_course(uuid) from public, anon, authenticated;
revoke all on function public.import_course(jsonb) from public, anon, authenticated;
grant execute on function public.restore_content_version(uuid) to authenticated;
grant execute on function public.owner_permanently_delete_content(text, uuid) to authenticated;
grant execute on function public.export_course(uuid) to authenticated;
grant execute on function public.import_course(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS and Data API grants
-- ---------------------------------------------------------------------------

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'permissions','role_permissions','user_permissions','feature_flags','cms_pages',
    'lesson_blocks','media_asset_links','content_versions','course_certificate_settings',
    'certificates','certificate_events'
  ] loop execute format('alter table public.%I enable row level security',v_table); end loop;
end $$;

-- Replace broad role checks with granular database-authoritative permissions.
-- Student self-service/public policies from Phase 1 remain in force alongside
-- these management policies.
drop policy if exists "staff manage profiles" on public.profiles;
create policy "staff manage profiles" on public.profiles for all to authenticated
using ((select private.has_permission('students.manage'))) with check ((select private.has_permission('students.manage')));
drop policy if exists "staff manage roles" on public.user_roles;
create policy "staff manage roles" on public.user_roles for all to authenticated
using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));
drop policy if exists "staff manage settings" on public.site_settings;
create policy "staff manage settings" on public.site_settings for all to authenticated
using ((select private.has_permission('settings.manage'))) with check ((select private.has_permission('settings.manage')));

drop policy if exists "staff manage courses" on public.courses;
create policy "staff manage courses" on public.courses for all to authenticated using ((select private.has_permission('content.manage'))) with check ((select private.has_permission('content.manage')));
drop policy if exists "staff manage lessons" on public.lessons;
create policy "staff manage lessons" on public.lessons for all to authenticated using ((select private.has_permission('content.manage'))) with check ((select private.has_permission('content.manage')));
drop policy if exists "staff manage lesson content" on public.lesson_content;
create policy "staff manage lesson content" on public.lesson_content for all to authenticated using ((select private.has_permission('content.manage'))) with check ((select private.has_permission('content.manage')));
drop policy if exists "staff manage video assets" on public.video_assets;
create policy "staff manage video assets" on public.video_assets for all to authenticated using ((select private.has_permission('media.manage'))) with check ((select private.has_permission('media.manage')));
drop policy if exists "staff manage lesson resources" on public.lesson_resources;
create policy "staff manage lesson resources" on public.lesson_resources for all to authenticated using ((select private.has_permission('content.manage'))) with check ((select private.has_permission('content.manage')));

drop policy if exists "staff manage quizzes" on public.quizzes;
create policy "staff manage quizzes" on public.quizzes for all to authenticated using ((select private.has_permission('quiz.manage'))) with check ((select private.has_permission('quiz.manage')));
drop policy if exists "staff manage quiz questions" on public.quiz_questions;
create policy "staff manage quiz questions" on public.quiz_questions for all to authenticated using ((select private.has_permission('quiz.manage'))) with check ((select private.has_permission('quiz.manage')));
drop policy if exists "staff manage quiz options" on public.quiz_options;
create policy "staff manage quiz options" on public.quiz_options for all to authenticated using ((select private.has_permission('quiz.manage'))) with check ((select private.has_permission('quiz.manage')));
drop policy if exists "staff manage question bank" on public.question_bank;
create policy "staff manage question bank" on public.question_bank for all to authenticated using ((select private.has_permission('quiz.manage'))) with check ((select private.has_permission('quiz.manage')));
drop policy if exists "staff manage question options" on public.question_bank_options;
create policy "staff manage question options" on public.question_bank_options for all to authenticated using ((select private.has_permission('quiz.manage'))) with check ((select private.has_permission('quiz.manage')));

drop policy if exists "staff manage media assets" on public.media_assets;
create policy "staff manage media assets" on public.media_assets for all to authenticated using ((select private.has_permission('media.manage'))) with check ((select private.has_permission('media.manage')));
drop policy if exists "staff manage ai content drafts" on public.ai_content_drafts;
create policy "staff manage ai content drafts" on public.ai_content_drafts for all to authenticated using ((select private.has_permission('ai.generate'))) with check ((select private.has_permission('ai.generate')));

drop policy if exists "staff manage plans" on public.plans;
create policy "staff manage plans" on public.plans for all to authenticated using ((select private.has_permission('subscriptions.manage'))) with check ((select private.has_permission('subscriptions.manage')));
drop policy if exists "staff manage prices" on public.plan_prices;
create policy "staff manage prices" on public.plan_prices for all to authenticated using ((select private.has_permission('subscriptions.manage'))) with check ((select private.has_permission('subscriptions.manage')));
drop policy if exists "staff manage coupons" on public.coupons;
create policy "staff manage coupons" on public.coupons for all to authenticated using ((select private.has_permission('subscriptions.manage'))) with check ((select private.has_permission('subscriptions.manage')));
drop policy if exists "staff manage subscriptions" on public.subscriptions;
create policy "staff manage subscriptions" on public.subscriptions for all to authenticated using ((select private.has_permission('subscriptions.manage'))) with check ((select private.has_permission('subscriptions.manage')));
drop policy if exists "staff manage payments" on public.payments;
drop policy if exists "staff view payments" on public.payments;
create policy "staff view payments" on public.payments for select to authenticated using ((select private.has_permission('payments.view')));
drop policy if exists "staff manage payment events" on public.payment_events;
drop policy if exists "staff view payment events" on public.payment_events;
create policy "staff view payment events" on public.payment_events for select to authenticated using ((select private.has_permission('payments.view')));

drop policy if exists "staff manage lesson progress" on public.lesson_progress;
create policy "staff manage lesson progress" on public.lesson_progress for all to authenticated using ((select private.has_permission('students.manage'))) with check ((select private.has_permission('students.manage')));
drop policy if exists "staff manage course progress" on public.course_progress;
create policy "staff manage course progress" on public.course_progress for all to authenticated using ((select private.has_permission('students.manage'))) with check ((select private.has_permission('students.manage')));
drop policy if exists "staff manage quiz attempts" on public.quiz_attempts;
drop policy if exists "active users manage own quiz attempts" on public.quiz_attempts;
drop policy if exists "users view own quiz attempts" on public.quiz_attempts;
drop policy if exists "staff view quiz attempts" on public.quiz_attempts;
create policy "users view own quiz attempts" on public.quiz_attempts for select to authenticated using ((select auth.uid())=user_id and (select private.current_user_is_active()));
create policy "staff view quiz attempts" on public.quiz_attempts for select to authenticated using ((select private.has_permission('students.manage')));

drop policy if exists "staff view audit logs" on public.audit_logs;
create policy "staff view audit logs" on public.audit_logs for select to authenticated using ((select private.has_permission('audit.view')));

drop policy if exists "lesson_media_staff_select" on storage.objects;
create policy "lesson_media_staff_select" on storage.objects for select to authenticated
using (bucket_id = 'lesson-media' and (select private.has_permission('media.manage')));
drop policy if exists "lesson_media_staff_insert" on storage.objects;
create policy "lesson_media_staff_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'lesson-media' and (select private.has_permission('media.manage')));
drop policy if exists "lesson_media_staff_update" on storage.objects;
create policy "lesson_media_staff_update" on storage.objects for update to authenticated
using (bucket_id = 'lesson-media' and (select private.has_permission('media.manage')))
with check (bucket_id = 'lesson-media' and (select private.has_permission('media.manage')));
drop policy if exists "lesson_media_staff_delete" on storage.objects;
create policy "lesson_media_staff_delete" on storage.objects for delete to authenticated
using (bucket_id = 'lesson-media' and (select private.has_permission('media.manage')));

drop policy if exists "permissions visible to staff" on public.permissions;
create policy "permissions visible to staff" on public.permissions for select to authenticated using ((select private.is_admin()));
drop policy if exists "owner manages role permissions" on public.role_permissions;
create policy "owner manages role permissions" on public.role_permissions for all to authenticated using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));
drop policy if exists "owner manages user permissions" on public.user_permissions;
create policy "owner manages user permissions" on public.user_permissions for all to authenticated using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));

drop policy if exists "public feature flags viewable" on public.feature_flags;
create policy "public feature flags viewable" on public.feature_flags for select to anon, authenticated using (true);
drop policy if exists "settings managers manage feature flags" on public.feature_flags;
create policy "settings managers manage feature flags" on public.feature_flags for all to authenticated using ((select private.has_permission('settings.manage'))) with check ((select private.has_permission('settings.manage')));

drop policy if exists "published pages viewable" on public.cms_pages;
create policy "published pages viewable" on public.cms_pages for select to anon, authenticated using (status='published'::public.lesson_status);
drop policy if exists "settings managers manage pages" on public.cms_pages;
create policy "settings managers manage pages" on public.cms_pages for all to authenticated using ((select private.has_permission('settings.manage'))) with check ((select private.has_permission('settings.manage')));

drop policy if exists "entitled lesson blocks viewable" on public.lesson_blocks;
create policy "entitled lesson blocks viewable" on public.lesson_blocks for select to anon, authenticated
using (status='published'::public.lesson_status and (select private.can_access_lesson(lesson_id)));
drop policy if exists "content managers manage lesson blocks" on public.lesson_blocks;
create policy "content managers manage lesson blocks" on public.lesson_blocks for all to authenticated using ((select private.has_permission('content.manage'))) with check ((select private.has_permission('content.manage')));

-- Quizzes gained lifecycle state in this migration. Ensure draft/preview/
-- archived quizzes never become readable merely because their lesson is paid
-- or free-preview entitled.
drop policy if exists "entitled quizzes are viewable" on public.quizzes;
create policy "entitled quizzes are viewable" on public.quizzes for select to anon, authenticated
using (status='published'::public.lesson_status and (select private.can_access_lesson(lesson_id)));
drop policy if exists "entitled quiz questions are viewable" on public.quiz_questions;
create policy "entitled quiz questions are viewable" on public.quiz_questions for select to anon, authenticated
using (exists (
  select 1 from public.quizzes q
  where q.id=quiz_questions.quiz_id
    and q.status='published'::public.lesson_status
    and (select private.can_access_lesson(q.lesson_id))
));
drop policy if exists "entitled quiz options are viewable" on public.quiz_options;
create policy "entitled quiz options are viewable" on public.quiz_options for select to anon, authenticated
using (exists (
  select 1 from public.quiz_questions qq join public.quizzes q on q.id=qq.quiz_id
  where qq.id=quiz_options.question_id
    and q.status='published'::public.lesson_status
    and (select private.can_access_lesson(q.lesson_id))
));

drop policy if exists "entitled linked media metadata viewable" on public.media_assets;
create policy "entitled linked media metadata viewable" on public.media_assets for select to anon, authenticated
using (
  archived_at is null and (
    exists (
      select 1 from public.lesson_blocks lb
      where lb.media_asset_id = media_assets.id
        and lb.status = 'published'::public.lesson_status
        and (select private.can_access_lesson(lb.lesson_id))
    )
    or exists (
      select 1 from public.courses c
      where c.thumbnail_asset_id = media_assets.id
        and c.status = 'published'::public.course_status
    )
  )
);

drop policy if exists "entitled linked lesson media objects" on storage.objects;
create policy "entitled linked lesson media objects" on storage.objects for select to anon, authenticated
using (
  bucket_id = 'lesson-media' and exists (
    select 1
    from public.media_assets ma
    left join public.lesson_blocks lb on lb.media_asset_id = ma.id
    where ma.bucket_id = storage.objects.bucket_id
      and ma.storage_path = storage.objects.name
      and ma.archived_at is null
      and (
        (lb.status = 'published'::public.lesson_status and (select private.can_access_lesson(lb.lesson_id)))
        or exists (
          select 1 from public.courses c
          where c.thumbnail_asset_id = ma.id
            and c.status = 'published'::public.course_status
        )
      )
  )
);

drop policy if exists "media managers manage asset links" on public.media_asset_links;
create policy "media managers manage asset links" on public.media_asset_links for all to authenticated using ((select private.has_permission('media.manage'))) with check ((select private.has_permission('media.manage')));
drop policy if exists "content managers view versions" on public.content_versions;
create policy "content managers view versions" on public.content_versions for select to authenticated using ((select private.has_permission('content.manage')));

drop policy if exists "certificate managers manage settings" on public.course_certificate_settings;
create policy "certificate managers manage settings" on public.course_certificate_settings for all to authenticated using ((select private.has_permission('certificates.manage'))) with check ((select private.has_permission('certificates.manage')));
drop policy if exists "students view own certificates" on public.certificates;
create policy "students view own certificates" on public.certificates for select to authenticated using ((select auth.uid())=user_id and (select private.current_user_is_active()));
drop policy if exists "certificate managers view certificates" on public.certificates;
create policy "certificate managers view certificates" on public.certificates for select to authenticated using ((select private.has_permission('certificates.manage')));
drop policy if exists "certificate managers view events" on public.certificate_events;
create policy "certificate managers view events" on public.certificate_events for select to authenticated using ((select private.has_permission('certificates.manage')));

-- Permission-aware additions keep the existing staff policies intact for
-- backward compatibility while making new CMS operations database-authoritative.
drop policy if exists "permission audit viewers" on public.audit_logs;
create policy "permission audit viewers" on public.audit_logs for select to authenticated using ((select private.has_permission('audit.view')));

grant select on table public.feature_flags, public.cms_pages, public.lesson_blocks to anon;
grant select on table public.media_assets to anon;
grant select on table public.permissions, public.role_permissions, public.user_permissions,
  public.feature_flags, public.cms_pages, public.lesson_blocks, public.media_asset_links,
  public.content_versions, public.course_certificate_settings, public.certificates,
  public.certificate_events to authenticated;
grant insert, update, delete on table public.role_permissions, public.user_permissions,
  public.feature_flags, public.cms_pages, public.lesson_blocks, public.media_asset_links,
  public.course_certificate_settings to authenticated;

-- Owner-only server functions insert audit/version/certificate rows; clients
-- receive SELECT only and cannot forge historical records.
revoke insert, update, delete on table public.content_versions, public.certificates, public.certificate_events from anon, authenticated;

-- Correct answers remain server-only. Students receive safe option fields and
-- submit option IDs to the authoritative scoring RPC above.
revoke select on table public.quiz_options from anon, authenticated;
grant select (id,question_id,option_text,sort_order,created_at) on table public.quiz_options to anon, authenticated;

-- Allow CMS metadata updates on existing assets without making storage public.
grant update on table public.media_assets to authenticated;

-- Updated-at triggers for new mutable tables.
drop trigger if exists set_updated_at on public.feature_flags;
create trigger set_updated_at before update on public.feature_flags for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.cms_pages;
create trigger set_updated_at before update on public.cms_pages for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.lesson_blocks;
create trigger set_updated_at before update on public.lesson_blocks for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.media_assets;
create trigger set_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.course_certificate_settings;
create trigger set_updated_at before update on public.course_certificate_settings for each row execute function public.set_updated_at();

commit;
