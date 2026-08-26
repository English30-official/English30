import { PermissionCode, PermissionDefinition, StaffPermissionAssignment, UserRole } from '../types';
import { getSupabaseClient } from '../lib/supabase';

class PermissionsService {
  async load(): Promise<{ definitions: PermissionDefinition[]; staff: StaffPermissionAssignment[] }> {
    const client = getSupabaseClient();
    const [{ data: definitions, error: definitionsError }, { data: roles, error: rolesError }, { data: overrides, error: overridesError }] = await Promise.all([
      client.from('permissions').select('*').order('category').order('code'),
      client.from('user_roles').select('user_id,role'),
      client.from('user_permissions').select('user_id,permission_code,granted'),
    ]);
    if (definitionsError) throw definitionsError;
    if (rolesError) throw rolesError;
    if (overridesError) throw overridesError;
    const { data: profiles, error: profilesError } = await client.from('profiles').select('id,full_name,email').order('created_at');
    if (profilesError) throw profilesError;
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const byUser = new Map<string, StaffPermissionAssignment>((profiles ?? []).map((profile: any) => [profile.id, {
      userId: profile.id, fullName: profile.full_name || 'مستخدم', email: profile.email || '', roles: [], permissions: {},
    }]));
    for (const role of roles ?? []) {
      const profile: any = profileMap.get(role.user_id);
      const item = byUser.get(role.user_id) ?? {
        userId: role.user_id, fullName: profile?.full_name || 'عضو فريق', email: profile?.email || '', roles: [], permissions: {},
      };
      item.roles.push(role.role as UserRole);
      byUser.set(role.user_id, item);
    }
    for (const override of overrides ?? []) {
      const item = byUser.get(override.user_id);
      if (item) item.permissions[override.permission_code as PermissionCode] = override.granted;
    }
    return {
      definitions: (definitions ?? []).map((row: any) => ({
        code: row.code as PermissionCode, category: row.category, nameAr: row.name_ar,
        descriptionAr: row.description_ar ?? undefined,
      })),
      staff: [...byUser.values()],
    };
  }

  async setPermission(userId: string, code: PermissionCode, granted: boolean | null): Promise<void> {
    const client = getSupabaseClient();
    if (granted === null) {
      const { error } = await client.from('user_permissions').delete().eq('user_id', userId).eq('permission_code', code);
      if (error) throw error;
      return;
    }
    const actorId = (await client.auth.getUser()).data.user?.id ?? null;
    const { error } = await client.from('user_permissions').upsert({
      user_id: userId, permission_code: code, granted, granted_by: actorId, granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,permission_code' });
    if (error) throw error;
  }

  async setAdminRole(userId: string, enabled: boolean): Promise<void> {
    const client = getSupabaseClient();
    if (enabled) {
      const { error } = await client.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
      if (error) throw error;
    } else {
      const { error } = await client.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (error) throw error;
    }
  }
}

export const permissionsService = new PermissionsService();
