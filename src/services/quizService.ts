import { QuizQuestion } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export type QuizAnswers = Record<string, number>;
export interface RuntimeQuizOption { id:string; text:string; sortOrder:number; }
export interface RuntimeQuizQuestion { id:string; text:string; points:number; sortOrder:number; options:RuntimeQuizOption[]; }
export interface RuntimeQuiz { id:string; lessonId:string; title:string; description?:string; passingScore:number; maxAttempts?:number; isFinal:boolean; questions:RuntimeQuizQuestion[]; }
export interface QuizAttemptResult { attemptId:string; score:number; passed:boolean; }

export class QuizService {
  score(questions: QuizQuestion[], answers: QuizAnswers): number {
    return questions.reduce((score, question) => score + (answers[question.id] === question.correctAnswerIndex ? 1 : 0), 0);
  }
  isComplete(questions: QuizQuestion[], answers: QuizAnswers): boolean {
    return questions.every((question) => answers[question.id] !== undefined);
  }
  async loadPublishedForLesson(lessonId:string):Promise<RuntimeQuiz|null>{
    if(!isSupabaseConfigured)return null;
    const client=getSupabaseClient();
    const {data:quiz,error}=await client.from('quizzes').select('id').eq('lesson_id',lessonId).eq('status','published').eq('is_active',true).maybeSingle();
    if(error)throw error;if(!quiz)return null;
    const {data,error:rpcError}=await client.rpc('get_quiz_for_attempt',{p_quiz_id:quiz.id});if(rpcError)throw rpcError;
    return data as RuntimeQuiz;
  }
  async submitAttempt(quizId:string,answers:Record<string,string>):Promise<QuizAttemptResult>{
    if(!isSupabaseConfigured)throw new Error('Supabase is required to submit this quiz.');
    const {data,error}=await getSupabaseClient().rpc('submit_quiz_attempt',{p_quiz_id:quizId,p_answers:answers});if(error)throw error;
    return data as QuizAttemptResult;
  }
}
export const quizService = new QuizService();
