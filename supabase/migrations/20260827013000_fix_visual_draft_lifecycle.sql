-- Keep mutable editor state independent from the last published public snapshot.
-- Apply after 20260827010000_homepage_sections_campaigns.sql.

begin;

-- Section presentation metadata is versioned alongside config so draft edits and
-- draft reordering cannot change the public page before an explicit publish.
alter table public.homepage_section_versions
  add column if not exists section_type text,
  add column if not exists sort_order integer,
  add column if not exists enabled boolean;

update public.homepage_section_versions v
set section_type = coalesce(v.section_type, s.section_type),
    sort_order = coalesce(v.sort_order, s.sort_order),
    enabled = coalesce(v.enabled, s.enabled)
from public.homepage_sections s
where s.id = v.section_id
  and (v.section_type is null or v.sort_order is null or v.enabled is null);

alter table public.homepage_section_versions
  alter column section_type set not null,
  alter column sort_order set not null,
  alter column enabled set not null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'homepage_section_versions_section_type_check'
      and conrelid = 'public.homepage_section_versions'::regclass
  ) then
    alter table public.homepage_section_versions
      add constraint homepage_section_versions_section_type_check check (section_type in (
        'hero','announcement_bar','promotional_banner','image_carousel','featured_course',
        'course_grid','course_carousel','benefits','statistics','testimonials','video',
        'image_text_split','text_content','cta','faq','logos','trust_badges','countdown',
        'pricing_highlight','placement_test','certificate_promotion','app_promo',
        'blog_teaser','custom_safe'
      ));
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'homepage_section_versions_sort_order_check'
      and conrelid = 'public.homepage_section_versions'::regclass
  ) then
    alter table public.homepage_section_versions
      add constraint homepage_section_versions_sort_order_check
      check (sort_order >= 0 and sort_order < 10000);
  end if;
end;
$$;

-- archived_at remains the published visibility switch. draft_archived records
-- the editor's desired state so restoring an archive stays private until publish.
alter table public.homepage_sections
  add column if not exists draft_archived boolean not null default false;
alter table public.campaigns
  add column if not exists draft_archived boolean not null default false;

-- Normalize any accidental duplicate published versions before enforcing the
-- invariant that each entity has at most one published snapshot.
with ranked as (
  select id,
         row_number() over (partition by section_id order by version_number desc, id) as position
  from public.homepage_section_versions
  where status = 'published' and archived_at is null
)
update public.homepage_section_versions v
set status = 'archived', archived_at = coalesce(v.archived_at, now())
from ranked r
where v.id = r.id and r.position > 1;

with ranked as (
  select id,
         row_number() over (partition by campaign_id order by version_number desc, id) as position
  from public.campaign_versions
  where status = 'published' and archived_at is null
)
update public.campaign_versions v
set status = 'archived', archived_at = coalesce(v.archived_at, now())
from ranked r
where v.id = r.id and r.position > 1;

create unique index if not exists uq_homepage_section_one_published_version
  on public.homepage_section_versions(section_id)
  where status = 'published' and archived_at is null;
create index if not exists idx_homepage_section_versions_published_order
  on public.homepage_section_versions(sort_order, section_id)
  where status = 'published' and enabled and archived_at is null;
create unique index if not exists uq_campaign_one_published_version
  on public.campaign_versions(campaign_id)
  where status = 'published' and archived_at is null;
create index if not exists idx_campaign_versions_latest_published
  on public.campaign_versions(campaign_id, version_number desc)
  where status = 'published' and archived_at is null;

-- Existing snapshots predate placement versioning. Preserve the current set as
-- the migration baseline; all future saves write locations into each snapshot.
update public.campaign_versions v
set snapshot = v.snapshot || jsonb_build_object(
  'locations', coalesce((
    select jsonb_agg(cp.location order by cp.location)
    from public.campaign_placements cp
    where cp.campaign_id = v.campaign_id and cp.enabled
  ), '[]'::jsonb)
)
where not (v.snapshot ? 'locations');

