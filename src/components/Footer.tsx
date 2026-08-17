import React, { useState, useEffect } from 'react';
import { ActiveTab, PlatformSettings } from '../types';
import { Sparkles, Shield, Heart, Send, Phone, Youtube, Twitter } from 'lucide-react';
import { settingsService } from '../services';

interface FooterProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  const whatsappHref = settings.contactWhatsApp
    ? `https://wa.me/${settings.contactWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        settings.whatsappDefaultMessage || 'مرحباً، أود الاستفسار عن منصة ' + (settings.siteName || 'English30')
      )}`
    : undefined;

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-lg">
                30
              </div>
              <span className="text-2xl font-black text-white font-english tracking-tight">
                {settings.siteName || 'English30'}
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {settings.taglineAr || 'منصة تعليمية عربية حديثة مصممة خصيصاً لمساعدة المتعلم العربي على التحدث والتفكير باللغة الإنجليزية بطلاقة وبشكل تدريجي من A1 حتى C2.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/50 border border-amber-800/60 px-3 py-2 rounded-lg w-fit">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>30 دقيقة يومياً تغير مستواك تماماً</span>
            </div>

            {/* Social & Contact links */}
            <div className="flex items-center gap-2 pt-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  title="تواصل عبر الواتساب"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {settings.telegramChannelUrl && (
                <a
                  href={settings.telegramChannelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  title="قناة التيليجرام"
                >
                  <Send className="w-4 h-4" />
                </a>
              )}
              {settings.youtubeUrl && (
                <a
                  href={settings.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  title="قناة يوتيوب"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {settings.xTwitterUrl && (
                <a
                  href={settings.xTwitterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  title="حساب X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-white font-bold text-base mb-4">أقسام المنصة</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => setActiveTab('levels')} className="hover:text-indigo-400 transition-colors">
                  مستويات اللغة (A1 - C2)
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('courses')} className="hover:text-indigo-400 transition-colors">
                  دليل الدورات والمهارات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('placement-test')} className="hover:text-indigo-400 transition-colors">
                  اختبار تحديد المستوى المجاني
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('vocab')} className="hover:text-indigo-400 transition-colors">
                  بنك المفردات والقاموس
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('pricing')} className="hover:text-indigo-400 transition-colors">
                  الاشتراكات وباقات الأسعار
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('ai-tutor')} className="hover:text-indigo-400 transition-colors">
                  المعلم الذكي Mr. Alex AI
                </button>
              </li>
            </ul>
          </div>

          {/* CEFR Levels Shortcuts */}
          <div>
            <h4 className="text-white font-bold text-base mb-4">المستويات التعليمية</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span onClick={() => setActiveTab('levels')} className="px-2.5 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                <strong className="text-emerald-400">A1:</strong> المبتدئ
              </span>
              <span onClick={() => setActiveTab('levels')} className="px-2.5 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                <strong className="text-blue-400">A2:</strong> فوق المبتدئ
              </span>
              <span onClick={() => setActiveTab('levels')} className="px-2.5 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                <strong className="text-indigo-400">B1:</strong> المتوسط
              </span>
              <span onClick={() => setActiveTab('levels')} className="px-2.5 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                <strong className="text-purple-400">B2:</strong> فوق المتوسط
              </span>
              <span onClick={() => setActiveTab('levels')} className="px-2.5 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                <strong className="text-rose-400">C1:</strong> المتقدم
              </span>
              <span onClick={() => setActiveTab('levels')} className="px-2.5 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                <strong className="text-amber-400">C2:</strong> الإتقان
              </span>
            </div>
          </div>

          {/* Platform Trust & Info */}
          <div>
            <h4 className="text-white font-bold text-base mb-4">تجربة النموذج التفاعلي</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              منصة {settings.siteName || 'English30'} التعليمية المتقدمة لتمكين الطلاب والمهنيين من إتقان الإنجليزية باحترافية.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>مصمم بجودة منتج تجاري حقيقي جاهز للناطقين بالعربية.</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {settings.siteName || 'English30'} - جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>صُنع بـ</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>لخدمة المتعلم العربي حول العالم</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
