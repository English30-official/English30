import React, { useState } from 'react';
import { Activity, Award, Blocks, BookOpen, ClipboardCheck, CreditCard, FileJson, Files, FileText, Flag, GraduationCap, HelpCircle, History, Images, KeyRound, LayoutDashboard, Settings, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { OwnerTab } from '../../types';
import { OwnerOverview } from './OwnerOverview';
import { OwnerCoursesCMS } from './OwnerCoursesCMS';
import { OwnerQuestionBank } from './OwnerQuestionBank';
import { OwnerStudents } from './OwnerStudents';
import { OwnerSubscriptions } from './OwnerSubscriptions';
import { OwnerSettings } from './OwnerSettings';
import { OwnerAIAssistant } from './OwnerAIAssistant';
import { OwnerAIDrafts } from './OwnerAIDrafts';
import { OwnerAuditLogs } from './OwnerAuditLogs';
import { OwnerMediaLibrary } from './OwnerMediaLibrary';
import { OwnerLessonBuilder } from './OwnerLessonBuilder';
import { OwnerPagesCMS } from './OwnerPagesCMS';
import { OwnerFeatureFlags } from './OwnerFeatureFlags';
import { OwnerPermissions } from './OwnerPermissions';
import { OwnerContentVersions } from './OwnerContentVersions';
import { OwnerCertificates } from './OwnerCertificates';
import { OwnerDiagnostics } from './OwnerDiagnostics';
import { OwnerImportExport } from './OwnerImportExport';
import { OwnerQuizManager } from './OwnerQuizManager';

interface OwnerDashboardProps { onSwitchToStudentView: () => void; }

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onSwitchToStudentView }) => {
  const [activeTab, setActiveTab] = useState<OwnerTab>('overview');
  const items = [
    { id: 'overview' as OwnerTab, label: 'النظرة العامة', icon: LayoutDashboard },
    { id: 'courses' as OwnerTab, label: 'الدورات والدروس', icon: BookOpen },
    { id: 'lesson-builder' as OwnerTab, label: 'منشئ كتل الدروس', icon: Blocks },
    { id: 'versions' as OwnerTab, label: 'نسخ المحتوى', icon: History },
    { id: 'media' as OwnerTab, label: 'مكتبة الوسائط', icon: Images },
    { id: 'questions' as OwnerTab, label: 'الاختبارات والأسئلة', icon: HelpCircle },
    { id: 'pages' as OwnerTab, label: 'الصفحات القانونية وSEO', icon: Files },
    { id: 'feature-flags' as OwnerTab, label: 'مفاتيح الميزات', icon: Flag },
    { id: 'certificates' as OwnerTab, label: 'الشهادات', icon: Award },
    { id: 'students' as OwnerTab, label: 'الطلاب', icon: Users },
    { id: 'subscriptions' as OwnerTab, label: 'الاشتراكات والكوبونات', icon: CreditCard },
    { id: 'permissions' as OwnerTab, label: 'الأدوار والصلاحيات', icon: KeyRound },
    { id: 'settings' as OwnerTab, label: 'إعدادات المنصة', icon: Settings },
    { id: 'import-export' as OwnerTab, label: 'الاستيراد والتصدير', icon: FileJson },
    { id: 'diagnostics' as OwnerTab, label: 'الصحة والتشخيصات', icon: Activity },
    { id: 'ai-assistant' as OwnerTab, label: 'مساعد المالك AI', icon: Sparkles, highlight: true },
    { id: 'ai-drafts' as OwnerTab, label: 'مسودات AI', icon: ClipboardCheck },
    { id: 'audit-logs' as OwnerTab, label: 'سجل التدقيق', icon: FileText },
  ];
  return <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black">E30</div><div><div className="flex items-center gap-2"><span className="font-black">English30</span><span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">OWNER CMS</span></div><p className="text-[11px] text-slate-400">الإدارة المركزية للمنصة</p></div></div><div className="flex items-center gap-3"><span className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl text-xs"><ShieldCheck className="w-4 h-4 text-amber-400"/>صلاحيات قاعدة البيانات مفعلة</span><button onClick={onSwitchToStudentView} className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-xs font-black flex gap-2"><GraduationCap className="w-4 h-4"/>واجهة الطالب</button></div></header>
    <div className="flex-1 flex flex-col md:flex-row max-w-[1500px] w-full mx-auto p-4 sm:p-6 gap-6"><aside className="w-full md:w-72 shrink-0"><div className="bg-white p-3 rounded-3xl border shadow-sm space-y-1 md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-auto">{items.map(item=>{const Icon=item.icon;const active=activeTab===item.id;return <button key={item.id} onClick={()=>setActiveTab(item.id)} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black ${active?'bg-indigo-600 text-white shadow-md':item.highlight?'bg-indigo-50 text-indigo-700':'text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-2.5"><Icon className="w-4 h-4"/>{item.label}</span>{item.highlight&&!active&&<span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"/>}</button>})}</div></aside><main className="flex-1 min-w-0">
      {activeTab==='overview'&&<OwnerOverview onNavigateTab={setActiveTab}/>} {activeTab==='courses'&&<OwnerCoursesCMS/>} {activeTab==='lesson-builder'&&<OwnerLessonBuilder/>} {activeTab==='versions'&&<OwnerContentVersions/>} {activeTab==='media'&&<OwnerMediaLibrary/>} {activeTab==='questions'&&<><OwnerQuizManager/><OwnerQuestionBank/></>} {activeTab==='pages'&&<OwnerPagesCMS/>} {activeTab==='feature-flags'&&<OwnerFeatureFlags/>} {activeTab==='certificates'&&<OwnerCertificates/>} {activeTab==='students'&&<OwnerStudents/>} {activeTab==='subscriptions'&&<OwnerSubscriptions/>} {activeTab==='permissions'&&<OwnerPermissions/>} {activeTab==='settings'&&<OwnerSettings/>} {activeTab==='import-export'&&<OwnerImportExport/>} {activeTab==='diagnostics'&&<OwnerDiagnostics/>} {activeTab==='ai-assistant'&&<OwnerAIAssistant/>} {activeTab==='ai-drafts'&&<OwnerAIDrafts/>} {activeTab==='audit-logs'&&<OwnerAuditLogs/>}
    </main></div>
  </div>;
};
