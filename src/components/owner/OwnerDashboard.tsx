import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Users,
  CreditCard,
  Settings,
  Sparkles,
  FileText,
  ArrowRight,
  ShieldCheck,
  LogOut,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { OwnerTab, UserRole } from '../../types';
import { OwnerOverview } from './OwnerOverview';
import { OwnerCoursesCMS } from './OwnerCoursesCMS';
import { OwnerQuestionBank } from './OwnerQuestionBank';
import { OwnerStudents } from './OwnerStudents';
import { OwnerSubscriptions } from './OwnerSubscriptions';
import { OwnerSettings } from './OwnerSettings';
import { OwnerAIAssistant } from './OwnerAIAssistant';
import { OwnerAuditLogs } from './OwnerAuditLogs';

interface OwnerDashboardProps {
  onSwitchToStudentView: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onSwitchToStudentView }) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>('overview');

  const navigationItems = [
    { id: 'overview' as OwnerTab, label: 'لوحة النظرة العامة', icon: LayoutDashboard },
    { id: 'courses' as OwnerTab, label: 'المناهج والدروس (CMS)', icon: BookOpen },
    { id: 'questions' as OwnerTab, label: 'بنك الأسئلة المركزي', icon: HelpCircle },
    { id: 'students' as OwnerTab, label: 'الطلاب والمشتركون', icon: Users },
    { id: 'subscriptions' as OwnerTab, label: 'الاشتراكات والكوبونات', icon: CreditCard },
    { id: 'settings' as OwnerTab, label: 'إعدادات المنصة والأسعار', icon: Settings },
    { id: 'ai-assistant' as OwnerTab, label: 'مساعد المالك الذكي AI', icon: Sparkles, highlight: true },
    { id: 'audit-logs' as OwnerTab, label: 'سجل النشاطات (Audit)', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" dir="rtl">
      
      {/* Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20">
            E30
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-tight">English30</span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">بوابة المالك والإدارة المركزية</p>
          </div>
        </div>

        {/* User Role Indicator and Switch Back to Student */}
        <div className="flex items-center gap-3">
          
          <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-2xl text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>المستخدم الحالي: <strong>عبدالله (Owner)</strong></span>
          </div>

          <button
            onClick={onSwitchToStudentView}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>واجهة الطالب (Student View)</span>
          </button>

        </div>

      </header>

      {/* Main Layout Container with Sidebar & Content Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 gap-6">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 space-y-1.5">
          <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : item.highlight
                      ? 'bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Pending Supabase Auth notice card */}
          <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200/80 text-amber-900 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-black text-[11px] text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>ملاحظة أمنية معمارية</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              يتم حفظ التعديلات عبر طبقة التجريد (Service Abstraction Layer) وهي جاهزة للربط الفوري مع قاعدة بيانات Supabase.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && <OwnerOverview onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'courses' && <OwnerCoursesCMS />}
          {activeTab === 'questions' && <OwnerQuestionBank />}
          {activeTab === 'students' && <OwnerStudents />}
          {activeTab === 'subscriptions' && <OwnerSubscriptions />}
          {activeTab === 'settings' && <OwnerSettings />}
          {activeTab === 'ai-assistant' && <OwnerAIAssistant />}
          {activeTab === 'audit-logs' && <OwnerAuditLogs />}
        </main>

      </div>

    </div>
  );
};
