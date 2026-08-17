import React, { useState } from 'react';
import { ActiveTab, Course, LevelCode } from '../types';
import { COURSES_DATA } from '../data/mockData';
import {
  Search,
  Filter,
  GraduationCap,
  Star,
  Clock,
  BookOpen,
  Users,
  Play,
  CheckCircle,
  Lock,
} from 'lucide-react';

interface CoursesViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectCourse: (course: Course) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({
  setActiveTab,
  onSelectCourse,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const levelsOptions = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const categoryOptions = [
    { id: 'ALL', labelAr: 'الكل' },
    { id: 'beginner', labelAr: 'المبتدئين' },
    { id: 'grammar', labelAr: 'القواعد' },
    { id: 'vocabulary', labelAr: 'المفردات' },
    { id: 'speaking', labelAr: 'المحادثة' },
    { id: 'listening', labelAr: 'الاستماع' },
    { id: 'business', labelAr: 'الأعمال' },
  ];

  const filteredCourses = COURSES_DATA.filter((course) => {
    const matchesLevel =
      selectedLevel === 'ALL' || course.level === selectedLevel;
    const matchesCategory =
      selectedCategory === 'ALL' || course.category === selectedCategory;
    const matchesSearch =
      course.titleAr.includes(searchQuery) ||
      course.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.descriptionAr.includes(searchQuery);

    return matchesLevel && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 py-6">
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold">
          <GraduationCap className="w-4 h-4 text-indigo-300" />
          <span>مسارات ودورات English30</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">
          دليل الدورات التعليمية الشاملة
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
          اختر الدورة المناسبة لمستواك ومهارتك الحالية. جميع الدورات تتضمن شرحاً عربياً مبسطاً مع تمارين واستماع تفاعلي.
        </p>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن اسم الدورة أو المهارة (مثال: محادثة، قواعد، A2)..."
            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          
          {/* Level Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> المستوى:
            </span>
            {levelsOptions.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl === 'ALL' ? 'الجميع' : `مستوى ${lvl}`}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">المهارة:</span>
            {categoryOptions.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {cat.labelAr}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Courses List Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <div className="text-4xl">🔍</div>
          <h3 className="font-bold text-lg text-slate-800">لم نجد دورات تطابق بحثك</h3>
          <p className="text-sm text-slate-500">جرب تغيير فلتر المستوى أو تصفية العبارات التي أدخلتها.</p>
          <button
            onClick={() => {
              setSelectedLevel('ALL');
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="mt-2 bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-xl text-xs"
          >
            إعادة ضبط الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={`bg-white rounded-3xl overflow-hidden border transition-all flex flex-col justify-between group ${
                course.isLocked ? 'border-slate-200/80 opacity-95' : 'border-slate-200 shadow-xs hover:shadow-md'
              }`}
            >
              {/* Image & Badge */}
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                  src={course.image}
                  alt={course.titleAr}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    course.isLocked ? 'filter grayscale-[25%]' : 'group-hover:scale-105'
                  }`}
                />
                
                {course.isLocked ? (
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md border border-amber-400">
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ستنطلق قريباً</span>
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                    <span>متاحة الآن</span>
                  </div>
                )}

                <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  {course.categoryAr}
                </div>
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{course.rating}</span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold text-lg leading-snug transition-colors ${
                      course.isLocked ? 'text-slate-800' : 'text-slate-900 group-hover:text-indigo-600'
                    }`}>
                      {course.titleAr}
                    </h3>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 font-english">
                    {course.titleEn}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {course.descriptionAr}
                  </p>
                </div>

                {/* Course Progress indicator if available & active */}
                {!course.isLocked && course.progress !== undefined && course.progress > 0 && (
                  <div className="space-y-1 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100">
                    <div className="flex justify-between text-[11px] font-bold text-indigo-900">
                      <span>نسبة إنجازك في الدورة</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Meta details */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      {course.lessonsCount} درسًا
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {course.durationHours} ساعة
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      {course.studentsCount.toLocaleString('ar-SA')}
                    </span>
                  </div>

                  {course.isLocked ? (
                    <button
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 text-amber-800 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>ستنطلق قريباً</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectCourse(course)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>ابدأ التعلم في هذه الدورة</span>
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
