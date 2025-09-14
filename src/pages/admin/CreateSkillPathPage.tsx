import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, Plus, X, ChevronUp, ChevronDown,
  Flag, Monitor, Shield, Terminal, Lock, Target, Trophy,
  Clock, Users, Save, Eye, AlertTriangle, Check, GripVertical
} from 'lucide-react';
import { createSkillPath, loadChallenges, getLabs } from '../../lib/api';
import { Challenge, Lab, SkillPathItem } from '../../lib/types';
import Card from '../../components/ui/Card';

interface SkillPathForm {
  title: string;
  description: string;
  short_description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  estimated_duration: number;
  learning_objectives: string[];
  prerequisites: string[];
  cover_image?: string;
  is_published: boolean;
}

const CreateSkillPathPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<SkillPathForm>({
    title: '',
    description: '',
    short_description: '',
    difficulty: 'beginner',
    category: 'Web Security',
    estimated_duration: 1,
    learning_objectives: [''],
    prerequisites: [''],
    is_published: false
  });

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [pathItems, setPathItems] = useState<Partial<SkillPathItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<'challenge' | 'lab'>('challenge');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [challengesResult, labsResult] = await Promise.all([
        loadChallenges(),
        getLabs()
      ]);

      if (challengesResult.success) {
        setChallenges(challengesResult.data || []);
      }
      if (labsResult.success) {
        setLabs(labsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const categories = ['Web Security', 'Network Security', 'Cryptography', 'Digital Forensics', 'Penetration Testing', 'Malware Analysis'];

  const handleInputChange = (field: keyof SkillPathForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'learning_objectives' | 'prerequisites', index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'learning_objectives' | 'prerequisites') => {
    setForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'learning_objectives' | 'prerequisites', index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const addItem = (item: Challenge | Lab, type: 'challenge' | 'lab') => {
    const newItem: Partial<SkillPathItem> = {
      id: `temp-${Date.now()}`,
      item_type: type,
      item_id: item.id,
      order_index: pathItems.length,
      is_required: true,
      unlock_after: [],
      [type]: item
    };

    setPathItems(prev => [...prev, newItem]);
    setShowItemSelector(false);
  };

  const removeItem = (index: number) => {
    setPathItems(prev => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...pathItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      
      // Update order indices
      newItems.forEach((item, i) => {
        item.order_index = i;
      });
      
      setPathItems(newItems);
    }
  };

  const toggleRequired = (index: number) => {
    setPathItems(prev => prev.map((item, i) => 
      i === index ? { ...item, is_required: !item.is_required } : item
    ));
  };

  const getItemIcon = (type: string, challengeType?: string) => {
    if (type === 'challenge') {
      switch (challengeType) {
        case 'web': return <Shield className="h-4 w-4" />;
        case 'network': return <Terminal className="h-4 w-4" />;
        case 'crypto': return <Lock className="h-4 w-4" />;
        default: return <Flag className="h-4 w-4" />;
      }
    }
    return <Monitor className="h-4 w-4" />;
  };

  const calculateTotalPoints = () => {
    return pathItems.reduce((sum, item) => {
      const points = item.challenge?.points || item.lab?.points || 0;
      return sum + points;
    }, 0);
  };

  const handleSave = async (publish: boolean = false) => {
    if (!form.title || !form.description || pathItems.length === 0) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }

    setSaving(true);
    try {
      const skillPathData = {
        ...form,
        is_published: publish,
        total_points: calculateTotalPoints(),
        learning_objectives: form.learning_objectives.filter(obj => obj.trim()),
        prerequisites: form.prerequisites.filter(prereq => prereq.trim())
      };

      const result = await createSkillPath(skillPathData);
      if (result.success) {
        // Create path items
        const itemsData = pathItems.map(item => ({
          skill_path_id: result.data.id,
          item_type: item.item_type!,
          item_id: item.item_id!,
          order_index: item.order_index!,
          is_required: item.is_required!,
          unlock_after: item.unlock_after || []
        }));

        // Create skill path items
        const itemsResult = await createSkillPathItems(result.data.id, itemsData);
        
        if (itemsResult.success) {
          navigate('/admin/skill-paths');
        } else {
          throw new Error('Failed to create skill path items');
        }
      }
    } catch (error) {
      console.error('Error creating skill path:', error);
      alert('Failed to create skill path');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/skill-paths')}
              className="flex items-center text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Skill Paths
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Skill Path</h1>
              <p className="text-gray-400">Design a structured learning journey</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center disabled:opacity-50"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Enter skill path title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Short Description</label>
                  <input
                    type="text"
                    value={form.short_description}
                    onChange={(e) => handleInputChange('short_description', e.target.value)}
                    className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Brief description for cards"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Detailed description of the skill path"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.estimated_duration}
                      onChange={(e) => handleInputChange('estimated_duration', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Learning Objectives */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Learning Objectives</h2>
              
              <div className="space-y-3">
                {form.learning_objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => handleArrayChange('learning_objectives', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                      placeholder="Enter learning objective"
                    />
                    <button
                      onClick={() => removeArrayItem('learning_objectives', index)}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('learning_objectives')}
                  className="flex items-center text-red-400 hover:text-red-300 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Objective
                </button>
              </div>
            </Card>

            {/* Prerequisites */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Prerequisites</h2>
              
              <div className="space-y-3">
                {form.prerequisites.map((prereq, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={prereq}
                      onChange={(e) => handleArrayChange('prerequisites', index, e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                      placeholder="Enter prerequisite"
                    />
                    <button
                      onClick={() => removeArrayItem('prerequisites', index)}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('prerequisites')}
                  className="flex items-center text-red-400 hover:text-red-300 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prerequisite
                </button>
              </div>
            </Card>

            {/* Path Items */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Learning Path Items</h2>
                <button
                  onClick={() => setShowItemSelector(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              {pathItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items added yet. Click "Add Item" to start building your skill path.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pathItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                      {/* Drag Handle */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === pathItems.length - 1}
                          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Item Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                          {getItemIcon(item.item_type!, item.challenge?.challenge_type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">
                            {item.challenge?.title || item.lab?.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="capitalize">{item.item_type}</span>
                            <span>{item.challenge?.points || item.lab?.points} points</span>
                            <span className="capitalize">{item.challenge?.difficulty || item.lab?.difficulty}</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRequired(index)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            item.is_required 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-slate-700/50 text-gray-400 border border-slate-600/30'
                          }`}
                        >
                          {item.is_required ? 'Required' : 'Optional'}
                        </button>
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Items</span>
                  <span className="text-white font-medium">{pathItems.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Points</span>
                  <span className="text-red-400 font-medium">{calculateTotalPoints()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Est. Duration</span>
                  <span className="text-white font-medium">{form.estimated_duration}h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Difficulty</span>
                  <span className="text-white font-medium capitalize">{form.difficulty}</span>
                </div>
              </div>
            </Card>

            {/* Item Stats */}
            {pathItems.length > 0 && (
              <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
                <h3 className="text-lg font-semibold text-white mb-4">Item Breakdown</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <Flag className="h-4 w-4 mr-2" />
                      Challenges
                    </span>
                    <span className="text-white font-medium">
                      {pathItems.filter(item => item.item_type === 'challenge').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <Monitor className="h-4 w-4 mr-2" />
                      Labs
                    </span>
                    <span className="text-white font-medium">
                      {pathItems.filter(item => item.item_type === 'lab').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 flex items-center">
                      <Check className="h-4 w-4 mr-2" />
                      Required
                    </span>
                    <span className="text-white font-medium">
                      {pathItems.filter(item => item.is_required).length}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Item Selector Modal */}
        <AnimatePresence>
          {showItemSelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#121212] rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Add Item to Skill Path</h3>
                  <button
                    onClick={() => setShowItemSelector(false)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Type Selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setSelectedType('challenge')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedType === 'challenge'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Flag className="h-4 w-4 mr-2 inline" />
                      Challenges ({challenges.length})
                    </button>
                    <button
                      onClick={() => setSelectedType('lab')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedType === 'lab'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Monitor className="h-4 w-4 mr-2 inline" />
                      Labs ({labs.length})
                    </button>
                  </div>

                  {/* Items List */}
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {selectedType === 'challenge' ? (
                      challenges
                        .filter(challenge => !pathItems.some(item => item.item_id === challenge.id))
                        .map(challenge => (
                          <div key={challenge.id} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-red-500/30 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                              {getItemIcon('challenge', challenge.challenge_type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{challenge.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="capitalize">{challenge.challenge_type}</span>
                                <span>{challenge.points} points</span>
                                <span className="capitalize">{challenge.difficulty}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => addItem(challenge, 'challenge')}
                              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        ))
                    ) : (
                      labs
                        .filter(lab => !pathItems.some(item => item.item_id === lab.id))
                        .map(lab => (
                          <div key={lab.id} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30 hover:border-red-500/30 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                              <Monitor className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{lab.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="capitalize">{lab.category}</span>
                                <span>{lab.points} points</span>
                                <span className="capitalize">{lab.difficulty}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => addItem(lab, 'lab')}
                              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Add
                            </button>
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

export default CreateSkillPathPage;
