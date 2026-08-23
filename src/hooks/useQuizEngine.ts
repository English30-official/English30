import { useMemo, useState } from 'react';
import { QuizQuestion } from '../types';
import { QuizAnswers, quizService } from '../services/quizService';

export function useQuizEngine(questions: QuizQuestion[]) {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [showResults, setShowResults] = useState(false);
  const score = useMemo(() => quizService.score(questions, answers), [questions, answers]);
  const isComplete = useMemo(() => quizService.isComplete(questions, answers), [questions, answers]);
  const selectAnswer = (questionId: string, optionIndex: number) => {
    if (!showResults) setAnswers((current) => ({ ...current, [questionId]: optionIndex }));
  };
  const reset = () => { setAnswers({}); setShowResults(false); };
  return { answers, showResults, setShowResults, score, isComplete, selectAnswer, reset };
}
