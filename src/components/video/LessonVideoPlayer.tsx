import React, { useMemo, useState } from 'react';
import { Pause, Play, Subtitles } from 'lucide-react';
import { videoService } from '../../services/videoService';

interface LessonVideoPlayerProps { url?: string; title?: string; }

export const LessonVideoPlayer: React.FC<LessonVideoPlayerProps> = ({ url, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const playback = useMemo(() => videoService.resolve(url ? {
    url, title, poster: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80'
  } : undefined), [url, title]);

  if (playback?.kind === 'html5') {
    return <video src={playback.src} controls className="w-full aspect-video rounded-2xl bg-black" poster={playback.poster} />;
  }

  return (
    <div className="relative aspect-video w-full bg-slate-900 flex flex-col justify-between p-4 sm:p-6 text-white">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-indigo-950/40 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
          <span className="font-bold text-white">English30 Studio</span>
        </div>
        <button onClick={() => setShowSubtitles((value) => !value)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${showSubtitles ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
          <Subtitles className="w-3.5 h-3.5 inline ml-1" /> الترجمة المزدوجة
        </button>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-4 text-center">
        <button onClick={() => setIsPlaying((value) => !value)} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 transform hover:scale-110 active:scale-95 transition-all cursor-pointer">
          {isPlaying ? <Pause className="w-8 h-8 fill-white" /> : <Play className="w-8 h-8 fill-white ml-1" />}
        </button>
        <p className="text-xs sm:text-sm font-medium text-slate-300">{isPlaying ? 'جاري تشغيل الشرح المرئي...' : 'اضغط لتشغيل الشرح المرئي الكامل'}</p>
      </div>
      {showSubtitles && <div className="relative z-10 mx-auto bg-slate-950/90 border border-slate-700/80 px-4 py-2 rounded-xl text-center max-w-lg mb-2 shadow-lg">
        <p className="text-amber-300 font-english font-bold text-xs sm:text-sm">"Please present your passport and boarding pass at gate 5."</p>
        <p className="text-slate-300 text-[11px] mt-0.5">(يرجى إبراز جواز سفرك وبطاقة صعود الطائرة عند البوابة 5)</p>
      </div>}
    </div>
  );
};
