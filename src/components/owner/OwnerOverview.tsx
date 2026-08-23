import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  BookOpen,
  Award,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { studentsService, subscriptionsService, coursesService, lessonsService } from '../../services';
import { OwnerTab } from '../../types';

interface OwnerOverviewProps {
  onNavigateTab: (tab: OwnerTab) => void;
}

export const OwnerOverview: React.FC<OwnerOverviewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeSubscribers: 0,
    conversionRate: 0,
    totalXP: 0,
  });

  const [finMetrics, setFinMetrics] = useState({
    monthlyRecurringRevenueSAR: 0,
    annualRevenueRunRateSAR: 0,
    averageRevenuePerUserSAR: 0,
  });

  const [coursesCount, setCoursesCount] = useState(0);
  const [lessonsCount, setLessonsCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const s = await studentsService.getStatsSummary();
      setStats(s);
      const f = await subscriptionsService.getFinancialMetrics();
      setFinMetrics(f);
      const c = await coursesService.getCourses();
      setCoursesCount(c.length);
      const l = await lessonsService.getLessons();
      setLessonsCount(l.length);
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Top Banner with Supabase Migration Info */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-indigo-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                صلاحيات المالك الكاملة (Owner Role)
              </span>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold">
                Supabase Auth وRLS متصلان
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              لوحة التحكم المركزية لمنصة English30
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              تحكم كامل في الدورات والمناهج، بنك الأسئلة، إعدادات المنصة، الطلاب والاشتراكات، مع دعم مساعد المالك الذكي لتوليد المحتوى بضغطة زر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('ai-assistant')}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>فتح مساعد المالك AI</span>
            </button>
            <button
              onClick={() => onNavigateTab('settings')}
              className="bg-white/10 hover:bg-white/15 text-white border border-white/20 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              إعدادات المنصة والأسعار
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Students */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الطلاب المسجلين</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.totalStudents}</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5"/>بيانات حية</span>
          </div>
          <p className="text-xs text-slate-500">من مختلف الدول العربية</p>
        </div>

        {/* Active Subscribers */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المشتركون النشطون</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.activeSubscribers}</span>
            <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
              نسبة التحويل {stats.conversionRate}%
            </span>
          </div>
          <p className="text-xs text-slate-500">اشتراكات سارية المفعول</p>
        </div>

        {/* MRR Estimate */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الإيراد الشهري (MRR)</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {finMetrics.monthlyRecurringRevenueSAR.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">ريال / شهرياً</span>
          </div>
          <p className="text-xs text-slate-500">متوسط الإيراد للطالب {finMetrics.averageRevenuePerUserSAR} ر.س</p>
        </div>

        {/* Content Items */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المحتوى والمناهج</span>
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{coursesCount} دورات</span>
            <span className="text-xs text-slate-500 font-bold">({lessonsCount} درساً)</span>
          </div>
          <p className="text-xs text-slate-500">جاهزة ومنشورة للمتعلمين</p>
        </div>

      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">الوصول السريع لوحدات الإدارة</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          <div
            onClick={() => onNavigateTab('courses')}
            className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 mb-1">إدارة المناهج والدروس (CMS)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              إضافة وتعديل الدورات والدروس وكتل المحتوى (فيديو، مفردات، قواعد، وتمارين) والتحكم في النشر.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('questions')}
            className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 mb-1">بنك الأسئلة المركزي</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              إدارة الأسئلة المصنفة حسب مستويات CEFR والمهارات (قواعد، مفردات، استماع، قراءة) مع الخيارات والتفسير.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('settings')}
            className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 mb-1">إعدادات المنصة والأسعار</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تعديل أسعار الباقات، أرقام الواتساب، روابط تيليجرام، وشريط الإعلانات الترويجي فوراً.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
