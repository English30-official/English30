import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface LessonProgressUpdate {
  lessonId: string;
  isCompleted?: boolean;
  videoPositionSeconds?: number;
  watchedSeconds?: number;
  watchPercentage?: number;
}

class ProgressService {
  public async saveLessonProgress(update: LessonProgressUpdate): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      lesson_id: update.lessonId,
      is_completed: update.isCompleted ?? false,
      video_position_seconds: Math.max(0, Math.round(update.videoPositionSeconds ?? 0)),
      watched_seconds: Math.max(0, Math.round(update.watchedSeconds ?? 0)),
      watch_percentage: Math.min(100, Math.max(0, update.watchPercentage ?? 0)),
      ...(update.isCompleted ? { completed_at: new Date().toISOString() } : {}),
      last_watched_at: new Date().toISOString(),
    };

    const { error } = await getSupabaseClient()
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' });
    if (error) throw error;
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
    if (!isSupabaseConfigured) return;
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) return;

    const [{ count: totalLessons }, { count: completedLessons }] = await Promise.all([
      getSupabaseClient().from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', courseId).eq('status', 'published'),
      getSupabaseClient().from('lesson_progress').select('lesson_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true).in('lesson_id', (await getSupabaseClient().from('lessons').select('id').eq('course_id', courseId).eq('status', 'published')).data?.map((row) => row.id) ?? ['00000000-0000-0000-0000-000000000000']),
    ]);

    const total = totalLessons ?? 0;
    const completed = completedLessons ?? 0;
    const percentage = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    const { error } = await getSupabaseClient().from('course_progress').upsert({
      user_id: user.id,
      course_id: courseId,
      total_lessons: total,
      completed_lessons: completed,
      progress_percentage: percentage,
      completed_at: total > 0 && completed >= total ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,course_id' });
    if (error) throw error;
  }
}

export const progressService = new ProgressService();
