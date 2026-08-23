import { PlatformSettings } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'English30',
  taglineAr: 'منصة تعليمية عربية متكاملة لتعلم الإنجليزية في 30 درساً تفاعلياً',
  heroHeadlineAr: 'تحدث الإنجليزية بطلاقة مع منهج 30 دقيقة اليومي',
  heroSubheadlineAr: 'المنصة الأولى المصممة خصيصاً للناطقين بالعربية مع المعلم الذكي والدروس التفاعلية من A1 إلى C2',
  registrationStatus: 'open', isRegistrationOpen: true, freeTrialLessonsCount: 3,
  contactWhatsApp: '', whatsappDefaultMessage: 'مرحباً، أود الاستفسار عن باقات ومنهج منصة English30',
  telegramChannelUrl: '', telegramBotUsername: '', youtubeUrl: '', xTwitterUrl: '', instagramUrl: '',
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
    const { data, error } = await getSupabaseClient().from('site_settings').select('key,value');
    if (error) throw error;
    const merged = { ...DEFAULT_PLATFORM_SETTINGS } as PlatformSettings;
    for (const row of data ?? []) Object.assign(merged, { [row.key]: row.value });
    this.settings = { ...merged, updatedAt: new Date().toISOString() };
    return { ...this.settings };
  }

  public getSettingsSync(): PlatformSettings { return { ...this.settings }; }

  public async updateSettings(newSettings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    if (!isSupabaseConfigured) { this.settings = { ...this.settings, ...newSettings, updatedAt: new Date().toISOString() }; this.notify(); return { ...this.settings }; }
    const entries = Object.entries(newSettings).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    if (entries.length) {
      const { error } = await getSupabaseClient().from('site_settings').upsert(entries, { onConflict: 'key' });
      if (error) throw error;
    }
    this.settings = { ...this.settings, ...newSettings, updatedAt: new Date().toISOString() };
    this.notify(); return { ...this.settings };
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    void this.getSettings().then(listener).catch(() => listener(this.getSettingsSync()));
    return () => this.listeners.delete(listener);
  }
  private notify() { const current = this.getSettingsSync(); this.listeners.forEach((listener) => listener(current)); }
}

export const settingsService = new SettingsService();
