import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, Award, Blocks, BookOpen, ClipboardCheck, CreditCard, FileJson, Files, FileText, Flag, GraduationCap, HelpCircle, History, Images, KeyRound, LayoutDashboard, Loader2, Settings, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { OwnerTab, PermissionCode } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';

const OwnerOverview = lazy(() => import('./OwnerOverview').then((module) => ({ default: module.OwnerOverview })));
const OwnerCoursesCMS = lazy(() => import('./OwnerCoursesCMS').then((module) => ({ default: module.OwnerCoursesCMS })));
const OwnerQuestionBank = lazy(() => import('./OwnerQuestionBank').then((module) => ({ default: module.OwnerQuestionBank })));
const OwnerQuizManager = lazy(() => import('./OwnerQuizManager').then((module) => ({ default: module.OwnerQuizManager })));
const OwnerStudents = lazy(() => import('./OwnerStudents').then((module) => ({ default: module.OwnerStudents })));
const OwnerSubscriptions = lazy(() => import('./OwnerSubscriptions').then((module) => ({ default: module.OwnerSubscriptions })));
const OwnerSettings = lazy(() => import('./OwnerSettings').then((module) => ({ default: module.OwnerSettings })));
const OwnerAIAssistant = lazy(() => import('./OwnerAIAssistant').then((module) => ({ default: module.OwnerAIAssistant })));
const OwnerAIDrafts = lazy(() => import('./OwnerAIDrafts').then((module) => ({ default: module.OwnerAIDrafts })));
const OwnerAuditLogs = lazy(() => import('./OwnerAuditLogs').then((module) => ({ default: module.OwnerAuditLogs })));
const OwnerMediaLibrary = lazy(() => import('./OwnerMediaLibrary').then((module) => ({ default: module.OwnerMediaLibrary })));
const OwnerLessonBuilder = lazy(() => import('./OwnerLessonBuilder').then((module) => ({ default: module.OwnerLessonBuilder })));
const OwnerPagesCMS = lazy(() => import('./OwnerPagesCMS').then((module) => ({ default: module.OwnerPagesCMS })));
const OwnerFeatureFlags = lazy(() => import('./OwnerFeatureFlags').then((module) => ({ default: module.OwnerFeatureFlags })));
const OwnerPermissions = lazy(() => import('./OwnerPermissions').then((module) => ({ default: module.OwnerPermissions })));
const OwnerContentVersions = lazy(() => import('./OwnerContentVersions').then((module) => ({ default: module.OwnerContentVersions })));
const OwnerCertificates = lazy(() => import('./OwnerCertificates').then((module) => ({ default: module.OwnerCertificates })));
const OwnerDiagnostics = lazy(() => import('./OwnerDiagnostics').then((module) => ({ default: module.OwnerDiagnostics })));
const OwnerImportExport = lazy(() => import('./OwnerImportExport').then((module) => ({ default: module.OwnerImportExport })));

interface OwnerDashboardProps { onSwitchToStudentView: () => void; }
type NavItem = { id: OwnerTab; label: string; icon: React.ComponentType<{ className?: string }>; permission?: PermissionCode; permissions?: PermissionCode[]; ownerOnly?: boolean; highlight?: boolean; };

