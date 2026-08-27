import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGeminiOwnerContentRequest,
  classifyGeminiProviderError,
  DEFAULT_GEMINI_CONTENT_MODEL,
  findGeminiSchemaCompatibilityIssues,
  generateValidatedOwnerContent,
  OWNER_CONTENT_AI_SCHEMAS,
  OwnerContentAIError,
  parseOwnerContentAIInput,
  type GeminiStructuredGenerator,
} from '../server/ownerContentAI';

const payload = {
  text: 'Readable lesson content.',
  vocabularyItems: [],
  examples: [],
  questions: [],
};

const block = (type = 'rich_text') => ({ type, titleAr: 'مقدمة', titleEn: 'Introduction', payload });

const lesson = () => ({
  level: 'A1',
  titleAr: 'التعارف',
  titleEn: 'Introductions',
  summaryAr: 'يتعلم الطالب تقديم نفسه.',
  durationMinutes: 20,
  blocks: [
    block('rich_text'),
    { ...block('vocabulary'), titleAr: 'المفردات' },
    { ...block('exercise'), titleAr: 'تدريب', payload: { ...payload, questions: [{ prompt: 'Choose hello.', options: ['Hello', 'Goodbye'], correctAnswerIndex: 0, explanationAr: 'Hello تعني مرحبًا.' }] } },
  ],
});

const input = (mode: 'lesson' | 'block' | 'rewrite') => parseOwnerContentAIInput({
  mode,
  level: 'A1',
  prompt: 'أنشئ محتوى مناسبًا للتعارف.',
  topic: 'التعارف',
  durationMinutes: 20,
  vocabularyCount: 10,
  exerciseCount: 5,
  desiredBlockEmphasis: [],
  blockType: mode === 'lesson' ? undefined : 'rich_text',
  existingContent: mode === 'rewrite' ? block('rich_text') : undefined,
});

const generator = (...responses: string[]): GeminiStructuredGenerator & { calls: number } => {
  let calls = 0;
  return {
    get calls() { return calls; },
    async generateContent() { return { text: responses[calls++] ?? responses.at(-1) }; },
  };
};

test('accepts a valid full lesson response', async () => {
  const result = await generateValidatedOwnerContent(generator(JSON.stringify(lesson())), 'gemini-test', input('lesson'));
  assert.equal(result.attempts, 1);
  assert.equal('blocks' in result.draft && result.draft.blocks.length, 3);
});

test('Gemini 3.6 request config uses only supported responseJsonSchema keywords', () => {
  assert.equal(DEFAULT_GEMINI_CONTENT_MODEL, 'gemini-3.6-flash');
  for (const [mode, schema] of Object.entries(OWNER_CONTENT_AI_SCHEMAS)) {
    assert.deepEqual(findGeminiSchemaCompatibilityIssues(schema), [], `${mode} schema must be Gemini compatible`);
    const encoded = JSON.stringify(schema);
    assert.doesNotMatch(encoded, /"(?:minLength|maxLength)"/);
  }
  const request = buildGeminiOwnerContentRequest(DEFAULT_GEMINI_CONTENT_MODEL, input('lesson'));
  assert.equal(request.model, 'gemini-3.6-flash');
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.equal(request.config.responseJsonSchema, OWNER_CONTENT_AI_SCHEMAS.lesson);
  assert.equal(request.config.maxOutputTokens, 16_384);
});

test('compatibility check identifies the unsupported string limits that caused provider rejection', () => {
  const incompatible = { type: 'object', properties: { title: { type: 'string', minLength: 1, maxLength: 240 } } };
  assert.deepEqual(findGeminiSchemaCompatibilityIssues(incompatible).map((issue) => issue.keyword), ['minLength', 'maxLength']);
});

test('provider diagnostics preserve status and expose only a safe schema category', () => {
  const providerError = Object.assign(new Error('Invalid JSON payload: Unknown name "minLength" in responseJsonSchema. private prompt text'), { status: 400 });
  const safe = classifyGeminiProviderError(providerError);
  assert.deepEqual(safe, {
    status: 400,
    category: 'schema_rejected',
    message: 'Gemini rejected an unsupported or overly complex response schema.',
  });
  assert.doesNotMatch(safe.message, /private prompt text/);
});

test('generation wraps provider failures with safe diagnostics for endpoint logging', async () => {
  const providerError = Object.assign(new Error('Model models/gemini-2.5-flash is no longer available to new users. secret prompt'), { status: 404 });
  const rejectingGenerator: GeminiStructuredGenerator = { async generateContent() { throw providerError; } };
  await assert.rejects(
    generateValidatedOwnerContent(rejectingGenerator, DEFAULT_GEMINI_CONTENT_MODEL, input('block')),
    (error: unknown) => error instanceof OwnerContentAIError
      && error.code === 'provider_request_failed'
      && error.provider?.status === 404
      && error.provider.category === 'model_unavailable'
      && !error.provider.message.includes('secret prompt'),
  );
});

test('accepts a valid single block response', async () => {
  const result = await generateValidatedOwnerContent(generator(JSON.stringify(block())), 'gemini-test', input('block'));
  assert.equal('type' in result.draft && result.draft.type, 'rich_text');
});

test('accepts a valid rewrite response', async () => {
  const response = { block: { ...block(), titleAr: 'مقدمة محسنة' }, changeSummaryAr: 'تم تبسيط الشرح.' };
  const result = await generateValidatedOwnerContent(generator(JSON.stringify(response)), 'gemini-test', input('rewrite'));
  assert.equal('block' in result.draft && result.draft.block.titleAr, 'مقدمة محسنة');
});

test('rejects an unsupported block type', async () => {
  const invalid = JSON.stringify(block('raw_html'));
  await assert.rejects(
    generateValidatedOwnerContent(generator(invalid, invalid), 'gemini-test', input('block')),
    (error: unknown) => error instanceof OwnerContentAIError && error.code === 'invalid_block_type',
  );
});

test('rejects malformed model output after the repair attempt', async () => {
  const fake = generator('{bad json', 'still not json');
  await assert.rejects(
    generateValidatedOwnerContent(fake, 'gemini-test', input('lesson')),
    (error: unknown) => error instanceof OwnerContentAIError && error.code === 'malformed_model_json',
  );
  assert.equal(fake.calls, 2);
});

test('rejects excessive lesson block count', async () => {
  const invalid = lesson();
  invalid.blocks = Array.from({ length: 21 }, () => block());
  const encoded = JSON.stringify(invalid);
  await assert.rejects(
    generateValidatedOwnerContent(generator(encoded, encoded), 'gemini-test', input('lesson')),
    (error: unknown) => error instanceof OwnerContentAIError && error.code === 'invalid_block_count',
  );
});

test('server validation still enforces text limits omitted from Gemini schema', async () => {
  const invalid = { ...block(), titleAr: 'س'.repeat(241) };
  const encoded = JSON.stringify(invalid);
  await assert.rejects(
    generateValidatedOwnerContent(generator(encoded, encoded), 'gemini-test', input('block')),
    (error: unknown) => error instanceof OwnerContentAIError && error.code === 'invalid_block_title_ar',
  );
});

test('retries once with repair context and accepts the repaired result', async () => {
  const fake = generator('{bad json', JSON.stringify(lesson()));
  const result = await generateValidatedOwnerContent(fake, 'gemini-test', input('lesson'));
  assert.equal(result.attempts, 2);
  assert.equal(fake.calls, 2);
});
