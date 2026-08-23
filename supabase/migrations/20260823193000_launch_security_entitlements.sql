-- English30 paid-MVP launch security and entitlement reconciliation.
-- Additive/idempotent: does not drop tables, columns, enums, or production data.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.is_suspended = false
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_user_is_active()
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role in ('admin'::public.app_role, 'owner'::public.app_role)
    );
$$;

create or replace function private.lesson_entitlement_reason(p_lesson_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_is_free boolean;
  v_is_published boolean;
begin
  select
    (l.is_free or c.is_free),
    (l.status = 'published'::public.lesson_status and c.status = 'published'::public.course_status)
  into v_is_free, v_is_published
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.id = p_lesson_id;

  if not found or not v_is_published then
    if v_user_id is not null and private.is_admin() then
      return 'staff';
    end if;
    return 'not_available';
  end if;

  if v_user_id is not null and not private.current_user_is_active() then
    return 'suspended';
  end if;

  if v_user_id is not null and private.is_admin() then
    return 'staff';
  end if;

  if v_is_free then
    return 'free_preview';
  end if;

  if v_user_id is null then
    return 'authentication_required';
  end if;

  if exists (
    select 1
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id and p.is_active = true
    where s.user_id = v_user_id
      and s.status = 'active'::public.subscription_status
      and s.starts_at <= now()
      and (s.ends_at is null or s.ends_at > now())
  ) then
    return 'active_subscription';
  end if;

  return 'subscription_required';
end;
$$;

create or replace function private.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.lesson_entitlement_reason(p_lesson_id)
    in ('staff', 'free_preview', 'active_subscription');
$$;

-- A deliberately narrow public RPC: it returns only an access decision and
-- delegates all authorization to the private, database-enforced function.
create or replace function public.check_lesson_entitlement(p_lesson_id uuid)
returns table (allowed boolean, reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    reason in ('staff', 'free_preview', 'active_subscription') as allowed,
    reason
  from (select private.lesson_entitlement_reason(p_lesson_id) as reason) decision;
$$;

create or replace function public.validate_coupon(p_code text)
returns table (
  id uuid,
  code text,
  discount_percentage numeric,
  max_redemptions integer,
  redeemed_count integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.code, c.discount_value, c.max_redemptions, c.redeemed_count, c.expires_at
  from public.coupons c
  where private.current_user_is_active()
    and c.code = upper(trim(p_code))
    and c.is_active = true
    and c.discount_type = 'percentage'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_redemptions is null or c.redeemed_count < c.max_redemptions)
  limit 1;
$$;

revoke all on function private.current_user_is_active() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.lesson_entitlement_reason(uuid) from public, anon, authenticated;
revoke all on function private.can_access_lesson(uuid) from public, anon, authenticated;
revoke all on function public.check_lesson_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.validate_coupon(text) from public, anon, authenticated;

grant execute on function private.current_user_is_active() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.lesson_entitlement_reason(uuid) to anon, authenticated;
grant execute on function private.can_access_lesson(uuid) to anon, authenticated;
grant execute on function public.check_lesson_entitlement(uuid) to anon, authenticated;
grant execute on function public.validate_coupon(text) to authenticated;

create index if not exists idx_subscriptions_entitlement
  on public.subscriptions (user_id, status, starts_at, ends_at);
create unique index if not exists user_roles_single_owner_idx
  on public.user_roles ((role))
  where role = 'owner'::public.app_role;

-- The bootstrap Edge Function inserts the first owner with service-role
-- credentials. This trigger makes the check-and-claim one atomic transaction.
create or replace function private.guard_first_owner_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'owner'::public.app_role then
    perform pg_advisory_xact_lock(hashtextextended('english30:first-owner', 0));
    if exists (
      select 1
      from public.user_roles
      where role in ('owner'::public.app_role, 'admin'::public.app_role)
    ) then
      raise exception using
        errcode = '42501',
        message = 'English30 owner bootstrap is already closed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_first_owner_claim on public.user_roles;
create trigger guard_first_owner_claim
before insert on public.user_roles
for each row execute function private.guard_first_owner_claim();

revoke all on function private.guard_first_owner_claim() from public, anon, authenticated;

-- Prevent students from modifying suspension/activation and gamification
-- security fields through the otherwise legitimate own-profile update policy.
create or replace function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role'
     and not private.is_admin()
     and (
       new.is_active is distinct from old.is_active
       or new.is_suspended is distinct from old.is_suspended
       or new.xp_points is distinct from old.xp_points
       or new.streak_days is distinct from old.streak_days
     )
  then
    raise exception using
      errcode = '42501',
      message = 'Protected profile fields may only be changed by staff';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before update on public.profiles
for each row execute function private.protect_profile_security_fields();

revoke all on function private.protect_profile_security_fields() from public, anon, authenticated;

-- Reconcile the complete application policy set so a fresh database and the
-- existing production project converge on the same authorization model.
drop policy if exists "users view own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "staff manage profiles" on public.profiles;
create policy "users view own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "staff manage profiles" on public.profiles for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "users view own roles" on public.user_roles;
drop policy if exists "staff manage roles" on public.user_roles;
create policy "users view own roles" on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);
create policy "staff manage roles" on public.user_roles for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "public settings viewable" on public.site_settings;
drop policy if exists "staff manage settings" on public.site_settings;
create policy "public settings viewable" on public.site_settings for select to anon, authenticated using (true);
create policy "staff manage settings" on public.site_settings for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "published courses are viewable" on public.courses;
drop policy if exists "staff manage courses" on public.courses;
create policy "published courses are viewable" on public.courses for select to anon, authenticated
using (status = 'published'::public.course_status);
create policy "staff manage courses" on public.courses for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "staff manage lessons" on public.lessons;
drop policy if exists "staff manage lesson content" on public.lesson_content;
drop policy if exists "staff manage video assets" on public.video_assets;
drop policy if exists "staff manage lesson resources" on public.lesson_resources;
drop policy if exists "staff manage quizzes" on public.quizzes;
drop policy if exists "staff manage quiz questions" on public.quiz_questions;
drop policy if exists "staff manage quiz options" on public.quiz_options;
create policy "staff manage lessons" on public.lessons for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage lesson content" on public.lesson_content for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage video assets" on public.video_assets for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage lesson resources" on public.lesson_resources for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage quizzes" on public.quizzes for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage quiz questions" on public.quiz_questions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage quiz options" on public.quiz_options for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "active plans viewable" on public.plans;
drop policy if exists "staff manage plans" on public.plans;
drop policy if exists "active prices viewable" on public.plan_prices;
drop policy if exists "staff manage prices" on public.plan_prices;
create policy "active plans viewable" on public.plans for select to anon, authenticated using (is_active = true);
create policy "staff manage plans" on public.plans for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "active prices viewable" on public.plan_prices for select to anon, authenticated using (is_active = true);
create policy "staff manage prices" on public.plan_prices for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "staff manage coupons" on public.coupons;
create policy "staff manage coupons" on public.coupons for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "users view own subscriptions" on public.subscriptions;
drop policy if exists "staff manage subscriptions" on public.subscriptions;
create policy "users view own subscriptions" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "staff manage subscriptions" on public.subscriptions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "users view own payments" on public.payments;
drop policy if exists "staff manage payments" on public.payments;
create policy "users view own payments" on public.payments for select to authenticated using ((select auth.uid()) = user_id);
create policy "staff manage payments" on public.payments for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "staff manage lesson progress" on public.lesson_progress;
drop policy if exists "staff manage course progress" on public.course_progress;
drop policy if exists "staff manage quiz attempts" on public.quiz_attempts;
create policy "staff manage lesson progress" on public.lesson_progress for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage course progress" on public.course_progress for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage quiz attempts" on public.quiz_attempts for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "staff manage question bank" on public.question_bank;
drop policy if exists "staff manage question options" on public.question_bank_options;
create policy "staff manage question bank" on public.question_bank for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage question options" on public.question_bank_options for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "staff manage media assets" on public.media_assets;
drop policy if exists "staff manage ai content drafts" on public.ai_content_drafts;
drop policy if exists "staff manage payment events" on public.payment_events;
create policy "staff manage media assets" on public.media_assets for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage ai content drafts" on public.ai_content_drafts for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "staff manage payment events" on public.payment_events for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "staff view audit logs" on public.audit_logs;
create policy "staff view audit logs" on public.audit_logs for select to authenticated using ((select private.is_admin()));

-- Replace publication-only policies with entitlement-aware policies.
drop policy if exists "published lessons are viewable" on public.lessons;
drop policy if exists "lesson content viewable" on public.lesson_content;
drop policy if exists "video assets viewable" on public.video_assets;
drop policy if exists "lesson resources viewable" on public.lesson_resources;
drop policy if exists "published quizzes viewable" on public.quizzes;
drop policy if exists "quiz questions viewable" on public.quiz_questions;
drop policy if exists "quiz options viewable" on public.quiz_options;

create policy "entitled lessons are viewable"
on public.lessons for select to anon, authenticated
using ((select private.can_access_lesson(id)));

create policy "entitled lesson content is viewable"
on public.lesson_content for select to anon, authenticated
using ((select private.can_access_lesson(lesson_id)));

create policy "entitled video assets are viewable"
on public.video_assets for select to anon, authenticated
using ((select private.can_access_lesson(lesson_id)));

create policy "entitled lesson resources are viewable"
on public.lesson_resources for select to anon, authenticated
using ((select private.can_access_lesson(lesson_id)));

create policy "entitled quizzes are viewable"
on public.quizzes for select to anon, authenticated
using ((select private.can_access_lesson(lesson_id)));

create policy "entitled quiz questions are viewable"
on public.quiz_questions for select to anon, authenticated
using (exists (
  select 1 from public.quizzes q
  where q.id = quiz_questions.quiz_id
    and (select private.can_access_lesson(q.lesson_id))
));

create policy "entitled quiz options are viewable"
on public.quiz_options for select to anon, authenticated
using (exists (
  select 1
  from public.quiz_questions qq
  join public.quizzes q on q.id = qq.quiz_id
  where qq.id = quiz_options.question_id
    and (select private.can_access_lesson(q.lesson_id))
));

-- Suspended accounts cannot continue recording lesson/quiz activity.
drop policy if exists "users manage own lesson progress" on public.lesson_progress;
drop policy if exists "users manage own course progress" on public.course_progress;
drop policy if exists "users manage own quiz attempts" on public.quiz_attempts;

create policy "active users manage own lesson progress"
on public.lesson_progress for all to authenticated
using ((select auth.uid()) = user_id and (select private.current_user_is_active()))
with check ((select auth.uid()) = user_id and (select private.current_user_is_active()));

create policy "active users manage own course progress"
on public.course_progress for all to authenticated
using ((select auth.uid()) = user_id and (select private.current_user_is_active()))
with check ((select auth.uid()) = user_id and (select private.current_user_is_active()));

create policy "active users manage own quiz attempts"
on public.quiz_attempts for all to authenticated
using ((select auth.uid()) = user_id and (select private.current_user_is_active()))
with check ((select auth.uid()) = user_id and (select private.current_user_is_active()));

-- Normalize broad historical grants to the minimum operations used by the app.
revoke all privileges on table
  public.profiles, public.user_roles, public.site_settings,
  public.courses, public.lessons, public.lesson_content,
  public.video_assets, public.lesson_resources,
  public.quizzes, public.quiz_questions, public.quiz_options,
  public.plans, public.plan_prices, public.subscriptions,
  public.coupons, public.payments,
  public.lesson_progress, public.course_progress, public.quiz_attempts,
  public.question_bank, public.question_bank_options,
  public.media_assets, public.ai_content_drafts,
  public.payment_events, public.audit_logs
from anon, authenticated;

grant select on table
  public.site_settings, public.courses, public.lessons,
  public.lesson_content, public.video_assets, public.lesson_resources,
  public.quizzes, public.quiz_questions, public.quiz_options,
  public.plans, public.plan_prices
to anon;

grant select, insert, update, delete on table
  public.profiles, public.user_roles, public.site_settings,
  public.courses, public.lessons, public.lesson_content,
  public.video_assets, public.lesson_resources,
  public.quizzes, public.quiz_questions, public.quiz_options,
  public.plans, public.plan_prices, public.subscriptions,
  public.coupons, public.payments,
  public.lesson_progress, public.course_progress, public.quiz_attempts,
  public.question_bank, public.question_bank_options,
  public.media_assets, public.ai_content_drafts, public.payment_events
to authenticated;

grant select on table public.audit_logs to authenticated;

-- The media bucket is private; only staff can enumerate or sign its objects.
drop policy if exists "lesson_media_staff_select" on storage.objects;
create policy "lesson_media_staff_select"
on storage.objects for select to authenticated
using (bucket_id = 'lesson-media' and (select private.is_admin()));

comment on function public.check_lesson_entitlement(uuid) is
  'Returns the centralized, RLS-equivalent lesson access decision for the current JWT.';
