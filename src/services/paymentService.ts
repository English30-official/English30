import { CheckoutOrderData, CheckoutResult, PaymentMethod, PricingPlan } from '../types';
import { subscriptionsService } from './subscriptionsService';
import { auditService } from './auditService';
import { studentsService } from './studentsService';

export interface PaymentGatewayProvider {
  id: string;
  name: string;
  nameAr: string;
  supportedMethods: PaymentMethod[];
  isLive: boolean;
}

class PaymentService {
  private activeProvider: PaymentGatewayProvider = {
    id: 'paytabs_simulator',
    name: 'PayTabs Gateway Integration Layer',
    nameAr: 'بوابة الدفع الإلكتروني (PayTabs / Mada / Apple Pay)',
    supportedMethods: ['mada', 'apple_pay', 'credit_card', 'stc_pay'],
    isLive: false, // Ready to flip to true when production credentials are configured
  };

  /**
   * Process checkout transaction.
   * In future phases, this calls PayTabs/Stripe backend webhook/redirect endpoints.
   */
  public async processCheckout(order: CheckoutOrderData): Promise<CheckoutResult> {
    // Artificial latency to simulate secure payment verification
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const plan = await subscriptionsService.getPlanById(order.planId);
    if (!plan) {
      return {
        success: false,
        messageAr: 'لم يتم العثور على الباقة المحددة أو أنها غير متاحة حالياً.',
      };
    }

    // Calculate base price in SAR
    const basePrice = order.billingCycle === 'yearly' ? plan.priceYearly * 12 : plan.priceMonthly;

    // Validate coupon if provided
    let discountPercent = 0;
    let discountAmount = 0;

    if (order.couponCode) {
      const couponCheck = await subscriptionsService.validateCoupon(order.couponCode);
      if (couponCheck.valid) {
        discountPercent = couponCheck.discountPercentage;
        discountAmount = Math.round((basePrice * discountPercent) / 100);
      }
    }

    const finalAmount = Math.max(0, basePrice - discountAmount);
    const txnId = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ORD-E30-${Date.now().toString().slice(-5)}`;
    const receiptNo = `REC-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const expirationDate = new Date();
    if (order.billingCycle === 'yearly') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }

    // Record audit log
    await auditService.logAction(
      'STUDENT_CHECKOUT',
      'subscriptions',
      plan.nameAr,
      `تم إتمام عملية سداد بقيمة ${finalAmount} ريال عبر ${order.paymentMethod} للعميل ${order.customerInfo.fullName} (${order.customerInfo.email}). المعرف: ${txnId}`,
      order.customerInfo.fullName,
      'student'
    );

    return {
      success: true,
      transactionId: txnId,
      orderId,
      receiptNumber: receiptNo,
      planNameAr: plan.nameAr,
      amountPaidSAR: finalAmount,
      discountAmountSAR: discountAmount,
      expiresAt: expirationDate.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      messageAr: `تم تفعيل اشتراكك في ${plan.nameAr} بنجاح! مرحباً بك في عائلة English30.`,
    };
  }

  public getPaymentMethods(): {
    id: PaymentMethod;
    nameAr: string;
    descriptionAr: string;
    icon: string;
    badgeAr?: string;
  }[] {
    return [
      {
        id: 'mada',
        nameAr: 'بطاقة مدى (Mada)',
        descriptionAr: 'الدفع الفوري ببطاقة الصراف البنكية السعودية',
        icon: '💳',
        badgeAr: 'الأسرع في السعودية 🇸🇦',
      },
      {
        id: 'apple_pay',
        nameAr: 'Apple Pay',
        descriptionAr: 'الدفع بلمسة واحدة عبر أجهزة Apple',
        icon: '🍏',
        badgeAr: 'سريع وآمن',
      },
      {
        id: 'credit_card',
        nameAr: 'البطاقات الائتمانية (Visa / MasterCard)',
        descriptionAr: 'البطاقات الائتمانية المحلية والدولية',
        icon: '💳',
      },
      {
        id: 'stc_pay',
        nameAr: 'STC Pay',
        descriptionAr: 'المحفظة الرقمية STC Pay',
        icon: '📱',
      },
    ];
  }

  public getProviderInfo(): PaymentGatewayProvider {
    return { ...this.activeProvider };
  }
}

export const paymentService = new PaymentService();
