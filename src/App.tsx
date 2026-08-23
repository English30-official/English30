import React, { useEffect, useState } from 'react';
import { ActiveTab, Course, LevelCode, StudentStats, AppMode, PlatformSettings } from './types';
import { INITIAL_STUDENT_STATS, COURSES_DATA } from './data/mockData';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { LevelsView } from './components/LevelsView';
import { CoursesView } from './components/CoursesView';
import { LessonView } from './components/LessonView';
import { PlacementTestView } from './components/PlacementTestView';
import { DashboardView } from './components/DashboardView';
import { VocabView } from './components/VocabView';
import { QuizzesView } from './components/QuizzesView';
import { AITutorView } from './components/AITutorView';
import { PricingView } from './components/PricingView';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { AuthView } from './components/AuthView';
import { FirstOwnerActivation } from './components/FirstOwnerActivation';
import { StudentCertificatesView } from './components/StudentCertificatesView';
import { CertificateVerificationView } from './components/CertificateVerificationView';
import { PublicPageView } from './components/PublicPageView';
import { useAuth } from './auth/AuthContext';
import { settingsService } from './services';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('student');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stats, setStats] = useState<StudentStats>(INITIAL_STUDENT_STATS);
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES_DATA[0]);
  const [showAuth, setShowAuth] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const { session, isLoading: authLoading, isConfigured, isStaff, isSuspended, isPasswordRecovery, signOut } = useAuth();

  useEffect(() => { const unsubscribe = settingsService.subscribe(setSettings); return () => { unsubscribe(); }; }, []);
  useEffect(() => {
    document.title = settings.seoTitle || settings.siteName;
    const ensureMeta = (selector: string, attributes: Record<string, string>) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
      if (!element) { element = document.createElement(attributes.rel ? 'link' : 'meta'); document.head.appendChild(element); }
      Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    };
    ensureMeta('meta[name="description"]', { name: 'description', content: settings.seoDescription || '' });
    ensureMeta('meta[property="og:title"]', { property: 'og:title', content: settings.seoTitle || settings.siteName });
    ensureMeta('meta[property="og:description"]', { property: 'og:description', content: settings.seoDescription || '' });
    if (settings.openGraphImageUrl) ensureMeta('meta[property="og:image"]', { property: 'og:image', content: settings.openGraphImageUrl });
    if (settings.faviconUrl) ensureMeta('link[rel="icon"]', { rel: 'icon', href: settings.faviconUrl });
  }, [settings]);

  const handleLessonCompleted = (xpEarned: number) => setStats((prev) => ({ ...prev, xp: prev.xp + xpEarned, completedLessons: prev.completedLessons + 1, wordsLearned: Math.min(prev.totalWordsTarget, prev.wordsLearned + 4) }));
  const handleEarnXP = (xp: number) => setStats((prev) => ({ ...prev, xp: prev.xp + xp }));
  const handlePlacementComplete = (calcLevel: LevelCode) => setStats((prev) => ({ ...prev, level: calcLevel }));
  const handleSelectCourse = (course: Course) => { if (course.isLocked) return; setSelectedCourse(course); setActiveTab('lesson'); };

  const needsAuth = (!isConfigured || !session) && ['dashboard', 'lesson', 'quizzes', 'vocab', 'ai-tutor', 'placement-test', 'certificates'].includes(activeTab);
  const isProtectedTab = ['dashboard', 'lesson', 'quizzes', 'vocab', 'ai-tutor', 'placement-test', 'certificates'].includes(activeTab);
  if (window.location.pathname === '/verify-certificate') return <CertificateVerificationView />;
  if (window.location.pathname.startsWith('/pages/')) return <PublicPageView slug={window.location.pathname.slice('/pages/'.length)} />;
  if (appMode === 'owner' && isStaff && !isSuspended) return <OwnerDashboard onSwitchToStudentView={() => setAppMode('student')} />;
  if (settings.maintenanceMode?.enabled && !isStaff) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl"><div className="max-w-lg text-center"><div className="text-5xl mb-5">🛠️</div><h1 className="text-3xl font-black">{settings.siteName} تحت الصيانة</h1><p className="text-slate-300 mt-4 leading-8">{settings.maintenanceMode.messageAr}</p></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white" dir="rtl">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} onAuth={() => setShowAuth(true)} onSwitchToOwnerView={!authLoading && isStaff ? () => setAppMode('owner') : undefined} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {!showAuth && !isPasswordRecovery && <FirstOwnerActivation onClaimed={() => setAppMode('owner')} />}
        {isPasswordRecovery ? <AuthView recoveryMode onAuthenticated={() => setShowAuth(false)} /> : isSuspended && (isProtectedTab || appMode === 'owner') ? (
          <div className="max-w-xl mx-auto my-16 bg-red-50 border border-red-200 text-red-800 rounded-3xl p-8 text-center space-y-4" dir="rtl">
            <h1 className="text-xl font-black">تم إيقاف الحساب</h1>
            <p className="text-sm">لا يمكن لهذا الحساب الوصول إلى الدروس أو الاختبارات أو الميزات المدفوعة. تواصل مع إدارة المنصة للمراجعة.</p>
            <button onClick={() => void signOut()} className="bg-red-700 text-white px-5 py-3 rounded-xl font-bold">تسجيل الخروج</button>
          </div>
        ) : showAuth || needsAuth ? <AuthView onAuthenticated={() => setShowAuth(false)} /> : (
          <>
            {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} onSelectCourse={handleSelectCourse} onStartLesson={() => setActiveTab('lesson')} />}
            {activeTab === 'levels' && <LevelsView setActiveTab={setActiveTab} />}
            {activeTab === 'courses' && <CoursesView setActiveTab={setActiveTab} onSelectCourse={handleSelectCourse} />}
            {activeTab === 'lesson' && <LessonView courseId={selectedCourse.id} setActiveTab={setActiveTab} onLessonCompleted={handleLessonCompleted} />}
            {activeTab === 'placement-test' && <PlacementTestView setActiveTab={setActiveTab} onPlacementComplete={handlePlacementComplete} />}
            {activeTab === 'dashboard' && <DashboardView stats={stats} setActiveTab={setActiveTab} onStartLesson={() => setActiveTab('lesson')} />}
            {activeTab === 'vocab' && <VocabView />}
            {activeTab === 'quizzes' && <QuizzesView onEarnXP={handleEarnXP} />}
            {activeTab === 'ai-tutor' && <AITutorView />}
            {activeTab === 'pricing' && <PricingView setActiveTab={setActiveTab} onStartLesson={() => setActiveTab('lesson')} />}
            {activeTab === 'certificates' && <StudentCertificatesView />}
          </>
        )}
      </main>
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
