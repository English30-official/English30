import React, { useEffect, useState } from 'react';
import { ActiveTab, PlatformSettings } from '../types';
import { Instagram, Mail, Phone, Send, ShieldCheck, Twitter, Youtube } from 'lucide-react';
import { settingsService } from '../services';
import { OwnerEditable } from './owner-edit/OwnerEditMode';

interface FooterProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());

  useEffect(() => settingsService.subscribe(setSettings), []);

  const whatsappHref = settings.contactWhatsApp
    ? `https://wa.me/${settings.contactWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        settings.whatsappDefaultMessage || `مرحباً، أود الاستفسار عن منصة ${settings.siteName || 'English30'}`
      )}`
    : undefined;

  const socialLinkClass = 'e30-social-link';

  return (
    <footer className="e30-footer" dir="rtl">
      <div className="e30-footer-inner">
        <div className="e30-footer-grid">
          <OwnerEditable request={{ title: 'هوية وتواصل التذييل', fields: [
            { key: 'siteName', label: 'اسم المنصة' },
            { key: 'logoUrl', label: 'الشعار الكامل', kind: 'image' },
            { key: 'taglineAr', label: 'وصف المنصة', kind: 'textarea' },
            { key: 'contactEmail', label: 'البريد', kind: 'text' },
            { key: 'contactWhatsApp', label: 'واتساب' },
            { key: 'telegramChannelUrl', label: 'قناة تيليجرام', kind: 'url' },
            { key: 'youtubeUrl', label: 'يوتيوب', kind: 'url' },
            { key: 'xTwitterUrl', label: 'X', kind: 'url' },
            { key: 'instagramUrl', label: 'إنستغرام', kind: 'url' },
          ] }}>
            <div className="space-y-5">
              <div className="e30-footer-brand">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName || 'English30'} className="e30-footer-logo" />
                ) : (
                  <>
                    <span className="e30-brand-mark">E</span>
                    <span className="e30-brand-word font-english">English<span>30</span></span>
                  </>
                )}
              </div>
              <p className="max-w-sm text-sm leading-7 text-slate-400">
                {settings.taglineAr || 'منصة عربية لتعلم الإنجليزية بخطوات واضحة وتجربة تعليمية تفاعلية.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className={socialLinkClass} title="واتساب"><Phone className="h-4 w-4" /></a>}
                {settings.telegramChannelUrl && <a href={settings.telegramChannelUrl} target="_blank" rel="noreferrer" className={socialLinkClass} title="تيليجرام"><Send className="h-4 w-4" /></a>}
                {settings.youtubeUrl && <a href={settings.youtubeUrl} target="_blank" rel="noreferrer" className={socialLinkClass} title="يوتيوب"><Youtube className="h-4 w-4" /></a>}
                {settings.xTwitterUrl && <a href={settings.xTwitterUrl} target="_blank" rel="noreferrer" className={socialLinkClass} title="X"><Twitter className="h-4 w-4" /></a>}
                {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className={socialLinkClass} title="إنستغرام"><Instagram className="h-4 w-4" /></a>}
                {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} className={socialLinkClass} title={settings.contactEmail}><Mail className="h-4 w-4" /></a>}
              </div>
            </div>
          </OwnerEditable>

          <div>
            <h3 className="e30-footer-title">استكشف</h3>
            <div className="e30-footer-links">
              <button type="button" onClick={() => setActiveTab('courses')}>الدورات</button>
              <button type="button" onClick={() => setActiveTab('placement-test')}>تحديد المستوى</button>
              <button type="button" onClick={() => setActiveTab('pricing')}>الاشتراكات</button>
              <button type="button" onClick={() => setActiveTab('dashboard')}>لوحة الطالب</button>
            </div>
          </div>

          <div>
            <h3 className="e30-footer-title">التعلم</h3>
            <div className="e30-footer-links">
              {settings.featureFlags.navigation_vocab !== false && <button type="button" onClick={() => setActiveTab('vocab')}>المفردات</button>}
              {settings.featureFlags.quizzes !== false && <button type="button" onClick={() => setActiveTab('quizzes')}>الاختبارات</button>}
              {settings.featureFlags.ai_tutor !== false && <button type="button" onClick={() => setActiveTab('ai-tutor')}>المعلم الذكي</button>}
              {settings.featureFlags.certificates !== false && <button type="button" onClick={() => setActiveTab('certificates')}>الشهادات</button>}
            </div>
          </div>

          <OwnerEditable request={{ title: 'محتوى التذييل', fields: [{ key: 'footerContentAr', label: 'النص', kind: 'textarea' }] }}>
            <div>
              <h3 className="e30-footer-title">English30</h3>
              <p className="text-sm leading-7 text-slate-400">
                {settings.footerContentAr || 'تعلّم في مسار واحد يجمع الشرح والتطبيق والمراجعة دون تشتّت.'}
              </p>
              <div className="mt-5 flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--e30-teal)]" />
                <span>المحتوى المدفوع والحسابات والصلاحيات محمية داخل المنصة.</span>
              </div>
            </div>
          </OwnerEditable>
        </div>

        <div className="e30-footer-bottom">
          <p>© {new Date().getFullYear()} {settings.siteName || 'English30'} — جميع الحقوق محفوظة.</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/pages/terms">شروط الاستخدام</a>
            <a href="/pages/privacy">الخصوصية</a>
            <a href="/pages/refund">الاسترداد</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
