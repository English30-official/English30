import React, { useEffect, useMemo, useState } from 'react';
import { VocabItem, LevelCode } from '../types';
import { playAudioItem } from '../lib/speech';
import { lessonsService } from '../services';
import {
  Search,
  Volume2,
  CheckCircle2,
  RotateCw,
  Sparkles,
  BookOpen,
  Check,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const VocabView: React.FC = () => {
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

  // Flashcard Mode State
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    let active = true;
    void lessonsService.getLessons(undefined, 'published')
      .then((lessons) => {
        if (!active) return;
        const uniqueItems = new Map<string, VocabItem>();
        lessons.flatMap((lesson) => lesson.vocabList ?? []).forEach((item) => {
          uniqueItems.set(item.id, item);
        });
        setVocabList([...uniqueItems.values()]);
        setLoadError('');
      })
      .catch(() => {
        if (active) setLoadError('تعذر تحميل المفردات المنشورة حالياً.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(vocabList.map((item) => item.category).filter(Boolean)))],
    [vocabList],
  );
  const levels = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'];

  const filteredVocab = vocabList.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesLevel = selectedLevel === 'ALL' || item.level === selectedLevel;
    const matchesSearch =
      item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.arabic.includes(searchQuery) ||
      item.exampleEn.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesLevel && matchesSearch;
  });

  const toggleMastery = (id: string) => {
    setVocabList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, mastered: !v.mastered } : v))
    );
  };

  const handlePlayAudio = (text: string, audioUrl?: string, slow: boolean = false) => {
    playAudioItem(text, audioUrl, slow);
  };


  const currentFlashcard = filteredVocab[flashcardIndex] || filteredVocab[0];

  return (
    <div className="space-y-8 py-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl space-y-3 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>قاموس ودليل المفردات والتراكيب</span>
          </div>
          <h1 className="text-3xl font-extrabold">بنك المفردات الإنجليزية التفاعلي</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            ابنِ حصيلتك اللغوية، استمع للنطق الصوتي النقي لكل كلمة، ومارس مراجعة البطاقات الذهنية الذكية.
          </p>
        </div>

        <button
          onClick={() => {
            setIsFlashcardMode(!isFlashcardMode);
            setIsFlipped(false);
            setFlashcardIndex(0);
          }}
          className="shrink-0 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-sm shadow-md transition-transform hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCw className="w-4 h-4 text-slate-950" />
          <span>{isFlashcardMode ? 'إغلاق وضع البطاقات' : 'وضع بطاقات المراجعة (Flashcards)'}</span>
        </button>
      </div>

      {/* FLASHCARD MODE OVERLAY */}
      {isFlashcardMode && currentFlashcard && (
        <div className="bg-slate-900 text-white p-8 sm:p-12 rounded-3xl space-y-6 shadow-2xl border border-slate-800 text-center max-w-xl mx-auto">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>بطاقة {flashcardIndex + 1} من {filteredVocab.length}</span>
            <span className="bg-indigo-600/50 text-indigo-200 px-2.5 py-1 rounded-md font-bold">
              مستوى {currentFlashcard.level}
            </span>
          </div>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-56 bg-slate-800 p-8 rounded-3xl border border-slate-700 flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-indigo-500 transition-all select-none shadow-inner"
          >
            {!isFlipped ? (
              <div className="space-y-3">
                <div className="text-3xl sm:text-4xl font-black font-english text-amber-300">
                  {currentFlashcard.word}
                </div>
                <div className="text-sm text-slate-400 font-english">
                  {currentFlashcard.phonetic}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAudio(currentFlashcard.word);
                  }}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full text-white inline-flex items-center justify-center transition-colors shadow-md"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <p className="text-xs text-slate-500 pt-2">اضغط على البطاقة لكشف المعنى بالعربية 🔄</p>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  🇸🇦 {currentFlashcard.arabic}
                </div>
                <p className="text-xs text-slate-300 italic font-english max-w-md">
                  "{currentFlashcard.exampleEn}"
                </p>
                <p className="text-xs text-slate-400">{currentFlashcard.exampleAr}</p>
                <p className="text-xs text-slate-500 pt-2">اضغط للعودة للكلمة الإنجليزية 🔄</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={() => {
                setIsFlipped(false);
                setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : filteredVocab.length - 1));
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              الكلمة السابقة
            </button>

            <button
              onClick={() => {
                toggleMastery(currentFlashcard.id);
                setIsFlipped(false);
                setFlashcardIndex((prev) => (prev < filteredVocab.length - 1 ? prev + 1 : 0));
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              حفظت الكلمة وتخطي ➔
            </button>
          </div>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن كلمة إنجليزية أو معنى بالعربية (مثال: Achievement, إنجاز)..."
            className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500">التصنيف:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'الكل' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-500">المستوى:</span>
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {lvl === 'ALL' ? 'الكل' : lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VOCABULARY CARDS LIST */}
      {isLoading && <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">جارٍ تحميل المفردات المنشورة...</div>}
      {!isLoading && loadError && <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 font-bold">{loadError}</div>}
      {!isLoading && !loadError && vocabList.length === 0 && <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">لا توجد مفردات منشورة ومتاحة لحسابك حالياً.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVocab.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-3xl p-6 border shadow-xs transition-all flex flex-col justify-between space-y-4 ${
              item.mastered ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-2xl font-black text-slate-900 font-english">
                      {item.word}
                    </h3>
                    {item.partOfSpeech && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-bold text-[10px]">
                        {item.partOfSpeech}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-english block">
                    {item.phonetic}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                    {item.level}
                  </span>
                  <button
                    onClick={() => handlePlayAudio(item.word, item.wordAudio)}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
                    title="استمع للكلمة"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-900 text-sm">🇸🇦 {item.arabic}</div>
                <div className="flex items-start justify-between gap-1 pt-1">
                  <div className="text-xs text-slate-700 font-english italic">"{item.exampleEn}"</div>
                  <button
                    onClick={() => handlePlayAudio(item.exampleEn, item.exampleAudio)}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                    title="استمع للجملة"
                  >
                    🔊 جملة
                  </button>
                </div>
                <div className="text-xs text-slate-500">{item.exampleAr}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400">{item.category}</span>
              <button
                onClick={() => toggleMastery(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  item.mastered
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {item.mastered ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>تم الحفظ</span>
                  </>
                ) : (
                  <span>حفظ للقاموس</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
