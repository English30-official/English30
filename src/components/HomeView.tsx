import React, { useState, useEffect } from 'react';
import { ActiveTab, Course, LevelCode, PricingPlan, PlatformSettings } from '../types';
import {
  COURSES_DATA,
  LEVELS_DATA,
} from '../data/mockData';
import { subscriptionsService, settingsService } from '../services';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Users,
  Target,
  Zap,
  MessageSquare,
  ChevronLeft,
  Play,
  Flame,
  Star,
  Lock,
} from 'lucide-react';

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectCourse: (course: Course) => void;
  onStartLesson: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  setActiveTab,
  onSelectCourse,
  onStartLesson,
}) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());

  useEffect(() => {
    async function loadPlans() {
      const data = await subscriptionsService.getPlans();
      setPlans(data.filter((p) => p.isActive !== false));
    }
    loadPlans();

    const unsubPlans = subscriptionsService.subscribe(({ plans: updated }) => {
      setPlans(updated.filter((p) => p.isActive !== false));
    });

    const unsubSettings = settingsService.subscribe((s) => {
      setSettings(s);
    });

    return () => {
      unsubPlans();
      unsubSettings();
    };
  }, []);
  return (
    <div className="space-y-16 py-8">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white text-slate-800 rounded-3xl p-6 sm:p-12 md:p-14 shadow-sm border border-slate-200">
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>المنصة الأولى المخصصة كلياً للمتعلم العربي</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight text-slate-800">
            {settings.heroHeadingAr || (
              <>
                تعلم الإنجليزية بأسلوب <span className="text-indigo-600 font-english">{settings.siteName || 'English30'}</span>
                <br className="hidden sm:inline" /> المنظم والتدريجي
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-500 font-normal leading-relaxed max-w-2xl mx-auto">
            {settings.heroSubtitleAr || 'من المبتدئ تماماً (A1) حتى الطلاقة التامة (C2). شرح عربي مبسط، تمارين تفاعلية، ومعلم ذكي بـ 30 دقيقة يومياً فقط.'}
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartLesson}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-4 rounded-xl text-base sm:text-lg shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>جرب درساً تفاعلياً الآن</span>
            </button>

            <button
              onClick={() => setActiveTab('placement-test')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold px-7 py-4 rounded-xl text-base transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Target className="w-5 h-5 text-indigo-600" />
              <span>اختبار تحديد المستوى (5 دقائق)</span>
            </button>
          </div>

          {/* Quick Highlight Stats */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-100 text-right sm:text-center">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="text-xl sm:text-2xl font-black text-indigo-600 font-english">A1 ➔ C2</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">منهج منظم متكامل</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="text-xl sm:text-2xl font-black text-indigo-600 font-english">+25,000</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">طالب يتمرن يومياً</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="text-xl sm:text-2xl font-black text-emerald-600 font-english">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">شرح عربي بدون تعقيد</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="text-xl sm:text-2xl font-black text-orange-500 font-english">AI Tutor</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">مساعد ومصحح ذكي</div>
            </div>
          </div>

        </div>
      </section>

      {/* WHY ENGLISH30? */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            سر النجاح معنا
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
            لماذا يختار الطلاب الناطقون بالعربية منصة English30؟
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            تغلبنا على كل التحديات التي تجعل المتعلم العربي يتوقف عن التعلم، واستبدلناها بأسلوب سلس وممتع.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">30 دقيقة يومياً</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              دروس مركزة ومصممة تناسب جدولك دون أن تسبب لك إرهاقاً، لضمان الاستمرارية وبناء عادة يومية ثابتة.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">شرح عربي يفهم عقليتك</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              توضيح القواعد والملاحظات الصعبة باللغة العربية مع ربطها بالأخطاء النحوية الشائعة التي يقع فيها العرب.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">معلم ذكي AI متوفر دائماً</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              مساعد شخصي يصحح لك الجمل، يشرح المفردات المتقدمة، ويدربك على المحادثات في أي وقت تريد.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">تطبيق حقيقي للمهارات الـ 6</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              تنمية متوازنة لـ (المفردات، القواعد، الاستماع، النطق، القراءة، والتفكير بالإنجليزية).
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-100/80 p-8 sm:p-12 rounded-3xl space-y-8 border border-slate-200/60">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            كيف تعمل منصة English30؟
          </h2>
          <p className="text-sm text-slate-600">3 خطوات بسيطة تبدأ بها رحلتك نحو الطلاقة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 text-center space-y-3 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white font-extrabold text-xl rounded-2xl flex items-center justify-center mx-auto shadow-md">
              1
            </div>
            <h3 className="font-bold text-lg text-slate-900">حدد مستواك بدقة</h3>
            <p className="text-sm text-slate-600">
              خذ اختبار تحديد المستوى السريع ليحدد نظامنا الذكي مستواك الدقيق من A1 إلى C2.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 text-center space-y-3 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white font-extrabold text-xl rounded-2xl flex items-center justify-center mx-auto shadow-md">
              2
            </div>
            <h3 className="font-bold text-lg text-slate-900">ادرس 30 دقيقة يومياً</h3>
            <p className="text-sm text-slate-600">
              استمع للمحتوى الصوت، شاهد الشرح العربي البسيط، وحل التمارين التفاعلية لتثبيت المعلومة.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 text-center space-y-3 relative z-10">
            <div className="w-12 h-12 bg-indigo-600 text-white font-extrabold text-xl rounded-2xl flex items-center justify-center mx-auto shadow-md">
              3
            </div>
            <h3 className="font-bold text-lg text-slate-900">مارس وتحدث مع AI</h3>
            <p className="text-sm text-slate-600">
              تحدث مع معلمك الذكي، صحح أخطاءك فورياً، وشاهد تقدمك وسلسلة إنجازك ترتفع يومياً.
            </p>
          </div>

        </div>
      </section>

      {/* LANGUAGE LEVELS (A1 to C2) PREVIEW */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              الإطار الأوروبي المرجعي للغات (CEFR)
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              المستويات التعليمية المنظمة
            </h2>
            <p className="text-sm text-slate-600">
              منهج متكامل يأخذك خطوة بخطوة من البداية حتى احتراف الإنجليزية
            </p>
          </div>
          <button
            onClick={() => setActiveTab('levels')}
            className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>عرض تفاصيل جميع المستويات</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEVELS_DATA.map((lvl) => (
            <div
              key={lvl.code}
              onClick={() => setActiveTab('levels')}
              className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-indigo-300 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-xl text-xs font-black border ${lvl.bgLight}`}>
                  مستوى {lvl.code}
                </span>
                <span className="text-xs font-bold text-slate-500">{lvl.estimatedHours} ساعة دراسية</span>
              </div>

              <div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {lvl.titleAr} <span className="text-slate-400 font-normal font-english text-sm">({lvl.titleEn})</span>
                </h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {lvl.descriptionAr}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>🎯 {lvl.targetVocab} كلمة مستهدفة</span>
                <span className="text-indigo-600 font-bold flex items-center gap-0.5 group-hover:translate-x-[-4px] transition-transform">
                  استكشف <ChevronLeft className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              الدورات التدريبية الموصى بها
            </h2>
            <p className="text-sm text-slate-600">
              دورات مخصصة لبناء المهارات الأساسية: محادثة، قواعد، استماع، ومفردات
            </p>
          </div>
          <button
            onClick={() => setActiveTab('courses')}
            className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>استعرض جميع الدورات</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COURSES_DATA.slice(0, 3).map((course) => (
            <div
              key={course.id}
              className={`bg-white rounded-2xl overflow-hidden border transition-shadow flex flex-col justify-between ${
                course.isLocked ? 'border-slate-200/80 opacity-95' : 'border-slate-200 shadow-xs hover:shadow-md'
              }`}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={course.image}
                  alt={course.titleAr}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    course.isLocked ? 'filter grayscale-[25%]' : 'hover:scale-105'
                  }`}
                />
                {course.isLocked ? (
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md border border-amber-400">
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ستنطلق قريباً</span>
                  </div>
                ) : (
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                    <span>متاحة الآن</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{course.rating}</span>
                </div>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                    <span>{course.categoryAr}</span>
                    <span>•</span>
                    <span>{course.lessonsCount} درسًا</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {course.titleAr}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {course.descriptionAr}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    👥 {course.studentsCount.toLocaleString('ar-SA')} طالب
                  </div>
                  {course.isLocked ? (
                    <button
                      disabled
                      className="bg-slate-100 border border-slate-200 text-amber-800 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>ستنطلق قريباً</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectCourse(course)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      عرض الدورة
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLACEMENT TEST PROMO BANNER */}
      <section className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-3xl p-8 sm:p-10 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-center md:text-right">
            <span className="bg-white/20 text-indigo-100 text-xs font-bold px-3 py-1 rounded-full">
              اختبار مجاني بالكامل
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              لا تعرف مستواك الحالي في الإنجليزية؟
            </h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
              خلال 5 دقائق فقط، يختبر نظامنا النحوي والمفردات ليعطيك تقريراً دقيقاً بمستواك من A1 إلى C2 مع خطة الدراسة المناسبة لك.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('placement-test')}
            className="shrink-0 bg-white text-indigo-700 hover:bg-slate-100 font-extrabold px-8 py-4 rounded-xl text-base shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            ابدأ اختبار تحديد المستوى الآن 🎯
          </button>
        </div>
      </section>

      {/* AI TUTOR SPOTLIGHT */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 space-y-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>المعلم الذكي Mr. Alex</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
              معلمك الشخصي بالذكاء الاصطناعي متوفر معك 24/7
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              اكتب له أي جملة بالإنجليزية وصحح أخطاءك، اطلب منه شرح الكلمات الصعبة باللغة العربية، أو مارس معه محادثات واقعية كأنك تتحدث مع متحدث أصلي.
            </p>

            <ul className="space-y-2.5 text-sm font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>تصحيح فوري للجمل والرد على الاستفسارات النحوية بالعربية</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>تدريب على محادثات العمل والمطار والسفر والمقابلة الشفهية</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>متاح في أي وقت ودون خجل أو خوف من الوقوع في أخطاء</span>
              </li>
            </ul>

            <button
              onClick={() => setActiveTab('ai-tutor')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>جرب تحدث الآن مع المعلم الذكي</span>
            </button>
          </div>

          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center font-bold text-slate-950">
                  🤖
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Mr. Alex (English30 AI)</div>
                  <div className="text-[11px] text-emerald-400">متصل الآن وجاهز لمساعدتك</div>
                </div>
              </div>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">تجربة توضيحية</span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 max-w-[85%] mr-auto text-slate-200">
                <strong className="text-amber-300 block mb-1">الطالب:</strong>
                صحح لي هذه الجملة: "I am go to restaurant yesterday"
              </div>

              <div className="bg-indigo-950/80 p-3.5 rounded-xl border border-indigo-800/60 max-w-[90%] ml-auto text-indigo-100 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <span>✨ تصحيح المعلم الذكي:</span>
                </div>
                <p>✅ <strong>I went to a restaurant yesterday.</strong></p>
                <p className="text-xs text-slate-300">
                  💡 استخدمنا <strong>went</strong> لأن كلمة <em>yesterday</em> تعبر عن الماضي البسيط، وحذفنا <em>am go</em>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SUMMARY */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            خطط تناسب الجميع
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            خطط الاشتراكات المقترحة
          </h2>
          <p className="text-sm text-slate-600">
            استمتع بالخطة المجانية أو انضم إلى خطة البلس للحصول على جميع الإمكانيات
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-6 border flex flex-col justify-between relative transition-all ${
                plan.isPopular
                  ? 'border-indigo-500 shadow-xl ring-2 ring-indigo-500/20'
                  : 'border-slate-200 shadow-xs hover:shadow-md'
              }`}
            >
              {plan.badgeAr && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold px-4 py-1 rounded-full shadow-sm">
                  {plan.badgeAr}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{plan.nameAr}</h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.descriptionAr}</p>
                </div>

                <div className="py-2 border-y border-slate-100">
                  <span className="text-3xl font-black text-slate-900 font-english">
                    {plan.priceMonthly === 0 ? 'مجاناً' : `${plan.priceMonthly} ${plan.currency || 'ر.س'}`}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-xs text-slate-500 mr-1">/ شهرياً</span>
                  )}
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700">
                  {plan.featuresAr.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  plan.isPopular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {plan.buttonTextAr} ➔
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6">
        <h2 className="text-2xl sm:text-4xl font-black">
          جاهز لبدء رحلتك الحقيقية في إتقان الإنجليزية؟
        </h2>
        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
          انضم اليوم لآلاف الطلاب العرب وابدأ بـ 30 دقيقة يومياً تغير مستقبل لغتك تماماً.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onStartLesson}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-8 py-4 rounded-2xl text-base shadow-lg transition-transform hover:scale-105"
          >
            جرب درساً تفاعلياً مجاناً 🚀
          </button>
          <button
            onClick={() => setActiveTab('placement-test')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-7 py-4 rounded-2xl text-base border border-slate-700"
          >
            اختبار تحديد المستوى
          </button>
        </div>
      </section>

    </div>
  );
};
