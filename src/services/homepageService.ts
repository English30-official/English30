import type {
  Campaign,
  CampaignPlacement,
  CampaignPreset,
  ContentStatus,
  HomepageSection,
  HomepageSectionType,
  HomepageSectionVersion,
} from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const SECTION_LABELS: Record<HomepageSectionType, string> = {
  hero: 'البطل الرئيسي', announcement_bar: 'شريط إعلان', promotional_banner: 'بانر ترويجي',
  image_carousel: 'معرض صور', featured_course: 'دورة مميزة', course_grid: 'شبكة الدورات',
  course_carousel: 'دورات متحركة', benefits: 'المزايا', statistics: 'الإحصاءات',
  testimonials: 'آراء الطلاب', video: 'فيديو', image_text_split: 'صورة ونص',
  text_content: 'محتوى نصي', cta: 'دعوة لاتخاذ إجراء', faq: 'الأسئلة الشائعة',
  logos: 'الشعارات والشركاء', trust_badges: 'شارات الثقة', countdown: 'عد تنازلي',
  pricing_highlight: 'إبراز الأسعار', placement_test: 'اختبار تحديد المستوى',
  certificate_promotion: 'الترويج للشهادة', app_promo: 'تطبيق الجوال',
  blog_teaser: 'مقالات', custom_safe: 'كتلة مخصصة آمنة',
};

export const SECTION_TYPES = Object.keys(SECTION_LABELS) as HomepageSectionType[];
export const CAMPAIGN_PRESETS: Array<{ value: CampaignPreset; label: string }> = [
  { value: 'clean_modern', label: 'عصري نظيف' }, { value: 'elegant_academic', label: 'أكاديمي أنيق' },
  { value: 'bold_promotion', label: 'عرض جريء' }, { value: 'minimal', label: 'بسيط' },
  { value: 'premium', label: 'فاخر' }, { value: 'saudi_national_day', label: 'اليوم الوطني السعودي' },
  { value: 'ramadan', label: 'رمضان' }, { value: 'black_friday', label: 'Black Friday' },
  { value: 'course_launch', label: 'إطلاق دورة' }, { value: 'youthful_learning', label: 'تعلم شبابي' },
  { value: 'dark_premium', label: 'فاخر داكن' }, { value: 'light_minimal', label: 'فاتح هادئ' },
];
export const CAMPAIGN_LOCATIONS: Array<{ value: CampaignPlacement; label: string }> = [
  { value: 'announcement_bar', label: 'شريط الإعلان العام' }, { value: 'homepage_hero', label: 'Hero الصفحة الرئيسية' },
  { value: 'homepage_banner', label: 'بانر الصفحة الرئيسية' }, { value: 'homepage_midpage', label: 'منتصف الصفحة الرئيسية' },
  { value: 'promotional_carousel', label: 'المعرض الترويجي' }, { value: 'pricing', label: 'صفحة الأسعار' },
  { value: 'course', label: 'صفحة الدورة' }, { value: 'auth', label: 'صفحة الدخول والتسجيل' },
  { value: 'popup', label: 'نافذة ترويجية' }, { value: 'sticky_mobile', label: 'شريط الجوال السفلي' },
];

const mapSection = (row: any): HomepageSection => ({
  id: row.id, sectionType: row.section_type, sortOrder: Number(row.sort_order ?? 0), enabled: Boolean(row.enabled),
  status: row.status ?? 'published', config: row.config ?? {}, versionId: row.version_id, updatedAt: row.updated_at, archivedAt: row.archived_at,
});
const mapCampaign = (row: any, locations: CampaignPlacement[] = []): Campaign => ({
  id: row.id, internalName: row.internal_name, publicTitle: row.public_title ?? '', subtitle: row.subtitle ?? '',
  description: row.description ?? '', status: row.status ?? 'draft', isActive: Boolean(row.is_active), priority: Number(row.priority ?? 0),
  startAt: row.start_at, endAt: row.end_at, timezone: row.timezone ?? 'Asia/Riyadh', preset: row.preset ?? 'clean_modern',
  config: row.config ?? {}, locations, publishedAt: row.published_at ?? undefined, archivedAt: row.archived_at ?? undefined, updatedAt: row.updated_at,
});

const requireConfigured = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase is required for homepage management.');
  return getSupabaseClient();
};

class HomepageService {
  async getPublishedSections(): Promise<HomepageSection[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getSupabaseClient().rpc('get_published_homepage_sections');
    if (error) throw error;
    return (data ?? []).map(mapSection);
  }

  async getEditorSections(includeArchived = false): Promise<HomepageSection[]> {
    const client = requireConfigured();
    let query = client.from('homepage_sections').select('*').order('sort_order').order('created_at');
    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query;
    if (error) throw error;
    const sections = (data ?? []) as any[];
    const ids = sections.map((row) => row.id);
    if (!ids.length) return [];
    const { data: versions, error: versionsError } = await client.from('homepage_section_versions').select('*').in('section_id', ids).order('version_number', { ascending: false });
    if (versionsError) throw versionsError;
    const latest = new Map<string, any>();
    for (const version of versions ?? []) if (!latest.has(version.section_id) && ['draft', 'preview', 'published', 'archived'].includes(version.status)) latest.set(version.section_id, version);
    return sections.map((row) => mapSection({ ...row, config: latest.get(row.id)?.config ?? {}, version_id: latest.get(row.id)?.id }));
  }

