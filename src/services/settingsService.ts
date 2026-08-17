import { PlatformSettings } from '../types';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'English30',
  taglineAr: 'منصة تعليمية عربية متكاملة لتعلم الإنجليزية في 30 درساً تفاعلياً',
  heroHeadlineAr: 'تحدث الإنجليزية بطلاقة مع منهج 30 دقيقة اليومي',
  heroSubheadlineAr: 'المنصة الأولى المصممة خصيصاً للناطقين بالعربية مع المعلم الذكي والدروس التفاعلية من A1 إلى C2',
  registrationStatus: 'open',
  isRegistrationOpen: true,
  freeTrialLessonsCount: 3,
  contactWhatsApp: '+966501234567',
  whatsappDefaultMessage: 'مرحباً، أود الاستفسار عن باقات ومنهج منصة English30',
  telegramChannelUrl: 'https://t.me/english30_channel',
  telegramBotUsername: '@English30_Bot',
  youtubeUrl: 'https://youtube.com/@english30',
  xTwitterUrl: 'https://x.com/english30',
  instagramUrl: 'https://instagram.com/english30',
  announcementBanner: {
    enabled: true,
    textAr: '🎉 عرض إطلاق منصة English30 متاح الآن بخصم 30% لجميع المشتركين الجدد!',
    badgeTextAr: 'عرض خاص',
    linkUrl: '#pricing',
  },
  pricingCurrency: 'ر.س',
  vatPercentage: 15,
  isVatInclusive: true,
  refundGuaranteeDays: 14,
  refundGuaranteeTitleAr: 'ضمان ذهبي 100% لاسترداد الأموال',
  refundGuaranteeDescAr: 'جرب باقتك لمدة 14 يوماً. إن لم تشعر بتحسن ملموس في لغتك وثقتك، سنعيد لك كامل المبلغ فورياً دون أي تعقيد.',
  monthlyPlanPrice: 99,
  yearlyPlanPrice: 69,
  lifetimePlanPrice: 599,
  pricingFaqs: [
    {
      id: 'faq-1',
      questionAr: 'هل المنصة مناسبة للشخص الذي لا يعرف أي شيء بالإنجليزية (مبتدئ تماماً)؟',
      answerAr: 'نعم تماماً! منهج English30 مصمم خصيصاً ويبدأ من مستوى A1 بالأبجدية والأرقام وقواعد الجملة الأساسية مع شرح عربي مبسط وتطبيق تدريجي يمنع الإحباط.',
      orderIndex: 1,
    },
    {
      id: 'faq-2',
      questionAr: 'كيف تختلف منصة English30 عن التطبيقات التقليدية؟',
      answerAr: 'تعتمد English30 على الشرح الموجه للناطقين بالعربية بالتحديد، مع مراعاة الاختلافات النحوية، بالإضافة لدمج المعلم الذكي AI والتركيز على الالتزام بـ 30 دقيقة يومياً.',
      orderIndex: 2,
    },
    {
      id: 'faq-3',
      questionAr: 'هل يمكنني إلغاء الاشتراك في أي وقت؟',
      answerAr: 'نعم بكل تأكيد وبدون أي التزامات معقدة. يمكنك إلغاء التجديد التلقائي بضغطة زر واحدة من إعدادات حسابك في أي وقت.',
      orderIndex: 3,
    },
    {
      id: 'faq-4',
      questionAr: 'هل توجد ضمانة لاسترداد الأموال؟',
      answerAr: 'نعم، نوفر ضماناً ذهبياً لاسترداد الأموال بنسبة 100% خلال 14 يوماً من تاريخ الاشتراك إذا لم تجد الاستفادة المرجوة.',
      orderIndex: 4,
    },
    {
      id: 'faq-5',
      questionAr: 'كيف يعمل المعلم الذكي AI مع الطلاب؟',
      answerAr: 'يعمل المعلم الذكي كمساعد متاح 24 ساعة. يصحح لك أي جملة تمليها عليه مع بيان السبب بالعربية، ويشرح لك المفردات، ويدربك على المحادثة الشفهية.',
      orderIndex: 5,
    },
    {
      id: 'faq-6',
      questionAr: 'ما هي طرق الدفع المتاحة في المنصة؟',
      answerAr: 'ندعم كافة وسائل الدفع الآمنة في المملكة والخليج: بطاقات مدى (Mada)، Apple Pay، البطاقات الائتمانية (Visa / MasterCard)، ومحفظة STC Pay.',
      orderIndex: 6,
    },
  ],
  updatedAt: new Date().toISOString(),
};

type SettingsListener = (settings: PlatformSettings) => void;

class SettingsService {
  private settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  private listeners: Set<SettingsListener> = new Set();

  public async getSettings(): Promise<PlatformSettings> {
    // In future phases, this will fetch from Supabase: `supabase.from('platform_settings').select('*')`
    return { ...this.settings };
  }

  public getSettingsSync(): PlatformSettings {
    return { ...this.settings };
  }

  public async updateSettings(newSettings: Partial<PlatformSettings>, actor = 'المالك'): Promise<PlatformSettings> {
    this.settings = {
      ...this.settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    this.notify();
    return { ...this.settings };
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.getSettingsSync());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getSettingsSync();
    this.listeners.forEach((listener) => listener(current));
  }
}

export const settingsService = new SettingsService();
