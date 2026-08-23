import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Flame,
  Layers,
  ArrowDownCircle,
} from 'lucide-react';
import { ownerAIService, auditService, lessonsService } from '../../services';
import { LevelCode } from '../../types';

interface Message {
  id: string;
  sender: 'owner' | 'ai';
  text: string;
  timestamp: string;
}

export const OwnerAIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: `👋 أهلاً بك يا مالك المنصة! أنا **مساعد المالك الذكي (Owner AI)** 🤖.

يمكنك أن تطلب مني:
• 📝 **توليد مسودات دروس كاملة:** (مفردات، قواعد، نصوص استماع، وأسئلة).
• 🎯 **توليد دفعات أسئلة لبنك الأسئلة:** مصنفة وفق معيار CEFR الأوروبي.
• 📊 **تحليل بيانات المنصة:** تلخيص أداء الطلاب وتوصيات زيادة نسبة التحويل.
• 📢 **صياغة نصوص تسويقية:** لحملات واتساب وتيليجرام والكوبونات.

اختر أحد الأوامر السريعة أدناه أو اكتب طلبك مباشرة!`,
      timestamp: 'الآن',
    },
  ]);

  const [input, setInput] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LevelCode>('B1');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickPrompts = [
    {
      label: '📝 توليد درس لمقابلات العمل (B1)',
      prompt: 'أنشئ لي درساً متكاملاً لمستوى B1 حول English for Job Interviews يحتوي على 5 كلمات وقاعدة نحوية وسؤال تقييمي.',
      taskType: 'lesson' as const,
    },
    {
      label: '🎯 توليد 3 أسئلة لبنك الأسئلة',
      prompt: 'ولد لي 3 أسئلة اختيار من متعدد لمستوى B1 مع خيارات وتفسير نحوي باللغة العربية.',
      taskType: 'questions' as const,
    },
    {
      label: '📊 تحليل أداء المنصة والإيرادات',
      prompt: 'لخص لي أداء المنصة هذا الأسبوع وقدم توصيات تشغيلية لزيادة نسبة تحويل المشتركين.',
      taskType: 'analytics' as const,
    },
  ];

  const handleSend = async (customPrompt?: string, taskType: 'lesson' | 'questions' | 'analytics' | 'general' = 'general') => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'owner',
      text: promptToSend,
      timestamp: 'الآن',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await ownerAIService.askOwnerAI(promptToSend, taskType, selectedLevel);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: 'الآن',
      };
      setMessages((prev) => [...prev, aiMsg]);

      await auditService.logAction(
        'AI_ASSISTANT_QUERY',
        'owner_ai',
        `مهمة ${taskType}`,
        promptToSend.substring(0, 50) + '...'
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-black flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Owner AI Engine (Gemini 2.5)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-2">مساعد المالك الذكي (Owner AI Assistant)</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            صياغة المناهج وتوليد الأسئلة وتحليل المقاييس التشغيلية للمنصة بالذكاء الاصطناعي.
          </p>
        </div>

        {/* Level selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">المستوى المستهدف:</span>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LevelCode)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-2xs"
          >
            <option value="A1">A1 - مبتدئ</option>
            <option value="A2">A2 - فوق المبتدئ</option>
            <option value="B1">B1 - متوسط</option>
            <option value="B2">B2 - فوق المتوسط</option>
            <option value="C1">C1 - متقدم</option>
          </select>
        </div>
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp.prompt, qp.taskType)}
            className="px-4 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl text-xs font-bold text-slate-700 hover:text-indigo-700 whitespace-nowrap transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Console */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[520px]">
        
        {/* Messages list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((m) => {
            const isAI = m.sender === 'ai';

            return (
              <div
                key={m.id}
                className={`flex gap-3.5 max-w-3xl ${isAI ? 'self-start' : 'self-end flex-row-reverse mr-auto'}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isAI
                      ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {isAI ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                <div className="space-y-2 flex-1">
                  <div
                    className={`p-5 rounded-3xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      isAI
                        ? 'bg-slate-50 border border-slate-200/80 text-slate-800'
                        : 'bg-indigo-600 text-white rounded-tl-none font-medium'
                    }`}
                  >
                    {m.text}
                  </div>

                  {isAI && (
                    <div className="flex items-center gap-2 pr-2">
                      <button
                        onClick={() => handleCopy(m.text, m.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ المحتوى</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 self-start max-w-xl">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="bg-slate-100 px-4 py-3 rounded-2xl text-xs font-bold text-slate-600 animate-pulse">
                جاري التوليد والمعالجة بواسطة المساعد الذكي...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="اطلب من المساعد الذكي توليد درس، بنك أسئلة، أو تحليل أداء..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-indigo-500 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span>إرسال</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
