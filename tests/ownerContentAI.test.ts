import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateValidatedOwnerContent,
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

test('retries once with repair context and accepts the repaired result', async () => {
  const fake = generator('{bad json', JSON.stringify(lesson()));
  const result = await generateValidatedOwnerContent(fake, 'gemini-test', input('lesson'));
  assert.equal(result.attempts, 2);
  assert.equal(fake.calls, 2);
});
