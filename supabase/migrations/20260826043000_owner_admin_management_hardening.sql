-- Owner-only admin management and granular CMS permissions.
-- Additive and safe for the current production schema. This migration does
-- not recreate tables, delete application data, or weaken RLS.

begin;

insert into public.permissions (code, category, name_ar, description_ar) values
  ('pages.manage', 'platform', 'إدارة الصفحات وSEO', 'إدارة الصفحات القانونية وبياناتها الوصفية'),
  ('features.manage', 'platform', 'إدارة مفاتيح الميزات', 'تشغيل وتعطيل ميزات المنصة'),
  ('diagnostics.view', 'security', 'عرض التشخيصات', 'عرض حالة تكاملات المنصة الآمنة')
on conflict (code) do update set
  category=excluded.category, name_ar=excluded.name_ar, description_ar=excluded.description_ar;

-- Role and permission assignment is exclusively an Owner operation. Admins
-- receive only the capabilities explicitly selected by the Owner.
drop policy if exists "staff manage roles" on public.user_roles;
create policy "owner manages admin roles" on public.user_roles for all to authenticated
using ((select private.has_role('owner'::public.app_role)))
with check ((select private.has_role('owner'::public.app_role)));

drop policy if exists "owner manages role permissions" on public.role_permissions;
create policy "owner manages role permissions" on public.role_permissions for all to authenticated
using ((select private.has_role('owner'::public.app_role)))
with check ((select private.has_role('owner'::public.app_role)));

drop policy if exists "owner manages user permissions" on public.user_permissions;
create policy "owner manages user permissions" on public.user_permissions for all to authenticated
using ((select private.has_role('owner'::public.app_role)))
with check ((select private.has_role('owner'::public.app_role)));

revoke insert, update, delete on table public.user_roles, public.role_permissions, public.user_permissions from authenticated;

drop policy if exists "settings managers manage feature flags" on public.feature_flags;
create policy "feature managers manage feature flags" on public.feature_flags for all to authenticated
using ((select private.has_permission('features.manage')))
with check ((select private.has_permission('features.manage')));

drop policy if exists "settings managers manage pages" on public.cms_pages;
create policy "page managers manage pages" on public.cms_pages for all to authenticated
using ((select private.has_permission('pages.manage')))
with check ((select private.has_permission('pages.manage')));

drop policy if exists "content managers view versions" on public.content_versions;
create policy "content managers view versions" on public.content_versions for select to authenticated using (
  (entity_type in ('courses','lessons','lesson_content','lesson_blocks') and (select private.has_permission('content.manage')))
  or (entity_type='quizzes' and (select private.has_permission('quiz.manage')))
  or (entity_type='cms_pages' and (select private.has_permission('pages.manage')))
);

