import { PermissionCode, PermissionDefinition, StaffPermissionAssignment } from '../types';
import { getSupabaseClient } from '../lib/supabase';

class PermissionsService {
  async load(search = ''): Promise<{ definitions: PermissionDefinition[]; staff: StaffPermissionAssignment[] }> {
    const client = getSupabaseClient();
    const [{ data: definitions, error: definitionsError }, { data: members, error: membersError }] = await Promise.all([
      client.from('permissions').select('*').order('category').order('code'),
      client.rpc('owner_list_admin_users', { p_search: search.trim() || null }),
    ]);
    if (definitionsError) throw definitionsError;
    if (membersError) throw membersError;
    return {
      definitions: (definitions ?? []).filter((row: any) => row.code !== 'roles.manage').map((row: any) => ({
        code: row.code as PermissionCode, category: row.category, nameAr: row.name_ar,
        descriptionAr: row.description_ar ?? undefined,
      })),
      staff: (members ?? []).map((row: any): StaffPermissionAssignment => ({
        userId: row.user_id, fullName: row.full_name || 'مستخدم', email: row.email || '',
        roles: row.is_admin ? ['admin'] : [], permissions: row.permissions ?? {},
        isActive: row.is_active, isSuspended: row.is_suspended, lastActiveAt: row.last_active_at ?? undefined,
      })),
    };
  }

  async saveAdmin(userId: string, enabled: boolean, permissions: PermissionCode[]): Promise<void> {
    const { error } = await getSupabaseClient().rpc('owner_manage_admin', { p_user_id: userId, p_enabled: enabled, p_permissions: permissions });
    if (error) throw error;
  }
}

export const permissionsService = new PermissionsService();
