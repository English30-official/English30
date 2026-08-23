import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

type AuthStateListener = (session: Session | null, event?: AuthChangeEvent) => void;

export interface FirstOwnerClaimAvailability {
  open: boolean;
  eligible: boolean;
}

class AuthService {
  private listeners = new Set<AuthStateListener>();
  private initialized = false;
  private roleCache = new Map<string, UserRole>();

  public async getSession() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  public async getUser(): Promise<User | null> {
    const s = await this.getSession();
    return s?.user ?? null;
  }

  public async signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data;
  }

  public async signUp(email: string, password: string, fullName: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) throw error;
    return data;
  }

  public async resetPassword(email: string, redirectTo?: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
  }

  public async updatePassword(password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error } = await getSupabaseClient().auth.updateUser({ password });
    if (error) throw error;
    return data;
  }

  public async isSuspended(userId: string): Promise<boolean> {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('is_suspended,is_active')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return !data || data.is_suspended === true || data.is_active === false;
  }

  public async getRole(userId?: string): Promise<UserRole | null> {
    if (!isSupabaseConfigured) return null;
    const user = userId ? null : await this.getUser();
    const id = userId ?? user?.id;
    if (!id) return null;
    if (this.roleCache.has(id)) return this.roleCache.get(id)!;
    const { data, error } = await getSupabaseClient().from('user_roles').select('role').eq('user_id', id);
    if (error) throw error;
    const roles = (data ?? []).map((row) => row.role as UserRole);
    const role: UserRole = roles.includes('owner') ? 'owner' : roles.includes('admin') ? 'admin' : 'student';
    this.roleCache.set(id, role);
    return role;
  }

  public async isStaff(userId?: string) {
    const r = await this.getRole(userId);
    return r === 'admin' || r === 'owner';
  }

  public async isOwner(userId?: string) {
    return (await this.getRole(userId)) === 'owner';
  }

  private async getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
    if (error && typeof error === 'object' && 'context' in error) {
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        const payload = await context.clone().json().catch(() => null) as { error?: unknown } | null;
        if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
      }
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  public async getFirstOwnerClaimAvailability(): Promise<FirstOwnerClaimAvailability> {
    if (!isSupabaseConfigured) return { open: false, eligible: false };
    const session = await this.getSession();
    if (!session?.access_token) throw new Error('يجب تسجيل الدخول أولاً للتحقق من إمكانية تفعيل حساب المالك.');

    const { data, error } = await getSupabaseClient().functions.invoke<FirstOwnerClaimAvailability>(
      'claim-first-owner',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    if (error) {
      throw new Error(await this.getFunctionErrorMessage(error, 'تعذر التحقق من حالة تفعيل المالك.'));
    }
    return {
      open: data?.open === true,
      eligible: data?.eligible === true,
    };
  }

  public async claimFirstOwner(): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const session = await this.getSession();
    if (!session?.access_token || !session.user) throw new Error('يجب تسجيل الدخول أولاً لتفعيل حساب المالك.');

    const { data, error } = await getSupabaseClient().functions.invoke<{ claimed?: boolean }>(
      'claim-first-owner',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      },
    );
    if (error) {
      const message = await this.getFunctionErrorMessage(error, 'تعذر تفعيل حساب المالك.');
      if (message.includes('already closed')) throw new Error('تم إغلاق تفعيل المالك لأن مالكًا أو مديرًا موجود بالفعل.');
      if (message.includes('not authorized')) throw new Error('هذا الحساب غير مصرح له بتفعيل حساب المالك.');
      if (message.includes('suspended')) throw new Error('لا يمكن للحساب الموقوف تفعيل حساب المالك.');
      throw new Error(message);
    }
    if (data?.claimed !== true) throw new Error('لم يؤكد الخادم نجاح تفعيل حساب المالك.');
    this.roleCache.delete(session.user.id);
  }

  public async signOut() {
    if (!isSupabaseConfigured) return;
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    this.roleCache.clear();
  }

  public subscribe(listener: AuthStateListener) {
    this.listeners.add(listener);
    if (!this.initialized && isSupabaseConfigured) {
      this.initialized = true;
      getSupabaseClient().auth.onAuthStateChange((event, session) => {
        if (session?.user) this.roleCache.delete(session.user.id);
        this.listeners.forEach((l) => l(session, event));
      });
    }
    void this.getSession().then(listener).catch(() => listener(null));
    return () => this.listeners.delete(listener);
  }
}

export const authService = new AuthService();
