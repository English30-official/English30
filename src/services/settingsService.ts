import { PlatformSettings } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'English30',
  logoUrl: '', faviconUrl: '',
  taglineAr: 'منصة تعليمية عربية متكاملة لتعلم الإنجليزية في 30 درساً تفاعلياً',
  heroHeadlineAr: 'تحدث الإنجليزية بطلاقة مع منهج 30 دقيقة اليومي',
  heroSubheadlineAr: 'المنصة الأولى المصممة خصيصاً للناطقين بالعربية مع المعلم الذكي والدروس التفاعلية من A1 إلى C2',
  heroImageUrl: '', homepageImages: [], contactEmail: '',
  homepageBadgeAr: 'المنصة الأولى المخصصة كلياً للمتعلم العربي',
  heroPrimaryCtaLabelAr: 'جرب درساً تفاعلياً الآن', heroPrimaryCtaTarget: 'lesson',
  heroSecondaryCtaLabelAr: 'اختبار تحديد المستوى (5 دقائق)', heroSecondaryCtaTarget: 'placement-test',
  homepageStats: [
    { value: 'A1 ➔ C2', labelAr: 'منهج منظم متكامل', color: 'indigo' },
    { value: '30 دقيقة', labelAr: 'تعلم يومي مركز', color: 'indigo' },
    { value: '100%', labelAr: 'شرح عربي بدون تعقيد', color: 'emerald' },
    { value: 'AI Tutor', labelAr: 'مساعد ومصحح ذكي', color: 'orange' },
  ],
  homepageMarketingSections: [
    { titleAr: 'شرح عربي واضح', descriptionAr: 'شرح مبسط يربط قواعد ومفردات الإنجليزية باحتياجات المتعلم العربي.', icon: 'book' },
    { titleAr: 'تدريب تفاعلي', descriptionAr: 'تمارين واختبارات قصيرة تساعدك على تثبيت ما تعلمته خطوة بخطوة.', icon: 'target' },
    { titleAr: 'مسار منظم', descriptionAr: 'تدرج واضح من A1 إلى C2 مع متابعة التقدم والإنجاز.', icon: 'levels' },
    { titleAr: 'مساعد ذكي', descriptionAr: 'مساعدة فورية في الشرح والتصحيح والمحادثة عندما تكون الميزة مفعلة.', icon: 'sparkles' },
  ],
  registrationStatus: 'open', isRegistrationOpen: true, freeTrialLessonsCount: 3,
  contactWhatsApp: '', whatsappDefaultMessage: 'مرحباً، أود الاستفسار عن باقات ومنهج منصة English30',
  telegramChannelUrl: '', telegramBotUsername: '', youtubeUrl: '', xTwitterUrl: '', instagramUrl: '',
  footerContentAr: 'منصة عربية لتعلّم الإنجليزية بصورة منظمة وتفاعلية.',
  footerHighlightAr: '30 دقيقة يومياً تصنع تقدماً مستمراً',
  seoTitle: 'English30 | تعلّم الإنجليزية', seoDescription: 'منصة عربية متكاملة لتعلّم الإنجليزية.', openGraphImageUrl: '',
  maintenanceMode: { enabled: false, messageAr: 'المنصة تحت الصيانة المؤقتة. نعود قريباً.' },
  featureFlags: {},
  announcementBanner: { enabled: false, textAr: '', badgeTextAr: '', linkUrl: '' },
  pricingCurrency: 'ر.س', vatPercentage: 15, isVatInclusive: true, refundGuaranteeDays: 14,
  refundGuaranteeTitleAr: 'ضمان استرداد الأموال', refundGuaranteeDescAr: '', monthlyPlanPrice: 99, yearlyPlanPrice: 69, lifetimePlanPrice: 599,
  pricingFaqs: [], updatedAt: new Date(0).toISOString(),
};

type SettingsListener = (settings: PlatformSettings) => void;

class SettingsService {
  private settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  private listeners = new Set<SettingsListener>();

  public async getSettings(): Promise<PlatformSettings> {
    if (!isSupabaseConfigured) return { ...this.settings };
    const [{ data, error }, { data: flags, error: flagsError }] = await Promise.all([
      getSupabaseClient().from('site_settings').select('key,value'),
      getSupabaseClient().from('feature_flags').select('key,enabled'),
    ]);
    if (error) throw error;
    if (flagsError) throw flagsError;
    const merged = { ...DEFAULT_PLATFORM_SETTINGS } as PlatformSettings;
    for (const row of data ?? []) Object.assign(merged, { [row.key]: row.value });
    merged.featureFlags = Object.fromEntries((flags ?? []).map((flag) => [flag.key, flag.enabled]));
    this.settings = { ...merged, updatedAt: new Date().toISOString() };
    return { ...this.settings };
  }

  public getSettingsSync(): PlatformSettings { return { ...this.settings }; }

  public async updateSettings(newSettings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    if (!isSupabaseConfigured) { this.settings = { ...this.settings, ...newSettings, updatedAt: new Date().toISOString() }; this.notify(); return { ...this.settings }; }
    const { featureFlags, updatedAt: _updatedAt, ...settingsRows } = newSettings;
    const userId = (await getSupabaseClient().auth.getUser()).data.user?.id ?? null;
    const entries = Object.entries(settingsRows).map(([key, value]) => ({ key, value, updated_by: userId, updated_at: new Date().toISOString() }));
    if (entries.length) {
      const { error } = await getSupabaseClient().from('site_settings').upsert(entries, { onConflict: 'key' });
      if (error) throw error;
    }
    if (featureFlags) {
      const updates = Object.entries(featureFlags).map(([key, enabled]) =>
        getSupabaseClient().from('feature_flags').update({ enabled, updated_by: userId }).eq('key', key)
      );
      const results = await Promise.all(updates);
      const flagError = results.find((result) => result.error)?.error;
      if (flagError) throw flagError;
    }
    this.settings = { ...this.settings, ...newSettings, updatedAt: new Date().toISOString() };
    this.notify(); return { ...this.settings };
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    void this.getSettings().then(listener).catch(() => listener(this.getSettingsSync()));
    return () => { this.listeners.delete(listener); };
  }
  private notify() { const current = this.getSettingsSync(); this.listeners.forEach((listener) => listener(current)); }
}

export const settingsService = new SettingsService();
