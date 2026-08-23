import { Course, ContentStatus, LevelCode } from '../types';
import { COURSES_DATA } from '../data/mockData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

type CoursesListener = (courses: Course[]) => void;

type CourseRow = {
  id: string; slug: string; title: string; title_ar: string | null; title_en: string | null;
  description: string | null; description_en: string | null; thumbnail_url: string | null;
  image: string | null; color: string | null; status: ContentStatus; sort_order: number;
  is_featured: boolean; is_free: boolean; created_by: string | null; created_at: string; updated_at: string;
  level: string | null; category: string | null; category_ar: string | null; duration_hours: number | null;
  lessons_count: number; rating: number; students_count: number;
};

const fallbackCourses = (): Course[] => COURSES_DATA.map((c) => ({
  ...c,
  status: c.isLocked ? 'draft' : 'published',
  isFree: c.id === 'course-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

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
  studentsCount: row.students_count ?? 0,
  image: row.image || row.thumbnail_url || '',
  color: row.color || 'indigo',
  isLocked: row.status !== 'published',
  isFree: row.is_free,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

class CoursesService {
  private courses: Course[] = fallbackCourses();
  private listeners: Set<CoursesListener> = new Set();

  public async getCourses(status?: ContentStatus): Promise<Course[]> {
    if (!isSupabaseConfigured) {
      return status ? this.courses.filter((c) => c.status === status) : [...this.courses];
    }
    const query = getSupabaseClient().from('courses').select('*').order('sort_order', { ascending: true });
    const { data, error } = status ? await query.eq('status', status) : await query;
    if (error) throw error;
    const courses = (data as CourseRow[]).map(toCourse);
    this.courses = courses;
    this.notify();
    return courses;
  }

  public async getPublishedCourses(): Promise<Course[]> {
    return this.getCourses('published');
  }

  public async getCourseById(id: string): Promise<Course | null> {
    if (!isSupabaseConfigured) return this.courses.find((c) => c.id === id) || null;
    const { data, error } = await getSupabaseClient().from('courses').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toCourse(data as CourseRow) : null;
  }

  public async createCourse(data: Omit<Course, 'id'>): Promise<Course> {
    if (!isSupabaseConfigured) {
      const newCourse = { ...data, id: `course-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      this.courses = [newCourse, ...this.courses]; this.notify(); return newCourse;
    }
    const row = {
      slug: data.slug || `course-${Date.now()}`, title: data.titleEn || data.titleAr,
      title_ar: data.titleAr, title_en: data.titleEn, description: data.descriptionAr,
      description_en: data.descriptionEn ?? null, thumbnail_url: data.image || null, image: data.image || null,
      color: data.color || null, status: data.status || 'draft', sort_order: 0,
      is_featured: false, is_free: data.isFree ?? false, level: data.level, category: data.category,
      category_ar: data.categoryAr, duration_hours: data.durationHours, lessons_count: data.lessonsCount ?? 0,
      rating: data.rating ?? 0, students_count: data.studentsCount ?? 0,
    };
    const { data: created, error } = await getSupabaseClient().from('courses').insert(row).select('*').single();
    if (error) throw error;
    const course = toCourse(created as CourseRow); await this.getCourses(); return course;
  }

  public async updateCourse(id: string, data: Partial<Course>): Promise<Course | null> {
    if (!isSupabaseConfigured) {
      const idx = this.courses.findIndex((c) => c.id === id); if (idx === -1) return null;
      this.courses[idx] = { ...this.courses[idx], ...data, updatedAt: new Date().toISOString() }; this.notify(); return this.courses[idx];
    }
    const row: Record<string, unknown> = {};
    if (data.slug !== undefined) row.slug = data.slug;
    if (data.titleAr !== undefined) row.title_ar = data.titleAr;
    if (data.titleEn !== undefined) { row.title_en = data.titleEn; row.title = data.titleEn; }
    if (data.descriptionAr !== undefined) row.description = data.descriptionAr;
    if (data.descriptionEn !== undefined) row.description_en = data.descriptionEn;
    if (data.image !== undefined) { row.image = data.image; row.thumbnail_url = data.image; }
    if (data.color !== undefined) row.color = data.color;
    if (data.status !== undefined) row.status = data.status;
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
    const course = toCourse(updated as CourseRow); await this.getCourses(); return course;
  }

  public async setCourseStatus(id: string, status: ContentStatus): Promise<Course | null> {
    return this.updateCourse(id, { status, isLocked: status !== 'published' });
  }

  public async deleteCourse(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const old = this.courses.length; this.courses = this.courses.filter((c) => c.id !== id); if (old !== this.courses.length) this.notify(); return old !== this.courses.length;
    }
    const { error } = await getSupabaseClient().from('courses').delete().eq('id', id);
    if (error) throw error; await this.getCourses(); return true;
  }

  public subscribe(listener: CoursesListener): () => void {
    this.listeners.add(listener); void this.getCourses().then(listener).catch(() => listener([...this.courses]));
    return () => this.listeners.delete(listener);
  }

  private notify() { const list = [...this.courses]; this.listeners.forEach((l) => l(list)); }
}

export const coursesService = new CoursesService();
