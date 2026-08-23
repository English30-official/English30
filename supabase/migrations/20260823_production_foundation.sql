-- English30 production foundation
-- Applied to Supabase project uqcvcwlwuionjcjcpntq

begin;

alter function public.handle_new_user() set search_path = public, pg_catalog;
alter function public.is_admin() set search_path = public, pg_catalog;
alter function public.set_updated_at() set search_path = public, pg_catalog;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;

create index if not exists idx_course_progress_course_id on public.course_progress(course_id);
create index if not exists idx_courses_created_by on public.courses(created_by);
create index if not exists idx_payments_coupon_id on public.payments(coupon_id);
create index if not exists idx_payments_plan_price_id on public.payments(plan_price_id);
create index if not exists idx_payments_subscription_id on public.payments(subscription_id);
create index if not exists idx_subscriptions_plan_id on public.subscriptions(plan_id);

alter table public.courses add column if not exists title_ar text;
alter table public.courses add column if not exists title_en text;
alter table public.courses add column if not exists description_en text;
alter table public.courses add column if not exists level text;
alter table public.courses add column if not exists category text;
alter table public.courses add column if not exists category_ar text;
alter table public.courses add column if not exists duration_hours numeric;
alter table public.courses add column if not exists lessons_count integer not null default 0;
alter table public.courses add column if not exists rating numeric not null default 0;
alter table public.courses add column if not exists students_count integer not null default 0;
alter table public.courses add column if not exists image text;
alter table public.courses add column if not exists color text;
alter table public.courses add column if not exists is_free boolean not null default false;

alter table public.lessons add column if not exists title_ar text;
alter table public.lessons add column if not exists title_en text;
alter table public.lessons add column if not exists level text;
alter table public.lessons add column if not exists duration_minutes integer;
alter table public.lessons add column if not exists summary_ar text;
alter table public.lessons add column if not exists arabic_explanation text;
alter table public.lessons add column if not exists video_url text;
alter table public.lessons add column if not exists video_duration text;
alter table public.lessons add column if not exists video_title_ar text;
alter table public.lessons add column if not exists unit_number integer not null default 1;

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists level text;
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists xp_points integer not null default 0;
alter table public.profiles add column if not exists streak_days integer not null default 0;
alter table public.profiles add column if not exists last_active_at timestamptz;

create unique index if not exists ux_courses_slug on public.courses(slug);
create unique index if not exists ux_lessons_course_slug on public.lessons(course_id, slug);
create unique index if not exists ux_site_settings_key on public.site_settings(key);
create unique index if not exists ux_user_roles_user_role on public.user_roles(user_id, role);
create unique index if not exists ux_lesson_content_lesson_id on public.lesson_content(lesson_id);

create index if not exists idx_lessons_course_status_sort on public.lessons(course_id, status, sort_order);
create index if not exists idx_lesson_progress_user_lesson on public.lesson_progress(user_id, lesson_id);
create index if not exists idx_course_progress_user_course on public.course_progress(user_id, course_id);
create index if not exists idx_quizzes_lesson_active on public.quizzes(lesson_id, is_active);
create index if not exists idx_quiz_questions_quiz_sort on public.quiz_questions(quiz_id, sort_order);
create index if not exists idx_quiz_options_question_sort on public.quiz_options(question_id, sort_order);
create index if not exists idx_subscriptions_user_status on public.subscriptions(user_id, status);
create index if not exists idx_payments_user_created on public.payments(user_id, created_at desc);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

commit;
