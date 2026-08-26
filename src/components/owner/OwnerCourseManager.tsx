import React, { FormEvent, useEffect, useState } from 'react';
import { Archive, Edit3, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { ContentStatus, Course, LevelCode } from '../../types';
import { coursesService, ownerCmsService } from '../../services';
import { MediaImagePicker } from './MediaImagePicker';

const blank = { titleAr: '', titleEn: '', slug: '', level: 'A1' as LevelCode, category: 'beginner' as Course['category'], categoryAr: 'مبتدئ', descriptionAr: '', durationHours: 1, image: '', thumbnailAssetId: '', color: 'indigo', isFree: false, status: 'draft' as ContentStatus };

export const OwnerCourseManager: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => setCourses(await coursesService.getCourses());
  useEffect(() => { void load().catch((reason) => setError(reason.message)); }, []);

  const edit = (course: Course) => {
    setEditingId(course.id);
    setForm({ titleAr: course.titleAr, titleEn: course.titleEn, slug: course.slug || '', level: course.level, category: course.category, categoryAr: course.categoryAr, descriptionAr: course.descriptionAr, durationHours: course.durationHours, image: course.image, thumbnailAssetId: course.thumbnailAssetId || '', color: course.color, isFree: course.isFree || false, status: course.status || 'draft' });
    setOpen(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (editingId) await coursesService.updateCourse(editingId, form);
      else await coursesService.createCourse({ ...form, lessonsCount: 0, rating: 0, studentsCount: 0 });
      setOpen(false); setEditingId(null); setForm(blank); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الدورة.'); }
    finally { setBusy(false); }
  };
  const status = async (course: Course, next: ContentStatus) => { setBusy(true); try { await coursesService.setCourseStatus(course.id, next); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تغيير الحالة.'); } finally { setBusy(false); } };
  const destroy = async (course: Course) => { if (!confirm(`حذف «${course.titleAr}» نهائيًا؟ سترفض قاعدة البيانات إذا وجد نشاط طلابي تاريخي.`)) return; setBusy(true); try { await ownerCmsService.permanentlyDelete('course', course.id); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر الحذف النهائي.'); } finally { setBusy(false); } };

  return <div className="space-y-4">
    <div className="flex justify-between"><h3 className="font-black">إدارة الدورات</h3><button type="button" onClick={() => { setForm(blank); setEditingId(null); setOpen(!open); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black flex gap-1"><Plus className="w-4 h-4"/>دورة جديدة</button></div>
    {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs">{error}</div>}
    {open && <form onSubmit={save} className="p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3">
      <div className="grid md:grid-cols-3 gap-3"><input required value={form.titleAr} onChange={(e) => setForm({...form,titleAr:e.target.value})} placeholder="العنوان العربي" className="border rounded-xl p-3 text-sm"/><input required value={form.titleEn} onChange={(e) => setForm({...form,titleEn:e.target.value})} placeholder="English title" dir="ltr" className="border rounded-xl p-3 text-sm"/><input required value={form.slug} onChange={(e) => setForm({...form,slug:e.target.value})} placeholder="slug" dir="ltr" className="border rounded-xl p-3 text-sm"/><select value={form.level} onChange={(e) => setForm({...form,level:e.target.value as LevelCode})} className="border rounded-xl p-3 text-sm">{['A1','A2','B1','B2','C1','C2'].map((level) => <option key={level}>{level}</option>)}</select><input type="number" min="0" value={form.durationHours} onChange={(e) => setForm({...form,durationHours:Number(e.target.value)})} placeholder="الساعات" className="border rounded-xl p-3 text-sm"/></div>
      <MediaImagePicker label="صورة الدورة المصغرة" valueUrl={form.image} valueAssetId={form.thumbnailAssetId} folder="courses" help="الأصل المختار قابل لإعادة الاستخدام في دورات أخرى." onChange={(selected) => setForm({...form,image:selected?.url||'',thumbnailAssetId:selected?.assetId||''})}/>
      <textarea value={form.descriptionAr} onChange={(e) => setForm({...form,descriptionAr:e.target.value})} placeholder="وصف الدورة" className="w-full border rounded-xl p-3 text-sm"/>
      <div className="flex gap-3"><label className="text-xs font-bold"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({...form,isFree:e.target.checked})} className="ml-2"/>معاينة مجانية</label><select value={form.status} onChange={(e) => setForm({...form,status:e.target.value as ContentStatus})} className="border rounded-lg p-2 text-xs"><option value="draft">مسودة</option><option value="preview">معاينة</option><option value="published">منشور</option></select></div>
      <button disabled={busy} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black flex gap-1"><Save className="w-4 h-4"/>حفظ</button>
    </form>}
    <div className="grid md:grid-cols-2 gap-3">{courses.map((course) => <article key={course.id} className="p-4 bg-slate-50 border rounded-2xl"><div className="flex justify-between gap-3"><div className="flex gap-3 min-w-0">{course.image && <img src={course.image} alt="" loading="lazy" className="w-16 h-16 object-cover rounded-xl border bg-white"/>}<div className="min-w-0"><h4 className="font-black text-sm truncate">{course.titleAr}</h4><p className="text-[11px] text-slate-500">{course.level} · {course.status}</p></div></div><div className="flex gap-1"><button type="button" onClick={() => edit(course)} className="p-2 bg-white border rounded-lg"><Edit3 className="w-4 h-4"/></button>{course.status !== 'archived' ? <button type="button" onClick={() => void status(course,'archived')} className="p-2 bg-white border rounded-lg"><Archive className="w-4 h-4"/></button> : <><button type="button" onClick={() => void status(course,'draft')} className="p-2 bg-indigo-50 text-indigo-700 rounded-lg"><RotateCcw className="w-4 h-4"/></button><button type="button" onClick={() => void destroy(course)} className="p-2 bg-red-50 text-red-700 rounded-lg"><Trash2 className="w-4 h-4"/></button></>}</div></div></article>)}</div>
  </div>;
};
