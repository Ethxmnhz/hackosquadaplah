import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Users, CheckCircle, Terminal, Flag, Target, Shield, Lock, Sword, AlertTriangle, Globe, Code, Layers, Star, Award, Eye, EyeOff, BookOpen, Lightbulb, PenTool as Tool, ExternalLink, Copy, Check, Timer, Zap, Activity, TrendingUp, Calendar, User, Play, Pause, RotateCcw, Send, MessageSquare, ChevronDown, ChevronUp, Info, HelpCircle, Flame } from 'lucide-react';
import { getChallenge, submitChallenge, submitChallengeAnswer } from '../../lib/api';
import { Challenge, ChallengeQuestion } from '../../lib/types';
import Card from '../../components/ui/Card';

const ChallengePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittingQuestionId, setSubmittingQuestionId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correctAnswers: number;
    total: number;
    score: number;
  } | null>(null);
  const [questionResults, setQuestionResults] = useState<Record<string, {
    isCorrect: boolean;
    pointsEarned: number;
  }>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'hints' | 'resources'>('overview');
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    objectives: true,
    scenario: false,
    tools: false
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadChallengeData(id);
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadChallengeData = async (challengeId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getChallenge(challengeId);
      if (result.success) {
        setChallenge(result.data);
        if (!result.data.completed) {
          setIsTimerRunning(true);
        }
      } else {
        setErrorMessage(result.error || 'Failed to load challenge');
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
      setErrorMessage('An unexpected error occurred while loading the challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge || !id) return;
    
    setSubmitting(true);
    setIsTimerRunning(false);
    setErrorMessage(null);
    
    try {
      const result = await submitChallenge(id, answers);
      if (result.success && result.data) {
        setResult(result.data);
        await loadChallengeData(id);
      } else {
        setErrorMessage(result.error || 'Failed to submit challenge');
      }
    } catch (error) {
      console.error('Error submitting challenge:', error);
      setErrorMessage('An unexpected error occurred while submitting the challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSingleAnswer = async (questionId: string) => {
    if (!challenge || !id || !answers[questionId]) return;
    
    setSubmittingQuestionId(questionId);
    setErrorMessage(null);
    
    try {
      const result = await submitChallengeAnswer(id, questionId, answers[questionId]);
      if (result.success && result.data) {
        setQuestionResults(prev => ({
          ...prev,
          [questionId]: result.data
        }));
        
        // Reload challenge data to check if it's now completed
        await loadChallengeData(id);
      } else {
        setErrorMessage(result.error || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setErrorMessage('An unexpected error occurred while submitting your answer');
    } finally {
      setSubmittingQuestionId(null);
    }
  };

  const toggleHint = (questionId: string) => {
    setShowHints(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'web':
        return <Globe className="h-6 w-6" />;
      case 'network':
        return <Shield className="h-6 w-6" />;
      case 'crypto':
        return <Lock className="h-6 w-6" />;
      case 'misc':
        return <Target className="h-6 w-6" />;
      default:
        return <Code className="h-6 w-6" />;
    }
  };

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return { color: 'text-success-light', bg: 'bg-success-dark/20', border: 'border-success-light/30' };
      case 'medium':
        return { color: 'text-warning-light', bg: 'bg-warning-dark/20', border: 'border-warning-light/30' };
      case 'hard':
        return { color: 'text-error-light', bg: 'bg-error-dark/20', border: 'border-error-light/30' };
      case 'expert':
        return { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-400/30' };
      default:
        return { color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/30' };
    }
  };

  const getTotalPointsEarned = () => {
    return Object.values(questionResults).reduce((sum, result) => sum + result.pointsEarned, 0);
  };

  const getCorrectAnswersCount = () => {
    return Object.values(questionResults).filter(result => result.isCorrect).length;
  };

  const isAllQuestionsAnswered = () => {
    if (!challenge?.questions) return false;
    return challenge.questions.every(q => questionResults[q.id]?.isCorrect);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-primary text-2xl mb-4">Loading challenge...</div>
          <div className="w-64 h-2 bg-background-light rounded-full overflow-hidden">
            <div className="w-full h-full bg-primary animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-error-light mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Challenge Not Found</h2>
          <p className="text-gray-400 mb-6">The challenge you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/challenges')}
            className="btn-primary"
          >
            Back to Challenges
          </button>
        </Card>
      </div>
    );
  }

  const difficultyConfig = getDifficultyConfig(challenge.difficulty);

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-error-dark/90 border border-error-light text-white px-4 py-3 rounded-lg shadow-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-error-light mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-4 text-gray-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div 
        className="relative h-[500px] bg-cover bg-center"
        style={{
          backgroundImage: challenge.icon_url ? `url(${challenge.icon_url})` : 'none',
          backgroundColor: !challenge.icon_url ? '#1a1a1a' : undefined
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/50 via-background-dark/70 to-background-dark"></div>
        
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <button
                onClick={() => navigate('/challenges')}
                className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Challenges
              </button>

              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                <div className="flex-1">
                  {/* Challenge Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-background-light/80 backdrop-blur-sm">
                      {getCategoryIcon(challenge.challenge_type)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${difficultyConfig.bg} ${difficultyConfig.color} ${difficultyConfig.border} backdrop-blur-sm`}>
                          {challenge.difficulty.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary backdrop-blur-sm">
                          {challenge.challenge_type.toUpperCase()}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-accent-blue/20 text-accent-blue backdrop-blur-sm">
                          {challenge.points} POINTS
                        </span>
                      </div>
                      <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">{challenge.title}</h1>
                      {challenge.short_description && (
                        <p className="text-xl text-gray-300">{challenge.short_description}</p>
                      )}
                    </div>
                  </div>

                  {/* Challenge Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-background-light/80 backdrop-blur-sm rounded-lg p-4 text-center">
                      <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">{challenge.points}</div>
                      <div className="text-sm text-gray-400">Points</div>
                    </div>
                    <div className="bg-background-light/80 backdrop-blur-sm rounded-lg p-4 text-center">
                      <Users className="h-6 w-6 text-accent-blue mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">{challenge.solves || 0}</div>
                      <div className="text-sm text-gray-400">Solves</div>
                    </div>
                    <div className="bg-background-light/80 backdrop-blur-sm rounded-lg p-4 text-center">
                      <Clock className="h-6 w-6 text-accent-green mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">{formatTime(timeSpent)}</div>
                      <div className="text-sm text-gray-400">Time Spent</div>
                    </div>
                    <div className="bg-background-light/80 backdrop-blur-sm rounded-lg p-4 text-center">
                      <TrendingUp className="h-6 w-6 text-warning-light mx-auto mb-2" />
                      <div className="text-lg font-bold text-white">73%</div>
                      <div className="text-sm text-gray-400">Success Rate</div>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div className="lg:w-80">
                  <Card className="p-6 border border-primary/30 bg-background-default/90 backdrop-blur-sm">
                    {challenge.completed ? (
                      <div className="text-center">
                        <CheckCircle className="h-16 w-16 text-success-light mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Challenge Completed!</h3>
                        <p className="text-gray-400 mb-4">You've successfully solved this challenge</p>
                        <div className="bg-success-dark/20 rounded-lg p-4">
                          <div className="text-2xl font-bold text-success-light">{challenge.points}</div>
                          <div className="text-sm text-gray-400">Points Earned</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="relative mb-6">
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Flag className="h-10 w-10 text-primary" />
                          </div>
                          {isTimerRunning && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-success-light rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ready to Hack?</h3>
                        <p className="text-gray-300 mb-4">Start solving this challenge to earn points</p>
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className="btn-outline flex items-center"
                          >
                            {isTimerRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                            {isTimerRunning ? 'Pause' : 'Start'} Timer
                          </button>
                          <button
                            onClick={() => setTimeSpent(0)}
                            className="btn-outline"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-2xl font-mono font-bold text-primary">
                          {formatTime(timeSpent)}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-background-dark border-b border-background-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'questions', label: 'Questions', icon: Flag },
              { id: 'hints', label: 'Hints & Tips', icon: Lightbulb },
              { id: 'resources', label: 'Resources', icon: ExternalLink }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Challenge Description */}
                <Card className="p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Info className="h-6 w-6 mr-3 text-primary" />
                    Challenge Description
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 text-lg leading-relaxed">{challenge.description}</p>
                  </div>
                </Card>

                {/* Attack Scenario */}
                {challenge.scenario && (
                  <Card className="p-8 border border-primary/30">
                    <button
                      onClick={() => toggleSection('scenario')}
                      className="w-full flex items-center justify-between mb-6"
                    >
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <Sword className="h-6 w-6 mr-3 text-primary" />
                        Attack Scenario
                      </h2>
                      {expandedSections.scenario ? 
                        <ChevronUp className="h-6 w-6 text-gray-400" /> : 
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      }
                    </button>
                    <AnimatePresence>
                      {expandedSections.scenario && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{challenge.scenario}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}

                {/* Learning Objectives */}
                {challenge.learning_objectives && challenge.learning_objectives.length > 0 && (
                  <Card className="p-8">
                    <button
                      onClick={() => toggleSection('objectives')}
                      className="w-full flex items-center justify-between mb-6"
                    >
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <Target className="h-6 w-6 mr-3 text-accent-blue" />
                        Learning Objectives
                      </h2>
                      {expandedSections.objectives ? 
                        <ChevronUp className="h-6 w-6 text-gray-400" /> : 
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      }
                    </button>
                    <AnimatePresence>
                      {expandedSections.objectives && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-4">
                            {challenge.learning_objectives.map((objective, index) => (
                              <div key={index} className="flex items-start gap-4 p-4 bg-accent-blue/5 rounded-lg border border-accent-blue/20">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-blue/10 text-accent-blue font-bold text-sm">
                                  {index + 1}
                                </div>
                                <p className="text-gray-300 flex-1">{objective}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}

                {/* Required Tools */}
                {challenge.tools_required && challenge.tools_required.length > 0 && (
                  <Card className="p-8">
                    <button
                      onClick={() => toggleSection('tools')}
                      className="w-full flex items-center justify-between mb-6"
                    >
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <Tool className="h-6 w-6 mr-3 text-accent-green" />
                        Required Tools
                      </h2>
                      {expandedSections.tools ? 
                        <ChevronUp className="h-6 w-6 text-gray-400" /> : 
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      }
                    </button>
                    <AnimatePresence>
                      {expandedSections.tools && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {challenge.tools_required.map((tool, index) => (
                              <div key={index} className="flex items-center p-4 bg-accent-green/5 rounded-lg border border-accent-green/20">
                                <Terminal className="h-5 w-5 text-accent-green mr-3 flex-shrink-0" />
                                <span className="text-gray-300 font-medium">{tool}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )}

                {/* Prerequisites */}
                {challenge.prerequisites && challenge.prerequisites.length > 0 && (
                  <Card className="p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <BookOpen className="h-6 w-6 mr-3 text-warning-light" />
                      Prerequisites
                    </h2>
                    <div className="space-y-3">
                      {challenge.prerequisites.map((prereq, index) => (
                        <div key={index} className="flex items-center p-4 bg-warning-dark/10 rounded-lg border border-warning-light/20">
                          <Star className="h-5 w-5 text-warning-light mr-3 flex-shrink-0" />
                          <span className="text-gray-300">{prereq}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Author Notes */}
                {challenge.author_notes && (
                  <Card className="p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                      <MessageSquare className="h-6 w-6 mr-3 text-accent-blue" />
                      Author Notes
                    </h2>
                    <div className="bg-accent-blue/5 rounded-lg p-6 border border-accent-blue/20">
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{challenge.author_notes}</p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('questions')}
                      className="w-full btn-primary flex items-center justify-center"
                    >
                      <Flag className="h-5 w-5 mr-2" />
                      Start Solving
                    </button>
                    <button
                      onClick={() => setActiveTab('hints')}
                      className="w-full btn-outline flex items-center justify-center"
                    >
                      <Lightbulb className="h-5 w-5 mr-2" />
                      View Hints
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className="w-full btn-outline flex items-center justify-center"
                    >
                      <BookOpen className="h-5 w-5 mr-2" />
                      Resources
                    </button>
                  </div>
                </Card>

                {/* Challenge Info */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Challenge Info</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Category</span>
                      <span className="text-white font-medium">{challenge.challenge_type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Difficulty</span>
                      <span className={`font-medium ${difficultyConfig.color}`}>{challenge.difficulty}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Points</span>
                      <span className="text-white font-medium">{challenge.points}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Solves</span>
                      <span className="text-white font-medium">{challenge.solves || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Created</span>
                      <span className="text-white font-medium">
                        {new Date(challenge.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {challenge.estimated_time && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Estimated Time</span>
                        <span className="text-white font-medium">{challenge.estimated_time} min</span>
                      </div>
                    )}
                    {challenge.target_audience && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Target Audience</span>
                        <span className="text-white font-medium capitalize">{challenge.target_audience}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Progress */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Your Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Completion</span>
                        {challenge.completed ? (
                          <span className="text-success-light">100%</span>
                        ) : challenge.questions && challenge.questions.length > 0 ? (
                          <span className="text-white">
                            {Math.round((getCorrectAnswersCount() / challenge.questions.length) * 100)}%
                          </span>
                        ) : (
                          <span className="text-white">0%</span>
                        )}
                      </div>
                      <div className="w-full bg-background-light rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            challenge.completed ? 'bg-success-light' : 'bg-primary'
                          }`}
                          style={{ 
                            width: challenge.completed 
                              ? '100%' 
                              : challenge.questions && challenge.questions.length > 0
                                ? `${(getCorrectAnswersCount() / challenge.questions.length) * 100}%`
                                : '0%'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-background-light rounded-lg">
                        <Timer className="h-5 w-5 text-accent-blue mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{formatTime(timeSpent)}</div>
                        <div className="text-xs text-gray-400">Time</div>
                      </div>
                      <div className="text-center p-3 bg-background-light rounded-lg">
                        <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
                        <div className="text-sm font-bold text-white">{getTotalPointsEarned()}</div>
                        <div className="text-xs text-gray-400">Points</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Results Display */}
              {result && (
                <Card className="p-8 border border-success-light/30 bg-success-dark/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-full bg-success-dark/20">
                      <Trophy className="h-8 w-8 text-success-light" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Challenge Results</h2>
                      <p className="text-gray-300">
                        You got {result.correctAnswers} out of {result.total} questions correct!
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-success-dark/20 rounded-lg">
                      <div className="text-3xl font-bold text-success-light">{result.score}</div>
                      <div className="text-sm text-gray-400">Points Earned</div>
                    </div>
                    <div className="text-center p-4 bg-background-light rounded-lg">
                      <div className="text-3xl font-bold text-white">{result.correctAnswers}/{result.total}</div>
                      <div className="text-sm text-gray-400">Correct Answers</div>
                    </div>
                    <div className="text-center p-4 bg-background-light rounded-lg">
                      <div className="text-3xl font-bold text-white">{formatTime(timeSpent)}</div>
                      <div className="text-sm text-gray-400">Time Taken</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Questions */}
              <div className="space-y-8">
                {challenge.questions?.map((question, index) => (
                  <Card 
                    key={question.id} 
                    className={`p-8 border transition-all duration-300 ${
                      questionResults[question.id]?.isCorrect 
                        ? 'border-success-light/50 bg-success-dark/5' 
                        : 'border-background-light hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-6 mb-6">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                        questionResults[question.id]?.isCorrect
                          ? 'bg-success-dark/20 text-success-light'
                          : 'bg-primary/10 text-primary'
                      } font-bold text-lg flex-shrink-0`}>
                        {questionResults[question.id]?.isCorrect ? <CheckCircle className="h-6 w-6" /> : index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-3">
                          {question.question}
                        </h3>
                        {question.description && (
                          <div className="bg-background-light rounded-lg p-4 mb-4 border border-background-default">
                            <p className="text-gray-300">{question.description}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-primary mb-2">
                          <Trophy className="h-5 w-5 mr-2" />
                          <span className="font-bold">{question.points} pts</span>
                        </div>
                        <div className="text-sm text-gray-400">Question {index + 1}</div>
                      </div>
                    </div>

                    {/* Answer Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Your Answer
                      </label>
                      <div className="relative">
                        <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Enter flag: HKQ{...}"
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers(prev => ({
                            ...prev,
                            [question.id]: e.target.value
                          }))}
                          className={`w-full bg-background-light border rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono ${
                            questionResults[question.id]?.isCorrect 
                              ? 'border-success-light/50 bg-success-dark/10' 
                              : 'border-background-default'
                          }`}
                          disabled={challenge.completed || questionResults[question.id]?.isCorrect}
                        />
                      </div>
                    </div>

                    {/* Result Display */}
                    {questionResults[question.id] && (
                      <div className={`p-4 rounded-lg mb-6 ${
                        questionResults[question.id].isCorrect 
                          ? 'bg-success-dark/10 border border-success-light/30' 
                          : 'bg-error-dark/10 border border-error-light/30'
                      }`}>
                        <div className="flex items-center">
                          {questionResults[question.id].isCorrect ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-success-light mr-3" />
                              <div>
                                <p className="text-success-light font-medium">Correct Answer!</p>
                                <p className="text-gray-300 text-sm">
                                  You earned {questionResults[question.id].pointsEarned} points for this question.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 text-error-light mr-3" />
                              <div>
                                <p className="text-error-light font-medium">Incorrect Answer</p>
                                <p className="text-gray-300 text-sm">Try again with a different approach.</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hints Section */}
                    {question.hints && question.hints.length > 0 && (
                      <div className="mb-6">
                        <button
                          onClick={() => toggleHint(question.id)}
                          className="flex items-center text-warning-light hover:text-warning-light/80 transition-colors mb-3"
                        >
                          <Lightbulb className="h-5 w-5 mr-2" />
                          <span className="font-medium">
                            {showHints[question.id] ? 'Hide Hints' : `Show Hints (${question.hints.length})`}
                          </span>
                          {showHints[question.id] ? <EyeOff className="h-4 w-4 ml-2" /> : <Eye className="h-4 w-4 ml-2" />}
                        </button>
                        
                        <AnimatePresence>
                          {showHints[question.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-3">
                                {question.hints.map((hint, hintIndex) => (
                                  <div key={hintIndex} className="flex items-start gap-3 p-4 bg-warning-dark/10 rounded-lg border border-warning-light/20">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-warning-light/20 text-warning-light text-sm font-bold flex-shrink-0">
                                      {hintIndex + 1}
                                    </div>
                                    <p className="text-gray-300">{hint}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Solution Explanation (only shown if answered correctly) */}
                    {questionResults[question.id]?.isCorrect && question.solution_explanation && (
                      <div className="mb-6">
                        <div className="p-4 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
                          <div className="flex items-center mb-2">
                            <BookOpen className="h-5 w-5 text-accent-blue mr-2" />
                            <h4 className="text-accent-blue font-medium">Solution Explanation</h4>
                          </div>
                          <p className="text-gray-300">{question.solution_explanation}</p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button (per question) */}
                    {!challenge.completed && !questionResults[question.id]?.isCorrect && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSubmitSingleAnswer(question.id)}
                          disabled={!answers[question.id] || submittingQuestionId === question.id}
                          className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          {submittingQuestionId === question.id ? 'Submitting...' : 'Submit Answer'}
                        </button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Submit All Button */}
              {!challenge.completed && challenge.questions && challenge.questions.length > 0 && (
                <Card className="p-8 border border-primary/30 bg-primary/5">
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-4">Challenge Progress</h3>
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Questions Completed</span>
                        <span className="text-white">{getCorrectAnswersCount()} of {challenge.questions.length}</span>
                      </div>
                      <div className="w-full bg-background-light rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(getCorrectAnswersCount() / challenge.questions.length) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {isAllQuestionsAnswered() ? (
                      <div className="p-6 bg-success-dark/10 border border-success-light/30 rounded-lg mb-6">
                        <CheckCircle className="h-10 w-10 text-success-light mx-auto mb-3" />
                        <h4 className="text-xl font-bold text-success-light mb-2">All Questions Completed!</h4>
                        <p className="text-gray-300">
                          Congratulations! You've successfully completed all questions in this challenge.
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-400 mb-6">
                        Submit answers to each question individually to earn points. You can also submit all answers at once.
                      </p>
                    )}
                    
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || Object.keys(answers).length === 0 || isAllQuestionsAnswered()}
                      className="btn-primary text-lg px-8 py-4 flex items-center justify-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      {submitting ? 'Submitting Solution...' : 'Submit All Answers'}
                    </button>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'hints' && (
            <motion.div
              key="hints"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Lightbulb className="h-6 w-6 mr-3 text-warning-light" />
                  Hints & Tips
                </h2>
                
                {challenge.questions?.some(q => q.hints && q.hints.length > 0) ? (
                  <div className="space-y-8">
                    {challenge.questions.map((question, index) => (
                      question.hints && question.hints.length > 0 && (
                        <div key={question.id}>
                          <h3 className="text-lg font-bold text-white mb-4">
                            Question {index + 1}: {question.question}
                          </h3>
                          <div className="space-y-3">
                            {question.hints.map((hint, hintIndex) => (
                              <div key={hintIndex} className="flex items-start gap-4 p-4 bg-warning-dark/10 rounded-lg border border-warning-light/20">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning-light/20 text-warning-light font-bold flex-shrink-0">
                                  {hintIndex + 1}
                                </div>
                                <p className="text-gray-300">{hint}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <HelpCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Hints Available</h3>
                    <p className="text-gray-400">This challenge doesn't have any hints. Good luck!</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <BookOpen className="h-6 w-6 mr-3 text-accent-blue" />
                  Learning Resources
                </h2>
                
                {challenge.references && challenge.references.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {challenge.references.map((reference, index) => (
                      <a
                        key={index}
                        href={reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-4 bg-accent-blue/5 rounded-lg border border-accent-blue/20 hover:bg-accent-blue/10 transition-colors group"
                      >
                        <ExternalLink className="h-5 w-5 text-accent-blue mr-3 group-hover:scale-110 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">Resource {index + 1}</p>
                          <p className="text-sm text-gray-400 truncate">{reference}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Resources Available</h3>
                    <p className="text-gray-400">No additional learning resources have been provided for this challenge.</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChallengePage;