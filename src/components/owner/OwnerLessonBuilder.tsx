import React, { FormEvent, useEffect, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Copy, Edit3, Eye, Layers3, Plus, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import { AIGeneratedBlockDraft, AIGeneratedRewriteDraft, BlockType, ContentStatus, Course, Lesson, LessonBlock } from '../../types';
import { aiContentDraftsService, coursesService, lessonsService, mediaService, ownerAIService, ownerCmsService } from '../../services';
import type { MediaAsset } from '../../services';
import { insertApprovedBlocksAsDraft, replaceApprovedBlockAsDraft } from '../../services/lessonAIDraftIntegration';

const BLOCK_TYPES: Array<{ value: BlockType; label: string }> = [
  { value: 'heading', label: 'عنوان' }, { value: 'rich_text', label: 'نص منسق' },
  { value: 'vocabulary', label: 'مفردات' }, { value: 'example', label: 'مثال' },
  { value: 'grammar', label: 'قاعدة' }, { value: 'note', label: 'ملاحظة' },
  { value: 'flashcard', label: 'بطاقة' }, { value: 'image', label: 'صورة' },
  { value: 'audio', label: 'صوت' }, { value: 'video', label: 'فيديو' },
  { value: 'exercise', label: 'تمرين' }, { value: 'quiz_reference', label: 'اختبار مرتبط' },
  { value: 'downloadable_resource', label: 'ملف للتحميل' },
];

const blankForm = { type: 'rich_text' as BlockType, titleAr: '', titleEn: '', text: '', mediaAssetId: '' };

export const OwnerLessonBuilder: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProposal, setAiProposal] = useState<{ mode: 'block' | 'rewrite'; block: AIGeneratedBlockDraft; changeSummaryAr?: string; draftId: string; requestId: string; model: string } | null>(null);
  const [aiInsertPosition, setAiInsertPosition] = useState(0);
  const [structuredPayload, setStructuredPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void Promise.all([coursesService.getCourses(), mediaService.list()]).then(([courseRows, mediaRows]) => {
      setCourses(courseRows); setAssets(mediaRows);
      if (courseRows[0]) setCourseId(courseRows[0].id);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل البيانات.'));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    void lessonsService.getLessons(courseId).then((rows) => {
      setLessons(rows); setLessonId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? '');
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل الدروس.'));
  }, [courseId]);

  const loadBlocks = async () => {
    if (!lessonId) return setBlocks([]);
    setBlocks(await ownerCmsService.listBlocks(lessonId));
  };
  useEffect(() => { void loadBlocks().catch((reason) => setError(reason.message)); }, [lessonId]);
  useEffect(() => { setAiInsertPosition(blocks.filter((block) => block.status !== 'archived').length); }, [lessonId, blocks.length]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!lessonId || !form.titleAr.trim()) return;
    setBusy(true); setError('');
    try {
      const payload = structuredPayload ?? { text: form.text.trim() };
      if (editingId) await ownerCmsService.updateBlock(editingId, {
        type: form.type, titleAr: form.titleAr.trim(), titleEn: form.titleEn.trim() || undefined,
        payload, mediaAssetId: form.mediaAssetId || undefined,
      });
      else await ownerCmsService.createBlock({
        lessonId, type: form.type, titleAr: form.titleAr.trim(), titleEn: form.titleEn.trim() || undefined,
        payload, mediaAssetId: form.mediaAssetId || undefined,
      });
      setEditingId(null); setForm(blankForm); setStructuredPayload(null); await loadBlocks();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الكتلة.'); }
    finally { setBusy(false); }
  };

  const edit = (block: LessonBlock) => {
    setEditingId(block.id);
    setForm({ type: block.type, titleAr: block.titleAr, titleEn: block.titleEn || '', text: String(block.payload.text || ''), mediaAssetId: block.mediaAssetId || '' });
    setStructuredPayload(block.payload);
  };

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); await loadBlocks(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تنفيذ العملية.'); }
    finally { setBusy(false); }
  };
  const generateBlock = async (rewrite = false) => {
    setAiBusy(true); setError('');
    try {
      const selectedLesson = lessons.find((lesson) => lesson.id === lessonId);
      if (rewrite && !editingId) throw new Error('اختر كتلة موجودة ثم افتحها للتعديل قبل طلب إعادة الكتابة.');
      const response = await ownerAIService.generateContentDraft({
        mode: rewrite ? 'rewrite' : 'block',
        prompt: aiPrompt,
        level: selectedLesson?.level || 'A1',
        durationMinutes: selectedLesson?.durationMinutes || 20,
        blockType: form.type,
        existingContent: rewrite ? {
          type: form.type,
          titleAr: form.titleAr || 'كتلة',
          titleEn: form.titleEn,
          payload: { text: form.text },
        } : undefined,
      });
      const generated = response.draft;
      const rewriteDraft = rewrite ? generated as AIGeneratedRewriteDraft : null;
      const block = rewriteDraft ? rewriteDraft.block : generated as AIGeneratedBlockDraft;
      setAiProposal({ mode: rewrite ? 'rewrite' : 'block', block, changeSummaryAr: rewriteDraft?.changeSummaryAr, draftId: response.draftId, requestId: response.requestId, model: response.model });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إنشاء المحتوى.'); }
    finally { setAiBusy(false); }
  };
  const approveAI = async () => {
    if (!aiProposal || !lessonId) return;
    setAiBusy(true); setError('');
    try {
      if (aiProposal.mode === 'rewrite') {
        if (!editingId) throw new Error('لم تعد الكتلة المحددة متاحة لإعادة الكتابة.');
        await replaceApprovedBlockAsDraft(ownerCmsService, editingId, aiProposal.block);
        setEditingId(null); setForm(blankForm); setStructuredPayload(null);
      } else {
        await insertApprovedBlocksAsDraft(ownerCmsService, lessonId, [aiProposal.block], aiInsertPosition);
      }
      await aiContentDraftsService.markInsertedAsDraft(aiProposal.draftId);
      setAiProposal(null); await loadBlocks();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر اعتماد كتلة الذكاء الاصطناعي.'); }
    finally { setAiBusy(false); }
  };

  const rejectAI = async () => {
    if (!aiProposal) return;
    try { await aiContentDraftsService.updateStatus(aiProposal.draftId, 'discarded'); }
    catch { /* The generated draft remains safely un-applied if audit status cannot be updated. */ }
    setAiProposal(null);
  };

  return <section className="space-y-6" dir="rtl">
    <div><h2 className="text-2xl font-black text-slate-900">منشئ محتوى الدروس</h2><p className="text-sm text-slate-500 mt-1">كتل مرتبة تمر بدورة Draft ➔ Preview ➔ Published ➔ Archived، مع توليد AI خاضع للمراجعة البشرية.</p></div>
    {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
    <div className="grid md:grid-cols-2 gap-4 bg-white border rounded-3xl p-5">
      <label className="text-xs font-bold">الدورة<select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="mt-2 w-full border rounded-xl p-3 bg-slate-50">{courses.map((course) => <option key={course.id} value={course.id}>{course.titleAr}</option>)}</select></label>
      <label className="text-xs font-bold">الدرس<select value={lessonId} onChange={(event) => setLessonId(event.target.value)} className="mt-2 w-full border rounded-xl p-3 bg-slate-50">{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.unitNumber}. {lesson.titleAr}</option>)}</select></label>
    </div>
    <form onSubmit={save} className="bg-white border rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between"><h3 className="font-black flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-600"/>{editingId ? 'تعديل الكتلة' : 'إضافة كتلة'}</h3>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(blankForm); setStructuredPayload(null); }} className="text-xs text-slate-500 flex gap-1"><X className="w-4 h-4"/>إلغاء</button>}</div>
      <div className="grid md:grid-cols-3 gap-3">
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as BlockType })} className="border rounded-xl p-3 text-sm">{BLOCK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <input value={form.titleAr} onChange={(event) => setForm({ ...form, titleAr: event.target.value })} placeholder="العنوان العربي" required className="border rounded-xl p-3 text-sm"/>
        <input value={form.titleEn} onChange={(event) => setForm({ ...form, titleEn: event.target.value })} placeholder="English title" className="border rounded-xl p-3 text-sm" dir="ltr"/>
      </div>
      <textarea value={form.text} onChange={(event) => { setForm({ ...form, text: event.target.value }); setStructuredPayload(null); }} placeholder="محتوى الكتلة" rows={4} className="w-full border rounded-xl p-3 text-sm"/>
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3"><div className="font-black text-violet-800 text-sm flex gap-2"><Sparkles className="w-4 h-4"/>مساعدة AI للكتلة</div><textarea value={aiPrompt} onChange={(event)=>setAiPrompt(event.target.value)} rows={2} placeholder="مثال: أنشئ 15 مفردة A1 عن الروتين اليومي مع أمثلة، أو بسّط النص الحالي" className="w-full border rounded-xl p-3 text-sm bg-white"/><label className="block text-xs font-bold text-violet-900">موضع إدراج الكتلة الجديدة<select value={aiInsertPosition} onChange={(event)=>setAiInsertPosition(Number(event.target.value))} className="mt-1 w-full border rounded-xl p-2.5 bg-white">{Array.from({ length: blocks.filter((block) => block.status !== 'archived').length + 1 }, (_, index) => <option key={index} value={index}>{index === 0 ? 'بداية الدرس' : index === blocks.filter((block) => block.status !== 'archived').length ? 'نهاية الدرس' : `بعد الكتلة ${index}`}</option>)}</select></label><div className="flex flex-wrap gap-2"><button type="button" disabled={aiBusy||aiPrompt.trim().length<5} onClick={()=>void generateBlock(false)} className="px-4 py-2 bg-violet-700 text-white rounded-xl text-xs font-black">{aiBusy?'جاري الإنشاء...':'✨ إنشاء بالذكاء الاصطناعي'}</button><button type="button" disabled={aiBusy||!editingId||aiPrompt.trim().length<5} onClick={()=>void generateBlock(true)} className="px-4 py-2 border border-violet-300 text-violet-800 rounded-xl text-xs font-black">إعادة كتابة الكتلة المحددة</button></div><p className="text-[10px] text-violet-700">يُحفظ ناتج AI كسجل مسودة، ولا يضاف إلى الدرس أو يُنشر قبل اعتمادك.</p></div>
      {['image','audio','video','downloadable_resource'].includes(form.type) && <select value={form.mediaAssetId} onChange={(event) => setForm({ ...form, mediaAssetId: event.target.value })} className="w-full border rounded-xl p-3 text-sm"><option value="">اختر وسيطًا من المكتبة</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName} · {asset.provider}</option>)}</select>}
      <button disabled={busy || !lessonId} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2"><Save className="w-4 h-4"/>{busy ? 'جاري الحفظ...' : 'حفظ كمسودة'}</button>
    </form>
    <div className="space-y-3">
      {blocks.length === 0 && <div className="bg-white border rounded-3xl p-10 text-center text-slate-500 text-sm"><Layers3 className="w-9 h-9 mx-auto mb-2 text-slate-300"/>لا توجد كتل لهذا الدرس.</div>}
      {blocks.map((block, index) => <article key={block.id} className={`bg-white border rounded-2xl p-4 ${block.status === 'archived' ? 'opacity-60' : ''}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div className="flex gap-3"><span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center">{index + 1}</span><div><div className="flex items-center gap-2"><h3 className="font-black text-sm">{block.titleAr}</h3><span className="text-[10px] rounded-full bg-slate-100 px-2 py-1">{block.type}</span><span className="text-[10px] rounded-full bg-amber-50 text-amber-700 px-2 py-1">{block.status}</span></div><p className="text-xs text-slate-500 mt-1 line-clamp-2">{String(block.payload.text || '')}</p></div></div>
          <div className="flex flex-wrap gap-1.5">
            <button disabled={busy || index===0} onClick={() => void act(() => ownerCmsService.moveBlock(block,-1))} className="p-2 border rounded-lg"><ArrowUp className="w-4 h-4"/></button>
            <button disabled={busy || index===blocks.length-1} onClick={() => void act(() => ownerCmsService.moveBlock(block,1))} className="p-2 border rounded-lg"><ArrowDown className="w-4 h-4"/></button>
            <button onClick={() => edit(block)} className="p-2 border rounded-lg text-indigo-600"><Edit3 className="w-4 h-4"/></button>
            <button onClick={() => void act(() => ownerCmsService.duplicateBlock(block))} className="p-2 border rounded-lg"><Copy className="w-4 h-4"/></button>
            {block.status !== 'archived' && <><button onClick={() => void act(() => ownerCmsService.updateBlock(block.id,{status:'preview' as ContentStatus}))} className="px-3 py-2 border rounded-lg text-xs font-bold flex gap-1"><Eye className="w-4 h-4"/>معاينة</button><button onClick={() => void act(() => ownerCmsService.updateBlock(block.id,{status:'published'}))} className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">نشر</button><button onClick={() => void act(() => ownerCmsService.updateBlock(block.id,{status:'archived'}))} className="p-2 bg-slate-100 rounded-lg"><Archive className="w-4 h-4"/></button></>}
            {block.status === 'archived' && <button onClick={() => void act(() => ownerCmsService.updateBlock(block.id,{status:'draft'}))} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex gap-1"><RotateCcw className="w-4 h-4"/>استعادة</button>}
          </div>
        </div>
      </article>)}
    </div>
    {aiProposal && <div className="fixed inset-0 z-[70] bg-slate-950/70 p-4 flex items-center justify-center"><div className="bg-white rounded-3xl p-6 w-full max-w-2xl space-y-4"><h3 className="text-xl font-black">مراجعة كتلة AI</h3><p className="text-sm font-black">{aiProposal.block.titleAr} <span className="text-xs bg-slate-100 px-2 py-1 rounded">{aiProposal.block.type}</span></p>{aiProposal.changeSummaryAr && <p className="text-xs text-violet-700">{aiProposal.changeSummaryAr}</p>}<pre className="max-h-80 overflow-auto text-xs whitespace-pre-wrap border rounded-xl p-4 bg-slate-50" dir="ltr">{JSON.stringify(aiProposal.block.payload,null,2)}</pre><p className="text-[10px] text-slate-500">الطلب {aiProposal.requestId} · {aiProposal.model}. الاعتماد يحفظ الكتلة كمسودة فقط.</p><div className="flex justify-end gap-2"><button disabled={aiBusy} onClick={()=>void rejectAI()} className="px-4 py-2 border rounded-xl font-bold text-sm">رفض</button><button disabled={aiBusy} onClick={()=>void approveAI()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm">{aiProposal.mode === 'rewrite' ? 'استبدال الكتلة كمسودة' : 'إدراج في الموضع المحدد كمسودة'}</button></div></div></div>}
  </section>;
};
