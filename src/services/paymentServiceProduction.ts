import { CheckoutOrderData, CheckoutResult } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { IPaymentGateway, PaymentContext, PaymentGatewayInfo } from './payments/IPaymentGateway';

export class ProductionPaymentGateway implements IPaymentGateway {
  readonly info: PaymentGatewayInfo = {
    id: 'paytabs',
    name: 'PayTabs',
    nameAr: 'PayTabs / Mada / Apple Pay',
    supportedMethods: ['mada', 'apple_pay', 'credit_card', 'stc_pay'],
    isLive: false,
  };

  async process(order: CheckoutOrderData, context: PaymentContext): Promise<CheckoutResult> {
    if (!isSupabaseConfigured) return { success: false, messageAr: 'خدمة الدفع غير مهيأة. يرجى المحاولة لاحقاً.' };
    const user = (await getSupabaseClient().auth.getUser()).data.user;
    if (!user) return { success: false, messageAr: 'يجب تسجيل الدخول قبل إتمام الاشتراك.' };

    const { error } = await getSupabaseClient().from('payments').insert({
      user_id: user.id,
      amount: context.finalAmount,
      currency: context.plan.currency ?? 'SAR',
      status: 'pending',
      provider: this.info.id,
      metadata: {
        plan_id: context.plan.id,
        billing_cycle: order.billingCycle,
        payment_method: order.paymentMethod,
        coupon_code: order.couponCode ?? null,
        customer_email: order.customerInfo.email,
      },
    });
    if (error) throw error;

    return {
      success: false,
      amountPaidSAR: context.finalAmount,
      discountAmountSAR: context.discountAmount,
      messageAr: 'تم إنشاء طلب الدفع، لكن بوابة الدفع الحقيقية لم تُفعّل بعد. لم يتم احتساب الاشتراك كمدفوع.',
    };
  }
}

