import { DiagnosticCheck } from '../types';
import { authenticatedJsonHeaders } from '../lib/api';

class DiagnosticsService {
  async getChecks(): Promise<{ checkedAt: string; checks: DiagnosticCheck[] }> {
    const response = await fetch('/api/owner-diagnostics', { headers: await authenticatedJsonHeaders() });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'تعذر تحميل تشخيصات المنصة.');
    return payload;
  }
}

export const diagnosticsService = new DiagnosticsService();
