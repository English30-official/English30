import React from 'react';
import { LessonBlock } from '../types';
import { LessonVideoPlayer } from './video/LessonVideoPlayer';

const textOf = (block: LessonBlock) => String(block.payload.text ?? '');

export const LessonBlocksRenderer: React.FC<{ blocks: LessonBlock[]; includeUnpublished?: boolean }> = ({ blocks, includeUnpublished = false }) => {
  const published = blocks.filter((block) => (includeUnpublished || block.status === 'published') && block.status !== 'archived' && !block.archivedAt);
  if (!published.length) return <p className="text-sm text-slate-500">لا توجد كتل محتوى منشورة لهذا الدرس.</p>;

  return <div className="space-y-5">
    {published.map((block) => {
      const mediaUrl = typeof block.payload.mediaUrl === 'string' ? block.payload.mediaUrl : '';
      const title = block.titleAr || block.titleEn || '';
      if (block.type === 'heading') return <h2 key={block.id} className="text-2xl font-black text-slate-900">{title || textOf(block)}</h2>;
      if (['rich_text','custom_markdown','example','grammar','grammar_rule','note','exercise','interactive_exercise','speaking_prompt','reading_passage'].includes(block.type)) return <article key={block.id} className="bg-white border rounded-2xl p-5"><h3 className="font-black mb-2">{title}</h3><p className="text-sm leading-8 text-slate-700 whitespace-pre-wrap">{textOf(block)}</p></article>;
      if (['vocabulary','vocabulary_set','flashcard'].includes(block.type)) return <article key={block.id} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5"><h3 className="font-black mb-2">{title}</h3><p className="text-sm leading-8 whitespace-pre-wrap">{textOf(block)}</p></article>;
      if (block.type === 'image') return <figure key={block.id} className="bg-white border rounded-2xl p-4">{mediaUrl && <img src={mediaUrl} alt={title} className="max-h-[34rem] w-full object-contain rounded-xl"/>}<figcaption className="font-bold text-sm mt-3">{title}</figcaption></figure>;
      if (['audio','listening_audio'].includes(block.type)) return <article key={block.id} className="bg-white border rounded-2xl p-5"><h3 className="font-black mb-3">{title}</h3>{mediaUrl ? <audio controls preload="metadata" className="w-full" src={mediaUrl}/> : <p className="text-xs text-slate-500">الملف الصوتي غير متاح.</p>}</article>;
      if (block.type === 'video') return <article key={block.id} className="bg-slate-950 rounded-2xl overflow-hidden"><div className="aspect-video">{mediaUrl ? <LessonVideoPlayer url={mediaUrl} title={title}/> : <div className="h-full flex items-center justify-center text-sm text-slate-300">الفيديو غير متاح.</div>}</div></article>;
      if (['downloadable_resource','pdf_resource'].includes(block.type)) return <article key={block.id} className="bg-white border rounded-2xl p-5"><h3 className="font-black">{title}</h3>{textOf(block) && <p className="text-sm text-slate-600 my-2">{textOf(block)}</p>}{mediaUrl && <a href={mediaUrl} target="_blank" rel="noreferrer" className="inline-flex mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">فتح/تحميل الملف</a>}</article>;
      if (['quiz_reference','quiz_embed'].includes(block.type)) return <article key={block.id} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5"><h3 className="font-black">{title || 'اختبار مرتبط'}</h3><p className="text-sm mt-2">{textOf(block) || 'يظهر الاختبار في تبويب الاختبار.'}</p></article>;
      return <article key={block.id} className="bg-white border rounded-2xl p-5"><h3 className="font-black mb-2">{title}</h3><p className="text-sm whitespace-pre-wrap">{textOf(block)}</p></article>;
    })}
  </div>;
};
