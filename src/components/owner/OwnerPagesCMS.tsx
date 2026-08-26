import React, { FormEvent, useEffect, useState } from 'react';
import { Archive, Eye, FileText, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { CmsPage, ContentStatus } from '../../types';
import { ownerCmsService } from '../../services';

const emptyPage: Partial<CmsPage> & Pick<CmsPage, 'slug' | 'titleAr' | 'pageType'> = {
  slug: '', titleAr: '', pageType: 'static', titleEn: '', body: [], status: 'draft', seoTitle: '', seoDescription: '',
};

export const OwnerPagesCMS: React.FC = () => {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [editing, setEditing] = useState<typeof emptyPage>(emptyPage);
  const [bodyText, setBodyText] = useState('');
  const [preview, setPreview] = useState<CmsPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => setPages(await ownerCmsService.listPages());
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, []);

  const select = (page: CmsPage) => {
    setEditing(page);
    setBodyText(page.body.map((block: any) => block?.content?.text ?? block?.text ?? '').filter(Boolean).join('\n\n'));
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await ownerCmsService.savePage({ ...editing, body: [{ type: 'rich_text', content: { text: bodyText } }] });
      setEditing(emptyPage); setBodyText(''); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الصفحة.'); }
    finally { setBusy(false); }
  };
  const status = async (page: CmsPage, next: ContentStatus) => {
    setBusy(true); try { await ownerCmsService.setPageStatus(page.id, next); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تغيير الحالة.'); }
    finally { setBusy(false); }
  };
  const permanentDelete = async (page: CmsPage) => {
    if (!confirm(`حذف الصفحة «${page.titleAr}» نهائيًا؟ لا يمكن التراجع عن ذلك.`)) return;
    setBusy(true); try { await ownerCmsService.permanentlyDelete('page', page.id); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحذف النهائي.'); }
    finally { setBusy(false); }
  };

  return <section className="space-y-6" dir="rtl">
    <div><h2 className="text-2xl font-black">الصفحات القانونية وSEO</h2><p className="text-sm text-slate-500 mt-1">إدارة شروط الاستخدام والخصوصية والاسترداد وأي صفحة ثابتة دون تعديل الكود.</p></div>
    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">{error}</div>}
    <form onSubmit={save} className="bg-white border rounded-3xl p-5 space-y-4">
      <h3 className="font-black flex gap-2"><Plus className="w-4 h-4 text-indigo-600"/>{editing.id ? 'تعديل الصفحة' : 'صفحة جديدة'}</h3>
      <div className="grid md:grid-cols-3 gap-3"><input required value={editing.titleAr} onChange={(e)=>setEditing({...editing,titleAr:e.target.value})} placeholder="العنوان العربي" className="border rounded-xl p-3 text-sm"/><input required value={editing.slug} onChange={(e)=>setEditing({...editing,slug:e.target.value})} placeholder="slug" dir="ltr" className="border rounded-xl p-3 text-sm"/><select value={editing.pageType} onChange={(e)=>setEditing({...editing,pageType:e.target.value as CmsPage['pageType']})} className="border rounded-xl p-3 text-sm"><option value="legal">قانونية</option><option value="static">ثابتة</option></select></div>
      <textarea required value={bodyText} onChange={(e)=>setBodyText(e.target.value)} rows={8} placeholder="محتوى الصفحة" className="w-full border rounded-xl p-3 text-sm leading-7"/>
      <div className="grid md:grid-cols-2 gap-3"><input value={editing.seoTitle||''} onChange={(e)=>setEditing({...editing,seoTitle:e.target.value})} placeholder="SEO title" className="border rounded-xl p-3 text-sm"/><textarea value={editing.seoDescription||''} onChange={(e)=>setEditing({...editing,seoDescription:e.target.value})} placeholder="SEO description" className="border rounded-xl p-3 text-sm"/></div>
      <div className="flex gap-2"><button disabled={busy} className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black flex gap-2"><Save className="w-4 h-4"/>{editing.id ? 'حفظ دون تغيير الحالة' : 'حفظ كمسودة'}</button>{editing.id&&<button type="button" onClick={()=>{setEditing(emptyPage);setBodyText('');}} className="px-4 py-3 bg-slate-100 rounded-xl text-sm font-bold">إلغاء</button>}</div>
    </form>
    <div className="grid md:grid-cols-2 gap-4">{pages.map((page)=><article key={page.id} className="bg-white border rounded-2xl p-5 space-y-3"><div className="flex justify-between gap-3"><div><h3 className="font-black">{page.titleAr}</h3><p className="text-xs text-slate-500">/{page.slug} · {page.pageType}</p></div><span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 h-fit">{page.status}</span></div><div className="flex flex-wrap gap-2"><button onClick={()=>select(page)} className="px-3 py-2 border rounded-lg text-xs font-bold">تعديل</button><button onClick={()=>setPreview(page)} className="px-3 py-2 border rounded-lg text-xs font-bold flex gap-1"><Eye className="w-4 h-4"/>معاينة المحتوى</button>{page.status==='draft'&&<button disabled={busy} onClick={()=>void status(page,'preview')} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">نقل للمعاينة</button>}{page.status==='preview'&&<button disabled={busy} onClick={()=>void status(page,'published')} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">نشر</button>}{page.status==='published'&&<button disabled={busy} onClick={()=>void status(page,'preview')} className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">إلغاء النشر للمعاينة</button>}{page.status!=='archived'?<button disabled={busy} onClick={()=>void status(page,'archived')} className="p-2 bg-slate-100 rounded-lg"><Archive className="w-4 h-4"/></button>:<><button disabled={busy} onClick={()=>void status(page,'draft')} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex gap-1"><RotateCcw className="w-4 h-4"/>استعادة</button><button disabled={busy} onClick={()=>void permanentDelete(page)} className="p-2 bg-red-50 text-red-700 rounded-lg" title="حذف نهائي للمالك فقط"><Trash2 className="w-4 h-4"/></button></>}</div></article>)}</div>
    {preview&&<div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center"><article className="bg-white rounded-3xl p-7 max-w-3xl w-full max-h-[85vh] overflow-auto"><div className="flex justify-between"><h2 className="text-2xl font-black">{preview.titleAr}</h2><button onClick={()=>setPreview(null)}>✕</button></div><div className="mt-6 whitespace-pre-wrap leading-8 text-slate-700">{preview.body.map((block:any)=>block?.content?.text||block?.text||'').join('\n\n')}</div></article></div>}
    {pages.length===0&&<div className="bg-white border rounded-3xl p-10 text-center text-slate-500"><FileText className="w-9 h-9 mx-auto mb-2"/>لا توجد صفحات بعد.</div>}
  </section>;
};
