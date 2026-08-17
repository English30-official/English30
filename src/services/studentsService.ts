import { StudentProfile, LevelCode, SubscriptionStatus } from '../types';

type StudentsListener = (students: StudentProfile[]) => void;

class StudentsService {
  private students: StudentProfile[] = [
    {
      id: 'student-101',
      fullName: 'أحمد محمد العتيبي',
      email: 'ahmed.otaibi@example.com',
      phoneNumber: '+966551234567',
      telegramUsername: '@ahmed_eng30',
      role: 'student',
      level: 'A1',
      subscriptionStatus: 'active',
      subscriptionPlanName: 'الباقة الذهبية السنوية',
      subscriptionExpiresAt: '2027-02-15',
      xpPoints: 850,
      streakDays: 14,
      completedLessonsCount: 6,
      registeredAt: '2026-07-10',
      lastActiveAt: 'منذ ساعتين',
      isSuspended: false,
    },
    {
      id: 'student-102',
      fullName: 'سارة خالد الدوسري',
      email: 'sara.dosari@example.com',
      phoneNumber: '+966509876543',
      telegramUsername: '@sara_learns',
      role: 'student',
      level: 'B1',
      subscriptionStatus: 'active',
      subscriptionPlanName: 'الباقة الشهرية المميزة',
      subscriptionExpiresAt: '2026-09-12',
      xpPoints: 1620,
      streakDays: 22,
      completedLessonsCount: 18,
      registeredAt: '2026-06-01',
      lastActiveAt: 'اليوم',
      isSuspended: false,
    },
    {
      id: 'student-103',
      fullName: 'فيصل عبد الرحمن الشهري',
      email: 'faisal.shehri@example.com',
      phoneNumber: '+966543322114',
      role: 'student',
      level: 'A2',
      subscriptionStatus: 'trial',
      subscriptionPlanName: 'فترة التجربة المجانية (3 دروس)',
      subscriptionExpiresAt: '2026-08-25',
      xpPoints: 210,
      streakDays: 3,
      completedLessonsCount: 2,
      registeredAt: '2026-08-12',
      lastActiveAt: 'أمس',
      isSuspended: false,
    },
    {
      id: 'student-104',
      fullName: 'نورة إبراهيم السبيعي',
      email: 'noura.subaie@example.com',
      phoneNumber: '+966567788990',
      role: 'student',
      level: 'A1',
      subscriptionStatus: 'expired',
      subscriptionPlanName: 'الباقة الشهرية',
      subscriptionExpiresAt: '2026-08-01',
      xpPoints: 490,
      streakDays: 0,
      completedLessonsCount: 4,
      registeredAt: '2026-07-01',
      lastActiveAt: 'منذ 5 أيام',
      isSuspended: false,
    },
    {
      id: 'student-105',
      fullName: 'ماجد حسن الشمري',
      email: 'majed.shammari@example.com',
      phoneNumber: '+966512398475',
      role: 'student',
      level: 'B2',
      subscriptionStatus: 'active',
      subscriptionPlanName: 'الباقة مدى الحياة VIP',
      subscriptionExpiresAt: '2099-12-31',
      xpPoints: 3450,
      streakDays: 45,
      completedLessonsCount: 29,
      registeredAt: '2026-05-15',
      lastActiveAt: 'الآن',
      isSuspended: false,
    },
  ];

  private listeners: Set<StudentsListener> = new Set();

  public async getStudents(searchQuery?: string, level?: LevelCode, status?: SubscriptionStatus): Promise<StudentProfile[]> {
    let list = [...this.students];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phoneNumber && s.phoneNumber.includes(q))
      );
    }
    if (level) {
      list = list.filter((s) => s.level === level);
    }
    if (status) {
      list = list.filter((s) => s.subscriptionStatus === status);
    }
    return list;
  }

  public async getStudentById(id: string): Promise<StudentProfile | null> {
    return this.students.find((s) => s.id === id) || null;
  }

  public async toggleStudentSuspension(id: string): Promise<StudentProfile | null> {
    const student = this.students.find((s) => s.id === id);
    if (!student) return null;
    student.isSuspended = !student.isSuspended;
    this.notify();
    return { ...student };
  }

  public async updateStudentSubscription(
    id: string,
    status: SubscriptionStatus,
    planName: string,
    expiresAt: string
  ): Promise<StudentProfile | null> {
    const student = this.students.find((s) => s.id === id);
    if (!student) return null;
    student.subscriptionStatus = status;
    student.subscriptionPlanName = planName;
    student.subscriptionExpiresAt = expiresAt;
    this.notify();
    return { ...student };
  }

  public async getStatsSummary() {
    const total = this.students.length;
    const active = this.students.filter((s) => s.subscriptionStatus === 'active').length;
    const trial = this.students.filter((s) => s.subscriptionStatus === 'trial').length;
    const expired = this.students.filter((s) => s.subscriptionStatus === 'expired').length;
    const totalXP = this.students.reduce((acc, curr) => acc + curr.xpPoints, 0);

    return {
      totalStudents: total,
      activeSubscribers: active,
      trialUsers: trial,
      expiredSubscribers: expired,
      totalXP,
      conversionRate: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }

  public subscribe(listener: StudentsListener): () => void {
    this.listeners.add(listener);
    listener([...this.students]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.students];
    this.listeners.forEach((l) => l(list));
  }
}

export const studentsService = new StudentsService();
