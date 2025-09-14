import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, Trophy, Users, Star, Filter, Search,
  ChevronRight, Target, Award, Zap, TrendingUp, Play,
  CheckCircle, BarChart3, Layers
} from 'lucide-react';
import { getSkillPaths } from '../../lib/api';
import { SkillPath } from '../../lib/types';
import Card from '../../components/ui/Card';

const SkillPathsPage = () => {
  const navigate = useNavigate();
  const [skillPaths, setSkillPaths] = useState<SkillPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    loadSkillPaths();
  }, [selectedCategory, selectedDifficulty]);

  const loadSkillPaths = async () => {
    setLoading(true);
    const result = await getSkillPaths({
      published_only: true,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined
    });

    if (result.success) {
      setSkillPaths(result.data || []);
    }
    setLoading(false);
  };

  const filteredPaths = skillPaths.filter(path =>
    path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    path.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Skill Paths</h1>
                <p className="text-gray-400">Structured learning journeys to master cybersecurity</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search skill paths..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
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
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {filteredPaths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className="h-full hover:border-red-500/50 transition-all duration-300 group cursor-pointer"
                  onClick={() => navigate(`/skill-paths/${path.id}`)}
                >
                  {/* Cover Image */}
                  <div className="relative h-48 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-t-xl overflow-hidden">
                    {path.cover_image ? (
                      <img src={path.cover_image} alt={path.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Layers className="h-16 w-16 text-red-400/50" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(path.difficulty)}`}>
                        {path.difficulty.toUpperCase()}
                      </span>
                    </div>
                    {path.user_progress && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-sm font-medium">Progress</span>
                            <span className="text-white text-sm">{Math.round(path.user_progress.progress_percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(path.user_progress.progress_percentage)}`}
                              style={{ width: `${path.user_progress.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
                        {path.title}
                      </h3>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-red-400 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {path.short_description || path.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {path.estimated_duration}h
                      </div>
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-1" />
                        {path.total_points} pts
                      </div>
                      <div className="flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        {path.path_items?.length || 0} items
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 bg-slate-800 px-2 py-1 rounded">
                        {path.category}
                      </span>
                      {path.user_progress ? (
                        <div className="flex items-center text-sm">
                          {path.user_progress.status === 'completed' ? (
                            <span className="text-red-400 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Completed
                            </span>
                          ) : path.user_progress.status === 'in_progress' ? (
                            <span className="text-orange-400 flex items-center">
                              <Play className="h-4 w-4 mr-1" />
                              In Progress
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center">
                              <BookOpen className="h-4 w-4 mr-1" />
                              Enrolled
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-400">
                          <Users className="h-4 w-4 mr-1" />
                          {path.enrolled_count || 0} enrolled
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredPaths.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No skill paths found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillPathsPage;
