import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Loader2, Pencil, Save, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { settingsService } from '../../services/settingsService';
import type { HomepageSection, PlatformSettings } from '../../types';

const MediaImagePicker = React.lazy(() => import('../owner/MediaImagePicker').then((module) => ({ default: module.MediaImagePicker })));
const MediaImageGalleryPicker = React.lazy(() => import('../owner/MediaImagePicker').then((module) => ({ default: module.MediaImageGalleryPicker })));
const HomepageSectionEditor = React.lazy(() => import('../owner/HomepageSectionEditor').then((module) => ({ default: module.HomepageSectionEditor })));

type EditableKey = keyof PlatformSettings;
type FieldKind = 'text' | 'textarea' | 'url' | 'json' | 'image' | 'image-list';
export interface OwnerEditField { key: EditableKey; label: string; kind?: FieldKind; help?: string; }
export interface OwnerEditRequest { title: string; fields: OwnerEditField[]; }

interface OwnerEditContextValue {
  enabled: boolean;
  isOwner: boolean;
  openEditor(request: OwnerEditRequest): void;
  openSectionEditor(section: HomepageSection): void;
}

const OwnerEditContext = createContext<OwnerEditContextValue>({ enabled: false, isOwner: false, openEditor: () => undefined, openSectionEditor: () => undefined });

const serialize = (value: unknown, kind?: FieldKind) => kind === 'json' || kind === 'image-list' ? JSON.stringify(value ?? [], null, 2) : String(value ?? '');
const publicTargets = new Set(['home','levels','courses','lesson','placement-test','dashboard','vocab','quizzes','ai-tutor','certificates','pricing']);
const validateSetting = (key: EditableKey, value: unknown) => {
  if (key === 'homepageImages' && (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))) throw new Error('معرض الصور يجب أن يكون قائمة روابط نصية.');
  if (key === 'homepageStats' && (!Array.isArray(value) || value.some((item) => !item || typeof item.value !== 'string' || typeof item.labelAr !== 'string'))) throw new Error('كل إحصائية تحتاج value وlabelAr نصيين.');
  if (key === 'homepageMarketingSections' && (!Array.isArray(value) || value.some((item) => !item || typeof item.titleAr !== 'string' || typeof item.descriptionAr !== 'string'))) throw new Error('كل قسم تسويقي يحتاج titleAr وdescriptionAr.');
  if (key === 'announcementBanner' && (!value || typeof value !== 'object' || typeof (value as any).enabled !== 'boolean' || typeof (value as any).textAr !== 'string')) throw new Error('إعداد الإعلان يحتاج enabled وtextAr.');
  if ((key === 'heroPrimaryCtaTarget' || key === 'heroSecondaryCtaTarget') && typeof value === 'string' && value && !/^https?:\/\//i.test(value) && !publicTargets.has(value.replace(/^#/, ''))) throw new Error('وجهة الزر يجب أن تكون قسمًا معروفًا أو رابط https كاملًا.');
};

