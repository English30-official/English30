import { AIGeneratedBlockDraft, CmsPage, ContentStatus, ContentVersion, LessonBlock } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export interface FeatureFlagRecord {
  key: string;
  enabled: boolean;
  descriptionAr?: string;
  config: Record<string, unknown>;
  updatedAt: string;
}

export interface CmsQuizRecord {
  id: string; lessonId: string; title: string; description?: string; passingScore: number;
  maxAttempts?: number; status: ContentStatus; isFinal: boolean;
}

type BlockInput = Pick<LessonBlock, 'lessonId' | 'type' | 'titleAr' | 'titleEn' | 'payload'> & {
  mediaAssetId?: string;
  quizId?: string;
};

const requireSupabase = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase is required for owner CMS operations.');
  return getSupabaseClient();
};

const mapPage = (row: any): CmsPage => ({
  id: row.id, slug: row.slug, pageType: row.page_type, titleAr: row.title_ar,
  titleEn: row.title_en ?? undefined, body: Array.isArray(row.body) ? row.body : [], status: row.status,
  seoTitle: row.seo_title ?? undefined, seoDescription: row.seo_description ?? undefined,
  openGraphAssetId: row.open_graph_asset_id ?? undefined, updatedAt: row.updated_at,
});

const mapBlock = (row: any): LessonBlock => ({
  id: row.id, lessonId: row.lesson_id, type: row.block_type, titleAr: row.title_ar ?? '',
  titleEn: row.title_en ?? undefined, orderIndex: row.order_index, status: row.status,
  payload: row.content ?? {}, mediaAssetId: row.media_asset_id ?? undefined,
  quizId: row.quiz_id ?? undefined, archivedAt: row.archived_at ?? undefined,
});

