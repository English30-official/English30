import React, { useEffect, useState } from 'react';
import { ActiveTab, PlatformSettings, StudentStats } from '../types';
import { authService, settingsService } from '../services';
import { Award, BookOpen, CreditCard, GraduationCap, LogIn, LogOut, Menu, ShieldCheck, Sparkles, Target, Volume2, X } from 'lucide-react';
import { OwnerEditable, useOwnerEditMode } from './owner-edit/OwnerEditMode';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  stats: StudentStats;
  onSwitchToOwnerView?: () => void;
  onAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onSwitchToOwnerView, onAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const [signedIn, setSignedIn] = useState(false);
  const { enabled: ownerEditEnabled } = useOwnerEditMode();

  useEffect(() => {
    const unsubscribeSettings = settingsService.subscribe(setSettings);
    const unsubscribeAuth = authService.subscribe((session) => setSignedIn(Boolean(session)));
    return () => {
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, []);

  const primaryNav = [
    { id: 'home' as ActiveTab, labelAr: 'الرئيسية' },
    { id: 'courses' as ActiveTab, labelAr: 'الدورات' },
    { id: 'placement-test' as ActiveTab, labelAr: 'تحديد المستوى' },
    { id: 'pricing' as ActiveTab, labelAr: 'الاشتراكات' },
  ];

  const learningNav = [
    { id: 'dashboard' as ActiveTab, labelAr: 'لوحتي', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'vocab' as ActiveTab, labelAr: 'المفردات', icon: <Volume2 className="h-4 w-4" /> },
    { id: 'quizzes' as ActiveTab, labelAr: 'الاختبارات', icon: <Award className="h-4 w-4" /> },
    { id: 'ai-tutor' as ActiveTab, labelAr: 'المعلم الذكي', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'certificates' as ActiveTab, labelAr: 'شهاداتي', icon: <GraduationCap className="h-4 w-4" /> },
  ].filter((item) => {
    if (item.id === 'ai-tutor') return settings.featureFlags.ai_tutor !== false;
    if (item.id === 'quizzes') return settings.featureFlags.quizzes !== false;
    if (item.id === 'certificates') return settings.featureFlags.certificates !== false;
    if (item.id === 'vocab') return settings.featureFlags.navigation_vocab !== false;
    return true;
  });

  const logout = async () => {
    await authService.signOut();
    setSignedIn(false);
  };

  const go = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleMobileAuth = () => {
    if (signedIn) void logout();
    else onAuth?.();
    setMobileMenuOpen(false);
  };

  return (
    <header className="e30-navbar" dir="rtl">
      <OwnerEditable request={{ title: 'الشريط الإعلاني', fields: [{ key: 'announcementBanner', label: 'إعدادات الإعلان (JSON)', kind: 'json', help: 'enabled, textAr, badgeTextAr, linkUrl' }] }}>
        {settings.announcementBanner?.enabled ? (
          settings.announcementBanner.linkUrl ? (
            <a href={settings.announcementBanner.linkUrl} className="e30-announcement">
              {settings.announcementBanner.badgeTextAr && <span>{settings.announcementBanner.badgeTextAr}</span>}
              {settings.announcementBanner.textAr}
            </a>
          ) : (
            <div className="e30-announcement">
              {settings.announcementBanner.badgeTextAr && <span>{settings.announcementBanner.badgeTextAr}</span>}
              {settings.announcementBanner.textAr}
            </div>
          )
        ) : ownerEditEnabled ? (
          <div className="bg-amber-50 py-2 text-center text-xs font-bold text-amber-800">الشريط الإعلاني معطّل — اضغط لتحريره</div>
        ) : null}
      </OwnerEditable>

      <div className="e30-nav-inner">
        <OwnerEditable request={{ title: 'هوية رأس الموقع', fields: [{ key: 'siteName', label: 'اسم المنصة' }, { key: 'logoUrl', label: 'الشعار الكامل', kind: 'image' }, { key: 'faviconUrl', label: 'أيقونة الموقع', kind: 'image' }, { key: 'taglineAr', label: 'الوصف المختصر' }] }}>
          <button type="button" className="e30-brand" onClick={() => go('home')} aria-label="العودة إلى الرئيسية">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.siteName || 'English30'} className="e30-brand-image" />
            ) : (
              <>
                <span className="e30-brand-mark">E</span>
                <span className="e30-brand-word font-english">English<span>30</span></span>
              </>
            )}
          </button>
        </OwnerEditable>

        <nav className="e30-desktop-nav" aria-label="التنقل الرئيسي">
          {primaryNav.map((item) => (
            <button key={item.id} type="button" onClick={() => go(item.id)} className={`e30-nav-link ${activeTab === item.id ? 'is-active' : ''}`}>
              {item.labelAr}
            </button>
          ))}
        </nav>

        <div className="e30-nav-actions">
          {signedIn && (
            <button type="button" onClick={() => go('dashboard')} className="e30-dashboard-link">
              <BookOpen className="h-4 w-4" />
              لوحتي
            </button>
          )}
          {signedIn ? (
            <button type="button" onClick={() => void logout()} className="e30-login-link" aria-label="تسجيل الخروج">
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">خروج</span>
            </button>
          ) : (
            <button type="button" onClick={onAuth} className="e30-btn e30-btn-primary e30-nav-cta">
              <LogIn className="h-4 w-4" />
              دخول
            </button>
          )}
          {onSwitchToOwnerView && (
            <button type="button" onClick={onSwitchToOwnerView} className="e30-owner-link" aria-label="لوحة المالك">
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <button type="button" className="e30-mobile-trigger" onClick={() => setMobileMenuOpen((open) => !open)} aria-expanded={mobileMenuOpen} aria-label="فتح القائمة">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="e30-mobile-menu">
          <div className="grid grid-cols-2 gap-2">
            {primaryNav.map((item) => (
              <button key={item.id} type="button" onClick={() => go(item.id)} className={`e30-mobile-nav-item ${activeTab === item.id ? 'is-active' : ''}`}>
                {item.id === 'courses' && <GraduationCap className="h-4 w-4" />}
                {item.id === 'placement-test' && <Target className="h-4 w-4" />}
                {item.id === 'pricing' && <CreditCard className="h-4 w-4" />}
                {item.labelAr}
              </button>
            ))}
          </div>
          {signedIn && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-black text-slate-400">التعلم</p>
              <div className="grid grid-cols-2 gap-2">
                {learningNav.map((item) => (
                  <button key={item.id} type="button" onClick={() => go(item.id)} className="e30-mobile-nav-item">
                    {item.icon}
                    {item.labelAr}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={handleMobileAuth} className="e30-btn e30-btn-primary mt-4 w-full">
            {signedIn ? 'تسجيل الخروج' : 'تسجيل الدخول / إنشاء حساب'}
          </button>
        </div>
      )}
    </header>
  );
};
