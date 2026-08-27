export type LevelCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type UserRole = 'student' | 'admin' | 'owner';
export type ContentStatus = 'draft' | 'preview' | 'published' | 'archived';
export type BlockType =
  | 'heading'
  | 'rich_text'
  | 'vocabulary'
  | 'example'
  | 'grammar'
  | 'note'
  | 'flashcard'
  | 'image'
  | 'audio'
  | 'video'
  | 'exercise'
  | 'quiz_reference'
  | 'downloadable_resource'
  // Legacy block identifiers remain readable during content migration.
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
  thumbnailAssetId?: string;
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
  mediaAssetId?: string;
  quizId?: string;
  archivedAt?: string;
}

export interface AIGeneratedBlockDraft {
  type: BlockType;
  titleAr: string;
  titleEn?: string;
  payload: Record<string, unknown>;
}

export interface AIGeneratedLessonDraft {
  level: LevelCode;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  durationMinutes: number;
  blocks: AIGeneratedBlockDraft[];
}

export interface AIGeneratedRewriteDraft {
  block: AIGeneratedBlockDraft;
  changeSummaryAr: string;
}

export interface OwnerContentAIRequest {
  mode: 'lesson' | 'block' | 'rewrite';
  level: LevelCode;
  prompt: string;
  topic?: string;
  learningObjective?: string;
  durationMinutes?: number;
  instructions?: string;
  desiredBlockEmphasis?: BlockType[];
  vocabularyCount?: number;
  exerciseCount?: number;
  blockType?: BlockType;
  existingContent?: AIGeneratedBlockDraft;
}

export interface OwnerContentAIResponse {
  draft: AIGeneratedLessonDraft | AIGeneratedBlockDraft | AIGeneratedRewriteDraft;
  draftId: string;
  requestId: string;
  provider: 'google';
  model: string;
  attempts: number;
}

export type PermissionCode =
  | 'content.manage'
  | 'course.publish'
  | 'quiz.manage'
  | 'media.manage'
  | 'students.manage'
  | 'subscriptions.manage'
  | 'payments.view'
  | 'settings.manage'
  | 'ai.generate'
  | 'certificates.manage'
  | 'audit.view'
  | 'roles.manage'
  | 'pages.manage'
  | 'features.manage'
  | 'diagnostics.view'
  | 'homepage.manage'
  | 'campaigns.manage'
  | 'design.manage';

export type HomepageSectionType =
  | 'hero' | 'announcement_bar' | 'promotional_banner' | 'image_carousel'
  | 'featured_course' | 'course_grid' | 'course_carousel' | 'benefits'
  | 'statistics' | 'testimonials' | 'video' | 'image_text_split'
  | 'text_content' | 'cta' | 'faq' | 'logos' | 'trust_badges' | 'countdown'
  | 'pricing_highlight' | 'placement_test' | 'certificate_promotion' | 'app_promo'
  | 'blog_teaser' | 'custom_safe';

export type VisualAnimationPreset =
  | 'none' | 'fade_in' | 'fade_up' | 'fade_down' | 'slide_left' | 'slide_right'
  | 'zoom_subtle' | 'staggered_cards' | 'soft_parallax' | 'auto_carousel'
  | 'marquee' | 'count_up' | 'gentle_float';