const loading = <div className="bg-white border rounded-3xl p-12 flex justify-center text-indigo-600"><Loader2 className="w-6 h-6 animate-spin"/></div>;

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onSwitchToStudentView }) => {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<OwnerTab>('overview');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [permissionError, setPermissionError] = useState('');
  const items: NavItem[] = [
    { id:'overview',label:'النظرة العامة',icon:LayoutDashboard }, { id:'courses',label:'الدورات والدروس',icon:BookOpen,permission:'content.manage' },
    { id:'lesson-builder',label:'منشئ كتل الدروس',icon:Blocks,permission:'content.manage' }, { id:'versions',label:'نسخ المحتوى',icon:History,permission:'content.manage' },
    { id:'media',label:'مكتبة الوسائط',icon:Images,permission:'media.manage' }, { id:'questions',label:'الاختبارات والأسئلة',icon:HelpCircle,permission:'quiz.manage' },
    { id:'pages',label:'الصفحات القانونية وSEO',icon:Files,permission:'pages.manage' }, { id:'feature-flags',label:'مفاتيح الميزات',icon:Flag,permission:'features.manage' },
    { id:'certificates',label:'الشهادات',icon:Award,permission:'certificates.manage' }, { id:'students',label:'الطلاب',icon:Users,permission:'students.manage' },
    { id:'subscriptions',label:'الاشتراكات والكوبونات',icon:CreditCard,permission:'subscriptions.manage' }, { id:'permissions',label:'الأدوار والصلاحيات',icon:KeyRound,ownerOnly:true },
    { id:'settings',label:'إعدادات المنصة',icon:Settings,permission:'settings.manage' }, { id:'import-export',label:'الاستيراد والتصدير',icon:FileJson,permissions:['content.manage','quiz.manage','certificates.manage'] },
    { id:'diagnostics',label:'الصحة والتشخيصات',icon:Activity,permission:'diagnostics.view' }, { id:'ai-assistant',label:'مساعد المالك AI',icon:Sparkles,permission:'ai.generate',highlight:true },
    { id:'ai-drafts',label:'مسودات AI',icon:ClipboardCheck,permission:'ai.generate' }, { id:'audit-logs',label:'سجل التدقيق',icon:FileText,permission:'audit.view' },
  ];
  useEffect(() => {
    let live = true;
    if (isOwner) { setPermissions(new Set(items.flatMap((item) => [...(item.permission ? [item.permission] : []), ...(item.permissions ?? [])]))); return; }
    const codes = [...new Set(items.flatMap((item) => [...(item.permission ? [item.permission] : []), ...(item.permissions ?? [])]))];
    void Promise.all(codes.map(async (code) => ({ code, result: await getSupabaseClient().rpc('check_permission', { p_permission: code }) }))).then((results) => {
      if (!live) return; const failed = results.find(({ result }) => result.error); if (failed?.result.error) throw failed.result.error;
      setPermissions(new Set(results.filter(({ result }) => result.data === true).map(({ code }) => code)));
    }).catch((reason) => { if (live) setPermissionError(reason instanceof Error ? reason.message : 'تعذر التحقق من الصلاحيات.'); });
    return () => { live = false; };
  }, [isOwner]);
  const visibleItems = items.filter((item) => (!item.ownerOnly || isOwner) && (!item.permission || permissions.has(item.permission)) && (!item.permissions || item.permissions.every((code) => permissions.has(code))));
  useEffect(() => { if (!visibleItems.some((item) => item.id === activeTab)) setActiveTab('overview'); }, [activeTab, isOwner, permissions]);
  const content = activeTab==='overview'?<OwnerOverview onNavigateTab={setActiveTab}/>:activeTab==='courses'?<OwnerCoursesCMS/>:activeTab==='lesson-builder'?<OwnerLessonBuilder/>:activeTab==='versions'?<OwnerContentVersions/>:activeTab==='media'?<OwnerMediaLibrary/>:activeTab==='questions'?<><OwnerQuizManager/><OwnerQuestionBank/></>:activeTab==='pages'?<OwnerPagesCMS/>:activeTab==='feature-flags'?<OwnerFeatureFlags/>:activeTab==='certificates'?<OwnerCertificates/>:activeTab==='students'?<OwnerStudents/>:activeTab==='subscriptions'?<OwnerSubscriptions/>:activeTab==='permissions'&&isOwner?<OwnerPermissions/>:activeTab==='settings'?<OwnerSettings/>:activeTab==='import-export'?<OwnerImportExport/>:activeTab==='diagnostics'?<OwnerDiagnostics/>:activeTab==='ai-assistant'?<OwnerAIAssistant/>:activeTab==='ai-drafts'?<OwnerAIDrafts/>:activeTab==='audit-logs'?<OwnerAuditLogs/>:null;
  return <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl"><header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black">E30</div><div><div className="flex items-center gap-2"><span className="font-black">English30</span><span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">OWNER CMS</span></div><p className="text-[11px] text-slate-400">الإدارة المركزية للمنصة</p></div></div><div className="flex items-center gap-3"><span className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl text-xs"><ShieldCheck className="w-4 h-4 text-amber-400"/>RLS وصلاحيات قاعدة البيانات مفعلة</span><button onClick={onSwitchToStudentView} className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-xl text-xs font-black flex gap-2"><GraduationCap className="w-4 h-4"/>واجهة الطالب</button></div></header><div className="flex-1 flex flex-col md:flex-row max-w-[1500px] w-full mx-auto p-4 sm:p-6 gap-6"><aside className="w-full md:w-72 shrink-0"><div className="bg-white p-3 rounded-3xl border shadow-sm space-y-1 md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-auto">{visibleItems.map((item)=>{const Icon=item.icon;const active=activeTab===item.id;return <button key={item.id} onClick={()=>setActiveTab(item.id)} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black ${active?'bg-indigo-600 text-white shadow-md':item.highlight?'bg-indigo-50 text-indigo-700':'text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-2.5"><Icon className="w-4 h-4"/>{item.label}</span>{item.highlight&&!active&&<span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"/>}</button>})}</div></aside><main className="flex-1 min-w-0">{permissionError&&<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">{permissionError}</div>}<Suspense fallback={loading}>{content}</Suspense></main></div></div>;
};
