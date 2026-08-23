import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface FirstOwnerActivationProps {
  onClaimed: () => void;
}

export const FirstOwnerActivation: React.FC<FirstOwnerActivationProps> = ({ onClaimed }) => {
  const {
    session,
    isLoading,
    isStaff,
    isSuspended,
    checkFirstOwnerClaimAvailability,
    claimFirstOwner,
  } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsAvailable(false);
    setError('');

    if (isLoading || !session || isStaff || isSuspended) return () => { cancelled = true; };

    void checkFirstOwnerClaimAvailability()
      .then((available) => { if (!cancelled) setIsAvailable(available); })
      .catch(() => { if (!cancelled) setIsAvailable(false); });

    return () => { cancelled = true; };
  }, [session, isLoading, isStaff, isSuspended, checkFirstOwnerClaimAvailability]);

  if (!session || isLoading || isStaff || isSuspended || !isAvailable) return null;

  const activate = async () => {
    setBusy(true);
    setError('');
    try {
      await claimFirstOwner();
      onClaimed();
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : 'تعذر تفعيل حساب المالك.');
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-900 p-2.5 text-amber-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-slate-900">تفعيل حساب المالك الأول</h2>
            <p className="mt-1 text-sm text-slate-600">تم التحقق من أن هذا الحساب مؤهل، وأن تفعيل المالك ما زال متاحًا.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void activate()}
          className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'جارٍ التفعيل الآمن...' : 'تفعيل حساب المالك'}
        </button>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
    </section>
  );
};