export interface HomepageSection {
  id: string;
  sectionType: HomepageSectionType;
  sortOrder: number;
  enabled: boolean;
  status: ContentStatus;
  config: Record<string, unknown>;
  versionId?: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface HomepageSectionVersion {
  id: string;
  sectionId: string;
  versionNumber: number;
  status: ContentStatus;
  config: Record<string, unknown>;
  createdAt: string;
  createdBy?: string;
}

export type CampaignPlacement =
  | 'announcement_bar' | 'homepage_hero' | 'homepage_banner' | 'homepage_midpage'
  | 'promotional_carousel' | 'pricing' | 'course' | 'auth' | 'popup' | 'sticky_mobile';

export type CampaignPreset =
  | 'elegant_academic' | 'bold_promotion' | 'minimal' | 'premium' | 'saudi_national_day'
  | 'ramadan' | 'black_friday' | 'course_launch' | 'clean_modern' | 'youthful_learning'
  | 'dark_premium' | 'light_minimal';

export interface Campaign {
  id: string;
  internalName: string;
  publicTitle: string;
  subtitle: string;
  description: string;
  status: ContentStatus;
  isActive: boolean;
  priority: number;
  startAt: string;
  endAt: string;
  timezone: string;
  preset: CampaignPreset;
  config: Record<string, unknown>;
  locations: CampaignPlacement[];
  publishedAt?: string;
  archivedAt?: string;
  updatedAt?: string;
}

export interface PermissionDefinition {
  code: PermissionCode;
  category: string;
  nameAr: string;
  descriptionAr?: string;
}

export interface StaffPermissionAssignment {
  userId: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  permissions: Partial<Record<PermissionCode, boolean>>;
  isActive?: boolean;
  isSuspended?: boolean;
  lastActiveAt?: string;
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
  status?: ContentStatus;
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

export interface VisualThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceStyle: 'plain' | 'soft' | 'glass';
  headingStyle: 'modern' | 'classic' | 'compact';
  buttonStyle: 'rounded' | 'soft' | 'pill';
  radiusPreset: 'small' | 'medium' | 'large';
  shadowPreset: 'none' | 'soft' | 'elevated';
  spacingPreset: 'compact' | 'comfortable' | 'airy';
  maxWidthPreset: 'narrow' | 'standard' | 'wide';
  fontFamily: 'cairo' | 'system';
}

export interface PlatformSettings {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  taglineAr: string;
  heroHeadlineAr: string;
  heroSubheadlineAr: string;
  heroImageUrl: string;
  homepageImages: string[];
  homepageBadgeAr: string;
  heroPrimaryCtaLabelAr: string;
  heroPrimaryCtaTarget: string;
  heroSecondaryCtaLabelAr: string;
  heroSecondaryCtaTarget: string;
  homepageStats: Array<{ value: string; labelAr: string; color?: string }>;
  homepageMarketingSections: Array<{ titleAr: string; descriptionAr: string; icon?: string }>;
  contactEmail: string;
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
  footerContentAr: string;
  footerHighlightAr: string;
  seoTitle: string;
  seoDescription: string;
  openGraphImageUrl: string;
  maintenanceMode: { enabled: boolean; messageAr: string };
  featureFlags: Record<string, boolean>;
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
  theme: VisualThemeSettings;
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
  entityId?: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  pageType: 'static' | 'legal';
  titleAr: string;
  titleEn?: string;
  body: Array<Record<string, unknown>>;
  status: ContentStatus;
  seoTitle?: string;
  seoDescription?: string;
  openGraphAssetId?: string;
  updatedAt: string;
}

export interface ContentVersion {
  id: string;
  entityType: string;
  entityId: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  changeAction: string;
  changedBy?: string;
  changedByName?: string;
  createdAt: string;
}

export interface CertificateSettings {
  courseId: string;
  enabled: boolean;
  certificateTitle: string;
  minimumFinalScore: number;
  requireAllLessons: boolean;
  requireFinalQuiz: boolean;
  templateSettings: Record<string, unknown>;
  logoAssetId?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  signatureAssetId?: string;
  wording?: string;
}

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  userId: string;
  courseId: string;
  status: 'active' | 'revoked' | 'superseded';
  studentName: string;
  courseTitle: string;
  courseLevel?: string;
  certificateTitle: string;
  wording?: string;
  template: Record<string, unknown>;
  completion: Record<string, unknown>;
  issuedAt: string;
  revokedAt?: string;
  revocationReason?: string;
}

export interface CertificateVerification {
  valid: boolean;
  status: 'active' | 'revoked' | 'superseded';
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  courseLevel?: string;
  issuedAt: string;
  revokedAt?: string;
}

export interface DiagnosticCheck {
  key: string;
  label: string;
  status: 'healthy' | 'configured' | 'not_configured' | 'degraded';
  detail: string;
}

export interface AIGenerationDraft {
  id: string;
  targetType: 'lesson' | 'block' | 'question_set' | 'analysis';
  titleAr: string;
  prompt: string;
  level: LevelCode;
  content: any;
  status: 'draft' | 'applied' | 'discarded';
  lifecycleStatus: ContentStatus;
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
  | 'certificates'
  | 'pricing';

export type OwnerTab =
  | 'overview'
  | 'courses'
  | 'lessons'
  | 'media'
  | 'questions'
  | 'students'
  | 'subscriptions'
  | 'settings'
  | 'ai-assistant'
  | 'ai-drafts'
  | 'audit-logs'
  | 'lesson-builder'
  | 'pages'
  | 'feature-flags'
  | 'permissions'
  | 'versions'
  | 'certificates'
  | 'diagnostics'
  | 'import-export'
  | 'homepage'
  | 'campaigns';

export type AppViewMode = 'student' | 'owner';
export type AppMode = 'student' | 'owner';
