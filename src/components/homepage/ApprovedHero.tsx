import React from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Check,
  Clock3,
  Headphones,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react';
import type { Course, PlatformSettings } from '../../types';
import './ApprovedReferenceHome.css';

interface ApprovedHeroProps {
  settings: PlatformSettings;
  courses: Course[];
  onNavigate: (target: string) => void;
}

export const ApprovedHero: React.FC<ApprovedHeroProps> = ({ settings, courses, onNavigate }) => {
  const featuredCourse = courses[0];
  const primaryLabel = settings.heroPrimaryCtaLabelAr || 'ابدأ رحلتك الآن';
  const primaryTarget = settings.heroPrimaryCtaTarget || 'courses';
  const secondaryLabel = settings.heroSecondaryCtaLabelAr || 'استكشف الدورة';
  const secondaryTarget = settings.heroSecondaryCtaTarget || 'courses';

  return (
    <section className="reference-hero" aria-labelledby="english30-hero-title">
      <div className="reference-hero-orb reference-hero-orb-a" aria-hidden="true" />
      <div className="reference-hero-orb reference-hero-orb-b" aria-hidden="true" />
      <div className="reference-dot-field reference-dot-field-a" aria-hidden="true" />

      <div className="reference-hero-main">
        <div className="reference-hero-copy">
          <div className="reference-kicker">
            <Sparkles className="h-4 w-4" />
            <span>{settings.homepageBadgeAr || 'طريقك الواضح للإتقان'}</span>
          </div>

          <h1 id="english30-hero-title" className="reference-title">
            <span>ابدأ الإنجليزية</span>
            <span>من الصفر</span>
            <span className="reference-title-accent">وتقدّم بخطوات واضحة.</span>
          </h1>

          <p className="reference-description">
            {settings.heroSubheadlineAr || 'دروس تفاعلية، كلمات ونطق، وقواعد مبسطة، تمارين واختبارات ذكية في مسار واحد بدون تشتّت.'}
          </p>

          <div className="reference-actions">
            <button type="button" className="reference-primary" onClick={() => onNavigate(primaryTarget)}>
              <span>{primaryLabel}</span>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button type="button" className="reference-secondary" onClick={() => onNavigate(secondaryTarget)}>
              <span>{secondaryLabel}</span>
              <span className="reference-play"><Play className="h-4 w-4" /></span>
            </button>
          </div>

          <div className="reference-safe-note">
            <ShieldCheck className="h-4 w-4" />
            <span>تعلّم بخطوات واضحة وتقدّم محفوظ داخل حسابك</span>
          </div>
        </div>

        <div className="reference-visual" aria-label="نموذج بصري من تجربة التعلم في English30">
          <div className="reference-wave-bubble">
            <Volume2 className="h-6 w-6" />
          </div>

          <div className="reference-floating reference-floating-level">
            <div className="reference-level-pills"><span>A1</span><ArrowLeft className="h-3 w-3" /><span>A2</span></div>
            <strong>مستواك الحالي</strong>
          </div>

          <div className="reference-floating reference-floating-plan">
            <Target className="h-7 w-7" />
            <strong>خطة واضحة</strong>
            <span>من البداية للإتقان</span>
          </div>

          <div className="reference-floating reference-floating-time">
            <Clock3 className="h-7 w-7" />
            <strong>تعلّم بمرونة</strong>
            <span>وفق وقتك اليومي</span>
          </div>

          <div className="reference-floating reference-floating-award">
            <Award className="h-6 w-6" />
            <strong>شهادة إكمال</strong>
            <span>بعد استيفاء متطلبات الدورة</span>
          </div>

          <div className="reference-device-wrap">
            <div className="reference-device">
              <div className="reference-device-head">
                <div dir="ltr">
                  <span>Lesson 12</span>
                  <strong>Food &amp; Drinks</strong>
                </div>
                <div className="reference-progress-head">
                  <span>70%</span>
                  <div><i /></div>
                  <b>A2</b>
                </div>
              </div>

              <div className="reference-device-body">
                <div className="reference-vocab-card">
                  <div className="reference-word-copy" dir="ltr">
                    <span>Vocabulary</span>
                    <strong>apple</strong>
                    <small>/ˈæp.əl/</small>
                    <em dir="rtl">تفاحة</em>
                  </div>
                  <div className="reference-apple" aria-hidden="true">🍎</div>
                  <button type="button" className="reference-audio" aria-label="تشغيل النطق">
                    <Headphones className="h-5 w-5" />
                  </button>
                </div>

                <div className="reference-today-card">
                  <span>Today's Plan</span>
                  {['Vocabulary', 'Grammar', 'Practice'].map((item) => (
                    <div key={item}><Check className="h-4 w-4" /><span>{item}</span></div>
                  ))}
                  <div className="is-muted"><span className="reference-empty-check" /><span>Quiz</span></div>
                </div>
              </div>

              <div className="reference-device-stats">
                <div><BookOpen className="h-5 w-5" /><span>Vocabulary</span><strong>12</strong><small>كلمة جديدة</small></div>
                <div><span className="reference-fire">🔥</span><span>Streak</span><strong>12</strong><small>يومًا متتاليًا</small></div>
                <div><BarChart3 className="h-5 w-5" /><span>تقدمك</span><strong>85%</strong><small>استمر!</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="reference-benefit-strip" aria-label="مزايا English30">
        <div><Clock3 /><p><strong>تعلّم في وقتك</strong><span>مرونة تناسب يومك</span></p></div>
        <div><BookOpen /><p><strong>تعلّم منظم</strong><span>خطة واضحة خطوة بخطوة</span></p></div>
        <div><BarChart3 /><p><strong>تقدّم مستمر</strong><span>متابعة واضحة لإنجازك</span></p></div>
        <div><Target /><p><strong>محتوى تفاعلي</strong><span>تعلّم بالممارسة والتطبيق</span></p></div>
      </div>

      <div className="reference-trust-strip">
        <div className="reference-trust-brand"><span className="reference-trust-mark">E</span><p><strong>English30</strong><span>مسار واحد منظم لتعلّم الإنجليزية دون تشتّت</span></p></div>
        <div className="reference-trust-course"><Sparkles className="h-5 w-5" /><p><strong>{featuredCourse?.titleAr || 'English30 Foundation'}</strong><span>ابدأ من الأساس وابنِ مستواك خطوة بخطوة</span></p></div>
      </div>
    </section>
  );
};
