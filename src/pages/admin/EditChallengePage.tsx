import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Trash2, AlertTriangle, Plus, Minus,
  Flag, Trophy, Star, Clock, Users, Target, Book,
  Eye, EyeOff, FileText, Tag, Image, Terminal, Hash,
  ChevronDown, ChevronUp, Monitor, Globe, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Challenge } from '../../lib/types';
import Card from '../../components/ui/Card';

interface QuestionForm {
  id?: string;
  question: string;
  description: string;
  flag: string;
  points: number;
  hints: string[];
  solution_explanation: string;
  difficulty_rating: number;
}

interface Question {
  id: string;
  question_text: string;
  expected_answer: string;
  points: number;
  hints: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  explanation: string;
  questions: Question[];
  expanded: boolean;
  lab_environment?: {
    enabled: boolean;
    lab_type?: 'web_app' | 'docker';
    web_app_url?: string;
    docker_image?: string;
    setup_instructions?: string;
    duration?: number;
  };
}

const EditChallengePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEnhancedChallenge, setIsEnhancedChallenge] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: '',
    difficulty: '',
    icon_url: '',
    short_description: '',
    scenario: '',
    learning_objectives: [''],
    tools_required: [''],
    references: [''],
    prerequisites: [''],
    target_audience: '',
    estimated_time: 30,
    author_notes: ''
  });

  // Enhanced structure for tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Legacy structure for questions
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Global lab environment
  const [globalLabEnvironment, setGlobalLabEnvironment] = useState({
    enabled: false,
    lab_type: 'web_app' as 'web_app' | 'docker',
    web_app_url: '',
    docker_image: '',
    setup_instructions: '',
    duration: 60
  });

  useEffect(() => {
    if (id) {
      loadChallenge();
    }
  }, [id]);

  const loadChallenge = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          questions:challenge_questions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setChallenge(data);
      
      // Load basic form data
      setFormData({
        title: data.title || '',
        description: data.description || '',
        challenge_type: data.challenge_type || '',
        difficulty: data.difficulty || '',
        icon_url: data.icon_url || '',
        short_description: data.short_description || '',
        scenario: data.scenario || '',
        learning_objectives: data.learning_objectives || [''],
        tools_required: data.tools_required || [''],
        references: data.references || [''],
        prerequisites: data.prerequisites || [''],
        target_audience: data.target_audience || '',
        estimated_time: data.estimated_time || 30,
        author_notes: data.author_notes?.split('=== LAB ENVIRONMENT ===')[0]?.split('=== ENHANCED TASKS STRUCTURE ===')[0]?.trim() || ''
      });

      // Check if this is an enhanced challenge with tasks structure
      let enhancedTasks = null;
      let labEnvironment = { enabled: false };

      if (data.author_notes?.includes('=== ENHANCED TASKS STRUCTURE ===')) {
        setIsEnhancedChallenge(true);
        
        try {
          const tasksSection = data.author_notes.split('=== ENHANCED TASKS STRUCTURE ===')[1];
          if (tasksSection) {
            enhancedTasks = JSON.parse(tasksSection.trim());
            console.log('✅ Loaded enhanced tasks:', enhancedTasks);
            
            setTasks(enhancedTasks.map(task => ({
              ...task,
              expanded: true,
              questions: task.questions || []
            })));
          }
        } catch (parseError) {
          console.error('Failed to parse enhanced tasks:', parseError);
          setIsEnhancedChallenge(false);
        }
      }

      // Parse lab environment
      if (data.author_notes?.includes('=== LAB ENVIRONMENT ===')) {
        try {
          const labSection = data.author_notes.split('=== LAB ENVIRONMENT ===')[1]?.split('=== ENHANCED TASKS STRUCTURE ===')[0];
          if (labSection) {
            labEnvironment = JSON.parse(labSection.trim());
            console.log('✅ Loaded lab environment:', labEnvironment);
            setGlobalLabEnvironment({
              enabled: labEnvironment.enabled || false,
              lab_type: labEnvironment.lab_type || 'web_app',
              web_app_url: labEnvironment.web_app_url || '',
              docker_image: labEnvironment.docker_image || '',
              setup_instructions: labEnvironment.setup_instructions || '',
              duration: labEnvironment.duration || 60
            });
          }
        } catch (parseError) {
          console.error('Failed to parse lab environment:', parseError);
        }
      }

      // If not enhanced, load legacy questions
      if (!isEnhancedChallenge && data.questions) {
        setQuestions(data.questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          description: q.description || '',
          flag: q.flag,
          points: q.points,
          hints: q.hints || [],
          solution_explanation: q.solution_explanation || '',
          difficulty_rating: q.difficulty_rating || 3
        })));
      }

    } catch (error) {
      console.error('Error loading challenge:', error);
      setError('Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let totalPoints = 0;
      let authorNotes = formData.author_notes || '';

      // Calculate total points based on structure
      if (isEnhancedChallenge) {
        totalPoints = tasks.reduce((sum, task) => 
          sum + task.questions.reduce((qSum, q) => qSum + q.points, 0), 0
        );

        // Add lab environment to author_notes
        if (globalLabEnvironment.enabled || tasks.some(t => t.lab_environment?.enabled)) {
          authorNotes += '\n\n=== LAB ENVIRONMENT ===\n' + JSON.stringify(globalLabEnvironment);
        }

        // Add enhanced tasks structure to author_notes
        authorNotes += '\n\n=== ENHANCED TASKS STRUCTURE ===\n' + JSON.stringify(tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          explanation: task.explanation,
          questions: task.questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            expected_answer: q.expected_answer,
            answer_validation: 'exact',
            case_sensitive: false,
            points: q.points,
            hints: q.hints.map(hint => ({
              text: hint,
              unlock_after_attempts: 2
            })),
            question_type: 'text'
          })),
          attachments: [],
          lab_environment: task.lab_environment || { enabled: false }
        })));
      } else {
        totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      }

      // Update challenge
      const { error: challengeError } = await supabase
        .from('challenges')
        .update({
          title: formData.title,
          description: formData.description,
          challenge_type: formData.challenge_type,
          difficulty: formData.difficulty,
          icon_url: formData.icon_url || null,
          short_description: formData.short_description || null,
          scenario: formData.scenario || null,
          learning_objectives: formData.learning_objectives.filter(o => o.trim()),
          tools_required: formData.tools_required.filter(t => t.trim()),
          references: formData.references.filter(r => r.trim()),
          prerequisites: formData.prerequisites.filter(p => p.trim()),
          target_audience: formData.target_audience || null,
          estimated_time: formData.estimated_time,
          author_notes: authorNotes,
          points: totalPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (challengeError) throw challengeError;

      // For legacy challenges, update questions table
      if (!isEnhancedChallenge) {
        // Delete existing questions
        const { error: deleteError } = await supabase
          .from('challenge_questions')
          .delete()
          .eq('challenge_id', id);

        if (deleteError) throw deleteError;

        // Insert updated questions
        if (questions.length > 0) {
          const { error: questionsError } = await supabase
            .from('challenge_questions')
            .insert(
              questions.map((q, index) => ({
                challenge_id: id,
                question_number: index + 1,
                question: q.question,
                description: q.description || null,
                flag: q.flag,
                points: q.points,
                hints: q.hints || [],
                solution_explanation: q.solution_explanation || null,
                difficulty_rating: q.difficulty_rating || 3
              }))
            );

          if (questionsError) throw questionsError;
        }
      }

      setSuccess('Challenge updated successfully!');
      setTimeout(() => {
        navigate('/admin');
      }, 2000);

    } catch (error) {
      console.error('Error updating challenge:', error);
      setError('Failed to update challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/admin');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      setError('Failed to delete challenge');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Task management functions
  const addTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: '',
      description: '',
      explanation: '',
      questions: [{
        id: `${Date.now()}-1`,
        question_text: '',
        expected_answer: '',
        points: 10,
        hints: ['']
      }],
      expanded: true,
      lab_environment: { enabled: false }
    };
    setTasks(prev => [...prev, newTask]);
  };

  const removeTask = (taskId: string) => {
    if (tasks.length > 1) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const updateTask = (taskId: string, field: keyof Task, value: any) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, [field]: value } : task
    ));
  };

  const toggleTaskExpansion = (taskId: string) => {
    updateTask(taskId, 'expanded', !tasks.find(t => t.id === taskId)?.expanded);
  };

  // Question management functions for tasks
  const addQuestionToTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newQuestion: Question = {
        id: `${taskId}-${task.questions.length + 1}`,
        question_text: '',
        expected_answer: '',
        points: 10,
        hints: ['']
      };
      updateTask(taskId, 'questions', [...task.questions, newQuestion]);
    }
  };

  const removeQuestionFromTask = (taskId: string, questionId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.questions.length > 1) {
      updateTask(taskId, 'questions', task.questions.filter(q => q.id !== questionId));
    }
  };

  const updateQuestionInTask = (taskId: string, questionId: string, field: keyof Question, value: any) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedQuestions = task.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      );
      updateTask(taskId, 'questions', updatedQuestions);
    }
  };

  // Legacy question management functions
  const handleQuestionChange = (index: number, field: keyof QuestionForm, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { 
      question: '', 
      description: '', 
      flag: '', 
      points: 1,
      hints: [],
      solution_explanation: '',
      difficulty_rating: 3
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Array field management
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse text-primary text-xl text-center">Loading challenge...</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-error-light mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Challenge Not Found</h2>
          <p className="text-gray-400">The challenge you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin')}
            className="btn-primary mt-4"
          >
            Back to Admin
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
              onClick={() => navigate('/admin')}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Admin
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Challenge</h1>
              <p className="text-gray-400">
                {isEnhancedChallenge ? 'Enhanced Challenge with Tasks' : 'Legacy Challenge'}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsEnhancedChallenge(!isEnhancedChallenge)}
              className="btn-outline flex items-center"
            >
              <Target className="h-5 w-5 mr-2" />
              {isEnhancedChallenge ? 'Switch to Legacy' : 'Switch to Enhanced'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center"
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
            <Trophy className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <div className="space-y-8">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="form-label">Challenge Title *</label>
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
              <label htmlFor="challenge_type" className="form-label">Category *</label>
              <select
                id="challenge_type"
                name="challenge_type"
                required
                value={formData.challenge_type}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select category</option>
                <option value="web">Web Security</option>
                <option value="network">Network Security</option>
                <option value="crypto">Cryptography</option>
                <option value="misc">Miscellaneous</option>
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
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label htmlFor="estimated_time" className="form-label">Estimated Time (minutes)</label>
              <input
                type="number"
                id="estimated_time"
                name="estimated_time"
                min="5"
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

          <div className="mt-6">
            <label htmlFor="short_description" className="form-label">Short Description</label>
            <input
              type="text"
              id="short_description"
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              className="form-input"
              placeholder="Brief description for challenge cards"
            />
          </div>

          <div className="mt-6">
            <label htmlFor="icon_url" className="form-label">Icon URL</label>
            <div className="flex gap-4">
              <input
                type="url"
                id="icon_url"
                name="icon_url"
                value={formData.icon_url}
                onChange={handleChange}
                className="form-input flex-1"
                placeholder="https://example.com/icon.png"
              />
              {formData.icon_url && (
                <div className="w-16 h-16 rounded-lg border border-slate-600 flex items-center justify-center bg-slate-800">
                  <img 
                    src={formData.icon_url} 
                    alt="Challenge icon" 
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<div class="text-gray-400 text-xs">Invalid</div>';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="scenario" className="form-label">Scenario</label>
            <textarea
              id="scenario"
              name="scenario"
              value={formData.scenario}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder="Background story or context for the challenge"
            />
          </div>
        </Card>

        {/* Lab Environment */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Lab Environment</h2>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalLabEnvironment.enabled}
                  onChange={(e) => setGlobalLabEnvironment(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  globalLabEnvironment.enabled ? 'bg-primary border-primary' : 'border-slate-600'
                }`}>
                  {globalLabEnvironment.enabled && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="ml-3 text-white font-medium">Enable Global Lab Environment</span>
              </label>
            </div>

            {globalLabEnvironment.enabled && (
              <div className="space-y-4 border border-slate-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Lab Type</label>
                    <select
                      value={globalLabEnvironment.lab_type}
                      onChange={(e) => setGlobalLabEnvironment(prev => ({ 
                        ...prev, 
                        lab_type: e.target.value as 'web_app' | 'docker' 
                      }))}
                      className="form-input"
                    >
                      <option value="web_app">Web Application</option>
                      <option value="docker">Docker Container</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Duration (minutes)</label>
                    <input
                      type="number"
                      min="15"
                      max="180"
                      value={globalLabEnvironment.duration}
                      onChange={(e) => setGlobalLabEnvironment(prev => ({ 
                        ...prev, 
                        duration: parseInt(e.target.value) || 60 
                      }))}
                      className="form-input"
                    />
                  </div>
                </div>

                {globalLabEnvironment.lab_type === 'web_app' && (
                  <div>
                    <label className="form-label">Web App URL</label>
                    <input
                      type="url"
                      value={globalLabEnvironment.web_app_url}
                      onChange={(e) => setGlobalLabEnvironment(prev => ({ 
                        ...prev, 
                        web_app_url: e.target.value 
                      }))}
                      className="form-input"
                      placeholder="https://lab.example.com"
                    />
                  </div>
                )}

                {globalLabEnvironment.lab_type === 'docker' && (
                  <div>
                    <label className="form-label">Docker Image</label>
                    <input
                      type="text"
                      value={globalLabEnvironment.docker_image}
                      onChange={(e) => setGlobalLabEnvironment(prev => ({ 
                        ...prev, 
                        docker_image: e.target.value 
                      }))}
                      className="form-input"
                      placeholder="nginx:latest"
                    />
                  </div>
                )}

                <div>
                  <label className="form-label">Setup Instructions</label>
                  <textarea
                    value={globalLabEnvironment.setup_instructions}
                    onChange={(e) => setGlobalLabEnvironment(prev => ({ 
                      ...prev, 
                      setup_instructions: e.target.value 
                    }))}
                    rows={4}
                    className="form-input"
                    placeholder="Instructions for setting up the lab environment..."
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Enhanced Tasks Structure */}
        {isEnhancedChallenge ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Tasks & Questions</h2>
              <button
                onClick={addTask}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </button>
            </div>

            <div className="space-y-6">
              {tasks.map((task, taskIndex) => (
                <Card key={task.id} className="p-4 bg-background-light border border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => toggleTaskExpansion(task.id)}
                      className="flex items-center text-lg font-bold text-white hover:text-primary transition-colors"
                    >
                      {task.expanded ? <ChevronUp className="h-5 w-5 mr-2" /> : <ChevronDown className="h-5 w-5 mr-2" />}
                      Task {taskIndex + 1}: {task.title || 'Untitled Task'}
                    </button>
                    
                    {tasks.length > 1 && (
                      <button
                        onClick={() => removeTask(task.id)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {task.expanded && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Task Title *</label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                            className="form-input"
                            placeholder="e.g., SQL Injection Basics"
                          />
                        </div>
                        
                        <div>
                          <label className="form-label">Short Description *</label>
                          <input
                            type="text"
                            value={task.description}
                            onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                            className="form-input"
                            placeholder="Brief overview of this task"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Task Explanation</label>
                        <textarea
                          value={task.explanation}
                          onChange={(e) => updateTask(task.id, 'explanation', e.target.value)}
                          rows={4}
                          className="form-input"
                          placeholder="Detailed explanation of the task..."
                        />
                      </div>

                      {/* Task Lab Environment */}
                      <div className="border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center gap-4 mb-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={task.lab_environment?.enabled || false}
                              onChange={(e) => updateTask(task.id, 'lab_environment', {
                                ...task.lab_environment,
                                enabled: e.target.checked
                              })}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              task.lab_environment?.enabled ? 'bg-accent-blue border-accent-blue' : 'border-slate-600'
                            }`}>
                              {task.lab_environment?.enabled && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="ml-2 text-sm font-medium text-white">Enable Task-Specific Lab</span>
                          </label>
                        </div>

                        {task.lab_environment?.enabled && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="form-label text-sm">Lab Type</label>
                                <select
                                  value={task.lab_environment?.lab_type || 'web_app'}
                                  onChange={(e) => updateTask(task.id, 'lab_environment', {
                                    ...task.lab_environment,
                                    lab_type: e.target.value
                                  })}
                                  className="form-input text-sm"
                                >
                                  <option value="web_app">Web Application</option>
                                  <option value="docker">Docker Container</option>
                                </select>
                              </div>

                              <div>
                                <label className="form-label text-sm">Duration (minutes)</label>
                                <input
                                  type="number"
                                  min="15"
                                  max="120"
                                  value={task.lab_environment?.duration || 45}
                                  onChange={(e) => updateTask(task.id, 'lab_environment', {
                                    ...task.lab_environment,
                                    duration: parseInt(e.target.value) || 45
                                  })}
                                  className="form-input text-sm"
                                />
                              </div>
                            </div>

                            {task.lab_environment?.lab_type === 'web_app' && (
                              <div>
                                <label className="form-label text-sm">Web App URL</label>
                                <input
                                  type="url"
                                  value={task.lab_environment?.web_app_url || ''}
                                  onChange={(e) => updateTask(task.id, 'lab_environment', {
                                    ...task.lab_environment,
                                    web_app_url: e.target.value
                                  })}
                                  className="form-input text-sm"
                                  placeholder="https://task-lab.example.com"
                                />
                              </div>
                            )}

                            {task.lab_environment?.lab_type === 'docker' && (
                              <div>
                                <label className="form-label text-sm">Docker Image</label>
                                <input
                                  type="text"
                                  value={task.lab_environment?.docker_image || ''}
                                  onChange={(e) => updateTask(task.id, 'lab_environment', {
                                    ...task.lab_environment,
                                    docker_image: e.target.value
                                  })}
                                  className="form-input text-sm"
                                  placeholder="custom-lab:latest"
                                />
                              </div>
                            )}

                            <div>
                              <label className="form-label text-sm">Setup Instructions</label>
                              <textarea
                                value={task.lab_environment?.setup_instructions || ''}
                                onChange={(e) => updateTask(task.id, 'lab_environment', {
                                  ...task.lab_environment,
                                  setup_instructions: e.target.value
                                })}
                                rows={2}
                                className="form-input text-sm"
                                placeholder="Task-specific setup instructions..."
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Task Questions */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white">Questions</h4>
                          <button
                            onClick={() => addQuestionToTask(task.id)}
                            className="btn-outline flex items-center text-sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </button>
                        </div>

                        {task.questions.map((question, questionIndex) => (
                          <Card key={question.id} className="p-4 bg-background-default">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-primary">Question {questionIndex + 1}</h5>
                              {task.questions.length > 1 && (
                                <button
                                  onClick={() => removeQuestionFromTask(task.id, question.id)}
                                  className="text-error-light hover:text-error-light/80"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <label className="form-label">Question Text *</label>
                                <input
                                  type="text"
                                  value={question.question_text}
                                  onChange={(e) => updateQuestionInTask(task.id, question.id, 'question_text', e.target.value)}
                                  className="form-input"
                                  placeholder="What is the flag?"
                                />
                              </div>

                              <div>
                                <label className="form-label">Expected Answer *</label>
                                <input
                                  type="text"
                                  value={question.expected_answer}
                                  onChange={(e) => updateQuestionInTask(task.id, question.id, 'expected_answer', e.target.value)}
                                  className="form-input font-mono"
                                  placeholder="THM{flag_here}"
                                />
                              </div>

                              <div>
                                <label className="form-label">Points</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={question.points}
                                  onChange={(e) => updateQuestionInTask(task.id, question.id, 'points', parseInt(e.target.value) || 10)}
                                  className="form-input"
                                />
                              </div>

                              <div>
                                <label className="form-label">Hints</label>
                                <div className="space-y-2">
                                  {question.hints.map((hint, hintIndex) => (
                                    <div key={hintIndex} className="flex gap-2">
                                      <input
                                        type="text"
                                        value={hint}
                                        onChange={(e) => {
                                          const newHints = [...question.hints];
                                          newHints[hintIndex] = e.target.value;
                                          updateQuestionInTask(task.id, question.id, 'hints', newHints);
                                        }}
                                        className="form-input flex-1"
                                        placeholder="Helpful hint"
                                      />
                                      {question.hints.length > 1 && (
                                        <button
                                          onClick={() => {
                                            const newHints = question.hints.filter((_, i) => i !== hintIndex);
                                            updateQuestionInTask(task.id, question.id, 'hints', newHints);
                                          }}
                                          className="text-error-light hover:text-error-light/80"
                                        >
                                          <Minus className="h-5 w-5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newHints = [...question.hints, ''];
                                      updateQuestionInTask(task.id, question.id, 'hints', newHints);
                                    }}
                                    className="btn-outline flex items-center text-sm"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Hint
                                  </button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        ) : (
          /* Legacy Questions Structure */
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Questions</h2>
              <button
                onClick={addQuestion}
                className="btn-primary flex items-center"
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
                      <label className="form-label">Flag *</label>
                      <input
                        type="text"
                        required
                        value={q.flag}
                        onChange={(e) => handleQuestionChange(index, 'flag', e.target.value)}
                        className="form-input font-mono"
                        placeholder="HKQ{flag_here}"
                      />
                    </div>

                    <div>
                      <label className="form-label">Points (1-5) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="5"
                        value={q.points}
                        onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value) || 1)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Difficulty Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={q.difficulty_rating}
                        onChange={(e) => handleQuestionChange(index, 'difficulty_rating', parseInt(e.target.value) || 3)}
                        className="form-input"
                      />
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

                  <div className="mt-4">
                    <label className="form-label">Solution Explanation</label>
                    <textarea
                      value={q.solution_explanation}
                      onChange={(e) => handleQuestionChange(index, 'solution_explanation', e.target.value)}
                      rows={3}
                      className="form-input"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Additional Information */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Additional Information</h2>
          
          <div className="space-y-6">
            {/* Learning Objectives */}
            <div>
              <label className="form-label">Learning Objectives</label>
              <div className="space-y-2">
                {formData.learning_objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => handleArrayChange('learning_objectives', index, e.target.value)}
                      className="form-input flex-1"
                      placeholder="What will students learn?"
                    />
                    {formData.learning_objectives.length > 1 && (
                      <button
                        onClick={() => removeArrayItem('learning_objectives', index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('learning_objectives')}
                  className="btn-outline flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Objective
                </button>
              </div>
            </div>

            {/* Tools Required */}
            <div>
              <label className="form-label">Tools Required</label>
              <div className="space-y-2">
                {formData.tools_required.map((tool, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tool}
                      onChange={(e) => handleArrayChange('tools_required', index, e.target.value)}
                      className="form-input flex-1"
                      placeholder="e.g., Burp Suite, nmap"
                    />
                    {formData.tools_required.length > 1 && (
                      <button
                        onClick={() => removeArrayItem('tools_required', index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('tools_required')}
                  className="btn-outline flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tool
                </button>
              </div>
            </div>

            {/* Prerequisites */}
            <div>
              <label className="form-label">Prerequisites</label>
              <div className="space-y-2">
                {formData.prerequisites.map((prereq, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={prereq}
                      onChange={(e) => handleArrayChange('prerequisites', index, e.target.value)}
                      className="form-input flex-1"
                      placeholder="Required knowledge or skills"
                    />
                    {formData.prerequisites.length > 1 && (
                      <button
                        onClick={() => removeArrayItem('prerequisites', index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('prerequisites')}
                  className="btn-outline flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Prerequisite
                </button>
              </div>
            </div>

            {/* References */}
            <div>
              <label className="form-label">References</label>
              <div className="space-y-2">
                {formData.references.map((reference, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={reference}
                      onChange={(e) => handleArrayChange('references', index, e.target.value)}
                      className="form-input flex-1"
                      placeholder="https://example.com/resource"
                    />
                    {formData.references.length > 1 && (
                      <button
                        onClick={() => removeArrayItem('references', index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('references')}
                  className="btn-outline flex items-center text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Reference
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target_audience" className="form-label">Target Audience</label>
                <select
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select audience</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="author_notes" className="form-label">Author Notes</label>
              <textarea
                id="author_notes"
                name="author_notes"
                value={formData.author_notes}
                onChange={handleChange}
                rows={4}
                className="form-input"
                placeholder="Internal notes, hints for reviewers, etc."
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handleDelete}
              className="btn-outline text-error-light border-error-light hover:bg-error-light hover:text-white flex items-center"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Delete Challenge
            </button>
            
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditChallengePage;