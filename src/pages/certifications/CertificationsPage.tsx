import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Award, Clock, Trophy, Users, Search,
  ChevronRight, Target, CheckCircle, 
  Shield, Zap, PlayCircle
} from 'lucide-react';
import { getSkillPaths } from '../../lib/api';
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
                <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-red-500/20 to-purple-600/20 p-6">
                  {filteredCertifications[0].cover_image ? (
                    <img 
                      src={filteredCertifications[0].cover_image} 
                      alt={filteredCertifications[0].title} 
                      className="w-full h-64 object-cover rounded-lg shadow-lg" 
                    />
                  ) : (
                    <div className="w-full h-64 bg-slate-800/50 rounded-lg flex items-center justify-center">
                      <Award className="h-24 w-24 text-red-400/50" />
                    </div>
                  )}
                </div>
                <div className="col-span-1 md:col-span-2 p-6 md:p-8 flex flex-col">
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(filteredCertifications[0].difficulty)}`}>
                      {filteredCertifications[0].difficulty.toUpperCase()}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 bg-slate-800 px-2 py-1 rounded">
                      {filteredCertifications[0].category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{filteredCertifications[0].title}</h3>
                  <p className="text-gray-300 mb-6">
                    {filteredCertifications[0].short_description || filteredCertifications[0].description}
                  </p>
                  
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
                  
                  {filteredCertifications[0].user_progress ? (
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm font-medium">Progress</span>
                        <span className="text-white text-sm">{Math.round(filteredCertifications[0].user_progress.progress_percentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(filteredCertifications[0].user_progress.progress_percentage)}`}
                          style={{ width: `${filteredCertifications[0].user_progress.progress_percentage}%` }}
                        ></div>
                      </div>
                      <button 
                        onClick={() => navigate(`/skill-paths/${filteredCertifications[0].id}`)}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
                      >
                        {filteredCertifications[0].user_progress.status === 'completed' ? (
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
                      onClick={() => navigate(`/skill-paths/${filteredCertifications[0].id}`)}
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
            {filteredCertifications.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className="h-full hover:border-red-500/50 hover:shadow-md hover:shadow-red-500/10 transition-all duration-300 group cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/skill-paths/${cert.id}`)}
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
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(cert.difficulty)}`}>
                        {cert.difficulty.toUpperCase()}
                      </span>
                    </div>
                    {cert.user_progress && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-sm font-medium">Progress</span>
                            <span className="text-white text-sm">{Math.round(cert.user_progress.progress_percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(cert.user_progress.progress_percentage)}`}
                              style={{ width: `${cert.user_progress.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
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

                    <div className="flex items-center justify-between">
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
                  </div>
                </Card>
              </motion.div>
            ))}
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
