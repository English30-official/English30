import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  UserCheck,
  Clock,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { auditService } from '../../services';
import { AuditLogItem } from '../../types';

export const OwnerAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    const unsub = auditService.subscribe((l) => {
      setLogs(l);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">سجل النشاطات الإدارية (Audit & Activity Logs)</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            سجل غير قابل للتعديل لتوثيق عمليات النشر وتعديل الإعدادات والأسعار والأذونات.
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-extrabold">
                <th className="py-4 px-6">المسؤول (Actor)</th>
                <th className="py-4 px-4">نوع الإجراء (Action)</th>
                <th className="py-4 px-4">الكيان المستهدف</th>
                <th className="py-4 px-6">تفاصيل العملية</th>
                <th className="py-4 px-6">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {logs.map((log) => {
                const isOwner = log.actorRole === 'owner';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                          {isOwner ? '👑' : '🛡️'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{log.actorName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{log.actorRole}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg text-[11px] font-english">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-800">
                      {log.entityName}
                    </td>

                    <td className="py-4 px-6 text-slate-600 max-w-xs">
                      {log.details}
                    </td>

                    <td className="py-4 px-6 text-slate-400 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
