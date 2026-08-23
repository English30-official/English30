import { CheckoutOrderData, CheckoutResult, PaymentMethod } from '../types';
import { subscriptionsService } from './subscriptionsService';
import { auditService } from './auditService';
import { IPaymentGateway, PaymentGatewayInfo } from './payments/IPaymentGateway';
import { MockPaymentGateway } from './payments/MockPaymentGateway';

export type { IPaymentGateway, PaymentGatewayInfo } from './payments/IPaymentGateway';

export class PaymentService {
  public constructor(private gateway: IPaymentGateway = new MockPaymentGateway()) {}
  public setGateway(gateway: IPaymentGateway): void { this.gateway = gateway; }

  public async processCheckout(order: CheckoutOrderData): Promise<CheckoutResult> {
    const plan = await subscriptionsService.getPlanById(order.planId);
    if (!plan) return { success: false, messageAr: 'لم يتم العثور على الباقة المحددة أو أنها غير متاحة حالياً.' };
    if (!this.gateway.info.supportedMethods.includes(order.paymentMethod)) return { success: false, messageAr: 'طريقة الدفع المحددة غير مدعومة حالياً.' };

    const basePrice = order.billingCycle === 'yearly' ? plan.priceYearly * 12 : plan.priceMonthly;
    let discountAmount = 0;
    if (order.couponCode) {
      const coupon = await subscriptionsService.validateCoupon(order.couponCode);
      if (coupon.valid) discountAmount = Math.round((basePrice * coupon.discountPercentage) / 100);
    }
    const finalAmount = Math.max(0, basePrice - discountAmount);
    const result = await this.gateway.process(order, { plan, finalAmount, discountAmount });
    if (result.success) {
      await auditService.logAction('STUDENT_CHECKOUT', 'subscriptions', plan.nameAr,
        `تم إتمام عملية سداد بقيمة ${finalAmount} ريال عبر ${order.paymentMethod} للعميل ${order.customerInfo.fullName} (${order.customerInfo.email}). المعرف: ${result.transactionId}`,
        order.customerInfo.fullName, 'student');
    }
    return result;
  }

  public getPaymentMethods(): { id: PaymentMethod; nameAr: string; descriptionAr: string; icon: string; badgeAr?: string }[] {
    return [
      { id: 'mada', nameAr: 'بطاقة مدى (Mada)', descriptionAr: 'الدفع الفوري ببطاقة الصراف البنكية السعودية', icon: '💳', badgeAr: 'الأسرع في السعودية 🇸🇦' },
      { id: 'apple_pay', nameAr: 'Apple Pay', descriptionAr: 'الدفع بلمسة واحدة عبر أجهزة Apple', icon: '🍏', badgeAr: 'سريع وآمن' },
      { id: 'credit_card', nameAr: 'البطاقات الائتمانية (Visa / MasterCard)', descriptionAr: 'البطاقات الائتمانية المحلية والدولية', icon: '💳' },
      { id: 'stc_pay', nameAr: 'STC Pay', descriptionAr: 'المحفظة الرقمية STC Pay', icon: '📱' },
    ];
  }
  public getProviderInfo(): PaymentGatewayInfo { return { ...this.gateway.info }; }
}

export const paymentService = new PaymentService();
