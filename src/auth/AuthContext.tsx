import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  isConfigured: boolean;
  isStaff: boolean;
  isOwner: boolean;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName?: string): Promise<void>;
  resetPassword(email: string, redirectTo?: string): Promise<void>;
  signOut(): Promise<void>;
  refreshRole(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const loadRole = async (nextSession: Session | null) => {
    if (!nextSession?.user) { setRole(null); return; }
    setRole(await authService.getRole(nextSession.user.id));
  };

  useEffect(() => {
    let mounted = true;
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      void loadRole(nextSession)
        .catch((error) => { console.error('Unable to load user role', error); if (mounted) setRole(null); })
        .finally(() => { if (mounted) setIsLoading(false); });
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    role,
    isLoading,
    isConfigured: isSupabaseConfigured,
    isStaff: role === 'owner' || role === 'admin',
    isOwner: role === 'owner',
    async signInWithPassword(email, password) { await authService.signIn(email, password); },
    async signUp(email, password, fullName = '') { await authService.signUp(email, password, fullName); },
    async resetPassword(email, redirectTo) { await authService.resetPassword(email, redirectTo); },
    async signOut() { await authService.signOut(); },
    async refreshRole() { await loadRole(session); },
  }), [session, role, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

