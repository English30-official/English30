import React from 'react';
import { ActiveTab, StudentStats } from '../types';
import {
  Flame,
  Zap,
  Award,
  BookOpen,
  Volume2,
  CheckCircle2,
  TrendingUp,
  Play,
  Calendar,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardViewProps {
  stats: StudentStats;
  setActiveTab: (tab: ActiveTab) => void;
  onStartLesson: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  setActiveTab,
  onStartLesson,
}) => {
  return (
    <div className="space-y-8 py-6">
      
      {/* Student Profile Header Banner */}
      <div className="bg-white text-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 p-1 shadow-md shadow-indigo-200 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-indigo-50 rounded-xl flex items-center justify-center font-black text-2xl text-indigo-700">
                👨‍🎓
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-black text-slate-800">مرحباً بك في لوحة تقدمك</h1>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-bold text-xs">
                  طالب نَشِط
                </span>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className="px-2.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-md font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>✨ ترقية الخطة</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                مستواك الحالي: <strong className="text-indigo-600 font-black">{stats.level}</strong> | البيانات معروضة من سجل تقدم حسابك
              </p>
            </div>
          </div>

          {/* Gamification stats pill */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="text-center px-3 border-l border-slate-200">
              <div className="flex items-center justify-center gap-1 text-orange-500 font-black text-lg">
                <Flame className="w-5 h-5 fill-orange-500" />
                <span>{stats.streakDays}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold">أيام متتالية</div>
            </div>

            <div className="text-center px-3">
              <div className="flex items-center justify-center gap-1 text-violet-600 font-black text-lg">
                <Zap className="w-5 h-5 fill-violet-600" />
                <span>{stats.xp}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold">مجموع XP</div>
            </div>
          </div>
        </div>

        {/* Level Progression Gauge Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>تقدم الدروس المنشورة المتاحة</span>
            <span className="text-indigo-600">{stats.totalLessons ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.totalLessons ? Math.round((stats.completedLessons / stats.totalLessons) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Suggested Next Lesson Action Banner */}
      <div className="bg-indigo-50/80 border border-indigo-100 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-bold text-xs">
            <Play className="w-3.5 h-3.5 fill-indigo-800" />
            <span>الدرس التالي المقترح لك اليوم</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            تابع الدورة المنشورة التي اخترتها
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            افتح الدرس التالي المتاح، وسيُحفظ وقت الدراسة والإكمال في حسابك تلقائيًا.
          </p>
        </div>

        <button
          onClick={onStartLesson}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-4 rounded-xl text-sm shadow-md shadow-indigo-200 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
            <span>متابعة الدرس الآن</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المفردات المكتسبة</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Volume2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-english">
            {stats.wordsLearned}
            <span className="text-xs font-normal text-slate-400 mr-1">/ {stats.totalWordsTarget}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full" style={{ width: `${stats.totalWordsTarget ? Math.min(100, Math.round((stats.wordsLearned / stats.totalWordsTarget) * 100)) : 0}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الدروس المكتملة</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-english">
            {stats.completedLessons}
            <span className="text-xs font-normal text-slate-400 mr-1">/ {stats.totalLessons}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${stats.totalLessons ? Math.min(100, Math.round((stats.completedLessons / stats.totalLessons) * 100)) : 0}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">معدل درجاتك</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-english">
            {stats.averageScore}%
          </div>
          <p className="text-[11px] text-slate-500 font-bold">متوسط نتائج الاختبارات الرسمية</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">السلسلة اليومية</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-english">
            {stats.streakDays} أيام
          </div>
          <p className="text-[11px] text-slate-500 font-bold">حافِظ على التعلم غداً!</p>
        </div>

      </div>

      {/* Study Analytics Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">إحصائيات دقائق التعلم هذا الأسبوع</h3>
            <p className="text-xs text-slate-500">تتبع عدد الدقائق التي أمضيتها في الاستماع وحل التمارين</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
            <TrendingUp className="w-4 h-4" />
            <span>المجموع: {stats.studyTimeMinutesThisWeek.reduce((sum, item) => sum + item.minutes, 0)} دقيقة</span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.studyTimeMinutesThisWeek}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                formatter={(val) => [`${val} دقيقة`, 'وقت التعلم']}
              />
              <Bar dataKey="minutes" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">الأوسمة والإنجازات المفتوحة</h3>
            <p className="text-xs text-slate-500">احصل على الأوسمة مع استمرارك في التمرن اليومي</p>
          </div>
          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            {stats.achievements.filter((a) => a.unlocked).length} / {stats.achievements.length} أوسمة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {stats.achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                ach.unlocked
                  ? 'bg-amber-50/60 border-amber-200/80 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-xs shrink-0 border border-slate-200">
                {ach.unlocked ? '🏆' : <Lock className="w-4 h-4 text-slate-400" />}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm">{ach.titleAr}</h4>
                <p className="text-xs text-slate-600 leading-snug">{ach.descAr}</p>
                {ach.unlockedAt && (
                  <span className="text-[10px] font-bold text-amber-700 block mt-1">
                    فتح: {ach.unlockedAt}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
