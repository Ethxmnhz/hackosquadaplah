import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, FlaskRound as Flask, Clock, Users, Terminal, Plus, Tag,
  Star, Trophy, Play, Eye, Download, ExternalLink, Grid3X3, List,
  SortAsc, SortDesc, RefreshCw, TrendingUp, Calendar, Award,
  Shield, Globe, Server, Code, Layers, Target, Zap, BookOpen,
  ChevronDown, X, Timer, Activity, CheckCircle, ArrowRight
} from 'lucide-react';
import { getLabs } from '../../lib/api';
import { Lab } from '../../lib/types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';

const CATEGORY_ICONS = {
  web: Globe,
  network: Shield,
  'active-directory': Server,
  'privilege-escalation': Target,
  cloud: Layers,
  mobile: Terminal
};

const CATEGORY_COLORS = {
  web: 'text-accent-blue',
  network: 'text-accent-green',
  'active-directory': 'text-warning-light',
  'privilege-escalation': 'text-primary',
  cloud: 'text-purple-400',
  mobile: 'text-accent-yellow'
};

const DIFFICULTY_CONFIG = {
  easy: { color: 'text-success-light', bg: 'bg-success-dark/20', border: 'border-success-light/30' },
  medium: { color: 'text-warning-light', bg: 'bg-warning-dark/20', border: 'border-warning-light/30' },
  hard: { color: 'text-error-light', bg: 'bg-error-dark/20', border: 'border-error-light/30' },
  insane: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-400/30' }
};

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First', icon: Calendar },
  { id: 'oldest', label: 'Oldest First', icon: Calendar },
  { id: 'points-high', label: 'Highest Points', icon: Trophy },
  { id: 'points-low', label: 'Lowest Points', icon: Trophy },
  { id: 'difficulty', label: 'Difficulty', icon: Star },
  { id: 'popular', label: 'Most Popular', icon: TrendingUp },
  { id: 'time-short', label: 'Shortest Time', icon: Clock },
  { id: 'time-long', label: 'Longest Time', icon: Clock }
];

const LabsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [filteredLabs, setFilteredLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAvailableLabs();
  }, []);

  useEffect(() => {
    filterAndSortLabs();
  }, [labs, searchTerm, selectedDifficulty, selectedCategory, selectedStatus, sortBy]);

  const loadAvailableLabs = async () => {
    setLoading(true);
    const result = await getLabs();
    if (result.success) {
      setLabs(result.data || []);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableLabs();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filterAndSortLabs = () => {
    let filtered = labs.filter(lab => {
      const matchesSearch = lab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lab.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = selectedDifficulty === 'all' || lab.difficulty === selectedDifficulty;
      const matchesCategory = selectedCategory === 'all' || lab.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || 
                           (selectedStatus === 'completed' && lab.completed) ||
                           (selectedStatus === 'incomplete' && !lab.completed);
      
      return matchesSearch && matchesDifficulty && matchesCategory && matchesStatus;
    });

    // Sort labs
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
          const difficultyOrder = { easy: 1, medium: 2, hard: 3, insane: 4 };
          return difficultyOrder[a.difficulty as keyof typeof difficultyOrder] - 
                 difficultyOrder[b.difficulty as keyof typeof difficultyOrder];
        case 'time-short':
          return a.estimated_time - b.estimated_time;
        case 'time-long':
          return b.estimated_time - a.estimated_time;
        case 'popular':
          return 0; // Would need popularity data
        default:
          return 0;
      }
    });

    setFilteredLabs(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDifficulty('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSortBy('newest');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedDifficulty !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  };

  const getDifficultyColor = (difficulty: string) => {
    return DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.easy;
  };

  const renderLabCard = (lab: Lab) => {
    const Icon = CATEGORY_ICONS[lab.category as keyof typeof CATEGORY_ICONS] || Flask;
    const iconColor = CATEGORY_COLORS[lab.category as keyof typeof CATEGORY_COLORS] || 'text-primary';
    const difficultyConfig = getDifficultyColor(lab.difficulty);

    if (viewMode === 'list') {
      return (
        <Card
          key={lab.id}
          hover
          className="p-6 border border-background-light hover:border-primary/50 transition-all duration-300 cursor-pointer"
          onClick={() => navigate(`/labs/${lab.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 flex-1">
              <div className="flex-shrink-0">
                {lab.thumbnail_url ? (
                  <img 
                    src={lab.thumbnail_url} 
                    alt={lab.title}
                    className="w-20 h-20 rounded-lg object-cover border border-background-light"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 rounded-lg bg-background-light flex items-center justify-center ${!lab.thumbnail_url ? '' : 'hidden'}`}>
                  <Icon className={`h-10 w-10 ${iconColor}`} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white truncate">{lab.title}</h3>
                  {lab.completed && (
                    <CheckCircle className="h-5 w-5 text-success-light flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{lab.description}</p>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyConfig.bg} ${difficultyConfig.color} ${difficultyConfig.border}`}>
                    {lab.difficulty.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                    {lab.category.replace('-', ' ').toUpperCase()}
                  </span>
                  <div className="flex items-center text-sm text-gray-400">
                    <Trophy className="h-4 w-4 mr-1" />
                    {lab.points} pts
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Clock className="h-4 w-4 mr-1" />
                    {lab.estimated_time} min
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Environment</div>
                <div className="text-white font-medium">
                  {lab.docker_command ? 'Docker' : lab.vm_download_url ? 'VM' : 'External'}
                </div>
              </div>
              <button className="btn-primary flex items-center">
                <Play className="h-4 w-4 mr-2" />
                {lab.completed ? 'Review' : 'Start Lab'}
              </button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        key={lab.id}
        hover
        className="group relative overflow-hidden border border-background-light hover:border-primary/50 transition-all duration-300 cursor-pointer"
        onClick={() => navigate(`/labs/${lab.id}`)}
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
          <Icon className="w-32 h-32 text-primary" />
        </div>

        {/* Lab Image/Icon */}
        <div className="relative h-48 bg-gradient-to-br from-background-light to-background-default overflow-hidden">
          {lab.thumbnail_url ? (
            <img 
              src={lab.thumbnail_url} 
              alt={lab.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 flex items-center justify-center ${lab.thumbnail_url ? 'hidden' : ''}`}>
            <Icon className={`h-16 w-16 ${iconColor}`} />
          </div>
          
          {/* Status Badge */}
          {lab.completed && (
            <div className="absolute top-4 right-4 bg-success-dark/90 text-success-light px-3 py-1 rounded-full text-xs font-medium flex items-center backdrop-blur-sm">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </div>
          )}

          {/* Difficulty Badge */}
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium border ${difficultyConfig.bg} ${difficultyConfig.color} ${difficultyConfig.border} backdrop-blur-sm`}>
            {lab.difficulty.toUpperCase()}
          </div>

          {/* Environment Type */}
          <div className="absolute bottom-4 left-4 px-2 py-1 rounded-md text-xs font-medium bg-background-dark/80 text-white backdrop-blur-sm">
            {lab.docker_command ? (
              <div className="flex items-center">
                <Terminal className="h-3 w-3 mr-1" />
                Docker
              </div>
            ) : lab.vm_download_url ? (
              <div className="flex items-center">
                <Download className="h-3 w-3 mr-1" />
                VM
              </div>
            ) : (
              <div className="flex items-center">
                <ExternalLink className="h-3 w-3 mr-1" />
                External
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Lab Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                {lab.category.replace('-', ' ').toUpperCase()}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {lab.title}
            </h3>
            
            <p className="text-gray-400 text-sm line-clamp-3 mb-4">
              {lab.description}
            </p>
          </div>

          {/* Tags */}
          {lab.tags && lab.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {lab.tags.slice(0, 3).map(({ tag }) => (
                <span key={tag.id} className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300 flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag.name}
                </span>
              ))}
              {lab.tags.length > 3 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                  +{lab.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center text-primary">
                <Trophy className="h-4 w-4 mr-1" />
                <span className="font-medium">{lab.points} pts</span>
              </div>
              <div className="flex items-center text-accent-blue">
                <Clock className="h-4 w-4 mr-1" />
                <span>{lab.estimated_time} min</span>
              </div>
            </div>
            <div className="flex items-center text-gray-400">
              <Users className="h-4 w-4 mr-1" />
              <span>12 active</span>
            </div>
          </div>

          {/* Progress Bar (if completed) */}
          {lab.completed && lab.points_earned && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Progress</span>
                <span className="text-success-light">{lab.points_earned}/{lab.points} pts</span>
              </div>
              <div className="w-full bg-background-light rounded-full h-2">
                <div 
                  className="bg-success-light h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(lab.points_earned / lab.points) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button className="btn-primary w-full group-hover:bg-primary-dark transition-colors">
            <Play className="h-4 w-4 mr-2" />
            {lab.completed ? 'Review Lab' : 'Start Lab'}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-accent-blue/10">
                <Flask className="h-8 w-8 text-accent-blue" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Virtual Labs</h1>
                <p className="text-gray-400 text-lg">Practice in realistic environments with our virtual labs</p>
              </div>
            </div>
          </div>
          {user && (
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-outline flex items-center"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <a href="/admin/labs" className="btn-primary flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Manage Labs
              </a>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 border border-accent-blue/30 bg-accent-blue/5">
            <div className="flex items-center">
              <Flask className="h-6 w-6 text-accent-blue mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">{labs.length}</div>
                <div className="text-sm text-gray-400">Available Labs</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border border-success-light/30 bg-success-dark/5">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-success-light mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {labs.filter(l => l.completed).length}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-primary/30 bg-primary/5">
            <div className="flex items-center">
              <Trophy className="h-6 w-6 text-primary mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {labs.reduce((sum, l) => sum + (l.points_earned || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Points Earned</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-warning-light/30 bg-warning-dark/5">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-warning-light mr-3" />
              <div>
                <div className="text-2xl font-bold text-white">105</div>
                <div className="text-sm text-gray-400">Active Instances</div>
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
                placeholder="Search labs by title, description, or technology..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background-light border border-background-default rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-outline flex items-center ${getActiveFiltersCount() > 0 ? 'border-accent-blue text-accent-blue' : ''}`}
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                {getActiveFiltersCount() > 0 && (
                  <span className="ml-2 bg-accent-blue text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex border border-background-default rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'}`}
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
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="insane">Insane</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="all">All Categories</option>
                      <option value="web">Web Security</option>
                      <option value="network">Network Security</option>
                      <option value="active-directory">Active Directory</option>
                      <option value="privilege-escalation">Privilege Escalation</option>
                      <option value="cloud">Cloud Security</option>
                      <option value="mobile">Mobile Security</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="all">All Labs</option>
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
                    Showing {filteredLabs.length} of {labs.length} labs
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

      {/* Labs Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-pulse text-accent-blue text-xl">Loading labs...</div>
          </div>
        ) : filteredLabs.length === 0 ? (
          <Card className="p-16 text-center">
            <Flask className="h-20 w-20 text-gray-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">No Labs Found</h3>
            <p className="text-gray-400 mb-6">
              {labs.length === 0 
                ? "No labs are available yet. Check back later!"
                : "No labs match your current filters. Try adjusting your search criteria."
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
            {filteredLabs.map((lab) => renderLabCard(lab))}
          </div>
        )}
      </motion.div>

      {/* Featured Categories */}
      {!loading && labs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-white mb-8">Explore by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(CATEGORY_ICONS).map(([category, Icon]) => {
              const count = labs.filter(l => l.category === category).length;
              const completed = labs.filter(l => l.category === category && l.completed).length;
              const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
              
              if (count === 0) return null;
              
              return (
                <Card
                  key={category}
                  hover
                  className="p-6 cursor-pointer border border-background-light hover:border-accent-blue/50"
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowFilters(true);
                  }}
                >
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full bg-background-light flex items-center justify-center mb-4 ${color}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h3>
                    <div className="text-sm text-gray-400 mb-4">
                      {count} labs • {completed} completed
                    </div>
                    <div className="flex items-center justify-center text-accent-blue">
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

export default LabsPage;