import React, { useEffect, useMemo, useState } from 'react';
import { ActiveTab, Course } from '../types';
import { coursesService } from '../services';
import { Search, Filter, GraduationCap, Star, Clock, BookOpen, Users, Play, Lock } from 'lucide-react';

interface CoursesViewProps { setActiveTab: (tab: ActiveTab) => void; onSelectCourse: (course: Course) => void; }

export const CoursesView: React.FC<CoursesViewProps> = ({ setActiveTab, onSelectCourse }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError('');
      try { const data = await coursesService.getPublishedCourses(); if (mounted) setCourses(data); }
      catch (e) { if (mounted) setError(e instanceof Error ? e.message : 'تعذر تحميل الدورات.'); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => Array.from(new Set(courses.map(c => c.category).filter(Boolean))), [courses]);
  const filtered = useMemo(() => courses.filter(c => {
    const level = selectedLevel === 'ALL' || c.level === selectedLevel;
    const category = selectedCategory === 'ALL' || c.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const text = `${c.titleAr} ${c.titleEn} ${c.descriptionAr}`.toLowerCase();
    return level && category && (!q || text.includes(q));
  }), [courses, selectedLevel, selectedCategory, searchQuery]);

  return <div className="space-y-8 py-6" dir="rtl">
    <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold"><GraduationCap className="w-4 h-4"/>مسارات ودورات English30</div>
      <h1 className="text-3xl sm:text-4xl font-extrabold">الدورات التعليمية</h1>
      <p className="text-slate-300 text-sm sm:text-base max-w-2xl">الدورات المنشورة فعليًا من قاعدة بيانات English30. المحتوى غير المنشور لا يظهر للطلاب.</p>
    </div>
    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
      <div className="relative"><Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2"/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="ابحث في الدورات..." className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"/></div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter className="w-3.5 h-3.5"/>المستوى:</span>{['ALL','A1','A2','B1','B2','C1','C2'].map(l=><button key={l} onClick={()=>setSelectedLevel(l)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedLevel===l?'bg-slate-900 text-white':'bg-slate-100 text-slate-600'}`}>{l==='ALL'?'الجميع':l}</button>)}</div>
      {categories.length>0&&<div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">المهارة:</span><button onClick={()=>setSelectedCategory('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedCategory==='ALL'?'bg-indigo-600 text-white':'bg-indigo-50 text-indigo-700'}`}>الكل</button>{categories.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedCategory===c?'bg-indigo-600 text-white':'bg-indigo-50 text-indigo-700'}`}>{c}</button>)}</div>}
    </div>
    {loading&&<div className="bg-white p-12 rounded-2xl border text-center text-sm text-slate-500">جاري تحميل الدورات...</div>}
    {!loading&&error&&<div className="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 text-sm">{error}</div>}
    {!loading&&!error&&filtered.length===0&&<div className="bg-white p-12 text-center rounded-2xl border border-slate-200"><div className="text-4xl mb-3">📚</div><h3 className="font-bold text-lg">لا توجد دورات منشورة تطابق بحثك</h3><button onClick={()=>{setSelectedLevel('ALL');setSelectedCategory('ALL');setSearchQuery('')}} className="mt-4 bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-xl text-xs">إعادة ضبط الفلاتر</button></div>}
    {!loading&&!error&&filtered.length>0&&<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map(course=><article key={course.id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs flex flex-col"><div className="relative h-48 bg-slate-100">{course.image?<img src={course.image} alt={course.titleAr} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-5xl">📘</div>}<div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-lg">متاحة الآن</div><div className="absolute bottom-3 right-3 bg-white/90 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400"/>{course.rating}</div></div><div className="p-6 space-y-4 flex-1 flex flex-col"><div className="space-y-2"><h3 className="font-bold text-lg text-slate-900">{course.titleAr}</h3><p className="text-xs text-slate-400 font-english">{course.titleEn}</p><p className="text-xs text-slate-600 leading-relaxed">{course.descriptionAr}</p></div><div className="mt-auto pt-3 border-t border-slate-100"><div className="flex items-center justify-between text-xs text-slate-500 mb-3"><span><BookOpen className="inline w-3.5 h-3.5 text-indigo-500 ml-1"/>{course.lessonsCount} درس</span><span><Clock className="inline w-3.5 h-3.5 text-indigo-500 ml-1"/>{course.durationHours} ساعة</span><span><Users className="inline w-3.5 h-3.5 text-indigo-500 ml-1"/>{course.studentsCount}</span></div><button disabled={course.isLocked} onClick={()=>onSelectCourse(course)} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2">{course.isLocked?<Lock className="w-4 h-4"/>:<Play className="w-4 h-4 fill-white"/>}{course.isLocked?'مغلقة':'ابدأ التعلم'}</button></div></div></article>)}</div>}
  </div>;
};