create or replace function public.owner_save_homepage_section(
  p_section_id uuid,
  p_section_type text,
  p_sort_order integer,
  p_enabled boolean,
  p_config jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_section_id;
  v_version integer;
begin
  if not private.has_permission('homepage.manage') then
    raise exception using errcode = '42501', message = 'Homepage permission required';
  end if;
  if p_section_type not in (
    'hero','announcement_bar','promotional_banner','image_carousel','featured_course',
    'course_grid','course_carousel','benefits','statistics','testimonials','video',
    'image_text_split','text_content','cta','faq','logos','trust_badges','countdown',
    'pricing_highlight','placement_test','certificate_promotion','app_promo',
    'blog_teaser','custom_safe'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported homepage section type';
  end if;
  if p_sort_order < 0 or p_sort_order >= 10000
     or octet_length(coalesce(p_config, '{}'::jsonb)::text) > 200000
     or jsonb_typeof(coalesce(p_config, '{}'::jsonb)) <> 'object'
     or not private.visual_config_is_safe(coalesce(p_config, '{}'::jsonb)) then
    raise exception using errcode = '22023', message = 'Invalid or unsafe homepage configuration';
  end if;

  if v_id is null then
    insert into public.homepage_sections(
      section_type, sort_order, enabled, status, draft_archived, created_by, updated_by
    ) values (
      p_section_type, p_sort_order, coalesce(p_enabled, true), 'draft', false,
      (select auth.uid()), (select auth.uid())
    ) returning id into v_id;
  else
    perform 1 from public.homepage_sections where id = v_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Homepage section not found';
    end if;
    if (select draft_archived from public.homepage_sections where id = v_id) then
      raise exception using errcode = '55000', message = 'Restore the archived homepage section before editing';
    end if;
    update public.homepage_sections
    set section_type = p_section_type,
        sort_order = p_sort_order,
        enabled = coalesce(p_enabled, true),
        status = 'draft',
        updated_by = (select auth.uid())
    where id = v_id;
    update public.homepage_section_versions
    set status = 'archived', archived_at = now()
    where section_id = v_id and status in ('draft', 'preview');
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_version
  from public.homepage_section_versions
  where section_id = v_id;

  insert into public.homepage_section_versions(
    section_id, version_number, status, section_type, sort_order, enabled, config, created_by
  ) values (
    v_id, v_version, 'draft', p_section_type, p_sort_order, coalesce(p_enabled, true),
    coalesce(p_config, '{}'::jsonb), (select auth.uid())
  );

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'homepage_section_saved', 'homepage_sections', v_id,
    jsonb_build_object('section_type', p_section_type, 'version_number', v_version)
  );
  return v_id;
end;
$$;

create or replace function public.owner_publish_homepage()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version record;
begin
  if not private.has_permission('homepage.manage') then
    raise exception using errcode = '42501', message = 'Homepage permission required';
  end if;
  perform pg_advisory_xact_lock(hashtext('english30-homepage-publish'));

  for v_version in
    select distinct on (v.section_id)
      v.id, v.section_id, v.section_type, v.sort_order, v.enabled
    from public.homepage_section_versions v
    join public.homepage_sections s on s.id = v.section_id
    where v.status in ('draft', 'preview') and not s.draft_archived
    order by v.section_id, v.version_number desc, v.id
  loop
    perform 1 from public.homepage_sections where id = v_version.section_id for update;
    update public.homepage_section_versions
    set status = 'archived', archived_at = now()
    where section_id = v_version.section_id
      and status = 'published'
      and archived_at is null;
    update public.homepage_section_versions
    set status = 'published', published_at = now(), archived_at = null
    where id = v_version.id and status in ('draft', 'preview');
    if not found then
      raise exception using errcode = '40001', message = 'Homepage draft changed during publish';
    end if;
    update public.homepage_sections
    set section_type = v_version.section_type,
        sort_order = v_version.sort_order,
        enabled = v_version.enabled,
        status = 'published',
        published_at = now(),
        archived_at = null,
        draft_archived = false,
        updated_by = (select auth.uid())
    where id = v_version.section_id;
  end loop;

  insert into public.audit_logs(user_id, action, entity_type, metadata)
  values (
    (select auth.uid()), 'homepage_published', 'homepage_sections',
    jsonb_build_object('published_at', now())
  );
  return true;
end;
$$;

create or replace function public.owner_archive_homepage_section(
  p_section_id uuid,
  p_archived boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.homepage_section_versions%rowtype;
  v_next integer;
begin
  if not private.has_permission('homepage.manage') then
    raise exception using errcode = '42501', message = 'Homepage permission required';
  end if;
  perform 1 from public.homepage_sections where id = p_section_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Homepage section not found';
  end if;

  if p_archived then
    update public.homepage_sections
    set status = 'archived', archived_at = coalesce(archived_at, now()),
        draft_archived = true, updated_by = (select auth.uid())
    where id = p_section_id;
  else
    select * into v_source
    from public.homepage_section_versions
    where section_id = p_section_id
    order by version_number desc
    limit 1;
    if not found then
      raise exception using errcode = 'P0002', message = 'Homepage version not found';
    end if;
    update public.homepage_section_versions
    set status = 'archived', archived_at = now()
    where section_id = p_section_id and status in ('draft', 'preview');
    select coalesce(max(version_number), 0) + 1 into v_next
    from public.homepage_section_versions where section_id = p_section_id;
    insert into public.homepage_section_versions(
      section_id, version_number, status, section_type, sort_order, enabled, config, created_by
    ) values (
      p_section_id, v_next, 'draft', v_source.section_type, v_source.sort_order,
      v_source.enabled, v_source.config, (select auth.uid())
    );
    update public.homepage_sections
    set status = 'draft', draft_archived = false, updated_by = (select auth.uid())
    where id = p_section_id;
    -- archived_at deliberately remains set until owner_publish_homepage().
  end if;

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    case when p_archived then 'homepage_section_archived' else 'homepage_section_restored' end,
    'homepage_sections', p_section_id, '{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.owner_reorder_homepage_sections(p_section_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_index integer := 0;
  v_draft public.homepage_section_versions%rowtype;
  v_source public.homepage_section_versions%rowtype;
  v_next integer;
begin
  if not private.has_permission('homepage.manage') then
    raise exception using errcode = '42501', message = 'Homepage permission required';
  end if;

  foreach v_id in array coalesce(p_section_ids, '{}'::uuid[]) loop
    perform 1
    from public.homepage_sections
    where id = v_id and not draft_archived
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Homepage section not found or archived';
    end if;

    select * into v_draft
    from public.homepage_section_versions
    where section_id = v_id and status in ('draft', 'preview')
    order by version_number desc
    limit 1;

    if found then
      update public.homepage_section_versions
      set sort_order = v_index
      where id = v_draft.id;
    else
      select * into v_source
      from public.homepage_section_versions
      where section_id = v_id and status = 'published' and archived_at is null
      order by version_number desc
      limit 1;
      if not found then
        raise exception using errcode = 'P0002', message = 'Homepage section has no draft or published version';
      end if;
      select coalesce(max(version_number), 0) + 1 into v_next
      from public.homepage_section_versions where section_id = v_id;
      insert into public.homepage_section_versions(
        section_id, version_number, status, section_type, sort_order, enabled, config, created_by
      ) values (
        v_id, v_next, 'draft', v_source.section_type, v_index, v_source.enabled,
        v_source.config, (select auth.uid())
      );
    end if;

    update public.homepage_sections
    set sort_order = v_index, status = 'draft', updated_by = (select auth.uid())
    where id = v_id;
    v_index := v_index + 1;
  end loop;

  insert into public.audit_logs(user_id, action, entity_type, metadata)
  values (
    (select auth.uid()), 'homepage_sections_reordered', 'homepage_sections',
    jsonb_build_object('section_ids', to_jsonb(coalesce(p_section_ids, '{}'::uuid[])))
  );
  return true;
end;
$$;

create or replace function public.owner_restore_homepage_version(p_version_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.homepage_section_versions%rowtype;
  v_next integer;
begin
  if not private.has_permission('homepage.manage') then
    raise exception using errcode = '42501', message = 'Homepage permission required';
  end if;
  select * into v from public.homepage_section_versions where id = p_version_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Homepage version not found';
  end if;
  perform 1 from public.homepage_sections where id = v.section_id for update;
  update public.homepage_section_versions
  set status = 'archived', archived_at = now()
  where section_id = v.section_id and status in ('draft', 'preview');
  select coalesce(max(version_number), 0) + 1 into v_next
  from public.homepage_section_versions where section_id = v.section_id;
  insert into public.homepage_section_versions(
    section_id, version_number, status, section_type, sort_order, enabled, config, created_by
  ) values (
    v.section_id, v_next, 'draft', v.section_type, v.sort_order, v.enabled, v.config,
    (select auth.uid())
  );
  update public.homepage_sections
  set section_type = v.section_type,
      sort_order = v.sort_order,
      enabled = v.enabled,
      status = 'draft',
      draft_archived = false,
      updated_by = (select auth.uid())
  where id = v.section_id;
  -- archived_at is intentionally unchanged; the public snapshot is untouched.
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'homepage_version_restored', 'homepage_sections', v.section_id,
    jsonb_build_object('source_version_id', p_version_id, 'draft_version_number', v_next)
  );
  return true;
end;
$$;

create or replace function public.owner_save_campaign(
  p_campaign_id uuid,
  p_payload jsonb,
  p_locations text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_campaign_id;
  v_version integer;
  v_start timestamptz;
  v_end timestamptz;
  v_snapshot jsonb;
  v_locations text[];
begin
  if not private.has_permission('campaigns.manage') then
    raise exception using errcode = '42501', message = 'Campaign permission required';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 250000
     or not private.visual_config_is_safe(p_payload) then
    raise exception using errcode = '22023', message = 'Invalid or unsafe campaign configuration';
  end if;

  v_start := (p_payload->>'startAt')::timestamptz;
  v_end := (p_payload->>'endAt')::timestamptz;
  if v_start is null or v_end is null or v_end <= v_start then
    raise exception using errcode = '22023', message = 'Campaign dates are invalid';
  end if;
  select coalesce(array_agg(location order by location), '{}'::text[])
  into v_locations
  from (
    select distinct location
    from unnest(coalesce(p_locations, '{}'::text[])) as requested(location)
    where location in (
      'announcement_bar','homepage_hero','homepage_banner','homepage_midpage',
      'promotional_carousel','pricing','course','auth','popup','sticky_mobile'
    )
  ) valid_locations;

  if v_id is null then
    insert into public.campaigns(
      internal_name, public_title, subtitle, description, status, is_active, priority,
      start_at, end_at, timezone, preset, config, draft_archived, created_by, updated_by
    ) values (
      trim(p_payload->>'internalName'), coalesce(p_payload->>'publicTitle', ''),
      coalesce(p_payload->>'subtitle', ''), coalesce(p_payload->>'description', ''),
      'draft', coalesce((p_payload->>'isActive')::boolean, true),
      coalesce((p_payload->>'priority')::integer, 0), v_start, v_end,
      coalesce(p_payload->>'timezone', 'Asia/Riyadh'),
      coalesce(p_payload->>'preset', 'clean_modern'),
      coalesce(p_payload->'config', '{}'::jsonb), false,
      (select auth.uid()), (select auth.uid())
    ) returning id into v_id;
  else
    perform 1 from public.campaigns where id = v_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Campaign not found';
    end if;
    if (select draft_archived from public.campaigns where id = v_id) then
      raise exception using errcode = '55000', message = 'Restore the archived campaign before editing';
    end if;
    update public.campaigns
    set internal_name = trim(p_payload->>'internalName'),
        public_title = coalesce(p_payload->>'publicTitle', ''),
        subtitle = coalesce(p_payload->>'subtitle', ''),
        description = coalesce(p_payload->>'description', ''),
        status = 'draft',
        is_active = coalesce((p_payload->>'isActive')::boolean, true),
        priority = coalesce((p_payload->>'priority')::integer, 0),
        start_at = v_start,
        end_at = v_end,
        timezone = coalesce(p_payload->>'timezone', 'Asia/Riyadh'),
        preset = coalesce(p_payload->>'preset', 'clean_modern'),
        config = coalesce(p_payload->'config', '{}'::jsonb),
        updated_by = (select auth.uid())
    where id = v_id;
    update public.campaign_versions
    set status = 'archived', archived_at = now()
    where campaign_id = v_id and status in ('draft', 'preview');
  end if;

  v_snapshot := jsonb_build_object(
    'internalName', trim(p_payload->>'internalName'),
    'publicTitle', coalesce(p_payload->>'publicTitle', ''),
    'subtitle', coalesce(p_payload->>'subtitle', ''),
    'description', coalesce(p_payload->>'description', ''),
    'isActive', coalesce((p_payload->>'isActive')::boolean, true),
    'priority', coalesce((p_payload->>'priority')::integer, 0),
    'startAt', v_start,
    'endAt', v_end,
    'timezone', coalesce(p_payload->>'timezone', 'Asia/Riyadh'),
    'preset', coalesce(p_payload->>'preset', 'clean_modern'),
    'config', coalesce(p_payload->'config', '{}'::jsonb),
    'locations', to_jsonb(v_locations)
  );
  select coalesce(max(version_number), 0) + 1 into v_version
  from public.campaign_versions where campaign_id = v_id;
  insert into public.campaign_versions(
    campaign_id, version_number, status, snapshot, created_by
  ) values (
    v_id, v_version, 'draft', v_snapshot, (select auth.uid())
  );

  delete from public.campaign_placements where campaign_id = v_id;
  insert into public.campaign_placements(campaign_id, location)
  select v_id, location from unnest(v_locations) as placement(location);

  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'campaign_saved', 'campaigns', v_id,
    jsonb_build_object('version_number', v_version)
  );
  return v_id;
exception
  when invalid_text_representation then
    raise exception using errcode = '22023', message = 'Campaign date or numeric field is invalid';
end;
$$;

create or replace function public.owner_publish_campaign(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.campaign_versions%rowtype;
begin
  if not private.has_permission('campaigns.manage') then
    raise exception using errcode = '42501', message = 'Campaign permission required';
  end if;
  perform pg_advisory_xact_lock(hashtext('english30-campaign-publish'));
  perform 1
  from public.campaigns
  where id = p_campaign_id and not draft_archived
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found or archived';
  end if;
  select * into v_version
  from public.campaign_versions
  where campaign_id = p_campaign_id and status in ('draft', 'preview')
  order by version_number desc
  limit 1;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign draft not found';
  end if;

  update public.campaign_versions
  set status = 'archived', archived_at = now()
  where campaign_id = p_campaign_id
    and status = 'published'
    and archived_at is null;
  update public.campaign_versions
  set status = 'published', published_at = now(), archived_at = null
  where id = v_version.id and status in ('draft', 'preview');
  if not found then
    raise exception using errcode = '40001', message = 'Campaign draft changed during publish';
  end if;

  update public.campaigns
  set status = 'published', published_at = now(), archived_at = null,
      draft_archived = false, updated_by = (select auth.uid())
  where id = p_campaign_id;
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'campaign_published', 'campaigns', p_campaign_id,
    jsonb_build_object('published_at', now(), 'version_id', v_version.id)
  );
  return true;
end;
$$;

create or replace function public.owner_archive_campaign(
  p_campaign_id uuid,
  p_archived boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.campaign_versions%rowtype;
  v_next integer;
begin
  if not private.has_permission('campaigns.manage') then
    raise exception using errcode = '42501', message = 'Campaign permission required';
  end if;
  perform 1 from public.campaigns where id = p_campaign_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  if p_archived then
    update public.campaigns
    set status = 'archived', archived_at = coalesce(archived_at, now()),
        draft_archived = true, updated_by = (select auth.uid())
    where id = p_campaign_id;
  else
    select * into v_source
    from public.campaign_versions
    where campaign_id = p_campaign_id
    order by version_number desc
    limit 1;
    if not found then
      raise exception using errcode = 'P0002', message = 'Campaign version not found';
    end if;
    update public.campaign_versions
    set status = 'archived', archived_at = now()
    where campaign_id = p_campaign_id and status in ('draft', 'preview');
    select coalesce(max(version_number), 0) + 1 into v_next
    from public.campaign_versions where campaign_id = p_campaign_id;
    insert into public.campaign_versions(
      campaign_id, version_number, status, snapshot, created_by
    ) values (
      p_campaign_id, v_next, 'draft', v_source.snapshot, (select auth.uid())
    );
    update public.campaigns
    set status = 'draft', draft_archived = false, updated_by = (select auth.uid())
    where id = p_campaign_id;
    -- archived_at deliberately remains set until owner_publish_campaign().
  end if;
  return true;
end;
$$;

create or replace function public.owner_restore_campaign_version(p_version_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.campaign_versions%rowtype;
  p jsonb;
  v_next integer;
  v_locations text[];
begin
  if not private.has_permission('campaigns.manage') then
    raise exception using errcode = '42501', message = 'Campaign permission required';
  end if;
  select * into v from public.campaign_versions where id = p_version_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign version not found';
  end if;
  p := v.snapshot;
  perform 1 from public.campaigns where id = v.campaign_id for update;
  update public.campaign_versions
  set status = 'archived', archived_at = now()
  where campaign_id = v.campaign_id and status in ('draft', 'preview');
  select coalesce(max(version_number), 0) + 1 into v_next
  from public.campaign_versions where campaign_id = v.campaign_id;
  insert into public.campaign_versions(
    campaign_id, version_number, status, snapshot, created_by
  ) values (
    v.campaign_id, v_next, 'draft', p, (select auth.uid())
  );

  select coalesce(array_agg(location order by location), '{}'::text[])
  into v_locations
  from jsonb_array_elements_text(
    case when jsonb_typeof(p->'locations') = 'array' then p->'locations' else '[]'::jsonb end
  ) as restored(location);
  update public.campaigns
  set status = 'draft',
      internal_name = p->>'internalName',
      public_title = p->>'publicTitle',
      subtitle = p->>'subtitle',
      description = p->>'description',
      is_active = coalesce((p->>'isActive')::boolean, true),
      priority = coalesce((p->>'priority')::integer, 0),
      start_at = (p->>'startAt')::timestamptz,
      end_at = (p->>'endAt')::timestamptz,
      timezone = p->>'timezone',
      preset = p->>'preset',
      config = p->'config',
      draft_archived = false,
      updated_by = (select auth.uid())
  where id = v.campaign_id;
  delete from public.campaign_placements where campaign_id = v.campaign_id;
  insert into public.campaign_placements(campaign_id, location)
  select v.campaign_id, location from unnest(v_locations) as placement(location);
  -- archived_at is intentionally unchanged; the public snapshot is untouched.
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()), 'campaign_version_restored', 'campaigns', v.campaign_id,
    jsonb_build_object('source_version_id', p_version_id, 'draft_version_number', v_next)
  );
  return true;
end;
$$;

create or replace function public.get_published_homepage_sections()
returns table(
  id uuid,
  section_type text,
  sort_order integer,
  enabled boolean,
  config jsonb,
  version_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, v.section_type, v.sort_order, v.enabled, v.config, v.id
  from public.homepage_sections s
  join lateral (
    select published.id, published.section_type, published.sort_order,
           published.enabled, published.config
    from public.homepage_section_versions published
    where published.section_id = s.id
      and published.status = 'published'
      and published.archived_at is null
    order by published.version_number desc, published.id
    limit 1
  ) v on true
  where s.archived_at is null and v.enabled
  order by v.sort_order, s.id;
$$;

create or replace function public.get_active_campaigns(p_location text default null)
returns table(
  id uuid,
  internal_name text,
  public_title text,
  subtitle text,
  description text,
  priority integer,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  preset text,
  config jsonb,
  location text
)
language sql
stable
security definer
set search_path = ''
as $$
  with published_campaigns as (
    select
      c.id,
      v.snapshot,
      coalesce((v.snapshot->>'priority')::integer, 0) as priority,
      (v.snapshot->>'startAt')::timestamptz as start_at,
      (v.snapshot->>'endAt')::timestamptz as end_at
    from public.campaigns c
    join lateral (
      select published.snapshot
      from public.campaign_versions published
      where published.campaign_id = c.id
        and published.status = 'published'
        and published.archived_at is null
      order by published.version_number desc, published.id
      limit 1
    ) v on true
    where c.archived_at is null
  ), active_placements as (
    select
      campaign.*,
      placement.location,
      row_number() over (
        partition by placement.location
        order by campaign.priority desc, campaign.start_at desc, campaign.id
      ) as location_rank
    from published_campaigns campaign
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(campaign.snapshot->'locations') = 'array'
          then campaign.snapshot->'locations'
        else '[]'::jsonb
      end
    ) as placement(location)
    where coalesce((campaign.snapshot->>'isActive')::boolean, false)
      and campaign.start_at <= current_timestamp
      and campaign.end_at > current_timestamp
  )
  select
    campaign.id,
    coalesce(campaign.snapshot->>'internalName', ''),
    coalesce(campaign.snapshot->>'publicTitle', ''),
    coalesce(campaign.snapshot->>'subtitle', ''),
    coalesce(campaign.snapshot->>'description', ''),
    campaign.priority,
    campaign.start_at,
    campaign.end_at,
    coalesce(campaign.snapshot->>'timezone', 'Asia/Riyadh'),
    coalesce(campaign.snapshot->>'preset', 'clean_modern'),
    coalesce(campaign.snapshot->'config', '{}'::jsonb),
    campaign.location
  from active_placements campaign
  where (p_location is null or campaign.location = p_location)
    and (campaign.location <> 'homepage_hero' or campaign.location_rank = 1)
  order by campaign.priority desc, campaign.start_at desc, campaign.id;
$$;

-- Public access is RPC-only. Authenticated staff retain direct SELECT for the
-- editor, and the existing staff policies remain the authoritative RLS checks.
drop policy if exists homepage_sections_public_read on public.homepage_sections;
drop policy if exists homepage_section_versions_public_read on public.homepage_section_versions;
drop policy if exists campaigns_public_read on public.campaigns;
drop policy if exists campaign_placements_public_read on public.campaign_placements;

revoke select on table
  public.homepage_sections,
  public.homepage_section_versions,
  public.campaigns,
  public.campaign_placements,
  public.campaign_versions
from anon, authenticated;

grant select on table
  public.homepage_sections,
  public.homepage_section_versions,
  public.campaigns,
  public.campaign_placements,
  public.campaign_versions
to authenticated;

revoke all on function public.get_published_homepage_sections() from public, anon, authenticated;
revoke all on function public.get_active_campaigns(text) from public, anon, authenticated;
grant execute on function public.get_published_homepage_sections() to anon, authenticated;
grant execute on function public.get_active_campaigns(text) to anon, authenticated;

comment on table public.homepage_sections is
  'Mutable Owner editor state. Public homepage reads use only the latest published homepage_section_versions snapshot through RPC.';
comment on table public.campaigns is
  'Mutable Owner campaign editor state. Public scheduling and placements use only the published campaign_versions snapshot through RPC.';
comment on function public.get_published_homepage_sections() is
  'RPC-only public homepage projection from immutable published section snapshots.';
comment on function public.get_active_campaigns(text) is
  'RPC-only server-time campaign projection from published snapshots, including versioned placements and schedule.';

commit;
