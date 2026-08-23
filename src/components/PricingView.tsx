import React from 'react';
import { ActiveTab } from '../types';
import { paymentService } from '../services';
import { usePricingController } from '../hooks/usePricingController';
import {
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ArrowRight,
  CreditCard,
  Lock,
  Tag,
  AlertCircle,
  RefreshCw,
  Zap,
  Check,
  Shield,
  HelpCircle,
  Clock,
  Award,
} from 'lucide-react';

interface PricingViewProps {
  setActiveTab?: (tab: ActiveTab) => void;
  onStartLesson?: () => void;
  defaultPlanId?: string;
}

export const PricingView: React.FC<PricingViewProps> = ({ setActiveTab, onStartLesson, defaultPlanId }) => {
  const {
    plans, settings, isLoading, hasError, errorMessage, fetchPlans, isYearly, setIsYearly,
    openFaqIndex, setOpenFaqIndex, selectedPlan, setSelectedPlan, viewState, setViewState,
    paymentMethod, setPaymentMethod, fullName, setFullName, email, setEmail, phone, setPhone,
    couponCode, setCouponCode, couponMessage, appliedDiscountPct, isValidatingCoupon,
    cardNumber, setCardNumber, cardExpiry, setCardExpiry, cardCvv, setCardCvv,
    isProcessingPayment, checkoutResult, handleSelectPlan, handleApplyCoupon,
    handleProcessCheckout, pricingMath, calculatedSavingsPct,
  } = usePricingController({ setActiveTab, onStartLesson, defaultPlanId });

  const faqs = settings.pricingFaqs && settings.pricingFaqs.length > 0
    ? settings.pricingFaqs.map((f) => ({ q: f.questionAr, a: f.answerAr }))
    : [
        {
          q: 'هل المنصة مناسبة للشخص الذي لا يعرف أي شيء بالإنجليزية (مبتدئ تماماً)؟',
          a: 'نعم تماماً! منهج English30 مصمم خصيصاً ويبدأ من مستوى A1 بالأبجدية والأرقام وقواعد الجملة الأساسية مع شرح عربي مبسط وتطبيق تدريجي يمنع الإحباط.',
        },
        {
          q: 'كيف تختلف منصة English30 عن التطبيقات التقليدية؟',
          a: 'تعتمد English30 على الشرح الموجه للناطقين بالعربية بالتحديد، مع مراعاة الاختلافات النحوية، بالإضافة لدمج المعلم الذكي AI والتركيز على الالتزام بـ 30 دقيقة يومياً.',
        },
        {
          q: 'هل يمكنني إلغاء الاشتراك في أي وقت؟',
          a: 'نعم بكل تأكيد وبدون أي التزامات معقدة. يمكنك إلغاء التجديد التلقائي بضغطة زر واحدة من إعدادات حسابك في أي وقت.',
        },
        {
          q: 'هل توجد ضمانة لاسترداد الأموال؟',
          a: `نعم، نوفر ${settings.refundGuaranteeTitleAr || 'ضماناً ذهبياً'} لاسترداد الأموال خلال ${settings.refundGuaranteeDays || 14} يوماً من تاريخ الاشتراك.`,
        },
        {
          q: 'كيف يعمل المعلم الذكي AI مع الطلاب؟',
          a: 'يعمل المعلم الذكي كمساعد متاح 24 ساعة. يصحح لك أي جملة تمليها عليه مع بيان السبب بالعربية، ويشرح لك المفردات، ويدربك على المحادثة الشفهية.',
        },
        {
          q: 'ما هي طرق الدفع المتاحة في المنصة؟',
          a: 'ندعم كافة وسائل الدفع الآمنة في المملكة والخليج: بطاقات مدى (Mada)، Apple Pay، البطاقات الائتمانية (Visa / MasterCard)، ومحفظة STC Pay.',
        },
      ];

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div className="py-16 space-y-10 max-w-5xl mx-auto" dir="rtl">
        <div className="text-center space-y-3 animate-pulse">
          <div className="h-6 w-32 bg-slate-200 rounded-full mx-auto" />
          <div className="h-10 w-96 bg-slate-200 rounded-2xl mx-auto" />
          <div className="h-4 w-72 bg-slate-200 rounded-xl mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-8 border border-slate-200 space-y-6 animate-pulse">
              <div className="h-6 w-24 bg-slate-200 rounded-lg" />
              <div className="h-12 w-36 bg-slate-200 rounded-xl" />
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-5/6 bg-slate-200 rounded" />
                <div className="h-4 w-4/6 bg-slate-200 rounded" />
                <div className="h-4 w-5/6 bg-slate-200 rounded" />
              </div>
              <div className="h-12 w-full bg-slate-200 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (hasError) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6" dir="rtl">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">تعذر تحميل باقات الاشتراك</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {errorMessage || 'حدث خطأ مؤقت أثناء جلب خطط الأسعار. يرجى التحقق من اتصالك والمحاولة مرة أخرى.'}
          </p>
        </div>
        <button
          onClick={fetchPlans}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    );
  }

  // 3. EMPTY STATE
  if (plans.length === 0) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6" dir="rtl">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">لا توجد باقات متاحة حالياً</h2>
          <p className="text-sm text-slate-600">
            يتم حالياً تحديث خطط الأسعار والعروض الترويجية. يمكنك البدء في الدروس المجانية مؤقتاً.
          </p>
        </div>
        <button
          onClick={() => (setActiveTab ? setActiveTab('home') : null)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // 4. SUCCESS / RECEIPT VIEW
  if (viewState === 'success' && checkoutResult) {
    return (
      <div className="py-10 max-w-2xl mx-auto space-y-8 animate-fadeIn" dir="rtl">
        
        {/* Celebration Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-8 sm:p-10 rounded-3xl text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <span className="bg-white/20 text-emerald-100 text-xs font-black px-3 py-1 rounded-full border border-white/20">
              تم الدفع والتفعيل بنجاح
            </span>
            <h1 className="text-2xl sm:text-4xl font-black">
              أهلاً بك في باقة {checkoutResult.planNameAr}! 🎉
            </h1>
            <p className="text-emerald-100 text-sm max-w-md mx-auto leading-relaxed">
              {checkoutResult.messageAr}
            </p>
          </div>
        </div>

        {/* Official Receipt Details */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-base text-slate-900">تفاصيل إيصال العملية</h3>
            <span className="text-xs text-slate-500 font-mono">رقم الإيصال: {checkoutResult.receiptNumber}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-500 block mb-1">المبلغ المسدد:</span>
              <strong className="text-slate-900 font-black text-sm">{checkoutResult.amountPaidSAR} ر.س</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-500 block mb-1">معرف العملية:</span>
              <strong className="text-slate-900 font-mono font-bold">{checkoutResult.transactionId}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block mb-1">تاريخ انتهاء الاشتراك:</span>
              <strong className="text-slate-900 font-bold">{checkoutResult.expiresAt}</strong>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>تم فتح جميع مميزات باقتك فورياً:</strong>
              <p className="mt-0.5 text-emerald-800">
                يمكنك الآن الوصول لجميع المستويات (A1 - C2)، محادثة المعلم الذكي بلا حدود، وتحميل مصادر المنهج كاملة.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                if (setActiveTab) setActiveTab('lesson');
                else if (onStartLesson) onStartLesson();
              }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>الانتقال للدروس وبدء التعلم الآن</span>
            </button>

            <button
              onClick={() => {
                if (setActiveTab) setActiveTab('dashboard');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-2xl text-sm transition-all cursor-pointer"
            >
              لوحة تحكم الطالب
            </button>
          </div>

        </div>

      </div>
    );
  }

  // 5. CHECKOUT VIEW
  if (viewState === 'checkout' && selectedPlan) {
    const paymentMethods = paymentService.getPaymentMethods();

    return (
      <div className="py-6 max-w-6xl mx-auto space-y-8 animate-fadeIn" dir="rtl">
        
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewState('plans')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع لاختيار باقة أخرى</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>بوابة دفع آمنة ومشفرة بتقنية 256-bit SSL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Checkout Form Column (8 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Customer Information */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                  1
                </div>
                <h3 className="font-extrabold text-lg text-slate-900">بيانات الطالب والمشترك</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-colors"
                    placeholder="محمد عبدالله"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-colors"
                    placeholder="student@example.com"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">رقم الجوال (للتفعيل والإشعارات) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-500 focus:outline-hidden transition-colors font-mono"
                    placeholder="0501234567"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Payment Method Selection */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h3 className="font-extrabold text-lg text-slate-900">طريقة الدفع والسداد</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((pm) => {
                  const isSelected = paymentMethod === pm.id;

                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{pm.icon}</span>
                          <span className="font-extrabold text-sm text-slate-900">{pm.nameAr}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{pm.descriptionAr}</p>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Payment Details Inputs */}
              <div className="pt-4 border-t border-slate-100">
                {paymentMethod === 'apple_pay' ? (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl text-center space-y-2">
                    <p className="text-xs text-slate-300">
                      سيتم فتح نافذة سداد Apple Pay الآمنة بلمسة واحدة بمجرد الضغط على زر التأكيد.
                    </p>
                  </div>
                ) : paymentMethod === 'stc_pay' ? (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700">رقم جوال حساب STC Pay المرتبط:</label>
                    <input
                      type="text"
                      defaultValue={phone}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold"
                    />
                    <p className="text-[11px] text-slate-500">ستصلك رسالة تأكيد في تطبيق STC Pay للموافقة على العملية.</p>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">بيانات بطاقة {paymentMethod === 'mada' ? 'مدى' : 'الائتمان'}:</span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> مشفر وآمن
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-600">رقم البطاقة (16 رقماً)</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">تاريخ الانتهاء (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">رمز الأمان (CVV)</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Column: Order Summary & Coupon (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Order Summary Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 sticky top-24">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-lg text-slate-900">ملخص الطلب والاشتراك</h3>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                  {isYearly ? `اشتراك سنوي (وفر ${calculatedSavingsPct}%)` : 'اشتراك شهري'}
                </span>
              </div>

              {/* Selected Plan Details */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-base text-slate-900">{selectedPlan.nameAr}</span>
                  <span className="text-xs text-slate-500 font-english">{selectedPlan.nameEn}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedPlan.descriptionAr}</p>
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">هل لديك كود خصم أو كوبون؟</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="أدخل رمز الكوبون..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    {isValidatingCoupon ? 'جاري الفحص...' : 'تطبيق'}
                  </button>
                </div>
                {couponMessage && (
                  <p className={`text-xs font-bold ${couponMessage.isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {couponMessage.text}
                  </p>
                )}
              </form>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>سعر الباقة الأساسي ({isYearly ? '12 شهراً' : 'شهر واحد'}):</span>
                  <span className="font-bold">{pricingMath.base} {settings.pricingCurrency || 'ر.س'}</span>
                </div>

                {pricingMath.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>الخصم المطبق ({appliedDiscountPct}%):</span>
                    <span>- {pricingMath.discount} {settings.pricingCurrency || 'ر.س'}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>ضريبة القيمة المضافة ({settings.vatPercentage}% {settings.isVatInclusive ? 'مشمولة' : 'مضافة'}):</span>
                  <span>{pricingMath.vat} {settings.pricingCurrency || 'ر.س'}</span>
                </div>

                <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                  <span>المبلغ الإجمالي المطلوب:</span>
                  <span className="text-xl text-indigo-600 font-black">{pricingMath.total} {settings.pricingCurrency || 'ر.س'}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleProcessCheckout}
                disabled={isProcessingPayment}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold py-4 rounded-2xl text-base shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جاري معالجة الدفع وتأكيد الاشتراك...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تأكيد الدفع وتفعيل الاشتراك ({pricingMath.total} {settings.pricingCurrency || 'ر.س'})</span>
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ضمان استرداد {settings.refundGuaranteeDays || 14} يوم</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تفعيل فوري</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // 6. MAIN PRICING PLANS VIEW
  return (
    <div className="space-y-12 py-6" dir="rtl">
      
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 shadow-2xs">
          خطط الأسعار والاشتراكات
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
          استثمر في لغتك بأسعار مرنة ومناسبة
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          اختر الخطة المناسبة لسرعة تعلمك وحدد هدفك اليوم للتحدث بالإنجليزية بطلاقة وثقة.
        </p>

        {/* Billing Toggle Switch */}
        {settings.featureFlags.annual_subscription !== false && <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold transition-colors ${!isYearly ? 'text-slate-900 font-black' : 'text-slate-400'}`}>
            اشتراك شهري
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="w-14 h-8 bg-indigo-600 rounded-full p-1 relative transition-colors cursor-pointer shadow-inner"
            aria-label="التبديل بين الدفع الشهري والسنوي"
          >
            <div
              className={`w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                isYearly ? 'translate-x-[-24px]' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold transition-colors ${isYearly ? 'text-slate-900 font-black' : 'text-slate-400'}`}>
              اشتراك سنوي
            </span>
            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
              وفر {calculatedSavingsPct}% 🎉
            </span>
          </div>
        </div>}
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan) => {
          const currentPrice = isYearly ? plan.priceYearly : plan.priceMonthly;
          const originalPrice = isYearly ? plan.originalPriceYearly : plan.originalPriceMonthly;
          const isFree = plan.priceMonthly === 0 && plan.priceYearly === 0;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-8 border flex flex-col justify-between relative transition-all ${
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

              <div className="space-y-6">
                <div>
                  <h3 className="font-extrabold text-2xl text-slate-900">{plan.nameAr}</h3>
                  <span className="text-xs text-slate-400 font-english font-medium block mt-0.5">{plan.nameEn}</span>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{plan.descriptionAr}</p>
                </div>

                {/* Price Display */}
                <div className="py-4 border-y border-slate-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 font-english">
                      {currentPrice} {plan.currency || settings.pricingCurrency || 'ر.س'}
                    </span>
                    {!isFree && (
                      <span className="text-xs text-slate-500 font-medium">/ شهرياً</span>
                    )}
                    {originalPrice && originalPrice > currentPrice && (
                      <span className="text-xs text-slate-400 line-through mr-1 font-bold">
                        {originalPrice} {plan.currency || settings.pricingCurrency || 'ر.س'}
                      </span>
                    )}
                  </div>

                  {!isFree && isYearly && (
                    <div className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>يُسدد سنوياً ({currentPrice * 12} {plan.currency || settings.pricingCurrency || 'ر.س'} / السنة)</span>
                    </div>
                  )}

                  {isFree && (
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                      بدون بطاقة ائتمان • متاح دائماً
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">مميزات هذه الباقة:</h4>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {plan.featuresAr.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action CTA Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full mt-8 py-3.5 rounded-2xl font-black text-sm transition-all cursor-pointer shadow-xs ${
                  plan.isPopular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:scale-[1.02]'
                    : isFree
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isFree ? plan.buttonTextAr : `${plan.buttonTextAr} ➔`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Security & Guarantee Banner */}
      <div className="p-6 bg-indigo-50/70 rounded-3xl border border-indigo-100 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">{settings.refundGuaranteeTitleAr || 'ضمان ذهبي 100% لاسترداد الأموال'}</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {settings.refundGuaranteeDescAr || `جرب باقتك لمدة ${settings.refundGuaranteeDays || 14} يوماً. إن لم تشعر بتحسن ملموس في لغتك وثقتك، سنعيد لك كامل المبلغ فورياً.`}
            </p>
          </div>
        </div>
      </div>

      {/* FAQS ACCORDION */}
      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">الأسئلة الشائعة حول الاشتراكات</h2>
          <p className="text-xs text-slate-500">إجابات عن أكثر الأسئلة تكراراً لدى الطلاب والمشتركين</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-right font-bold text-sm text-slate-900 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100/80 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

