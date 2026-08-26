import React, { useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { PermissionCode, PermissionDefinition, StaffPermissionAssignment } from '../../types';
import { permissionsService } from '../../services';

export const OwnerPermissions: React.FC = () => {
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [staff, setStaff] = useState<StaffPermissionAssignment[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = async () => { const data=await permissionsService.load();setDefinitions(data.definitions);setStaff(data.staff); };
  useEffect(()=>{void load().catch((reason)=>setError(reason.message));},[]);
  const cycle = async (member: StaffPermissionAssignment, code: PermissionCode) => {
    const current=member.permissions[code]; const next=current===undefined?true:current===true?false:null;
    setBusy(`${member.userId}:${code}`);setError('');
    try{await permissionsService.setPermission(member.userId,code,next);await load();}
    catch(reason){setError(reason instanceof Error?reason.message:'تعذر تحديث الصلاحية.');}
    finally{setBusy('');}
  };
  const toggleAdmin = async (member: StaffPermissionAssignment) => {
    setBusy(`${member.userId}:role`); setError('');
    try { await permissionsService.setAdminRole(member.userId, !member.roles.includes('admin')); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث الدور.'); }
    finally { setBusy(''); }
  };
  return <section className="space-y-5" dir="rtl"><div><h2 className="text-2xl font-black">الأدوار والصلاحيات</h2><p className="text-sm text-slate-500 mt-1">المالك يملك جميع الصلاحيات دائمًا. يمكنه تعيين المشرفين ثم السماح أو المنع صراحةً لكل قدرة.</p></div>{error&&<div className="p-4 bg-red-50 border text-red-700 rounded-2xl text-sm">{error}</div>}<div className="space-y-4">{staff.map(member=>{const owner=member.roles.includes('owner');const admin=member.roles.includes('admin');return <article key={member.userId} className="bg-white border rounded-3xl p-5 space-y-4"><div className="flex justify-between gap-4"><div><h3 className="font-black flex items-center gap-2">{owner?<ShieldCheck className="w-5 h-5 text-amber-500"/>:<KeyRound className="w-5 h-5 text-indigo-600"/>}{member.fullName}</h3><p className="text-xs text-slate-500">{member.email} · {member.roles.join(', ')||'بدون دور'}</p></div><div className="flex gap-2">{!owner&&<button disabled={busy===`${member.userId}:role`} onClick={()=>void toggleAdmin(member)} className={`px-3 py-2 rounded-lg text-xs font-bold ${admin?'bg-rose-50 text-rose-700':'bg-indigo-50 text-indigo-700'}`}>{admin?'إزالة دور المشرف':'تعيين كمشرف'}</button>}<button onClick={()=>void load()} className="p-2 border rounded-lg"><RefreshCw className="w-4 h-4"/></button></div></div>{(owner||admin)&&<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{definitions.map(def=>{const value=owner?true:member.permissions[def.code];const label=owner?'مسموح للمالك':value===true?'سماح صريح':value===false?'منع صريح':'موروث من الدور';return <button key={def.code} disabled={owner||busy===`${member.userId}:${def.code}`} onClick={()=>void cycle(member,def.code)} className={`text-right p-3 rounded-xl border ${owner||value===true?'bg-emerald-50 border-emerald-200':value===false?'bg-red-50 border-red-200':'bg-slate-50'}`}><span className="block text-xs font-black">{def.nameAr}</span><span className="block text-[10px] text-slate-500 mt-1">{label}</span></button>})}</div>}</article>})}</div>{staff.length===0&&<div className="p-10 bg-white border rounded-3xl text-center text-slate-500 text-sm">لا يوجد مستخدمون.</div>}</section>;
};
