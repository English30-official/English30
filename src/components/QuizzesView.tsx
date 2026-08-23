import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { SAMPLE_LESSON } from '../data/mockData';
import confetti from 'canvas-confetti';
import {
  Award,
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';

interface QuizzesViewProps {
  onEarnXP: (xp: number) => void;
}

export const QuizzesView: React.FC<QuizzesViewProps> = ({ onEarnXP }) => {
  const [selectedCategory, setSelectedCategory] = useState<'grammar' | 'vocab' | 'listening'>('grammar');
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const questions = SAMPLE_LESSON.quizQuestions;

  const handleSelectOption = (qId: string, optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        score++;
      }
    });
    return score;
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const score = calculateScore();
    if (score > 0) {
      onEarnXP(score * 20);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
  };

  return (
    <div className="space-y-8 py-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
          <Award className="w-4 h-4 text-amber-400" />
          <span>مركز الاختبارات والتمارين التفاعلية</span>
        </div>
        <h1 className="text-3xl font-extrabold">اختبارات مراجعة المهارات النحوية واللغوية</h1>
        <p className="text-slate-300 text-sm max-w-xl">
          حل الاختبارات القصيرة اليومية لتأكيد استيعاب القواعد، كسب نقاط XP، ورفع ترتيبك في المنصة.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => { setSelectedCategory('grammar'); handleReset(); }}
          className={`px-5 py-3 rounded-2xl cursor-pointer transition-all ${
            selectedCategory === 'grammar'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          📖 اختبار القواعد (Grammar Quiz)
        </button>
        <button
          onClick={() => { setSelectedCategory('vocab'); handleReset(); }}
          className={`px-5 py-3 rounded-2xl cursor-pointer transition-all ${
            selectedCategory === 'vocab'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          🔤 اختبار المفردات (Vocab Test)
        </button>
        <button
          onClick={() => { setSelectedCategory('listening'); handleReset(); }}
          className={`px-5 py-3 rounded-2xl cursor-pointer transition-all ${
            selectedCategory === 'listening'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          🎧 اختبار الاستماع (Listening Test)
        </button>
      </div>

      {/* Questions Card Container */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {selectedCategory === 'grammar' && 'اختبار أزمنة المضارع البسيط والمستمر'}
              {selectedCategory === 'vocab' && 'اختبار مفردات الروتين والعادات'}
              {selectedCategory === 'listening' && 'اختبار الاستماع والتمييز النطقي'}
            </h2>
            <p className="text-xs text-slate-500">أجب على جميع الأسئلة ثم اضغط على زر التسليم</p>
          </div>

          {isSubmitted && (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl font-bold text-xs flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>النتيجة: {calculateScore()} / {questions.length} (+{calculateScore() * 20} XP)</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userSelected = selectedAnswers[q.id];
            const isAnswered = userSelected !== undefined;

            return (
              <div key={q.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
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
                    let style = 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100';

                    if (isSubmitted) {
                      if (optIdx === q.correctAnswerIndex) {
                        style = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                      } else if (userSelected === optIdx) {
                        style = 'bg-rose-100 border-rose-300 text-rose-950';
                      }
                    } else if (userSelected === optIdx) {
                      style = 'bg-indigo-600 text-white border-indigo-600 font-bold';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium text-right transition-all font-english cursor-pointer ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                    💡 <strong>التوضيح النحوي:</strong> {q.explanationAr}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length < questions.length}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs sm:text-sm shadow-md cursor-pointer"
            >
              تسليم الإجابات والتحقق 🎯
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الاختبار مرة أخرى</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

