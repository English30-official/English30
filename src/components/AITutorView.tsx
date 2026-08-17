import React, { useState, useRef, useEffect } from 'react';
import { speakEnglishText } from '../lib/speech';
import {
  Sparkles,
  Send,
  Volume2,
  Bot,
  User,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AITutorView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `مرحباً بك! أنا **Mr. Alex** معلمك الذكي في منصة English30 🌟.

يمكنك أن تطلب مني:
• 📖 شرح أي قاعدة نحوية (Grammar) بلغة عربية مبسطة.
• 🔤 توضيح معاني الكلمات مع النطق والأمثلة.
• ✍️ تصحيح أي جملة تكتبها بالإنجليزية مع بيان السبب.
• 💬 ممارسة محادثة حية لمواقف مثل (المطار، المطعم، مقابلة العمل).

كيف يمكنني مساعدتك في رحلتك اليوم لتعلم الإنجليزية؟`,
      time: 'الآن',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const presetPrompts = [
    'اشرح لي الفرق بين In و On و At',
    'صحح لي الجملة: I am go to school yesterday',
    'اعطني 5 مفردات عن السفر والمطار مع أمثلة',
    'دعنا نتدرب على محادثة حجز فندق في لندن',
    'كيف أنطق كلمة Simultaneously بشكل صحيح؟',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: data.reply || 'عذراً، لم أستطع معالجة الإجابة حالياً.',
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error fetching AI Tutor response:', err);
      const errorMsg: ChatMessage = {
        id: 'ai-err-' + Date.now(),
        sender: 'ai',
        text: 'حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.',
        time: 'الآن',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeech = (text: string) => {
    // Extract English phrases from text if any or speak whole text
    const englishMatch = text.match(/[A-Za-z0-9\s.,'!?]+/g);
    if (englishMatch && englishMatch.length > 0) {
      speakEnglishText(englishMatch.join(' '), false);
    } else {
      speakEnglishText(text, false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center font-bold text-2xl text-slate-950 shadow-md">
            🤖
          </div>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <span>Mr. Alex (المعلم الذكي)</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] rounded-md">
                متصل 24/7
              </span>
            </h1>
            <p className="text-xs text-slate-300">
              رفيقك التفاعلي لشرح القواعد، تصحيح الأخطاء، والمحادثة الشفهية
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 bg-white/10 px-3 py-1.5 rounded-xl">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>مدعوم بالذكاء الاصطناعي</span>
        </div>
      </div>

      {/* Quick Preset Prompts */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> أسئلة سريعة مقترحة:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {presetPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 shrink-0 transition-colors shadow-2xs font-medium cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 min-h-[420px] max-h-[550px] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-tl-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 rounded-tr-xs'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">
                {msg.text}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                <span>{msg.time}</span>
                {msg.sender === 'ai' && (
                  <button
                    onClick={() => handleSpeech(msg.text)}
                    className="p-1 hover:text-indigo-600 flex items-center gap-1 font-bold cursor-pointer"
                    title="استمع للنطق الإنجليزي"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>استمع</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span>يقوم Mr. Alex بصياغة التوضيح لك...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="اكتب سؤالك، الكلمة التي تريد شرحها، أو جملتك للتصحيح هنا..."
          className="flex-1 px-4 py-3 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold p-3 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Send className="w-5 h-5 rotate-180" />
        </button>
      </form>

    </div>
  );
};
