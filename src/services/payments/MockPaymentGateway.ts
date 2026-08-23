import { CheckoutOrderData, CheckoutResult } from '../../types';
import { IPaymentGateway, PaymentContext, PaymentGatewayInfo } from './IPaymentGateway';

export class MockPaymentGateway implements IPaymentGateway {
  public readonly info: PaymentGatewayInfo = {
    id: 'paytabs_simulator',
    name: 'PayTabs Gateway Integration Layer',
    nameAr: 'بوابة الدفع الإلكتروني (PayTabs / Mada / Apple Pay)',
    supportedMethods: ['mada', 'apple_pay', 'credit_card', 'stc_pay'],
    isLive: false,
  };

  public async process(order: CheckoutOrderData, context: PaymentContext): Promise<CheckoutResult> {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const now = Date.now();
    const expirationDate = new Date();
    if (order.billingCycle === 'yearly') expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    else expirationDate.setMonth(expirationDate.getMonth() + 1);
    return {
      success: true,
      transactionId: `TXN-${now.toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: `ORD-E30-${now.toString().slice(-5)}`,
      receiptNumber: `REC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      planNameAr: context.plan.nameAr,
      amountPaidSAR: context.finalAmount,
      discountAmountSAR: context.discountAmount,
      expiresAt: expirationDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
      messageAr: `تم تفعيل اشتراكك في ${context.plan.nameAr} بنجاح! مرحباً بك في عائلة English30.`,
    };
  }
}
