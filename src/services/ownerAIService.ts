import { AIGeneratedBlockDraft, AIGeneratedLessonDraft, BlockType, LevelCode } from '../types';
import { authenticatedJsonHeaders } from '../lib/api';

class OwnerAIService {
  public async askOwnerAI(prompt: string, taskType: 'lesson' | 'questions' | 'analytics' | 'general' = 'general', level: LevelCode = 'B1'): Promise<string> {
    const res = await fetch('/api/owner-ai', {
        method: 'POST',
        headers: await authenticatedJsonHeaders(),
        body: JSON.stringify({ prompt, taskType, level }),
      });

    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `Server returned ${res.status}`); }

      const data = await res.json();
    return data.reply || 'تمت معالجة الطلب بنجاح.';
  }

  public async generateContentDraft(input: { mode: 'lesson' | 'block' | 'rewrite'; prompt: string; level: LevelCode; blockType?: BlockType; existingContent?: AIGeneratedBlockDraft }): Promise<AIGeneratedLessonDraft | AIGeneratedBlockDraft> {
    const res = await fetch('/api/owner-content-ai', { method: 'POST', headers: await authenticatedJsonHeaders(), body: JSON.stringify(input) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`);
    return body.draft as AIGeneratedLessonDraft | AIGeneratedBlockDraft;
  }
}

export const ownerAIService = new OwnerAIService();
