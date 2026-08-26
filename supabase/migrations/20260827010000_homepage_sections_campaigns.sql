-- English30 visual homepage sections and seasonal campaigns.
-- Additive only: no existing tables are recreated, no production data is
-- deleted, and this migration must be applied after the PR #8 migrations.

begin;

create or replace function private.visual_config_is_safe(p_value jsonb)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_child jsonb;
begin
  if p_value is null then return true; end if;
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in select key, value from jsonb_each(p_value) loop
      if lower(v_key) in ('html','rawhtml','css','js','javascript','script','onclick','onload') then
        return false;
      end if;
      if not private.visual_config_is_safe(v_child) then return false; end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select value from jsonb_array_elements(p_value) loop
      if not private.visual_config_is_safe(v_child) then return false; end if;
    end loop;
  end if;
  return true;
end;
$$;
revoke all on function private.visual_config_is_safe(jsonb) from public, anon, authenticated;

create or replace function private.validate_visual_theme_setting()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.key = 'theme' then
    if jsonb_typeof(new.value) <> 'object'
       or coalesce(new.value->>'primaryColor','') !~ '^#[0-9a-fA-F]{6}$'
       or coalesce(new.value->>'secondaryColor','') !~ '^#[0-9a-fA-F]{6}$'
       or coalesce(new.value->>'accentColor','') !~ '^#[0-9a-fA-F]{6}$'
       or coalesce(new.value->>'backgroundColor','') !~ '^#[0-9a-fA-F]{6}$'
       or coalesce(new.value->>'surfaceStyle','') not in ('plain','soft','glass')
       or coalesce(new.value->>'headingStyle','') not in ('modern','classic','compact')
       or coalesce(new.value->>'buttonStyle','') not in ('rounded','soft','pill')
       or coalesce(new.value->>'radiusPreset','') not in ('small','medium','large')
       or coalesce(new.value->>'shadowPreset','') not in ('none','soft','elevated')
       or coalesce(new.value->>'spacingPreset','') not in ('compact','comfortable','airy')
       or coalesce(new.value->>'maxWidthPreset','') not in ('narrow','standard','wide')
       or coalesce(new.value->>'fontFamily','') not in ('cairo','system') then
      raise exception using errcode='22023', message='Invalid visual theme configuration';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists validate_visual_theme_setting on public.site_settings;
create trigger validate_visual_theme_setting before insert or update on public.site_settings
for each row execute function private.validate_visual_theme_setting();

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null check (section_type in (
    'hero','announcement_bar','promotional_banner','image_carousel','featured_course',
    'course_grid','course_carousel','benefits','statistics','testimonials','video',
    'image_text_split','text_content','cta','faq','logos','trust_badges','countdown',
    'pricing_highlight','placement_test','certificate_promotion','app_promo',
    'blog_teaser','custom_safe'
  )),
  sort_order integer not null default 0 check (sort_order >= 0 and sort_order < 10000),
  enabled boolean not null default true,
  status public.lesson_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz
);

create table if not exists public.homepage_section_versions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.homepage_sections(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.lesson_status not null default 'draft',
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  unique(section_id, version_number),
  check (jsonb_typeof(config) = 'object')
);

create index if not exists idx_homepage_sections_public_order
  on public.homepage_sections(status, enabled, sort_order)
  where archived_at is null;
create index if not exists idx_homepage_section_versions_public
  on public.homepage_section_versions(section_id, status, version_number desc);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null check (length(trim(internal_name)) between 1 and 160),
  public_title text not null default '' check (length(public_title) <= 240),
  subtitle text not null default '' check (length(subtitle) <= 500),
  description text not null default '' check (length(description) <= 4000),
  status public.lesson_status not null default 'draft',
  is_active boolean not null default true,
  priority integer not null default 0 check (priority between -10000 and 10000),
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'Asia/Riyadh' check (timezone in ('Asia/Riyadh','UTC','Asia/Dubai')),
  preset text not null default 'clean_modern' check (preset in (
    'elegant_academic','bold_promotion','minimal','premium','saudi_national_day',
    'ramadan','black_friday','course_launch','clean_modern','youthful_learning',
    'dark_premium','light_minimal'
  )),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  check (end_at > start_at),
  check (jsonb_typeof(config) = 'object')
);

create table if not exists public.campaign_placements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  location text not null check (location in (
    'announcement_bar','homepage_hero','homepage_banner','homepage_midpage',
    'promotional_carousel','pricing','course','auth','popup','sticky_mobile'
  )),
  enabled boolean not null default true,
  placement_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(campaign_id, location),
  check (jsonb_typeof(placement_config) = 'object')
);

create table if not exists public.campaign_versions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.lesson_status not null default 'draft',
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  unique(campaign_id, version_number),
  check (jsonb_typeof(snapshot) = 'object')
);

create index if not exists idx_campaigns_public_window
  on public.campaigns(status, is_active, start_at, end_at, priority desc)
  where archived_at is null;
create index if not exists idx_campaign_placements_location
  on public.campaign_placements(location, campaign_id) where enabled;

insert into public.permissions(code, category, name_ar, description_ar) values
  ('homepage.manage','marketing','إدارة الصفحة الرئيسية','إدارة أقسام الصفحة الرئيسية وترتيبها ونشرها واستعادتها'),
  ('campaigns.manage','marketing','إدارة الحملات','إنشاء الحملات الموسمية وجدولتها ونشرها واستعادتها'),
  ('design.manage','marketing','إدارة التصميم','إدارة ألوان وقوالب العرض والخيارات المرئية الآمنة')
on conflict (code) do update set category=excluded.category, name_ar=excluded.name_ar, description_ar=excluded.description_ar;

create or replace function private.touch_homepage_section()
returns trigger language plpgsql security definer set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists set_homepage_section_updated_at on public.homepage_sections;
create trigger set_homepage_section_updated_at before update on public.homepage_sections
for each row execute function private.touch_homepage_section();
drop trigger if exists set_campaign_updated_at on public.campaigns;
create trigger set_campaign_updated_at before update on public.campaigns
for each row execute function private.touch_homepage_section();

create or replace function public.owner_save_homepage_section(
  p_section_id uuid,
  p_section_type text,
  p_sort_order integer,
  p_enabled boolean,
  p_config jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_section_id;
  v_version integer;
begin
  if not private.has_permission('homepage.manage') then raise exception using errcode='42501', message='Homepage permission required'; end if;
  if p_section_type not in ('hero','announcement_bar','promotional_banner','image_carousel','featured_course','course_grid','course_carousel','benefits','statistics','testimonials','video','image_text_split','text_content','cta','faq','logos','trust_badges','countdown','pricing_highlight','placement_test','certificate_promotion','app_promo','blog_teaser','custom_safe') then
    raise exception using errcode='22023', message='Unsupported homepage section type';
  end if;
  if p_sort_order < 0 or p_sort_order >= 10000 or octet_length(coalesce(p_config,'{}'::jsonb)::text) > 200000 or jsonb_typeof(coalesce(p_config,'{}'::jsonb)) <> 'object' or not private.visual_config_is_safe(coalesce(p_config,'{}'::jsonb)) then
    raise exception using errcode='22023', message='Invalid or unsafe homepage configuration';
  end if;
  if v_id is null then
    insert into public.homepage_sections(section_type,sort_order,enabled,status,created_by,updated_by)
    values(p_section_type,p_sort_order,coalesce(p_enabled,true),'draft',(select auth.uid()),(select auth.uid())) returning id into v_id;
  else
    update public.homepage_sections set section_type=p_section_type,sort_order=p_sort_order,enabled=coalesce(p_enabled,true),status='draft',archived_at=null,updated_by=(select auth.uid()) where id=v_id;
    if not found then raise exception using errcode='P0002', message='Homepage section not found'; end if;
    update public.homepage_section_versions set status='archived',archived_at=now() where section_id=v_id and status in ('draft','preview');
  end if;
  select coalesce(max(version_number),0)+1 into v_version from public.homepage_section_versions where section_id=v_id;
  insert into public.homepage_section_versions(section_id,version_number,status,config,created_by)
  values(v_id,v_version,'draft',coalesce(p_config,'{}'::jsonb),(select auth.uid()));
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),'homepage_section_saved','homepage_sections',v_id,jsonb_build_object('section_type',p_section_type,'version_number',v_version));
  return v_id;
end; $$;

