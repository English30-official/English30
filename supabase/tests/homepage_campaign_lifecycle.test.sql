-- Run after all migrations with: supabase test db
-- The transaction is rolled back, so no test content survives.

begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'f0000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'visual-lifecycle-test@english30.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into public.profiles(id, full_name, email, is_active, is_suspended)
values (
  'f0000000-0000-4000-8000-000000000001', 'Visual lifecycle test owner',
  'visual-lifecycle-test@english30.invalid', true, false
)
on conflict (id) do update
set is_active = true, is_suspended = false;

insert into public.user_roles(user_id, role)
values ('f0000000-0000-4000-8000-000000000001', 'owner')
on conflict (user_id, role) do nothing;

insert into public.homepage_sections(
  id, section_type, sort_order, enabled, status, draft_archived, created_by, updated_by
) values
  (
    'f1000000-0000-4000-8000-000000000001', 'hero', 0, true, 'draft', false,
    'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'
  ),
  (
    'f1000000-0000-4000-8000-000000000002', 'cta', 1, true, 'draft', false,
    'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'
  );

insert into public.homepage_section_versions(
  id, section_id, version_number, status, section_type, sort_order, enabled, config, created_by
) values
  (
    'f1100000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000001', 1, 'draft', 'hero', 0, true,
    '{"title":"published hero v1"}'::jsonb, 'f0000000-0000-4000-8000-000000000001'
  ),
  (
    'f1100000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000002', 1, 'draft', 'cta', 1, true,
    '{"title":"published cta v1"}'::jsonb, 'f0000000-0000-4000-8000-000000000001'
  );

insert into public.campaigns(
  id, internal_name, public_title, subtitle, description, status, is_active, priority,
  start_at, end_at, timezone, preset, config, draft_archived, created_by, updated_by
) values (
  'f2000000-0000-4000-8000-000000000001',
  'published campaign v1', 'Published campaign v1', '', '', 'draft', true, 10,
  now() - interval '1 hour', now() + interval '1 hour', 'UTC', 'clean_modern',
  '{"marker":"published-v1"}'::jsonb, false,
  'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'
);

insert into public.campaign_placements(campaign_id, location)
values ('f2000000-0000-4000-8000-000000000001', 'homepage_banner');

insert into public.campaign_versions(
  id, campaign_id, version_number, status, snapshot, created_by
) values (
  'f2100000-0000-4000-8000-000000000001',
  'f2000000-0000-4000-8000-000000000001', 1, 'draft',
  jsonb_build_object(
    'internalName', 'published campaign v1',
    'publicTitle', 'Published campaign v1',
    'subtitle', '',
    'description', '',
    'isActive', true,
    'priority', 10,
    'startAt', now() - interval '1 hour',
    'endAt', now() + interval '1 hour',
    'timezone', 'UTC',
    'preset', 'clean_modern',
    'config', '{"marker":"published-v1"}'::jsonb,
    'locations', '["homepage_banner"]'::jsonb
  ),
  'f0000000-0000-4000-8000-000000000001'
);

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select public.owner_publish_homepage();
select public.owner_publish_campaign('f2000000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if (select config->>'title' from public.get_published_homepage_sections()
      where id = 'f1000000-0000-4000-8000-000000000001') <> 'published hero v1' then
    raise exception 'Initial homepage publish did not expose v1';
  end if;
  if not exists (
    select 1 from public.get_active_campaigns('homepage_banner')
    where id = 'f2000000-0000-4000-8000-000000000001'
      and config->>'marker' = 'published-v1'
  ) then
    raise exception 'Initial campaign publish did not expose v1';
  end if;
end;
$$;

set local role authenticated;
select public.owner_save_homepage_section(
  'f1000000-0000-4000-8000-000000000001',
  'hero', 0, true, '{"title":"draft hero v2"}'::jsonb
);
select public.owner_save_campaign(
  'f2000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'internalName', 'draft campaign v2',
    'publicTitle', 'Draft campaign v2',
    'subtitle', '',
    'description', '',
    'isActive', true,
    'priority', 99,
    'startAt', now() + interval '1 day',
    'endAt', now() + interval '2 days',
    'timezone', 'UTC',
    'preset', 'clean_modern',
    'config', '{"marker":"draft-v2"}'::jsonb
  ),
  array['homepage_hero']::text[]
);
reset role;

