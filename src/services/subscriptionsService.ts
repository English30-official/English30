import { PricingPlan, CouponItem, CouponValidationResult } from '../types';
import { PRICING_PLANS } from '../data/mockData';

type SubscriptionsListener = (data: { plans: PricingPlan[]; coupons: CouponItem[] }) => void;

class SubscriptionsService {
  private plans: PricingPlan[] = PRICING_PLANS.map((p) => ({
    ...p,
    isActive: p.isActive !== false,
  }));

  private coupons: CouponItem[] = [];

  private listeners: Set<SubscriptionsListener> = new Set();

  public async getPlans(): Promise<PricingPlan[]> {
    // In future phases: `const { data, error } = await supabase.from('subscription_plans').select('*');`
    return [...this.plans];
  }

  public async getPlanById(id: string): Promise<PricingPlan | undefined> {
    return this.plans.find((p) => p.id === id);
  }

  public async updatePlan(id: string, updates: Partial<PricingPlan>): Promise<PricingPlan | null> {
    const idx = this.plans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.plans[idx] = { ...this.plans[idx], ...updates };
    this.notify();
    return this.plans[idx];
  }

  public async getCoupons(): Promise<CouponItem[]> {
    return [...this.coupons];
  }

  public async deleteCoupon(id: string): Promise<boolean> {
    const prevLen = this.coupons.length;
    this.coupons = this.coupons.filter((c) => c.id !== id);
    if (this.coupons.length !== prevLen) {
      this.notify();
      return true;
    }
    return false;
  }

  public async validateCoupon(rawCode: string): Promise<CouponValidationResult> {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { valid: false, discountPercentage: 0, messageAr: 'الرجاء إدخال كود الخصم.' };
    }

    const coupon = this.coupons.find((c) => c.code.toUpperCase() === code);
    if (!coupon) {
      return { valid: false, discountPercentage: 0, messageAr: 'كود الخصم غير صحيح أو غير موجود.' };
    }

    if (!coupon.isActive) {
      return { valid: false, discountPercentage: 0, messageAr: 'هذا الكوبون غير نشط حالياً.' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, discountPercentage: 0, messageAr: 'انتهت صلاحية هذا الكوبون.' };
    }

    if (coupon.timesRedeemed >= coupon.maxRedemptions) {
      return { valid: false, discountPercentage: 0, messageAr: 'وصل هذا الكوبون للحد الأقصى لمرات الاستخدام.' };
    }

    return {
      valid: true,
      discountPercentage: coupon.discountPercentage,
      messageAr: `تم تطبيق خصم ${coupon.discountPercentage}% بنجاح! 🎉`,
      coupon,
    };
  }

  public async createCoupon(data: Omit<CouponItem, 'id' | 'timesRedeemed'>): Promise<CouponItem> {
    const newCoupon: CouponItem = {
      ...data,
      id: `coupon-${Date.now()}`,
      timesRedeemed: 0,
    };
    this.coupons = [newCoupon, ...this.coupons];
    this.notify();
    return newCoupon;
  }

  public async toggleCouponStatus(id: string): Promise<CouponItem | null> {
    const c = this.coupons.find((x) => x.id === id);
    if (!c) return null;
    c.isActive = !c.isActive;
    this.notify();
    return { ...c };
  }

  public async getFinancialMetrics() {
    return {
      monthlyRecurringRevenueSAR: 28450,
      annualRevenueRunRateSAR: 341400,
      averageRevenuePerUserSAR: 189,
      activePaidSubscribers: 154,
      totalSuccessfulTransactions: 312,
    };
  }

  public subscribe(listener: SubscriptionsListener): () => void {
    this.listeners.add(listener);
    listener({ plans: [...this.plans], coupons: [...this.coupons] });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const payload = { plans: [...this.plans], coupons: [...this.coupons] };
    this.listeners.forEach((l) => l(payload));
  }
}

export const subscriptionsService = new SubscriptionsService();

