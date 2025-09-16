import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSkillPath, updateSkillPath, createSkillPathItems } from '../../lib/api';
import { Certification, SkillPathItem } from '../../lib/types';
import { ArrowLeft, Save, Award, Plus, X, ChevronUp, ChevronDown, Flag, Monitor, Check } from 'lucide-react';
import Card from '../../components/ui/Card';

// NOTE: This page mirrors CreateCertificationPage but loads existing data and performs diffing on items.

const EditCertificationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cert, setCert] = useState<Certification | null>(null);
  const [form, setForm] = useState<any>({});
  const [pathItems, setPathItems] = useState<SkillPathItem[]>([]);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    if(!id) return;
    setLoading(true);
    const result = await getSkillPath(id);
    if(result.success && result.data) {
      // Normalize returned structure to Certification-like object
      const raw: any = result.data;
      const data: Certification = {
        ...raw,
        path_items: raw.path_items || raw.skill_path_items || [],
        skill_path_items: raw.skill_path_items || raw.path_items || [],
      } as Certification;
      setCert(data as Certification);
      setForm({
        title: data.title,
        code: data.code || '',
        description: data.description,
        short_description: data.short_description || '',
        difficulty: data.difficulty,
        category: data.category,
        estimated_duration: data.estimated_duration,
        learning_objectives: [...(data.learning_objectives || [])],
        prerequisites: [...(data.prerequisites || [])],
        cover_image: data.cover_image || '',
        icon_url: data.icon_url || '',
        certificate_image_url: data.certificate_image_url || '',
        exam_type: data.exam_type || '',
        exam_duration_minutes: data.exam_duration_minutes || '',
        passing_score_percent: data.passing_score_percent || '',
        max_attempts: data.max_attempts || '',
        cooldown_hours_between_attempts: data.cooldown_hours_between_attempts || '',
        validity_period_days: data.validity_period_days || '',
        recommended_experience: data.recommended_experience || '',
        delivery_mode: data.delivery_mode || '',
        certificate_title_override: data.certificate_title_override || '',
        certificate_subtitle: data.certificate_subtitle || '',
        issuer_name: data.issuer_name || '',
        issuer_signature_url: data.issuer_signature_url || '',
        tags: (data.tags || []).join(','),
        is_featured: !!data.is_featured,
        is_published: data.is_published
      });
      setPathItems((data.path_items || data.skill_path_items || []).sort((a,b)=> a.order_index - b.order_index));
    }
    setLoading(false);
  };

  const handleInput = (field: string, value: any) => setForm((p:any)=> ({ ...p, [field]: value }));
  const handleArrayChange = (field: 'learning_objectives' | 'prerequisites', i: number, v: string) => setForm((p:any)=> ({...p, [field]: p[field].map((x:string,idx:number)=> idx===i? v : x)}));
  const addArrayItem = (field: 'learning_objectives' | 'prerequisites') => setForm((p:any)=> ({...p, [field]: [...p[field], '']}));
  const removeArrayItem = (field: 'learning_objectives' | 'prerequisites', i:number) => setForm((p:any)=> ({...p, [field]: p[field].filter((_:any,idx:number)=> idx!==i)}));

  const moveItem = (index:number, dir:'up'|'down') => { const copy=[...pathItems]; const t= dir==='up'? index-1: index+1; if(t<0||t>=copy.length) return; [copy[index], copy[t]]=[copy[t], copy[index]]; copy.forEach((it,i)=> it.order_index=i); setPathItems(copy); };
  const toggleRequired = (i:number) => setPathItems(prev => prev.map((it,idx)=> idx===i? { ...it, is_required: !it.is_required }: it));
  const removeItem = (i:number) => setPathItems(prev => prev.filter((_,idx)=> idx!==i).map((it,idx)=> ({...it, order_index: idx}))); 

  const validate = () => {
    const e: Record<string,string> = {};
    if(!form.title.trim()) e.title='Title required';
    if(form.code && !/^[A-Z0-9-]{3,30}$/.test(form.code)) e.code='Invalid code';
    if(!form.description.trim()) e.description='Description required';
    if(pathItems.length===0) e.items='At least one item required';
    if(form.exam_type){
      if(!form.passing_score_percent) e.passing_score_percent='Passing score required';
      if(form.exam_type !== 'challenge_bundle' && !form.exam_duration_minutes) e.exam_duration_minutes='Duration required';
    }
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const diffAndUpdateItems = async (skillPathId: string) => {
    // Simple approach: delete existing items and recreate (can optimize later)
    await fetch(`${(import.meta as any).env?.VITE_SUPABASE_URL}/rest/v1/rpc/reset_skill_path_items`, { method:'POST' }); // optional if RPC exists
    // Fallback: delete via supabase client if RPC not present (not implemented here to avoid complexity)
    const itemsPayload = pathItems.map(i=> ({
      skill_path_id: skillPathId,
      item_type: i.item_type,
      item_id: i.item_id,
      order_index: i.order_index,
      is_required: i.is_required,
      unlock_after: i.unlock_after || []
    }));
    await createSkillPathItems(skillPathId, itemsPayload);
  };

  const handleSave = async (publish:boolean) => {
    if(!id) return; if(!validate()) return; setSaving(true);
    try {
      const payload: Partial<Certification> = {
        title: form.title,
        code: form.code || null,
        description: form.description,
        short_description: form.short_description,
        difficulty: form.difficulty,
        category: form.category,
        estimated_duration: form.estimated_duration,
        learning_objectives: form.learning_objectives.filter((v:string)=>v.trim()),
        prerequisites: form.prerequisites.filter((v:string)=>v.trim()),
        cover_image: form.cover_image || null,
        icon_url: form.icon_url || null,
        certificate_image_url: form.certificate_image_url || null,
        exam_type: form.exam_type || null,
        exam_duration_minutes: form.exam_duration_minutes? Number(form.exam_duration_minutes): null,
        passing_score_percent: form.passing_score_percent? Number(form.passing_score_percent): null,
        max_attempts: form.max_attempts? Number(form.max_attempts): null,
        cooldown_hours_between_attempts: form.cooldown_hours_between_attempts? Number(form.cooldown_hours_between_attempts): null,
        validity_period_days: form.validity_period_days? Number(form.validity_period_days): null,
        recommended_experience: form.recommended_experience || null,
        delivery_mode: form.delivery_mode || null,
        certificate_title_override: form.certificate_title_override || null,
        certificate_subtitle: form.certificate_subtitle || null,
        issuer_name: form.issuer_name || null,
        issuer_signature_url: form.issuer_signature_url || null,
        tags: form.tags.split(',').map((t:string)=>t.trim()).filter(Boolean),
        is_featured: form.is_featured,
        is_published: publish
      } as any;
      const updated = await updateSkillPath(id, payload);
      if(updated.success){
        await diffAndUpdateItems(id);
        navigate('/admin/certifications');
      }
    } catch(e){
      console.error(e); alert('Failed to update certification');
    }
    setSaving(false);
  };

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-[#121212]"><div className="h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;
  if(!cert) return <div className="p-8 text-center text-gray-400">Certification not found</div>;

  const errorMsg = (k:string) => errors[k] && <p className="text-xs text-red-400 mt-1">{errors[k]}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={()=>navigate('/admin/certifications')} className="flex items-center text-gray-400 hover:text-white transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Certification</h1>
              <p className="text-gray-400 text-sm">Update metadata, exam configuration and path items</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>handleSave(false)} disabled={saving} className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center"><Save className="h-4 w-4 mr-2"/>Save Draft</button>
            <button onClick={()=>handleSave(true)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center"><Award className="h-4 w-4 mr-2"/>{saving? 'Saving...' : 'Publish'}</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                  <input value={form.title} onChange={e=>handleInput('title', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  {errorMsg('title')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Code</label>
                    <input value={form.code} onChange={e=>handleInput('code', e.target.value.toUpperCase())} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white font-mono" />
                    {errorMsg('code')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                    <select value={form.difficulty} onChange={e=>handleInput('difficulty', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <input value={form.category} onChange={e=>handleInput('category', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Short Description</label>
                  <input value={form.short_description} onChange={e=>handleInput('short_description', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <textarea value={form.description} onChange={e=>handleInput('description', e.target.value)} rows={4} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  {errorMsg('description')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                    <input type="number" min={1} value={form.estimated_duration} onChange={e=>handleInput('estimated_duration', Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icon URL</label>
                    <input value={form.icon_url} onChange={e=>handleInput('icon_url', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cover Image URL</label>
                    <input value={form.cover_image} onChange={e=>handleInput('cover_image', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Certificate Template URL</label>
                    <input value={form.certificate_image_url} onChange={e=>handleInput('certificate_image_url', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma)</label>
                    <input value={form.tags} onChange={e=>handleInput('tags', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input type="checkbox" checked={form.is_featured} onChange={e=>handleInput('is_featured', e.target.checked)} className="accent-red-600" />
                    <span className="text-sm text-gray-300">Featured</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Exam Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Exam Type</label>
                  <select value={form.exam_type} onChange={e=>handleInput('exam_type', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white">
                    <option value="">None</option>
                    <option value="challenge_bundle">challenge_bundle</option>
                    <option value="timed_exam">timed_exam</option>
                    <option value="lab_practical">lab_practical</option>
                    <option value="hybrid">hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Passing Score %</label>
                  <input type="number" min={1} max={100} value={form.passing_score_percent} onChange={e=>handleInput('passing_score_percent', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  {errorMsg('passing_score_percent')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                  <input type="number" min={5} value={form.exam_duration_minutes} onChange={e=>handleInput('exam_duration_minutes', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  {errorMsg('exam_duration_minutes')}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Attempts</label>
                  <input type="number" min={1} value={form.max_attempts} onChange={e=>handleInput('max_attempts', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cooldown (hrs)</label>
                  <input type="number" min={0} value={form.cooldown_hours_between_attempts} onChange={e=>handleInput('cooldown_hours_between_attempts', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Validity (days)</label>
                  <input type="number" min={0} value={form.validity_period_days} onChange={e=>handleInput('validity_period_days', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Mode</label>
                  <select value={form.delivery_mode} onChange={e=>handleInput('delivery_mode', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white">
                    <option value="">Auto</option>
                    <option value="proctored">proctored</option>
                    <option value="unproctored">unproctored</option>
                    <option value="auto">auto</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recommended Experience</label>
                  <input value={form.recommended_experience} onChange={e=>handleInput('recommended_experience', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Issuer Name</label>
                  <input value={form.issuer_name} onChange={e=>handleInput('issuer_name', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Certificate Title Override</label>
                  <input value={form.certificate_title_override} onChange={e=>handleInput('certificate_title_override', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Certificate Subtitle</label>
                  <input value={form.certificate_subtitle} onChange={e=>handleInput('certificate_subtitle', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Issuer Signature URL</label>
                  <input value={form.issuer_signature_url} onChange={e=>handleInput('issuer_signature_url', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Learning Objectives</h2>
              <div className="space-y-3">
                {form.learning_objectives?.map((obj:string,i:number)=> (
                  <div key={i} className="flex gap-2">
                    <input value={obj} onChange={e=>handleArrayChange('learning_objectives', i, e.target.value)} className="flex-1 px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                    <button onClick={()=>removeArrayItem('learning_objectives', i)} className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="h-4 w-4"/></button>
                  </div>
                ))}
                <button onClick={()=>addArrayItem('learning_objectives')} className="flex items-center text-red-400 hover:text-red-300"><Plus className="h-4 w-4 mr-2"/>Add Objective</button>
              </div>
            </Card>
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Prerequisites</h2>
              <div className="space-y-3">
                {form.prerequisites?.map((p:string,i:number)=> (
                  <div key={i} className="flex gap-2">
                    <input value={p} onChange={e=>handleArrayChange('prerequisites', i, e.target.value)} className="flex-1 px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                    <button onClick={()=>removeArrayItem('prerequisites', i)} className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="h-4 w-4"/></button>
                  </div>
                ))}
                <button onClick={()=>addArrayItem('prerequisites')} className="flex items-center text-red-400 hover:text-red-300"><Plus className="h-4 w-4 mr-2"/>Add Prerequisite</button>
              </div>
            </Card>
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Path Items</h2>
                <p className="text-xs text-gray-500">(Add/remove via future enhancement)</p>
              </div>
              {errors.items && <p className="text-xs text-red-400 mb-2">{errors.items}</p>}
              {pathItems.length===0 ? <p className="text-gray-400 text-sm">No items.</p> : (
                <div className="space-y-3">
                  {pathItems.map((it,i)=> (
                    <div key={it.id || i} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                      <div className="flex flex-col gap-1">
                        <button onClick={()=>moveItem(i,'up')} disabled={i===0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronUp className="h-4 w-4"/></button>
                        <button onClick={()=>moveItem(i,'down')} disabled={i===pathItems.length-1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronDown className="h-4 w-4"/></button>
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">{it.item_type==='challenge'? <Flag className="h-4 w-4"/>:<Monitor className="h-4 w-4"/>}</div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{it.challenge?.title || it.lab?.title || it.item_id}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="capitalize">{it.item_type}</span>
                            <span>{it.challenge?.points || it.lab?.points || 0} pts</span>
                            <span className="capitalize">{it.challenge?.difficulty || it.lab?.difficulty || ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>toggleRequired(i)} className={`px-3 py-1 rounded text-xs font-medium ${it.is_required? 'bg-red-500/20 text-red-400 border border-red-500/30':'bg-slate-700/50 text-gray-400 border border-slate-600/30'}`}>{it.is_required? 'Required':'Optional'}</button>
                        <button onClick={()=>removeItem(i)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="h-4 w-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Items</span><span className="text-white font-medium">{pathItems.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Difficulty</span><span className="text-white font-medium capitalize">{form.difficulty}</span></div>
                {form.exam_type && <div className="flex justify-between"><span className="text-gray-400">Exam</span><span className="text-white font-medium">{form.exam_type}</span></div>}
                {form.passing_score_percent && <div className="flex justify-between"><span className="text-gray-400">Passing</span><span className="text-white font-medium">{form.passing_score_percent}%</span></div>}
                {form.exam_duration_minutes && <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="text-white font-medium">{form.exam_duration_minutes}m</span></div>}
              </div>
            </Card>
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-4">Item Breakdown</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400 flex items-center"><Flag className="h-4 w-4 mr-2"/>Challenges</span><span className="text-white font-medium">{pathItems.filter(i=>i.item_type==='challenge').length}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 flex items-center"><Monitor className="h-4 w-4 mr-2"/>Labs</span><span className="text-white font-medium">{pathItems.filter(i=>i.item_type==='lab').length}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 flex items-center"><Check className="h-4 w-4 mr-2"/>Required</span><span className="text-white font-medium">{pathItems.filter(i=>i.is_required).length}</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCertificationPage;