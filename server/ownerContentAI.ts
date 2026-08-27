import type { AIGeneratedBlockDraft, AIGeneratedLessonDraft, BlockType, LevelCode } from '../src/types';

export const OWNER_AI_BLOCK_TYPES = [
  'heading', 'rich_text', 'vocabulary', 'example', 'grammar', 'note', 'flashcard',
  'image', 'audio', 'video', 'exercise', 'quiz_reference', 'downloadable_resource',
] as const satisfies readonly BlockType[];

export const OWNER_AI_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const satisfies readonly LevelCode[];

export type OwnerContentAIMode = 'lesson' | 'block' | 'rewrite';

export interface OwnerContentAIInput {
  mode: OwnerContentAIMode;
  level: LevelCode;
  prompt: string;
  topic?: string;
  learningObjective?: string;
  durationMinutes: number;
  instructions?: string;
  desiredBlockEmphasis: BlockType[];
  vocabularyCount: number;
  exerciseCount: number;
  blockType?: BlockType;
  existingContent?: AIGeneratedBlockDraft;
}

export interface AIGeneratedRewriteDraft {
  block: AIGeneratedBlockDraft;
  changeSummaryAr: string;
}

export type OwnerContentAIDraft = AIGeneratedLessonDraft | AIGeneratedBlockDraft | AIGeneratedRewriteDraft;

export interface OwnerContentAIGenerationResult {
  draft: OwnerContentAIDraft;
  attempts: number;
}

type JsonSchema = Record<string, unknown>;
type JsonObject = Record<string, unknown>;

const BLOCK_SET = new Set<string>(OWNER_AI_BLOCK_TYPES);
const LEVEL_SET = new Set<string>(OWNER_AI_LEVELS);
const FORBIDDEN_KEY = /^(?:html|rawhtml|css|js|javascript|script|style|onclick|onload|onerror|srcdoc)$/i;
const FORBIDDEN_TEXT = /<\/?[a-z][^>]*>|javascript\s*:|data\s*:\s*text\/html|\bon(?:click|load|error)\s*=|<style|<script/i;
const URL_TEXT = /(?:https?:\/\/|www\.)/i;
const MAX_BLOCKS = 20;
const MAX_PAYLOAD_BYTES = 30_000;
const MAX_DRAFT_BYTES = 180_000;

const stringSchema = (description: string, maxLength: number, minLength = 0): JsonSchema => ({
  type: 'string', description, minLength, maxLength,
});

const vocabularyItemSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    term: stringSchema('English vocabulary term or short phrase.', 120, 1),
    translationAr: stringSchema('Concise Arabic meaning.', 240, 1),
    exampleEn: stringSchema('Natural English example at the requested CEFR level.', 500, 1),
    exampleAr: stringSchema('Accurate Arabic translation of the example.', 500, 1),
  },
  required: ['term', 'translationAr', 'exampleEn', 'exampleAr'],
};

const exampleSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    english: stringSchema('Natural English example.', 600, 1),
    arabic: stringSchema('Arabic translation or concise explanation.', 600, 1),
  },
  required: ['english', 'arabic'],
};

const questionSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    prompt: stringSchema('Question that is answerable from lesson content.', 800, 1),
    options: {
      type: 'array', minItems: 2, maxItems: 5,
      items: stringSchema('One plausible answer option.', 400, 1),
    },
    correctAnswerIndex: {
      type: 'integer', minimum: 0, maximum: 4,
      description: 'Zero-based index of the correct option.',
    },
    explanationAr: stringSchema('Concise Arabic explanation of the answer.', 800, 1),
  },
  required: ['prompt', 'options', 'correctAnswerIndex', 'explanationAr'],
};

const payloadSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: stringSchema('Complete readable block content. Do not use HTML or Markdown links.', 12_000, 1),
    vocabularyItems: { type: 'array', maxItems: 30, items: vocabularyItemSchema },
    examples: { type: 'array', maxItems: 20, items: exampleSchema },
    questions: { type: 'array', maxItems: 20, items: questionSchema },
  },
  required: ['text', 'vocabularyItems', 'examples', 'questions'],
};

const blockSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: [...OWNER_AI_BLOCK_TYPES], description: 'Existing English30 lesson block type.' },
    titleAr: stringSchema('Clear Arabic block title.', 240, 1),
    titleEn: stringSchema('Concise English block title; use an empty string only when unnecessary.', 240),
    payload: payloadSchema,
  },
  required: ['type', 'titleAr', 'titleEn', 'payload'],
};

export const OWNER_CONTENT_AI_SCHEMAS: Record<OwnerContentAIMode, JsonSchema> = {
  lesson: {
    type: 'object',
    additionalProperties: false,
    properties: {
      level: { type: 'string', enum: [...OWNER_AI_LEVELS] },
      titleAr: stringSchema('Arabic lesson title.', 240, 1),
      titleEn: stringSchema('English lesson title.', 240, 1),
      summaryAr: stringSchema('Concise Arabic learning summary.', 2_000, 1),
      durationMinutes: { type: 'integer', minimum: 5, maximum: 180 },
      blocks: { type: 'array', minItems: 1, maxItems: MAX_BLOCKS, items: blockSchema },
    },
    required: ['level', 'titleAr', 'titleEn', 'summaryAr', 'durationMinutes', 'blocks'],
  },
  block: blockSchema,
  rewrite: {
    type: 'object',
    additionalProperties: false,
    properties: {
      block: blockSchema,
      changeSummaryAr: stringSchema('Short Arabic summary of the improvements.', 1_000, 1),
    },
    required: ['block', 'changeSummaryAr'],
  },
};

export class OwnerContentAIError extends Error {
  constructor(public readonly code: string, message = code, public readonly retryableValidation = false) {
    super(message);
    this.name = 'OwnerContentAIError';
  }
}

const isRecord = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const assertExactKeys = (value: JsonObject, allowed: readonly string[], code: string) => {
  const allowedSet = new Set(allowed);
  if (Object.keys(value).some((key) => !allowedSet.has(key) || FORBIDDEN_KEY.test(key))) {
    throw new OwnerContentAIError(code, code, true);
  }
};

const cleanString = (value: unknown, code: string, maxLength: number, required = true): string => {
  if (typeof value !== 'string') throw new OwnerContentAIError(code, code, true);
  const cleaned = value.trim();
  if ((required && !cleaned) || cleaned.length > maxLength || FORBIDDEN_TEXT.test(cleaned) || URL_TEXT.test(cleaned)) {
    throw new OwnerContentAIError(code, code, true);
  }
  return cleaned;
};

const assertSafeJson = (value: unknown, code: string, depth = 0): void => {
  if (depth > 8) throw new OwnerContentAIError(code, code, true);
  if (typeof value === 'string') {
    if (FORBIDDEN_TEXT.test(value) || URL_TEXT.test(value)) throw new OwnerContentAIError(code, code, true);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertSafeJson(item, code, depth + 1);
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_KEY.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) {
        throw new OwnerContentAIError(code, code, true);
      }
      assertSafeJson(child, code, depth + 1);
    }
  }
};

const validateVocabularyItems = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 30) throw new OwnerContentAIError('invalid_vocabulary_items', undefined, true);
  return value.map((item) => {
    if (!isRecord(item)) throw new OwnerContentAIError('invalid_vocabulary_item', undefined, true);
    assertExactKeys(item, ['term', 'translationAr', 'exampleEn', 'exampleAr'], 'invalid_vocabulary_item_fields');
    return {
      term: cleanString(item.term, 'invalid_vocabulary_term', 120),
      translationAr: cleanString(item.translationAr, 'invalid_vocabulary_translation', 240),
      exampleEn: cleanString(item.exampleEn, 'invalid_vocabulary_example', 500),
      exampleAr: cleanString(item.exampleAr, 'invalid_vocabulary_example_translation', 500),
    };
  });
};

const validateExamples = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 20) throw new OwnerContentAIError('invalid_examples', undefined, true);
  return value.map((item) => {
    if (!isRecord(item)) throw new OwnerContentAIError('invalid_example', undefined, true);
    assertExactKeys(item, ['english', 'arabic'], 'invalid_example_fields');
    return {
      english: cleanString(item.english, 'invalid_example_english', 600),
      arabic: cleanString(item.arabic, 'invalid_example_arabic', 600),
    };
  });
};

const validateQuestions = (value: unknown) => {
  if (!Array.isArray(value) || value.length > 20) throw new OwnerContentAIError('invalid_questions', undefined, true);
  return value.map((item) => {
    if (!isRecord(item)) throw new OwnerContentAIError('invalid_question', undefined, true);
    assertExactKeys(item, ['prompt', 'options', 'correctAnswerIndex', 'explanationAr'], 'invalid_question_fields');
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 5) {
      throw new OwnerContentAIError('invalid_question_options', undefined, true);
    }
    const options = item.options.map((option) => cleanString(option, 'invalid_question_option', 400));
    if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) {
      throw new OwnerContentAIError('duplicate_question_options', undefined, true);
    }
    const correctAnswerIndex = Number(item.correctAnswerIndex);
    if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
      throw new OwnerContentAIError('inconsistent_correct_answer', undefined, true);
    }
    return {
      prompt: cleanString(item.prompt, 'invalid_question_prompt', 800),
      options,
      correctAnswerIndex,
      explanationAr: cleanString(item.explanationAr, 'invalid_question_explanation', 800),
    };
  });
};

export const validateGeneratedBlock = (value: unknown, expectedType?: BlockType): AIGeneratedBlockDraft => {
  if (!isRecord(value)) throw new OwnerContentAIError('invalid_block_object', undefined, true);
  assertExactKeys(value, ['type', 'titleAr', 'titleEn', 'payload'], 'invalid_block_fields');
  if (typeof value.type !== 'string' || !BLOCK_SET.has(value.type) || (expectedType && value.type !== expectedType)) {
    throw new OwnerContentAIError('invalid_block_type', undefined, true);
  }
  if (!isRecord(value.payload)) throw new OwnerContentAIError('invalid_block_payload', undefined, true);
  assertExactKeys(value.payload, ['text', 'vocabularyItems', 'examples', 'questions'], 'invalid_payload_fields');
  const payload = {
    text: cleanString(value.payload.text, 'invalid_payload_text', 12_000),
    vocabularyItems: validateVocabularyItems(value.payload.vocabularyItems),
    examples: validateExamples(value.payload.examples),
    questions: validateQuestions(value.payload.questions),
  };
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new OwnerContentAIError('payload_too_large', undefined, true);
  }
  return {
    type: value.type as BlockType,
    titleAr: cleanString(value.titleAr, 'invalid_block_title_ar', 240),
    titleEn: cleanString(value.titleEn, 'invalid_block_title_en', 240, false),
    payload,
  };
};

export const validateOwnerContentAIDraft = (
  mode: OwnerContentAIMode,
  value: unknown,
  level: LevelCode,
  expectedType?: BlockType,
): OwnerContentAIDraft => {
  assertSafeJson(value, 'unsafe_generated_content');
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_DRAFT_BYTES) {
    throw new OwnerContentAIError('draft_too_large', undefined, true);
  }
  if (mode === 'block') return validateGeneratedBlock(value, expectedType);
  if (mode === 'rewrite') {
    if (!isRecord(value)) throw new OwnerContentAIError('invalid_rewrite_object', undefined, true);
    assertExactKeys(value, ['block', 'changeSummaryAr'], 'invalid_rewrite_fields');
    return {
      block: validateGeneratedBlock(value.block, expectedType),
      changeSummaryAr: cleanString(value.changeSummaryAr, 'invalid_rewrite_summary', 1_000),
    };
  }
  if (!isRecord(value)) throw new OwnerContentAIError('invalid_lesson_object', undefined, true);
  assertExactKeys(value, ['level', 'titleAr', 'titleEn', 'summaryAr', 'durationMinutes', 'blocks'], 'invalid_lesson_fields');
  if (value.level !== level) throw new OwnerContentAIError('lesson_level_mismatch', undefined, true);
  if (!Array.isArray(value.blocks) || value.blocks.length < 1 || value.blocks.length > MAX_BLOCKS) {
    throw new OwnerContentAIError('invalid_block_count', undefined, true);
  }
  const durationMinutes = Number(value.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
    throw new OwnerContentAIError('invalid_lesson_duration', undefined, true);
  }
  return {
    level,
    titleAr: cleanString(value.titleAr, 'invalid_lesson_title_ar', 240),
    titleEn: cleanString(value.titleEn, 'invalid_lesson_title_en', 240),
    summaryAr: cleanString(value.summaryAr, 'invalid_lesson_summary', 2_000),
    durationMinutes,
    blocks: value.blocks.map((block) => validateGeneratedBlock(block)),
  };
};