create or replace function public.owner_publish_homepage()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_section record; v_version record;
begin
  if not private.has_permission('homepage.manage') then raise exception using errcode='42501', message='Homepage permission required'; end if;
  perform pg_advisory_xact_lock(hashtext('english30-homepage-publish'));
  for v_section in select * from public.homepage_sections where status in ('draft','preview') and archived_at is null order by sort_order, id loop
    select * into v_version from public.homepage_section_versions where section_id=v_section.id and status in ('draft','preview') order by version_number desc limit 1;
    if found then
      update public.homepage_section_versions set status='archived',archived_at=now() where section_id=v_section.id and status='published';
      update public.homepage_section_versions set status='published',published_at=now(),archived_at=null where id=v_version.id;
      update public.homepage_sections set status='published',published_at=now(),updated_by=(select auth.uid()) where id=v_section.id;
    end if;
  end loop;
  insert into public.audit_logs(user_id,action,entity_type,metadata)
  values((select auth.uid()),'homepage_published','homepage_sections',jsonb_build_object('published_at',now()));
  return true;
end; $$;

create or replace function public.owner_archive_homepage_section(p_section_id uuid, p_archived boolean default true)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('homepage.manage') then raise exception using errcode='42501', message='Homepage permission required'; end if;
  update public.homepage_sections set status=case when p_archived then 'archived'::public.lesson_status else 'draft'::public.lesson_status end,archived_at=case when p_archived then now() else null end,updated_by=(select auth.uid()) where id=p_section_id;
  if not found then raise exception using errcode='P0002', message='Homepage section not found'; end if;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata) values((select auth.uid()),case when p_archived then 'homepage_section_archived' else 'homepage_section_restored' end,'homepage_sections',p_section_id,'{}'::jsonb);
  return true;
end; $$;

