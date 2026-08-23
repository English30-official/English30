import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

type AuthStateListener = (session: Session | null) => void;

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

  public async claimFirstOwner(): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const session = await this.getSession();
    if (!session) throw new Error('سجّل الدخول أولاً ثم فعّل حساب المالك.');
    const { data: { url } } = { data: { url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-first-owner` } };
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'تعذر تفعيل حساب المالك.');
    if (payload.claimed === true) {
      this.roleCache.delete(session.user.id);
      this.listeners.forEach((listener) => listener(session));
    }
    return payload.claimed === true;
  }

  public async getRole(userId?: string): Promise<UserRole | null> {
    if (!isSupabaseConfigured) return null;
    const user = userId ? null : await this.getUser();
    const id = userId ?? user?.id;
    if (!id) return null;
    if (this.roleCache.has(id)) return this.roleCache.get(id)!;
    const { data, error } = await getSupabaseClient().from('user_roles').select('role').eq('user_id', id).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (error) throw error;
    const role = (data?.role as UserRole | undefined) ?? 'student';
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
      getSupabaseClient().auth.onAuthStateChange((_event, session) => {
        if (session?.user) this.roleCache.delete(session.user.id);
        this.listeners.forEach((l) => l(session));
      });
    }
    void this.getSession().then(listener).catch(() => listener(null));
    return () => this.listeners.delete(listener);
  }
}

export const authService = new AuthService();
