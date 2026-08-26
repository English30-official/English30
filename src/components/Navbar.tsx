import React, { useEffect, useState } from 'react';
import { ActiveTab, PlatformSettings, StudentStats } from '../types';
import { authService, settingsService } from '../services';
import { Award, BookOpen, Compass, CreditCard, Flame, GraduationCap, Layers, LogIn, LogOut, Menu, ShieldCheck, Sparkles, Volume2, X, Zap } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  stats: StudentStats;
  onSwitchToOwnerView?: () => void;
  onAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, stats, onSwitchToOwnerView, onAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const unsubscribeSettings = settingsService.subscribe(setSettings);
    const unsubscribeAuth = authService.subscribe(session => setSignedIn(Boolean(session)));
    return () => { unsubscribeSettings(); unsubscribeAuth(); };
  }, []);

  const navItems = [
    { id: 'home' as ActiveTab, labelAr: 'الرئيسية', icon: <Compass className="w-4 h-4" /> },
    { id: 'levels' as ActiveTab, labelAr: 'المستويات', icon: <Layers className="w-4 h-4" /> },
    { id: 'courses' as ActiveTab, labelAr: 'الدورات', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'vocab' as ActiveTab, labelAr: 'المفردات', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'quizzes' as ActiveTab, labelAr: 'الاختبارات', icon: <Award className="w-4 h-4" /> },
    { id: 'ai-tutor' as ActiveTab, labelAr: 'المعلم الذكي AI', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: 'dashboard' as ActiveTab, labelAr: 'لوحتي', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'pricing' as ActiveTab, labelAr: 'الاشتراكات', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'certificates' as ActiveTab, labelAr: 'شهاداتي', icon: <Award className="w-4 h-4" /> },
  ].filter((item) => {
    if (item.id === 'ai-tutor') return settings.featureFlags.ai_tutor !== false;
    if (item.id === 'quizzes') return settings.featureFlags.quizzes !== false;
    if (item.id === 'certificates') return settings.featureFlags.certificates !== false;
    if (item.id === 'vocab') return settings.featureFlags.navigation_vocab !== false;
    if (item.id === 'levels') return settings.featureFlags.navigation_levels !== false;
    return true;
  });

  const logout = async () => {
    await authService.signOut();
    setSignedIn(false);
  };

  const handleMobileAuth = () => {
    if (signedIn) void logout();
    else onAuth?.();
    setMobileMenuOpen(false);
  };

  return <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
    {settings.announcementBanner?.enabled && (
      settings.announcementBanner.linkUrl
        ? <a href={settings.announcementBanner.linkUrl} className="block bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white text-xs py-2 px-4 text-center font-bold"><span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full ml-2">{settings.announcementBanner.badgeTextAr || 'عرض خاص'}</span>{settings.announcementBanner.textAr}</a>
        : <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white text-xs py-2 px-4 text-center font-bold"><span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full ml-2">{settings.announcementBanner.badgeTextAr || 'عرض خاص'}</span>{settings.announcementBanner.textAr}</div>
    )}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16 md:h-20">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>{settings.logoUrl?<img src={settings.logoUrl} alt={settings.siteName} className="w-10 h-10 rounded-xl object-contain"/>:<div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl">30</div>}<div><span className="font-black text-2xl text-slate-800 font-english">{settings.siteName || 'English30'}</span><p className="text-[11px] text-slate-500 hidden sm:block">{settings.taglineAr || 'تعلم الإنجليزية بذكاء ونظام'}</p></div></div>
      <nav className="hidden lg:flex items-center gap-1">{navItems.map(item => <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>{item.icon}{item.labelAr}</button>)}</nav>
      <div className="hidden md:flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 font-bold text-xs"><Flame className="inline w-4 h-4 ml-1" />{stats.streakDays} أيام</div>
        <div className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 font-bold text-xs"><Zap className="inline w-4 h-4 ml-1" />{stats.xp} XP</div>
        {signedIn ? <button onClick={() => void logout()} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex gap-1"><LogOut className="w-4 h-4" />خروج</button> : <button onClick={onAuth} className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex gap-1"><LogIn className="w-4 h-4" />دخول</button>}
        {onSwitchToOwnerView && <button onClick={onSwitchToOwnerView} className="bg-slate-900 text-amber-300 px-3 py-2 rounded-xl font-black text-xs flex gap-1"><ShieldCheck className="w-4 h-4" />لوحة المالك</button>}
      </div>
      <div className="flex md:hidden"><button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-slate-100">{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button></div>
    </div></div>
    {mobileMenuOpen && <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2"><div className="grid grid-cols-2 gap-2">{navItems.map(item => <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`p-3 rounded-lg text-sm font-bold ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>{item.labelAr}</button>)}</div><button onClick={handleMobileAuth} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">{signedIn ? 'تسجيل الخروج' : 'تسجيل الدخول / إنشاء حساب'}</button></div>}
  </header>;
};
