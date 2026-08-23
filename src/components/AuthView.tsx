import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

interface AuthViewProps {
  onAuthenticated: () => void;
  recoveryMode?: boolean;
}

type AuthMode = 'signin' | 'signup' | 'reset' | 'update-password';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, recoveryMode = false }) => {
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>(recoveryMode ? 'update-password' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recoveryMode) setMode('update-password');
  }, [recoveryMode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signin') {
        await auth.signInWithPassword(email.trim(), password);
        onAuthenticated();
      } else if (mode === 'signup') {
        const result = await auth.signUp(email.trim(), password, name.trim());
        if (result.session) {
          setMessage('تم إنشاء الحساب وتسجيل الدخول.');
          onAuthenticated();
        } else {
          setMessage('تم إنشاء الحساب. افتح رسالة التأكيد ثم سجّل الدخول.');
        }
      } else if (mode === 'reset') {
        const redirectTo = `${window.location.origin}${window.location.pathname}?recovery=1`;
        await auth.resetPassword(email.trim(), redirectTo);
        setMessage('أرسلنا رابط استعادة كلمة المرور إلى بريدك إذا كان الحساب موجودًا.');
      } else {
        if (password.length < 8) throw new Error('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.');
        if (password !== confirmPassword) throw new Error('كلمتا المرور غير متطابقتين.');
        await auth.updatePassword(password);
        auth.finishPasswordRecovery();
        setMessage('تم تحديث كلمة المرور بنجاح. يمكنك متابعة استخدام حسابك.');
        setPassword('');
        setConfirmPassword('');
        window.history.replaceState({}, document.title, window.location.pathname);
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signin' ? 'تسجيل الدخول' : mode === 'signup' ? 'إنشاء حساب' : mode === 'reset' ? 'استعادة كلمة المرور' : 'تعيين كلمة مرور جديدة';

  return <div className="min-h-[70vh] flex items-center justify-center py-10"><div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg p-7" dir="rtl">
    <h1 className="text-2xl font-black text-slate-900 mb-2">{title}</h1>
    <p className="text-sm text-slate-500 mb-6">{mode === 'signup' ? 'ابدأ رحلة تعلم الإنجليزية مع English30.' : mode === 'update-password' ? 'اختر كلمة مرور قوية وجديدة لحسابك.' : 'أدخل بيانات حسابك للمتابعة.'}</p>
    <form onSubmit={submit} className="space-y-4">
      {mode === 'signup' && <input required value={name} onChange={e => setName(e.target.value)} placeholder="الاسم" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />}
      {mode !== 'update-password' && <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />}
      {(mode === 'signin' || mode === 'signup' || mode === 'update-password') && <input required minLength={mode === 'update-password' ? 8 : 6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'update-password' ? 'كلمة المرور الجديدة' : 'كلمة المرور'} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />}
      {mode === 'update-password' && <input required minLength={8} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة المرور الجديدة" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" />}
      {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {message && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 text-sm">{message}</div>}
      <button disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl">{busy ? 'جارٍ التنفيذ...' : mode === 'signin' ? 'دخول' : mode === 'signup' ? 'إنشاء الحساب' : mode === 'reset' ? 'إرسال رابط الاستعادة' : 'حفظ كلمة المرور الجديدة'}</button>
    </form>
    {mode !== 'update-password' && <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-bold text-indigo-600">
      {mode !== 'signin' && <button onClick={() => setMode('signin')}>تسجيل الدخول</button>}
      {mode !== 'signup' && <button onClick={() => setMode('signup')}>إنشاء حساب</button>}
      {mode !== 'reset' && <button onClick={() => setMode('reset')}>نسيت كلمة المرور؟</button>}
    </div>}
  </div></div>;
};