create or replace function public.restore_content_version(p_version_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v public.content_versions%rowtype; s jsonb;
begin
  select * into v from public.content_versions where id=p_version_id;
  if not found then raise exception using errcode='P0002', message='Version not found'; end if;
  if (v.entity_type in ('courses','lessons','lesson_content','lesson_blocks') and not private.has_permission('content.manage'))
    or (v.entity_type='quizzes' and not private.has_permission('quiz.manage'))
    or (v.entity_type='cms_pages' and not private.has_permission('pages.manage')) then
    raise exception using errcode='42501', message='Permission required to restore this content type';
  end if;
  s:=v.snapshot;
  case v.entity_type
    when 'courses' then update public.courses set slug=s->>'slug',title=s->>'title',title_ar=s->>'title_ar',title_en=s->>'title_en',description=s->>'description',description_en=s->>'description_en',thumbnail_url=s->>'thumbnail_url',image=s->>'image',status=(s->>'status')::public.course_status,level=s->>'level',category=s->>'category',category_ar=s->>'category_ar',duration_hours=nullif(s->>'duration_hours','')::numeric,color=s->>'color',thumbnail_asset_id=nullif(s->>'thumbnail_asset_id','')::uuid,archived_at=nullif(s->>'archived_at','')::timestamptz,is_free=coalesce((s->>'is_free')::boolean,false),updated_by=(select auth.uid()) where id=v.entity_id;
    when 'lessons' then update public.lessons set course_id=(s->>'course_id')::uuid,slug=s->>'slug',title=s->>'title',title_ar=s->>'title_ar',title_en=s->>'title_en',description=s->>'description',summary_ar=s->>'summary_ar',arabic_explanation=s->>'arabic_explanation',status=(s->>'status')::public.lesson_status,sort_order=coalesce((s->>'sort_order')::integer,0),estimated_minutes=nullif(s->>'estimated_minutes','')::integer,duration_minutes=nullif(s->>'duration_minutes','')::integer,level=s->>'level',unit_number=coalesce((s->>'unit_number')::integer,1),video_url=s->>'video_url',video_duration=s->>'video_duration',video_title_ar=s->>'video_title_ar',archived_at=nullif(s->>'archived_at','')::timestamptz,is_free=coalesce((s->>'is_free')::boolean,false),updated_by=(select auth.uid()) where id=v.entity_id;
    when 'lesson_content' then update public.lesson_content set content=s->'content' where id=v.entity_id;
    when 'lesson_blocks' then update public.lesson_blocks set block_type=s->>'block_type',title_ar=s->>'title_ar',title_en=s->>'title_en',content=s->'content',media_asset_id=nullif(s->>'media_asset_id','')::uuid,quiz_id=nullif(s->>'quiz_id','')::uuid,order_index=coalesce((s->>'order_index')::integer,0),status=(s->>'status')::public.lesson_status,archived_at=nullif(s->>'archived_at','')::timestamptz,updated_by=(select auth.uid()) where id=v.entity_id;
    when 'quizzes' then update public.quizzes set title=s->>'title',description=s->>'description',passing_score=(s->>'passing_score')::numeric,max_attempts=nullif(s->>'max_attempts','')::integer,status=(s->>'status')::public.lesson_status,is_final=coalesce((s->>'is_final')::boolean,false),archived_at=nullif(s->>'archived_at','')::timestamptz where id=v.entity_id;
    when 'cms_pages' then update public.cms_pages set slug=s->>'slug',page_type=s->>'page_type',title_ar=s->>'title_ar',title_en=s->>'title_en',body=s->'body',status=(s->>'status')::public.lesson_status,seo_title=s->>'seo_title',seo_description=s->>'seo_description',open_graph_asset_id=nullif(s->>'open_graph_asset_id','')::uuid,published_at=nullif(s->>'published_at','')::timestamptz,archived_at=nullif(s->>'archived_at','')::timestamptz,updated_by=(select auth.uid()) where id=v.entity_id;
    else raise exception using errcode='22023', message='Unsupported version entity';
  end case;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata) values((select auth.uid()),'restore_version',v.entity_type,v.entity_id,jsonb_build_object('version_id',v.id,'version_number',v.version_number));
  return true;
end;
$$;
revoke all on function public.restore_content_version(uuid) from public, anon, authenticated;
grant execute on function public.restore_content_version(uuid) to authenticated;

