import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ActiveTab, CheckoutResult, PaymentMethod, PlatformSettings, PricingPlan } from '../types';
import { paymentService, settingsService, subscriptionsService } from '../services';

interface Options { defaultPlanId?: string; setActiveTab?: (tab: ActiveTab) => void; onStartLesson?: () => void; }

export function usePricingController({ defaultPlanId, setActiveTab, onStartLesson }: Options) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isYearly, setIsYearly] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [viewState, setViewState] = useState<'plans' | 'checkout' | 'success'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [fullName, setFullName] = useState('محمد العتيبي');
  const [email, setEmail] = useState('mohammed.student@example.com');
  const [phone, setPhone] = useState('0501234567');
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [appliedDiscountPct, setAppliedDiscountPct] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [cardNumber, setCardNumber] = useState('5888 •••• •••• 4021');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('789');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true); setHasError(false); setErrorMessage('');
    try {
      const activePlans = (await subscriptionsService.getPlans()).filter((plan) => plan.isActive !== false);
      setPlans(activePlans);
      const found = defaultPlanId ? activePlans.find((plan) => plan.id === defaultPlanId) : undefined;
      if (found && found.id !== 'free') { setSelectedPlan(found); setViewState('checkout'); }
    } catch (error: any) {
      setHasError(true); setErrorMessage(error?.message || 'تعذر تحميل باقات الاشتراك. يرجى المحاولة لاحقاً.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    void fetchPlans();
    const stopSettings = settingsService.subscribe(setSettings);
    const stopPlans = subscriptionsService.subscribe(({ plans: updated }) => setPlans(updated.filter((plan) => plan.isActive !== false)));
    return () => { stopSettings(); stopPlans(); };
  }, [defaultPlanId]);

  const handleSelectPlan = (plan: PricingPlan) => {
    if (plan.priceMonthly === 0 && plan.priceYearly === 0) { setActiveTab?.('lesson'); if (!setActiveTab) onStartLesson?.(); return; }
    setSelectedPlan(plan); setCouponCode(''); setCouponMessage(null); setAppliedDiscountPct(0); setViewState('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyCoupon = async (event: FormEvent) => {
    event.preventDefault(); if (!couponCode.trim()) return;
    setIsValidatingCoupon(true); setCouponMessage(null);
    try {
      const result = await subscriptionsService.validateCoupon(couponCode);
      setAppliedDiscountPct(result.valid ? result.discountPercentage : 0);
      setCouponMessage({ text: result.messageAr, isSuccess: result.valid });
    } catch { setCouponMessage({ text: 'حدث خطأ أثناء فحص الكوبون.', isSuccess: false }); }
    finally { setIsValidatingCoupon(false); }
  };

  const handleProcessCheckout = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedPlan) return;
    if (!fullName.trim() || !email.trim() || !phone.trim()) { alert('يرجى تعبئة كافة بيانات المشترك الأساسية.'); return; }
    setIsProcessingPayment(true);
    try {
      const result = await paymentService.processCheckout({ planId: selectedPlan.id, billingCycle: isYearly ? 'yearly' : 'monthly', paymentMethod, couponCode: appliedDiscountPct > 0 ? couponCode : undefined, customerInfo: { fullName, email, phoneNumber: phone } });
      if (!result.success) { alert(result.messageAr || 'تعذر إتمام الدفع. يرجى المحاولة مرة أخرى.'); return; }
      setCheckoutResult(result); setViewState('success'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) { alert('حدث خطأ غير متوقع أثناء معالجة الدفع: ' + (error?.message || '')); }
    finally { setIsProcessingPayment(false); }
  };

  const pricingMath = useMemo(() => {
    if (!selectedPlan) return { base: 0, discount: 0, vat: 0, total: 0 };
    const base = isYearly ? selectedPlan.priceYearly * 12 : selectedPlan.priceMonthly;
    const discount = appliedDiscountPct > 0 ? Math.round((base * appliedDiscountPct) / 100) : 0;
    const subtotal = Math.max(0, base - discount);
    return { base, discount, vat: Math.round(subtotal * ((settings.vatPercentage || 15) / 100)), total: subtotal };
  }, [selectedPlan, isYearly, appliedDiscountPct, settings.vatPercentage]);
  const popularPlan = plans.find((plan) => plan.isPopular) || plans.find((plan) => plan.priceMonthly > 0);
  const calculatedSavingsPct = popularPlan?.priceMonthly ? Math.round(((popularPlan.priceMonthly - popularPlan.priceYearly) / popularPlan.priceMonthly) * 100) : 30;

  return { plans, settings, isLoading, hasError, errorMessage, fetchPlans, isYearly, setIsYearly, openFaqIndex, setOpenFaqIndex,
    selectedPlan, setSelectedPlan, viewState, setViewState, paymentMethod, setPaymentMethod, fullName, setFullName, email, setEmail,
    phone, setPhone, couponCode, setCouponCode, couponMessage, appliedDiscountPct, isValidatingCoupon, cardNumber, setCardNumber,
    cardExpiry, setCardExpiry, cardCvv, setCardCvv, isProcessingPayment, checkoutResult, handleSelectPlan, handleApplyCoupon,
    handleProcessCheckout, pricingMath, calculatedSavingsPct };
}
