import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Flame,
  Zap,
  Phone,
  Mail,
  Send,
} from 'lucide-react';
import { studentsService, auditService } from '../../services';
import { StudentProfile, LevelCode, SubscriptionStatus } from '../../types';

export const OwnerStudents: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LevelCode | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  useEffect(() => {
    async function load() {
      const list = await studentsService.getStudents();
      setStudents(list);
    }
    load();
  }, []);

  const handleToggleSuspension = async (student: StudentProfile) => {
    const updated = await studentsService.toggleStudentSuspension(student.id);
    if (!updated) return;

    setStudents((prev) => prev.map((s) => (s.id === student.id ? updated : s)));
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(updated);
    }

    await auditService.logAction(
      updated.isSuspended ? 'SUSPEND_STUDENT' : 'UNSUSPEND_STUDENT',
      'profiles',
      student.fullName,
      `تم ${updated.isSuspended ? 'إيقاف' : 'إعادة تفعيل'} حساب الطالب.`
    );
  };

  const filteredStudents = students.filter((s) => {
    if (levelFilter !== 'all' && s.level !== levelFilter) return false;
    if (statusFilter !== 'all' && s.subscriptionStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phoneNumber && s.phoneNumber.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">إدارة الطلاب والمشتركين (Students Directory)</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة حالة الطلاب، المستويات المحققة، نقاط الخبرة، وصلاحيات الاشتراك.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم، البريد، أو رقم الجوال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
          >
            <option value="all">جميع المستويات</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
          >
            <option value="all">جميع حالات الاشتراك</option>
            <option value="active">🟢 مشترك نشط (Active)</option>
            <option value="trial">🟡 تجربة مجانية (Trial)</option>
            <option value="expired">🔴 اشتراك منتهٍ (Expired)</option>
          </select>

        </div>

      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-extrabold">
                <th className="py-4 px-6">الطالب</th>
                <th className="py-4 px-4">المستوى</th>
                <th className="py-4 px-4">حالة الاشتراك</th>
                <th className="py-4 px-4">التقدم والدروس</th>
                <th className="py-4 px-4">نقاط الـ XP</th>
                <th className="py-4 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStudents.map((student) => {
                const isActiveSub = student.subscriptionStatus === 'active';
                const isTrial = student.subscriptionStatus === 'trial';

                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{student.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-english" dir="ltr">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg text-xs">
                        مستوى {student.level}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md font-bold text-[11px] border inline-flex items-center gap-1 ${
                          isActiveSub
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isTrial
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isActiveSub && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isTrial && <Clock className="w-3 h-3 text-amber-600" />}
                        {student.subscriptionPlanName || student.subscriptionStatus}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-800">{student.completedLessonsCount}</span> / 30 درساً
                    </td>

                    <td className="py-4 px-4 font-bold text-violet-700">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-violet-500 text-violet-500" />
                        <span>{student.xpPoints} XP</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          التفاصيل
                        </button>
                        <button
                          onClick={() => handleToggleSuspension(student)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            student.isSuspended
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {student.isSuspended ? 'تفعيل الحساب' : 'إيقاف مؤقت'}
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Student Details Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedStudent.fullName}</h3>
                  <p className="text-xs text-slate-400 font-english" dir="ltr">{selectedStudent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold">المستوى المحقق:</span>
                <div className="text-sm font-black text-slate-900">مستوى {selectedStudent.level}</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold">سلسلة التعلم:</span>
                <div className="text-sm font-black text-amber-600 flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-amber-500" />
                  <span>{selectedStudent.streakDays} أيام</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold">خطة الاشتراك:</span>
                <div className="text-xs font-bold text-slate-900">{selectedStudent.subscriptionPlanName}</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold">تاريخ الانتهاء:</span>
                <div className="text-xs font-bold text-slate-900">{selectedStudent.subscriptionExpiresAt}</div>
              </div>
            </div>

            {selectedStudent.phoneNumber && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-100 text-xs">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>رقم الواتساب المسجل: <strong dir="ltr">{selectedStudent.phoneNumber}</strong></span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
