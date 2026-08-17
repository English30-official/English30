import { Course, ContentStatus } from '../types';
import { COURSES_DATA } from '../data/mockData';

type CoursesListener = (courses: Course[]) => void;

class CoursesService {
  private courses: Course[] = COURSES_DATA.map((c) => ({
    ...c,
    status: c.isLocked ? 'draft' : 'published',
    isFree: c.id === 'course-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  private listeners: Set<CoursesListener> = new Set();

  public async getCourses(status?: ContentStatus): Promise<Course[]> {
    // In future phases, this will query Supabase: `supabase.from('courses').select('*')`
    if (!status) return [...this.courses];
    return this.courses.filter((c) => c.status === status);
  }

  public async getPublishedCourses(): Promise<Course[]> {
    return this.courses.filter((c) => c.status === 'published');
  }

  public async getCourseById(id: string): Promise<Course | null> {
    return this.courses.find((c) => c.id === id) || null;
  }

  public async createCourse(data: Omit<Course, 'id'>): Promise<Course> {
    const newCourse: Course = {
      ...data,
      id: `course-${Date.now()}`,
      status: data.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.courses = [newCourse, ...this.courses];
    this.notify();
    return newCourse;
  }

  public async updateCourse(id: string, data: Partial<Course>): Promise<Course | null> {
    const idx = this.courses.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    this.courses[idx] = {
      ...this.courses[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.notify();
    return this.courses[idx];
  }

  public async setCourseStatus(id: string, status: ContentStatus): Promise<Course | null> {
    return this.updateCourse(id, {
      status,
      isLocked: status !== 'published',
    });
  }

  public async deleteCourse(id: string): Promise<boolean> {
    const initialLen = this.courses.length;
    this.courses = this.courses.filter((c) => c.id !== id);
    if (this.courses.length !== initialLen) {
      this.notify();
      return true;
    }
    return false;
  }

  public subscribe(listener: CoursesListener): () => void {
    this.listeners.add(listener);
    listener([...this.courses]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.courses];
    this.listeners.forEach((l) => l(list));
  }
}

export const coursesService = new CoursesService();
