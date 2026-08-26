import React, { FormEvent, useEffect, useState } from 'react';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import type { CmsPage } from '../types';
import { pagesService } from '../services/pagesService';
import { ownerCmsService } from '../services/ownerCmsService';
import { useOwnerEditMode } from './owner-edit/OwnerEditMode';

export const PublicPageView: React.FC<{ slug: string }> = ({ slug }) => {
  const [page, setPage] = useState<CmsPage | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ titleAr: '', text: '', seoTitle: '', seoDescription: '' });
  const { enabled, isOwner } = useOwnerEditMode();
  const load = async () => {
    const value = await pagesService.getPublishedBySlug(slug); setPage(value);
    if (value) { document.title = value.seoTitle || value.titleAr; const meta = document.querySelector('meta[name="description"]'); if (meta && value.seoDescription) meta.setAttribute('content', value.seoDescription); }
  };
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, [slug]);
  const beginEdit = () => { if (!page || !isOwner) return; setDraft({ titleAr: page.titleAr, text: page.body.map((block: any) => block?.content?.text || block?.text || '').join('\n\n'), seoTitle: page.seoTitle || '', seoDescription: page.seoDescription || '' }); setEditing(true); setError(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!page) return; setBusy(true); setError('');
    try { await ownerCmsService.savePage({ ...page, titleAr: draft.titleAr.trim(), body: [{ type: 'rich_text', content: { text: draft.text } }], seoTitle: draft.seoTitle.trim(), seoDescription: draft.seoDescription.trim() }); await load(); setEditing(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الصفحة.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8" dir="rtl"><article className={`relative max-w-4xl mx-auto bg-white border rounded-3xl p-7 sm:p-12 shadow-sm ${enabled && page ? 'outline outline-2 outline-dashed outline-amber-400 cursor-pointer' : ''}`} onClick={enabled && page ? beginEdit : undefined}>
    {enabled && page && <span className="absolute top-5 left-5 bg-amber-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-black flex gap-2"><Pencil className="w-4 h-4"/>تحرير الصفحة وSEO</span>}<a href="/" className="text-indigo-700 text-sm font-bold" onClick={(event) => event.stopPropagation()}>العودة إلى المنصة</a>{page === undefined && !error && <p className="mt-8 text-slate-500">جاري تحميل الصفحة...</p>}{error && <p className="mt-8 text-red-700">{error}</p>}{page === null && <p className="mt-8 text-slate-500">الصفحة غير منشورة أو غير موجودة.</p>}{page && <><h1 className="text-3xl sm:text-4xl font-black mt-8">{page.titleAr}</h1><div className="mt-8 whitespace-pre-wrap leading-9 text-slate-700">{page.body.map((block: any) => block?.content?.text || block?.text || '').join('\n\n')}</div><p className="mt-10 text-xs text-slate-400">آخر تحديث: {new Date(page.updatedAt).toLocaleDateString('ar-SA')}</p></>}
  </article>{editing && page && <div className="fixed inset-0 z-[110] bg-slate-950/65 p-4 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setEditing(false); }}><form onSubmit={save} className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4"><div className="flex justify-between"><h2 className="text-xl font-black">تحرير الصفحة المنشورة</h2><button type="button" onClick={() => setEditing(false)} disabled={busy}><X/></button></div><p className="text-xs text-slate-500">يتم الحفظ في سجل CMS نفسه وتوثيق التغيير. حالة النشر الحالية لن تتغير.</p><input required value={draft.titleAr} onChange={(event) => setDraft({ ...draft, titleAr: event.target.value })} className="w-full border rounded-xl p-3" placeholder="العنوان"/><textarea required rows={12} value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} className="w-full border rounded-xl p-3" placeholder="محتوى الصفحة"/><input value={draft.seoTitle} onChange={(event) => setDraft({ ...draft, seoTitle: event.target.value })} className="w-full border rounded-xl p-3" placeholder="عنوان SEO"/><textarea rows={3} value={draft.seoDescription} onChange={(event) => setDraft({ ...draft, seoDescription: event.target.value })} className="w-full border rounded-xl p-3" placeholder="وصف SEO"/><button disabled={busy} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-black flex gap-2">{busy ? <Loader2 className="animate-spin"/> : <Save/>}حفظ التغييرات</button></form></div>}</main>;
};
