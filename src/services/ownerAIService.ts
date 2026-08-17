import { LevelCode } from '../types';

class OwnerAIService {
  public async askOwnerAI(prompt: string, taskType: 'lesson' | 'questions' | 'analytics' | 'general' = 'general', level: LevelCode = 'B1'): Promise<string> {
    try {
      const res = await fetch('/api/owner-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, taskType, level }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      return data.reply || 'تمت معالجة الطلب بنجاح.';
    } catch (err) {
      console.error('Owner AI service error:', err);
      return 'تعذر الاتصال بخادم المساعد الذكي حالياً. يرجى المحاولة لاحقاً.';
    }
  }
}

export const ownerAIService = new OwnerAIService();
