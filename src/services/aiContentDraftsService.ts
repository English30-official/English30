import { AIGenerationDraft, LevelCode } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

class AIContentDraftsService {
  async list(status?: AIGenerationDraft['status']): Promise<AIGenerationDraft[]> {
    if (!isSupabaseConfigured) return [];
    let query = getSupabaseClient().from('ai_content_drafts').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      targetType: row.target_type,
      titleAr: row.title_ar,
      prompt: row.prompt,
      level: row.level as LevelCode,
      content: row.content,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  async create(input: Omit<AIGenerationDraft, 'id' | 'createdAt' | 'status'>): Promise<AIGenerationDraft> {
    const user = await getSupabaseClient().auth.getUser();
    if (user.error) throw user.error;
    const { data, error } = await getSupabaseClient().from('ai_content_drafts').insert({
      created_by: user.data.user?.id ?? null,
      target_type: input.targetType,
      title_ar: input.titleAr,
      prompt: input.prompt,
      level: input.level,
      content: input.content ?? {},
      status: 'draft',
    }).select('*').single();
    if (error) throw error;
    return { id: data.id, targetType: data.target_type, titleAr: data.title_ar, prompt: data.prompt, level: data.level, content: data.content, status: data.status, createdAt: data.created_at };
  }

  async updateStatus(id: string, status: AIGenerationDraft['status']): Promise<void> {
    const { error } = await getSupabaseClient().from('ai_content_drafts').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabaseClient().from('ai_content_drafts').delete().eq('id', id);
    if (error) throw error;
  }
}

export const aiContentDraftsService = new AIContentDraftsService();
