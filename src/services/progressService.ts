export interface LessonCompletion { lessonId: string; userId?: string; xpEarned: number; completedAt: string; }

class ProgressService {
  private readonly storageKey = 'english30.lesson-progress';
  completeLesson(lessonId: string, xpEarned: number, userId?: string): LessonCompletion {
    const completion = { lessonId, userId, xpEarned, completedAt: new Date().toISOString() };
    if (typeof window !== 'undefined') {
      const current = this.getCompletions();
      window.localStorage.setItem(this.storageKey, JSON.stringify([...current.filter((item) => item.lessonId !== lessonId || item.userId !== userId), completion]));
    }
    return completion;
  }
  getCompletions(): LessonCompletion[] {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(window.localStorage.getItem(this.storageKey) || '[]') as LessonCompletion[]; }
    catch { return []; }
  }
}
export const progressService = new ProgressService();
