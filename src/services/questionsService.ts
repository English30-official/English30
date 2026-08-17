import { BankQuestion, LevelCode, QuestionType } from '../types';

type QuestionsListener = (questions: BankQuestion[]) => void;

class QuestionsService {
  private questions: BankQuestion[] = [
    {
      id: 'q-1',
      type: 'multiple_choice',
      level: 'A1',
      category: 'Grammar',
      promptEn: 'She ____ a doctor at King Faisal Specialist Hospital.',
      options: [
        { key: 'opt_1', textEn: 'are' },
        { key: 'opt_2', textEn: 'is' },
        { key: 'opt_3', textEn: 'am' },
        { key: 'opt_4', textEn: 'be' },
      ],
      correctOptionKey: 'opt_2',
      explanationAr: 'الفاعل She مفرد مؤنث يأخذ فعل الكينونة is في زمن المضارع البسيط.',
      tags: ['verb_to_be', 'pronouns', 'present_simple'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-2',
      type: 'multiple_choice',
      level: 'A1',
      category: 'Grammar',
      promptEn: 'Where do you live? I live ____ Saudi Arabia.',
      options: [
        { key: 'opt_1', textEn: 'at' },
        { key: 'opt_2', textEn: 'on' },
        { key: 'opt_3', textEn: 'in' },
        { key: 'opt_4', textEn: 'to' },
      ],
      correctOptionKey: 'opt_3',
      explanationAr: 'نستخدم حرف الجر in قبل أسماء الدول والمدن الكبيرة.',
      tags: ['prepositions', 'places'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-3',
      type: 'multiple_choice',
      level: 'A2',
      category: 'Grammar',
      promptEn: 'Yesterday, Ali ____ his new car to the workplace.',
      options: [
        { key: 'opt_1', textEn: 'drives' },
        { key: 'opt_2', textEn: 'drove' },
        { key: 'opt_3', textEn: 'is driving' },
        { key: 'opt_4', textEn: 'has driven' },
      ],
      correctOptionKey: 'opt_2',
      explanationAr: 'Yesterday تدل على الماضي البسيط، والتصريف الثاني لـ drive هو drove.',
      tags: ['past_simple', 'irregular_verbs'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-4',
      type: 'multiple_choice',
      level: 'A2',
      category: 'Vocabulary',
      promptEn: 'Choose the word that means "a person who works in a hospital helping doctors":',
      options: [
        { key: 'opt_1', textEn: 'Pilot' },
        { key: 'opt_2', textEn: 'Engineer' },
        { key: 'opt_3', textEn: 'Nurse' },
        { key: 'opt_4', textEn: 'Architect' },
      ],
      correctOptionKey: 'opt_3',
      explanationAr: 'Nurse تعني ممرض/ممرضة وهي الشخص الذي يساعد الأطباء في المستشفى.',
      tags: ['jobs', 'occupations'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-5',
      type: 'multiple_choice',
      level: 'B1',
      category: 'Grammar',
      promptEn: 'I have been studying English ____ three years.',
      options: [
        { key: 'opt_1', textEn: 'since' },
        { key: 'opt_2', textEn: 'for' },
        { key: 'opt_3', textEn: 'during' },
        { key: 'opt_4', textEn: 'from' },
      ],
      correctOptionKey: 'opt_2',
      explanationAr: 'نستخدم for للتعبير عن مدة زمنية محددة (three years).',
      tags: ['present_perfect_continuous', 'since_for'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-6',
      type: 'multiple_choice',
      level: 'B2',
      category: 'Vocabulary',
      promptEn: 'Choose the best synonym for "reluctant":',
      options: [
        { key: 'opt_1', textEn: 'Eager' },
        { key: 'opt_2', textEn: 'Hesitant' },
        { key: 'opt_3', textEn: 'Confident' },
        { key: 'opt_4', textEn: 'Prompt' },
      ],
      correctOptionKey: 'opt_2',
      explanationAr: 'كلمة reluctant تعني متردد أو غير متحمس، ومرادفها Hesitant.',
      tags: ['advanced_vocab', 'synonyms'],
      createdAt: new Date().toISOString(),
    },
  ];

  private listeners: Set<QuestionsListener> = new Set();

  public async getQuestions(filters?: { level?: LevelCode; category?: string }): Promise<BankQuestion[]> {
    let list = [...this.questions];
    if (filters?.level) {
      list = list.filter((q) => q.level === filters.level);
    }
    if (filters?.category) {
      list = list.filter((q) => q.category === filters.category);
    }
    return list;
  }

  public async createQuestion(data: Omit<BankQuestion, 'id' | 'createdAt'>): Promise<BankQuestion> {
    const newQuestion: BankQuestion = {
      ...data,
      id: `q-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.questions = [newQuestion, ...this.questions];
    this.notify();
    return newQuestion;
  }

  public async updateQuestion(id: string, data: Partial<BankQuestion>): Promise<BankQuestion | null> {
    const idx = this.questions.findIndex((q) => q.id === id);
    if (idx === -1) return null;

    this.questions[idx] = {
      ...this.questions[idx],
      ...data,
    };
    this.notify();
    return this.questions[idx];
  }

  public async deleteQuestion(id: string): Promise<boolean> {
    const prevLen = this.questions.length;
    this.questions = this.questions.filter((q) => q.id !== id);
    if (this.questions.length !== prevLen) {
      this.notify();
      return true;
    }
    return false;
  }

  public subscribe(listener: QuestionsListener): () => void {
    this.listeners.add(listener);
    listener([...this.questions]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.questions];
    this.listeners.forEach((l) => l(list));
  }
}

export const questionsService = new QuestionsService();
