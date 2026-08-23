import { CouponItem, CouponValidationResult, PricingPlan } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

type Listener = (data: { plans: PricingPlan[]; coupons: CouponItem[] }) => void;

type PlanFeatures = {
  items?: string[]; nameEn?: string; badgeAr?: string; isPopular?: boolean; buttonTextAr?: string;
  originalPriceMonthly?: number; originalPriceYearly?: number;
};

const mapPlan = (row: any): PricingPlan => {
  const prices = row.plan_prices ?? [];
  const monthly = prices.find((price: any) => price.interval === 'month' && price.is_active);
  const yearly = prices.find((price: any) => price.interval === 'year' && price.is_active);
  const metadata: PlanFeatures = Array.isArray(row.features) ? { items: row.features } : (row.features ?? {});
  return {
    id: row.id,
    nameAr: row.name,
    nameEn: metadata.nameEn || row.name,
    badgeAr: metadata.badgeAr,
    descriptionAr: row.description ?? '',
    featuresAr: metadata.items ?? [],
    priceMonthly: Number(monthly?.amount ?? 0),
    priceYearly: Number(yearly?.amount ?? 0),
    originalPriceMonthly: metadata.originalPriceMonthly,
    originalPriceYearly: metadata.originalPriceYearly,
    isPopular: metadata.isPopular,
    buttonTextAr: metadata.buttonTextAr || 'اشترك الآن',
    isActive: row.is_active,
    currency: monthly?.currency ?? yearly?.currency ?? 'SAR',
  };
};

const mapCoupon = (row: any): CouponItem => ({
  id: row.id, code: row.code,
  discountPercentage: row.discount_type === 'percentage' ? Number(row.discount_value) : 0,
  maxRedemptions: row.max_redemptions ?? 0,
  timesRedeemed: row.redeemed_count,
  expiresAt: row.expires_at ?? undefined,
  isActive: row.is_active,
});

class SupabaseSubscriptionsService {
  private plans: PricingPlan[] = [];
  private coupons: CouponItem[] = [];
  private listeners = new Set<Listener>();

  async getPlans(includeInactive = false): Promise<PricingPlan[]> {
    if (!isSupabaseConfigured) return [];
    let query = getSupabaseClient().from('plans').select('*,plan_prices(*)').order('sort_order');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    this.plans = (data ?? []).map(mapPlan);
    this.notify();
    return [...this.plans];
  }

  async getPlanById(id: string): Promise<PricingPlan | undefined> {
    return (await this.getPlans()).find((plan) => plan.id === id);
  }

  async updatePlan(id: string, updates: Partial<PricingPlan>): Promise<PricingPlan | null> {
    if (!isSupabaseConfigured) throw new Error('Supabase is required.');
    const { error } = await getSupabaseClient().rpc('manage_subscription_plan', {
      p_plan_id: id,
      p_payload: {
        nameAr: updates.nameAr,
        nameEn: updates.nameEn,
        descriptionAr: updates.descriptionAr,
        featuresAr: updates.featuresAr,
        badgeAr: updates.badgeAr,
        isPopular: updates.isPopular,
        buttonTextAr: updates.buttonTextAr,
        isActive: updates.isActive,
        priceMonthly: updates.priceMonthly,
        priceYearly: updates.priceYearly,
        originalPriceMonthly: updates.originalPriceMonthly,
        originalPriceYearly: updates.originalPriceYearly,
        currency: updates.currency || 'SAR',
      },
    });
    if (error) throw error;
    await this.getPlans(true);
    return this.plans.find((plan) => plan.id === id) ?? null;
  }

  async getCoupons(): Promise<CouponItem[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getSupabaseClient().from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    this.coupons = (data ?? []).map(mapCoupon);
    this.notify();
    return [...this.coupons];
  }

  async validateCoupon(raw: string): Promise<CouponValidationResult> {
    const code = raw.trim().toUpperCase();
    if (!code) return { valid: false, discountPercentage: 0, messageAr: 'الرجاء إدخال كود الخصم.' };
    const { data, error } = await getSupabaseClient().rpc('validate_coupon', { p_code: code }).maybeSingle();
    if (error) throw error;
    if (!data) return { valid: false, discountPercentage: 0, messageAr: 'كود الخصم غير صحيح أو غير متاح.' };
    const row = data as { id: string; code: string; discount_percentage: number; max_redemptions: number | null; redeemed_count: number; expires_at: string | null };
    const coupon = mapCoupon({ ...row, discount_type: 'percentage', discount_value: row.discount_percentage, is_active: true });
    return { valid: true, discountPercentage: coupon.discountPercentage, messageAr: `تم تطبيق خصم ${coupon.discountPercentage}% بنجاح! 🎉`, coupon };
  }

  async createCoupon(input: Omit<CouponItem, 'id' | 'timesRedeemed'>): Promise<CouponItem> {
    const { data, error } = await getSupabaseClient().from('coupons').insert({
      code: input.code.trim().toUpperCase(), discount_type: 'percentage', discount_value: input.discountPercentage,
      max_redemptions: input.maxRedemptions || null, expires_at: input.expiresAt ?? null, is_active: input.isActive,
    }).select('*').single();
    if (error) throw error;
    await this.getCoupons();
    return mapCoupon(data);
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const { error } = await getSupabaseClient().from('coupons').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    await this.getCoupons();
    return true;
  }

  async toggleCouponStatus(id: string): Promise<CouponItem | null> {
    const coupon = (await this.getCoupons()).find((item) => item.id === id);
    if (!coupon) return null;
    const { error } = await getSupabaseClient().from('coupons').update({ is_active: !coupon.isActive }).eq('id', id);
    if (error) throw error;
    await this.getCoupons();
    return this.coupons.find((item) => item.id === id) ?? null;
  }

  async getFinancialMetrics() {
    const client = getSupabaseClient();
    const [subscriptionsResult, paymentsResult] = await Promise.all([
      client.from('subscriptions').select('status,plans(plan_prices(amount,interval,is_active))').eq('status', 'active'),
      client.from('payments').select('amount,status').eq('status', 'paid'),
    ]);
    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    const active = subscriptionsResult.data ?? [];
    const monthlyRecurringRevenueSAR = Math.round(active.reduce((total, subscription: any) => {
      const plan = Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans;
      const prices = (plan?.plan_prices ?? []).filter((price: any) => price.is_active);
      const monthly = prices.find((price: any) => price.interval === 'month');
      const yearly = prices.find((price: any) => price.interval === 'year');
      return total + Number(monthly?.amount ?? (yearly ? Number(yearly.amount) / 12 : 0));
    }, 0));
    return {
      monthlyRecurringRevenueSAR,
      annualRevenueRunRateSAR: monthlyRecurringRevenueSAR * 12,
      averageRevenuePerUserSAR: active.length ? Math.round(monthlyRecurringRevenueSAR / active.length) : 0,
      activePaidSubscribers: active.length,
      totalSuccessfulTransactions: (paymentsResult.data ?? []).length,
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    void Promise.all([this.getPlans(), this.getCoupons()])
      .then(() => listener({ plans: [...this.plans], coupons: [...this.coupons] }))
      .catch(console.error);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = { plans: [...this.plans], coupons: [...this.coupons] };
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const subscriptionsService = new SupabaseSubscriptionsService();
