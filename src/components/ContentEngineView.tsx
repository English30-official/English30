import React, { useState } from 'react';
import { ActiveTab, LearningPack, LevelCode } from '../types';
import { contentEngine, convertPackToLesson } from '../data/contentEngine';
import { playAudioItem } from '../lib/speech';
import {
  Sparkles,
  Layers,
  BookOpen,
  Volume2,
  PlusCircle,
  CheckCircle2,
  List,
  MessageCircle,
  FileText,
  Play,
  ArrowRight,
  Database,
  Cpu,
  Download,
  Search,
} from 'lucide-react';

interface ContentEngineViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectLessonPack: (pack: LearningPack) => void;
}

export const ContentEngineView: React.FC<ContentEngineViewProps> = ({
  setActiveTab,
  onSelectLessonPack,
}) => {
  const [allPacks, setAllPacks] = useState<LearningPack[]>(() => contentEngine.getAllPacks());
  const [selectedPackId, setSelectedPackId] = useState<string>(allPacks[0]?.id || 'pack-a2-travel');
  const [searchFilter, setSearchFilter] = useState('');

  // AI Generator Form States
  const [topicPrompt, setTopicPrompt] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LevelCode>('A2');
  const [wordCount, setWordCount] = useState<number>(30);
  const [sentenceCount, setSentenceCount] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Audio state
  const [playingId, setPlayingId] = useState<string | null>(null);

  const activePack = allPacks.find((p) => p.id === selectedPackId) || allPacks[0];

  const handlePlaySound = async (text: string, id: string) => {
    setPlayingId(id);
    await playAudioItem(text);
    setPlayingId(null);
  };

  const handleGeneratePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicPrompt.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/generate-lesson-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicPrompt,
          level: selectedLevel,
          wordCount: Number(wordCount),
          sentenceCount: Number(sentenceCount),
        }),
      });

      if (!response.ok) {
        throw new Error('فشل إنشاء الدرس من الخادم');
      }

      const data = await response.json();
      if (data.pack) {
        const newPack: LearningPack = data.pack;
        contentEngine.registerPack(newPack);
        setAllPacks(contentEngine.getAllPacks());
        setSelectedPackId(newPack.id);
        setTopicPrompt('');
      } else {
        throw new Error('لم يتم إرجاع حزمة درس صالحة');
      }
    } catch (err: any) {
      console.error(err);
      setGenerateError(err.message || 'حدث خطأ أثناء إعداد الدرس التلقائي');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredWords = activePack
    ? activePack.words.filter(
        (w) =>
          w.word.toLowerCase().includes(searchFilter.toLowerCase()) ||
          w.arabic.includes(searchFilter) ||
          w.exampleEn.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>نظام بنية المحتوى الهيكلي (Decoupled Content Engine)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              مكتبة ومولّد المجموعات التعليمية الذكية
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              بنية مفصولة تماماً عن الواجهة تمكنك من توليد وتصفح آلاف الكلمات والدروس التفاعلية مع ملفاتها الصوتية وأمثلتها بضغط زر واحدة.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (activePack) {
                  onSelectLessonPack(activePack);
                  setActiveTab('lesson');
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>تشغيل هذه المجموعة في المشغّل</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left - Pack Selector & Generator | Right - Active Pack Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PACK LIST & GENERATOR (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Generator Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl space-y-5 shadow-lg border border-indigo-800/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center border border-indigo-400/30">
                <Cpu className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">إنشاء درس جديد بالذكاء الاصطناعي</h3>
                <p className="text-[11px] text-slate-300">أدخل أي موضوع وستتولد لك مجموعة كاملة فوراً</p>
              </div>
            </div>

            <form onSubmit={handleGeneratePack} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  موضوع الدرس المطلوب:
                </label>
                <input
                  type="text"
                  placeholder="مثال: السفر والمطار، طلب الطعام بالمطعم، مقابلات العمل..."
                  value={topicPrompt}
                  onChange={(e) => setTopicPrompt(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-400 font-medium placeholder-slate-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">المستوى:</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as LevelCode)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="A1">A1 مبتدئ</option>
                    <option value="A2">A2 أساسي</option>
                    <option value="B1">B1 متوسط</option>
                    <option value="B2">B2 فوق المتوسط</option>
                    <option value="C1">C1 متقدم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">الكلمات:</label>
                  <select
                    value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value={10}>10 كلمات</option>
                    <option value={20}>20 كلمة</option>
                    <option value={30}>30 كلمة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">الجمل:</label>
                  <select
                    value={sentenceCount}
                    onChange={(e) => setSentenceCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value={5}>5 جمل</option>
                    <option value={10}>10 جمل</option>
                    <option value={20}>20 جملة</option>
                  </select>
                </div>
              </div>

              {generateError && (
                <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl">
                  {generateError}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري توليد المحتوى والصوتيات...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>إنشاء وتعبئة الدرس تلقائياً</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Available Learning Packs List */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center justify-between">
              <span>المجموعات المتاحة في النظام ({allPacks.length})</span>
            </h3>

            <div className="space-y-2.5">
              {allPacks.map((pack) => {
                const isSelected = pack.id === selectedPackId;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md font-extrabold text-[10px]">
                            {pack.level}
                          </span>
                          <span className="font-extrabold text-xs text-slate-800">{pack.titleAr}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">{pack.summaryAr}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 mt-2.5 pt-2 border-t border-slate-200/60">
                      <span>🔤 {pack.wordsCount || pack.words.length} كلمة</span>
                      <span>💬 {pack.sentencesCount || pack.sentences.length} جملة</span>
                      <span>✍️ تمارين شاملة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE PACK FULL DETAIL PREVIEW (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activePack && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Pack Title Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                      مستوى {activePack.level}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                      {activePack.categoryAr || 'عام'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {activePack.titleAr}
                  </h2>
                  <p className="text-xs text-slate-500 font-english font-semibold">
                    {activePack.titleEn}
                  </p>
                </div>

                <button
                  onClick={() => {
                    onSelectLessonPack(activePack);
                    setActiveTab('lesson');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>فتح الدرس</span>
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                <div>
                  <div className="text-lg font-black text-indigo-600">{activePack.words.length}</div>
                  <div className="text-[11px] text-slate-500 font-bold">كلمات مع النطق 🔊</div>
                </div>
                <div>
                  <div className="text-lg font-black text-indigo-600">{activePack.sentences.length}</div>
                  <div className="text-[11px] text-slate-500 font-bold">جمل مع الصوت 🔊</div>
                </div>
                <div>
                  <div className="text-lg font-black text-emerald-600">
                    {(activePack.fillInBlankQuestions?.length || 0) + (activePack.quizQuestions?.length || 0)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold">أسئلة وتمارين</div>
                </div>
              </div>

              {/* Words Preview Header & Search */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <List className="w-4 h-4 text-indigo-600" />
                    <span>استعراض كلمات المجموعة ({activePack.words.length})</span>
                  </h3>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="بحث في الكلمات..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* Words Scrollable Grid */}
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredWords.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-slate-900 font-english">
                            {item.word}
                          </span>
                          <span className="text-xs text-slate-400 font-english">
                            {item.phonetic}
                          </span>
                          {item.partOfSpeech && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-bold text-[10px]">
                              {item.partOfSpeech}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold text-[10px]">
                            {item.level}
                          </span>
                        </div>

                        {/* Word Audio Button */}
                        <button
                          onClick={() => handlePlaySound(item.word, item.id)}
                          disabled={playingId === item.id}
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                          title="استمع لنطق الكلمة"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">🔊 كلمة</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                        <span className="font-bold text-indigo-950">🇸🇦 {item.arabic}</span>
                      </div>

                      {/* Example Sentence with Audio Button */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="font-english italic text-slate-800 font-medium">
                            "{item.exampleEn}"
                          </p>
                          <p className="text-slate-500">{item.exampleAr}</p>
                        </div>

                        <button
                          onClick={() => handlePlaySound(item.exampleEn, item.id + '-sen')}
                          disabled={playingId === item.id + '-sen'}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 border border-slate-200"
                          title="استمع للجملة كاملة"
                        >
                          🔊 جملة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sentences Preview Section */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-indigo-600" />
                  <span>نماذج الجمل والمحادثات ({activePack.sentences.length})</span>
                </h3>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activePack.sentences.map((sen) => (
                    <div
                      key={sen.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-english font-bold text-slate-800">{sen.en}</p>
                        <p className="text-slate-500">{sen.ar}</p>
                      </div>

                      <button
                        onClick={() => handlePlaySound(sen.en, sen.id)}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
                        title="استمع للجملة"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
