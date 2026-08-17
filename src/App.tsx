import React, { useState } from 'react';
import { ActiveTab, Course, LevelCode, StudentStats, AppMode } from './types';
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

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('student');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [stats, setStats] = useState<StudentStats>(INITIAL_STUDENT_STATS);
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES_DATA[0]); // Default A1 Beginner course

  const handleLessonCompleted = (xpEarned: number) => {
    setStats((prev) => ({
      ...prev,
      xp: prev.xp + xpEarned,
      completedLessons: prev.completedLessons + 1,
      wordsLearned: Math.min(prev.totalWordsTarget, prev.wordsLearned + 4),
    }));
  };

  const handleEarnXP = (xp: number) => {
    setStats((prev) => ({
      ...prev,
      xp: prev.xp + xp,
    }));
  };

  const handlePlacementComplete = (calcLevel: LevelCode) => {
    setStats((prev) => ({
      ...prev,
      level: calcLevel,
    }));
  };

  const handleSelectCourse = (course: Course) => {
    if (course.isLocked) return;
    setSelectedCourse(course);
    setActiveTab('lesson');
  };

  // If in Owner Mode, render isolated Owner Dashboard
  if (appMode === 'owner') {
    return <OwnerDashboard onSwitchToStudentView={() => setAppMode('student')} />;
  }

  // Student Experience
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white" dir="rtl">
      
      {/* Top Navbar with Owner View Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onSwitchToOwnerView={() => setAppMode('owner')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'home' && (
          <HomeView
            setActiveTab={setActiveTab}
            onSelectCourse={handleSelectCourse}
            onStartLesson={() => setActiveTab('lesson')}
          />
        )}

        {activeTab === 'levels' && (
          <LevelsView setActiveTab={setActiveTab} />
        )}

        {activeTab === 'courses' && (
          <CoursesView
            setActiveTab={setActiveTab}
            onSelectCourse={handleSelectCourse}
          />
        )}

        {activeTab === 'lesson' && (
          <LessonView
            setActiveTab={setActiveTab}
            onLessonCompleted={handleLessonCompleted}
          />
        )}

        {activeTab === 'placement-test' && (
          <PlacementTestView
            setActiveTab={setActiveTab}
            onPlacementComplete={handlePlacementComplete}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            setActiveTab={setActiveTab}
            onStartLesson={() => setActiveTab('lesson')}
          />
        )}

        {activeTab === 'vocab' && <VocabView />}

        {activeTab === 'quizzes' && (
          <QuizzesView onEarnXP={handleEarnXP} />
        )}

        {activeTab === 'ai-tutor' && <AITutorView />}

        {activeTab === 'pricing' && (
          <PricingView
            setActiveTab={setActiveTab}
            onStartLesson={() => setActiveTab('lesson')}
          />
        )}
      </main>

      {/* Footer */}
      <Footer setActiveTab={setActiveTab} />

    </div>
  );
}
