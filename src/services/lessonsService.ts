import { Lesson, LessonBlock, ContentStatus, LevelCode } from '../types';
import { SAMPLE_LESSON } from '../data/mockData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

type LessonsListener = (lessons: Lesson[]) => void;

type LessonRow = {
  id: string; course_id: string; slug: string; title: string; title_ar: string | null; title_en: string | null;
  description: string | null; status: ContentStatus; sort_order: number; estimated_minutes: number | null;
  is_free: boolean; level: string | null; duration_minutes: number | null; summary_ar: string | null;
  arabic_explanation: string | null; video_url: string | null; video_duration: string | null; video_title_ar: string | null;
  unit_number: number; created_at: string; updated_at: string;
};

type ContentRow = { lesson_id: string; content: Partial<Lesson> & { blocks?: LessonBlock[] } };

const fallbackLessons = (): Lesson[] => [
  { ...SAMPLE_LESSON, id: 'lesson-1', courseId: 'course-1', unitNumber: 1, titleAr: 'التحيات والتعريف بالنفس والأساسيات', titleEn: 'Greetings & Self Introduction A1', level: 'A1', status: 'published' },
  { ...SAMPLE_LESSON, id: 'lesson-2', courseId: 'course-1', unitNumber: 2, titleAr: 'الطلب في المطعم والمقهى والأسعار', titleEn: 'Ordering Food & Drinks at a Cafe', level: 'A1', status: 'published' },
  { ...SAMPLE_LESSON, id: 'lesson-3', courseId: 'course-1', unitNumber: 3, titleAr: 'الأرقام والأوقات وأيام الأسبوع', titleEn: 'Telling Time, Numbers & Weekdays', level: 'A1', status: 'published' },
  { ...SAMPLE_LESSON, id: 'lesson-4', courseId: 'course-2', unitNumber: 1, titleAr: 'محادثة المطار وإنهاء إجراءات السفر', titleEn: 'Airport Check-in & Travel Conversations', level: 'A2', status: 'draft' },
  { ...SAMPLE_LESSON, id: 'lesson-5', courseId: 'course-3', unitNumber: 1, titleAr: 'الفرق الدقيق بين المضارع البسيط والمستمر', titleEn: 'Present Simple vs Present Continuous in Action', level: 'B1', status: 'draft' },
];

const toLesson = (row: LessonRow, content?: ContentRow['content']): Lesson => ({
  id: row.id,
  courseId: row.course_id,
  titleAr: row.title_ar ?? row.title,
  titleEn: row.title_en ?? row.title,
  level: (row.level as LevelCode) || 'A1',
  unitNumber: row.unit_number ?? row.sort_order + 1,
  durationMinutes: row.duration_minutes ?? row.estimated_minutes ?? 0,
  summaryAr: row.summary_ar ?? row.description ?? '',
  arabicExplanation: row.arabic_explanation ?? '',
  videoUrl: row.video_url ?? undefined,
  videoDuration: row.video_duration ?? undefined,
  videoTitleAr: row.video_title_ar ?? undefined,
  vocabList: content?.vocabList ?? [],
  sentencesList: content?.sentencesList ?? [],
  fillInBlankQuestions: content?.fillInBlankQuestions ?? [],
  grammarRules: content?.grammarRules ?? [],
  listeningPhrases: content?.listeningPhrases ?? [],
  quizQuestions: content?.quizQuestions ?? [],
  finalMiniTest: content?.finalMiniTest,
  blocks: content?.blocks ?? [],
  status: row.status,
});

class LessonsService {
  private lessons: Lesson[] = fallbackLessons();
  private listeners: Set<LessonsListener> = new Set();

