import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Award, Plus, X, ChevronUp, ChevronDown, Flag, Monitor, Target, Save, Check
} from 'lucide-react';
import { createSkillPath, loadChallenges, getLabs, createSkillPathItems } from '../../lib/api';
import { Challenge, Lab, SkillPathItem, Certification, ExamType, DeliveryMode } from '../../lib/types';
import Card from '../../components/ui/Card';

interface CertificationForm {
  title: string;
  code: string;
  description: string;
  short_description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  estimated_duration: number;
  learning_objectives: string[];
  prerequisites: string[];
  cover_image?: string;
  icon_url?: string;
  certificate_image_url?: string;
  exam_type?: ExamType | '';
  exam_duration_minutes?: number | '';
  passing_score_percent?: number | '';
  max_attempts?: number | '';
  cooldown_hours_between_attempts?: number | '';
  validity_period_days?: number | '';
  recommended_experience?: string;
  delivery_mode?: DeliveryMode | '';
  certificate_title_override?: string;
  certificate_subtitle?: string;
  issuer_name?: string;
  issuer_signature_url?: string;
  tags: string;
  is_featured: boolean;
  is_published: boolean;
}

const CreateCertificationPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<CertificationForm>({
    title: '', code: '', description: '', short_description: '', difficulty: 'beginner', category: 'Web Security',
    estimated_duration: 1, learning_objectives: [''], prerequisites: [''], is_published: false, tags: '', is_featured: false
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [pathItems, setPathItems] = useState<Partial<SkillPathItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<'challenge' | 'lab'>('challenge');
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengesResult, labsResult] = await Promise.all([loadChallenges(), getLabs()]);
      if (challengesResult.success) setChallenges(challengesResult.data || []);
      if (labsResult.success) setLabs(labsResult.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const categories = ['Web Security','Network Security','Cryptography','Digital Forensics','Penetration Testing','Malware Analysis'];
  const examTypes: ExamType[] = ['challenge_bundle','timed_exam','lab_practical','hybrid'];
  const deliveryModes: DeliveryMode[] = ['proctored','unproctored','auto'];

  const handleInput = (field: keyof CertificationForm, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const handleArrayChange = (field: 'learning_objectives' | 'prerequisites', index: number, value: string) => setForm(p => ({ ...p, [field]: p[field].map((v,i)=> i===index? value : v) }));
  const addArrayItem = (field: 'learning_objectives' | 'prerequisites') => setForm(p => ({ ...p, [field]: [...p[field], ''] }));
  const removeArrayItem = (field: 'learning_objectives' | 'prerequisites', index: number) => setForm(p => ({ ...p, [field]: p[field].filter((_,i)=>i!==index) }));

  const addItem = (item: Challenge | Lab, type: 'challenge' | 'lab') => {
    const newItem: Partial<SkillPathItem> = { id: `temp-${Date.now()}`, item_type: type, item_id: item.id, order_index: pathItems.length, is_required: true, unlock_after: [], [type]: item };
    setPathItems(prev => [...prev, newItem]);
    setShowItemSelector(false);
  };
  const removeItem = (index: number) => setPathItems(prev => prev.filter((_,i)=>i!==index));
  const moveItem = (index:number, dir:'up'|'down') => { const copy=[...pathItems]; const t= dir==='up'? index-1: index+1; if(t<0||t>=copy.length) return; [copy[index], copy[t]]=[copy[t], copy[index]]; copy.forEach((it,i)=> it.order_index=i); setPathItems(copy); };
  const toggleRequired = (index:number) => setPathItems(prev => prev.map((it,i)=> i===index? { ...it, is_required: !it.is_required }: it));

  const calcTotalPoints = () => pathItems.reduce((s,i)=> s + (i.challenge?.points || i.lab?.points || 0), 0);

  const validate = (): boolean => {
    const e: Record<string,string> = {};
    if(!form.title.trim()) e.title = 'Title required';
    if(!form.code.trim()) e.code = 'Code required';
    else if(!/^[A-Z0-9-]{3,30}$/.test(form.code.trim())) e.code = 'Code must be A-Z, 0-9, hyphen';
    if(!form.description.trim()) e.description = 'Description required';
    if(pathItems.length === 0) e.items = 'At least one item required';
    if(form.exam_type) {
      if(!form.passing_score_percent) e.passing_score_percent = 'Passing score required';
      if(form.passing_score_percent && (Number(form.passing_score_percent) <1 || Number(form.passing_score_percent)>100)) e.passing_score_percent='Score 1-100';
      if(form.exam_type !== 'challenge_bundle' && !form.exam_duration_minutes) e.exam_duration_minutes='Duration required';
    }
    if(form.max_attempts && Number(form.max_attempts) < 1) e.max_attempts = 'Must be >=1';
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSave = async (publish:boolean) => {
    if(!validate()) return;
    setSaving(true);
    try {
      const payload: Partial<Certification> = {
        title: form.title,
        code: form.code.trim(),
        description: form.description,
        short_description: form.short_description,
        difficulty: form.difficulty,
        category: form.category,
        estimated_duration: form.estimated_duration,
        learning_objectives: form.learning_objectives.filter(v=>v.trim()),
        prerequisites: form.prerequisites.filter(v=>v.trim()),
        cover_image: form.cover_image,
        icon_url: form.icon_url,
        certificate_image_url: form.certificate_image_url,
        exam_type: form.exam_type || undefined,
        exam_duration_minutes: form.exam_duration_minutes? Number(form.exam_duration_minutes): undefined,
        passing_score_percent: form.passing_score_percent? Number(form.passing_score_percent): undefined,
        max_attempts: form.max_attempts? Number(form.max_attempts): undefined,
        cooldown_hours_between_attempts: form.cooldown_hours_between_attempts? Number(form.cooldown_hours_between_attempts): undefined,
        validity_period_days: form.validity_period_days? Number(form.validity_period_days): undefined,
        recommended_experience: form.recommended_experience,
        delivery_mode: form.delivery_mode || undefined,
        certificate_title_override: form.certificate_title_override,
        certificate_subtitle: form.certificate_subtitle,
        issuer_name: form.issuer_name,
        issuer_signature_url: form.issuer_signature_url,
        tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean),
        is_featured: form.is_featured,
        is_published: publish,
        total_points: calcTotalPoints()
      } as any;

      const result = await createSkillPath(payload);
      if(result.success) {
        const itemsData = pathItems.map(it => ({ skill_path_id: result.data.id, item_type: it.item_type!, item_id: it.item_id!, order_index: it.order_index!, is_required: it.is_required!, unlock_after: it.unlock_after || [] }));
        const itemsRes = await createSkillPathItems(result.data.id, itemsData);
        if(itemsRes.success) {
          navigate('/admin/certifications');
        } else {
          throw new Error('Failed to create certification items');
        }
      }
    } catch(e) {
      console.error(e);
      alert('Failed to create certification');
    }
    setSaving(false);
  };

  if(loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20"><div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full"/></div>;

  const errorMsg = (k:string) => errors[k] && <p className="text-xs text-red-400 mt-1">{errors[k]}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={()=>navigate('/admin/certifications')} className="flex items-center text-gray-400 hover:text-white transition-colors group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Certifications
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Certification</h1>
              <p className="text-gray-400">Define credentials, exam, and learning path</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>handleSave(false)} disabled={saving} className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center">
              <Save className="h-4 w-4 mr-2" />Save Draft
            </button>
            <button onClick={()=>handleSave(true)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center">
              <Award className="h-4 w-4 mr-2" />{saving? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                  <input value={form.title} onChange={e=>handleInput('title', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20" placeholder="Certification title" />
                  {errorMsg('title')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Code *</label>
                    <input value={form.code} onChange={e=>handleInput('code', e.target.value.toUpperCase())} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white font-mono focus:border-red-500 focus:ring-1 focus:ring-red-500/20" placeholder="e.g. WEB-101" />
                    {errorMsg('code')}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                    <select value={form.difficulty} onChange={e=>handleInput('difficulty', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20">
                      <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select value={form.category} onChange={e=>handleInput('category', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20">
                      {categories.map(c=> <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Short Description</label>
                  <input value={form.short_description} onChange={e=>handleInput('short_description', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20" placeholder="Summary for cards" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <textarea value={form.description} onChange={e=>handleInput('description', e.target.value)} rows={4} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20" placeholder="Full description" />
                  {errorMsg('description')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                    <input type="number" min={1} value={form.estimated_duration} onChange={e=>handleInput('estimated_duration', Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icon URL</label>
                    <input value={form.icon_url || ''} onChange={e=>handleInput('icon_url', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cover Image URL</label>
                    <input value={form.cover_image || ''} onChange={e=>handleInput('cover_image', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Certificate Template URL</label>
                    <input value={form.certificate_image_url || ''} onChange={e=>handleInput('certificate_image_url', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
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
            {/* Exam Configuration */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Exam Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Exam Type</label>
                  <select value={form.exam_type || ''} onChange={e=>handleInput('exam_type', e.target.value as ExamType || '')} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white">
                    <option value="">None</option>
                    {examTypes.map(t=> <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Passing Score %</label>
                  <input type="number" min={1} max={100} value={form.passing_score_percent || ''} onChange={e=>handleInput('passing_score_percent', e.target.value===''? '' : Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  {errorMsg('passing_score_percent')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (min)</label>
                  <input type="number" min={5} value={form.exam_duration_minutes || ''} onChange={e=>handleInput('exam_duration_minutes', e.target.value===''? '' : Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                  {errorMsg('exam_duration_minutes')}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Attempts</label>
                  <input type="number" min={1} value={form.max_attempts || ''} onChange={e=>handleInput('max_attempts', e.target.value===''? '' : Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cooldown (hrs)</label>
                  <input type="number" min={0} value={form.cooldown_hours_between_attempts || ''} onChange={e=>handleInput('cooldown_hours_between_attempts', e.target.value===''? '' : Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Validity (days)</label>
                  <input type="number" min={0} value={form.validity_period_days || ''} onChange={e=>handleInput('validity_period_days', e.target.value===''? '' : Number(e.target.value))} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Mode</label>
                  <select value={form.delivery_mode || ''} onChange={e=>handleInput('delivery_mode', e.target.value as DeliveryMode || '')} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white">
                    <option value="">Auto</option>
                    {deliveryModes.map(m=> <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Recommended Experience</label>
                  <input value={form.recommended_experience || ''} onChange={e=>handleInput('recommended_experience', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Issuer Name</label>
                  <input value={form.issuer_name || ''} onChange={e=>handleInput('issuer_name', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Certificate Title Override</label>
                  <input value={form.certificate_title_override || ''} onChange={e=>handleInput('certificate_title_override', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Certificate Subtitle</label>
                  <input value={form.certificate_subtitle || ''} onChange={e=>handleInput('certificate_subtitle', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Issuer Signature URL</label>
                  <input value={form.issuer_signature_url || ''} onChange={e=>handleInput('issuer_signature_url', e.target.value)} className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                </div>
              </div>
            </Card>
            {/* Learning Objectives */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Learning Objectives</h2>
              <div className="space-y-3">
                {form.learning_objectives.map((obj,i)=> (
                  <div key={i} className="flex gap-2">
                    <input value={obj} onChange={e=>handleArrayChange('learning_objectives', i, e.target.value)} placeholder="Objective" className="flex-1 px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                    <button onClick={()=>removeArrayItem('learning_objectives', i)} className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="h-4 w-4"/></button>
                  </div>
                ))}
                <button onClick={()=>addArrayItem('learning_objectives')} className="flex items-center text-red-400 hover:text-red-300"><Plus className="h-4 w-4 mr-2"/>Add Objective</button>
              </div>
            </Card>
            {/* Prerequisites */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Prerequisites</h2>
              <div className="space-y-3">
                {form.prerequisites.map((p,i)=> (
                  <div key={i} className="flex gap-2">
                    <input value={p} onChange={e=>handleArrayChange('prerequisites', i, e.target.value)} placeholder="Prerequisite" className="flex-1 px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white" />
                    <button onClick={()=>removeArrayItem('prerequisites', i)} className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="h-4 w-4"/></button>
                  </div>
                ))}
                <button onClick={()=>addArrayItem('prerequisites')} className="flex items-center text-red-400 hover:text-red-300"><Plus className="h-4 w-4 mr-2"/>Add Prerequisite</button>
              </div>
            </Card>
            {/* Path Items */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Certification Path Items</h2>
                <button onClick={()=>setShowItemSelector(true)} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"><Plus className="h-4 w-4 mr-2"/>Add Item</button>
              </div>
              {errors.items && <p className="text-xs text-red-400 mb-2">{errors.items}</p>}
              {pathItems.length===0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items yet. Add challenges or labs.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pathItems.map((it,i)=> (
                    <div key={it.id} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                      <div className="flex flex-col gap-1">
                        <button onClick={()=>moveItem(i,'up')} disabled={i===0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronUp className="h-4 w-4"/></button>
                        <button onClick={()=>moveItem(i,'down')} disabled={i===pathItems.length-1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronDown className="h-4 w-4"/></button>
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                          {it.item_type === 'challenge' ? <Flag className="h-4 w-4"/> : <Monitor className="h-4 w-4"/>}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{it.challenge?.title || it.lab?.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="capitalize">{it.item_type}</span>
                            <span>{it.challenge?.points || it.lab?.points} pts</span>
                            <span className="capitalize">{it.challenge?.difficulty || it.lab?.difficulty}</span>
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
            {/* Preview */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Total Items</span><span className="text-white font-medium">{pathItems.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Total Points</span><span className="text-red-400 font-medium">{calcTotalPoints()}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Est. Duration</span><span className="text-white font-medium">{form.estimated_duration}h</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Difficulty</span><span className="text-white font-medium capitalize">{form.difficulty}</span></div>
                {form.exam_type && <div className="flex justify-between"><span className="text-gray-400">Exam</span><span className="text-white font-medium">{form.exam_type}</span></div>}
                {form.passing_score_percent && <div className="flex justify-between"><span className="text-gray-400">Passing Score</span><span className="text-white font-medium">{form.passing_score_percent}%</span></div>}
                {form.exam_duration_minutes && <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="text-white font-medium">{form.exam_duration_minutes}m</span></div>}
              </div>
            </Card>
            {/* Item Stats */}
            {pathItems.length>0 && (
              <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
                <h3 className="text-lg font-semibold text-white mb-4">Item Breakdown</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400 flex items-center"><Flag className="h-4 w-4 mr-2"/>Challenges</span><span className="text-white font-medium">{pathItems.filter(i=>i.item_type==='challenge').length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 flex items-center"><Monitor className="h-4 w-4 mr-2"/>Labs</span><span className="text-white font-medium">{pathItems.filter(i=>i.item_type==='lab').length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 flex items-center"><Check className="h-4 w-4 mr-2"/>Required</span><span className="text-white font-medium">{pathItems.filter(i=>i.is_required).length}</span></div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Item Selector Modal */}
        <AnimatePresence>
          {showItemSelector && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }} className="bg-[#121212] rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Add Item to Certification</h3>
                  <button onClick={()=>setShowItemSelector(false)} className="p-2 text-gray-400 hover:text-white"><X className="h-5 w-5"/></button>
                </div>
                <div className="p-6">
                  <div className="flex gap-2 mb-6">
                    <button onClick={()=>setSelectedType('challenge')} className={`px-4 py-2 rounded-lg font-medium ${selectedType==='challenge'? 'bg-red-600 text-white':'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>Challenges ({challenges.length})</button>
                    <button onClick={()=>setSelectedType('lab')} className={`px-4 py-2 rounded-lg font-medium ${selectedType==='lab'? 'bg-red-600 text-white':'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}>Labs ({labs.length})</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {selectedType==='challenge' ? (
                      challenges.filter(c=> !pathItems.some(pi=>pi.item_id===c.id)).map(c=> (
                        <div key={c.id} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-red-500/30 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center"><Flag className="h-5 w-5"/></div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{c.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-400"><span className="capitalize">{c.challenge_type}</span><span>{c.points} pts</span><span className="capitalize">{c.difficulty}</span></div>
                          </div>
                          <button onClick={()=>addItem(c,'challenge')} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">Add</button>
                        </div>
                      ))
                    ) : (
                      labs.filter(l=> !pathItems.some(pi=>pi.item_id===l.id)).map(l=> (
                        <div key={l.id} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-red-500/30 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center"><Monitor className="h-5 w-5"/></div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{l.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-400"><span className="capitalize">{l.category}</span><span>{l.points} pts</span><span className="capitalize">{l.difficulty}</span></div>
                          </div>
                          <button onClick={()=>addItem(l,'lab')} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">Add</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreateCertificationPage;
