import { Course, ContentStatus, LevelCode } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { mediaService } from './mediaService';

type CoursesListener = (courses: Course[]) => void;

type CourseRow = {
  id: string; slug: string; title: string; title_ar: string | null; title_en: string | null;
  description: string | null; description_en: string | null; thumbnail_url: string | null;
  image: string | null; color: string | null; status: ContentStatus; sort_order: number;
  is_featured: boolean; is_free: boolean; created_by: string | null; created_at: string; updated_at: string;
  level: string | null; category: string | null; category_ar: string | null; duration_hours: number | null;
  lessons_count: number; rating: number; students_count: number;
  thumbnail_asset_id: string | null;
  media_assets?: { bucket_id:string; storage_path:string; file_name:string; mime_type:string|null } | null;
};

const toCourse = (row: CourseRow): Course => ({
  id: row.id,
  slug: row.slug,
  titleAr: row.title_ar ?? row.title,
  titleEn: row.title_en ?? row.title,
  level: (row.level as LevelCode) || 'A1',
  category: (row.category as Course['category']) || 'beginner',
  categoryAr: row.category_ar || 'عام',
  descriptionAr: row.description || '',
  descriptionEn: row.description_en || undefined,
  durationHours: Number(row.duration_hours ?? 0),
  lessonsCount: row.lessons_count ?? 0,
  rating: Number(row.rating ?? 0),
  studentsCount: Number(row.students_count ?? 0),
  image: row.image || row.thumbnail_url || '',
  thumbnailAssetId: row.thumbnail_asset_id ?? undefined,
  color: row.color || 'indigo',
  isLocked: row.status !== 'published',
  isFree: row.is_free,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const hydrateThumbnail = async (row: CourseRow): Promise<Course> => {
  const course = toCourse(row);
  if (!row.media_assets) return course;
  try { return { ...course, image: await mediaService.resolveAssetUrl({ bucketId: row.media_assets.bucket_id, storagePath: row.media_assets.storage_path }) }; }
  catch { return course; }
};

class CoursesService {
  private courses: Course[] = [];
  private listeners: Set<CoursesListener> = new Set();

  public async getCourses(status?: ContentStatus): Promise<Course[]> {
    if (!isSupabaseConfigured) return [];
    const baseQuery = getSupabaseClient().from('courses').select('*, media_assets(bucket_id,storage_path,file_name,mime_type)').order('sort_order', { ascending: true });
    const { data, error } = status ? await baseQuery.eq('status', status) : await baseQuery;
    if (error) throw error;
    const courses = await Promise.all((data as CourseRow[]).map(hydrateThumbnail));
    this.courses = courses;
    this.notify();
    return courses;
  }

  public async getPublishedCourses(): Promise<Course[]> {
    return this.getCourses('published');
  }

  public async getCourseById(id: string): Promise<Course | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getSupabaseClient().from('courses').select('*, media_assets(bucket_id,storage_path,file_name,mime_type)').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? hydrateThumbnail(data as CourseRow) : null;
  }

  public async createCourse(data: Omit<Course, 'id'>): Promise<Course> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const row = {
      slug: data.slug || `course-${Date.now()}`, title: data.titleEn || data.titleAr,
      title_ar: data.titleAr, title_en: data.titleEn, description: data.descriptionAr,
      description_en: data.descriptionEn ?? null, thumbnail_url: data.image || null, image: data.image || null,
      color: data.color || null, status: data.status || 'draft', sort_order: 0,
      is_featured: false, is_free: data.isFree ?? false, level: data.level, category: data.category,
      category_ar: data.categoryAr, duration_hours: data.durationHours, lessons_count: data.lessonsCount ?? 0,
      rating: data.rating ?? 0, students_count: data.studentsCount ?? 0,
      thumbnail_asset_id: data.thumbnailAssetId ?? null,
    };
    const { data: created, error } = await getSupabaseClient().from('courses').insert(row).select('*').single();
    if (error) throw error;
    const course = toCourse(created as CourseRow);
    await this.getCourses();
    return course;
  }

  public async updateCourse(id: string, data: Partial<Course>): Promise<Course | null> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const row: Record<string, unknown> = {};
    if (data.slug !== undefined) row.slug = data.slug;
    if (data.titleAr !== undefined) row.title_ar = data.titleAr;
    if (data.titleEn !== undefined) { row.title_en = data.titleEn; row.title = data.titleEn; }
    if (data.descriptionAr !== undefined) row.description = data.descriptionAr;
    if (data.descriptionEn !== undefined) row.description_en = data.descriptionEn;
    if (data.image !== undefined) { row.image = data.image; row.thumbnail_url = data.image; }
    if (data.thumbnailAssetId !== undefined) row.thumbnail_asset_id = data.thumbnailAssetId || null;
    if (data.color !== undefined) row.color = data.color;
    if (data.status !== undefined) { row.status = data.status; row.archived_at = data.status === 'archived' ? new Date().toISOString() : null; }
    if (data.isFree !== undefined) row.is_free = data.isFree;
    if (data.level !== undefined) row.level = data.level;
    if (data.category !== undefined) row.category = data.category;
    if (data.categoryAr !== undefined) row.category_ar = data.categoryAr;
    if (data.durationHours !== undefined) row.duration_hours = data.durationHours;
    if (data.lessonsCount !== undefined) row.lessons_count = data.lessonsCount;
    if (data.rating !== undefined) row.rating = data.rating;
    if (data.studentsCount !== undefined) row.students_count = data.studentsCount;
    const { data: updated, error } = await getSupabaseClient().from('courses').update(row).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!updated) return null;
    const course = toCourse(updated as CourseRow);
    await this.getCourses();
    return course;
  }

  public async setCourseStatus(id: string, status: ContentStatus): Promise<Course | null> {
    return this.updateCourse(id, { status, isLocked: status !== 'published' });
  }

  public async deleteCourse(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const { error } = await getSupabaseClient().from('courses').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    await this.getCourses();
    return true;
  }

  public subscribe(listener: CoursesListener): () => void {
    this.listeners.add(listener);
    void this.getCourses().then(listener).catch(() => listener([]));
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const list = [...this.courses];
    this.listeners.forEach((listener) => listener(list));
  }
}

export const coursesService = new CoursesService();
