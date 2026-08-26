import React, { useEffect, useMemo, useState } from 'react';
import { ActiveTab, Course } from '../types';
import { LEVELS_DATA } from '../data/mockData';
import { coursesService } from '../services';
import { CheckCircle2, Clock, BookOpen, Target, Layers, Lock } from 'lucide-react';

interface LevelsViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const LevelsView: React.FC<LevelsViewProps> = ({ setActiveTab }) => {
  const [publishedCourses, setPublishedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void coursesService.getPublishedCourses()
      .then((courses) => {
        if (!active) return;
        setPublishedCourses(courses);
        setError('');
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'تعذر تحميل الدورات المنشورة.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const courseCountByLevel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const course of publishedCourses) {
      counts.set(course.level, (counts.get(course.level) ?? 0) + 1);
    }
    return counts;
  }, [publishedCourses]);

  return (
    <div className="space-y-10 py-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>الإطار الأوروبي المرجعي الموحد للغات (CEFR)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">مستويات اللغة الإنجليزية من A1 حتى C2</h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
          يتم تقسيم المنهج إلى مستويات CEFR متدرجة. توفر كل مستوى أدناه مرتبط بالدورات المنشورة فعليًا في المنصة.
        </p>
      </div>

      {loading && <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">جاري التحقق من الدورات المنشورة...</div>}
      {!loading && error && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {LEVELS_DATA.map((lvl) => {
          const publishedCount = courseCountByLevel.get(lvl.code) ?? 0;
          const isAvailable = publishedCount > 0;
          return (
            <div key={lvl.code} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white bg-gradient-to-tr ${lvl.color} shadow-md`}>
                      {lvl.code}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xl text-slate-900">{lvl.titleAr}</h3>
                      <span className="text-xs font-bold text-slate-500 font-english">{lvl.titleEn}</span>
                    </div>
                  </div>

                  {isAvailable ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                      {publishedCount} {publishedCount === 1 ? 'دورة منشورة' : 'دورات منشورة'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      لا توجد دورة منشورة حاليًا
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{lvl.descriptionAr}</p>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span><strong>{lvl.targetVocab}</strong> كلمة مستهدفة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>{lvl.estimatedHours}</strong> ساعة دراسية</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 mb-2">أبرز ما تتعلمه في هذا المستوى:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    {lvl.topicsAr.map((topic, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`flex-1 font-extrabold py-2.5 rounded-xl text-xs text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${isAvailable ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'bg-slate-100 text-amber-800 border border-slate-200'}`}
                >
                  {isAvailable ? <BookOpen className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{isAvailable ? `تصفح دورات ${lvl.code}` : 'تصفح الدورات المنشورة'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('placement-test')}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  اختبار تحديد المستوى
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-right">
          <h3 className="font-bold text-base text-amber-950">تريد التأكد من مستواك الحقيقي قبل البدء؟</h3>
          <p className="text-xs text-amber-800">نوصي بأداء اختبار تحديد المستوى للبدء من الدورة المناسبة مباشرة.</p>
        </div>
        <button
          onClick={() => setActiveTab('placement-test')}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-6 py-3 rounded-xl text-xs shrink-0 shadow-sm"
        >
          ابدأ الاختبار الآن 🎯
        </button>
      </div>
    </div>
  );
};
