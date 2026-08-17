export type LevelCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type UserRole = 'student' | 'admin' | 'owner';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type BlockType =
  | 'video'
  | 'vocabulary_set'
  | 'grammar_rule'
  | 'reading_passage'
  | 'listening_audio'
  | 'speaking_prompt'
  | 'interactive_exercise'
  | 'quiz_embed'
  | 'pdf_resource'
  | 'custom_markdown';

export type QuestionType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'listening_choice'
  | 'matching'
  | 'speaking_evaluation';

export type SubscriptionStatus = 'active' | 'expired' | 'canceled' | 'trial' | 'past_due';

export interface LevelInfo {
  code: LevelCode;
  titleAr: string;
  titleEn: string;
  badge: string;
  descriptionAr: string;
  targetVocab: number;
  estimatedHours: number;
  topicsAr: string[];
  color: string;
  bgLight: string;
}

export interface Course {
  id: string;
  slug?: string;
  titleAr: string;
  titleEn: string;
  level: LevelCode;
  category: 'beginner' | 'grammar' | 'vocabulary' | 'speaking' | 'listening' | 'reading' | 'writing' | 'business';
  categoryAr: string;
  descriptionAr: string;
  descriptionEn?: string;
  durationHours: number;
  lessonsCount: number;
  rating: number;
  studentsCount: number;
  image: string;
  color: string;
  progress?: number;
  isLocked?: boolean;
  isFree?: boolean;
  status?: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonBlock {
  id: string;
  lessonId: string;
  type: BlockType;
  titleAr: string;
  titleEn?: string;
  orderIndex: number;
  status: ContentStatus;
  isFreePreview?: boolean;
  payload: Record<string, any>;
}

export interface BankQuestionOption {
  key: string;
  textEn: string;
  textAr?: string;
}

export interface BankQuestion {
  id: string;
  type: QuestionType;
  level: LevelCode;
  category: 'Grammar' | 'Vocabulary' | 'Reading' | 'Listening' | 'Speaking' | string;
  promptEn: string;
  promptAr?: string;
  options: BankQuestionOption[];
  correctOptionKey: string;
  explanationAr: string;
  audioUrl?: string;
  tags?: string[];
  createdAt?: string;
}

export interface VocabItem {
  id: string;
  word: string;
  phonetic: string;
  arabic: string;
  category: string;
  level: LevelCode;
  partOfSpeech?: 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Phrase' | 'Preposition' | string;
  exampleEn: string;
  exampleAr: string;
  audioUrl?: string;
  sentenceAudioUrl?: string;
  mastered?: boolean;
}

export interface SentenceItem {
  id: string;
  en: string;
  ar: string;
  category?: string;
  level?: LevelCode;
  audioUrl?: string;
}

export interface FillInBlankQuestion {
  id: string;
  sentenceWithBlank: string;
  correctAnswer: string;
  options: string[];
  translationAr: string;
  explanationAr: string;
}

export interface GrammarRule {
  titleAr: string;
  explanationAr: string;
  formulaEn?: string;
  examples: {
    en: string;
    ar: string;
    noteAr?: string;
  }[];
  commonMistakeAr?: {
    wrongEn: string;
    rightEn: string;
    reasonAr: string;
  };
}

export interface QuizQuestion {
  id: string;
  questionAr: string;
  questionEn?: string;
  options: string[];
  correctAnswerIndex: number;
  explanationAr: string;
}

export interface LearningPack {
  id: string;
  topicKey: string;
  titleAr: string;
  titleEn: string;
  level: LevelCode;
  categoryAr: string;
  descriptionAr: string;
  summaryAr: string;
  arabicExplanation: string;
  videoUrl?: string;
  videoDuration?: string;
  videoTitleAr?: string;
  wordsCount: number;
  sentencesCount: number;
  words: VocabItem[];
  sentences: SentenceItem[];
  fillInBlankQuestions: FillInBlankQuestion[];
  quizQuestions: QuizQuestion[];
  finalMiniTest: {
    titleAr: string;
    descriptionAr: string;
    questions: QuizQuestion[];
  };
}

export interface Lesson {
  id: string;
  courseId: string;
  titleAr: string;
  titleEn: string;
  level: LevelCode;
  unitNumber: number;
  durationMinutes: number;
  summaryAr: string;
  arabicExplanation: string;
  videoUrl?: string;
  videoDuration?: string;
  videoTitleAr?: string;
  vocabList: VocabItem[];
  sentencesList?: SentenceItem[];
  fillInBlankQuestions?: FillInBlankQuestion[];
  grammarRules: GrammarRule[];
  listeningPhrases: {
    en: string;
    ar: string;
    speaker: string;
  }[];
  quizQuestions: QuizQuestion[];
  finalMiniTest?: {
    titleAr: string;
    descriptionAr: string;
    questions: QuizQuestion[];
  };
  isCompleted?: boolean;
  status?: ContentStatus;
  blocks?: LessonBlock[];
}

export interface PlacementQuestion {
  id: number;
  level: LevelCode;
  questionEn: string;
  options: string[];
  correctAnswerIndex: number;
  explanationAr: string;
  skill: 'Grammar' | 'Vocabulary' | 'Reading' | 'Listening';
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  telegramUsername?: string;
  role: UserRole;
  level: LevelCode;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlanName?: string;
  subscriptionExpiresAt?: string;
  xpPoints: number;
  streakDays: number;
  completedLessonsCount: number;
  registeredAt: string;
  lastActiveAt: string;
  isSuspended: boolean;
}

export interface StudentStats {
  level: LevelCode;
  xp: number;
  streakDays: number;
  wordsLearned: number;
  totalWordsTarget: number;
  completedLessons: number;
  totalLessons: number;
  quizzesTaken: number;
  averageScore: number;
  studyTimeMinutesThisWeek: { day: string; minutes: number }[];
  achievements: {
    id: string;
    titleAr: string;
    descAr: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: string;
  }[];
}

export interface PricingPlan {
  id: string;
  nameAr: string;
  nameEn: string;
  badgeAr?: string;
  priceMonthly: number;
  priceYearly: number;
  originalPriceMonthly?: number;
  originalPriceYearly?: number;
  descriptionAr: string;
  featuresAr: string[];
  isPopular?: boolean;
  buttonTextAr: string;
  isActive?: boolean;
  currency?: string;
}

export interface CouponItem {
  id: string;
  code: string;
  discountPercentage: number;
  maxRedemptions: number;
  timesRedeemed: number;
  expiresAt?: string;
  isActive: boolean;
}

export type PaymentMethod = 'mada' | 'apple_pay' | 'credit_card' | 'stc_pay';

export interface CheckoutCustomerInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
}