class OwnerCmsService {
  async listQuizzes(lessonId?: string): Promise<CmsQuizRecord[]> {
    let query = requireSupabase().from('quizzes').select('*').order('created_at');
    if (lessonId) query = query.eq('lesson_id', lessonId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ id:row.id,lessonId:row.lesson_id,title:row.title,description:row.description??undefined,passingScore:Number(row.passing_score),maxAttempts:row.max_attempts??undefined,status:row.status??'draft',isFinal:row.is_final??false }));
  }

  async saveQuiz(quiz: Partial<CmsQuizRecord> & Pick<CmsQuizRecord,'lessonId'|'title'>): Promise<CmsQuizRecord> {
    const row={lesson_id:quiz.lessonId,title:quiz.title.trim(),description:quiz.description||null,passing_score:quiz.passingScore??70,max_attempts:quiz.maxAttempts||null,status:quiz.status??'draft',is_final:quiz.isFinal??false,is_active:true};
    const query=quiz.id?requireSupabase().from('quizzes').update(row).eq('id',quiz.id):requireSupabase().from('quizzes').insert(row);
    const {data,error}=await query.select('*').single();if(error)throw error;
    return {id:data.id,lessonId:data.lesson_id,title:data.title,description:data.description??undefined,passingScore:Number(data.passing_score),maxAttempts:data.max_attempts??undefined,status:data.status,isFinal:data.is_final};
  }

  async setQuizStatus(id:string,status:ContentStatus):Promise<void>{const{error}=await requireSupabase().from('quizzes').update({status,archived_at:status==='archived'?new Date().toISOString():null}).eq('id',id);if(error)throw error;}

  async addBankQuestionToQuiz(quizId:string,bankQuestionId:string):Promise<string>{const{data,error}=await requireSupabase().rpc('add_bank_question_to_quiz',{p_quiz_id:quizId,p_bank_question_id:bankQuestionId});if(error)throw error;return String(data);}

  async listPages(): Promise<CmsPage[]> {
    const { data, error } = await requireSupabase().from('cms_pages').select('*').order('page_type').order('slug');
    if (error) throw error;
    return (data ?? []).map(mapPage);
  }

  async savePage(page: Partial<CmsPage> & Pick<CmsPage, 'slug' | 'titleAr' | 'pageType'>): Promise<CmsPage> {
    const client = requireSupabase();
    const userId = (await client.auth.getUser()).data.user?.id ?? null;
    const record = {
      slug: page.slug.trim().toLowerCase(), page_type: page.pageType, title_ar: page.titleAr.trim(),
      title_en: page.titleEn || null, body: page.body ?? [], status: page.status ?? 'draft',
      seo_title: page.seoTitle || null, seo_description: page.seoDescription || null,
      open_graph_asset_id: page.openGraphAssetId || null, updated_by: userId,
      ...(page.id ? {} : { created_by: userId }),
      ...(page.status === 'published' ? { published_at: new Date().toISOString(), archived_at: null } : {}),
      ...(page.status === 'archived' ? { archived_at: new Date().toISOString() } : {}),
    };
    const query = page.id
      ? client.from('cms_pages').update(record).eq('id', page.id)
      : client.from('cms_pages').insert(record);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return mapPage(data);
  }

  async setPageStatus(id: string, status: ContentStatus): Promise<void> {
    const payload: Record<string, unknown> = { status };
    if (status === 'published') { payload.published_at = new Date().toISOString(); payload.archived_at = null; }
    if (status === 'archived') payload.archived_at = new Date().toISOString();
    if (status === 'draft') payload.archived_at = null;
    const { error } = await requireSupabase().from('cms_pages').update(payload).eq('id', id);
    if (error) throw error;
  }

  async listBlocks(lessonId: string, includeArchived = true): Promise<LessonBlock[]> {
    let query = requireSupabase().from('lesson_blocks').select('*').eq('lesson_id', lessonId).order('order_index');
    if (!includeArchived) query = query.neq('status', 'archived');
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapBlock);
  }

  async createBlock(input: BlockInput): Promise<LessonBlock> {
    const client = requireSupabase();
    const userId = (await client.auth.getUser()).data.user?.id ?? null;
    const existing = await this.listBlocks(input.lessonId);
    const { data, error } = await client.from('lesson_blocks').insert({
      lesson_id: input.lessonId, block_type: input.type, title_ar: input.titleAr,
      title_en: input.titleEn || null, content: input.payload, media_asset_id: input.mediaAssetId || null,
      quiz_id: input.quizId || null, order_index: existing.length, status: 'draft',
      created_by: userId, updated_by: userId,
    }).select('*').single();
    if (error) throw error;
    return mapBlock(data);
  }

  async insertDraftBlocks(lessonId: string, blocks: AIGeneratedBlockDraft[], position: number): Promise<LessonBlock[]> {
    if (!blocks.length) return [];
    const client = requireSupabase();
    const userId = (await client.auth.getUser()).data.user?.id ?? null;
    const existing = (await this.listBlocks(lessonId, false)).sort((a, b) => a.orderIndex - b.orderIndex);
    const insertAt = Math.max(0, Math.min(Math.trunc(position), existing.length));
    const shifted = existing.filter((block) => block.orderIndex >= insertAt).sort((a, b) => b.orderIndex - a.orderIndex);
    for (const block of shifted) await this.updateBlock(block.id, { orderIndex: block.orderIndex + blocks.length });
    const rows = blocks.map((block, index) => ({
      lesson_id: lessonId,
      block_type: block.type,
      title_ar: block.titleAr,
      title_en: block.titleEn || null,
      content: block.payload,
      order_index: insertAt + index,
      status: 'draft',
      created_by: userId,
      updated_by: userId,
    }));
    const { data, error } = await client.from('lesson_blocks').insert(rows).select('*');
    if (error) throw error;
    return (data ?? []).map(mapBlock).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async updateBlock(id: string, changes: Partial<LessonBlock>): Promise<LessonBlock> {
    const client = requireSupabase();
    const userId = (await client.auth.getUser()).data.user?.id ?? null;
    const row: Record<string, unknown> = { updated_by: userId };
    if (changes.type !== undefined) row.block_type = changes.type;
    if (changes.titleAr !== undefined) row.title_ar = changes.titleAr;
    if (changes.titleEn !== undefined) row.title_en = changes.titleEn || null;
    if (changes.payload !== undefined) row.content = changes.payload;
    if (changes.mediaAssetId !== undefined) row.media_asset_id = changes.mediaAssetId || null;
    if (changes.quizId !== undefined) row.quiz_id = changes.quizId || null;
    if (changes.orderIndex !== undefined) row.order_index = changes.orderIndex;
    if (changes.status !== undefined) {
      row.status = changes.status;
      row.archived_at = changes.status === 'archived' ? new Date().toISOString() : null;
    }
    const { data, error } = await client.from('lesson_blocks').update(row).eq('id', id).select('*').single();
    if (error) throw error;
    return mapBlock(data);
  }

  async duplicateBlock(block: LessonBlock): Promise<LessonBlock> {
    const duplicate = await this.createBlock({
      lessonId: block.lessonId, type: block.type, titleAr: `${block.titleAr} — نسخة`,
      titleEn: block.titleEn, payload: structuredClone(block.payload),
      mediaAssetId: block.mediaAssetId, quizId: block.quizId,
    });
    return this.updateBlock(duplicate.id, { orderIndex: block.orderIndex + 1 });
  }

  async moveBlock(block: LessonBlock, direction: -1 | 1): Promise<void> {
    const blocks = (await this.listBlocks(block.lessonId, false)).sort((a, b) => a.orderIndex - b.orderIndex);
    const index = blocks.findIndex((item) => item.id === block.id);
    const other = blocks[index + direction];
    if (index < 0 || !other) return;
    await Promise.all([
      this.updateBlock(block.id, { orderIndex: other.orderIndex }),
      this.updateBlock(other.id, { orderIndex: block.orderIndex }),
    ]);
  }

  async listVersions(entityType?: string, entityId?: string): Promise<ContentVersion[]> {
    let query = requireSupabase().from('content_versions').select('*').order('created_at', { ascending: false }).limit(200);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    const { data, error } = await query;
    if (error) throw error;
    const versions:ContentVersion[]=(data ?? []).map((row: any) => ({
      id: row.id, entityType: row.entity_type, entityId: row.entity_id,
      versionNumber: row.version_number, snapshot: row.snapshot, changeAction: row.change_action,
      changedBy: row.changed_by ?? undefined, createdAt: row.created_at,
    }));
    const actorIds=[...new Set(versions.map(version=>version.changedBy).filter((value):value is string=>Boolean(value)))];
    if(actorIds.length){const{data:profiles}=await requireSupabase().from('profiles').select('id,full_name,email').in('id',actorIds);const names=new Map((profiles??[]).map((profile:any)=>[profile.id,profile.full_name||profile.email||profile.id]));for(const version of versions)if(version.changedBy)version.changedByName=names.get(version.changedBy);}
    return versions;
  }

  async restoreVersion(versionId: string): Promise<void> {
    const { error } = await requireSupabase().rpc('restore_content_version', { p_version_id: versionId });
    if (error) throw error;
  }

  async permanentlyDelete(entityType: 'course' | 'lesson' | 'page' | 'lesson_block', entityId: string): Promise<boolean> {
    const { data, error } = await requireSupabase().rpc('owner_permanently_delete_content', {
      p_entity_type: entityType, p_entity_id: entityId,
    });
    if (error) throw error;
    return Boolean(data);
  }

  async listFeatureFlags(): Promise<FeatureFlagRecord[]> {
    const { data, error } = await requireSupabase().from('feature_flags').select('*').order('key');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      key: row.key, enabled: row.enabled, descriptionAr: row.description_ar ?? undefined,
      config: row.config ?? {}, updatedAt: row.updated_at,
    }));
  }

  async updateFeatureFlag(key: string, enabled: boolean): Promise<void> {
    const client = requireSupabase();
    const userId = (await client.auth.getUser()).data.user?.id ?? null;
    const { error } = await client.from('feature_flags').update({ enabled, updated_by: userId }).eq('key', key);
    if (error) throw error;
  }

  async exportCourse(courseId: string): Promise<Record<string, unknown>> {
    const { data, error } = await requireSupabase().rpc('export_course', { p_course_id: courseId });
    if (error) throw error;
    return data as Record<string, unknown>;
  }

  async importCourse(payload: unknown): Promise<string> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('ملف JSON غير صالح.');
    const { data, error } = await requireSupabase().rpc('import_course', { p_payload: payload });
    if (error) throw error;
    return String(data);
  }
}

export const ownerCmsService = new OwnerCmsService();
