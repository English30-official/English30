import { QuizQuestion } from '../types';

export type QuizAnswers = Record<string, number>;

export class QuizService {
  score(questions: QuizQuestion[], answers: QuizAnswers): number {
    return questions.reduce((score, question) => score + (answers[question.id] === question.correctAnswerIndex ? 1 : 0), 0);
  }
  isComplete(questions: QuizQuestion[], answers: QuizAnswers): boolean {
    return questions.every((question) => answers[question.id] !== undefined);
  }
}
export const quizService = new QuizService();