-- Saving mutable drafts must not alter either public projection.
do $$
begin
  if (select config->>'title' from public.get_published_homepage_sections()
      where id = 'f1000000-0000-4000-8000-000000000001') <> 'published hero v1' then
    raise exception 'Saving a homepage draft changed the public version';
  end if;
  if not exists (
    select 1 from public.get_active_campaigns('homepage_banner')
    where id = 'f2000000-0000-4000-8000-000000000001'
      and config->>'marker' = 'published-v1'
  ) then
    raise exception 'Campaign draft dates or placements changed the active published campaign';
  end if;
  if exists (
    select 1 from public.get_active_campaigns('homepage_hero')
    where id = 'f2000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Draft campaign placement leaked publicly';
  end if;
end;
$$;

set local role authenticated;
select public.owner_reorder_homepage_sections(array[
  'f1000000-0000-4000-8000-000000000002',
  'f1000000-0000-4000-8000-000000000001'
]::uuid[]);
reset role;

do $$
declare
  v_order uuid[];
begin
  select array_agg(id order by sort_order) into v_order
  from public.get_published_homepage_sections()
  where id in (
    'f1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002'
  );
  if v_order <> array[
    'f1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002'
  ]::uuid[] then
    raise exception 'Draft reorder changed public order';
  end if;
end;
$$;

set local role authenticated;
select public.owner_publish_homepage();
reset role;

do $$
declare
  v_order uuid[];
begin
  if (select config->>'title' from public.get_published_homepage_sections()
      where id = 'f1000000-0000-4000-8000-000000000001') <> 'draft hero v2' then
    raise exception 'Homepage publish did not atomically promote the latest draft';
  end if;
  select array_agg(id order by sort_order) into v_order
  from public.get_published_homepage_sections()
  where id in (
    'f1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002'
  );
  if v_order <> array[
    'f1000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000001'
  ]::uuid[] then
    raise exception 'Homepage publish did not promote draft order';
  end if;
end;
$$;

-- Restoring an old section version creates a draft only.
set local role authenticated;
select public.owner_restore_homepage_version('f1100000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if (select config->>'title' from public.get_published_homepage_sections()
      where id = 'f1000000-0000-4000-8000-000000000001') <> 'draft hero v2' then
    raise exception 'Restoring a homepage version changed public output before publish';
  end if;
end;
$$;

-- Publishing the campaign draft promotes its future schedule and new placement;
-- therefore the previously active campaign disappears only at explicit publish.
set local role authenticated;
select public.owner_publish_campaign('f2000000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if exists (
    select 1 from public.get_active_campaigns(null)
    where id = 'f2000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Campaign publish did not promote the future draft schedule';
  end if;
end;
$$;

-- Restoring the active v1 campaign remains private until it is republished.
set local role authenticated;
select public.owner_restore_campaign_version('f2100000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if exists (
    select 1 from public.get_active_campaigns(null)
    where id = 'f2000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Restoring a campaign version changed public output before publish';
  end if;
end;
$$;

set local role authenticated;
select public.owner_publish_campaign('f2000000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if not exists (
    select 1 from public.get_active_campaigns('homepage_banner')
    where id = 'f2000000-0000-4000-8000-000000000001'
      and config->>'marker' = 'published-v1'
  ) then
    raise exception 'Publishing a restored campaign draft did not recover v1';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.homepage_sections', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.homepage_section_versions', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.campaigns', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.campaign_placements', 'SELECT')
     or pg_catalog.has_table_privilege('anon', 'public.campaign_versions', 'SELECT') then
    raise exception 'Anonymous direct table SELECT is still granted';
  end if;

  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'homepage_sections', 'homepage_section_versions', 'campaigns',
        'campaign_placements', 'campaign_versions'
      )
      and ('anon' = any(roles) or policyname like '%public_read%')
  ) then
    raise exception 'A direct public read policy still exposes visual lifecycle tables';
  end if;
end;
$$;

rollback;
