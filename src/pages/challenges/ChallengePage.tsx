import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Trophy, AlertTriangle, Target, Lock,
  RefreshCw, Bookmark, Settings, ChevronDown, ChevronRight, Play, CheckCircle,
  Monitor, ExternalLink, Timer, PowerOff, Check, RotateCcw,
  ArrowRight, Shield, Sparkles, CheckCircle2, Flame, Unlock, Zap, Rocket, Clock, Lightning
} from 'lucide-react';
import { getChallenge, submitChallengeAnswer } from '../../lib/api';
import { Challenge } from '../../lib/types';
// Temporary augmentation for dynamic challenge shape coming from API
declare module '../../lib/types' {
  interface Challenge {
    answered_questions?: Set<string>;
    is_enhanced_challenge?: boolean;
  }
  interface ChallengeTask {
    lab_environment?: any;
  }
}
import Card from '../../components/ui/Card';
import { useContentAccess } from '../../hooks/useContentAccess';
import MarkdownRenderer from '../../components/ui/MarkdownRenderer';

const ChallengePage = () => {
  const { id } = useParams();
  const access = useContentAccess('challenge', id || '');
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [questionResults, setQuestionResults] = useState<Record<string, {
    isCorrect: boolean;
    pointsEarned: number;
    alreadyAnswered?: boolean;
    attempts?: number;
  }>>({});
  // @ts-ignore legacy state not used in gated view
  const [activeSection, setActiveSection] = useState('challenge');
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [challengeStarted, setChallengeStarted] = useState(false);
  // @ts-ignore legacy timer state (not critical for gating)
  const [timeSpent, setTimeSpent] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  // @ts-ignore legacy social state
  const [isLiked, setIsLiked] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});
  const [shakeQuestions, setShakeQuestions] = useState<Record<string, boolean>>({});
  const [inputRefs] = useState<Record<string, HTMLInputElement | null>>({});
  const [labStatus, setLabStatus] = useState<'inactive' | 'spawning' | 'active' | 'error'>('inactive');
  const [labEndTime, setLabEndTime] = useState<Date | null>(null);
  const [taskLabStatus, setTaskLabStatus] = useState<Record<string, 'inactive' | 'spawning' | 'active' | 'error'>>({});
  const [taskLabEndTime, setTaskLabEndTime] = useState<Record<string, Date | null>>({});

  useEffect(() => {
    if (id && access.allow) loadChallengeData(id);
  }, [id, access.allow]);

  // (Moved gating + loading returns to bottom after all hooks to preserve hook order)

  const loadChallengeData = async (challengeId: string, preserveExpandedState = false) => {
    setLoading(true);
    const result = await getChallenge(challengeId);
    if (result.success) {
      const challengeData = result.data;
      setChallenge(challengeData);
      
      console.log('🔄 Loading challenge data:', {
        answered_questions: challengeData.answered_questions,
        is_enhanced: challengeData.is_enhanced_challenge,
        answered_array: challengeData.answered_questions ? Array.from(challengeData.answered_questions) : []
      });
      
      // Pre-populate results for already answered questions
      if (challengeData.answered_questions && challengeData.answered_questions.size > 0) {
        const preResults: Record<string, any> = {};
        
        // For enhanced challenges, mark answered questions as correct
        if (challengeData.is_enhanced_challenge) {
          challengeData.tasks?.forEach((task: any) => {
            task.questions?.forEach((question: any) => {
              if (challengeData.answered_questions?.has(question.id)) {
                preResults[question.id] = {
                  isCorrect: true,
                  pointsEarned: question.points,
                  alreadyAnswered: true
                };
                console.log(`✅ Marking question ${question.id} as already answered`);
              }
            });
          });
        } else {
          // Legacy challenges
          challengeData.questions?.forEach((question: any) => {
            if (challengeData.answered_questions?.has(question.id)) {
              preResults[question.id] = {
                isCorrect: true,
                pointsEarned: question.points,
                alreadyAnswered: true
              };
            }
          });
        }
        
        console.log('📝 Setting pre-populated results:', preResults);
        setQuestionResults(preResults);
      }
      
      // Only auto-expand tasks on initial load (when no tasks are expanded yet and not preserving state)
      if (!preserveExpandedState && challengeData.is_enhanced_challenge && challengeData.tasks && Object.keys(expandedTasks).length === 0) {
        const newExpandedTasks: Record<string, boolean> = {};
        
        // Find the first task with unanswered questions
        for (const task of challengeData.tasks as any[]) {
          const hasUnansweredQuestions = task.questions?.some((q: any) => 
            !challengeData.answered_questions?.has(q.id)
          );
          
          if (hasUnansweredQuestions) {
            newExpandedTasks[task.id] = true;
            break; // Only expand the first task with unanswered questions
          }
        }
        
        setExpandedTasks(newExpandedTasks);
        console.log('📂 Auto-expanded tasks on initial load:', newExpandedTasks);
      }
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    await loadChallengeData(id);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleStartChallenge = () => {
    setChallengeStarted(true);
    // Auto-expand first task
    if (challenge?.tasks?.[0]) {
      setExpandedTasks({ [challenge.tasks[0].id || '0']: true });
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleSpawnLab = async () => {
    if (!challenge?.lab_environment?.enabled) return;
    
    setLabStatus('spawning');
    try {
      // Simulate lab spawning - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      setLabStatus('active');
      
      // Set lab end time (e.g., 60 minutes from now)
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + (challenge.lab_environment.duration || 60));
      setLabEndTime(endTime);
    } catch (error) {
      setLabStatus('error');
    }
  };

  const handleTerminateLab = async () => {
    setLabStatus('inactive');
    setLabEndTime(null);
  };

  const handleSpawnTaskLab = async (taskId: string) => {
    const task = challenge?.tasks?.find(t => t.id === taskId);
    if (!task?.lab_environment?.enabled) return;
    
    setTaskLabStatus(prev => ({ ...prev, [taskId]: 'spawning' }));
    try {
      // Simulate task lab spawning - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2500));
      setTaskLabStatus(prev => ({ ...prev, [taskId]: 'active' }));
      
      // Set task lab end time
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + (task.lab_environment.duration || 45));
      setTaskLabEndTime(prev => ({ ...prev, [taskId]: endTime }));
    } catch (error) {
      setTaskLabStatus(prev => ({ ...prev, [taskId]: 'error' }));
    }
  };

  // const handleTerminateTaskLab = async (taskId: string) => {
  //   setTaskLabStatus(prev => ({ ...prev, [taskId]: 'inactive' }));
  //   setTaskLabEndTime(prev => ({ ...prev, [taskId]: null }));
  // };

  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const remaining = Math.max(0, endTime.getTime() - now.getTime());
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Timer effect for lab environments
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      // Check main lab expiry
      if (labEndTime && now >= labEndTime) {
        setLabStatus('inactive');
        setLabEndTime(null);
      }
      
      // Check task lab expiries
      Object.entries(taskLabEndTime).forEach(([taskId, endTime]) => {
        if (endTime && now >= endTime) {
          setTaskLabStatus(prev => ({ ...prev, [taskId]: 'inactive' }));
          setTaskLabEndTime(prev => ({ ...prev, [taskId]: null }));
        }
      });
      
      // Update time spent
      if (challengeStarted) {
        setTimeSpent(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [labEndTime, taskLabEndTime, challengeStarted]);

  const handleSubmitAnswer = async (questionId: string) => {
    if (!challenge || !id || submitting[questionId]) return;
    
    setSubmitting(prev => ({ ...prev, [questionId]: true }));
    const answer = answers[questionId];
    
    console.log('🚀 Submitting answer:', { questionId, answer });
    
    const result = await submitChallengeAnswer(id, questionId, answer);
    
    if (result.success && result.data) {
      console.log('✅ Answer submission result:', result.data);
      
      setQuestionResults(prev => ({
        ...prev,
        [questionId]: {
          ...result.data,
          attempts: (prev[questionId]?.attempts || 0) + 1
        }
      }));
      
      // If correct, reload the challenge data to get updated progress while preserving expanded state
      if (result.data.isCorrect && !result.data.alreadyAnswered) {
        console.log('🔄 Answer was correct, reloading challenge data...');
        
        // Small delay to ensure database is updated
        setTimeout(async () => {
          await loadChallengeData(id, true); // Pass true to preserve expanded state
        }, 500);
        
        // Check if all tasks completed for celebration
        const totalQuestions = challenge.tasks?.reduce((sum, task) => sum + (task.questions?.length || 0), 0) || 0;
        const totalCompleted = Object.values(questionResults).filter(r => r.isCorrect).length + 1;
        if (totalCompleted === totalQuestions) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      } else if (!result.data.isCorrect) {
        // Track failed attempts for hints
        setFailedAttempts(prev => ({
          ...prev,
          [questionId]: (prev[questionId] || 0) + 1
        }));
        // Trigger shake animation
        setShakeQuestions(prev => ({ ...prev, [questionId]: true }));
        setTimeout(() => {
          setShakeQuestions(prev => ({ ...prev, [questionId]: false }));
          // Refocus input for quick retry
          const el = inputRefs[questionId];
          if (el) el.focus();
        }, 600);
      }
    }
    
    setSubmitting(prev => ({ ...prev, [questionId]: false }));
  };

  // const copyToClipboard = async (text: string) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //   } catch (err) {
  //     console.error('Failed to copy text: ', err);
  //   }
  // };

  const getTaskStatus = (taskId: string) => {
    const task = challenge?.tasks?.find(t => t.id === taskId);
    if (!task?.questions) return 'pending';
    
    const allCompleted = task.questions.every(q => 
      questionResults[q.id]?.isCorrect || 
      (challenge?.answered_questions?.has(q.id) && challenge.is_enhanced_challenge)
    );
    
    if (allCompleted) return 'completed';
    if (expandedTasks[taskId]) return 'active';
    
    // Check if any question in this task has been answered
    const hasAnsweredQuestions = task.questions.some(q => 
      questionResults[q.id]?.isCorrect || 
      (challenge?.answered_questions?.has(q.id) && challenge.is_enhanced_challenge)
    );
    
    if (hasAnsweredQuestions) return 'active';
    return 'pending';
  };

  const getTaskProgress = (taskId: string) => {
    const task = challenge?.tasks?.find(t => t.id === taskId);
    if (!task?.questions) return { completed: 0, total: 0 };
    
    const completed = task.questions.filter(q => 
      questionResults[q.id]?.isCorrect || 
      (challenge?.answered_questions?.has(q.id) && challenge.is_enhanced_challenge)
    ).length;
    
    return { completed, total: task.questions.length };
  };

  const getTotalPointsEarned = () => {
    let totalPoints = Object.values(questionResults).reduce((sum, result) => sum + result.pointsEarned, 0);
    
    // Add points from already answered questions (for enhanced challenges)
    if (challenge?.is_enhanced_challenge && challenge.answered_questions) {
      challenge.tasks?.forEach(task => {
        task.questions?.forEach(question => {
          if (challenge.answered_questions?.has(question.id) && !questionResults[question.id]) {
            totalPoints += question.points;
          }
        });
      });
    }
    
    return totalPoints;
  };

  const getCompletedTasksCount = () => {
    return challenge?.tasks?.filter(task => {
      const status = getTaskStatus(task.id);
      return status === 'completed';
    }).length || 0;
  };

  // const getTotalAnsweredQuestions = () => {
  //   let answered = Object.values(questionResults).filter(r => r.isCorrect).length;
  //   if (challenge?.is_enhanced_challenge && challenge.answered_questions) {
  //     answered += challenge.answered_questions.size;
  //   }
  //   return answered;
  // };

  // const getTotalQuestions = () => {
  //   return challenge?.tasks?.reduce((sum, task) => sum + (task.questions?.length || 0), 0) || 0;
  // };

  const canShowHints = (questionId: string) => {
    return (failedAttempts[questionId] || 0) >= 2;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-900/30 text-green-400 border-green-500/50';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50';
      case 'hard':
        return 'bg-orange-900/30 text-orange-400 border-orange-500/50';
      case 'expert':
        return 'bg-red-900/30 text-red-400 border-red-500/50';
      default:
        return 'bg-red-900/20 text-red-400 border-red-400/30';
    }
  };

  // const getCategoryIcon = (type: string) => {
  //   switch (type) {
  //     case 'web': return <Shield className="h-6 w-6" />;
  //     case 'network': return <Terminal className="h-6 w-6" />;
  //     case 'crypto': return <Lock className="h-6 w-6" />;
  //     default: return <Target className="h-6 w-6" />;
  //   }
  // };

  // Access gating & loading (placed after all hooks & effects) ------------------
  if (access.loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse">
        <div className="h-5 w-32 bg-neutral-800 rounded mb-6" />
        <div className="h-10 bg-neutral-800/60 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-neutral-800/40 rounded w-5/6" />
          <div className="h-3 bg-neutral-800/40 rounded w-4/6" />
          <div className="h-3 bg-neutral-800/40 rounded w-3/6" />
        </div>
      </div>
    );
  }

  if (id && !access.allow) {
    const requiredPlan = access.required_plan?.toUpperCase() || 'HI-FI';
    const hasOneTimePrice = access.individual_price !== null && access.individual_price !== undefined;
    const price = access.individual_price ?? 0;
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0B0613] via-[#140A22] to-[#1C0F32] py-10 px-4">
        {/* Ambient gradient / glow layers */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,92,0.25),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(120,0,255,0.18),transparent_65%)] mix-blend-screen" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_40%,rgba(255,255,255,0.04)_100%)]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>

          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            {/* LEFT: Lock / Upgrade Pane */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-800/60 backdrop-blur-xl p-10 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_40px_-8px_rgba(0,0,0,0.6)]">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-red-600/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-8 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />

              <div className="relative space-y-8">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center shadow-lg shadow-red-600/30 ring-2 ring-red-500/40">
                    <Lock className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-red-100 to-fuchsia-200 bg-clip-text text-transparent">
                      Challenge Locked
                    </h1>
                    <p className="text-sm text-gray-400 mt-1 max-w-sm">
                      This premium scenario requires an upgraded subscription tier.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/30">
                      Required Plan · {requiredPlan}
                    </span>
                    {hasOneTimePrice && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Or One‑Time Access ₹{price}
                      </span>
                    )}
                    {access.reason && (
                      <span className="px-3 py-1 rounded-full text-xs bg-slate-700/40 text-slate-300 border border-slate-600/40">
                        Code: {access.reason}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300 max-w-xl">
                    Upgrade to <span className="font-semibold text-white">{requiredPlan}</span> to unlock advanced chained attack paths,
                    deeper post-compromise analytics, priority lab capacity, and weekly fresh challenge drops.
                    Grow faster with realistic multi‑stage adversary simulation.
                  </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {[
                    { icon: Trophy, label: 'Full XP & Points' },
                    { icon: Target, label: 'Advanced Scenarios' },
                    { icon: Shield, label: 'Defense Mirrors' },
                    { icon: Clock, label: 'Extended Lab Time' },
                    { icon: Zap, label: 'Weekly Drops' },
                    { icon: Rocket, label: 'Faster Progress' }
                  ].map(b => (
                    <div
                      key={b.label}
                      className="flex items-center gap-2 rounded-lg bg-slate-800/60 border border-slate-700/40 px-3 py-2 text-gray-300"
                    >
                      <b.icon className="h-4 w-4 text-red-400" />
                      <span>{b.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTAs */}
                <div className="space-y-4">
                  <button
                    onClick={() => navigate('/billing')}
                    className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-fuchsia-600 text-white font-semibold py-4 shadow-lg shadow-red-800/40 hover:shadow-red-600/50 transition-all"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Shield className="h-5 w-5" />
                      Upgrade to {requiredPlan}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.18),transparent_70%)]" />
                  </button>

                  {hasOneTimePrice && (
                    <button
                      disabled
                      className="w-full rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-200 font-medium py-3 text-sm cursor-not-allowed"
                      title="One-time purchase coming soon"
                    >
                      One‑Time Access ₹{price} (Coming Soon)
                    </button>
                  )}

                  <button
                    onClick={() => access.refresh(true)}
                    className="w-full text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry Access Check
                  </button>
                </div>

                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-500 tracking-wide">
                  Cancel anytime. Upgrading instantly unlocks all current & upcoming premium challenges.
                </div>
              </div>
            </div>

            {/* RIGHT: Motivation / Preview */}
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-900/30 backdrop-blur-xl p-10 flex flex-col overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,0,92,0.08),transparent_55%)] pointer-events-none" />
              <div className="flex-1 space-y-10">
                <div className="space-y-5">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-fuchsia-400" /> Why Upgrade?
                  </h2>
                  <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> Unlock multi‑stage adversary simulation with realistic infrastructure.
                    </li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> Access deeper write‑ups & methodology insights post‑solve.
                    </li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> Earn higher XP multipliers & leaderboard impact.
                    </li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> Priority lab slots during global peak usage.
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-6">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-red-400" /> Sneak Preview
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Premium chains blend misconfigurations, privilege escalation surfaces and adaptive defensive signals.
                    Practice iterative hypothesis, not guess-and-check trivia.
                  </p>
                </div>

                <div className="flex items-center gap-5 text-xs text-gray-500">
                  <div className="flex items-center gap-1"><Unlock className="h-3.5 w-3.5 text-red-400" /> Instant Unlock</div>
                  <div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-fuchsia-400" /> Weekly Drops</div>
                  <div className="flex items-center gap-1"><Rocket className="h-3.5 w-3.5 text-pink-400" /> Faster Growth</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse text-red-400">Loading challenge...</div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gray-400">Challenge not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Enhanced Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-gradient-to-br from-red-900/70 to-purple-800/70 border border-red-500/40 rounded-2xl p-8 shadow-2xl max-w-md mx-4 relative overflow-hidden backdrop-blur-sm"
            >
              <div className="text-center relative z-10">
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Trophy className="h-8 w-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Room Complete!
                </h2>
                <p className="text-gray-300 mb-6">
                  Congratulations! You earned{' '}
                  <span className="text-red-400 font-bold">{getTotalPointsEarned()} points</span>!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCelebration(false)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex-1"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => navigate('/challenges')}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex-1"
                  >
                    Next Room
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb Navigation */}
      <div className="bg-gradient-to-br from-red-900/20 via-black to-purple-900/20 border-b border-red-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center text-sm text-gray-400">
            <button
              onClick={() => navigate('/challenges')}
              className="hover:text-white transition-colors"
            >
              Cybersecurity Challenges
            </button>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-red-400">{challenge.challenge_type}</span>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-white">{challenge.title}</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-gradient-to-br from-red-900/20 via-black to-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6"
          >
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-red-500/30 flex items-center justify-center">
                  <Target className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{challenge.title}</h1>
                  <p className="text-gray-400">{challenge.short_description || challenge.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1)}
                </span>
                <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-800/60 text-gray-300 border border-slate-700/40">
                  {challenge.estimated_time} min
                </span>
                <span className="px-3 py-1 rounded-lg text-sm font-medium bg-slate-800/60 text-gray-300 border border-slate-700/40">
                  <Trophy className="h-3 w-3 mr-1 inline" />
                  {challenge.points} points
                </span>
              </div>

              {/* Progress Bar */}
              {challengeStarted && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Room completed</span>
                    <span className="text-sm text-gray-400">
                      ({Math.round((getCompletedTasksCount() / (challenge.tasks?.length || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <motion.div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ 
                        width: `${challenge.tasks?.length ? (getCompletedTasksCount() / challenge.tasks.length) * 100 : 0}%` 
                      }}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${challenge.tasks?.length ? (getCompletedTasksCount() / challenge.tasks.length) * 100 : 0}%` 
                      }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 lg:min-w-[240px]">
              {!challengeStarted ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartChallenge}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start AttackBox
                </motion.button>
              ) : (
                <div className="flex items-center justify-center text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-400/30 text-sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="font-medium">Room Active</span>
                </div>
              )}

              {/* Lab Environment Controls */}
              {challenge.lab_environment?.enabled && challengeStarted && (
                <div className="space-y-2">
                  {labStatus === 'inactive' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSpawnLab}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center w-full text-sm"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Start Machine
                    </motion.button>
                  )}
                  
                  {labStatus === 'spawning' && (
                    <div className="flex items-center justify-center bg-orange-900/20 px-4 py-3 rounded-lg border border-orange-500/30 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-400 border-t-transparent mr-2"></div>
                      <span className="text-orange-300 font-medium">Starting Machine...</span>
                    </div>
                  )}
                  
                  {labStatus === 'active' && (
                    <div className="space-y-2">
                      {challenge.lab_environment.web_app_url && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => challenge?.lab_environment?.web_app_url && window.open(challenge.lab_environment.web_app_url, '_blank')}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center w-full text-sm"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Access Machine
                        </motion.button>
                      )}
                      
                      {labEndTime && (
                        <div className="flex items-center justify-center bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/30 text-sm">
                          <Timer className="h-4 w-4 mr-2 text-red-400" />
                          <span className="text-red-300 font-medium">
                            {formatTimeRemaining(labEndTime)}
                          </span>
                        </div>
                      )}
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleTerminateLab}
                        className="bg-red-700/60 hover:bg-red-600/70 text-red-200 border border-red-600/40 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center w-full text-sm"
                      >
                        <PowerOff className="h-3 w-3 mr-2" />
                        Terminate
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {/* Utility buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                    isBookmarked ? 'text-red-400 border-red-400/30' : ''
                  }`}
                >
                  <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button className="bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center">
                  <Settings className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!challengeStarted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Card className="p-8 bg-gradient-to-br from-slate-900/70 to-slate-800/70 border-slate-700/40">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                  <Target className="h-10 w-10 text-red-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-3">Ready to Start?</h2>
                  <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">{challenge.description}</p>
                </div>

                {challenge.scenario && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-left">
                    <h3 className="font-bold text-red-400 mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Scenario
                    </h3>
                    <p className="text-gray-300 leading-relaxed">{challenge.scenario}</p>
                  </div>
                )}

                <button
                  onClick={handleStartChallenge}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg transition-colors inline-flex items-center"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Room
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Task List */}
        {challengeStarted && (
          <div className="space-y-4">
            {challenge.tasks?.map((task, taskIndex) => {
              const status = getTaskStatus(task.id);
              const isExpanded = expandedTasks[task.id];
              const progress = getTaskProgress(task.id);
              const taskLabStat = taskLabStatus[task.id] || 'inactive';
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: taskIndex * 0.1 }}
                >
                  <Card className={`bg-gradient-to-br from-slate-900/70 to-slate-800/70 border-slate-700/40 transition-all duration-300 ${
                    status === 'completed' ? 'border-green-500/50' : isExpanded ? 'border-red-400/30' : ''
                  }`}>
                    {/* Task Header */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleTaskExpansion(task.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            status === 'completed' 
                              ? 'bg-red-500 text-white' 
                              : 'bg-slate-700 text-gray-300'
                          }`}>
                            {status === 'completed' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span>{taskIndex + 1}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              Task {taskIndex + 1} {status === 'completed' && <CheckCircle className="h-4 w-4 text-red-400 inline ml-2" />} {task.title || ''}
                            </h3>
                            <div className="text-sm text-gray-400">
                              {progress.completed}/{progress.total} questions completed
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Task Lab Controls */}
                          {task.lab_environment?.enabled && (
                            <div className="flex items-center gap-2">
                              {taskLabStat === 'inactive' && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSpawnTaskLab(task.id);
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
                                >
                                  Start Machine
                                </motion.button>
                              )}
                              
                              {taskLabStat === 'spawning' && (
                                <div className="bg-orange-900/20 px-3 py-1 rounded text-xs text-orange-300 border border-orange-500/30">
                                  Starting...
                                </div>
                              )}
                              
                              {taskLabStat === 'active' && (
                                <div className="flex items-center gap-2">
                                  {task.lab_environment.web_app_url && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(task.lab_environment.web_app_url, '_blank');
                                      }}
                                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition-colors"
                                    >
                                      Access
                                    </motion.button>
                                  )}
                                  
                                  {taskLabEndTime[task.id] && (
                                    <div className="bg-red-900/20 px-2 py-1 rounded text-xs text-red-300 border border-red-500/30">
                                      {taskLabEndTime[task.id] ? formatTimeRemaining(taskLabEndTime[task.id] as Date) : '—'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Task Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="border-t border-slate-700"
                        >
                          <div className="p-6 bg-slate-800/50">
                            {/* Task Description */}
                            {task.description && (
                              <div className="mb-6">
                                <p className="text-gray-300 leading-relaxed">{task.description}</p>
                              </div>
                            )}

                            {/* Task Instructions */}
                            {task.explanation && (
                              <div className="mb-6">
                                <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/40">
                                  <MarkdownRenderer 
                                    content={task.explanation}
                                    className="task-explanation"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Questions */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-bold text-white mb-4">Answer the questions below</h4>
                              
                              {task.questions?.map((question, questionIndex) => {
                                const isAnswered = questionResults[question.id]?.isCorrect || 
                                                  (challenge?.answered_questions?.has(question.id) && challenge.is_enhanced_challenge);
                                              
                                return (
                                  <motion.div 
                                    key={question.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: questionIndex * 0.1 }}
                                    className="bg-slate-900 rounded-lg p-4 border border-slate-700/40"
                                  >
                                    <div className="flex items-start gap-4">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                        isAnswered 
                                          ? 'bg-red-500 text-white' 
                                          : 'bg-slate-700/60 text-gray-300'
                                      }`}>
                                        {isAnswered ? (
                                          <Check className="h-4 w-4" />
                                        ) : (
                                          <span>{questionIndex + 1}</span>
                                        )}
                                      </div>
                                      
                                      <div className="flex-1">
                                        <p className="text-gray-100 mb-3">{question.question_text}</p>

                                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              placeholder={isAnswered ? "Completed" : "Answer"}
                                              value={isAnswered ? "***COMPLETED***" : (answers[question.id] || '')}
                                              onChange={(e) => {
                                                if (!isAnswered) {
                                                  setAnswers(prev => ({
                                                    ...prev,
                                                    [question.id]: e.target.value
                                                  }));
                                                }
                                              }}
                                              ref={(el) => { if (el) inputRefs[question.id] = el; }}
                                              className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${
                                                isAnswered 
                                                  ? 'bg-red-900/20 border-red-500/30 text-red-400' 
                                                  : `bg-slate-800/60 border-slate-600/40 text-white focus:border-red-400 focus:ring-1 focus:ring-red-400/20 ${shakeQuestions[question.id] ? 'animate-[shake_0.4s_ease-in-out]' : ''}`
                                              }`}
                                              disabled={isAnswered}
                                              readOnly={isAnswered}
                                            />

                                          </div>

                                          {isAnswered ? (
                                            <div className="text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 text-sm font-medium">
                                              Completed
                                            </div>
                                          ) : questionResults[question.id] && !questionResults[question.id].isCorrect ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSubmitAnswer(question.id);
                                              }}
                                              disabled={submitting[question.id] || !answers[question.id]}
                                              className="bg-slate-700/70 hover:bg-slate-600 text-red-300 hover:text-white border border-red-500/40 font-medium px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2"
                                            >
                                              {submitting[question.id] ? 'Checking...' : (
                                                <>
                                                  <RotateCcw className="h-4 w-4" />
                                                  Retry
                                                </>
                                              )}
                                            </button>
                                          ) : (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSubmitAnswer(question.id);
                                              }}
                                              disabled={!answers[question.id] || submitting[question.id]}
                                              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                                            >
                                              {submitting[question.id] ? 'Checking...' : 'Submit'}
                                            </button>
                                          )}
                                        </div>

                                        {/* Hints */}
                                        {question.hints && question.hints.length > 0 && (
                                          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setShowHints(prev => ({ ...prev, [question.id]: !prev[question.id] }));
                                              }}
                                              disabled={!canShowHints(question.id)}
                                              className={`text-sm transition-colors ${
                                                canShowHints(question.id) 
                                                  ? 'text-red-400 hover:text-red-300' 
                                                  : 'text-gray-500 cursor-not-allowed'
                                              }`}
                                            >
                                              {canShowHints(question.id) 
                                                ? (showHints[question.id] ? 'Hide Hint' : 'Show Hint')
                                                : `Unlock after 2 attempts (${failedAttempts[question.id] || 0}/2)`
                                              }
                                            </button>
                                            
                                            <AnimatePresence>
                                              {showHints[question.id] && canShowHints(question.id) && (
                                                <motion.div
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: 'auto' }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  transition={{ duration: 0.3 }}
                                                  className="mt-2 bg-red-900/20 border border-red-500/30 rounded-lg p-3"
                                                >
                                                  {question.hints.map((hint, hintIndex) => (
                                                    <p key={hintIndex} className="text-red-200 text-sm">
                                                      {hint.text}
                                                    </p>
                                                  ))}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengePage;