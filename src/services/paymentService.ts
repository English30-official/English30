import { CheckoutOrderData, CheckoutResult, PaymentMethod } from '../types';
import { subscriptionsService } from './subscriptionsServiceSupabase';
import type { IPaymentGateway, PaymentGatewayInfo } from './payments/IPaymentGateway';
import { ProductionPaymentGateway } from './paymentServiceProduction';

export type { IPaymentGateway, PaymentGatewayInfo } from './payments/IPaymentGateway';

export class PaymentService {
  public constructor(private gateway: IPaymentGateway = new ProductionPaymentGateway()) {}
  public setGateway(gateway: IPaymentGateway): void { this.gateway = gateway; }

  public async processCheckout(order: CheckoutOrderData): Promise<CheckoutResult> {
    const plan = await subscriptionsService.getPlanById(order.planId);
    if (!plan) return { success: false, messageAr: 'لم يتم العثور على الباقة المحددة أو أنها غير متاحة حالياً.' };
    if (!this.gateway.info.supportedMethods.includes(order.paymentMethod)) {
      return { success: false, messageAr: 'طريقة الدفع المحددة غير مدعومة حالياً.' };
    }

    const basePrice = order.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    let discountAmount = 0;
    if (order.couponCode) {
      const coupon = await subscriptionsService.validateCoupon(order.couponCode);
      if (coupon.valid) discountAmount = Math.round((basePrice * coupon.discountPercentage) / 100);
    }
    return this.gateway.process(order, {
      plan,
      finalAmount: Math.max(0, basePrice - discountAmount),
      discountAmount,
    });
  }

  public getPaymentMethods(): { id: PaymentMethod; nameAr: string; descriptionAr: string; icon: string; badgeAr?: string }[] {
    return [
      { id: 'mada', nameAr: 'بطاقة مدى (Mada)', descriptionAr: 'الدفع ببطاقة مدى', icon: '💳' },
      { id: 'apple_pay', nameAr: 'Apple Pay', descriptionAr: 'الدفع عبر Apple Pay', icon: '🍏' },
      { id: 'credit_card', nameAr: 'Visa / MasterCard', descriptionAr: 'البطاقات الائتمانية', icon: '💳' },
      { id: 'stc_pay', nameAr: 'STC Pay', descriptionAr: 'المحفظة الرقمية', icon: '📱' },
    ];
  }

  public getProviderInfo(): PaymentGatewayInfo { return { ...this.gateway.info }; }
}

export const paymentService = new PaymentService();

