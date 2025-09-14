import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Tag, Terminal, Download, AlertTriangle, Link as LinkIcon, Clock, Book, Target, PenTool as Tool, FileText, Upload, List, Image } from 'lucide-react';
import { createLab } from '../../lib/api';
import { Lab, LabQuestion, LabCategory, LabType } from '../../lib/types';
import Card from '../../components/ui/Card';

interface QuestionForm {
  question: string;
  description: string;
  answer: string;
  points: number;
  question_type: 'flag' | 'multiple_choice' | 'code';
  hints: string[];
  options: string[];
  code_template: string;
}

// Updated categories to match database constraints
const CATEGORIES: LabCategory[] = ['web', 'network', 'crypto', 'misc', 'forensics', 'reverse'];
const LAB_TYPES: LabType[] = ['docker', 'vm', 'external'];

const CreateLabPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    category: '' as LabCategory,
    difficulty: '',
    estimated_time: 60,
    short_intro: '',
    learning_objectives: [''],
    attack_scenario: '',
    lab_type: 'docker' as LabType,
    docker_command: '',
    vm_download_url: '',
    external_link: '',
    setup_instructions: '',
    thumbnail_url: '',
    suggested_tools: [''],
    pre_reading_links: [''],
    points: 0,
  });

  const [questions, setQuestions] = useState<QuestionForm[]>([
    { 
      question: '', 
      description: '', 
      answer: '', 
      points: 10,
      question_type: 'flag',
      hints: [],
      options: [],
      code_template: ''
    }
  ]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to create this lab?')) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await createLab(formData, questions, selectedTags);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      navigate('/admin/labs');
    } catch (err) {
      console.error('Error creating lab:', err);
      setError('Failed to create lab. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (field: keyof typeof formData, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].map((item: string, i: number) => 
        i === index ? value : item
      )
    }));
  };

  const addArrayItem = (field: keyof typeof formData) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), '']
    }));
  };

  const removeArrayItem = (field: keyof typeof formData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Basic Information</h3>
            
            <div>
              <label htmlFor="title" className="form-label">Lab Title</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., Pentesting 1 – Basic Web Vulns"
              />
            </div>

            <div>
              <label htmlFor="thumbnail_url" className="form-label flex items-center">
                <Image className="h-4 w-4 mr-2 text-accent-green" />
                Lab Icon/Thumbnail URL
              </label>
              <input
                type="url"
                id="thumbnail_url"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleChange}
                className="form-input"
                placeholder="https://example.com/lab-icon.png"
              />
              <p className="text-sm text-gray-500 mt-1">
                Recommended: 512x512px PNG with transparent background or lab screenshot
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="form-label">Category</label>
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
                <label htmlFor="difficulty" className="form-label">Difficulty</label>
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
            </div>

            <div>
              <label htmlFor="estimated_time" className="form-label">Estimated Time (minutes)</label>
              <input
                type="number"
                id="estimated_time"
                name="estimated_time"
                required
                min="15"
                step="15"
                value={formData.estimated_time}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Lab Description</h3>
            
            <div>
              <label htmlFor="short_intro" className="form-label">Short Introduction</label>
              <textarea
                id="short_intro"
                name="short_intro"
                required
                value={formData.short_intro}
                onChange={handleChange}
                rows={3}
                className="form-input"
                placeholder="Briefly describe what this lab covers (skills, tools, concepts)"
              />
            </div>

            <div>
              <label className="form-label">Learning Objectives</label>
              {formData.learning_objectives.map((objective, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => handleArrayChange('learning_objectives', index, e.target.value)}
                    className="form-input flex-1"
                    placeholder="What will the learner gain?"
                  />
                  {formData.learning_objectives.length > 1 && (
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
                Add Objective
              </button>
            </div>

            <div>
              <label htmlFor="attack_scenario" className="form-label">Attack Scenario / Context</label>
              <textarea
                id="attack_scenario"
                name="attack_scenario"
                required
                value={formData.attack_scenario}
                onChange={handleChange}
                rows={4}
                className="form-input"
                placeholder="Provide a realistic story or context for the lab"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Deployment Instructions</h3>
            
            <div>
              <label className="form-label">Lab Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {LAB_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, lab_type: type }))}
                    className={`p-4 rounded-lg border ${
                      formData.lab_type === type 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-background-light hover:border-gray-600'
                    }`}
                  >
                    {type === 'docker' && <Terminal className="h-6 w-6 mb-2 mx-auto" />}
                    {type === 'vm' && <Download className="h-6 w-6 mb-2 mx-auto" />}
                    {type === 'external' && <LinkIcon className="h-6 w-6 mb-2 mx-auto" />}
                    <span className="block text-sm font-medium">
                      {type === 'docker' ? 'Docker Container' :
                       type === 'vm' ? 'VM Download' : 'External Link'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {formData.lab_type === 'docker' && (
              <div>
                <label htmlFor="docker_command" className="form-label">Docker Pull Command</label>
                <div className="relative">
                  <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    id="docker_command"
                    name="docker_command"
                    value={formData.docker_command}
                    onChange={handleChange}
                    className="form-input pl-10"
                    placeholder="docker pull hackosquad/pentest1"
                  />
                </div>
              </div>
            )}

            {formData.lab_type === 'vm' && (
              <div>
                <label htmlFor="vm_download_url" className="form-label">VM Download URL</label>
                <div className="relative">
                  <Download className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="url"
                    id="vm_download_url"
                    name="vm_download_url"
                    value={formData.vm_download_url}
                    onChange={handleChange}
                    className="form-input pl-10"
                    placeholder="https://example.com/lab-vm.ova"
                  />
                </div>
              </div>
            )}

            {formData.lab_type === 'external' && (
              <div>
                <label htmlFor="external_link" className="form-label">External Lab Link</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="url"
                    id="external_link"
                    name="external_link"
                    value={formData.external_link}
                    onChange={handleChange}
                    className="form-input pl-10"
                    placeholder="https://example.com/lab"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="setup_instructions" className="form-label">Setup Instructions</label>
              <textarea
                id="setup_instructions"
                name="setup_instructions"
                value={formData.setup_instructions}
                onChange={handleChange}
                rows={4}
                className="form-input"
                placeholder="Additional setup steps, ports to configure, credentials, etc."
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Questions & Flags</h3>
            
            <div className="space-y-6">
              {questions.map((q, index) => (
                <Card key={index} className="p-4 bg-background-light">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-medium">Question {index + 1}</h4>
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

                  <div className="space-y-4">
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

                    <div>
                      <label className="form-label">Question</label>
                      <input
                        type="text"
                        required
                        value={q.question}
                        onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                        className="form-input"
                        placeholder="Enter your question"
                      />
                    </div>

                    <div>
                      <label className="form-label">Description (Optional)</label>
                      <textarea
                        value={q.description}
                        onChange={(e) => handleQuestionChange(index, 'description', e.target.value)}
                        rows={2}
                        className="form-input"
                        placeholder="Additional context or hints"
                      />
                    </div>

                    {q.question_type === 'multiple_choice' && (
                      <div>
                        <label className="form-label">Options</label>
                        {q.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...q.options];
                                newOptions[optIndex] = e.target.value;
                                handleQuestionChange(index, 'options', newOptions);
                              }}
                              className="form-input flex-1"
                              placeholder={`Option ${optIndex + 1}`}
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = q.options.filter((_, i) => i !== optIndex);
                                  handleQuestionChange(index, 'options', newOptions);
                                }}
                                className="text-error-light hover:text-error-light/80"
                              >
                                <Minus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = [...q.options, ''];
                              handleQuestionChange(index, 'options', newOptions);
                            }}
                            className="btn-outline flex items-center mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </button>
                        )}
                      </div>
                    )}

                    {q.question_type === 'code' && (
                      <div>
                        <label className="form-label">Code Template</label>
                        <textarea
                          value={q.code_template}
                          onChange={(e) => handleQuestionChange(index, 'code_template', e.target.value)}
                          rows={4}
                          className="form-input font-mono"
                          placeholder="// Provide the initial code template here"
                        />
                      </div>
                    )}

                    <div>
                      <label className="form-label">
                        {q.question_type === 'flag' ? 'Flag' :
                         q.question_type === 'multiple_choice' ? 'Correct Option' :
                         'Expected Output'}
                      </label>
                      <input
                        type="text"
                        required
                        value={q.answer}
                        onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                        className="form-input"
                        placeholder={
                          q.question_type === 'flag' ? 'HKQ{flag_here}' :
                          q.question_type === 'multiple_choice' ? 'Enter the correct option' :
                          'Expected code output'
                        }
                      />
                    </div>

                    <div>
                      <label className="form-label">Hints</label>
                      {q.hints.map((hint, hintIndex) => (
                        <div key={hintIndex} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={hint}
                            onChange={(e) => {
                              const newHints = [...q.hints];
                              newHints[hintIndex] = e.target.value;
                              handleQuestionChange(index, 'hints', newHints);
                            }}
                            className="form-input flex-1"
                            placeholder="Enter a hint"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newHints = q.hints.filter((_, i) => i !== hintIndex);
                              handleQuestionChange(index, 'hints', newHints);
                            }}
                            className="text-error-light hover:text-error-light/80"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newHints = [...q.hints, ''];
                          handleQuestionChange(index, 'hints', newHints);
                        }}
                        className="btn-outline flex items-center mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Hint
                      </button>
                    </div>

                    <div>
                      <label className="form-label">Points</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={q.points}
                        onChange={(e) => handleQuestionChange(index, 'points', parseInt(e.target.value) || 10)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="btn-outline flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Media & Extras</h3>
            
            <div>
              <label className="form-label">Suggested Tools</label>
              {formData.suggested_tools.map((tool, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tool}
                    onChange={(e) => handleArrayChange('suggested_tools', index, e.target.value)}
                    className="form-input flex-1"
                    placeholder="e.g., Nmap, BurpSuite"
                  />
                  {formData.suggested_tools.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('suggested_tools', index)}
                      className="text-error-light hover:text-error-light/80"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('suggested_tools')}
                className="btn-outline flex items-center mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tool
              </button>
            </div>

            <div>
              <label className="form-label">Pre-Reading Links</label>
              {formData.pre_reading_links.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleArrayChange('pre_reading_links', index, e.target.value)}
                    className="form-input flex-1"
                    placeholder="https://example.com/docs"
                  />
                  {formData.pre_reading_links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayItem('pre_reading_links', index)}
                      className="text-error-light hover:text-error-light/80"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('pre_reading_links')}
                className="btn-outline flex items-center mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Create Lab</h1>
        <p className="text-gray-400">Design a new hands-on cybersecurity lab</p>
      </motion.div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-error-dark/20 border border-error-light/30 rounded-lg text-error-light">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[
              { step: 1, icon: List, label: 'Basic Info' },
              { step: 2, icon: FileText, label: 'Description' },
              { step: 3, icon: Terminal, label: 'Deployment' },
              { step: 4, icon: Target, label: 'Questions' },
              { step: 5, icon: Tool, label: 'Extras' }
            ].map(({ step, icon: Icon, label }) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`flex flex-col items-center ${
                  currentStep === step 
                    ? 'text-primary' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  currentStep === step 
                    ? 'bg-primary/20' 
                    : 'bg-background-light'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

          {renderStep()}

          <div className="flex justify-between pt-6 border-t border-background-light">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="btn-outline"
              >
                Previous
              </button>
            )}
            <div className="ml-auto flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/labs')}
                className="btn-outline"
              >
                Cancel
              </button>
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {loading ? 'Creating...' : 'Create Lab'}
                </button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateLabPage;