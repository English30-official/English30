import React, { useState, useEffect } from 'react';
import {
  Settings,
  Phone,
  Send,
  Globe,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Shield,
  HelpCircle,
  Plus,
  Trash2,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { settingsService, auditService } from '../../services';
import { PlatformSettings, PricingFaqItem } from '../../types';

export const OwnerSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>(settingsService.getSettingsSync());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New FAQ form state
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [isAddingFaq, setIsAddingFaq] = useState(false);

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await settingsService.updateSettings(settings);
    await auditService.logAction(
      'UPDATE_SETTINGS',
      'platform_settings',
      'إعدادات المنصة العامة',
      'تحديث الأسعار، سياسة الاسترداد، الضريبة، بيانات التواصل، والشريط الإعلاني'
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;

    const newFaq: PricingFaqItem = {
      id: `faq-${Date.now()}`,
      questionAr: newFaqQuestion.trim(),
      answerAr: newFaqAnswer.trim(),
      orderIndex: (settings.pricingFaqs?.length || 0) + 1,
    };

    setSettings({
      ...settings,
      pricingFaqs: [...(settings.pricingFaqs || []), newFaq],
    });

    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setIsAddingFaq(false);
  };

  const handleDeleteFaq = (faqId: string) => {
    setSettings({
      ...settings,
      pricingFaqs: (settings.pricingFaqs || []).filter((f) => f.id !== faqId),
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إعدادات المنصة والتجارة (Platform & Commercial Settings)</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            التحكم المركزي في هوية الموقع، الضرائب، سياسة الاسترداد، شريط الإعلانات، الأسئلة الشائعة، وبيانات التواصل.
          </p>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ الإعدادات وتطبيقها فوراً في واجهات الطلاب!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* 1. Brand & Hero Marketing Texts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">النصوص التسويقية وهوية المنصة</h3>
              <p className="text-xs text-slate-500">العناوين الرئيسية التي تظهر للزوار في واجهة الموقع.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم المنصة (Brand Name)</label>
              <input
                type="text"
                value={settings.siteName || 'English30'}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">الشعار اللفظي المقتضب (Tagline)</label>
              <input
                type="text"
                value={settings.taglineAr || ''}
                onChange={(e) => setSettings({ ...settings, taglineAr: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">العنوان الرئيسي في الواجهة (Hero Headline)</label>
              <input
                type="text"
                value={settings.heroHeadlineAr || ''}
                onChange={(e) => setSettings({ ...settings, heroHeadlineAr: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">الوصف الترويجي في الواجهة (Hero Subheadline)</label>
              <input
                type="text"
                value={settings.heroSubheadlineAr || ''}
                onChange={(e) => setSettings({ ...settings, heroSubheadlineAr: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. Promotional Announcement Banner */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">الشريط الإعلاني الترويجي العلوي (Promo Banner)</h3>
                <p className="text-xs text-slate-500">يظهر في أعلى كل صفحات المنصة لجذب المشتركين للعروض.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  announcementBanner: {
                    ...settings.announcementBanner,
                    enabled: !settings.announcementBanner?.enabled,
                  },
                })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                settings.announcementBanner?.enabled
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {settings.announcementBanner?.enabled ? '🟢 مفعّل ويظهر للطلاب' : '⚪ معطّل حالياً'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">نص الإعلان الترويجي</label>
              <input
                type="text"
                value={settings.announcementBanner?.textAr || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBanner: {
                      ...settings.announcementBanner,
                      textAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">شارة الإعلان (Badge)</label>
              <input
                type="text"
                value={settings.announcementBanner?.badgeTextAr || 'عرض خاص'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    announcementBanner: {
                      ...settings.announcementBanner,
                      badgeTextAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* 3. Pricing, Taxes & Refund Policy */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">السياسات المالية والضرائب والاسترداد</h3>
              <p className="text-xs text-slate-500">إعدادات العملة، نسبة ضريبة القيمة المضافة (VAT)، وضمان استرداد الأموال.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">العملة المعروضة</label>
              <input
                type="text"
                value={settings.pricingCurrency || 'ر.س'}
                onChange={(e) => setSettings({ ...settings, pricingCurrency: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">نسبة ضريبة القيمة المضافة (VAT %)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.vatPercentage ?? 15}
                onChange={(e) => setSettings({ ...settings, vatPercentage: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">طريقة احتساب الضريبة</label>
              <select
                value={settings.isVatInclusive ? 'inclusive' : 'exclusive'}
                onChange={(e) => setSettings({ ...settings, isVatInclusive: e.target.value === 'inclusive' })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              >
                <option value="inclusive">الأسعار شاملة الضريبة (VAT Inclusive)</option>
                <option value="exclusive">الضريبة تُضاف فوق السعر (VAT Exclusive)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">مدة ضمان استرداد الأموال (بالأيام)</label>
              <input
                type="number"
                min="0"
                max="90"
                value={settings.refundGuaranteeDays ?? 14}
                onChange={(e) => setSettings({ ...settings, refundGuaranteeDays: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">عنوان شارة الضمان</label>
              <input
                type="text"
                value={settings.refundGuaranteeTitleAr || 'ضمان ذهبي 100% لاسترداد الأموال'}
                onChange={(e) => setSettings({ ...settings, refundGuaranteeTitleAr: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">نص توضيح سياسة الاسترداد</label>
              <input
                type="text"
                value={settings.refundGuaranteeDescAr || ''}
                onChange={(e) => setSettings({ ...settings, refundGuaranteeDescAr: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* 4. Support & Community Channels */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">بيانات التواصل والدعم (WhatsApp & Social Channels)</h3>
              <p className="text-xs text-slate-500">الأرقام والروابط التي يتواصل من خلالها الطلاب مع فريق الدعم.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رقم الواتساب الرسمي (مع الرمز الدولي)</label>
              <input
                type="text"
                value={settings.contactWhatsApp || ''}
                onChange={(e) => setSettings({ ...settings, contactWhatsApp: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-english"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رسالة الواتساب التلقائية الترحيبية</label>
              <input
                type="text"
                value={settings.whatsappDefaultMessage || ''}
                onChange={(e) => setSettings({ ...settings, whatsappDefaultMessage: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رابط قناة التيليجرام العامة</label>
              <input
                type="text"
                value={settings.telegramChannelUrl || ''}
                onChange={(e) => setSettings({ ...settings, telegramChannelUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-english"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">معرف بوت/دعم التيليجرام</label>
              <input
                type="text"
                value={settings.telegramBotUsername || ''}
                onChange={(e) => setSettings({ ...settings, telegramBotUsername: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-english"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رابط حساب X (Twitter)</label>
              <input
                type="text"
                value={settings.xTwitterUrl || ''}
                onChange={(e) => setSettings({ ...settings, xTwitterUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-english"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">رابط قناة YouTube</label>
              <input
                type="text"
                value={settings.youtubeUrl || ''}
                onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-english"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* 5. Platform Status & Trial Limits */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">حالة التسجيل وسياسة التجربة المجانية</h3>
              <p className="text-xs text-slate-500">التحكم في إتاحة تسجيل الطلاب الجدد وعدد الدروس التجريبية المفتوحة.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">حالة تسجيل الطلاب الجدد</label>
              <select
                value={settings.registrationStatus || (settings.isRegistrationOpen ? 'open' : 'closed')}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSettings({
                    ...settings,
                    registrationStatus: val,
                    isRegistrationOpen: val === 'open',
                  });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              >
                <option value="open">🟢 التسجيل مفتوح ومتاح للجميع</option>
                <option value="waitlist">🟡 قائمة انتظار (Waitlist)</option>
                <option value="closed">🔴 التسجيل مغلق مؤقتاً</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">عدد الدروس المتاحة مجاناً للتجربة</label>
              <input
                type="number"
                min="0"
                max="10"
                value={settings.freeTrialLessonsCount ?? 3}
                onChange={(e) => setSettings({ ...settings, freeTrialLessonsCount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* 6. Pricing FAQs Manager */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">الأسئلة الشائعة في صفحة الأسعار (Pricing FAQs)</h3>
                <p className="text-xs text-slate-500">إضافة وتعديل وحذف الأسئلة والإجابات المعروضة للطلاب.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingFaq(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة سؤال جديد</span>
            </button>
          </div>

          {/* New FAQ Inline Form */}
          {isAddingFaq && (
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-black text-indigo-900">إضافة سؤال وإجابة جديدة:</h4>
              <input
                type="text"
                placeholder="نص السؤال بالعربية..."
                value={newFaqQuestion}
                onChange={(e) => setNewFaqQuestion(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold"
              />
              <textarea
                rows={2}
                placeholder="نص الإجابة التفصيلية..."
                value={newFaqAnswer}
                onChange={(e) => setNewFaqAnswer(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingFaq(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-4 py-1.5 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                >
                  إدراج في القائمة
                </button>
              </div>
            </div>
          )}

          {/* List of FAQs */}
          <div className="divide-y divide-slate-100">
            {settings.pricingFaqs?.map((faq, idx) => (
              <div key={faq.id || idx} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={faq.questionAr}
                      onChange={(e) => {
                        const updated = [...(settings.pricingFaqs || [])];
                        updated[idx] = { ...updated[idx], questionAr: e.target.value };
                        setSettings({ ...settings, pricingFaqs: updated });
                      }}
                      className="w-full font-bold text-xs text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-slate-50 px-1 py-0.5 rounded"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={faq.answerAr}
                    onChange={(e) => {
                      const updated = [...(settings.pricingFaqs || [])];
                      updated[idx] = { ...updated[idx], answerAr: e.target.value };
                      setSettings({ ...settings, pricingFaqs: updated });
                    }}
                    className="w-full text-xs text-slate-600 bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-slate-50 px-1 py-0.5 rounded leading-relaxed"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteFaq(faq.id)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="حذف السؤال"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-300 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتطبيق جميع الإعدادات فوراً</span>
          </button>
        </div>

      </form>

    </div>
  );
};

