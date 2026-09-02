import React from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Headphones, Layers3, Play, Sparkles, Volume2 } from 'lucide-react';
import type { Course, PlatformSettings } from '../../types';

interface ApprovedHeroProps {
  settings: PlatformSettings;
  courses: Course[];
  onNavigate: (target: string) => void;
}

export const ApprovedHero: React.FC<ApprovedHeroProps> = ({ settings, courses, onNavigate }) => {
  const featuredCourse = courses[0];
  const primaryLabel = settings.heroPrimaryCtaLabelAr || 'ابدأ الآن';
  const primaryTarget = settings.heroPrimaryCtaTarget || 'courses';
  const secondaryLabel = settings.heroSecondaryCtaLabelAr || 'استكشف الدورات';
  const secondaryTarget = settings.heroSecondaryCtaTarget || 'courses';

  return (
    <section className="e30-hero" aria-labelledby="english30-hero-title">
      <div className="e30-hero-glow e30-hero-glow-a" aria-hidden="true" />
      <div className="e30-hero-glow e30-hero-glow-b" aria-hidden="true" />

      <div className="e30-hero-copy">
        <div className="e30-kicker">
          <Sparkles className="h-4 w-4" />
          <span>{settings.homepageBadgeAr || 'تعلم الإنجليزية بخطة واضحة'}</span>
        </div>

        <h1 id="english30-hero-title" className="e30-hero-title">
          <span>ابدأ الإنجليزية من الصفر</span>
          <span className="e30-text-accent">وتقدّم بخطوات واضحة.</span>
        </h1>

        <p className="e30-hero-description">
          {settings.heroSubheadlineAr || 'دروس تفاعلية، كلمات ونطق وقواعد مبسطة، وتمارين واختبارات ذكية في مسار واحد دون تشتّت.'}
        </p>

        <div className="e30-hero-actions">
          <button type="button" className="e30-btn e30-btn-primary" onClick={() => onNavigate(primaryTarget)}>
            {primaryLabel}
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" className="e30-btn e30-btn-secondary" onClick={() => onNavigate(secondaryTarget)}>
            <Play className="h-4 w-4" />
            {secondaryLabel}
          </button>
        </div>

        <div className="e30-capabilities" aria-label="مكونات تجربة التعلم">
          <span><Volume2 className="h-4 w-4" /> مفردات ونطق</span>
          <span><Layers3 className="h-4 w-4" /> قواعد مبسطة</span>
          <span><CheckCircle2 className="h-4 w-4" /> تمارين واختبارات</span>
        </div>
      </div>

      <div className="e30-learning-visual" aria-label="نموذج من تجربة التعلم في English30">
        <div className="e30-device-shell">
          <div className="e30-device-topbar">
            <div className="flex items-center gap-2">
              <span className="e30-mini-logo">E</span>
              <div>
                <strong className="font-english text-sm text-[var(--e30-navy)]">English30</strong>
                <p className="text-[10px] text-slate-400">نموذج من تجربة التعلم</p>
              </div>
            </div>
            <span className="e30-status-dot" aria-hidden="true" />
          </div>

          <div className="e30-device-grid">
            <div className="e30-word-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="e30-eyebrow">Vocabulary</span>
                  <h2 className="font-english mt-2 text-3xl font-extrabold text-[var(--e30-navy)]" dir="ltr">apple</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">تفاحة</p>
                </div>
                <button type="button" className="e30-audio-button" aria-label="تشغيل النطق">
                  <Headphones className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-right">
                <p className="font-english text-sm font-bold text-slate-700" dir="ltr">I have an apple.</p>
                <p className="mt-1 text-xs text-slate-500">لديّ تفاحة.</p>
              </div>
            </div>

            <div className="e30-plan-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="e30-eyebrow">مسارك</span>
                  <h3 className="mt-1 font-black text-[var(--e30-navy)]">خطوات تعلم مرتبة</h3>
                </div>
                <BookOpen className="h-5 w-5 text-[var(--e30-teal)]" />
              </div>
              <div className="mt-5 space-y-3">
                {['تعلّم المفردات', 'استمع للنطق', 'طبّق بتمرين', 'اختبر فهمك'].map((item, index) => (
                  <div key={item} className="e30-plan-row">
                    <span className="e30-step-number">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="e30-course-ribbon">
            <div>
              <span className="e30-eyebrow">المسار المقترح</span>
              <p className="mt-1 font-black text-[var(--e30-navy)]">
                {featuredCourse?.titleAr || 'English30 Foundation — التأسيس من الصفر'}
              </p>
            </div>
            <button type="button" onClick={() => onNavigate(featuredCourse ? `course:${featuredCourse.id}` : 'courses')} className="e30-round-arrow" aria-label="استكشف الدورة">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
