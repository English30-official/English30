import { StudentProfile, LevelCode, SubscriptionStatus, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

type StudentsListener=(students:StudentProfile[])=>void;
const mapStatus=(s:string|undefined):SubscriptionStatus=>s==='trialing'?'trial':(s as SubscriptionStatus)||'expired';

class StudentsService{
 private students:StudentProfile[]=[]; private listeners=new Set<StudentsListener>();
 private async load():Promise<StudentProfile[]>{
  if(!isSupabaseConfigured)return [...this.students]; const db=getSupabaseClient();
  const [p,r,s]=await Promise.all([db.from('profiles').select('id,full_name,email,phone_number,level,is_suspended,xp_points,streak_days,last_active_at,created_at').order('created_at',{ascending:false}),db.from('user_roles').select('user_id,role'),db.from('subscriptions').select('user_id,status,ends_at,plans(name)').order('created_at',{ascending:false})]);
  if(p.error)throw p.error;if(r.error)throw r.error;if(s.error)throw s.error;
  const roles=new Map((r.data??[]).map((x:{user_id:string;role:UserRole})=>[x.user_id,x.role])); const subs=new Map<string,any>(); for(const x of (s.data??[]) as any[])if(!subs.has(x.user_id))subs.set(x.user_id,x);
  this.students=(p.data??[] as any[]).map(x=>{const sub=subs.get(x.id);const plan=Array.isArray(sub?.plans)?sub?.plans[0]:sub?.plans;return {id:x.id,fullName:x.full_name??'',email:x.email??'',phoneNumber:x.phone_number??undefined,role:roles.get(x.id)??'student',level:(x.level as LevelCode)??'A1',subscriptionStatus:mapStatus(sub?.status),subscriptionPlanName:plan?.name??undefined,subscriptionExpiresAt:sub?.ends_at??undefined,xpPoints:x.xp_points??0,streakDays:x.streak_days??0,completedLessonsCount:0,registeredAt:x.created_at,lastActiveAt:x.last_active_at??x.created_at,isSuspended:x.is_suspended??false};});
  this.notify();return [...this.students];
 }
 public async getStudents(q?:string,level?:LevelCode,status?:SubscriptionStatus){let list=await this.load();const term=q?.trim().toLowerCase();if(term)list=list.filter(s=>s.fullName.toLowerCase().includes(term)||s.email.toLowerCase().includes(term)||(s.phoneNumber?.includes(term)??false));if(level)list=list.filter(s=>s.level===level);if(status)list=list.filter(s=>s.subscriptionStatus===status);return list;}
 public async getStudentById(id:string){return (await this.load()).find(s=>s.id===id)??null;}
 public async toggleStudentSuspension(id:string){if(!isSupabaseConfigured)throw new Error('Supabase is required for student management.');const current=await this.getStudentById(id);if(!current)return null;const {error}=await getSupabaseClient().from('profiles').update({is_suspended:!current.isSuspended}).eq('id',id);if(error)throw error;await this.load();return this.students.find(s=>s.id===id)??null;}
 public async updateStudentSubscription(id:string,status:SubscriptionStatus,planName:string,expiresAt:string){if(!isSupabaseConfigured)throw new Error('Supabase is required for subscription management.');const {data:plan,error:pe}=await getSupabaseClient().from('plans').select('id').eq('name',planName).maybeSingle();if(pe)throw pe;if(!plan)throw new Error('Plan not found.');const dbStatus=status==='trial'?'trialing':status;const {error}=await getSupabaseClient().from('subscriptions').upsert({user_id:id,plan_id:plan.id,status:dbStatus,ends_at:expiresAt},{onConflict:'user_id'});if(error)throw error;await this.load();return this.students.find(s=>s.id===id)??null;}
 public async getStatsSummary(){const list=await this.load();const active=list.filter(s=>s.subscriptionStatus==='active').length;const trial=list.filter(s=>s.subscriptionStatus==='trial').length;const expired=list.filter(s=>s.subscriptionStatus==='expired').length;return {totalStudents:list.length,activeSubscribers:active,trialUsers:trial,expiredSubscribers:expired,totalXP:list.reduce((n,s)=>n+s.xpPoints,0),conversionRate:list.length?Math.round(active/list.length*100):0};}
 public subscribe(listener:StudentsListener){this.listeners.add(listener);void this.load().then(listener).catch(console.error);return()=>this.listeners.delete(listener);}
 private notify(){const snapshot=[...this.students];this.listeners.forEach(l=>l(snapshot));}
}
export const studentsService=new StudentsService();