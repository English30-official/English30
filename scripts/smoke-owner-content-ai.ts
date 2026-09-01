import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_GEMINI_CONTENT_MODEL,
  generateValidatedOwnerContent,
  parseOwnerContentAIInput,
} from '../server/ownerContentAI';

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
  console.log('SKIPPED: GEMINI_API_KEY is not configured.');
  process.exit(0);
}

const configuredModel = process.env.GEMINI_CONTENT_MODEL?.trim() || DEFAULT_GEMINI_CONTENT_MODEL;
const model = /^[a-z0-9][a-z0-9._-]{2,80}$/i.test(configuredModel)
  ? configuredModel
  : DEFAULT_GEMINI_CONTENT_MODEL;
const input = parseOwnerContentAIInput({
  mode: 'block',
  level: 'A1',
  prompt: 'أنشئ مقدمة قصيرة جدًا لتدريب التحية باللغة الإنجليزية.',
  durationMinutes: 5,
  vocabularyCount: 0,
  exerciseCount: 0,
  desiredBlockEmphasis: [],
  blockType: 'rich_text',
});
const ai = new GoogleGenAI({ apiKey });

try {
  const result = await generateValidatedOwnerContent({
    generateContent: (request) => ai.models.generateContent(request),
  }, model, input);
  const draft = result.draft;
  console.log(JSON.stringify({
    success: true,
    model,
    attempts: result.attempts,
    generatedType: 'type' in draft ? draft.type : 'unknown',
  }));
} catch (error) {
  const safe = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown smoke-test error';
  console.error(`FAILED: ${safe}`);
  process.exitCode = 1;
}