const optionalText = (value: unknown, maxLength: number): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return cleanString(value, 'invalid_request_text', maxLength);
};

const integerInRange = (value: unknown, fallback: number, min: number, max: number): number => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new OwnerContentAIError('invalid_request_number');
  return number;
};

export const parseOwnerContentAIInput = (value: unknown): OwnerContentAIInput => {
  if (!isRecord(value) || !['lesson', 'block', 'rewrite'].includes(String(value.mode))) {
    throw new OwnerContentAIError('invalid_mode');
  }
  const mode = value.mode as OwnerContentAIMode;
  if (typeof value.level !== 'string' || !LEVEL_SET.has(value.level)) throw new OwnerContentAIError('invalid_level');
  const level = value.level as LevelCode;
  const topic = optionalText(value.topic, 300);
  const learningObjective = optionalText(value.learningObjective, 1_000);
  const instructions = optionalText(value.instructions, 2_000);
  const rawPrompt = typeof value.prompt === 'string' ? value.prompt.trim() : '';
  const prompt = rawPrompt || (mode === 'lesson' && topic ? `أنشئ درسًا عن ${topic}.` : '');
  if (prompt.length < 5 || prompt.length > 4_000 || FORBIDDEN_TEXT.test(prompt)) throw new OwnerContentAIError('invalid_prompt');
  const emphasis = value.desiredBlockEmphasis ?? [];
  if (!Array.isArray(emphasis) || emphasis.length > 8 || emphasis.some((item) => typeof item !== 'string' || !BLOCK_SET.has(item))) {
    throw new OwnerContentAIError('invalid_block_emphasis');
  }
  const desiredBlockEmphasis = [...new Set(emphasis)] as BlockType[];
  let blockType: BlockType | undefined;
  if (mode !== 'lesson') {
    if (typeof value.blockType !== 'string' || !BLOCK_SET.has(value.blockType)) throw new OwnerContentAIError('invalid_block_type');
    blockType = value.blockType as BlockType;
  }
  let existingContent: AIGeneratedBlockDraft | undefined;
  if (mode === 'rewrite') {
    if (!isRecord(value.existingContent) || value.existingContent.type !== blockType || !isRecord(value.existingContent.payload)) {
      throw new OwnerContentAIError('invalid_existing_content');
    }
    assertSafeJson(value.existingContent, 'unsafe_existing_content');
    if (Buffer.byteLength(JSON.stringify(value.existingContent), 'utf8') > 40_000) throw new OwnerContentAIError('existing_content_too_large');
    existingContent = {
      type: blockType!,
      titleAr: cleanString(value.existingContent.titleAr, 'invalid_existing_title', 240),
      titleEn: typeof value.existingContent.titleEn === 'string' ? value.existingContent.titleEn.slice(0, 240) : '',
      payload: structuredClone(value.existingContent.payload),
    };
  }
  return {
    mode,
    level,
    prompt,
    topic,
    learningObjective,
    durationMinutes: integerInRange(value.durationMinutes, 20, 5, 180),
    instructions,
    desiredBlockEmphasis,
    vocabularyCount: integerInRange(value.vocabularyCount, 10, 0, 30),
    exerciseCount: integerInRange(value.exerciseCount, 5, 0, 20),
    blockType,
    existingContent,
  };
};

export const buildOwnerContentPromptSummary = (input: OwnerContentAIInput): string => {
  const parts = [
    `${input.mode}:${input.level}`,
    input.topic ? `الموضوع: ${input.topic}` : undefined,
    input.learningObjective ? `الهدف: ${input.learningObjective}` : undefined,
    `المدة: ${input.durationMinutes} دقيقة`,
    input.prompt,
  ].filter(Boolean);
  return parts.join(' | ').slice(0, 1_000);
};

