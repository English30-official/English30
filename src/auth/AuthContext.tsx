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
  isSuspended: boolean;
  isPasswordRecovery: boolean;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName?: string): Promise<{ user: User | null; session: Session | null }>;
  resetPassword(email: string, redirectTo?: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  finishPasswordRecovery(): void;
  signOut(): Promise<void>;
  refreshRole(): Promise<void>;
  checkFirstOwnerClaimAvailability(): Promise<boolean>;
  claimFirstOwner(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    new URLSearchParams(window.location.search).get('recovery') === '1'
      || window.location.hash.includes('type=recovery')
  );
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const loadRole = async (nextSession: Session | null) => {
    if (!nextSession?.user) { setRole(null); setIsSuspended(false); return; }
    const [nextRole, suspended] = await Promise.all([
      authService.getRole(nextSession.user.id),
      authService.isSuspended(nextSession.user.id),
    ]);
    setRole(nextRole);
    setIsSuspended(suspended);
  };

  useEffect(() => {
    let mounted = true;
    const unsubscribe = authService.subscribe((nextSession, event) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(nextSession);
      void loadRole(nextSession)
        .catch((error) => { console.error('Unable to load account authorization', error); if (mounted) { setRole(null); setIsSuspended(Boolean(nextSession)); } })
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
    isSuspended,
    isPasswordRecovery,
    async signInWithPassword(email, password) { await authService.signIn(email, password); },
    async signUp(email, password, fullName = '') { return await authService.signUp(email, password, fullName); },
    async resetPassword(email, redirectTo) { await authService.resetPassword(email, redirectTo); },
    async updatePassword(password) { await authService.updatePassword(password); },
    finishPasswordRecovery() { setIsPasswordRecovery(false); },
    async signOut() { await authService.signOut(); },
    async refreshRole() { await loadRole(session); },
    async checkFirstOwnerClaimAvailability() {
      const availability = await authService.getFirstOwnerClaimAvailability();
      return availability.open && availability.eligible;
    },
    async claimFirstOwner() {
      await authService.claimFirstOwner();
      await loadRole(session);
    },
  }), [session, role, isLoading, isSuspended, isPasswordRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
