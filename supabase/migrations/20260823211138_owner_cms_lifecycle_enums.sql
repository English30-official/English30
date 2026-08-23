-- Enum additions are isolated because PostgreSQL requires new enum values to be
-- committed before later migrations can safely use them.

alter type public.course_status add value if not exists 'preview' before 'published';
alter type public.lesson_status add value if not exists 'preview' before 'published';
alter type public.lesson_status add value if not exists 'archived' after 'published';
