import React, { useState } from 'react';
import { ActiveTab, Lesson, VocabItem, SentenceItem, FillInBlankQuestion, QuizQuestion } from '../types';
import { SAMPLE_LESSON } from '../data/mockData';
import { playAudioItem } from '../lib/speech';
import { useAuth } from '../auth/AuthContext';
import { useQuizEngine } from '../hooks/useQuizEngine';
import { progressService } from '../services/progressService';
import { LessonVideoPlayer } from './video/LessonVideoPlayer';
import confetti from 'canvas-confetti';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Check,
  RefreshCw,
  Video,
  Clock,
  Film,
  List,
} from 'lucide-react';

interface LessonViewProps {
  lesson?: Lesson;
  setActiveTab: (tab: ActiveTab) => void;
  onLessonCompleted: (xpEarned: number) => void;
}

export const LessonView: React.FC<LessonViewProps> = ({
  lesson = SAMPLE_LESSON,
  setActiveTab,
  onLessonCompleted,
}) => {
  const [activeLessonStep, setActiveLessonStep] = useState<
    'explanation' | 'video' | 'vocab' | 'sentences' | 'grammar' | 'fill-blank' | 'quiz' | 'final-test' | 'completed'
  >('explanation');

  const { user } = useAuth();

  // Audio Speech state
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Fill in the blanks state
  const [fibAnswers, setFibAnswers] = useState<{ [key: string]: string }>({});
  const [showFibResults, setShowFibResults] = useState(false);

  const quiz = useQuizEngine(lesson.quizQuestions);
  const finalTest = useQuizEngine(lesson.finalMiniTest?.questions ?? []);

  const handlePlayAudio = async (text: string, id: string, slow: boolean = false) => {
    setSpeakingId(id);
    await playAudioItem(text, undefined, slow);
    setSpeakingId(null);
  };

  const handleSelectQuizAnswer = (qId: string, optionIndex: number) => {
    quiz.selectAnswer(qId, optionIndex);
  };

  const handleSelectFinalAnswer = (qId: string, optionIndex: number) => {
    finalTest.selectAnswer(qId, optionIndex);
  };

  const handleFinishLesson = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });
    onLessonCompleted(100);
    progressService.completeLesson(lesson.id, 100, user?.id);
    setActiveLessonStep('completed');
  };

  const calculateQuizScore = () => quiz.score;
  const calculateFinalTestScore = () => finalTest.score;

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Top Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setActiveTab('content-engine')}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمكتبة المجموعات</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 font-extrabold">
              مستوى {lesson.level}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
              الوحدة {lesson.unitNumber}
            </span>
            <span className="text-slate-500">⏱️ {lesson.durationMinutes} دقيقة</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug">
            {lesson.titleAr}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 font-english mt-0.5">
            {lesson.titleEn}
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-slate-100 text-xs font-bold">
          <button
            onClick={() => setActiveLessonStep('explanation')}
            className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer ${
              activeLessonStep === 'explanation'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📖 الشرح العام
          </button>

          <button
            onClick={() => setActiveLessonStep('video')}
            className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeLessonStep === 'video'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>🎬 الشرح المرئي</span>
          </button>

          <button
            onClick={() => setActiveLessonStep('vocab')}
            className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer ${
              activeLessonStep === 'vocab'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔤 المفردات ({lesson.vocabList.length})
          </button>

          {lesson.sentencesList && lesson.sentencesList.length > 0 && (
            <button
              onClick={() => setActiveLessonStep('sentences')}
              className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer ${
                activeLessonStep === 'sentences'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              💬 الجمل ({lesson.sentencesList.length})
            </button>
          )}

          {lesson.fillInBlankQuestions && lesson.fillInBlankQuestions.length > 0 && (
            <button
              onClick={() => setActiveLessonStep('fill-blank')}
              className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer ${
                activeLessonStep === 'fill-blank'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✏️ تمارين الفراغات ({lesson.fillInBlankQuestions.length})
            </button>
          )}

          <button
            onClick={() => setActiveLessonStep('grammar')}
            className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer ${
              activeLessonStep === 'grammar'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            💡 القواعد
          </button>

          <button
            onClick={() => setActiveLessonStep('quiz')}
            className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer ${
              activeLessonStep === 'quiz'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            ✍️ التمارين ({lesson.quizQuestions.length})
          </button>

          {lesson.finalMiniTest && (
            <button
              onClick={() => setActiveLessonStep('final-test')}
              className={`px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer font-black ${
                activeLessonStep === 'final-test'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              🏁 الاختبار النهائي
            </button>
          )}
        </div>

      </div>

      {/* STEP 1: ARABIC EXPLANATION */}
      {activeLessonStep === 'explanation' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100 text-indigo-900 text-xs sm:text-sm leading-relaxed">
            <strong className="block text-indigo-950 mb-1">ملخص المجموعة بسرعة:</strong>
            {lesson.summaryAr}
          </div>

          <div className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-base leading-relaxed space-y-4">
            <div className="whitespace-pre-line leading-relaxed">
              {lesson.arabicExplanation}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setActiveLessonStep('video')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>الانتقال لمشاهدة الشرح المرئي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RECORDED LESSON VIDEO */}
      {activeLessonStep === 'video' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs">
                  🎬 الشرح المرئي
                </span>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  {lesson.videoDuration || '08:45'} دقيقة
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {lesson.videoTitleAr || `الشرح المرئي لدرس: ${lesson.titleAr}`}
              </h2>
            </div>
          </div>

          {/* Video Container & Player */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg group">
            <LessonVideoPlayer url={lesson.videoUrl} title={lesson.videoTitleAr || lesson.titleAr} />
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveLessonStep('explanation')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              السابق: الشرح العام
            </button>
            <button
              onClick={() => setActiveLessonStep('vocab')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>الانتقال لمفردات الدرس</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: VOCABULARY LIST WITH CEFR BADGES & DUAL AUDIO */}
      {activeLessonStep === 'vocab' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                مفردات الدرس ({lesson.vocabList.length} كلمة)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اضغط على زر 🔊 للكلمة أو للجملة لاستماع النطق الإنجليزي الواضح
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
              مستوى CEFR: {lesson.level}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lesson.vocabList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-3 hover:border-indigo-300 transition-colors shadow-2xs"
              >
                {/* Word Header & Audio Buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-900 font-english">
                        {item.word}
                      </span>
                      {item.partOfSpeech && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-bold text-[10px]">
                          {item.partOfSpeech}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold text-[10px]">
                        {item.level || lesson.level}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-english font-medium block">
                      {item.phonetic}
                    </span>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePlayAudio(item.word, item.id, false)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      title="استمع لنطق الكلمة"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold">🔊 كلمة</span>
                    </button>

                    <button
                      onClick={() => handlePlayAudio(item.word, item.id + '-slow', true)}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      title="نطق بطيء"
                    >
                      🐢 بطيء
                    </button>
                  </div>
                </div>

                {/* Meaning & Example Sentence */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <div className="font-extrabold text-indigo-950 text-sm">🇸🇦 {item.arabic}</div>

                  <div className="p-2.5 bg-slate-50/90 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-800 font-english font-semibold italic">
                        "{item.exampleEn}"
                      </p>
                      <button
                        onClick={() => handlePlayAudio(item.exampleEn, item.id + '-ex')}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border border-indigo-200 shrink-0"
                        title="استمع للجملة كاملة"
                      >
                        🔊 جملة
                      </button>
                    </div>
                    <p className="text-slate-500 text-[11px]">{item.exampleAr}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveLessonStep('video')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              السابق: الشرح المرئي
            </button>
            <button
              onClick={() =>
                setActiveLessonStep(
                  lesson.sentencesList && lesson.sentencesList.length > 0 ? 'sentences' : 'grammar'
                )
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>التالي: الجمل والمحادثات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SENTENCES & AUDIO LISTENING */}
      {activeLessonStep === 'sentences' && lesson.sentencesList && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                الجمل والعبارات الشائعة ({lesson.sentencesList.length} جملة)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                استمع إلى نطق الجمل الإنجليزية بوضوح وكررها بصوتك لترسيخ التحدث
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {lesson.sentencesList.map((sen, idx) => (
              <div
                key={sen.id}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="font-extrabold text-slate-900 font-english text-sm sm:text-base">
                      "{sen.en}"
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 pr-8">{sen.ar}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePlayAudio(sen.en, sen.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>🔊 استمع للجملة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveLessonStep('vocab')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              السابق: المفردات
            </button>
            <button
              onClick={() =>
                setActiveLessonStep(
                  lesson.fillInBlankQuestions && lesson.fillInBlankQuestions.length > 0
                    ? 'fill-blank'
                    : 'grammar'
                )
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>التالي: تمارين الفراغات</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: FILL IN THE BLANKS EXERCISES */}
      {activeLessonStep === 'fill-blank' && lesson.fillInBlankQuestions && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                تمارين إكمال الفراغات (Fill in the Blanks)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر الكلمة المناسبة لإكمال الجملة بالشكل الصحيح
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {lesson.fillInBlankQuestions.map((fib, idx) => {
              const selectedOpt = fibAnswers[fib.id];

              return (
                <div key={fib.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-slate-900 font-english dir-ltr">
                        {fib.sentenceWithBlank}
                      </h3>
                      <p className="text-xs text-slate-500">🇸🇦 {fib.translationAr}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {fib.options.map((opt) => {
                      const isSelected = selectedOpt === opt;
                      let style = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100';

                      if (showFibResults) {
                        if (opt === fib.correctAnswer) {
                          style = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                        } else if (isSelected) {
                          style = 'bg-rose-100 border-rose-300 text-rose-950';
                        }
                      } else if (isSelected) {
                        style = 'bg-indigo-600 text-white border-indigo-600 font-bold';
                      }

                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            if (!showFibResults) {
                              setFibAnswers((prev) => ({ ...prev, [fib.id]: opt }));
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-bold font-english transition-all cursor-pointer ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {showFibResults && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                      💡 <strong>التوضيح:</strong> {fib.explanationAr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveLessonStep('sentences')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              السابق: الجمل
            </button>

            {!showFibResults ? (
              <button
                onClick={() => setShowFibResults(true)}
                disabled={Object.keys(fibAnswers).length < lesson.fillInBlankQuestions.length}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm cursor-pointer"
              >
                التحقق من الإجابات
              </button>
            ) : (
              <button
                onClick={() => setActiveLessonStep('grammar')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
              >
                <span>الانتقال للقواعد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 6: GRAMMAR RULES */}
      {activeLessonStep === 'grammar' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-xl font-bold text-slate-900">القواعد والتطبيقات النحوية</h2>

          <div className="space-y-6">
            {lesson.grammarRules.map((rule, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h3 className="font-bold text-lg text-slate-900">{rule.titleAr}</h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-600">{rule.explanationAr}</p>

                {rule.formulaEn && (
                  <div className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl font-english">
                    💡 الصيغة النحوية: {rule.formulaEn}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">أمثلة توضيحية:</h4>
                  {rule.examples.map((ex, exIdx) => (
                    <div key={exIdx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="font-bold text-slate-900 font-english">
                        • {ex.en}
                      </div>
                      <div className="text-slate-600">{ex.ar}</div>
                      {ex.noteAr && (
                        <div className="text-indigo-600 text-[11px]">ملاحظة: {ex.noteAr}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveLessonStep('vocab')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              السابق: المفردات
            </button>
            <button
              onClick={() => setActiveLessonStep('quiz')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>الانتقال للتمارين التفاعلية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: MULTIPLE CHOICE QUIZ */}
      {activeLessonStep === 'quiz' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">التمارين والأسئلة التفاعلية</h2>
              <p className="text-xs text-slate-500 mt-0.5">اختبر مدى فهمك لمحتوى الدرس واستحق مكافأة XP</p>
            </div>
            {quiz.showResults && (
              <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-800 rounded-lg">
                النتيجة: {calculateQuizScore()} / {lesson.quizQuestions.length}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {lesson.quizQuestions.map((q, qIdx) => {
              const selectedOpt = quiz.answers[q.id];

              return (
                <div key={q.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{q.questionAr}</h3>
                      {q.questionEn && (
                        <p className="text-sm font-semibold text-slate-700 font-english mt-1">
                          "{q.questionEn}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {q.options.map((opt, optIdx) => {
                      let btnStyle = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100';

                      if (quiz.showResults) {
                        if (optIdx === q.correctAnswerIndex) {
                          btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                        } else if (selectedOpt === optIdx) {
                          btnStyle = 'bg-rose-100 border-rose-300 text-rose-950';
                        }
                      } else if (selectedOpt === optIdx) {
                        btnStyle = 'bg-indigo-600 text-white border-indigo-600 font-bold';
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectQuizAnswer(q.id, optIdx)}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-medium text-right transition-all font-english cursor-pointer ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quiz.showResults && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                      💡 <strong>التوضيح:</strong> {q.explanationAr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {!quiz.showResults ? (
              <button
                onClick={() => quiz.setShowResults(true)}
                disabled={Object.keys(quiz.answers).length < lesson.quizQuestions.length}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm cursor-pointer"
              >
                التحقق من الإجابات
              </button>
            ) : (
              <button
                onClick={() =>
                  setActiveLessonStep(lesson.finalMiniTest ? 'final-test' : 'completed')
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>الانتقال للاختبار النهائي للمجموعة</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 8: FINAL MINI-TEST */}
      {activeLessonStep === 'final-test' && lesson.finalMiniTest && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-xs">
                🏁 الاختبار التقييمي النهائي
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                {lesson.finalMiniTest.titleAr}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lesson.finalMiniTest.descriptionAr}
              </p>
            </div>

            {finalTest.showResults && (
              <span className="text-sm font-black px-4 py-2 bg-emerald-100 text-emerald-900 rounded-xl">
                النتيجة: {calculateFinalTestScore()} / {lesson.finalMiniTest.questions.length}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {lesson.finalMiniTest.questions.map((q, qIdx) => {
              const selectedOpt = finalTest.answers[q.id];

              return (
                <div key={q.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{q.questionAr}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {q.options.map((opt, optIdx) => {
                      let btnStyle = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100';

                      if (finalTest.showResults) {
                        if (optIdx === q.correctAnswerIndex) {
                          btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                        } else if (selectedOpt === optIdx) {
                          btnStyle = 'bg-rose-100 border-rose-300 text-rose-950';
                        }
                      } else if (selectedOpt === optIdx) {
                        btnStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectFinalAnswer(q.id, optIdx)}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-medium text-right transition-all font-english cursor-pointer ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {finalTest.showResults && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed">
                      💡 <strong>التوضيح:</strong> {q.explanationAr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {!finalTest.showResults ? (
              <button
                onClick={() => finalTest.setShowResults(true)}
                disabled={Object.keys(finalTest.answers).length < lesson.finalMiniTest.questions.length}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm cursor-pointer shadow-md"
              >
                إنهاء الاختبار وعرض النتيجة
              </button>
            ) : (
              <button
                onClick={handleFinishLesson}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black px-8 py-3.5 rounded-xl text-sm shadow-md cursor-pointer flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>إكمال المجموعة والحصول على +100 XP 🎉</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* LESSON COMPLETED STATE */}
      {activeLessonStep === 'completed' && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-6 shadow-lg">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
            🎉
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">أحسنت! أكملت المجموعة التعليمية بنجاح</h2>
            <p className="text-slate-600 text-sm">
              تمت إضافة <strong className="text-emerald-600">+100 XP</strong> إلى حسابك وحفظ إنجازك اليومي.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setActiveTab('content-engine')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-sm cursor-pointer"
            >
              العودة لمكتبة المجموعات والدروس
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-sm cursor-pointer"
            >
              عرض لوحة التقدم والـ XP
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
