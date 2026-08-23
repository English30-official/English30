import React, { useEffect, useState } from 'react';
import { ActiveTab, Course, LevelCode, StudentStats, AppMode, UserRole } from './types';
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
import { authService, isSupabaseConfigured } from './services';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('student');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stats, setStats] = useState<StudentStats>(INITIAL_STUDENT_STATS);
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES_DATA[0]);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);
  const [signedIn, setSignedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadAuth = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const session = await authService.getSession();
        if (!mounted) return;
        setSignedIn(!!session);
        const role = session?.user ? await authService.getRole(session.user.id) : null;
        if (mounted) setCurrentRole(role);
      } catch (error) {
        console.error('Unable to load authentication state', error);
        if (mounted) { setSignedIn(false); setCurrentRole(null); }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    };
    void loadAuth();
    const unsubscribe = authService.subscribe((session) => {
      if (!session) {
        setSignedIn(false);
        setCurrentRole(null);
        setAppMode('student');
        return;
      }
      setSignedIn(true);
      setShowAuth(false);
      void authService.getRole(session.user.id).then((role) => {
        if (mounted) setCurrentRole(role);
      });
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const handleLessonCompleted = (xpEarned: number) => setStats((prev) => ({ ...prev, xp: prev.xp + xpEarned, completedLessons: prev.completedLessons + 1, wordsLearned: Math.min(prev.totalWordsTarget, prev.wordsLearned + 4) }));
  const handleEarnXP = (xp: number) => setStats((prev) => ({ ...prev, xp: prev.xp + xp }));
  const handlePlacementComplete = (calcLevel: LevelCode) => setStats((prev) => ({ ...prev, level: calcLevel }));
  const handleSelectCourse = (course: Course) => { if (course.isLocked) return; setSelectedCourse(course); setActiveTab('lesson'); };

  const canAccessOwner = currentRole === 'owner' || currentRole === 'admin';
  const needsAuth = isSupabaseConfigured && !signedIn && ['dashboard', 'lesson', 'quizzes', 'vocab', 'ai-tutor', 'placement-test'].includes(activeTab);
  if (appMode === 'owner' && canAccessOwner) return <OwnerDashboard onSwitchToStudentView={() => setAppMode('student')} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white" dir="rtl">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} onAuth={() => setShowAuth(true)} onSwitchToOwnerView={authChecked && canAccessOwner ? () => setAppMode('owner') : undefined} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {showAuth ? <AuthView onAuthenticated={() => setShowAuth(false)} /> : needsAuth ? <AuthView onAuthenticated={() => setShowAuth(false)} /> : (
          <>
            {activeTab === 'home' && <HomeView setActiveTab={setActiveTab} onSelectCourse={handleSelectCourse} onStartLesson={() => setActiveTab('lesson')} />}
            {activeTab === 'levels' && <LevelsView setActiveTab={setActiveTab} />}
            {activeTab === 'courses' && <CoursesView setActiveTab={setActiveTab} onSelectCourse={handleSelectCourse} />}
            {activeTab === 'lesson' && <LessonView setActiveTab={setActiveTab} onLessonCompleted={handleLessonCompleted} />}
            {activeTab === 'placement-test' && <PlacementTestView setActiveTab={setActiveTab} onPlacementComplete={handlePlacementComplete} />}
            {activeTab === 'dashboard' && <DashboardView stats={stats} setActiveTab={setActiveTab} onStartLesson={() => setActiveTab('lesson')} />}
            {activeTab === 'vocab' && <VocabView />}
            {activeTab === 'quizzes' && <QuizzesView onEarnXP={handleEarnXP} />}
            {activeTab === 'ai-tutor' && <AITutorView />}
            {activeTab === 'pricing' && <PricingView setActiveTab={setActiveTab} onStartLesson={() => setActiveTab('lesson')} />}
          </>
        )}
      </main>
      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
