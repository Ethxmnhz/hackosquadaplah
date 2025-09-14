import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, BookOpen, Edit, Trash2, Eye, Users, Trophy,
  Search, Filter, MoreVertical, Clock, Target
} from 'lucide-react';
import { getSkillPaths, deleteSkillPath } from '../../lib/api';
import { SkillPath } from '../../lib/types';
import Card from '../../components/ui/Card';

const SkillPathsManagement = () => {
  const navigate = useNavigate();
  const [skillPaths, setSkillPaths] = useState<SkillPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadSkillPaths();
  }, []);

  const loadSkillPaths = async () => {
    setLoading(true);
    const result = await getSkillPaths({ published_only: false });
    if (result.success) {
      setSkillPaths(result.data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill path?')) return;
    
    const result = await deleteSkillPath(id);
    if (result.success) {
      setSkillPaths(prev => prev.filter(path => path.id !== id));
    }
  };

  const filteredPaths = skillPaths.filter(path => {
    const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(skillPaths.map(path => path.category)))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Skill Paths Management</h1>
            <p className="text-gray-400">Create and manage learning paths</p>
          </div>
          <button
            onClick={() => navigate('/admin/skill-paths/create')}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Skill Path
          </button>
        </div>

        {/* Filters */}
        <Card className="p-6 bg-[#121212]/80 border-slate-800/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search skill paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
            >
              {categories.map(category => (
                <option key={category} value={category} className="bg-[#121212]">
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Skill Paths List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="p-6 bg-[#121212]/60 border-slate-800/50">
                  <div className="h-4 bg-slate-700/50 rounded mb-4"></div>
                  <div className="h-20 bg-slate-700/50 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-slate-700/50 rounded flex-1"></div>
                    <div className="h-8 bg-slate-700/50 rounded flex-1"></div>
                  </div>
                </Card>
              </div>
            ))
          ) : (
            filteredPaths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="p-6 bg-[#121212]/60 border-slate-800/50 hover:border-red-500/50 backdrop-blur-sm transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white line-clamp-1">{path.title}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          path.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {path.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <button className="p-1 text-gray-400 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {path.short_description || path.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {path.estimated_duration}h
                    </div>
                    <div className="flex items-center">
                      <Trophy className="h-3 w-3 mr-1" />
                      {path.total_points}pts
                    </div>
                    <div className="flex items-center">
                      <Target className="h-3 w-3 mr-1" />
                      {path.path_items?.length || 0} items
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {path.enrolled_count || 0}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/skill-paths/${path.id}`)}
                      className="flex-1 bg-[#121212]/80 hover:bg-slate-700/50 text-gray-300 py-2 px-3 rounded-lg transition-colors flex items-center justify-center text-sm border border-slate-700/30"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/skill-paths/edit/${path.id}`)}
                      className="flex-1 bg-blue-600/80 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(path.id)}
                      className="bg-red-600/80 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {!loading && filteredPaths.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No skill paths found</h3>
            <p className="text-gray-400">Create your first skill path to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillPathsManagement;