create or replace function public.owner_reorder_homepage_sections(p_section_ids uuid[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_index integer := 0; v_config jsonb; v_version integer;
begin
  if not private.has_permission('homepage.manage') then raise exception using errcode='42501', message='Homepage permission required'; end if;
  foreach v_id in array coalesce(p_section_ids,'{}') loop
    if exists(select 1 from public.homepage_sections where id=v_id and status='published' and archived_at is null) then
      select v.config into v_config from public.homepage_section_versions v where v.section_id=v_id and v.status='published' order by v.version_number desc limit 1;
      update public.homepage_sections set sort_order=v_index,status='draft'::public.lesson_status,updated_by=(select auth.uid()) where id=v_id and archived_at is null;
      update public.homepage_section_versions set status='archived',archived_at=now() where section_id=v_id and status in ('draft','preview');
      select coalesce(max(version_number),0)+1 into v_version from public.homepage_section_versions where section_id=v_id;
      insert into public.homepage_section_versions(section_id,version_number,status,config,created_by) values(v_id,v_version,'draft',coalesce(v_config,'{}'::jsonb),(select auth.uid()));
    else
      update public.homepage_sections set sort_order=v_index,updated_by=(select auth.uid()) where id=v_id and archived_at is null;
    end if;
    v_index := v_index + 1;
  end loop;
  return true;
end; $$;

create or replace function public.owner_restore_homepage_version(p_version_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.homepage_section_versions%rowtype; v_next integer;
begin
  if not private.has_permission('homepage.manage') then raise exception using errcode='42501', message='Homepage permission required'; end if;
  select * into v from public.homepage_section_versions where id=p_version_id;
  if not found then raise exception using errcode='P0002', message='Homepage version not found'; end if;
  update public.homepage_section_versions set status='archived',archived_at=now() where section_id=v.section_id and status in ('draft','preview');
  select coalesce(max(version_number),0)+1 into v_next from public.homepage_section_versions where section_id=v.section_id;
  insert into public.homepage_section_versions(section_id,version_number,status,config,created_by)
  values(v.section_id,v_next,'draft',v.config,(select auth.uid()));
  update public.homepage_sections set status='draft',archived_at=null,updated_by=(select auth.uid()) where id=v.section_id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata) values((select auth.uid()),'homepage_version_restored','homepage_sections',v.section_id,jsonb_build_object('source_version_id',p_version_id));
  return true;
end; $$;

create or replace function public.owner_save_campaign(p_campaign_id uuid, p_payload jsonb, p_locations text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_campaign_id; v_version integer; v_start timestamptz; v_end timestamptz; v_snapshot jsonb;
begin
  if not private.has_permission('campaigns.manage') then raise exception using errcode='42501', message='Campaign permission required'; end if;
  if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 250000 or not private.visual_config_is_safe(p_payload) then raise exception using errcode='22023', message='Invalid or unsafe campaign configuration'; end if;
  v_start := (p_payload->>'startAt')::timestamptz; v_end := (p_payload->>'endAt')::timestamptz;
  if v_start is null or v_end is null or v_end <= v_start then raise exception using errcode='22023', message='Campaign dates are invalid'; end if;
  if v_id is null then
    insert into public.campaigns(internal_name,public_title,subtitle,description,status,is_active,priority,start_at,end_at,timezone,preset,config,created_by,updated_by)
    values(trim(p_payload->>'internalName'),coalesce(p_payload->>'publicTitle',''),coalesce(p_payload->>'subtitle',''),coalesce(p_payload->>'description',''),'draft',coalesce((p_payload->>'isActive')::boolean,true),coalesce((p_payload->>'priority')::integer,0),v_start,v_end,coalesce(p_payload->>'timezone','Asia/Riyadh'),coalesce(p_payload->>'preset','clean_modern'),coalesce(p_payload->'config','{}'::jsonb),(select auth.uid()),(select auth.uid())) returning id into v_id;
  else
    update public.campaigns set internal_name=trim(p_payload->>'internalName'),public_title=coalesce(p_payload->>'publicTitle',''),subtitle=coalesce(p_payload->>'subtitle',''),description=coalesce(p_payload->>'description',''),status='draft',is_active=coalesce((p_payload->>'isActive')::boolean,true),priority=coalesce((p_payload->>'priority')::integer,0),start_at=v_start,end_at=v_end,timezone=coalesce(p_payload->>'timezone','Asia/Riyadh'),preset=coalesce(p_payload->>'preset','clean_modern'),config=coalesce(p_payload->'config','{}'::jsonb),archived_at=null,updated_by=(select auth.uid()) where id=v_id;
    if not found then raise exception using errcode='P0002', message='Campaign not found'; end if;
    update public.campaign_versions set status='archived',archived_at=now() where campaign_id=v_id and status in ('draft','preview');
  end if;
  v_snapshot := jsonb_build_object('internalName',trim(p_payload->>'internalName'),'publicTitle',coalesce(p_payload->>'publicTitle',''),'subtitle',coalesce(p_payload->>'subtitle',''),'description',coalesce(p_payload->>'description',''),'isActive',coalesce((p_payload->>'isActive')::boolean,true),'priority',coalesce((p_payload->>'priority')::integer,0),'startAt',v_start,'endAt',v_end,'timezone',coalesce(p_payload->>'timezone','Asia/Riyadh'),'preset',coalesce(p_payload->>'preset','clean_modern'),'config',coalesce(p_payload->'config','{}'::jsonb));
  select coalesce(max(version_number),0)+1 into v_version from public.campaign_versions where campaign_id=v_id;
  insert into public.campaign_versions(campaign_id,version_number,status,snapshot,created_by) values(v_id,v_version,'draft',v_snapshot,(select auth.uid()));
  delete from public.campaign_placements where campaign_id=v_id;
  insert into public.campaign_placements(campaign_id,location) select v_id,location from unnest(coalesce(p_locations,'{}')) location where location in ('announcement_bar','homepage_hero','homepage_banner','homepage_midpage','promotional_carousel','pricing','course','auth','popup','sticky_mobile');
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata) values((select auth.uid()),'campaign_saved','campaigns',v_id,jsonb_build_object('version_number',v_version));
  return v_id;
exception when invalid_text_representation then raise exception using errcode='22023', message='Campaign date or numeric field is invalid';
end; $$;

create or replace function public.owner_publish_campaign(p_campaign_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_version record;
begin
  if not private.has_permission('campaigns.manage') then raise exception using errcode='42501', message='Campaign permission required'; end if;
  perform pg_advisory_xact_lock(hashtext('english30-campaign-publish'));
  select * into v_version from public.campaign_versions where campaign_id=p_campaign_id and status in ('draft','preview') order by version_number desc limit 1;
  if not found then raise exception using errcode='P0002', message='Campaign draft not found'; end if;
  update public.campaign_versions set status='archived',archived_at=now() where campaign_id=p_campaign_id and status='published';
  update public.campaign_versions set status='published',published_at=now(),archived_at=null where id=v_version.id;
  update public.campaigns set status='published',published_at=now(),archived_at=null,updated_by=(select auth.uid()) where id=p_campaign_id;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata) values((select auth.uid()),'campaign_published','campaigns',p_campaign_id,jsonb_build_object('published_at',now()));
  return true;
end; $$;

create or replace function public.owner_archive_campaign(p_campaign_id uuid, p_archived boolean default true)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('campaigns.manage') then raise exception using errcode='42501', message='Campaign permission required'; end if;
  update public.campaigns set status=case when p_archived then 'archived'::public.lesson_status else 'draft'::public.lesson_status end,archived_at=case when p_archived then now() else null end,updated_by=(select auth.uid()) where id=p_campaign_id;
  if not found then raise exception using errcode='P0002', message='Campaign not found'; end if;
  return true;
end; $$;

create or replace function public.owner_restore_campaign_version(p_version_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.campaign_versions%rowtype; p jsonb; v_next integer;
begin
  if not private.has_permission('campaigns.manage') then raise exception using errcode='42501', message='Campaign permission required'; end if;
  select * into v from public.campaign_versions where id=p_version_id;
  if not found then raise exception using errcode='P0002', message='Campaign version not found'; end if;
  p:=v.snapshot;
  update public.campaign_versions set status='archived',archived_at=now() where campaign_id=v.campaign_id and status in ('draft','preview');
  select coalesce(max(version_number),0)+1 into v_next from public.campaign_versions where campaign_id=v.campaign_id;
  insert into public.campaign_versions(campaign_id,version_number,status,snapshot,created_by) values(v.campaign_id,v_next,'draft',p,(select auth.uid()));
  update public.campaigns set status='draft',internal_name=p->>'internalName',public_title=p->>'publicTitle',subtitle=p->>'subtitle',description=p->>'description',is_active=coalesce((p->>'isActive')::boolean,true),priority=coalesce((p->>'priority')::integer,0),start_at=(p->>'startAt')::timestamptz,end_at=(p->>'endAt')::timestamptz,timezone=p->>'timezone',preset=p->>'preset',config=p->'config',archived_at=null,updated_by=(select auth.uid()) where id=v.campaign_id;
  return true;
end; $$;

create or replace function public.get_published_homepage_sections()
returns table(id uuid, section_type text, sort_order integer, enabled boolean, config jsonb, version_id uuid)
language sql stable security definer set search_path = '' as $$
  select s.id,s.section_type,s.sort_order,s.enabled,v.config,v.id
  from public.homepage_sections s join public.homepage_section_versions v on v.section_id=s.id and v.status='published'
  where s.status='published' and s.enabled and s.archived_at is null and v.archived_at is null
  order by s.sort_order,s.id;
$$;

create or replace function public.get_active_campaigns(p_location text default null)
returns table(id uuid, internal_name text, public_title text, subtitle text, description text, priority integer, start_at timestamptz, end_at timestamptz, timezone text, preset text, config jsonb, location text)
language sql stable security definer set search_path = '' as $$
  select c.id,c.internal_name,c.public_title,c.subtitle,c.description,c.priority,c.start_at,c.end_at,c.timezone,c.preset,c.config,cp.location
  from public.campaigns c join public.campaign_placements cp on cp.campaign_id=c.id and cp.enabled
  where c.status='published' and c.is_active and c.archived_at is null
    and c.start_at <= current_timestamp and c.end_at > current_timestamp
    and (p_location is null or cp.location=p_location)
    and (cp.location <> 'homepage_hero' or not exists (
      select 1 from public.campaigns c2
      join public.campaign_placements cp2 on cp2.campaign_id=c2.id and cp2.enabled and cp2.location='homepage_hero'
      where c2.status='published' and c2.is_active and c2.archived_at is null
        and c2.start_at <= current_timestamp and c2.end_at > current_timestamp
        and (c2.priority > c.priority or (c2.priority = c.priority and c2.id < c.id))
    ))
  order by c.priority desc,c.start_at desc,c.id;
$$;

-- Public reads are available only through the two server-time RPCs above.
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_versions enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_placements enable row level security;
alter table public.campaign_versions enable row level security;

drop policy if exists homepage_sections_public_read on public.homepage_sections;
create policy homepage_sections_public_read on public.homepage_sections for select to anon, authenticated using (status='published' and enabled and archived_at is null);
drop policy if exists homepage_sections_staff_read on public.homepage_sections;
create policy homepage_sections_staff_read on public.homepage_sections for select to authenticated using ((select private.has_permission('homepage.manage')));
drop policy if exists homepage_section_versions_public_read on public.homepage_section_versions;
create policy homepage_section_versions_public_read on public.homepage_section_versions for select to anon, authenticated using (status='published' and archived_at is null and exists(select 1 from public.homepage_sections s where s.id=section_id and s.status='published' and s.enabled and s.archived_at is null));
drop policy if exists homepage_section_versions_staff_read on public.homepage_section_versions;
create policy homepage_section_versions_staff_read on public.homepage_section_versions for select to authenticated using ((select private.has_permission('homepage.manage')));
drop policy if exists campaigns_public_read on public.campaigns;
create policy campaigns_public_read on public.campaigns for select to anon, authenticated using (status='published' and is_active and archived_at is null and start_at <= current_timestamp and end_at > current_timestamp);
drop policy if exists campaigns_staff_read on public.campaigns;
create policy campaigns_staff_read on public.campaigns for select to authenticated using ((select private.has_permission('campaigns.manage')));
drop policy if exists campaign_placements_public_read on public.campaign_placements;
create policy campaign_placements_public_read on public.campaign_placements for select to anon, authenticated using (enabled and exists(select 1 from public.campaigns c where c.id=campaign_id and c.status='published' and c.is_active and c.archived_at is null and c.start_at <= current_timestamp and c.end_at > current_timestamp));
drop policy if exists campaign_placements_staff_read on public.campaign_placements;
create policy campaign_placements_staff_read on public.campaign_placements for select to authenticated using ((select private.has_permission('campaigns.manage')));
drop policy if exists campaign_versions_staff_read on public.campaign_versions;
create policy campaign_versions_staff_read on public.campaign_versions for select to authenticated using ((select private.has_permission('campaigns.manage')));

revoke insert, update, delete on table public.homepage_sections, public.homepage_section_versions, public.campaigns, public.campaign_placements, public.campaign_versions from anon, authenticated;
grant select on table public.homepage_sections, public.homepage_section_versions, public.campaigns, public.campaign_placements, public.campaign_versions to anon, authenticated;
revoke all on function public.owner_save_homepage_section(uuid,text,integer,boolean,jsonb) from public,anon,authenticated;
revoke all on function public.owner_publish_homepage() from public,anon,authenticated;
revoke all on function public.owner_archive_homepage_section(uuid,boolean) from public,anon,authenticated;
revoke all on function public.owner_reorder_homepage_sections(uuid[]) from public,anon,authenticated;
revoke all on function public.owner_restore_homepage_version(uuid) from public,anon,authenticated;
revoke all on function public.owner_save_campaign(uuid,jsonb,text[]) from public,anon,authenticated;
revoke all on function public.owner_publish_campaign(uuid) from public,anon,authenticated;
revoke all on function public.owner_archive_campaign(uuid,boolean) from public,anon,authenticated;
revoke all on function public.owner_restore_campaign_version(uuid) from public,anon,authenticated;
revoke all on function public.get_published_homepage_sections() from public,anon,authenticated;
revoke all on function public.get_active_campaigns(text) from public,anon,authenticated;
grant execute on function public.owner_save_homepage_section(uuid,text,integer,boolean,jsonb) to authenticated;
grant execute on function public.owner_publish_homepage() to authenticated;
grant execute on function public.owner_archive_homepage_section(uuid,boolean) to authenticated;
grant execute on function public.owner_reorder_homepage_sections(uuid[]) to authenticated;
grant execute on function public.owner_restore_homepage_version(uuid) to authenticated;
grant execute on function public.owner_save_campaign(uuid,jsonb,text[]) to authenticated;
grant execute on function public.owner_publish_campaign(uuid) to authenticated;
grant execute on function public.owner_archive_campaign(uuid,boolean) to authenticated;
grant execute on function public.owner_restore_campaign_version(uuid) to authenticated;
grant execute on function public.get_published_homepage_sections() to anon,authenticated;
grant execute on function public.get_active_campaigns(text) to anon,authenticated;

comment on table public.homepage_sections is 'Controlled, ordered homepage sections; public content is exposed only from published versions.';
comment on table public.campaigns is 'Server-time scheduled marketing campaigns; public reads are limited to active windows.';

commit;
