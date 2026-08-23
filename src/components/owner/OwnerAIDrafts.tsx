import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { aiContentDraftsService } from '../../services';
import { AIGenerationDraft } from '../../types';

export const OwnerAIDrafts: React.FC = () => {
  const [drafts, setDrafts] = useState<AIGenerationDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = async () => { setLoading(true); try { setDrafts(await aiContentDraftsService.list()); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const changeStatus = async (id: string, status: AIGenerationDraft['status']) => { setBusyId(id); try { await aiContentDraftsService.updateStatus(id, status); await load(); } finally { setBusyId(null); } };
  const remove = async (id: string) => { if (!window.confirm('حذف مسودة الذكاء الاصطناعي؟')) return; setBusyId(id); try { await aiContentDraftsService.delete(id); await load(); } finally { setBusyId(null); } };
  return <section className="space-y-5" dir="rtl">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-900">مسودات المحتوى بالذكاء الاصطناعي</h2><p className="text-sm text-slate-500 mt-1">راجع المحتوى المولد قبل اعتماده أو حذفه.</p></div><button onClick={() => void load()} className="px-3 py-2 rounded-xl border bg-white text-slate-600 text-xs font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>تحديث</button></div>
    {loading ? <div className="bg-white border rounded-3xl p-8 text-center text-sm text-slate-500">جاري تحميل المسودات...</div> : drafts.length === 0 ? <div className="bg-white border rounded-3xl p-10 text-center"><Sparkles className="w-8 h-8 mx-auto text-indigo-500 mb-3"/><p className="font-bold text-slate-700">لا توجد مسودات بعد.</p></div> : <div className="space-y-3">{drafts.map(draft => <article key={draft.id} className="bg-white border rounded-3xl p-5 space-y-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-black text-slate-900">{draft.titleAr}</h3><span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold">{draft.status}</span></div><p className="text-xs text-slate-500 mt-1">{draft.targetType} · {draft.level}</p></div><Clock3 className="w-4 h-4 text-slate-300"/></div><div className="bg-slate-50 rounded-2xl p-4 text-xs whitespace-pre-wrap max-h-64 overflow-auto text-slate-700">{typeof draft.content === 'string' ? draft.content : JSON.stringify(draft.content, null, 2)}</div><div className="flex flex-wrap gap-2"><button disabled={busyId===draft.id} onClick={() => void changeStatus(draft.id,'applied')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/>اعتماد</button><button disabled={busyId===draft.id} onClick={() => void changeStatus(draft.id,'discarded')} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-black">رفض</button><button disabled={busyId===draft.id} onClick={() => void remove(draft.id)} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black flex items-center gap-1.5"><Trash2 className="w-4 h-4"/>حذف</button></div></article>)}</div>}
  </section>;
};

