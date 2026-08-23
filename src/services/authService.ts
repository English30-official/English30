import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

type AuthStateListener = (session: Session | null) => void;

class AuthService {
  private listeners = new Set<AuthStateListener>();
  private initialized = false;
  private roleCache = new Map<string, UserRole>();

  public async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw error;
    return data.session;
  }

  public async getUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  }

  public async getRole(userId?: string): Promise<UserRole | null> {
    if (!isSupabaseConfigured) return null;
    const user = userId ? null : await this.getUser();
    const id = userId ?? user?.id;
    if (!id) return null;
    if (this.roleCache.has(id)) return this.roleCache.get(id)!;

    const { data, error } = await getSupabaseClient()
      .from('user_roles')
      .select('role')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const role = (data?.role as UserRole | undefined) ?? 'student';
    this.roleCache.set(id, role);
    return role;
  }

  public async isStaff(userId?: string): Promise<boolean> {
    const role = await this.getRole(userId);
    return role === 'admin' || role === 'owner';
  }

  public async isOwner(userId?: string): Promise<boolean> {
    return (await this.getRole(userId)) === 'owner';
  }

  public async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    this.roleCache.clear();
  }

  public subscribe(listener: AuthStateListener): () => void {
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
