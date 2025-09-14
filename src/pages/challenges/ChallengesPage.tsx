import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Flag, Trophy, Users, Clock, CheckCircle, 
  Sword, Shield, Terminal, Flame, Target, Lock, Filter,
  Star, TrendingUp, Calendar, Eye, Play, Award,
  Grid3X3, List, SortAsc, SortDesc, Zap, Globe,
  Code, Layers, BookOpen, ArrowRight, Timer,
  ChevronDown, X, RefreshCw, ChevronRight, Server,
  Skull, AlertTriangle
} from 'lucide-react';
import { loadChallenges } from '../../lib/api';
import { Challenge } from '../../lib/types';
import Card from '../../components/ui/Card';

const CHALLENGE_ICONS = {
  web: Globe,
  network: Shield,
  crypto: Lock,
  misc: Target
};

const CHALLENGE_COLORS = {
  web: 'text-accent-blue',
  network: 'text-accent-green', 
  crypto: 'text-warning-light',
  misc: 'text-primary'
};

const DIFFICULTY_CONFIG = {
  easy: { color: 'text-success-light', bg: 'bg-success-dark/20', border: 'border-success-light/30' },
  medium: { color: 'text-warning-light', bg: 'bg-warning-dark/20', border: 'border-warning-light/30' },
  hard: { color: 'text-error-light', bg: 'bg-error-dark/20', border: 'border-error-light/30' },
  expert: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-400/30' }
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First', icon: Calendar },
  { id: 'oldest', label: 'Oldest First', icon: Calendar },
  { id: 'points-high', label: 'Highest Points', icon: Trophy },
  { id: 'points-low', label: 'Lowest Points', icon: Trophy },
  { id: 'difficulty', label: 'Difficulty', icon: Star },
  { id: 'popular', label: 'Most Popular', icon: TrendingUp }
];