export const OwnerEditModeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isOwner, isSuspended } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [request, setRequest] = useState<OwnerEditRequest | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sectionToEdit, setSectionToEdit] = useState<HomepageSection | null>(null);

  useEffect(() => settingsService.subscribe(setSettings), []);
  useEffect(() => { if (!isOwner || isSuspended) { setEnabled(false); setRequest(null); setSectionToEdit(null); } }, [isOwner, isSuspended]);

  const openEditor = (next: OwnerEditRequest) => {
    if (!isOwner || isSuspended) return;
    setDraft(Object.fromEntries(next.fields.map((field) => [field.key, serialize(settings[field.key], field.kind)])));
    setRequest(next); setPreview(false); setError(''); setSuccess('');
  };

  const close = () => { if (!busy) { setRequest(null); setPreview(false); setError(''); setSuccess(''); } };
  const save = async () => {
    if (!request) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const changes: Partial<PlatformSettings> = {};
      for (const field of request.fields) {
        let value: unknown = draft[field.key] ?? '';
        if (field.kind === 'json' || field.kind === 'image-list') {
          try { value = JSON.parse(String(value)); }
          catch { throw new Error(`صيغة JSON غير صالحة في حقل: ${field.label}`); }
        }
        validateSetting(field.key, value);
        (changes as Record<string, unknown>)[field.key] = value;
      }
      await settingsService.updateSettings(changes);
      setSuccess('تم الحفظ ونشر التغيير على الموقع.');
      window.setTimeout(() => setRequest(null), 800);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ التغييرات.'); }
    finally { setBusy(false); }
  };

  const openSectionEditor = (section: HomepageSection) => { if (isOwner && !isSuspended && enabled) setSectionToEdit(section); };
  const value = useMemo(() => ({ enabled: enabled && isOwner && !isSuspended, isOwner: isOwner && !isSuspended, openEditor, openSectionEditor }), [enabled, isOwner, isSuspended, settings]);

  return <OwnerEditContext.Provider value={value}>
    {children}
    {sectionToEdit && <React.Suspense fallback={null}><HomepageSectionEditor section={sectionToEdit} onClose={() => setSectionToEdit(null)} onSaved={() => setSectionToEdit(null)} /></React.Suspense>}
    {isOwner && !isSuspended && <div className="fixed bottom-5 left-5 z-[80] flex items-center gap-2" dir="rtl">
      <button onClick={() => setEnabled((current) => !current)} className={`shadow-xl border px-4 py-3 rounded-2xl text-sm font-black flex items-center gap-2 ${enabled ? 'bg-amber-400 border-amber-500 text-slate-950' : 'bg-slate-950 border-slate-700 text-white'}`}>
        <Pencil className="w-4 h-4" />{enabled ? 'إنهاء وضع تحرير المالك' : 'وضع تحرير المالك'}
      </button>
      {enabled && <button onClick={() => openEditor({ title: 'هوية الموقع وبيانات SEO', fields: [
        { key: 'siteName', label: 'اسم المنصة' }, { key: 'logoUrl', label: 'الشعار الكامل', kind: 'image' },
        { key: 'faviconUrl', label: 'أيقونة الموقع Favicon', kind: 'image', help: 'PNG/JPEG/WebP أو ICO. ملفات SVG مرفوضة.' }, { key: 'seoTitle', label: 'عنوان SEO' },
        { key: 'seoDescription', label: 'وصف SEO', kind: 'textarea' }, { key: 'openGraphImageUrl', label: 'صورة Open Graph', kind: 'image' },
      ] })} className="shadow-xl border bg-white px-4 py-3 rounded-2xl text-xs font-black text-indigo-700">الهوية وSEO</button>}
    </div>}
    {request && <div className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-sm p-4 flex items-center justify-center" dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border p-6 space-y-5">
        <div className="flex items-center justify-between"><div><p className="text-[11px] font-black text-amber-600">OWNER EDIT MODE</p><h2 className="text-xl font-black">{request.title}</h2></div><button onClick={close} disabled={busy} className="p-2 rounded-xl bg-slate-100"><X className="w-5 h-5"/></button></div>
        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex gap-2"><CheckCircle2 className="w-4 h-4"/>{success}</div>}
        <div className="space-y-4">{request.fields.map((field) => <div key={field.key} className="block text-xs font-black text-slate-700">
          {field.kind === 'image' ? <React.Suspense fallback={<div className="p-5 text-center text-slate-500">جاري تحميل محرر الصور...</div>}><MediaImagePicker label={field.label} valueUrl={draft[field.key] ?? ''} folder="branding" allowFavicon={field.key === 'faviconUrl'} help={field.help} onChange={(selected) => setDraft((current) => ({ ...current, [field.key]: selected?.url ?? '' }))}/></React.Suspense>
            : field.kind === 'image-list' ? <React.Suspense fallback={<div className="p-5 text-center text-slate-500">جاري تحميل محرر الصور...</div>}><MediaImageGalleryPicker label={field.label} folder="branding" value={(() => { try { const parsed = JSON.parse(draft[field.key] || '[]'); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } })()} onChange={(urls) => setDraft((current) => ({ ...current, [field.key]: JSON.stringify(urls, null, 2) }))}/></React.Suspense>
            : <label className="block">{field.label}{field.kind === 'textarea' || field.kind === 'json'
              ? <textarea value={draft[field.key] ?? ''} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} rows={field.kind === 'json' ? 8 : 4} dir={field.kind === 'json' ? 'ltr' : undefined} className="mt-2 w-full border rounded-xl p-3 text-sm font-normal"/>
              : <input type={field.kind === 'url' ? 'url' : 'text'} value={draft[field.key] ?? ''} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} className="mt-2 w-full border rounded-xl p-3 text-sm font-normal" dir={field.kind === 'url' ? 'ltr' : undefined}/>} 
              {field.help && <span className="block mt-1 text-[10px] text-slate-500 font-normal">{field.help}</span>}
            </label>}
        </div>)}</div>
        {preview && <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3"><p className="text-xs font-black text-indigo-700">معاينة قبل الحفظ</p>{request.fields.map((field) => field.kind === 'image' && draft[field.key] ? <img key={field.key} src={draft[field.key]} alt={field.label} className="max-h-40 max-w-full object-contain rounded-xl border bg-white"/> : field.kind === 'image-list' ? <div key={field.key} className="grid grid-cols-3 gap-2">{(() => { try { return (JSON.parse(draft[field.key] || '[]') as string[]).map((url) => <img key={url} src={url} alt="" className="h-20 w-full object-cover rounded-lg"/>); } catch { return null; } })()}</div> : <p key={field.key} className="text-xs text-slate-700 whitespace-pre-wrap"><strong>{field.label}:</strong> {draft[field.key]}</p>)}</div>}
        <div className="flex flex-wrap justify-end gap-2"><button onClick={close} disabled={busy} className="px-4 py-2.5 rounded-xl border text-sm font-bold">إلغاء</button><button onClick={() => setPreview((current) => !current)} disabled={busy} className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold flex gap-2"><Eye className="w-4 h-4"/>معاينة</button><button onClick={() => void save()} disabled={busy} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black flex gap-2">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}حفظ</button></div>
      </section>
    </div>}
  </OwnerEditContext.Provider>;
};

export const useOwnerEditMode = () => useContext(OwnerEditContext);

export const OwnerEditable: React.FC<React.PropsWithChildren<{ request: OwnerEditRequest; className?: string }>> = ({ request, className = '', children }) => {
  const { enabled, openEditor } = useOwnerEditMode();
  return <div className={`relative ${className} ${enabled ? 'outline outline-2 outline-dashed outline-amber-400 outline-offset-2 cursor-pointer group' : ''}`} onClick={enabled ? (event) => { event.preventDefault(); event.stopPropagation(); openEditor(request); } : undefined}>
    {children}{enabled && <span className="absolute top-2 left-2 z-20 bg-amber-400 text-slate-950 rounded-lg px-2 py-1 text-[10px] font-black opacity-90 group-hover:opacity-100 flex gap-1"><Pencil className="w-3 h-3"/>تحرير</span>}
  </div>;
};
