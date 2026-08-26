import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Library, Link2, Loader2, Trash2, Upload, X } from 'lucide-react';
import { mediaService, PUBLIC_SITE_ASSETS_BUCKET } from '../../services/mediaService';
import type { MediaAsset, SiteImageUploadOptions } from '../../services/mediaService';

export interface SelectedImage { assetId?: string; url: string; altText?: string; }
interface Props {
  label: string;
  valueUrl?: string;
  valueAssetId?: string;
  onChange(value: SelectedImage | null): void;
  folder?: SiteImageUploadOptions['folder'];
  allowFavicon?: boolean;
  help?: string;
}

const dimensions = (asset: MediaAsset) => {
  const width = Number(asset.metadata.width || 0); const height = Number(asset.metadata.height || 0);
  return width > 0 && height > 0 ? `${width}×${height}` : 'الأبعاد غير متاحة';
};
const sizeLabel = (bytes?: number) => {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export const MediaImagePicker: React.FC<Props> = ({ label, valueUrl = '', valueAssetId, onChange, folder = 'library', allowFavicon = false, help }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState(valueUrl);
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const rows = await mediaService.listWithUrls(PUBLIC_SITE_ASSETS_BUCKET);
    setAssets(allowFavicon ? rows : rows.filter((asset) => asset.mimeType !== 'image/x-icon' && asset.mimeType !== 'image/vnd.microsoft.icon'));
  };
  useEffect(() => { void load().catch(() => undefined); }, []);
  useEffect(() => setManualUrl(valueUrl), [valueUrl]);
  const selectedAsset = useMemo(() => assets.find((asset) => asset.id === valueAssetId || asset.resolvedUrl === valueUrl), [assets, valueAssetId, valueUrl]);
  const previewUrl = valueUrl || selectedAsset?.resolvedUrl || '';

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError('');
    try {
      const asset = await mediaService.uploadSiteImage(file, { folder: folder as NonNullable<SiteImageUploadOptions['folder']>, altText, allowFavicon });
      const url = await mediaService.resolveAssetUrl(asset);
      onChange({ assetId: asset.id, url, altText: asset.altText });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر رفع الصورة.'); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const choose = (asset: MediaAsset) => {
    if (!asset.resolvedUrl) return;
    onChange({ assetId: asset.id, url: asset.resolvedUrl, altText: asset.altText });
    setAltText(asset.altText || ''); setLibraryOpen(false); setError('');
  };

  const saveAlt = async () => {
    if (!selectedAsset) return;
    setBusy(true); setError('');
    try { await mediaService.updateAltText(selectedAsset.id, altText); await load(); onChange({ assetId: selectedAsset.id, url: previewUrl, altText }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ النص البديل.'); }
    finally { setBusy(false); }
  };

  return <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3" dir="rtl">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-slate-800">{label}</p>{help && <p className="text-[10px] text-slate-500 mt-1">{help}</p>}</div>{selectedAsset && <span className="text-[10px] rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 font-bold">أصل من المكتبة</span>}</div>
    <div className="h-36 rounded-xl bg-slate-100 border overflow-hidden flex items-center justify-center">
      {previewUrl ? <img src={previewUrl} alt={altText || label} className="w-full h-full object-contain" loading="lazy"/> : <div className="text-center text-slate-400 text-xs"><ImagePlus className="w-9 h-9 mx-auto mb-2"/>لا توجد صورة</div>}
    </div>
    {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">{error}</p>}
    <input ref={inputRef} type="file" className="hidden" accept={allowFavicon ? '.png,.jpg,.jpeg,.webp,.ico,image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon' : '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'} onChange={upload}/>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Upload className="w-3.5 h-3.5"/>}رفع من الجهاز</button>
      <button type="button" disabled={busy} onClick={() => setLibraryOpen(true)} className="px-3 py-2 rounded-lg border bg-white text-xs font-black flex items-center gap-1.5"><Library className="w-3.5 h-3.5"/>اختيار من مكتبة الوسائط</button>
      <button type="button" onClick={() => setManualOpen((current) => !current)} className="px-3 py-2 rounded-lg border bg-slate-50 text-xs font-bold flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5"/>إدخال رابط يدوي</button>
      {previewUrl && <button type="button" disabled={busy} onClick={() => onChange(null)} className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5"/>إزالة</button>}
    </div>
    {manualOpen && <div className="flex gap-2"><input type="url" dir="ltr" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="https://..." className="min-w-0 flex-1 border rounded-lg px-3 py-2 text-xs"/><button type="button" onClick={() => { const url = manualUrl.trim(); if (url && !/^https:\/\//i.test(url)) { setError('يجب استخدام رابط HTTPS كامل.'); return; } onChange(url ? { url } : null); setManualOpen(false); }} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">تطبيق</button></div>}
    {selectedAsset && <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end"><label className="text-[10px] font-bold text-slate-600">النص البديل<input value={altText || selectedAsset.altText || ''} onChange={(event) => setAltText(event.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-xs font-normal"/></label><button type="button" disabled={busy} onClick={() => void saveAlt()} className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-bold">حفظ النص البديل</button></div>}
    {libraryOpen && <div className="fixed inset-0 z-[140] bg-slate-950/70 p-4 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setLibraryOpen(false); }}>
      <section className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-5 space-y-4" dir="rtl">
        <div className="flex justify-between items-center"><div><h3 className="font-black">اختيار صورة من مكتبة الوسائط</h3><p className="text-xs text-slate-500">اختيار أصل موجود يعيد استخدام الملف نفسه دون رفع نسخة أخرى.</p></div><button type="button" onClick={() => setLibraryOpen(false)} className="p-2 bg-slate-100 rounded-xl"><X className="w-5 h-5"/></button></div>
        {assets.length === 0 ? <div className="p-10 text-center text-sm text-slate-500 border rounded-2xl">لا توجد صور عامة بعد. استخدم «رفع من الجهاز» لإضافة أول صورة.</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{assets.map((asset) => {
          const selected = asset.id === valueAssetId || asset.resolvedUrl === valueUrl;
          return <button type="button" key={asset.id} onClick={() => choose(asset)} className={`text-right rounded-2xl border-2 p-3 transition ${selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
            <div className="h-32 rounded-xl bg-slate-100 overflow-hidden relative"><img src={asset.resolvedUrl} alt={asset.altText || asset.fileName} loading="lazy" className="w-full h-full object-contain"/>{selected && <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check className="w-4 h-4"/></span>}</div>
            <p className="mt-2 text-xs font-black truncate">{asset.fileName}</p><p className="text-[10px] text-slate-500">{asset.mimeType} · {sizeLabel(asset.sizeBytes)} · {dimensions(asset)}</p><p className="text-[10px] text-slate-500 truncate">النص البديل: {asset.altText || 'غير محدد'}</p>
          </button>;
        })}</div>}
      </section>
    </div>}
  </div>;
};

export const MediaImageGalleryPicker: React.FC<{ label: string; value: string[]; onChange(value: string[]): void; folder?: SiteImageUploadOptions['folder'] }> = ({ label, value, onChange, folder = 'branding' }) => {
  return <div className="space-y-3"><p className="text-xs font-black">{label}</p>{value.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{value.map((url, index) => <div key={`${url}-${index}`} className="relative h-24 border rounded-xl overflow-hidden bg-slate-100"><img src={url} alt="" loading="lazy" className="w-full h-full object-cover"/><button type="button" aria-label="إزالة الصورة" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="absolute top-1 left-1 p-1 rounded-lg bg-red-600 text-white"><X className="w-3.5 h-3.5"/></button></div>)}</div>}
    <MediaImagePicker label="إضافة صورة إلى المعرض" folder={folder} onChange={(selected) => { if (selected?.url && !value.includes(selected.url)) onChange([...value, selected.url]); }}/>
  </div>;
};
