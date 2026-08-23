import React, { useState } from 'react';
import { ActiveTab, LevelCode } from '../types';
import { PLACEMENT_QUESTIONS, LEVELS_DATA } from '../data/mockData';
import confetti from 'canvas-confetti';
import {
  Target,
  CheckCircle2,
  XCircle,
  Award,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface PlacementTestViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onPlacementComplete: (level: LevelCode) => void;
}

export const PlacementTestView: React.FC<PlacementTestViewProps> = ({
  setActiveTab,
  onPlacementComplete,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [qId: number]: number }>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = PLACEMENT_QUESTIONS[currentQuestionIndex];
  const totalQ = PLACEMENT_QUESTIONS.length;

  const handleSelectOption = (optIndex: number) => {
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: optIndex }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQ - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishTest();
    }
  };

  const calculateScore = () => {
    let score = 0;
    PLACEMENT_QUESTIONS.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswerIndex) {
        score++;
      }
    });
    return score;
  };

  const getCalculatedLevel = (score: number): LevelCode => {
    if (score <= 2) return 'A1';
    if (score <= 4) return 'A2';
    if (score <= 6) return 'B1';
    if (score <= 8) return 'B2';
    return 'C1';
  };

  const finishTest = () => {
    setIsCompleted(true);
    const score = calculateScore();
    const resultLevel = getCalculatedLevel(score);
    onPlacementComplete(resultLevel);
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const resetTest = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setIsCompleted(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
          <Target className="w-4 h-4 text-slate-950" />
          <span>اختبار تحديد المستوى التفاعلي</span>
        </div>
        <h1 className="text-3xl font-extrabold">اختبار مستوى اللغة الإنجليزية (A1 - C1)</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          أجب عن الأسئلة التالية بتركيز. النتيجة ستحدد مستواك الفعلي بدقة وتوصي بالخطة المعتمدة لمتابعتك.
        </p>
      </div>

      {!isCompleted ? (
        /* QUESTION CARD */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          
          {/* Progress Bar Header */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>السؤال {currentQuestionIndex + 1} من {totalQ}</span>
              <span className="text-indigo-600">مستوى السؤال: {currentQ.level}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQ) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Title */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-400">اختر الكلمة أو الصيغة الصحيحة لإكمال الجملة:</span>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 font-bold font-english text-lg sm:text-xl">
              "{currentQ.questionEn}"
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options.map((opt, idx) => {
              const isSelected = userAnswers[currentQ.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`p-4 rounded-2xl border text-right font-bold text-sm sm:text-base transition-all font-english cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.01]'
                      : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="ml-2 font-mono opacity-60">[{String.fromCharCode(65 + idx)}]</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Question Footer Navigation */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 disabled:opacity-30"
            >
              السؤال السابق
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={userAnswers[currentQ.id] === undefined}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold px-7 py-3 rounded-xl text-xs sm:text-sm shadow-sm cursor-pointer transition-all"
            >
              {currentQuestionIndex === totalQ - 1 ? 'إنهاء الاختبار وإظهار النتيجة' : 'السؤال التالي ➔'}
            </button>
          </div>

        </div>
      ) : (
        /* RESULT CARD */
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-lg text-center space-y-6">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-4xl shadow-sm">
            🏆
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900">نتيجة اختبار تحديد المستوى</h2>
            <p className="text-slate-600 text-sm">
              أجبت على <strong className="text-slate-900">{calculateScore()}</strong> إجابة صحيحة من أصل {totalQ} سؤالاً.
            </p>
          </div>

          {/* Level Result Box */}
          {(() => {
            const levelCode = getCalculatedLevel(calculateScore());
            const levelInfo = LEVELS_DATA.find((l) => l.code === levelCode)!;

            return (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-6 rounded-3xl border border-indigo-100 space-y-4 max-w-lg mx-auto text-right">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <span className="text-xs font-bold text-indigo-700">مستواك المقترح المقدر:</span>
                  <span className={`px-4 py-1.5 rounded-xl font-black text-sm border ${levelInfo.bgLight}`}>
                    مستوى {levelInfo.code}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-xl text-indigo-950">
                    {levelInfo.titleAr} <span className="text-slate-500 font-normal text-sm font-english">({levelInfo.titleEn})</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    {levelInfo.descriptionAr}
                  </p>
                </div>

                <div className="pt-2 text-xs text-indigo-900 font-medium">
                  🎯 نوصيك بالبدء من خطة دروس المستوى <strong className="underline">{levelInfo.code}</strong> مباشرة في منصة English30.
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setActiveTab('courses')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-3.5 rounded-xl text-sm shadow-md cursor-pointer"
            >
              استعرض دورات هذا المستوى 🚀
            </button>
            <button
              onClick={resetTest}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3.5 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الاختبار</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