  public async getLessons(courseId?: string, status?: ContentStatus): Promise<Lesson[]> {
    if (!isSupabaseConfigured) {
      let list = [...this.lessons]; if (courseId) list = list.filter((l) => l.courseId === courseId); if (status) list = list.filter((l) => l.status === status); return list;
    }
    let query = getSupabaseClient().from('lessons').select('*, lesson_content(content)').order('sort_order', { ascending: true });
    if (courseId) query = query.eq('course_id', courseId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    const lessons = (data as Array<LessonRow & { lesson_content?: ContentRow[] }>).map((r) => toLesson(r, r.lesson_content?.[0]?.content));
    this.lessons = lessons; this.notify(); return lessons;
  }

  public async getLessonById(id: string): Promise<Lesson | null> {
    if (!isSupabaseConfigured) return this.lessons.find((l) => l.id === id) || null;
    const { data, error } = await getSupabaseClient().from('lessons').select('*, lesson_content(content)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as LessonRow & { lesson_content?: ContentRow[] };
    return toLesson(row, row.lesson_content?.[0]?.content);
  }

  public async createLesson(data: Omit<Lesson, 'id'>): Promise<Lesson> {
    if (!isSupabaseConfigured) { const item = { ...data, id: `lesson-${Date.now()}` }; this.lessons = [item, ...this.lessons]; this.notify(); return item; }
    const row = {
      course_id: data.courseId, slug: `lesson-${Date.now()}`, title: data.titleEn || data.titleAr,
      title_ar: data.titleAr, title_en: data.titleEn, description: data.summaryAr, status: data.status || 'draft',
      sort_order: data.unitNumber ?? 1, estimated_minutes: data.durationMinutes, is_free: false, level: data.level,
      duration_minutes: data.durationMinutes, summary_ar: data.summaryAr, arabic_explanation: data.arabicExplanation,
      video_url: data.videoUrl ?? null, video_duration: data.videoDuration ?? null, video_title_ar: data.videoTitleAr ?? null,
      unit_number: data.unitNumber ?? 1,
    };
    const { data: created, error } = await getSupabaseClient().from('lessons').insert(row).select('*').single();
    if (error) throw error;
    const lesson = toLesson(created as LessonRow, data);
    await getSupabaseClient().from('lesson_content').upsert({ lesson_id: lesson.id, content: { ...data } }, { onConflict: 'lesson_id' });
    await this.getLessons(); return lesson;
  }

  public async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    if (!isSupabaseConfigured) { const idx = this.lessons.findIndex((l) => l.id === id); if (idx === -1) return null; this.lessons[idx] = { ...this.lessons[idx], ...data }; this.notify(); return this.lessons[idx]; }
    const row: Record<string, unknown> = {};
    if (data.courseId !== undefined) row.course_id = data.courseId;
    if (data.titleAr !== undefined) row.title_ar = data.titleAr;
    if (data.titleEn !== undefined) { row.title_en = data.titleEn; row.title = data.titleEn; }
    if (data.summaryAr !== undefined) { row.summary_ar = data.summaryAr; row.description = data.summaryAr; }
    if (data.status !== undefined) row.status = data.status;
    if (data.level !== undefined) row.level = data.level;
    if (data.unitNumber !== undefined) { row.unit_number = data.unitNumber; row.sort_order = data.unitNumber; }
    if (data.durationMinutes !== undefined) { row.duration_minutes = data.durationMinutes; row.estimated_minutes = data.durationMinutes; }
    if (data.arabicExplanation !== undefined) row.arabic_explanation = data.arabicExplanation;
    if (data.videoUrl !== undefined) row.video_url = data.videoUrl;
    if (data.videoDuration !== undefined) row.video_duration = data.videoDuration;
    if (data.videoTitleAr !== undefined) row.video_title_ar = data.videoTitleAr;
    const { data: updated, error } = await getSupabaseClient().from('lessons').update(row).eq('id', id).select('*').maybeSingle();
    if (error) throw error; if (!updated) return null;
    const existing = await this.getLessonById(id);
    const content = { ...(existing ?? {}), ...data, id };
    const contentFields = ['vocabList','sentencesList','fillInBlankQuestions','grammarRules','listeningPhrases','quizQuestions','finalMiniTest','blocks'];
    if (contentFields.some((k) => k in data)) await getSupabaseClient().from('lesson_content').upsert({ lesson_id: id, content }, { onConflict: 'lesson_id' });
    await this.getLessons(); return await this.getLessonById(id);
  }

  public async setLessonStatus(id: string, status: ContentStatus): Promise<Lesson | null> { return this.updateLesson(id, { status }); }

  public async deleteLesson(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) { const old = this.lessons.length; this.lessons = this.lessons.filter((l) => l.id !== id); if (old !== this.lessons.length) this.notify(); return old !== this.lessons.length; }
    const { error } = await getSupabaseClient().from('lessons').delete().eq('id', id); if (error) throw error; await this.getLessons(); return true;
  }

  public subscribe(listener: LessonsListener): () => void { this.listeners.add(listener); void this.getLessons().then(listener).catch(() => listener([...this.lessons])); return () => this.listeners.delete(listener); }
  private notify() { const list = [...this.lessons]; this.listeners.forEach((l) => l(list)); }
}

export const lessonsService = new LessonsService();