const SYSTEM_INSTRUCTION = `أنت خبير تصميم مناهج اللغة الإنجليزية لمنصة English30 الموجهة للناطقين بالعربية.
التزم بدقة بمستوى CEFR المطلوب. استخدم شرحًا عربيًا موجزًا عند فائدته، وأمثلة إنجليزية طبيعية ومتنوعة.
لا تختلق حقائق، واجعل المحتوى عامًا ومحايدًا عمريًا ما لم يطلب المالك غير ذلك.
تجنب التكرار، واجعل كل تمرين قابلًا للإجابة من محتوى الدرس، وكل إجابة اختبار متسقة مع خياراتها.
استخدم فقط أنواع كتل English30 المحددة في schema. لا تستخدم HTML أو CSS أو JavaScript أو روابط أو حقول إضافية.
ضع داخل payload.text نسخة مقروءة كاملة من المحتوى، واستخدم المصفوفات المنظمة للمفردات والأمثلة والأسئلة عند ملاءمتها.
لا يلزم أن يحتوي كل درس على كل نوع كتلة، لكن يجب أن يكون التسلسل التعليمي منطقيًا ومناسبًا للمدة.`;

const buildGenerationPrompt = (input: OwnerContentAIInput, repairCode?: string): string => {
  const lines = [
    `نوع الطلب: ${input.mode}`,
    `مستوى CEFR: ${input.level}`,
    input.topic ? `موضوع الدرس: ${input.topic}` : undefined,
    input.learningObjective ? `الهدف التعليمي: ${input.learningObjective}` : undefined,
    `المدة التقريبية: ${input.durationMinutes} دقيقة`,
    `عدد المفردات المرغوب تقريبًا: ${input.vocabularyCount}`,
    `عدد الأسئلة/التمارين المرغوب تقريبًا: ${input.exerciseCount}`,
    input.desiredBlockEmphasis.length ? `التركيز المرغوب: ${input.desiredBlockEmphasis.join(', ')}` : undefined,
    input.blockType ? `نوع الكتلة المطلوب حصريًا: ${input.blockType}` : undefined,
    input.instructions ? `تعليمات إضافية: ${input.instructions}` : undefined,
    `طلب المالك: ${input.prompt}`,
    input.existingContent ? `الكتلة الحالية المراد تحسينها: ${JSON.stringify(input.existingContent)}` : undefined,
    repairCode ? `هذه محاولة إصلاح. فشلت المحاولة السابقة برمز تحقق ${repairCode}. أنشئ نتيجة جديدة بالكامل مطابقة للـschema دون شرح إضافي.` : undefined,
  ];
  return lines.filter(Boolean).join('\n');
};

export interface GeminiStructuredGenerator {
  generateContent(request: {
    model: string;
    contents: Array<{ role: 'user'; parts: Array<{ text: string }> }>;
    config: {
      responseMimeType: 'application/json';
      responseJsonSchema: JsonSchema;
      systemInstruction: string;
      maxOutputTokens: number;
      temperature: number;
    };
  }): Promise<{ text?: string }>;
}

export const generateValidatedOwnerContent = async (
  generator: GeminiStructuredGenerator,
  model: string,
  input: OwnerContentAIInput,
): Promise<OwnerContentAIGenerationResult> => {
  let repairCode: string | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let response: { text?: string };
    try {
      response = await generator.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: buildGenerationPrompt(input, repairCode) }] }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: OWNER_CONTENT_AI_SCHEMAS[input.mode],
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: input.mode === 'lesson' ? 16_384 : 6_144,
          temperature: 0.4,
        },
      });
    } catch (error) {
      throw new OwnerContentAIError('provider_request_failed', error instanceof Error ? error.name : 'provider_request_failed');
    }
    try {
      if (!response.text) throw new OwnerContentAIError('empty_model_response', undefined, true);
      const parsed = JSON.parse(response.text) as unknown;
      return {
        draft: validateOwnerContentAIDraft(input.mode, parsed, input.level, input.blockType),
        attempts: attempt,
      };
    } catch (error) {
      const validationError = error instanceof OwnerContentAIError
        ? error
        : new OwnerContentAIError('malformed_model_json', undefined, true);
      if (!validationError.retryableValidation || attempt === 2) throw validationError;
      repairCode = validationError.code;
    }
  }
  throw new OwnerContentAIError('validation_retry_exhausted');
};