const ChallengesPage = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const categories = ['all', 'web', 'network', 'crypto', 'misc'];
  const difficulties = ['all', 'easy', 'medium', 'hard', 'expert'];

  useEffect(() => {
    loadChallengesData();
  }, [selectedCategory, selectedDifficulty]);

  const loadChallengesData = async () => {
    setLoading(true);
    const result = await loadChallenges({
      published_only: true,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined
    });

    if (result.success) {
      setChallenges(result.data || []);
    }
    setLoading(false);
  };

  const filteredChallenges = challenges.filter(challenge =>
    challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    challenge.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-900/30 border-green-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
      case 'hard': return 'text-orange-400 bg-orange-900/30 border-orange-500/50';
      case 'expert': return 'text-red-400 bg-red-900/30 border-red-500/50';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'web': return <Globe className="h-5 w-5" />;
      case 'network': return <Shield className="h-5 w-5" />;
      case 'crypto': return <Lock className="h-5 w-5" />;
      case 'misc': return <Target className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (type: string) => {
    // Use very subtle purple/red gradient theme to match the banner
    return 'from-slate-900/70 to-slate-800/70 border-slate-700/40';
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-red-900/20 via-black to-purple-900/20 border-b border-red-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZjAwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djEwaC0yVjM0aDJ6bTAtNHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-red-500/30 flex items-center justify-center backdrop-blur-sm">
                  <Skull className="h-10 w-10 text-red-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-red-400 via-red-500 to-purple-600 bg-clip-text text-transparent">
                ATTACK
              </span>
              <span className="text-white"> SCENARIOS</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Infiltrate. Exploit. Dominate. Master real-world cybersecurity through hands-on attack simulations.
            </p>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{challenges.length} Active Scenarios</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>2.3K+ Hackers Online</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                <span>150K+ Flags Captured</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-slate-900/50 border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search attack vectors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/50 border border-red-500/30 rounded-xl text-white placeholder-gray-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-black/50 border border-gray-600 rounded-xl text-white focus:border-red-400 focus:ring-2 focus:ring-red-500/20 min-w-[140px]"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Vectors' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-4 py-3 bg-black/50 border border-gray-600 rounded-xl text-white focus:border-red-400 focus:ring-2 focus:ring-red-500/20 min-w-[120px]"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="px-4 py-3 bg-black/50 border border-gray-600 rounded-xl text-white hover:border-red-400 transition-colors"
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-800/50 rounded-2xl h-72 border border-slate-700/50"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-3"
          }>
            {filteredChallenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div 
                  className={`group cursor-pointer ${viewMode === 'grid' ? 'h-full' : ''}`}
                  onClick={() => navigate(`/challenges/${challenge.id}`)}
                  onMouseEnter={() => setHoveredCard(challenge.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <motion.div 
                    whileHover={{ 
                      y: -8,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                    className={`relative bg-gradient-to-br ${getCategoryColor(challenge.challenge_type)} backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 hover:border-red-400/50 hover:shadow-2xl hover:shadow-red-500/20 ${viewMode === 'grid' ? 'h-full' : 'p-6'}`}
                  >
                    {/* Enhanced Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>
                    
                    {viewMode === 'grid' ? (
                      <>
                        {/* Challenge Image/Icon - Increased height */}
                        <div className="relative h-56 bg-gradient-to-br from-slate-800 via-purple-900/20 to-red-900/20 overflow-hidden">
                          {challenge.icon_url ? (
                            <img 
                              src={challenge.icon_url} 
                              alt={challenge.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`absolute inset-0 flex items-center justify-center ${challenge.icon_url ? 'hidden' : ''}`}>
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-red-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Flag className="h-10 w-10 text-red-400" />
                            </div>
                          </div>
                          
                          {/* Better Gradient Fade Effect - More subtle */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 via-50% to-transparent"></div>
                          
                          {/* Animated particles effect */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ 
                                  opacity: hoveredCard === challenge.id ? [0, 1, 0] : 0,
                                  scale: hoveredCard === challenge.id ? [0, 1, 0] : 0,
                                  x: hoveredCard === challenge.id ? [0, Math.random() * 100 - 50] : 0,
                                  y: hoveredCard === challenge.id ? [0, Math.random() * 100 - 50] : 0,
                                }}
                                transition={{ 
                                  duration: 2,
                                  delay: i * 0.2,
                                  repeat: Infinity,
                                  repeatDelay: 1
                                }}
                                className="absolute w-1 h-1 bg-red-400 rounded-full"
                                style={{
                                  left: `${20 + Math.random() * 60}%`,
                                  top: `${20 + Math.random() * 60}%`
                                }}
                              />
                            ))}
                          </div>
                          
                          {/* Top Badges with improved animations */}
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border backdrop-blur-md ${getDifficultyColor(challenge.difficulty)}`}
                            >
                              {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                            </motion.div>
                            <motion.div 
                              whileHover={{ scale: 1.05 }}
                              animate={{ 
                                boxShadow: [
                                  "0 0 0 0 rgba(239, 68, 68, 0.7)",
                                  "0 0 0 10px rgba(239, 68, 68, 0)",
                                  "0 0 0 0 rgba(239, 68, 68, 0)"
                                ]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500/90 text-white border border-red-400/50 backdrop-blur-md shadow-lg"
                            >
                              NEW
                            </motion.div>
                          </div>

                          {/* Challenge Title on Image with better effects */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <motion.h3 
                              layout
                              className="text-xl font-bold text-white mb-3 leading-tight drop-shadow-xl group-hover:text-red-200 transition-colors duration-300"
                            >
                              {challenge.title}
                            </motion.h3>
                            
                            {/* Enhanced Stats Overlay */}
                            <div className="flex items-center gap-2 text-white text-sm">
                              <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-1 bg-black/70 rounded-lg px-3 py-1.5 backdrop-blur-md border border-white/10 hover:bg-black/80 transition-colors"
                              >
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{challenge.estimated_time || 30}m</span>
                              </motion.div>
                              <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-1 bg-black/70 rounded-lg px-3 py-1.5 backdrop-blur-md border border-white/10 hover:bg-black/80 transition-colors"
                              >
                                <Trophy className="h-4 w-4 text-yellow-400" />
                                <span className="font-medium">{challenge.points}</span>
                              </motion.div>
                              <motion.div 
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-1 bg-black/70 rounded-lg px-3 py-1.5 backdrop-blur-md border border-white/10 hover:bg-black/80 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="font-medium">{challenge.solves || 0}</span>
                              </motion.div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Content Section - Reduced padding */}
                        <div className="p-3 bg-slate-900/80 group-hover:bg-slate-800/80 transition-colors duration-300">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-gray-400 text-sm line-clamp-1 leading-relaxed flex-1 group-hover:text-gray-300 transition-colors">
                              {challenge.short_description || challenge.description}
                            </p>
                            <motion.div
                              animate={{ x: hoveredCard === challenge.id ? 5 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-400 transition-colors flex-shrink-0 ml-2" />
                            </motion.div>
                          </div>

                          <div className="flex items-center justify-between">
                            <motion.span 
                              whileHover={{ scale: 1.05 }}
                              className="text-xs text-gray-500 bg-slate-800/60 px-2 py-1 rounded-lg uppercase tracking-wider font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              {challenge.challenge_type}
                            </motion.span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* List View */
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {challenge.icon_url ? (
                              <img 
                                src={challenge.icon_url} 
                                alt={challenge.title}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-red-500/30 flex items-center justify-center ${!challenge.icon_url ? '' : 'hidden'}`}>
                              <Flag className="h-6 w-6 text-red-400" />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                                {challenge.title}
                              </h3>
                              <div className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(challenge.difficulty)}`}>
                                {challenge.difficulty.toUpperCase()}
                              </div>
                            </div>
                            
                            <p className="text-gray-400 text-sm line-clamp-1 mb-2">
                              {challenge.short_description || challenge.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {challenge.estimated_time || 30}m
                              </div>
                              <div className="flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-yellow-400" />
                                {challenge.points} pts
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {challenge.solves || 0} solves
                              </div>
                              <span className="text-xs bg-slate-800/60 px-2 py-1 rounded">
                                {challenge.challenge_type}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredChallenges.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-12 w-12 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Attack Scenarios Found</h3>
            <p className="text-gray-400 mb-8">Adjust your filters to discover new attack vectors</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengesPage;