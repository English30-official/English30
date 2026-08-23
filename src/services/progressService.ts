import { LevelCode, StudentStats } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface LessonProgressUpdate {
  lessonId: string;
  isCompleted?: boolean;
  videoPositionSeconds?: number;
  watchedSeconds?: number;
  watchPercentage?: number;
}

class ProgressService {
  public async saveLessonProgress(update: LessonProgressUpdate): Promise<{ isCompleted: boolean; watchPercentage: number }> {
    if (!isSupabaseConfigured) return { isCompleted: false, watchPercentage: 0 };
    const { data, error } = await getSupabaseClient().rpc('record_lesson_progress', {
      p_lesson_id: update.lessonId,
      p_video_position_seconds: Math.max(0, Math.round(update.videoPositionSeconds ?? 0)),
    });
    if (error) throw error;
    const result = data as { isCompleted?: boolean; watchPercentage?: number } | null;
    return { isCompleted: result?.isCompleted === true, watchPercentage: Number(result?.watchPercentage || 0) };
  }

  public async getLessonProgress(lessonId: string) {
    if (!isSupabaseConfigured) return null;
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) return null;
    const { data, error } = await getSupabaseClient()
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  public async syncCourseProgress(courseId: string): Promise<void> {
    // Course totals are synchronized transactionally by record_lesson_progress.
    // Keep this method for API compatibility with existing callers.
    void courseId;
  }

  public async getStudentStats(): Promise<StudentStats> {
    const empty: StudentStats = {
      level: 'A1', xp: 0, streakDays: 0, wordsLearned: 0, totalWordsTarget: 1000,
      completedLessons: 0, totalLessons: 0, quizzesTaken: 0, averageScore: 0,
      studyTimeMinutesThisWeek: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'].map((day) => ({ day, minutes: 0 })),
      achievements: [],
    };
    if (!isSupabaseConfigured) return empty;
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return empty;
    const [profileResult, progressResult, quizResult, lessonsResult] = await Promise.all([
      client.from('profiles').select('level,xp_points,streak_days').eq('id', user.id).maybeSingle(),
      client.from('lesson_progress').select('is_completed,watched_seconds,last_watched_at').eq('user_id', user.id),
      client.from('quiz_attempts').select('score').eq('user_id', user.id),
      client.from('lessons').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    ]);
    const firstError = profileResult.error || progressResult.error || quizResult.error || lessonsResult.error;
    if (firstError) throw firstError;
    const completedLessons = (progressResult.data ?? []).filter((row) => row.is_completed).length;
    const quizScores = (quizResult.data ?? []).map((row) => Number(row.score || 0));
    const today = new Date().getDay();
    const weekly = empty.studyTimeMinutesThisWeek.map((item, index) => ({
      ...item,
      minutes: index === today
        ? Math.round((progressResult.data ?? []).reduce((total, row) => total + Number(row.watched_seconds || 0), 0) / 60)
        : 0,
    }));
    return {
      ...empty,
      level: (profileResult.data?.level as LevelCode) || 'A1',
      xp: Number(profileResult.data?.xp_points || 0),
      streakDays: Number(profileResult.data?.streak_days || 0),
      wordsLearned: completedLessons * 4,
      completedLessons,
      totalLessons: lessonsResult.count ?? 0,
      quizzesTaken: quizScores.length,
      averageScore: quizScores.length ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length) : 0,
      studyTimeMinutesThisWeek: weekly,
      achievements: [
        { id: 'first-lesson', titleAr: 'الخطوة الأولى', descAr: 'إكمال أول درس', icon: '🎯', unlocked: completedLessons > 0 },
        { id: 'first-quiz', titleAr: 'أول اختبار', descAr: 'إرسال أول اختبار رسمي', icon: '🏆', unlocked: quizScores.length > 0 },
      ],
    };
  }
}

export const progressService = new ProgressService();
