import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Flag, Trophy, Users, Clock, CheckCircle, 
  Sword, Shield, Terminal, Flame, Target, Lock, Filter,
  Star, TrendingUp, Calendar, Eye, Play, Award,
  Grid3X3, List, SortAsc, SortDesc, Zap, Globe,
  Code, Layers, BookOpen, ArrowRight, Timer,
  ChevronDown, X, RefreshCw
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
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAvailableChallenges();
  }, []);

  useEffect(() => {
    filterAndSortChallenges();
  }, [challenges, searchTerm, selectedDifficulty, selectedType, selectedStatus, sortBy]);

  const loadAvailableChallenges = async () => {
    setLoading(true);
    const result = await loadChallenges();
    if (result.success) {
      setChallenges(result.data || []);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableChallenges();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filterAndSortChallenges = () => {
    let filtered = challenges.filter(challenge => {
      const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
      const matchesType = selectedType === 'all' || challenge.challenge_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && challenge.completed) ||
                           (selectedStatus === 'incomplete' && !challenge.completed);
      
      return matchesSearch && matchesDifficulty && matchesType && matchesStatus;
    });

    // Sort challenges
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'points-high':
          return b.points - a.points;
        case 'points-low':
          return a.points - b.points;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3, expert: 4 };
          return difficultyOrder[a.difficulty as keyof typeof difficultyOrder] - 
                 difficultyOrder[b.difficulty as keyof typeof difficultyOrder];
        case 'popular':
          return (b.solves || 0) - (a.solves || 0);
        default:
          return 0;
      }
    });

    setFilteredChallenges(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDifficulty('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSortBy('newest');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedDifficulty !== 'all') count++;
    if (selectedType !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  };

  const renderChallengeCard = (challenge: Challenge) => {
    const Icon = CHALLENGE_ICONS[challenge.challenge_type as keyof typeof CHALLENGE_ICONS] || Target;
    const iconColor = CHALLENGE_COLORS[challenge.challenge_type as keyof typeof CHALLENGE_COLORS];
    const difficultyConfig = DIFFICULTY_CONFIG[challenge.difficulty as keyof typeof DIFFICULTY_CONFIG];

    if (viewMode === 'list') {
      return (
        <Card
          key={challenge.id}
          hover
          className="p-6 border border-background-light hover:border-primary/50 transition-all duration-300 cursor-pointer"
          onClick={() => navigate(`/challenges/${challenge.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 flex-1">
              <div className="flex-shrink-0">
                {challenge.icon_url ? (
                  <img 
                    src={challenge.icon_url} 
                    alt={challenge.title}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-16 h-16 rounded-lg bg-background-light flex items-center justify-center ${!challenge.icon_url ? '' : 'hidden'}`}>
                  <Icon className={`h-8 w-8 ${iconColor}`} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white truncate">{challenge.title}</h3>
                  {challenge.completed && (
                    <CheckCircle className="h-5 w-5 text-success-light flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{challenge.description}</p>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyConfig.bg} ${difficultyConfig.color} ${difficultyConfig.border}`}>
                    {challenge.difficulty.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {challenge.challenge_type.toUpperCase()}
                  </span>
                  <div className="flex items-center text-sm text-gray-400">
                    <Trophy className="h-4 w-4 mr-1" />
                    {challenge.points} pts
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Users className="h-4 w-4 mr-1" />
                    {challenge.solves || 0} solves
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="btn-primary flex items-center">
                <Play className="h-4 w-4 mr-2" />
                {challenge.completed ? 'Review' : 'Start'}
              </button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        key={challenge.id}
        hover
        className="group relative overflow-hidden border border-background-light hover:border-primary/50 transition-all duration-300 cursor-pointer"
        onClick={() => navigate(`/challenges/${challenge.id}`)}
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
          <Icon className="w-32 h-32 text-primary" />
        </div>

        {/* Challenge Image/Icon */}
        <div className="relative h-48 bg-gradient-to-br from-background-light to-background-default overflow-hidden">
          {challenge.icon_url ? (
            <img 
              src={challenge.icon_url} 
              alt={challenge.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${challenge.icon_url ? 'hidden' : ''}`}>
            <Icon className={`h-16 w-16 ${iconColor}`} />
          </div>
          
          {/* Status Badge */}
          {challenge.completed && (
            <div className="absolute top-4 right-4 bg-success-dark/90 text-success-light px-3 py-1 rounded-full text-xs font-medium flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </div>
          )}

          {/* Difficulty Badge */}
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium border ${difficultyConfig.bg} ${difficultyConfig.color} ${difficultyConfig.border} backdrop-blur-sm`}>
            {challenge.difficulty.toUpperCase()}
          </div>
        </div>

        <div className="p-6">
          {/* Challenge Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                {challenge.challenge_type.toUpperCase()}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
              {challenge.title}
            </h3>
            
            <p className="text-gray-400 text-sm line-clamp-3 mb-4">
              {challenge.description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center text-primary">
                <Trophy className="h-4 w-4 mr-1" />
                <span className="font-medium">{challenge.points} pts</span>
              </div>
              <div className="flex items-center text-accent-blue">
                <Users className="h-4 w-4 mr-1" />
                <span>{challenge.solves || 0} solves</span>
              </div>
            </div>
            <div className="flex items-center text-gray-400">
              <Clock className="h-4 w-4 mr-1" />
              <span>~45 min</span>
            </div>
          </div>

          {/* Action Button */}
          <button className="btn-primary w-full group-hover:bg-primary-dark transition-colors">
            <Play className="h-4 w-4 mr-2" />
            {challenge.completed ? 'Review Challenge' : 'Start Challenge'}
          </button>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-full bg-primary/10">
            <Sword className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Cybersecurity Challenges</h1>
            <p className="text-gray-400 text-lg">Master offensive security through hands-on challenges</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border border-primary/30 bg-primary/5">
            <div className="flex items-center">
              <Flag className="h-6 w-6 text-primary mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">{challenges.length}</div>
                <div className="text-sm text-gray-400">Total Challenges</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border border-success-light/30 bg-success-dark/5">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-success-light mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {challenges.filter(c => c.completed).length}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-accent-blue/30 bg-accent-blue/5">
            <div className="flex items-center">
              <Trophy className="h-6 w-6 text-accent-blue mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {challenges.reduce((sum, c) => sum + (c.completed ? c.points : 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-warning-light/30 bg-warning-dark/5">
            <div className="flex items-center">
              <Star className="h-6 w-6 text-warning-light mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">#42</div>
                <div className="text-sm text-gray-400">Global Rank</div>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search challenges by title, description, or technique..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background-light border border-background-default rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-outline flex items-center ${getActiveFiltersCount() > 0 ? 'border-primary text-primary' : ''}`}
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                {getActiveFiltersCount() > 0 && (
                  <span className="ml-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-outline flex items-center"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              {/* View Mode Toggle */}
              <div className="flex border border-background-default rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 pt-6 border-t border-background-light"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Difficulty</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="all">All Difficulties</option>
                      <option value="easy">Beginner</option>
                      <option value="medium">Intermediate</option>
                      <option value="hard">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="all">All Categories</option>
                      <option value="web">Web Security</option>
                      <option value="network">Network Security</option>
                      <option value="crypto">Cryptography</option>
                      <option value="misc">Miscellaneous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="all">All Challenges</option>
                      <option value="completed">Completed</option>
                      <option value="incomplete">Not Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="form-input w-full"
                    >
                      {SORT_OPTIONS.map(option => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-400">
                    Showing {filteredChallenges.length} of {challenges.length} challenges
                  </div>
                  {getActiveFiltersCount() > 0 && (
                    <button
                      onClick={clearFilters}
                      className="btn-outline flex items-center text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Challenges Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-pulse text-primary text-xl">Loading challenges...</div>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <Card className="p-16 text-center">
            <Target className="h-20 w-20 text-gray-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">No Challenges Found</h3>
            <p className="text-gray-400 mb-6">
              {challenges.length === 0 
                ? "No challenges are available yet. Check back later!"
                : "No challenges match your current filters. Try adjusting your search criteria."
              }
            </p>
            {getActiveFiltersCount() > 0 && (
              <button onClick={clearFilters} className="btn-primary">
                Clear All Filters
              </button>
            )}
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }>
            {filteredChallenges.map((challenge) => renderChallengeCard(challenge))}
          </div>
        )}
      </motion.div>

      {/* Featured Categories */}
      {!loading && challenges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-white mb-8">Explore by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(CHALLENGE_ICONS).map(([type, Icon]) => {
              const count = challenges.filter(c => c.challenge_type === type).length;
              const completed = challenges.filter(c => c.challenge_type === type && c.completed).length;
              const color = CHALLENGE_COLORS[type as keyof typeof CHALLENGE_COLORS];
              
              return (
                <Card
                  key={type}
                  hover
                  className="p-6 cursor-pointer border border-background-light hover:border-primary/50"
                  onClick={() => {
                    setSelectedType(type);
                    setShowFilters(true);
                  }}
                >
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full bg-background-light flex items-center justify-center mb-4 ${color}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {type.charAt(0).toUpperCase() + type.slice(1)} Security
                    </h3>
                    <div className="text-sm text-gray-400 mb-4">
                      {count} challenges • {completed} completed
                    </div>
                    <div className="flex items-center justify-center text-primary">
                      <span className="text-sm font-medium">Explore</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ChallengesPage;