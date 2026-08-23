import React, { useState } from 'react';
import { authService } from '../services';

interface AuthViewProps { onAuthenticated: () => void; }

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'signin') {
        await authService.signIn(email.trim(), password);
        onAuthenticated();
      } else if (mode === 'signup') {
        const result = await authService.signUp(email.trim(), password, name.trim());
        if (result.session) {
          setMessage('تم إنشاء الحساب وتسجيل الدخول.');
          onAuthenticated();
        } else {
          setMessage('تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول.');
        }
      } else {
        await authService.resetPassword(email.trim());
        setMessage('أرسلنا رابط استعادة كلمة المرور إلى بريدك إذا كان الحساب موجودًا.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const claimOwner = async () => {
    setClaimBusy(true); setError(''); setMessage('');
    try {
      const claimed = await authService.claimFirstOwner();
      if (!claimed) {
        setError('تم إعداد مالك للمنصة مسبقًا. لا يمكن إنشاء مالك أول جديد.');
        return;
      }
      setMessage('تم تفعيل حسابك كمالك للمنصة.');
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تفعيل حساب المالك. سجّل الدخول أولًا.');
    } finally {
      setClaimBusy(false);
    }
  };

  return <div className="min-h-[70vh] flex items-center justify-center py-10"><div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg p-7" dir="rtl">
    <h1 className="text-2xl font-black text-slate-900 mb-2">{mode === 'signin' ? 'تسجيل الدخول' : mode === 'signup' ? 'إنشاء حساب' : 'استعادة كلمة المرور'}</h1>
    <p className="text-sm text-slate-500 mb-6">{mode === 'signup' ? 'ابدأ رحلة تعلم الإنجليزية مع English30.' : 'أدخل بيانات حسابك للمتابعة.'}</p>
    <form onSubmit={submit} className="space-y-4">
      {mode === 'signup' && <input required value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />}
      <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />
      {mode !== 'reset' && <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />}
      {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {message && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 text-sm">{message}</div>}
      <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl">{busy ? 'جارٍ التنفيذ...' : mode === 'signin' ? 'دخول' : mode === 'signup' ? 'إنشاء الحساب' : 'إرسال رابط الاستعادة'}</button>
    </form>
    <button onClick={claimOwner} disabled={claimBusy} className="mt-4 w-full border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 font-black py-3 rounded-xl text-xs">
      {claimBusy ? 'جارٍ التحقق...' : 'أنا المالك الأول — تفعيل حساب المالك'}
    </button>
    <p className="text-[11px] text-slate-400 text-center mt-2">لا يعمل هذا الخيار إلا إذا لم يوجد مالك أو مدير للمنصة مسبقًا.</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-bold text-indigo-600">
      {mode !== 'signin' && <button onClick={() => setMode('signin')}>تسجيل الدخول</button>}
      {mode !== 'signup' && <button onClick={() => setMode('signup')}>إنشاء حساب</button>}
      {mode !== 'reset' && <button onClick={() => setMode('reset')}>نسيت كلمة المرور؟</button>}
    </div>
  </div></div>;
};
