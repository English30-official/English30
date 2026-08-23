import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Tag,
  Plus,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Zap,
  Edit2,
  Trash2,
  Star,
} from 'lucide-react';
import { subscriptionsService, auditService } from '../../services';
import { PricingPlan, CouponItem } from '../../types';

export const OwnerSubscriptions: React.FC = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [metrics, setMetrics] = useState({
    monthlyRecurringRevenueSAR: 0,
    annualRevenueRunRateSAR: 0,
    averageRevenuePerUserSAR: 0,
    activePaidSubscribers: 0,
    totalSuccessfulTransactions: 0,
  });

  // Create coupon modal
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountPct, setNewDiscountPct] = useState(25);
  const [newMaxUses, setNewMaxUses] = useState(100);
  const [newExpiresAt, setNewExpiresAt] = useState('2026-12-31');

  // Edit plan modal
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [newFeatureText, setNewFeatureText] = useState('');

  useEffect(() => {
    async function load() {
      const p = await subscriptionsService.getPlans(true);
      setPlans(p);
      const c = await subscriptionsService.getCoupons();
      setCoupons(c);
      const m = await subscriptionsService.getFinancialMetrics();
      setMetrics(m);
    }
    load();

    const unsub = subscriptionsService.subscribe(({ plans: updatedPlans, coupons: updatedCoupons }) => {
      setPlans(updatedPlans);
      setCoupons(updatedCoupons);
    });

    return unsub;
  }, []);

  const handleToggleCoupon = async (coupon: CouponItem) => {
    const updated = await subscriptionsService.toggleCouponStatus(coupon.id);
    if (!updated) return;
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updated : c)));

    await auditService.logAction(
      updated.isActive ? 'ACTIVATE_COUPON' : 'DEACTIVATE_COUPON',
      'coupons',
      coupon.code,
      `تم ${updated.isActive ? 'تفعيل' : 'تعطيل'} كود الخصم ${coupon.code}`
    );
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`هل أنت متأكد من تعطيل كود الخصم (${code})؟`)) return;
    await subscriptionsService.deleteCoupon(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    await auditService.logAction('DEACTIVATE_COUPON', 'coupons', code, `تم تعطيل كود الخصم ${code} مع الحفاظ على السجل التاريخي`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    const created = await subscriptionsService.createCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountPercentage: Number(newDiscountPct),
      maxRedemptions: Number(newMaxUses),
      expiresAt: newExpiresAt,
      isActive: true,
    });

    setCoupons((prev) => [created, ...prev]);
    setIsCreatingCoupon(false);
    setNewCouponCode('');

    await auditService.logAction(
      'CREATE_COUPON',
      'coupons',
      created.code,
      `تم إنشاء كود خصم جديد بنسبة ${created.discountPercentage}%`
    );
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    await subscriptionsService.updatePlan(editingPlan.id, editingPlan);
    setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? editingPlan : p)));

    await auditService.logAction(
      'UPDATE_PLAN',
      'subscription_plans',
      editingPlan.nameAr,
      `تم تحديث باقة ${editingPlan.nameAr} وسعرها الشهري ${editingPlan.priceMonthly} والسنوي ${editingPlan.priceYearly}`
    );

    setEditingPlan(null);
  };

  const handleAddFeatureToEditing = () => {
    if (!editingPlan || !newFeatureText.trim()) return;
    setEditingPlan({
      ...editingPlan,
      featuresAr: [...editingPlan.featuresAr, newFeatureText.trim()],
    });
    setNewFeatureText('');
  };

  const handleRemoveFeatureFromEditing = (idx: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      featuresAr: editingPlan.featuresAr.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">الاشتراكات والكوبونات والأسعار</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة باقات الأسعار، مميزات الباقات، الكوبونات الترويجية، ومؤشرات الإيرادات.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingCoupon(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كود خصم (Coupon)</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-500">الإيراد الشهري المتكرر (MRR)</span>
          <div className="text-3xl font-black text-slate-900">
            {metrics.monthlyRecurringRevenueSAR.toLocaleString()} <span className="text-xs text-slate-500 font-bold">ر.س</span>
          </div>
          <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            نمو شهري مستمر
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-500">المعدل السنوي التقديري (ARR)</span>
          <div className="text-3xl font-black text-slate-900">
            {metrics.annualRevenueRunRateSAR.toLocaleString()} <span className="text-xs text-slate-500 font-bold">ر.س</span>
          </div>
          <p className="text-xs text-slate-500 font-bold">مبني على متوسط الاشتراكات</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-slate-500">المشتركون بالباقات المدفوعة</span>
          <div className="text-3xl font-black text-indigo-600">
            {metrics.activePaidSubscribers} <span className="text-xs text-slate-500 font-bold">طالب</span>
          </div>
          <p className="text-xs text-slate-500 font-bold">بمتوسط {metrics.averageRevenuePerUserSAR} ر.س / طالب</p>
        </div>
      </div>

      {/* Pricing Plans List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-900">باقات الاشتراك الحالية المعروضة للطلاب</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                  plan.isPopular ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200 shadow-2xs'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900">{plan.nameAr}</span>
                      {plan.isPopular && (
                        <span className="text-amber-500" title="الباقة المميزة الأكثر شعبية">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </span>
                      )}
                    </div>
                    {plan.badgeAr && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {plan.badgeAr}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-slate-900">{plan.priceMonthly}</span>
                      <span className="text-xs font-bold text-slate-500">ر.س / شهرياً</span>
                    </div>
                    {plan.priceYearly > 0 && (
                      <div className="text-xs text-emerald-600 font-bold">
                        السنوي: {plan.priceYearly} ر.س / شهرياً ({plan.priceYearly * 12} ر.س / سنة)
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">{plan.descriptionAr}</p>

                  <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                    {plan.featuresAr.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setEditingPlan({ ...plan })}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل الباقة والأسعار</span>
                  </button>
                  <span className="text-xs text-slate-400 font-english">{plan.id}</span>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Coupons Manager */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">أكواد الخصم الترويجية (Discount Coupons)</h3>
            <p className="text-xs text-slate-500 mt-0.5">أكواد يطبقها المتعلمون عند الدفع في بوابة الدفع الإلكتروني.</p>
          </div>
        </div>

        {coupons.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            لا توجد أكواد خصم حالياً. اضغط "إنشاء كود خصم" لإضافة كود جديد للطلاب.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 font-english bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {coupon.code}
                      </span>
                      <span className="text-xs font-extrabold text-indigo-600">
                        خصم {coupon.discountPercentage}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      تم الاستخدام: <strong>{coupon.timesRedeemed}</strong> / {coupon.maxRedemptions} | ينتهي في {coupon.expiresAt}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleCoupon(coupon)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                      coupon.isActive
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {coupon.isActive ? '🟢 كود مفعّل' : '⚪ معطّل حالياً'}
                  </button>

                  <button
                    onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف الكوبون"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Edit Plan */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">تعديل بيانات {editingPlan.nameAr}</h3>
                <p className="text-xs text-slate-500">تعديل الأسعار والمزايا والشارات الترويجية للباقة</p>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">اسم الباقة (عربي)</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.nameAr}
                    onChange={(e) => setEditingPlan({ ...editingPlan, nameAr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">شارة الباقة (Badge)</label>
                  <input
                    type="text"
                    placeholder="مثال: الأكثر طلباً"
                    value={editingPlan.badgeAr || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badgeAr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الوصف المختصر</label>
                <textarea
                  rows={2}
                  value={editingPlan.descriptionAr}
                  onChange={(e) => setEditingPlan({ ...editingPlan, descriptionAr: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">السعر الشهري (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">السعر الشهري في السنوي (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.priceYearly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">السعر السابق شهرياً (قبل الخصم)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.originalPriceMonthly || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, originalPriceMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نص زر الاشتراك</label>
                  <input
                    type="text"
                    value={editingPlan.buttonTextAr}
                    onChange={(e) => setEditingPlan({ ...editingPlan, buttonTextAr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={editingPlan.isPopular || false}
                  onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isPopular" className="text-xs font-bold text-slate-800 cursor-pointer">
                  تمييز هذه الباقة كـ (الأكثر شعبية والأفضل قيمة ⭐)
                </label>
              </div>

              {/* Features Editor */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 block">مميزات الباقة المعروضة:</label>
                
                <div className="space-y-1.5">
                  {editingPlan.featuresAr.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const updated = [...editingPlan.featuresAr];
                          updated[idx] = e.target.value;
                          setEditingPlan({ ...editingPlan, featuresAr: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeatureFromEditing(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="إضافة ميزة جديدة للباقة..."
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeatureToEditing}
                    className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                >
                  حفظ تعديلات الباقة
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Create Coupon */}
      {isCreatingCoupon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">إنشاء كود خصم جديد</h3>
              <button
                onClick={() => setIsCreatingCoupon(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">رمز الكوبون (Coupon Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DISCOUNT25"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black uppercase font-english"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newDiscountPct}
                    onChange={(e) => setNewDiscountPct(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الحد الأقصى للاستخدام</label>
                  <input
                    type="number"
                    min="1"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingCoupon(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                >
                  حفظ وتفعيل
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
