import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  CheckCircle2,
  Trash2,
  Filter,
  Tag,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { questionsService, auditService } from '../../services';
import { BankQuestion, LevelCode, QuestionType } from '../../types';

export const OwnerQuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [levelFilter, setLevelFilter] = useState<LevelCode | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);

  // New question form state
  const [newPromptEn, setNewPromptEn] = useState('');
  const [newLevel, setNewLevel] = useState<LevelCode>('A1');
  const [newCategory, setNewCategory] = useState('Grammar');
  const [newExplanationAr, setNewExplanationAr] = useState('');
  const [options, setOptions] = useState([
    { key: 'opt_1', textEn: '' },
    { key: 'opt_2', textEn: '' },
    { key: 'opt_3', textEn: '' },
    { key: 'opt_4', textEn: '' },
  ]);
  const [correctKey, setCorrectKey] = useState('opt_1');

  useEffect(() => {
    async function load() {
      const q = await questionsService.getQuestions();
      setQuestions(q);
    }
    load();
  }, []);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPromptEn.trim() || !newExplanationAr.trim()) return;

    const created = await questionsService.createQuestion({
      type: 'multiple_choice',
      level: newLevel,
      category: newCategory,
      promptEn: newPromptEn,
      options: options.filter((o) => o.textEn.trim() !== ''),
      correctOptionKey: correctKey,
      explanationAr: newExplanationAr,
      tags: [newCategory.toLowerCase(), newLevel.toLowerCase()],
    });

    setQuestions((prev) => [created, ...prev]);
    setIsAdding(false);

    // Reset form
    setNewPromptEn('');
    setNewExplanationAr('');
    setOptions([
      { key: 'opt_1', textEn: '' },
      { key: 'opt_2', textEn: '' },
      { key: 'opt_3', textEn: '' },
      { key: 'opt_4', textEn: '' },
    ]);
    setCorrectKey('opt_1');

    await auditService.logAction(
      'CREATE_BANK_QUESTION',
      'question_bank',
      `سؤال ${created.level} (${created.category})`,
      `تمت إضافة سؤال جديد لبنك الأسئلة: ${created.promptEn.substring(0, 40)}...`
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا السؤال من بنك الأسئلة؟')) return;
    await questionsService.deleteQuestion(id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const filteredQuestions = questions.filter((q) => {
    if (levelFilter !== 'all' && q.level !== levelFilter) return false;
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">بنك الأسئلة المركزي (Question Bank)</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            مستودع أسئلة مستقل وقابل لإعادة الاستخدام في اختبارات الدروس واختبار تحديد المستوى.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة سؤال للبنك</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        
        {/* CEFR Level filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">المستوى:</span>
          <div className="flex items-center gap-1">
            {(['all', 'A1', 'A2', 'B1', 'B2', 'C1'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  levelFilter === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl === 'all' ? 'الكل' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Skill category filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">المهارة:</span>
          <div className="flex items-center gap-1">
            {(['all', 'Grammar', 'Vocabulary', 'Reading', 'Listening'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' && 'الكل'}
                {cat === 'Grammar' && 'قواعد'}
                {cat === 'Vocabulary' && 'مفردات'}
                {cat === 'Reading' && 'قراءة'}
                {cat === 'Listening' && 'استماع'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500">
          مجموع الأسئلة: <span className="text-indigo-600 font-black">{filteredQuestions.length}</span>
        </div>

      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          return (
            <div
              key={q.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 relative hover:border-indigo-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    مستوى {q.level}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">
                    {q.category}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors self-end sm:self-auto cursor-pointer"
                  title="حذف السؤال"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Prompt */}
              <div>
                <p className="text-base font-bold text-slate-900 font-english" dir="ltr">
                  {q.promptEn}
                </p>
                {q.promptAr && <p className="text-xs text-slate-500 mt-1">{q.promptAr}</p>}
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt) => {
                  const isCorrect = opt.key === q.correctOptionKey;
                  return (
                    <div
                      key={opt.key}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        isCorrect
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-english" dir="ltr">{opt.textEn}</span>
                      {isCorrect && (
                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>الإجابة الصحيحة</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
                💡 <strong>التفسير والشرح:</strong> {q.explanationAr}
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal: Add New Question */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">إضافة سؤال جديد لبنك الأسئلة</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">المستوى CEFR</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as LevelCode)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="A1">A1 - مبتدئ</option>
                    <option value="A2">A2 - فوق المبتدئ</option>
                    <option value="B1">B1 - متوسط</option>
                    <option value="B2">B2 - فوق المتوسط</option>
                    <option value="C1">C1 - متقدم</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">المهارة والتصنيف</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Grammar">Grammar (قواعد)</option>
                    <option value="Vocabulary">Vocabulary (مفردات)</option>
                    <option value="Reading">Reading (قراءة)</option>
                    <option value="Listening">Listening (استماع)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نص السؤال بالإنجليزية *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. She ____ a doctor at the hospital."
                  value={newPromptEn}
                  onChange={(e) => setNewPromptEn(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-english"
                  dir="ltr"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  خيارات الإجابة (حدد الإجابة الصحيحة):
                </label>
                {options.map((opt, i) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctKey === opt.key}
                      onChange={() => setCorrectKey(opt.key)}
                      className="cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder={`خيار ${i + 1}`}
                      value={opt.textEn}
                      onChange={(e) => {
                        const next = [...options];
                        next[i].textEn = e.target.value;
                        setOptions(next);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-english"
                      dir="ltr"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الشرح والتفسير بالعربية *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="اشرح للطالب لماذا هذه الإجابة هي الصحيحة..."
                  value={newExplanationAr}
                  onChange={(e) => setNewExplanationAr(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                >
                  إضافة السؤال
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
