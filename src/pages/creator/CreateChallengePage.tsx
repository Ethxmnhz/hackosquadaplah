import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Minus, Flag, AlertTriangle, Image, Upload, 
  Terminal, Shield, Lock, Target, Globe, Code,
  FileText, Tag, Clock, Trophy, Users, Star,
  Eye, EyeOff, Save, Send, ArrowRight, ArrowLeft,
  CheckCircle, Info, Lightbulb, Zap, Book
} from 'lucide-react';
import { ChallengeType, ChallengeDifficulty } from '../../lib/types';
import { createChallenge } from '../../lib/api';
import { ChallengeFormData } from '../../lib/validation';
import Card from '../../components/ui/Card';

interface QuestionForm {
  question: string;
  description: string;
  flag: string;
  points: number;
  hints: string[];
  solution_explanation: string;
  difficulty_rating: number;
}

interface ChallengeMetadata {
  estimated_time: number;
  prerequisites: string[];
  learning_objectives: string[];
  tools_required: string[];
  references: string[];
  tags: string[];
  author_notes: string;
  target_audience: string;
}

const CHALLENGE_CATEGORIES = [
  { id: 'web', label: 'Web Application Security', icon: Globe, color: 'text-accent-blue', description: 'SQL injection, XSS, authentication bypasses' },
  { id: 'network', label: 'Network Security', icon: Shield, color: 'text-accent-green', description: 'Network protocols, packet analysis, intrusion detection' },
  { id: 'crypto', label: 'Cryptography', icon: Lock, color: 'text-warning-light', description: 'Encryption, hashing, digital signatures' },
  { id: 'misc', label: 'Miscellaneous', icon: Target, color: 'text-primary', description: 'OSINT, steganography, forensics' }
];

const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'Beginner', color: 'text-success-light', description: 'Perfect for newcomers to cybersecurity' },
  { id: 'medium', label: 'Intermediate', color: 'text-warning-light', description: 'Requires some cybersecurity knowledge' },
  { id: 'hard', label: 'Advanced', color: 'text-error-light', description: 'For experienced security professionals' },
  { id: 'expert', label: 'Expert', color: 'text-purple-400', description: 'Extremely challenging, cutting-edge techniques' }
];

const CreateChallengePage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: '' as ChallengeType,
    difficulty: '' as ChallengeDifficulty,
    icon_url: '',
    short_description: '',
    scenario: '',
  });

  const [metadata, setMetadata] = useState<ChallengeMetadata>({
    estimated_time: 30,
    prerequisites: [''],
    learning_objectives: [''],
    tools_required: [''],
    references: [''],
    tags: [],
    author_notes: '',
    target_audience: 'intermediate'
  });

  const [questions, setQuestions] = useState<QuestionForm[]>([
    { 
      question: '', 
      description: '', 
      flag: '', 
      points: 1,
      hints: [''],
      solution_explanation: '',
      difficulty_rating: 3
    }
  ]);

  const totalSteps = 4;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    // Validate all steps
    if (!formData.title || !formData.description || !formData.challenge_type || !formData.difficulty) {
      setError('Please fill in all required basic information');
      setLoading(false);
      return;
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question || !q.flag) {
        setError('All questions must have a question text and flag');
        setLoading(false);
        return;
      }
      if (!q.flag.startsWith('HKQ{') || !q.flag.endsWith('}')) {
        setError('All flags must be in the format HKQ{...}');
        setLoading(false);
        return;
      }
      if (q.points < 1 || q.points > 5) {
        setError('Points must be between 1 and 5');
        setLoading(false);
        return;
      }
    }

    try {
      const challengeData: ChallengeFormData = {
        ...formData,
        learning_objectives: metadata.learning_objectives.filter(o => o.trim()),
        tools_required: metadata.tools_required.filter(t => t.trim()),
        references: metadata.references.filter(r => r.trim()),
        prerequisites: metadata.prerequisites.filter(p => p.trim()),
        target_audience: metadata.target_audience,
        estimated_time: metadata.estimated_time,
        author_notes: metadata.author_notes,
        questions: questions.map(q => ({
          question: q.question,
          description: q.description,
          flag: q.flag,
          points: q.points,
          hints: q.hints.filter(h => h.trim()),
          solution_explanation: q.solution_explanation,
          difficulty_rating: q.difficulty_rating
        }))
      };

      const result = await createChallenge(challengeData);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      navigate('/creator/manage');
    } catch (err) {
      console.error('Error creating challenge:', err);
      setError('Failed to create challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMetadataChange = (field: keyof ChallengeMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: keyof ChallengeMetadata, index: number, value: string) => {
    setMetadata(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: keyof ChallengeMetadata) => {
    setMetadata(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), '']
    }));
  };

  const removeArrayItem = (field: keyof ChallengeMetadata, index: number) => {
    setMetadata(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index: number, field: keyof QuestionForm, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const handleQuestionHintChange = (questionIndex: number, hintIndex: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        const newHints = [...q.hints];
        newHints[hintIndex] = value;
        return { ...q, hints: newHints };
      }
      return q;
    }));
  };

  const addQuestionHint = (questionIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        return { ...q, hints: [...q.hints, ''] };
      }
      return q;
    }));
  };

  const removeQuestionHint = (questionIndex: number, hintIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex && q.hints.length > 1) {
        return { ...q, hints: q.hints.filter((_, j) => j !== hintIndex) };
      }
      return q;
    }));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { 
      question: '', 
      description: '', 
      flag: '', 
      points: 1,
      hints: [''],
      solution_explanation: '',
      difficulty_rating: 3
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Challenge Basics</h2>
              <p className="text-gray-400">Let's start with the fundamental information about your challenge</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="form-label flex items-center">
                    <Flag className="h-4 w-4 mr-2 text-primary" />
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., SQL Injection in Login Portal"
                  />
                </div>

                <div>
                  <label htmlFor="short_description" className="form-label flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-accent-blue" />
                    Short Description *
                  </label>
                  <input
                    type="text"
                    id="short_description"
                    name="short_description"
                    required
                    value={formData.short_description}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Brief one-line description for the challenge card"
                  />
                </div>

                <div>
                  <label htmlFor="icon_url" className="form-label flex items-center">
                    <Image className="h-4 w-4 mr-2 text-accent-green" />
                    Challenge Icon URL
                  </label>
                  <input
                    type="url"
                    id="icon_url"
                    name="icon_url"
                    value={formData.icon_url}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="https://example.com/challenge-icon.png"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recommended: 512x512px PNG with transparent background. Leave empty to use default category icon.
                  </p>
                  {formData.icon_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.icon_url} 
                        alt="Challenge icon preview"
                        className="w-16 h-16 rounded-lg border border-background-light object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-sm text-error-light mt-1">
                        Failed to load image. Please check the URL.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="form-label flex items-center mb-4">
                    <Target className="h-4 w-4 mr-2 text-primary" />
                    Challenge Category *
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {CHALLENGE_CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, challenge_type: category.id as ChallengeType }))}
                        className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                          formData.challenge_type === category.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-background-light hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center">
                          <category.icon className={`h-6 w-6 mr-3 ${category.color}`} />
                          <div>
                            <div className="font-medium text-white">{category.label}</div>
                            <div className="text-sm text-gray-400">{category.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label flex items-center mb-4">
                <Star className="h-4 w-4 mr-2 text-warning-light" />
                Difficulty Level *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {DIFFICULTY_LEVELS.map(level => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, difficulty: level.id as ChallengeDifficulty }))}
                    className={`p-4 rounded-lg border text-center transition-all duration-200 ${
                      formData.difficulty === level.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-background-light hover:border-gray-600'
                    }`}
                  >
                    <div className={`text-lg font-bold ${level.color} mb-1`}>{level.label}</div>
                    <div className="text-sm text-gray-400">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Challenge Description</h2>
              <p className="text-gray-400">Provide detailed information about your challenge</p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="description" className="form-label flex items-center">
                  <Book className="h-4 w-4 mr-2 text-accent-blue" />
                  Detailed Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="form-input"
                  placeholder="Provide a comprehensive description of the challenge, including background context, what participants will learn, and any important details..."
                />
              </div>

              <div>
                <label htmlFor="scenario" className="form-label flex items-center">
                  <Terminal className="h-4 w-4 mr-2 text-primary" />
                  Attack Scenario
                </label>
                <textarea
                  id="scenario"
                  name="scenario"
                  value={formData.scenario}
                  onChange={handleChange}
                  rows={4}
                  className="form-input"
                  placeholder="Describe the realistic scenario or story behind this challenge. What is the attacker's goal? What is the context?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-accent-green" />
                    Estimated Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={metadata.estimated_time}
                    onChange={(e) => handleMetadataChange('estimated_time', parseInt(e.target.value) || 30)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label flex items-center">
                    <Users className="h-4 w-4 mr-2 text-accent-blue" />
                    Target Audience
                  </label>
                  <select
                    value={metadata.target_audience}
                    onChange={(e) => handleMetadataChange('target_audience', e.target.value)}
                    className="form-input"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2 text-warning-light" />
                  Learning Objectives
                </label>
                {metadata.learning_objectives.map((objective, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => handleArrayChange('learning_objectives', index, e.target.value)}
                      className="form-input flex-1"
                      placeholder="What will participants learn from this challenge?"
                    />
                    {metadata.learning_objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('learning_objectives', index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('learning_objectives')}
                  className="btn-outline flex items-center mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Learning Objective
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Challenge Questions</h2>
              <p className="text-gray-400">Create the questions and flags for your challenge</p>
            </div>

            <div className="space-y-8">
              {questions.map((q, index) => (
                <Card key={index} className="p-6 bg-background-light border border-primary/30">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xl font-bold text-white flex items-center">
                      <Flag className="h-5 w-5 mr-2 text-primary" />
                      Question {index + 1}
                    </h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Question Text *</label>
                        <input
                          type="text"
                          required
                          value={q.question}
                          onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                          className="form-input"
                          placeholder="What is the flag hidden in the admin panel?"
                        />
                      </div>

                      <div>
                        <label className="form-label">Question Description</label>
                        <textarea
                          value={q.description}
                          onChange={(e) => handleQuestionChange(index, 'description', e.target.value)}
                          rows={3}
                          className="form-input"
                          placeholder="Additional context, hints, or instructions for this question"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                          <p className="text-xs text-gray-500 mt-1">1=Easy, 5=Expert</p>
                        </div>

                        <div>
                          <label className="form-label">Difficulty (1-5)</label>
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
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="form-label flex items-center">
                          <Flag className="h-4 w-4 mr-2 text-primary" />
                          Flag *
                        </label>
                        <input
                          type="text"
                          required
                          value={q.flag}
                          onChange={(e) => handleQuestionChange(index, 'flag', e.target.value)}
                          className="form-input font-mono"
                          placeholder="HKQ{your_flag_here}"
                        />
                      </div>

                      <div>
                        <label className="form-label">Hints</label>
                        {q.hints.map((hint, hintIndex) => (
                          <div key={hintIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={hint}
                              onChange={(e) => handleQuestionHintChange(index, hintIndex, e.target.value)}
                              className="form-input flex-1"
                              placeholder="Helpful hint for participants"
                            />
                            {q.hints.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeQuestionHint(index, hintIndex)}
                                className="text-error-light hover:text-error-light/80"
                              >
                                <Minus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addQuestionHint(index)}
                          className="btn-outline flex items-center mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Hint
                        </button>
                      </div>

                      <div>
                        <label className="form-label">Solution Explanation</label>
                        <textarea
                          value={q.solution_explanation}
                          onChange={(e) => handleQuestionChange(index, 'solution_explanation', e.target.value)}
                          rows={3}
                          className="form-input"
                          placeholder="Explain how to solve this question (for review purposes)"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="text-center">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn-primary flex items-center mx-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Another Question
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Additional Information</h2>
              <p className="text-gray-400">Provide extra details to help participants and reviewers</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="form-label flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-accent-blue" />
                    Prerequisites
                  </label>
                  {metadata.prerequisites.map((prereq, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={prereq}
                        onChange={(e) => handleArrayChange('prerequisites', index, e.target.value)}
                        className="form-input flex-1"
                        placeholder="e.g., Basic knowledge of SQL"
                      />
                      {metadata.prerequisites.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('prerequisites', index)}
                          className="text-error-light hover:text-error-light/80"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('prerequisites')}
                    className="btn-outline flex items-center mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Prerequisite
                  </button>
                </div>

                <div>
                  <label className="form-label flex items-center">
                    <Terminal className="h-4 w-4 mr-2 text-accent-green" />
                    Required Tools
                  </label>
                  {metadata.tools_required.map((tool, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tool}
                        onChange={(e) => handleArrayChange('tools_required', index, e.target.value)}
                        className="form-input flex-1"
                        placeholder="e.g., Burp Suite, Browser Developer Tools"
                      />
                      {metadata.tools_required.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tools_required', index)}
                          className="text-error-light hover:text-error-light/80"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('tools_required')}
                    className="btn-outline flex items-center mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tool
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="form-label flex items-center">
                    <Book className="h-4 w-4 mr-2 text-warning-light" />
                    References & Resources
                  </label>
                  {metadata.references.map((ref, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={ref}
                        onChange={(e) => handleArrayChange('references', index, e.target.value)}
                        className="form-input flex-1"
                        placeholder="https://example.com/helpful-resource"
                      />
                      {metadata.references.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArrayItem('references', index)}
                          className="text-error-light hover:text-error-light/80"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem('references')}
                    className="btn-outline flex items-center mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reference
                  </button>
                </div>

                <div>
                  <label className="form-label flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    Author Notes
                  </label>
                  <textarea
                    value={metadata.author_notes}
                    onChange={(e) => handleMetadataChange('author_notes', e.target.value)}
                    rows={4}
                    className="form-input"
                    placeholder="Any additional notes for reviewers or special instructions..."
                  />
                </div>
              </div>
            </div>

            {/* Challenge Summary */}
            <Card className="p-6 border border-primary/30 bg-primary/5">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <CheckCircle className="h-6 w-6 mr-2 text-primary" />
                Challenge Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-primary">{questions.length}</div>
                  <div className="text-sm text-gray-400">Questions</div>
                </div>
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-accent-blue">
                    {questions.reduce((sum, q) => sum + q.points, 0)}
                  </div>
                  <div className="text-sm text-gray-400">Total Points</div>
                </div>
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-accent-green">{metadata.estimated_time}</div>
                  <div className="text-sm text-gray-400">Minutes</div>
                </div>
                <div className="text-center p-4 bg-background-light rounded-lg">
                  <div className="text-2xl font-bold text-warning-light">
                    {formData.difficulty?.charAt(0).toUpperCase() + formData.difficulty?.slice(1)}
                  </div>
                  <div className="text-sm text-gray-400">Difficulty</div>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <div className="bg-background-default border-b border-background-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Create Challenge</h1>
              <p className="text-gray-400">Design and submit your own cybersecurity challenge</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="btn-outline flex items-center"
              >
                {previewMode ? <EyeOff className="h-5 w-5 mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
                {previewMode ? 'Edit Mode' : 'Preview'}
              </button>
              <button
                onClick={() => navigate('/creator/manage')}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-background-light border-b border-background-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              {[
                { step: 1, label: 'Basics', icon: Info },
                { step: 2, label: 'Description', icon: FileText },
                { step: 3, label: 'Questions', icon: Flag },
                { step: 4, label: 'Details', icon: CheckCircle }
              ].map(({ step, label, icon: Icon }) => (
                <button
                  key={step}
                  onClick={() => setCurrentStep(step)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentStep === step
                      ? 'bg-primary/20 text-primary'
                      : currentStep > step
                      ? 'text-success-light'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                  {currentStep > step && <CheckCircle className="h-4 w-4 text-success-light" />}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-400">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
          <div className="w-full bg-background-default rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 p-4 bg-error-dark/20 border border-error-light/30 rounded-lg text-error-light">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}

        <Card className="p-8">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-background-light">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn-outline flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </button>

            <div className="flex gap-4">
              <button
                type="button"
                className="btn-outline flex items-center"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Draft
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="btn-primary flex items-center"
                >
                  Next
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex items-center"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {loading ? 'Creating...' : 'Submit Challenge'}
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreateChallengePage;