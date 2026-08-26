import { AuditLogItem, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

type AuditListener = (logs: AuditLogItem[]) => void;

class AuditService {
  private listeners = new Set<AuditListener>();

  async getAuditLogs(): Promise<AuditLogItem[]> {
    if (!isSupabaseConfigured) return [];
    const client = getSupabaseClient();
    const { data: logs, error } = await client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    const actorIds = [...new Set((logs ?? []).map((log: any) => log.user_id).filter(Boolean))];
    const [profilesResult, rolesResult] = actorIds.length ? await Promise.all([
      client.from('profiles').select('id,full_name,email').in('id', actorIds),
      client.from('user_roles').select('user_id,role').in('user_id', actorIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (profilesResult.error) throw profilesResult.error;
    if (rolesResult.error) throw rolesResult.error;
    const profiles = new Map((profilesResult.data ?? []).map((profile: any) => [profile.id, profile]));
    const roles = new Map<string, UserRole>();
    for (const row of rolesResult.data ?? []) {
      const current = roles.get(row.user_id);
      if (!current || row.role === 'owner' || (row.role === 'admin' && current === 'student')) roles.set(row.user_id, row.role as UserRole);
    }
    return (logs ?? []).map((log: any) => {
      const profile: any = profiles.get(log.user_id);
      const metadata = log.metadata && typeof log.metadata === 'object' ? log.metadata : {};
      return {
        id: log.id,
        actorName: profile?.full_name || profile?.email || (log.user_id ? 'مستخدم إداري' : 'النظام'),
        actorRole: roles.get(log.user_id) ?? 'admin',
        action: log.action,
        entityType: log.entity_type || 'system',
        entityId: log.entity_id ?? undefined,
        entityName: String(metadata.title || metadata.key || metadata.permission_code || log.entity_type || 'سجل'),
        details: JSON.stringify(metadata),
        timestamp: log.created_at,
      };
    });
  }

  // Database triggers/RPCs create authoritative logs. Existing callers use
  // this compatibility method only to refresh the owner view after a write.
  async logAction(action: string, entityType: string, entityName: string, details: string): Promise<AuditLogItem> {
    const item: AuditLogItem = {
      id: crypto.randomUUID(), actorName: 'النظام', actorRole: 'admin', action,
      entityType, entityName, details, timestamp: new Date().toISOString(),
    };
    void this.refresh();
    return item;
  }

  subscribe(listener: AuditListener): () => void {
    this.listeners.add(listener);
    void this.getAuditLogs().then(listener).catch(() => listener([]));
    return () => { this.listeners.delete(listener); };
  }

  private async refresh() {
    try {
      const logs = await this.getAuditLogs();
      this.listeners.forEach((listener) => listener(logs));
    } catch {
      // The originating database action already surfaced its own error.
    }
  }
}

export const auditService = new AuditService();
