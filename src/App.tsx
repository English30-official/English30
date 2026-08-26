import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ActiveTab, Course, LevelCode, StudentStats, AppMode, PlatformSettings } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AuthView } from './components/AuthView';
import { FirstOwnerActivation } from './components/FirstOwnerActivation';
import { useAuth } from './auth/AuthContext';
import { coursesService, progressService, settingsService } from './services';

const LevelsView = lazy(() => import('./components/LevelsView').then((module) => ({ default: module.LevelsView })));
const CoursesView = lazy(() => import('./components/CoursesView').then((module) => ({ default: module.CoursesView })));
const LessonView = lazy(() => import('./components/LessonView').then((module) => ({ default: module.LessonView })));
const PlacementTestView = lazy(() => import('./components/PlacementTestView').then((module) => ({ default: module.PlacementTestView })));
const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const VocabView = lazy(() => import('./components/VocabView').then((module) => ({ default: module.VocabView })));
const QuizzesView = lazy(() => import('./components/QuizzesView').then((module) => ({ default: module.QuizzesView })));
const AITutorView = lazy(() => import('./components/AITutorView').then((module) => ({ default: module.AITutorView })));
const PricingView = lazy(() => import('./components/PricingView').then((module) => ({ default: module.PricingView })));
const OwnerDashboard = lazy(() => import('./components/owner/OwnerDashboard').then((module) => ({ default: module.OwnerDashboard })));
const StudentCertificatesView = lazy(() => import('./components/StudentCertificatesView').then((module) => ({ default: module.StudentCertificatesView })));
const CertificateVerificationView = lazy(() => import('./components/CertificateVerificationView').then((module) => ({ default: module.CertificateVerificationView })));
const PublicPageView = lazy(() => import('./components/PublicPageView').then((module) => ({ default: module.PublicPageView })));
const viewFallback = <div className="min-h-[45vh] flex items-center justify-center text-sm font-bold text-slate-500" dir="rtl">جاري تحميل الواجهة...</div>;

const EMPTY_STUDENT_STATS: StudentStats = {
  level: 'A1', xp: 0, streakDays: 0, wordsLearned: 0, totalWordsTarget: 1000,
  completedLessons: 0, totalLessons: 0, quizzesTaken: 0, averageScore: 0,
  studyTimeMinutesThisWeek: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((day) => ({ day, minutes: 0 })),
  achievements: [],
};

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('student');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stats, setStats] = useState<StudentStats>(EMPTY_STUDENT_STATS);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const { session, isLoading: authLoading, isConfigured, isStaff, isSuspended, isPasswordRecovery, signOut } = useAuth();

  useEffect(() => { const unsubscribe = settingsService.subscribe(setSettings); return () => { unsubscribe(); }; }, []);
  useEffect(() => {
    let live = true;
    void coursesService.getPublishedCourses().then((courses) => {
      if (!live) return;
      setSelectedCourse((current) => current && courses.some((course) => course.id === current.id) ? current : courses[0] ?? null);
    }).catch((error) => console.error('Unable to load published courses', error));
    return () => { live = false; };
  }, []);
  useEffect(() => {
    let live = true;
    if (!session) { setStats(EMPTY_STUDENT_STATS); return () => { live = false; }; }
    void progressService.getStudentStats().then((value) => { if (live) setStats(value); })
      .catch((error) => console.error('Unable to load student progress', error));
    return () => { live = false; };
  }, [session?.user.id]);
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
  const handleStartLesson = () => selectedCourse ? setActiveTab('lesson') : setActiveTab('courses');
  const themeStyle = { '--brand-primary': settings.theme?.primaryColor || '#4f46e5', '--brand-secondary': settings.theme?.secondaryColor || '#312e81', '--brand-accent': settings.theme?.accentColor || '#f59e0b', '--brand-background': settings.theme?.backgroundColor || '#f8fafc' } as React.CSSProperties;

  const needsAuth = (!isConfigured || !session) && ['dashboard', 'lesson', 'quizzes', 'vocab', 'ai-tutor', 'placement-test', 'certificates'].includes(activeTab);
  const isProtectedTab = ['dashboard', 'lesson', 'quizzes', 'vocab', 'ai-tutor', 'placement-test', 'certificates'].includes(activeTab);
  const featureForTab: Partial<Record<ActiveTab, string>> = {
    'ai-tutor': 'ai_tutor', quizzes: 'quizzes', certificates: 'certificates',
    vocab: 'navigation_vocab', levels: 'navigation_levels',
  };
  const activeFeature = featureForTab[activeTab];
  const featureDisabled = Boolean(activeFeature && settings.featureFlags[activeFeature] === false);
  if (window.location.pathname === '/verify-certificate') return <Suspense fallback={viewFallback}><CertificateVerificationView /></Suspense>;
  if (window.location.pathname.startsWith('/pages/')) return <Suspense fallback={viewFallback}><PublicPageView slug={window.location.pathname.slice('/pages/'.length)} /></Suspense>;
  if (appMode === 'owner' && isStaff && !isSuspended) return <Suspense fallback={viewFallback}><OwnerDashboard onSwitchToStudentView={() => setAppMode('student')} /></Suspense>;
  if (settings.maintenanceMode?.enabled && !isStaff) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl"><div className="max-w-lg text-center"><div className="text-5xl mb-5">🛠️</div><h1 className="text-3xl font-black">{settings.siteName} تحت الصيانة</h1><p className="text-slate-300 mt-4 leading-8">{settings.maintenanceMode.messageAr}</p></div></div>;

  return (
    <div style={themeStyle} className="min-h-screen bg-[var(--brand-background)] text-slate-900 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white" dir="rtl">
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
          <Suspense fallback={viewFallback}>
            {featureDisabled ? <div className="max-w-xl mx-auto my-16 bg-white border rounded-3xl p-8 text-center"><h1 className="text-xl font-black">الميزة غير متاحة حاليًا</h1><p className="text-sm text-slate-500 mt-3">تم تعطيل هذه الميزة من إعدادات المنصة.</p><button onClick={() => setActiveTab('home')} className="mt-5 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold">العودة للرئيسية</button></div> : <>
              {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} onSelectCourse={handleSelectCourse} onStartLesson={handleStartLesson} />}
              {activeTab === 'levels' && <LevelsView setActiveTab={setActiveTab} />}
              {activeTab === 'courses' && <CoursesView setActiveTab={setActiveTab} onSelectCourse={handleSelectCourse} />}
              {activeTab === 'lesson' && <LessonView courseId={selectedCourse?.id} setActiveTab={setActiveTab} onLessonCompleted={handleLessonCompleted} />}
              {activeTab === 'placement-test' && <PlacementTestView setActiveTab={setActiveTab} onPlacementComplete={handlePlacementComplete} />}
              {activeTab === 'dashboard' && <DashboardView stats={stats} setActiveTab={setActiveTab} onStartLesson={handleStartLesson} />}
              {activeTab === 'vocab' && <VocabView />}
              {activeTab === 'quizzes' && <QuizzesView courseId={selectedCourse?.id} onEarnXP={handleEarnXP} />}
              {activeTab === 'ai-tutor' && <AITutorView />}
              {activeTab === 'pricing' && <PricingView setActiveTab={setActiveTab} onStartLesson={handleStartLesson} />}
              {activeTab === 'certificates' && <StudentCertificatesView />}
            </>}
          </Suspense>
        )}
      </main>
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
