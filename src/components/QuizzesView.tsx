import React, { useEffect, useState } from 'react';
import { Award, BookOpen } from 'lucide-react';
import { Lesson } from '../types';
import { lessonsService } from '../services';
import { DatabaseQuizPanel } from './DatabaseQuizPanel';

interface QuizzesViewProps {
  courseId?: string;
  onEarnXP: (xp: number) => void;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({ courseId }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    void lessonsService.getLessons(courseId, 'published')
      .then((rows) => {
        if (!live) return;
        setLessons(rows);
        setLessonId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id || '');
      })
      .catch((reason) => { if (live) setError(reason instanceof Error ? reason.message : 'تعذر تحميل الاختبارات.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [courseId]);

  return <div className="space-y-8 py-6" dir="rtl">
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold"><Award className="w-4 h-4 text-amber-400"/>مركز الاختبارات الرسمية</div>
      <h1 className="text-3xl font-extrabold">اختبارات الدروس المنشورة</h1>
      <p className="text-slate-300 text-sm max-w-xl">الأسئلة والنتائج تُحمّل وتُصحح من Supabase، ولا تُستخدم بيانات تجريبية أو إجابات مخزنة في المتصفح.</p>
    </div>
    <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
      {loading && <p className="text-sm text-slate-500">جاري تحميل الدروس المنشورة...</p>}
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
      {!loading && !error && lessons.length === 0 && <div className="p-8 text-center text-slate-500"><BookOpen className="w-10 h-10 mx-auto mb-3"/><p>لا توجد دروس منشورة ومتاحة لهذا الحساب.</p></div>}
      {lessons.length > 0 && <>
        <label className="block text-sm font-black">اختر الدرس
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} className="mt-2 w-full border rounded-xl p-3 text-sm">
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.titleAr}</option>)}
          </select>
        </label>
        {lessonId && <DatabaseQuizPanel lessonId={lessonId}/>} 
      </>}
    </section>
  </div>;
};