  async listSectionVersions(sectionId?: string): Promise<HomepageSectionVersion[]> {
    const client = requireConfigured();
    let query = client.from('homepage_section_versions').select('*').order('created_at', { ascending: false }).limit(300);
    if (sectionId) query = query.eq('section_id', sectionId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ id: row.id, sectionId: row.section_id, versionNumber: row.version_number, status: row.status, config: row.config ?? {}, createdAt: row.created_at, createdBy: row.created_by ?? undefined }));
  }

  async saveSection(section: Pick<HomepageSection, 'sectionType' | 'sortOrder' | 'enabled' | 'config'> & { id?: string }): Promise<string> {
    const { data, error } = await requireConfigured().rpc('owner_save_homepage_section', {
      p_section_id: section.id ?? null, p_section_type: section.sectionType, p_sort_order: section.sortOrder,
      p_enabled: section.enabled, p_config: section.config,
    });
    if (error) throw error;
    return String(data);
  }

  async publish(): Promise<void> { const { error } = await requireConfigured().rpc('owner_publish_homepage'); if (error) throw error; }
  async archive(sectionId: string, archived = true): Promise<void> { const { error } = await requireConfigured().rpc('owner_archive_homepage_section', { p_section_id: sectionId, p_archived: archived }); if (error) throw error; }
  async reorder(sectionIds: string[]): Promise<void> { const { error } = await requireConfigured().rpc('owner_reorder_homepage_sections', { p_section_ids: sectionIds }); if (error) throw error; }
  async restoreVersion(versionId: string): Promise<void> { const { error } = await requireConfigured().rpc('owner_restore_homepage_version', { p_version_id: versionId }); if (error) throw error; }

  async getActiveCampaigns(location?: CampaignPlacement): Promise<Campaign[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getSupabaseClient().rpc('get_active_campaigns', { p_location: location ?? null });
    if (error) throw error;
    return (data ?? []).map((row: any) => mapCampaign(row, row.location ? [row.location] : []));
  }

  async getCampaigns(includeArchived = false): Promise<Campaign[]> {
    const client = requireConfigured();
    let query = client.from('campaigns').select('*').order('priority', { ascending: false }).order('start_at', { ascending: false });
    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query; if (error) throw error;
    const ids = (data ?? []).map((row: any) => row.id); if (!ids.length) return [];
    const { data: placements, error: placementError } = await client.from('campaign_placements').select('campaign_id,location').in('campaign_id', ids);
    if (placementError) throw placementError;
    const byCampaign = new Map<string, CampaignPlacement[]>();
    for (const placement of placements ?? []) byCampaign.set(placement.campaign_id, [...(byCampaign.get(placement.campaign_id) ?? []), placement.location]);
    return (data ?? []).map((row: any) => mapCampaign(row, byCampaign.get(row.id) ?? []));
  }

  async listCampaignVersions(campaignId?: string): Promise<Array<{ id: string; campaignId: string; versionNumber: number; status: ContentStatus; snapshot: Record<string, unknown>; createdAt: string }>> {
    const client = requireConfigured(); let query = client.from('campaign_versions').select('*').order('created_at', { ascending: false }).limit(300);
    if (campaignId) query = query.eq('campaign_id', campaignId); const { data, error } = await query; if (error) throw error;
    return (data ?? []).map((row: any) => ({ id: row.id, campaignId: row.campaign_id, versionNumber: row.version_number, status: row.status, snapshot: row.snapshot ?? {}, createdAt: row.created_at }));
  }

  async saveCampaign(campaign: Omit<Campaign, 'status' | 'publishedAt' | 'archivedAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    const payload = { internalName: campaign.internalName.trim(), publicTitle: campaign.publicTitle, subtitle: campaign.subtitle, description: campaign.description,
      isActive: campaign.isActive, priority: campaign.priority, startAt: campaign.startAt, endAt: campaign.endAt, timezone: campaign.timezone,
      preset: campaign.preset, config: campaign.config };
    const { data, error } = await requireConfigured().rpc('owner_save_campaign', { p_campaign_id: campaign.id ?? null, p_payload: payload, p_locations: campaign.locations });
    if (error) throw error; return String(data);
  }
  async publishCampaign(id: string): Promise<void> { const { error } = await requireConfigured().rpc('owner_publish_campaign', { p_campaign_id: id }); if (error) throw error; }
  async archiveCampaign(id: string, archived = true): Promise<void> { const { error } = await requireConfigured().rpc('owner_archive_campaign', { p_campaign_id: id, p_archived: archived }); if (error) throw error; }
  async restoreCampaignVersion(id: string): Promise<void> { const { error } = await requireConfigured().rpc('owner_restore_campaign_version', { p_version_id: id }); if (error) throw error; }
}

export const homepageService = new HomepageService();