export interface CheckoutOrderData {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: PaymentMethod;
  couponCode?: string;
  customerInfo: CheckoutCustomerInfo;
}

export interface CheckoutResult {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  planNameAr?: string;
  amountPaidSAR?: number;
  discountAmountSAR?: number;
  messageAr: string;
  expiresAt?: string;
  receiptNumber?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  discountPercentage: number;
  messageAr: string;
  coupon?: CouponItem;
}

export interface PricingFaqItem {
  id: string;
  questionAr: string;
  answerAr: string;
  orderIndex: number;
}

export interface PlatformSettings {
  siteName: string;
  taglineAr: string;
  heroHeadlineAr: string;
  heroSubheadlineAr: string;
  registrationStatus: 'open' | 'waitlist' | 'closed';
  isRegistrationOpen: boolean;
  freeTrialLessonsCount: number;
  contactWhatsApp: string;
  whatsappDefaultMessage: string;
  telegramChannelUrl: string;
  telegramBotUsername: string;
  youtubeUrl: string;
  xTwitterUrl: string;
  instagramUrl: string;
  announcementBanner: {
    enabled: boolean;
    textAr: string;
    badgeTextAr?: string;
    linkUrl?: string;
  };
  pricingCurrency: string;
  vatPercentage: number;
  isVatInclusive: boolean;
  refundGuaranteeDays: number;
  refundGuaranteeTitleAr: string;
  refundGuaranteeDescAr: string;
  monthlyPlanPrice: number;
  yearlyPlanPrice: number;
  lifetimePlanPrice: number;
  pricingFaqs: PricingFaqItem[];
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityName: string;
  details: string;
  timestamp: string;
}

export interface AIGenerationDraft {
  id: string;
  targetType: 'lesson' | 'block' | 'question_set' | 'analysis';
  titleAr: string;
  prompt: string;
  level: LevelCode;
  content: any;
  status: 'draft' | 'applied' | 'discarded';
  createdAt: string;
}

export type ActiveTab =
  | 'home'
  | 'levels'
  | 'courses'
  | 'lesson'
  | 'placement-test'
  | 'dashboard'
  | 'vocab'
  | 'quizzes'
  | 'ai-tutor'
  | 'content-engine'
  | 'pricing';

export type OwnerTab =
  | 'overview'
  | 'courses'
  | 'lessons'
  | 'questions'
  | 'students'
  | 'subscriptions'
  | 'settings'
  | 'ai-assistant'
  | 'audit-logs';

export type AppViewMode = 'student' | 'owner';
export type AppMode = 'student' | 'owner';

