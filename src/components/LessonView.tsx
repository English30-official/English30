import React, { useEffect, useState } from 'react';
import { ActiveTab, Lesson, VocabItem, SentenceItem, FillInBlankQuestion, QuizQuestion } from '../types';
import { lessonsService, progressService } from '../services';
import { playAudioItem } from '../lib/speech';
import confetti from 'canvas-confetti';
import { Volume2, CheckCircle2, ArrowRight, Film, Play } from 'lucide-react';

interface LessonViewProps { lesson?: Lesson; courseId?: string; setActiveTab: (tab: ActiveTab) => void; onLessonCompleted: (xpEarned: number) => void; }

export const LessonView: React.FC<LessonViewProps> = ({ lesson: providedLesson, courseId, setActiveTab, onLessonCompleted }) => {
  const [lesson, setLesson] = useState<Lesson | null>(providedLesson ?? null);
  const [loading, setLoading] = useState(!providedLesson); const [loadError, setLoadError] = useState('');
  const [activeStep, setActiveStep] = useState<'explanation'|'video'|'vocab'|'sentences'|'grammar'|'fill-blank'|'quiz'|'final-test'|'completed'>('explanation');
  const [speakingId, setSpeakingId] = useState<string|null>(null); const [fibAnswers,setFibAnswers]=useState<Record<string,string>>({}); const [showFibResults,setShowFibResults]=useState(false); const [answers,setAnswers]=useState<Record<string,number>>({}); const [showResults,setShowResults]=useState(false); const [finalAnswers,setFinalAnswers]=useState<Record<string,number>>({});

  useEffect(()=>{
    if(providedLesson){setLesson(providedLesson);setLoading(false);return;}
    let mounted=true;
    const load=async()=>{
      setLoading(true); setLoadError('');
      try { const data=await lessonsService.getLessons(courseId,'published'); if(mounted)setLesson(data[0]??null); }
      catch(e){if(mounted)setLoadError(e instanceof Error?e.message:'تعذر تحميل الدرس.');}
      finally{if(mounted)setLoading(false);}
    };
    void load();
    return()=>{mounted=false;};
  },[providedLesson,courseId]);

  const play=async(text:string,id:string)=>{setSpeakingId(id);try{await playAudioItem(text,undefined,false);}finally{setSpeakingId(null);}};
  const quizScore=(items:QuizQuestion[],values:Record<string,number>)=>items.reduce((n,q)=>n+(values[q.id]===q.correctAnswerIndex?1:0),0);
  const finish=async()=>{
    if(!lesson)return;
    try {
      await progressService.saveLessonProgress({lessonId:lesson.id,isCompleted:true,watchedSeconds:lesson.durationMinutes*60,watchPercentage:100});
      await progressService.syncCourseProgress(lesson.courseId);
    } catch(error) {
      console.error('Unable to persist lesson progress',error);
    }
    confetti({particleCount:120,spread:70,origin:{y:.6}});onLessonCompleted(100);setActiveStep('completed');
  };

  if(loading)return <div className="max-w-4xl mx-auto py-20 text-center text-sm text-slate-500">جاري تحميل الدرس...</div>;
  if(loadError)return <div className="max-w-4xl mx-auto py-20 text-center"><div className="bg-red-50 text-red-700 p-5 rounded-2xl">{loadError}</div></div>;
  if(!lesson)return <div className="max-w-4xl mx-auto py-20 text-center space-y-4"><div className="text-5xl">📚</div><h2 className="text-xl font-black">لا يوجد درس منشور بعد</h2><p className="text-sm text-slate-500">يمكنك إنشاء الدروس من لوحة المالك.</p><button onClick={()=>setActiveTab('courses')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold">استعراض الدورات</button></div>;
  const steps:[typeof activeStep,string][]=[['explanation','📖 الشرح'],['video','🎬 الفيديو'],['vocab',`🔤 المفردات (${lesson.vocabList.length})`],['sentences','💬 الجمل'],['grammar','📐 القاعدة'],['fill-blank','✍️ التدريب'],['quiz',`📝 الاختبار (${lesson.quizQuestions.length})`],['final-test','🏆 الاختبار النهائي']];
  return <div className="max-w-4xl mx-auto space-y-8 py-6" dir="rtl">
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><button onClick={()=>setActiveTab('courses')} className="flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowRight className="w-4 h-4"/>العودة للدورات</button><span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">مستوى {lesson.level} · الوحدة {lesson.unitNumber} · {lesson.durationMinutes} دقيقة</span></div><h1 className="text-2xl sm:text-3xl font-black">{lesson.titleAr}</h1><p className="text-sm font-semibold text-slate-500 font-english">{lesson.titleEn}</p><div className="flex gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">{steps.map(([id,label])=><button key={id} onClick={()=>setActiveStep(id)} className={`px-3 py-2 rounded-xl shrink-0 text-xs font-bold ${activeStep===id?'bg-slate-900 text-white':'bg-slate-100 text-slate-600'}`}>{label}</button>)}</div></div>
    {activeStep==='explanation'&&<section className="bg-white p-7 rounded-3xl border space-y-5"><h2 className="text-xl font-black">شرح الدرس</h2><p className="leading-8 text-slate-700">{lesson.summaryAr}</p><div className="bg-indigo-50 p-5 rounded-2xl"><h3 className="font-black mb-2">الشرح بالعربية</h3><p className="text-sm leading-7">{lesson.arabicExplanation||'لم تتم إضافة الشرح بعد.'}</p></div><button onClick={()=>setActiveStep('video')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold">ابدأ</button></section>}
    {activeStep==='video'&&<section className="bg-slate-950 rounded-3xl overflow-hidden"><div className="aspect-video flex items-center justify-center text-white">{lesson.videoUrl?<video controls src={lesson.videoUrl} className="w-full h-full"/>:<div className="text-center"><Film className="w-12 h-12 mx-auto text-indigo-400 mb-3"/><p className="font-bold">لم يُرفع فيديو لهذا الدرس بعد</p><p className="text-xs text-slate-400 mt-1">يمكن للمالك رفع الفيديو من لوحة التحكم.</p></div>}</div></section>}
    {activeStep==='vocab'&&<section className="grid sm:grid-cols-2 gap-4">{lesson.vocabList.map((v:VocabItem)=><article key={v.id} className="bg-white p-5 rounded-2xl border"><div className="flex items-center justify-between"><strong className="font-english text-lg">{v.word}</strong><button onClick={()=>void play(v.word,v.id)} disabled={speakingId===v.id} className="p-2 rounded-lg bg-indigo-50 text-indigo-700"><Volume2 className="w-4 h-4"/></button></div><p className="text-sm text-slate-600 mt-2">{v.arabic}</p><p className="text-xs text-slate-500 mt-2 font-english">{v.exampleEn}</p></article>)}</section>}
    {activeStep==='sentences'&&<section className="bg-white p-7 rounded-3xl border space-y-3">{(lesson.sentencesList??[]).map((s:SentenceItem)=><div key={s.id} className="p-4 bg-slate-50 rounded-xl"><p className="font-english">{s.en}</p><p className="text-xs text-slate-500 mt-1">{s.ar}</p></div>)}</section>}
    {activeStep==='grammar'&&<section className="bg-white p-7 rounded-3xl border space-y-4"><h2 className="text-xl font-black">القواعد</h2>{lesson.grammarRules.map((g,i)=><div key={i} className="bg-indigo-50 p-5 rounded-2xl"><h3 className="font-black">{g.titleAr}</h3><p className="text-sm leading-7 mt-2">{g.explanationAr}</p>{g.formulaEn&&<p className="font-english mt-2">{g.formulaEn}</p>}</div>)}</section>}
    {activeStep==='fill-blank'&&<section className="bg-white p-7 rounded-3xl border space-y-4"><h2 className="text-xl font-black">التدريب</h2>{(lesson.fillInBlankQuestions??[]).map((q:FillInBlankQuestion)=><div key={q.id} className="p-4 border rounded-xl"><p className="font-english">{q.sentenceWithBlank}</p><input value={fibAnswers[q.id]??''} onChange={e=>setFibAnswers(p=>({...p,[q.id]:e.target.value}))} className="mt-3 border rounded-lg px-3 py-2"/><p className="text-xs text-slate-500 mt-2">{showFibResults?`الإجابة الصحيحة: ${q.correctAnswer}`:''}</p></div>)}<button onClick={()=>setShowFibResults(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold">تحقق</button></section>}
    {activeStep==='quiz'&&<section className="bg-white p-7 rounded-3xl border space-y-5"><h2 className="text-xl font-black">اختبار الدرس</h2>{lesson.quizQuestions.map((q:QuizQuestion)=><div key={q.id} className="space-y-2"><p className="font-bold">{q.questionAr||q.questionEn}</p>{q.questionEn&&<p className="font-english text-sm text-slate-500">{q.questionEn}</p>}{q.options.map((o,j)=><button key={j} onClick={()=>!showResults&&setAnswers(p=>({...p,[q.id]:j}))} className={`block w-full text-right p-3 rounded-xl border text-sm ${answers[q.id]===j?'border-indigo-600 bg-indigo-50':''}`}>{o}</button>)}</div>)}<button onClick={()=>setShowResults(true)} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold">إظهار النتيجة ({quizScore(lesson.quizQuestions,answers)}/{lesson.quizQuestions.length})</button></section>}
    {activeStep==='final-test'&&<section className="bg-white p-7 rounded-3xl border space-y-5"><h2 className="text-xl font-black">الاختبار النهائي</h2>{lesson.finalMiniTest?.questions?.map((q:QuizQuestion)=><div key={q.id} className="space-y-2"><p className="font-bold">{q.questionAr||q.questionEn}</p>{q.options.map((o,j)=><button key={j} onClick={()=>setFinalAnswers(p=>({...p,[q.id]:j}))} className={`block w-full text-right p-3 rounded-xl border ${finalAnswers[q.id]===j?'border-indigo-600 bg-indigo-50':''}`}>{o}</button>)}</div>)}<button onClick={()=>void finish()} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold"><Play className="inline w-4 h-4 ml-1"/>إنهاء الدرس</button></section>}
    {activeStep==='completed'&&<section className="bg-white p-10 rounded-3xl border text-center space-y-4"><CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500"/><h2 className="text-2xl font-black">أحسنت! أكملت الدرس</h2><p className="text-slate-500">تم حفظ إكمال الدرس في حسابك عند تسجيل الدخول.</p><button onClick={()=>setActiveTab('courses')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold">العودة للدورات</button></section>}
  </div>;
};
