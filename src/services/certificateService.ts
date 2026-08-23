import { CertificateRecord, CertificateSettings, CertificateVerification } from '../types';
import { getSupabaseClient } from '../lib/supabase';

const mapSettings = (row: any): CertificateSettings => ({
  courseId: row.course_id, enabled: row.enabled, certificateTitle: row.certificate_title,
  minimumFinalScore: Number(row.minimum_final_score), requireAllLessons: row.require_all_lessons,
  requireFinalQuiz: row.require_final_quiz, templateSettings: row.template_settings ?? {},
  logoAssetId: row.logo_asset_id ?? undefined, signatoryName: row.signatory_name ?? undefined,
  signatoryTitle: row.signatory_title ?? undefined, signatureAssetId: row.signature_asset_id ?? undefined,
  wording: row.wording ?? undefined,
});

const mapCertificate = (row: any): CertificateRecord => ({
  id: row.id, certificateNumber: row.certificate_number, verificationCode: row.verification_code,
  userId: row.user_id, courseId: row.course_id, status: row.status,
  studentName: row.student_name_snapshot, courseTitle: row.course_title_snapshot,
  courseLevel: row.course_level_snapshot ?? undefined, certificateTitle: row.certificate_title_snapshot,
  wording: row.wording_snapshot ?? undefined, template: row.template_snapshot ?? {},
  completion: row.completion_snapshot ?? {}, issuedAt: row.issued_at,
  revokedAt: row.revoked_at ?? undefined, revocationReason: row.revocation_reason ?? undefined,
});

const hydrateCertificateAssets = async (records: CertificateRecord[]): Promise<CertificateRecord[]> => {
  const ids = [...new Set(records.flatMap((record) => [record.template.logoAssetId, record.template.signatureAssetId]).filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (!ids.length) return records;
  const client = getSupabaseClient();
  const { data, error } = await client.from('media_assets').select('id,bucket_id,storage_path').in('id', ids);
  if (error) throw error;
  const urls = new Map<string, string>();
  await Promise.all((data ?? []).map(async (asset) => {
    const { data: signed, error: signError } = await client.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 3600);
    if (!signError && signed?.signedUrl) urls.set(asset.id, signed.signedUrl);
  }));
  return records.map((record) => ({
    ...record,
    template: {
      ...record.template,
      logoUrl: typeof record.template.logoAssetId === 'string' ? urls.get(record.template.logoAssetId) : undefined,
      signatureUrl: typeof record.template.signatureAssetId === 'string' ? urls.get(record.template.signatureAssetId) : undefined,
    },
  }));
};

class CertificateService {
  async listSettings(): Promise<CertificateSettings[]> {
    const { data, error } = await getSupabaseClient().from('course_certificate_settings').select('*');
    if (error) throw error;
    return (data ?? []).map(mapSettings);
  }

  async saveSettings(settings: CertificateSettings): Promise<CertificateSettings> {
    const client = getSupabaseClient();
    const userId = (await client.auth.getUser()).data.user?.id ?? null;
    const { data, error } = await client.from('course_certificate_settings').upsert({
      course_id: settings.courseId, enabled: settings.enabled, certificate_title: settings.certificateTitle,
      minimum_final_score: settings.minimumFinalScore, require_all_lessons: settings.requireAllLessons,
      require_final_quiz: settings.requireFinalQuiz, template_settings: settings.templateSettings,
      logo_asset_id: settings.logoAssetId || null, signatory_name: settings.signatoryName || null,
      signatory_title: settings.signatoryTitle || null, signature_asset_id: settings.signatureAssetId || null,
      wording: settings.wording || null, updated_by: userId,
    }, { onConflict: 'course_id' }).select('*').single();
    if (error) throw error;
    return mapSettings(data);
  }

  async listAll(): Promise<CertificateRecord[]> {
    const { data, error } = await getSupabaseClient().from('certificates').select('*').order('issued_at', { ascending: false });
    if (error) throw error;
    return hydrateCertificateAssets((data ?? []).map(mapCertificate));
  }

  async listMine(): Promise<CertificateRecord[]> {
    const userId = (await getSupabaseClient().auth.getUser()).data.user?.id;
    if (!userId) return [];
    const { data, error } = await getSupabaseClient().from('certificates').select('*').eq('user_id', userId).order('issued_at', { ascending: false });
    if (error) throw error;
    return hydrateCertificateAssets((data ?? []).map(mapCertificate));
  }

  async revoke(id: string, reason: string): Promise<boolean> {
    const { data, error } = await getSupabaseClient().rpc('revoke_certificate', { p_certificate_id: id, p_reason: reason });
    if (error) throw error;
    return Boolean(data);
  }

  async reissue(id: string): Promise<string> {
    const { data, error } = await getSupabaseClient().rpc('reissue_certificate', { p_certificate_id: id });
    if (error) throw error;
    return String(data);
  }

  async verify(code: string): Promise<CertificateVerification | null> {
    const { data, error } = await getSupabaseClient().rpc('verify_certificate', { p_verification_code: code });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      valid: row.valid, status: row.status, certificateNumber: row.certificate_number,
      studentName: row.student_name, courseTitle: row.course_title,
      courseLevel: row.course_level ?? undefined, issuedAt: row.issued_at,
      revokedAt: row.revoked_at ?? undefined,
    };
  }
}

export const certificateService = new CertificateService();
