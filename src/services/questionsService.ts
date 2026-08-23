import { BankQuestion, LevelCode } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

type QuestionsListener = (questions: BankQuestion[]) => void;

type QuestionRow = { id:string; type:BankQuestion['type']; level:LevelCode; category:string; prompt_en:string; prompt_ar:string|null; correct_option_key:string|null; explanation_ar:string; audio_url:string|null; tags:string[]|null; created_at:string };
type OptionRow = { question_id:string; option_key:string; text_en:string; text_ar:string|null; sort_order:number };

class QuestionsService {
  private questions: BankQuestion[] = [];
  private listeners = new Set<QuestionsListener>();

  public async getQuestions(filters?: { level?: LevelCode; category?: string }): Promise<BankQuestion[]> {
    if (!isSupabaseConfigured) return [...this.questions];
    let query = getSupabaseClient().from('question_bank').select('*, question_bank_options(*)').order('created_at', { ascending:false });
    if (filters?.level) query = query.eq('level', filters.level);
    if (filters?.category) query = query.eq('category', filters.category);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Array<QuestionRow & { question_bank_options?: OptionRow[] }>;
    this.questions = rows.map(row => ({
      id:row.id, type:row.type, level:row.level, category:row.category, promptEn:row.prompt_en,
      promptAr:row.prompt_ar ?? undefined, correctOptionKey:row.correct_option_key ?? '', explanationAr:row.explanation_ar,
      audioUrl:row.audio_url ?? undefined, tags:row.tags ?? [], createdAt:row.created_at,
      options:(row.question_bank_options ?? []).sort((a,b)=>a.sort_order-b.sort_order).map(o=>({key:o.option_key,textEn:o.text_en,textAr:o.text_ar ?? undefined}))
    }));
    this.notify();
    return [...this.questions];
  }

  public async createQuestion(data: Omit<BankQuestion,'id'|'createdAt'>): Promise<BankQuestion> {
    if (!isSupabaseConfigured) throw new Error('Supabase is required to manage the question bank.');
    const { data:row, error } = await getSupabaseClient().from('question_bank').insert({ type:data.type,level:data.level,category:data.category,prompt_en:data.promptEn,prompt_ar:data.promptAr??null,correct_option_key:data.correctOptionKey,explanation_ar:data.explanationAr,audio_url:data.audioUrl??null,tags:data.tags??[] }).select('*').single();
    if (error) throw error;
    const { error:optionError } = await getSupabaseClient().from('question_bank_options').insert(data.options.map((o,index)=>({question_id:row.id,option_key:o.key,text_en:o.textEn,text_ar:o.textAr??null,sort_order:index})));
    if (optionError) throw optionError;
    await this.getQuestions();
    return {...data,id:row.id,createdAt:row.created_at};
  }

  public async updateQuestion(id:string,data:Partial<BankQuestion>):Promise<BankQuestion|null>{
    if(!isSupabaseConfigured) throw new Error('Supabase is required to manage the question bank.');
    const updates:Record<string,unknown>={};
    if(data.type) updates.type=data.type; if(data.level) updates.level=data.level; if(data.category) updates.category=data.category;
    if(data.promptEn!==undefined) updates.prompt_en=data.promptEn; if(data.promptAr!==undefined) updates.prompt_ar=data.promptAr??null;
    if(data.correctOptionKey!==undefined) updates.correct_option_key=data.correctOptionKey; if(data.explanationAr!==undefined) updates.explanation_ar=data.explanationAr;
    if(data.audioUrl!==undefined) updates.audio_url=data.audioUrl??null; if(data.tags!==undefined) updates.tags=data.tags;
    const {error}=await getSupabaseClient().from('question_bank').update(updates).eq('id',id); if(error) throw error;
    if(data.options){ await getSupabaseClient().from('question_bank_options').delete().eq('question_id',id); const {error:e}=await getSupabaseClient().from('question_bank_options').insert(data.options.map((o,index)=>({question_id:id,option_key:o.key,text_en:o.textEn,text_ar:o.textAr??null,sort_order:index}))); if(e) throw e; }
    await this.getQuestions(); return this.questions.find(q=>q.id===id)??null;
  }

  public async deleteQuestion(id:string):Promise<boolean>{ if(!isSupabaseConfigured) throw new Error('Supabase is required to manage the question bank.'); const {error}=await getSupabaseClient().from('question_bank').delete().eq('id',id); if(error) throw error; await this.getQuestions(); return true; }
  public subscribe(listener:QuestionsListener):()=>void{ this.listeners.add(listener); void this.getQuestions().then(listener).catch(console.error); return ()=>this.listeners.delete(listener); }
  private notify(){const snapshot=[...this.questions]; this.listeners.forEach(l=>l(snapshot));}
}
export const questionsService=new QuestionsService();