create or replace function public.owner_list_admin_users(p_search text default null)
returns table (
  user_id uuid, full_name text, email text, is_active boolean,
  is_suspended boolean, last_active_at timestamptz, is_admin boolean,
  permissions jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('owner'::public.app_role) then
    raise exception using errcode='42501', message='Owner access required';
  end if;
  if p_search is not null and length(trim(p_search)) > 200 then
    raise exception using errcode='22023', message='Search text is too long';
  end if;
  return query
  select p.id, coalesce(p.full_name,''), coalesce(p.email,''), coalesce(p.is_active,false),
    coalesce(p.is_suspended,false), p.last_active_at,
    exists(select 1 from public.user_roles ur where ur.user_id=p.id and ur.role='admin'::public.app_role),
    coalesce((select jsonb_object_agg(pd.code, coalesce(up.granted, exists(
        select 1 from public.user_roles inherited_role
        join public.role_permissions inherited_permission on inherited_permission.role=inherited_role.role
        where inherited_role.user_id=p.id and inherited_permission.permission_code=pd.code
      ), false))
      from public.permissions pd
      left join public.user_permissions up on up.user_id=p.id and up.permission_code=pd.code
      where pd.code <> 'roles.manage'), '{}'::jsonb)
  from public.profiles p
  where not exists(select 1 from public.user_roles own where own.user_id=p.id and own.role='owner'::public.app_role)
    and (
      exists(select 1 from public.user_roles adm where adm.user_id=p.id and adm.role='admin'::public.app_role)
      or nullif(trim(p_search),'') is not null and (p.email ilike '%'||trim(p_search)||'%' or p.full_name ilike '%'||trim(p_search)||'%')
    )
  order by exists(select 1 from public.user_roles adm where adm.user_id=p.id and adm.role='admin'::public.app_role) desc,
    p.last_active_at desc nulls last
  limit 50;
end;
$$;

create or replace function public.owner_manage_admin(p_user_id uuid, p_enabled boolean, p_permissions text[] default '{}')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare invalid_permissions text[];
begin
  if not private.has_role('owner'::public.app_role) then
    raise exception using errcode='42501', message='Owner access required';
  end if;
  if p_user_id is null or p_user_id=(select auth.uid()) then
    raise exception using errcode='22023', message='The Owner account cannot be managed as an Admin';
  end if;
  perform pg_advisory_xact_lock(hashtext('english30-owner-admin-management'));
  if not exists(select 1 from public.profiles p where p.id=p_user_id) then
    raise exception using errcode='P0002', message='Registered user not found';
  end if;
  if exists(select 1 from public.user_roles ur where ur.user_id=p_user_id and ur.role='owner'::public.app_role) then
    raise exception using errcode='42501', message='The Owner role cannot be modified';
  end if;
  if p_enabled and exists(select 1 from public.profiles p where p.id=p_user_id and (not coalesce(p.is_active,false) or coalesce(p.is_suspended,false))) then
    raise exception using errcode='42501', message='Suspended or inactive users cannot be granted Admin access';
  end if;
  select array_agg(candidate) into invalid_permissions
  from unnest(coalesce(p_permissions,'{}')) candidate
  where candidate='roles.manage' or not exists(select 1 from public.permissions pd where pd.code=candidate);
  if invalid_permissions is not null then
    raise exception using errcode='22023', message='One or more requested permissions are not assignable';
  end if;

  if p_enabled then
    insert into public.user_roles(user_id,role) values(p_user_id,'admin'::public.app_role)
    on conflict(user_id,role) do nothing;
    delete from public.user_permissions where user_id=p_user_id;
    insert into public.user_permissions(user_id,permission_code,granted,granted_by,granted_at)
    select p_user_id, pd.code, pd.code=any(coalesce(p_permissions,'{}')), (select auth.uid()), now()
    from public.permissions pd where pd.code <> 'roles.manage';
  else
    delete from public.user_permissions where user_id=p_user_id;
    delete from public.user_roles where user_id=p_user_id and role='admin'::public.app_role;
  end if;

  insert into public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),case when p_enabled then 'admin_access_updated' else 'admin_access_revoked' end,
    'profiles',p_user_id,jsonb_build_object('enabled',p_enabled,'permissions',coalesce(p_permissions,'{}')));
  return true;
end;
$$;

revoke all on function public.owner_list_admin_users(text) from public, anon, authenticated;
revoke all on function public.owner_manage_admin(uuid,boolean,text[]) from public, anon, authenticated;
grant execute on function public.owner_list_admin_users(text) to authenticated;
grant execute on function public.owner_manage_admin(uuid,boolean,text[]) to authenticated;

commit;
