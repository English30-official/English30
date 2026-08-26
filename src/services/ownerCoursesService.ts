import { ContentStatus, Course, Lesson } from '../types';
import { auditService } from './auditService';
import { coursesService } from './coursesService';
import { lessonsService } from './lessonsService';

class OwnerCoursesService {
  async load() {
    const courses = await coursesService.getCourses();
    const selectedCourse = courses[0] ?? null;
    const lessons = selectedCourse ? await lessonsService.getLessons(selectedCourse.id) : [];
    return { courses, selectedCourse, lessons };
  }
  getLessons(course: Course) { return lessonsService.getLessons(course.id); }
  async toggleLessonStatus(lesson: Lesson): Promise<ContentStatus> {
    const status: ContentStatus = lesson.status === 'published' ? 'draft' : 'published';
    await lessonsService.setLessonStatus(lesson.id, status);
    await auditService.logAction(status === 'published' ? 'PUBLISH_LESSON' : 'UNPUBLISH_LESSON', 'lessons', lesson.titleAr,
      `تم تغيير حالة الدرس إلى ${status === 'published' ? 'منشور (Published)' : 'مسودة (Draft)'}`);
    return status;
  }
  async setLessonStatus(lesson: Lesson, status: ContentStatus): Promise<void> {
    await lessonsService.setLessonStatus(lesson.id, status);
    await auditService.logAction(`${status.toUpperCase()}_LESSON`, 'lessons', lesson.titleAr, `تم تغيير حالة الدرس إلى ${status}`);
  }
  async createLesson(data: Omit<Lesson, 'id'>) {
    const lesson = await lessonsService.createLesson(data);
    await auditService.logAction('CREATE_LESSON', 'lessons', lesson.titleAr, `تم إنشاء درس جديد بحالة ${lesson.status}`);
    return lesson;
  }
}
export const ownerCoursesService = new OwnerCoursesService();
