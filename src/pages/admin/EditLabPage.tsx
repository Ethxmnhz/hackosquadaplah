import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, AlertTriangle, Plus, Minus, FlaskRound as Flask, Trophy, Star, Clock, Target, Terminal, Download, ExternalLink, Image, Tag, Book, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Lab, LabQuestion } from '../../lib/types';
import Card from '../../components/ui/Card';

interface QuestionForm {
  id?: string;
  question: string;
  description: string;
  answer: string;
  points: number;
  question_type: 'flag' | 'multiple_choice' | 'code';
  hints: string[];
  options: string[];
  code_template: string;
}

const EditLabPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    estimated_time: 60,
    short_intro: '',
    learning_objectives: [''],
    attack_scenario: '',
    lab_type: 'docker' as 'docker' | 'vm' | 'external',
    docker_command: '',
    vm_download_url: '',
    external_link: '',
    setup_instructions: '',
    thumbnail_url: '',
    suggested_tools: [''],
    pre_reading_links: ['']
  });

  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  useEffect(() => {
    if (id) {
      loadLab();
    }
  }, [id]);

  const loadLab = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('labs')
        .select(`
          *,
          questions:lab_questions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setLab(data);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        difficulty: data.difficulty || '',
        estimated_time: data.estimated_time || 60,
        short_intro: data.short_intro || '',
        learning_objectives: data.learning_objectives || [''],
        attack_scenario: data.attack_scenario || '',
        lab_type: data.lab_type || 'docker',
        docker_command: data.docker_command || '',
        vm_download_url: data.vm_download_url || '',
        external_link: data.external_link || '',
        setup_instructions: data.setup_instructions || '',
        thumbnail_url: data.thumbnail_url || '',
        suggested_tools: data.suggested_tools || [''],
        pre_reading_links: data.pre_reading_links || ['']
      });

      setQuestions(data.questions?.map((q: LabQuestion) => ({
        id: q.id,
        question: q.question,
        description: q.description || '',
        answer: q.answer,
        points: q.points,
        question_type: q.question_type,
        hints: q.hints || [],
        options: q.options || [],
        code_template: q.code_template || ''
      })) || []);

    } catch (error) {
      console.error('Error loading lab:', error);
      setError('Failed to load lab');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Calculate total points
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      // Update lab
      const { error: labError } = await supabase
        .from('labs')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          difficulty: formData.difficulty,
          points: totalPoints,
          estimated_time: formData.estimated_time,
          short_intro: formData.short_intro,
          learning_objectives: formData.learning_objectives.filter(o => o.trim()),
          attack_scenario: formData.attack_scenario,
          lab_type: formData.lab_type,
          docker_command: formData.docker_command || null,
          vm_download_url: formData.vm_download_url || null,
          external_link: formData.external_link || null,
          setup_instructions: formData.setup_instructions || null,
          thumbnail_url: formData.thumbnail_url || null,
          suggested_tools: formData.suggested_tools.filter(t => t.trim()),
          pre_reading_links: formData.pre_reading_links.filter(l => l.trim()),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (labError) throw labError;

      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('lab_questions')
        .delete()
        .eq('lab_id', id);

      if (deleteError) throw deleteError;

      // Insert updated questions
      if (questions.length > 0) {
        const { error: questionsError } = await supabase
          .from('lab_questions')
          .insert(
            questions.map((q, index) => ({
              lab_id: id,
              question_number: index + 1,
              question: q.question,
              description: q.description || null,
              answer: q.answer,
              points: q.points,
              question_type: q.question_type,
              hints: q.hints || [],
              options: q.options || [],
              code_template: q.code_template || null
            }))
          );

        if (questionsError) throw questionsError;
      }

      setSuccess('Lab updated successfully!');
      setTimeout(() => {
        navigate('/admin/labs');
      }, 2000);

    } catch (error) {
      console.error('Error updating lab:', error);
      setError('Failed to update lab');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lab? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('labs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/admin/labs');
    } catch (error) {
      console.error('Error deleting lab:', error);
      setError('Failed to delete lab');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (field: keyof typeof formData, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: keyof typeof formData) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayItem = (field: keyof typeof formData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionForm, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { 
      question: '', 
      description: '', 
      answer: '', 
      points: 10,
      question_type: 'flag',
      hints: [],
      options: [],
      code_template: ''
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse text-accent-blue text-xl text-center">Loading lab...</div>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-error-light mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Lab Not Found</h2>
          <p className="text-gray-400">The lab you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/labs')}
            className="btn-primary mt-4"
          >
            Back to Labs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/labs')}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Labs
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Lab</h1>
              <p className="text-gray-400">Modify lab details and questions</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleDelete}
              className="btn-outline text-error-light border-error-light/30 hover:bg-error-light/10 flex items-center"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Delete Lab
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary bg-accent-blue hover:bg-accent-blue/90 flex items-center"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 p-4 bg-error-dark/20 border border-error-light/30 rounded-lg text-error-light">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 p-4 bg-success-dark/20 border border-success-light/30 rounded-lg text-success-light">
            <Flask className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="form-label">Lab Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="category" className="form-label">Category *</label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select category</option>
                  <option value="web">Web Security</option>
                  <option value="network">Network Security</option>
                  <option value="crypto">Cryptography</option>
                  <option value="misc">Miscellaneous</option>
                  <option value="forensics">Digital Forensics</option>
                  <option value="reverse">Reverse Engineering</option>
                </select>
              </div>

              <div>
                <label htmlFor="difficulty" className="form-label">Difficulty *</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  required
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="insane">Insane</option>
                </select>
              </div>

              <div>
                <label htmlFor="estimated_time" className="form-label">Estimated Time (minutes)</label>
                <input
                  type="number"
                  id="estimated_time"
                  name="estimated_time"
                  min="15"
                  value={formData.estimated_time}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="form-label">Description *</label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="form-input"
              />
            </div>
          </Card>

          {/* Lab Environment */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Lab Environment</h2>
            
            <div className="mb-6">
              <label className="form-label">Lab Type *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'docker', label: 'Docker Container', icon: Terminal },
                  { id: 'vm', label: 'VM Download', icon: Download },
                  { id: 'external', label: 'External Link', icon: ExternalLink }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, lab_type: type.id as any }))}
                    className={`p-4 rounded-lg border text-center transition-all duration-200 ${
                      formData.lab_type === type.id
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-background-light hover:border-gray-600'
                    }`}
                  >
                    <type.icon className="h-6 w-6 mb-2 mx-auto" />
                    <span className="block text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {formData.lab_type === 'docker' && (
              <div>
                <label htmlFor="docker_command" className="form-label">Docker Command</label>
                <input
                  type="text"
                  id="docker_command"
                  name="docker_command"
                  value={formData.docker_command}
                  onChange={handleChange}
                  className="form-input font-mono"
                  placeholder="docker pull hackosquad/lab-name"
                />
              </div>
            )}

            {formData.lab_type === 'vm' && (
              <div>
                <label htmlFor="vm_download_url" className="form-label">VM Download URL</label>
                <input
                  type="url"
                  id="vm_download_url"
                  name="vm_download_url"
                  value={formData.vm_download_url}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="https://example.com/lab-vm.ova"
                />
              </div>
            )}

            {formData.lab_type === 'external' && (
              <div>
                <label htmlFor="external_link" className="form-label">External Lab Link</label>
                <input
                  type="url"
                  id="external_link"
                  name="external_link"
                  value={formData.external_link}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="https://example.com/lab"
                />
              </div>
            )}
          </Card>

          {/* Questions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Questions</h2>
              <button
                onClick={addQuestion}
                className="btn-primary bg-accent-blue hover:bg-accent-blue/90 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q, index) => (
                <Card key={index} className="p-4 bg-background-light">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-medium">Question {index + 1}</h4>
                    {questions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Question *</label>
                      <input
                        type="text"
                        required
                        value={q.question}
                        onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Answer *</label>
                      <input
                        type="text"
                        required
                        value={q.answer}
                        onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Points *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={q.points}
                        onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value) || 10)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Question Type</label>
                      <select
                        value={q.question_type}
                        onChange={(e) => handleQuestionChange(index, 'question_type', e.target.value)}
                        className="form-input"
                      >
                        <option value="flag">Flag Submission</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="code">Code Challenge</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="form-label">Description</label>
                    <textarea
                      value={q.description}
                      onChange={(e) => handleQuestionChange(index, 'description', e.target.value)}
                      rows={2}
                      className="form-input"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lab Status */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Lab Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  lab.status === 'published' ? 'bg-success-dark/20 text-success-light' :
                  lab.status === 'draft' ? 'bg-warning-dark/20 text-warning-light' :
                  'bg-error-dark/20 text-error-light'
                }`}>
                  {lab.status.charAt(0).toUpperCase() + lab.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Points</span>
                <span className="text-white font-medium">{questions.reduce((sum, q) => sum + q.points, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Questions</span>
                <span className="text-white font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-white font-medium">{new Date(lab.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = `/labs/${lab.id}`}
                className="w-full btn-outline flex items-center justify-center"
              >
                <Target className="h-4 w-4 mr-2" />
                Preview Lab
              </button>
              <button
                onClick={() => window.location.href = '/admin/labs'}
                className="w-full btn-outline flex items-center justify-center"
              >
                <Flask className="h-4 w-4 mr-2" />
                Manage Labs
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditLabPage;