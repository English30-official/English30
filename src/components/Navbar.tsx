import React, { useState, useEffect } from 'react';
import { ActiveTab, StudentStats, PlatformSettings } from '../types';
import { settingsService } from '../services';
import {
  BookOpen,
  Flame,
  Zap,
  Sparkles,
  Award,
  Compass,
  Layers,
  GraduationCap,
  MessageSquare,
  CreditCard,
  Menu,
  X,
  Volume2,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  stats: StudentStats;
  onSwitchToOwnerView?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onSwitchToOwnerView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettings());

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  const navItems: { id: ActiveTab; labelAr: string; icon: React.ReactNode }[] = [
    { id: 'home', labelAr: 'الرئيسية', icon: <Compass className="w-4 h-4" /> },
    { id: 'levels', labelAr: 'المستويات', icon: <Layers className="w-4 h-4" /> },
    { id: 'courses', labelAr: 'الدورات', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'vocab', labelAr: 'المفردات', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'quizzes', labelAr: 'الاختبارات', icon: <Award className="w-4 h-4" /> },
    { id: 'ai-tutor', labelAr: 'المعلم الذكي AI', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: 'dashboard', labelAr: 'لوحتي', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'pricing', labelAr: 'الاشتراكات', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      
      {/* Dynamic Promotional Announcement Banner from Platform Settings */}
      {settings.announcementBanner?.enabled && (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-2">
          <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
            {settings.announcementBanner.badgeTextAr || 'عرض خاص'}
          </span>
          <span>{settings.announcementBanner.textAr}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200 transition-transform hover:scale-105">
              30
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-2xl text-slate-800 tracking-tight font-english">
                  {settings.siteName || 'English30'}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                  عربي
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {settings.taglineAr || 'تعلم الإنجليزية بذكاء ونظام'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.labelAr}</span>
                </button>
              );
            })}
          </nav>

          {/* User Gamification Stats & CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-600 font-bold text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse" />
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>{stats.streakDays} أيام</span>
            </div>

            {/* XP Points */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200/80 text-violet-700 font-bold text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-violet-500 fill-violet-500" />
              <span>{stats.xp} XP</span>
            </div>

            {/* Current Level Badge */}
            <div
              onClick={() => setActiveTab('levels')}
              className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs tracking-wider cursor-pointer shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
            >
              مستوى {stats.level}
            </div>

            {/* Placement Test Button */}
            <button
              onClick={() => setActiveTab('placement-test')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
            >
              اختبار تحديد المستوى
            </button>

            {/* Owner Console Entry Button */}
            {onSwitchToOwnerView && (
              <button
                onClick={onSwitchToOwnerView}
                className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="التبديل إلى لوحة تحكم المالك"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>لوحة المالك</span>
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-bold text-xs border border-amber-200">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{stats.streakDays}d</span>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-2 animate-fadeIn">
          <div className="grid grid-cols-2 gap-2 pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center justify-center gap-1.5 p-2 bg-amber-50 rounded-lg text-amber-800 text-xs font-bold">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>سلسلة {stats.streakDays} أيام</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 bg-violet-50 rounded-lg text-violet-800 text-xs font-bold">
              <Zap className="w-4 h-4 text-violet-500 fill-violet-500" />
              <span>مجموع النقاط: {stats.xp}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-right transition-colors ${
                  activeTab === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.labelAr}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setActiveTab('placement-test');
              setMobileMenuOpen(false);
            }}
            className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-bold text-sm text-center shadow-sm"
          >
            🎯 خذ اختبار تحديد المستوى مجاناً
          </button>
        </div>
      )}
    </header>
  );
};
