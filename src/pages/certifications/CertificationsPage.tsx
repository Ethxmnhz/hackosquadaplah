import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Award, Clock, Trophy, Users, Search,
  ChevronRight, Target, CheckCircle, 
  Shield, Zap, PlayCircle
} from 'lucide-react';
import { getSkillPaths } from '../../lib/api';
import { useCertificatePurchase } from '../../hooks/useCertificatePurchase';
import { SkillPath } from '../../lib/types';
import Card from '../../components/ui/Card';

const CertificationsPage = () => {
  const navigate = useNavigate();
  const [certifications, setCertifications] = useState<SkillPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    loadCertifications();
  }, [selectedCategory, selectedDifficulty]);

  const loadCertifications = async () => {
    setLoading(true);
    const result = await getSkillPaths({
      published_only: true,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined
    });

    if (result.success) {
      setCertifications(result.data || []);
    }
    setLoading(false);
  };

  const filteredCertifications = certifications.filter(cert =>
    cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const computeProgress = (cert: any) => {
    if (cert?.user_progress?.progress_percentage !== undefined) return cert.user_progress.progress_percentage;
    const completed = Array.isArray(cert?.user_progress?.completed_items) ? cert.user_progress.completed_items.length : 0;
    const total = Array.isArray(cert?.path_items) ? cert.path_items.length : 0;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const getPassingScore = (cert: any) => typeof cert.passing_score_percent === 'number' ? cert.passing_score_percent : 75;

  const categories = ['all', 'Web Security', 'Network Security', 'Cryptography', 'Digital Forensics', 'Penetration Testing'];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced', 'expert'];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'advanced': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'expert': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-red-500';
    if (progress >= 50) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A030F' }}>
      {/* Header with glowing backdrop */}
      <div className="relative bg-slate-900/80 border-b border-slate-800 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-red-600/30 to-purple-600/30"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500/50 to-purple-600/50 flex items-center justify-center">
                <Award className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">Professional Certifications</h1>
                <p className="text-gray-300 mt-2">Earn industry-recognized credentials and demonstrate your cybersecurity expertise</p>
              </div>
              <div className="hidden md:block">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <Award className="h-4 w-4" />
                  <span>{certifications.length} Available Certifications</span>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search certifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-4 py-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Certification */}
        {!loading && filteredCertifications.length > 0 && (
          // Cast to any to access extended certification fields not in base SkillPath interface
          (() => { const featured: any = filteredCertifications[0]; return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-red-400" />
              Featured Certification
            </h2>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-red-500/20 to-purple-600/20 p-6 flex flex-col">
                  {featured.certificate_image_url ? (
                    <div className="relative w-full h-64">
                      <img
                        src={featured.certificate_image_url}
                        alt={featured.title + ' certificate'}
                        className="w-full h-64 object-cover rounded-lg shadow-lg ring-1 ring-white/10"
                      />
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-red-500/10 to-transparent" />
                    </div>
                  ) : featured.cover_image ? (
                    <img
                      src={featured.cover_image}
                      alt={featured.title}
                      className="w-full h-64 object-cover rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700/50">
                      <Award className="h-24 w-24 text-red-400/50" />
                    </div>
                  )}
                  <div className="mt-4 text-xs text-gray-400 flex flex-col gap-1">
                    <span>Passing Score: <span className="text-gray-200 font-medium">{getPassingScore(featured)}%</span></span>
                    {featured.exam_duration_minutes && (
                      <span>Exam Duration: <span className="text-gray-200 font-medium">{featured.exam_duration_minutes} min</span></span>
                    )}
                    {featured.validity_period_days !== undefined && featured.validity_period_days !== null && (
                      <span>Validity: <span className="text-gray-200 font-medium">{featured.validity_period_days === 0 ? 'Lifetime' : `${featured.validity_period_days} days`}</span></span>
                    )}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 p-6 md:p-8 flex flex-col">
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(featured.difficulty)}`}>
                      {featured.difficulty.toUpperCase()}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 bg-slate-800 px-2 py-1 rounded">
                      {featured.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
                    {featured.code && (
                      <span className="px-2 py-1 text-xs rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-semibold tracking-wide">{featured.code}</span>
                    )}
                    {featured.title}
                  </h3>
                  <FeaturedPrice certId={featured.id} />
                  <p className="text-gray-300 mb-6">
                    {featured.short_description || featured.description}
                  </p>
                  <div className="mb-6 text-sm text-indigo-300 bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-4">
                    <p className="font-medium text-indigo-200 flex items-start gap-2">
                      <Shield className="h-4 w-4 mt-0.5" />
                      <span>To earn this certification you must complete all required modules and pass the final exam with at least {getPassingScore(featured)}%.</span>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <Clock className="h-5 w-5 mx-auto mb-1 text-red-400" />
                      <span className="text-sm text-gray-300">{filteredCertifications[0].estimated_duration}h</span>
                      <p className="text-xs text-gray-500">Duration</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <Trophy className="h-5 w-5 mx-auto mb-1 text-red-400" />
                      <span className="text-sm text-gray-300">{filteredCertifications[0].total_points}</span>
                      <p className="text-xs text-gray-500">Points</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <Target className="h-5 w-5 mx-auto mb-1 text-red-400" />
                      <span className="text-sm text-gray-300">{filteredCertifications[0].path_items?.length || 0}</span>
                      <p className="text-xs text-gray-500">Modules</p>
                    </div>
                  </div>
                  
                  {featured.user_progress ? (
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">Overall Progress</span>
                        <span className="text-white text-sm">{Math.round(computeProgress(featured))}%</span>
                      </div>
                      <div className="w-full bg-gray-700/60 rounded-full h-2 mb-4 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(computeProgress(featured))}`}
                          style={{ width: `${computeProgress(featured)}%` }}
                        ></div>
                      </div>
                      <button 
                        onClick={() => navigate(`/skill-paths/${featured.id}`)}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
                      >
                        {featured.user_progress.status === 'completed' ? (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            View Certificate
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-5 w-5 mr-2" />
                            Continue Certification
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate(`/skill-paths/${featured.id}`)}
                      className="mt-auto w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
                    >
                      <Shield className="h-5 w-5 mr-2" />
                      Start Certification
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          ); })()
        )}

        {/* All Certifications */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Award className="h-5 w-5 mr-2 text-red-400" />
            All Certifications
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-800 rounded-xl h-80"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertifications.map((cert, index) => {
              const passing = getPassingScore(cert as any);
              const progress = computeProgress(cert as any);
              return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className="h-full hover:border-red-500/50 hover:shadow-md hover:shadow-red-500/10 transition-all duration-300 group overflow-hidden"
                >
                  {/* Cover Image */}
                  <div className="relative h-48 bg-gradient-to-br from-red-500/20 to-purple-600/20 rounded-t-xl overflow-hidden">
                    {cert.cover_image ? (
                      <img src={cert.cover_image} alt={cert.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Award className="h-16 w-16 text-red-400/50" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2 items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(cert.difficulty)}`}>
                        {cert.difficulty.toUpperCase()}
                      </span>
                      {(cert as any).code && (
                        <span className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 tracking-wide">
                          {(cert as any).code}
                        </span>
                      )}
                    </div>
                    {cert.user_progress && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-sm font-medium">Progress</span>
                            <span className="text-white text-sm">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col h-[calc(100%-12rem)]">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
                        {cert.title}
                      </h3>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-red-400 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {cert.short_description || cert.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {cert.estimated_duration}h
                      </div>
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-1" />
                        {cert.total_points} pts
                      </div>
                      <div className="flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        {cert.path_items?.length || 0} modules
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                      <Shield className="h-3 w-3 text-indigo-400" />
                      <span>Exam requires {passing}% to pass</span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 bg-slate-800 px-2 py-1 rounded">
                        {cert.category}
                      </span>
                      {cert.user_progress ? (
                        <div className="flex items-center text-sm">
                          {cert.user_progress.status === 'completed' ? (
                            <span className="text-red-400 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Completed
                            </span>
                          ) : cert.user_progress.status === 'in_progress' ? (
                            <span className="text-orange-400 flex items-center">
                              <PlayCircle className="h-4 w-4 mr-1" />
                              In Progress
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center">
                              <Award className="h-4 w-4 mr-1" />
                              Enrolled
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-400">
                          <Users className="h-4 w-4 mr-1" />
                          {cert.enrolled_count || 0} enrolled
                        </div>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <PriceAndBuy certId={cert.id} navigateTo={() => navigate(`/skill-paths/${cert.id}`)} />
                      <button
                        onClick={() => navigate(`/skill-paths/${cert.id}`)}
                        className="text-xs px-3 py-2 rounded bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
              );
            })}
          </div>
        )}

        {!loading && filteredCertifications.length === 0 && (
          <div className="text-center py-16">
            <Award className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No certifications found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationsPage;

// Price and purchase UI for list cards
const PriceAndBuy: React.FC<{ certId: string; navigateTo: () => void }> = ({ certId, navigateTo }) => {
  const purchase = useCertificatePurchase(certId);
  if (purchase.loading) return <div className="text-[10px] text-gray-500">Checking…</div>;
  if (purchase.unlocked) return <span className="text-[10px] text-green-400">Unlocked</span>;
  if (!purchase.price && !purchase.plan) return <span className="text-[10px] text-gray-400">Free</span>;
  return (
    <div className="flex items-center gap-2">
      {purchase.plan && <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">In {purchase.plan}</span>}
      {purchase.price && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">₹{purchase.price}</span>}
      {purchase.price && !purchase.unlocked && (
        <button
          onClick={(e) => { e.stopPropagation(); purchase.buy(); }}
          disabled={purchase.purchasing}
          className="text-[10px] px-2 py-1 rounded bg-emerald-600/70 hover:bg-emerald-600 text-white disabled:opacity-50"
        >
          {purchase.purchasing ? 'Buying…' : 'Buy'}
        </button>
      )}
    </div>
  );
};

// Featured section price UI
const FeaturedPrice: React.FC<{ certId: string }> = ({ certId }) => {
  const purchase = useCertificatePurchase(certId);
  if (purchase.loading) return <div className="text-xs text-gray-500 mt-1">Checking access…</div>;
  if (purchase.unlocked) return <div className="text-xs text-green-400 mt-1">Unlocked</div>;
  if (!purchase.price && !purchase.plan) return null;
  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {purchase.plan && <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">In {purchase.plan} plan</span>}
      {purchase.price && <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">₹{purchase.price}</span>}
      {purchase.price && !purchase.unlocked && (
        <button
          onClick={() => purchase.buy()}
          disabled={purchase.purchasing}
          className="text-[11px] px-2 py-1 rounded bg-emerald-600/70 hover:bg-emerald-600 text-white disabled:opacity-50"
        >
          {purchase.purchasing ? 'Processing…' : 'Buy'}
        </button>
      )}
      {purchase.error && <span className="text-[11px] text-red-400">{purchase.error}</span>}
    </div>
  );
};
