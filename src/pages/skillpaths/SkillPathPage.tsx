import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, Trophy, Target, Users, Play,
  CheckCircle, Lock, Award, ChevronDown, ChevronRight,
  Lightbulb, Flag, Monitor, Shield, Terminal, AlertTriangle, BarChart3
} from 'lucide-react';
import { getSkillPath, enrollInSkillPath } from '../../lib/api';
import { useCertificatePurchase } from '../../hooks/useCertificatePurchase';
import { SkillPath, SkillPathItem } from '../../lib/types';
import Card from '../../components/ui/Card';

const SkillPathPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skillPath, setSkillPath] = useState<SkillPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const purchase = useCertificatePurchase(id || '');

  useEffect(() => {
    if (id) loadSkillPath(id);
  }, [id]);

  const loadSkillPath = async (pathId: string) => {
    setLoading(true);
    const result = await getSkillPath(pathId);
    if (result.success && result.data) {
      setSkillPath(result.data as any); // cast to include certification extension fields
    }
    setLoading(false);
  };

  const handleEnroll = async () => {
    if (!skillPath || skillPath.user_progress) return;
    
    setEnrolling(true);
    const result = await enrollInSkillPath(skillPath.id);
    if (result.success) {
      await loadSkillPath(skillPath.id);
    }
    setEnrolling(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getItemIcon = (item: SkillPathItem) => {
    if (item.item_type === 'challenge') {
      const challengeType = item.challenge?.challenge_type;
      switch (challengeType) {
        case 'web': return <Shield className="h-4 w-4" />;
        case 'network': return <Terminal className="h-4 w-4" />;
        case 'crypto': return <Lock className="h-4 w-4" />;
        default: return <Flag className="h-4 w-4" />;
      }
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'advanced': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'expert': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const isItemCompleted = (itemId: string) => {
    return skillPath?.user_progress?.completed_items.includes(itemId) || false;
  };

  const isItemUnlocked = (item: SkillPathItem) => {
    if (!item.unlock_after || item.unlock_after.length === 0) return true;
    if (!skillPath?.user_progress) return false;
    
    return item.unlock_after.every(prereqId => 
      skillPath.user_progress?.completed_items.includes(prereqId)
    );
  };

  const getItemStatus = (item: SkillPathItem) => {
    if (isItemCompleted(item.id)) return 'completed';
    if (isItemUnlocked(item)) return 'available';
    return 'locked';
  };

  const handleItemClick = (item: SkillPathItem) => {
    const status = getItemStatus(item);
    if (status === 'locked') return;

    if (item.item_type === 'challenge') {
      navigate(`/challenges/${item.item_id}`);
    } else {
      navigate(`/labs/${item.item_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!skillPath) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Skill Path Not Found</h1>
          <p className="text-gray-400">The requested skill path could not be found.</p>
        </div>
      </div>
    );
  }

  // Normalize arrays defensively
  const learningObjectives = Array.isArray(skillPath.learning_objectives) ? skillPath.learning_objectives : [];
  const pathItems = Array.isArray(skillPath.path_items) ? skillPath.path_items : [];
  const prerequisites = Array.isArray(skillPath.prerequisites) ? skillPath.prerequisites : [];
  const completedItems = Array.isArray(skillPath.user_progress?.completed_items) ? (skillPath.user_progress as any).completed_items.length : 0;
  const totalItems = pathItems.length;
  // Access extended certification fields with loose typing (SkillPath | Certification union not fully propagated here)
  const cert = skillPath as any;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white relative">
      {/* Header */}
      <div className="bg-slate-900/40 backdrop-blur-sm border-b border-red-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <button
              onClick={() => navigate('/skill-paths')}
              className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Skill Paths
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="h-8 w-8 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-white mb-4">{skillPath.title}</h1>
                    <p className="text-xl text-gray-300 leading-relaxed">{skillPath.description}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getDifficultyColor(skillPath.difficulty)}`}>
                    {skillPath.difficulty.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-800 text-gray-300 border border-slate-700">
                    {skillPath.category}
                  </span>
                  {cert.code && (
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-600/20 text-red-300 border border-red-500/30">
                      {cert.code}
                    </span>
                  )}
                  {cert.is_featured && (
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30">
                      Featured
                    </span>
                  )}
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {skillPath.estimated_duration} hours
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Trophy className="h-4 w-4 mr-1" />
                    {skillPath.total_points} points
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Users className="h-4 w-4 mr-1" />
                    {skillPath.enrolled_count || 0} enrolled
                  </div>
                </div>
                {/* Certification Meta */}
                {(cert.exam_type || cert.passing_score_percent || cert.issuer_name) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {cert.exam_type && (
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Exam Type</p>
                        <p className="text-sm font-medium text-white capitalize">{String(cert.exam_type).replace('_',' ')}</p>
                      </div>
                    )}
                    {typeof cert.passing_score_percent === 'number' && (
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Passing Score</p>
                        <p className="text-sm font-medium text-white">{cert.passing_score_percent}%</p>
                      </div>
                    )}
                    {cert.validity_period_days !== undefined && cert.validity_period_days !== null && (
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Validity</p>
                        <p className="text-sm font-medium text-white">{cert.validity_period_days === 0 ? 'Lifetime' : `${cert.validity_period_days} days`}</p>
                      </div>
                    )}
                    {cert.delivery_mode && (
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Delivery</p>
                        <p className="text-sm font-medium text-white capitalize">{cert.delivery_mode}</p>
                      </div>
                    )}
                    {cert.max_attempts && (
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Attempts</p>
                        <p className="text-sm font-medium text-white">Up to {cert.max_attempts}</p>
                      </div>
                    )}
                    {cert.cooldown_hours_between_attempts && (
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Cooldown</p>
                        <p className="text-sm font-medium text-white">{cert.cooldown_hours_between_attempts}h between attempts</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress */}
                {skillPath.user_progress && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Your Progress</span>
                      <span className="text-sm text-gray-400">{completedItems}/{totalItems} completed</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400 mt-2">
                      <span>{Math.round(progressPercentage)}% complete</span>
                      <span>{skillPath.user_progress.total_points_earned || 0} points earned</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Panel */}
              <div className="lg:col-span-1">
                <Card className="p-6 border-red-500/20">
                  {!skillPath.user_progress ? (
                    <div className="space-y-4">
                      {/* Pricing / Access State */}
                      {purchase.loading ? (
                        <div className="text-xs text-gray-400">Checking access…</div>
                      ) : purchase.unlocked ? (
                        <div className="text-xs text-green-400">Unlocked</div>
                      ) : purchase.price ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {purchase.plan && <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">In {purchase.plan} plan</span>}
                            <span className="text-[13px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 font-semibold">₹{purchase.price}</span>
                          </div>
                          <button
                            onClick={() => purchase.buy()}
                            disabled={purchase.purchasing}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {purchase.purchasing ? 'Processing…' : 'Buy & Unlock'}
                          </button>
                          {purchase.error && <div className="text-xs text-red-400">{purchase.error}</div>}
                          <div className="text-[10px] text-gray-500">One-time purchase unlocks this certification even without a plan.</div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Free Access</div>
                      )}
                      <button
                        onClick={handleEnroll}
                        disabled={enrolling || (!purchase.unlocked && purchase.price != null)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {enrolling ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        ) : (
                          <Play className="h-5 w-5 mr-2" />
                        )}
                        {enrolling ? 'Enrolling...' : (purchase.price && !purchase.unlocked ? 'Purchase Required' : 'Enroll Now')}
                      </button>
                    </div>
                  ) : skillPath.user_progress.status === 'completed' ? (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="h-8 w-8 text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Congratulations!</h3>
                      <p className="text-gray-400 text-sm">You've completed this skill path</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const nextItem = pathItems.find(item => !isItemCompleted(item.id) && isItemUnlocked(item));
                        if (nextItem) handleItemClick(nextItem);
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Continue Learning
                    </button>
                  )}

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white font-semibold">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Items</span>
                      <span className="text-white">{totalItems}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total Points</span>
                      <span className="text-white">{skillPath.total_points}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Learning Objectives */}
            <Card className="p-6">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('objectives')}
              >
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
                  Learning Objectives
                </h2>
                {expandedSections.objectives ? 
                  <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                }
              </div>
              
              <AnimatePresence>
                {expandedSections.objectives && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <ul className="space-y-2">
                      {learningObjectives.map((objective, index) => (
                        <li key={index} className="flex items-start text-gray-300">
                          <CheckCircle className="h-4 w-4 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Path Items */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Target className="h-5 w-5 mr-2 text-red-400" />
                Learning Path ({pathItems.length} items)
              </h2>

              <div className="space-y-4">
                {pathItems.map((item, index) => {
                  const status = getItemStatus(item);
                  const isCompleted = status === 'completed';
                  const isLocked = status === 'locked';
                  
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        isCompleted ? 'bg-green-500/10 border border-green-500/20' :
                        isLocked ? 'bg-slate-800/50 border border-slate-700/50 opacity-60' :
                        'bg-slate-800/50 border border-slate-700/50 hover:border-red-500/50 cursor-pointer'
                      }`}
                      onClick={() => !isLocked && handleItemClick(item)}
                    >
                      {/* Status Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-green-500/20' :
                        isLocked ? 'bg-slate-700/50' :
                        'bg-red-500/20'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : isLocked ? (
                          <Lock className="h-5 w-5 text-gray-500" />
                        ) : (
                          getItemIcon(item)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {item.item_type === 'challenge' ? item.challenge?.title : item.lab?.title}
                          </h3>
                          {item.is_required && (
                            <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded border border-red-500/20">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {item.item_type === 'challenge' ? item.challenge?.short_description : item.lab?.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="capitalize">{item.item_type}</span>
                          <span>
                            {item.item_type === 'challenge' ? item.challenge?.points : item.lab?.points} points
                          </span>
                        </div>
                      </div>

                      {/* Progress Indicator */}
                      <div className="flex items-center">
                        {!isLocked && (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Certificate Preview */}
            {(() => { const cert: any = skillPath; const passing = typeof cert.passing_score_percent === 'number' ? cert.passing_score_percent : 75; return (
              <Card className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center">
                  <Award className="h-4 w-4 mr-2 text-red-400" />
                  Certificate Preview
                </h3>
                <div className="rounded-lg overflow-hidden border border-slate-700/60 bg-slate-800/40">
                  {cert.certificate_image_url ? (
                    <img src={cert.certificate_image_url} alt="Certificate preview" className="w-full h-40 object-cover" />
                  ) : cert.cover_image ? (
                    <img src={cert.cover_image} alt="Certificate preview" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center bg-slate-800">
                      <Award className="h-10 w-10 text-slate-500" />
                    </div>
                  )}
                </div>
                {cert.code && (
                  <div className="mt-3 inline-flex items-center gap-2 px-2 py-1 rounded bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-semibold tracking-wide">
                    <span>Code:</span>
                    <span>{cert.code}</span>
                  </div>
                )}
                <div className="mt-4 text-sm text-gray-300 bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
                  <p className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-red-400 mt-0.5" />
                    <span>Complete all required modules and pass the final exam with at least {passing}% to earn your certificate.</span>
                  </p>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1 text-xs text-gray-400">
                    <span>Overall Progress</span>
                    <span className="text-white">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </Card>
            ); })()}
            {/* Prerequisites */}
            {prerequisites.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-yellow-400" />
                  Prerequisites
                </h3>
                <ul className="space-y-2">
                  {prerequisites.map((prereq, index) => (
                    <li key={index} className="text-sm text-gray-400 flex items-start">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mr-2 mt-2 flex-shrink-0"></div>
                      {prereq}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-blue-400" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Enrolled Users</span>
                  <span className="text-white">{skillPath.enrolled_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Completion Rate</span>
                  <span className="text-white">{Math.round(skillPath.completion_rate || 0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Average Duration</span>
                  <span className="text-white">{skillPath.estimated_duration}h</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillPathPage;
