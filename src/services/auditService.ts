import { AuditLogItem, UserRole } from '../types';

type AuditListener = (logs: AuditLogItem[]) => void;

class AuditService {
  private logs: AuditLogItem[] = [
    {
      id: 'log-1',
      actorName: 'عبدالله المالك (Owner)',
      actorRole: 'owner',
      action: 'UPDATE_SETTINGS',
      entityType: 'platform_settings',
      entityName: 'أسعار الباقات الترويجية',
      details: 'تفعيل إعلان الترويج لشهر الإطلاق وتحديث رقم الواتساب الرسمي.',
      timestamp: 'منذ 15 دقيقة',
    },
    {
      id: 'log-2',
      actorName: 'عبدالله المالك (Owner)',
      actorRole: 'owner',
      action: 'PUBLISH_COURSE',
      entityType: 'courses',
      entityName: 'أساسيات الإنجليزية للمبتدئين A1',
      details: 'نشر الدورة وتفعيل الدروس التأسيسية الثلاثة الأولى مجاناً.',
      timestamp: 'منذ ساعتين',
    },
    {
      id: 'log-3',
      actorName: 'سارة المشرفة (Admin)',
      actorRole: 'admin',
      action: 'CREATE_QUESTION',
      entityType: 'question_bank',
      entityName: 'سؤال قواعد Past Simple',
      details: 'إضافة سؤال جديد لمستوى A2 في بنك الأسئلة المركزي.',
      timestamp: 'أمس الساعة 4:30 م',
    },
    {
      id: 'log-4',
      actorName: 'عبدالله المالك (Owner)',
      actorRole: 'owner',
      action: 'CREATE_COUPON',
      entityType: 'coupons',
      entityName: 'LAUNCH2026',
      details: 'إنشاء كوبون خصم 30% بحد أقصى 500 استخدام.',
      timestamp: 'منذ 3 أيام',
    },
  ];

  private listeners: Set<AuditListener> = new Set();

  public async getAuditLogs(): Promise<AuditLogItem[]> {
    return [...this.logs];
  }

  public async logAction(
    action: string,
    entityType: string,
    entityName: string,
    details: string,
    actorName = 'عبدالله المالك (Owner)',
    actorRole: UserRole = 'owner'
  ): Promise<AuditLogItem> {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      actorName,
      actorRole,
      action,
      entityType,
      entityName,
      details,
      timestamp: 'الآن',
    };
    this.logs = [newLog, ...this.logs];
    this.notify();
    return newLog;
  }

  public subscribe(listener: AuditListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.logs];
    this.listeners.forEach((l) => l(list));
  }
}

export const auditService = new AuditService();
