import { getSupabaseClient, isDevelopmentFallbackEnabled } from '../lib/supabase';

export type EntitlementReason =
  | 'staff'
  | 'free_preview'
  | 'active_subscription'
  | 'authentication_required'
  | 'suspended'
  | 'subscription_required'
  | 'not_available';

export interface LessonEntitlement {
  allowed: boolean;
  reason: EntitlementReason;
}

class EntitlementService {
  public async canAccessLesson(lessonId: string): Promise<LessonEntitlement> {
    if (isDevelopmentFallbackEnabled && !lessonId.match(/^[0-9a-f-]{36}$/i)) {
      return { allowed: true, reason: 'free_preview' };
    }

    const { data, error } = await getSupabaseClient()
      .rpc('check_lesson_entitlement', { p_lesson_id: lessonId })
      .maybeSingle();

    if (error) throw error;
    if (!data) return { allowed: false, reason: 'not_available' };
    const decision = data as { allowed: boolean; reason: string };
    return {
      allowed: decision.allowed === true,
      reason: (decision.reason as EntitlementReason) || 'not_available',
    };
  }
}

export const entitlementService = new EntitlementService();
