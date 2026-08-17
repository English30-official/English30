import { Lesson, LessonBlock, ContentStatus } from '../types';
import { SAMPLE_LESSON } from '../data/mockData';

type LessonsListener = (lessons: Lesson[]) => void;

class LessonsService {
  private lessons: Lesson[] = [
    {
      ...SAMPLE_LESSON,
      id: 'lesson-1',
      courseId: 'course-1',
      unitNumber: 1,
      titleAr: 'التحيات والتعريف بالنفس والأساسيات',
      titleEn: 'Greetings & Self Introduction A1',
      level: 'A1',
      status: 'published',
      blocks: [
        {
          id: 'block-1',
          lessonId: 'lesson-1',
          type: 'video',
          titleAr: 'الفيديو التعليمي التأسيسي',
          orderIndex: 1,
          status: 'published',
          isFreePreview: true,
          payload: {
            videoUrl: SAMPLE_LESSON.videoUrl,
            duration: '08:45',
            titleAr: 'شرح الدرس التأسيسي الأول',
          },
        },
        {
          id: 'block-2',
          lessonId: 'lesson-1',
          type: 'vocabulary_set',
          titleAr: 'بنك مفردات المحادثة واللقاء',
          orderIndex: 2,
          status: 'published',
          isFreePreview: true,
          payload: {
            words: SAMPLE_LESSON.vocabList,
          },
        },
        {
          id: 'block-3',
          lessonId: 'lesson-1',
          type: 'grammar_rule',
          titleAr: 'قاعدة تكوين الجملة الأساسية',
          orderIndex: 3,
          status: 'published',
          payload: {
            rules: SAMPLE_LESSON.grammarRules,
          },
        },
        {
          id: 'block-4',
          lessonId: 'lesson-1',
          type: 'interactive_exercise',
          titleAr: 'تطبيق وتدريب ملء الفراغات',
          orderIndex: 4,
          status: 'published',
          payload: {
            exercises: SAMPLE_LESSON.fillInBlankQuestions,
          },
        },
        {
          id: 'block-5',
          lessonId: 'lesson-1',
          type: 'quiz_embed',
          titleAr: 'الاختبار القصير لتقييم الفهم',
          orderIndex: 5,
          status: 'published',
          payload: {
            questions: SAMPLE_LESSON.quizQuestions,
          },
        },
      ],
    },
    {
      ...SAMPLE_LESSON,
      id: 'lesson-2',
      courseId: 'course-1',
      unitNumber: 2,
      titleAr: 'الطلب في المطعم والمقهى والأسعار',
      titleEn: 'Ordering Food & Drinks at a Cafe',
      level: 'A1',
      status: 'published',
    },
    {
      ...SAMPLE_LESSON,
      id: 'lesson-3',
      courseId: 'course-1',
      unitNumber: 3,
      titleAr: 'الأرقام والأوقات وأيام الأسبوع',
      titleEn: 'Telling Time, Numbers & Weekdays',
      level: 'A1',
      status: 'published',
    },
    {
      ...SAMPLE_LESSON,
      id: 'lesson-4',
      courseId: 'course-2',
      unitNumber: 1,
      titleAr: 'محادثة المطار وإنهاء إجراءات السفر',
      titleEn: 'Airport Check-in & Travel Conversations',
      level: 'A2',
      status: 'draft',
    },
    {
      ...SAMPLE_LESSON,
      id: 'lesson-5',
      courseId: 'course-3',
      unitNumber: 1,
      titleAr: 'الفرق الدقيق بين المضارع البسيط والمستمر',
      titleEn: 'Present Simple vs Present Continuous in Action',
      level: 'B1',
      status: 'draft',
    },
  ];

  private listeners: Set<LessonsListener> = new Set();

  public async getLessons(courseId?: string, status?: ContentStatus): Promise<Lesson[]> {
    let list = [...this.lessons];
    if (courseId) {
      list = list.filter((l) => l.courseId === courseId);
    }
    if (status) {
      list = list.filter((l) => l.status === status);
    }
    return list;
  }

  public async getLessonById(id: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.id === id) || null;
  }

  public async createLesson(data: Omit<Lesson, 'id'>): Promise<Lesson> {
    const newLesson: Lesson = {
      ...data,
      id: `lesson-${Date.now()}`,
      status: data.status || 'draft',
    };
    this.lessons = [newLesson, ...this.lessons];
    this.notify();
    return newLesson;
  }

  public async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson | null> {
    const idx = this.lessons.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    this.lessons[idx] = {
      ...this.lessons[idx],
      ...data,
    };
    this.notify();
    return this.lessons[idx];
  }

  public async setLessonStatus(id: string, status: ContentStatus): Promise<Lesson | null> {
    return this.updateLesson(id, { status });
  }

  public async deleteLesson(id: string): Promise<boolean> {
    const prevLen = this.lessons.length;
    this.lessons = this.lessons.filter((l) => l.id !== id);
    if (this.lessons.length !== prevLen) {
      this.notify();
      return true;
    }
    return false;
  }

  public subscribe(listener: LessonsListener): () => void {
    this.listeners.add(listener);
    listener([...this.lessons]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.lessons];
    this.listeners.forEach((l) => l(list));
  }
}

export const lessonsService = new LessonsService();
