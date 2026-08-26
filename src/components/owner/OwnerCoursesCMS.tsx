import React, { useState } from 'react';
import {
  BookOpen, Plus, CheckCircle, Clock, Archive, Edit3, Trash2, Eye, Layers,
  Sparkles, Video, FileText, HelpCircle, Volume2, Check, ChevronLeft,
} from 'lucide-react';
import { AIGeneratedLessonDraft, ContentStatus } from '../../types';
import { useOwnerCoursesCMS } from '../../hooks/useOwnerCoursesCMS';
import { OwnerCourseManager } from './OwnerCourseManager';
import { LessonBlocksRenderer } from '../LessonBlocksRenderer';
import { aiContentDraftsService, ownerAIService } from '../../services';

export const OwnerCoursesCMS: React.FC = () => {
  const {
    courses, lessons, selectedCourse, statusFilter, setStatusFilter,
    isCreatingLesson, setIsCreatingLesson, newLessonData, setNewLessonData, newLessonBlocks, setNewLessonBlocks,
    previewLesson, setPreviewLesson, filteredLessons, handleSelectCourse,
    handleSetLessonStatus, handleCreateLesson,
  } = useOwnerCoursesCMS();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiProposal, setAiProposal] = useState<AIGeneratedLessonDraft | null>(null);
  const generateLesson = async () => {
    setAiBusy(true); setAiError('');
    try {
      const generated = await ownerAIService.generateContentDraft({ mode: 'lesson', prompt: aiPrompt, level: selectedCourse?.level || 'A1' }) as AIGeneratedLessonDraft;
      await aiContentDraftsService.create({ targetType: 'lesson', titleAr: generated.titleAr, prompt: aiPrompt, level: selectedCourse?.level || 'A1', content: generated });
      setAiProposal(generated);
    } catch (reason) { setAiError(reason instanceof Error ? reason.message : 'تعذر إنشاء المسودة.'); }
    finally { setAiBusy(false); }
  };
  const approveProposal = () => {
    if (!aiProposal) return;
    setNewLessonData({ ...newLessonData, titleAr: aiProposal.titleAr, titleEn: aiProposal.titleEn, summaryAr: aiProposal.summaryAr, durationMinutes: aiProposal.durationMinutes, level: selectedCourse?.level || 'A1', status: 'draft' });
    setNewLessonBlocks(aiProposal.blocks); setAiProposal(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إدارة المناهج والدروس (Course & Lesson CMS)</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            دورة المحتوى المعتمدة: Draft ➔ Preview ➔ Published ➔ Archived، مع كتل محتوى تفاعلية.
          </p>
        </div>

        <button
          onClick={() => {
            setNewLessonData((prev) => ({ ...prev, unitNumber: lessons.length + 1 }));
            setIsCreatingLesson(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة درس جديد</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200"><OwnerCourseManager /></div>

      {/* Courses Horizontal Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600">اختر الدورة التدريبية:</label>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {courses.map((course) => {
            const isSelected = selectedCourse?.id === course.id;
            return (
              <button
                key={course.id}
                onClick={() => handleSelectCourse(course)}
                className={`px-4 py-3 rounded-2xl text-right whitespace-nowrap transition-all cursor-pointer border shrink-0 flex items-center gap-3 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {course.level}
                </div>
                <div>
                  <div className="text-xs font-extrabold">{course.titleAr}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {course.lessonsCount} درساً
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Status Toggles */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-slate-900">
              دروس: <span className="text-indigo-600">{selectedCourse?.titleAr}</span>
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
              {filteredLessons.length} درساً
            </span>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-bold ml-1">تصفية:</span>
            {(['all', 'draft', 'preview', 'published', 'archived'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all' && 'الكل'}
                {st === 'published' && '🟢 منشورة (Published)'}
                {st === 'draft' && '🟡 مسودات (Draft)'}
                {st === 'preview' && '🔵 معاينة (Preview)'}
                {st === 'archived' && '⚪ أرشيف'}
              </button>
            ))}
          </div>
        </div>

        {/* Lessons List Grid */}
        <div className="space-y-3">
          {filteredLessons.map((lesson) => {
            const isPub = lesson.status === 'published';

            return (
              <div
                key={lesson.id}
                className="p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 font-black text-sm flex items-center justify-center shrink-0">
                    {lesson.unitNumber}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{lesson.titleAr}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isPub
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {lesson.status === 'published' ? 'منشور للطلاب' : lesson.status === 'preview' ? 'معاينة للطاقم' : lesson.status === 'archived' ? 'مؤرشف' : 'مسودة قيد المراجعة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-english">{lesson.titleEn}</p>
                    <p className="text-xs text-slate-600 line-clamp-1">{lesson.summaryAr}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setPreviewLesson(lesson)}
                    className="p-2 text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="معاينة كتل المحتوى"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">معاينة الكتل</span>
                  </button>

                  {lesson.status === 'published' && <button
                    onClick={() => void handleSetLessonStatus(lesson, 'preview')}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /><span>إلغاء النشر إلى المعاينة</span>
                  </button>}
                  {lesson.status === 'draft' && <button onClick={() => void handleSetLessonStatus(lesson, 'preview')} className="px-3 py-2 rounded-xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">وضع المعاينة</button>}
                  {lesson.status === 'preview' && <button onClick={() => void handleSetLessonStatus(lesson, 'published')} className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white"><Check className="inline w-3.5 h-3.5 ml-1"/>نشر للطلاب</button>}
                  {lesson.status !== 'archived' ? <button onClick={() => void handleSetLessonStatus(lesson, 'archived')} className="p-2 rounded-xl bg-slate-100 text-slate-600" title="أرشفة"><Archive className="w-4 h-4"/></button> : <button onClick={() => void handleSetLessonStatus(lesson, 'draft')} className="px-3 py-2 rounded-xl text-xs font-black bg-indigo-50 text-indigo-700">استعادة</button>}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal: Create New Lesson */}
      {isCreatingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">إضافة درس جديد للدورة</h3>
              <button
                onClick={() => setIsCreatingLesson(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-3"><div className="flex items-center gap-2 text-violet-800 font-black text-sm"><Sparkles className="w-4 h-4"/>✨ إنشاء مسودة بالذكاء الاصطناعي</div><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="مثال: أنشئ درس A1 بعنوان Daily Routine لمدة 20 دقيقة مع مفردات وقاعدة وأمثلة وتمارين واختبار" className="w-full border rounded-xl p-3 text-sm bg-white"/><button type="button" disabled={aiBusy || aiPrompt.trim().length < 5} onClick={() => void generateLesson()} className="bg-violet-700 text-white px-4 py-2.5 rounded-xl text-xs font-black">{aiBusy ? 'جاري الإنشاء...' : '✨ إنشاء بالذكاء الاصطناعي'}</button>{aiError && <p className="text-xs text-red-700">{aiError}</p>}{newLessonBlocks.length > 0 && <p className="text-xs text-emerald-700 font-bold">تم اعتماد {newLessonBlocks.length} كتل للمسودة. لن تُنشر إلا بأمر نشر منفصل.</p>}</div>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">عنوان الدرس بالعربية *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: التعرف على الزملاء في العمل"
                  value={newLessonData.titleAr}
                  onChange={(e) => setNewLessonData({ ...newLessonData, titleAr: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">العنوان بالإنجليزية</label>
                <input
                  type="text"
                  placeholder="e.g. Meeting Colleagues at Work"
                  value={newLessonData.titleEn}
                  onChange={(e) => setNewLessonData({ ...newLessonData, titleEn: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-500 font-english"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">رقم الوحدة/الدرس</label>
                  <input
                    type="number"
                    value={newLessonData.unitNumber}
                    onChange={(e) => setNewLessonData({ ...newLessonData, unitNumber: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">المدة المقدرة (بالدقائق)</label>
                  <input
                    type="number"
                    value={newLessonData.durationMinutes}
                    onChange={(e) => setNewLessonData({ ...newLessonData, durationMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ملخص فكرة الدرس</label>
                <textarea
                  rows={2}
                  placeholder="وصف مختصر لما سيتعلمه الطالب في هذا الدرس..."
                  value={newLessonData.summaryAr}
                  onChange={(e) => setNewLessonData({ ...newLessonData, summaryAr: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">حالة الحفظ الأولى:</label>
                <select
                  value={newLessonData.status}
                  onChange={(e) => setNewLessonData({ ...newLessonData, status: e.target.value as ContentStatus })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                >
                  <option value="draft">🟡 حفظ كـ مسودة (Draft) للمراجعة</option>
                  <option value="preview">🔵 معاينة آمنة للطاقم (Preview)</option>
                  <option value="published">🟢 نشر مباشر للطلاب (Published)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingLesson(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                >
                  حفظ الدرس
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
      {aiProposal && <div className="fixed inset-0 z-[70] bg-slate-950/70 p-4 flex items-center justify-center" dir="rtl"><div className="bg-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-4"><h3 className="text-xl font-black">مراجعة اقتراح AI قبل إضافته</h3><p className="text-sm font-bold">{aiProposal.titleAr} · {aiProposal.titleEn}</p><p className="text-sm text-slate-600">{aiProposal.summaryAr}</p><div className="space-y-2">{aiProposal.blocks.map((block,index)=><div key={index} className="border rounded-xl p-3"><span className="text-[10px] bg-slate-100 px-2 py-1 rounded">{block.type}</span><strong className="block mt-2 text-sm">{block.titleAr}</strong><pre className="text-xs whitespace-pre-wrap mt-1 text-slate-600" dir="ltr">{JSON.stringify(block.payload,null,2)}</pre></div>)}</div><div className="flex justify-end gap-2"><button onClick={()=>setAiProposal(null)} className="px-4 py-2 border rounded-xl font-bold text-sm">رفض</button><button onClick={approveProposal} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm">اعتماد كمسودة قابلة للتحرير</button></div></div></div>}

      {/* Modal: Lesson Blocks Preview */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  معاينة كتل المحتوى (Block-Based Architecture)
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{previewLesson.titleAr}</h3>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                يتكون هذا الدرس من كتل محتوى مرتبة ديناميكياً قابلة لإعادة الترتيب والنشر:
              </p>

              {previewLesson.blocks?.length ? <LessonBlocksRenderer blocks={previewLesson.blocks} includeUnpublished/> : <div className="space-y-2.5">
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">كتلة 1: الفيديو الشارح (Video Block)</h5>
                    <p className="text-[11px] text-slate-500">مشغل الفيديو والشرح التأسيسي</p>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">كتلة 2: بنك المفردات الناطق (Vocabulary Set)</h5>
                    <p className="text-[11px] text-slate-500">بطاقات الكلمات مع الرموز الصوتية والأمثلة</p>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">كتلة 3: القواعد النحوية (Grammar Rules)</h5>
                    <p className="text-[11px] text-slate-500">الصيغ والأمثلة والأخطاء الشائعة</p>
                  </div>
                </div>

                <div className="p-3.5 bg-violet-50/50 border border-violet-100 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">كتلة 4: الاختبار التقييمي القصير (Quiz Embed)</h5>
                    <p className="text-[11px] text-slate-500">أسئلة الاختيار من متعدد مع التغذية الراجعة الفورية</p>
                  </div>
                </div>
              </div>}
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setPreviewLesson(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800"
              >
                إغلاق المعاينة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
