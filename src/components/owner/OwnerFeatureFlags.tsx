import React, { useEffect, useState } from 'react';
import { Flag, RefreshCw } from 'lucide-react';
import { ownerCmsService } from '../../services';
import type { FeatureFlagRecord } from '../../services';

export const OwnerFeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlagRecord[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = async () => setFlags(await ownerCmsService.listFeatureFlags());
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, []);
  const toggle = async (flag: FeatureFlagRecord) => {
    setBusy(flag.key); setError('');
    try { await ownerCmsService.updateFeatureFlag(flag.key, !flag.enabled); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث الميزة.'); }
    finally { setBusy(''); }
  };
  return <section className="space-y-5" dir="rtl"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">مفاتيح الميزات</h2><p className="text-sm text-slate-500 mt-1">تعطيل أو تفعيل وظائف المنصة دون نشر كود جديد.</p></div><button onClick={()=>void load()} className="p-2.5 border rounded-xl bg-white"><RefreshCw className="w-4 h-4"/></button></div>{error&&<div className="p-4 bg-red-50 text-red-700 border rounded-2xl text-sm">{error}</div>}<div className="grid md:grid-cols-2 gap-4">{flags.map((flag)=><article key={flag.key} className="bg-white border rounded-2xl p-5 flex items-center justify-between gap-4"><div><h3 className="font-black flex items-center gap-2"><Flag className="w-4 h-4 text-indigo-600"/>{flag.descriptionAr||flag.key}</h3><code className="text-[11px] text-slate-400" dir="ltr">{flag.key}</code></div><button disabled={busy===flag.key} onClick={()=>void toggle(flag)} className={`px-4 py-2 rounded-xl text-xs font-black ${flag.enabled?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}`}>{flag.enabled?'مفعلة':'معطلة'}</button></article>)}</div></section>;
};
