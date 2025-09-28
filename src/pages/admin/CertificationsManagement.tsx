import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Award, Edit, Trash2, Eye, Users, Trophy, Search, Star, Clock, Target, Layers
} from 'lucide-react';
import { getSkillPaths, deleteSkillPath } from '../../lib/api';
import { useCertificatePurchase } from '../../hooks/useCertificatePurchase';
import { Certification } from '../../lib/types';
import Card from '../../components/ui/Card';

// NOTE: Using existing skill_paths endpoints; treated as Certifications
const CertificationsManagement = () => {
  const navigate = useNavigate();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExamType, setFilterExamType] = useState<'all' | string>('all');
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  useEffect(() => { loadCertifications(); }, []);

  const loadCertifications = async () => {
    setLoading(true);
    const result = await getSkillPaths({ published_only: false });
    if (result.success) {
      setCertifications((result.data || []) as Certification[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certification?')) return;
    const result = await deleteSkillPath(id);
    if (result.success) {
      setCertifications(prev => prev.filter(c => c.id !== id));
    }
  };

  const filtered = certifications.filter(cert => {
    const matchesSearch = (cert.title + ' ' + (cert.code || '') + ' ' + (cert.short_description || '')).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = filterExamType === 'all' || cert.exam_type === filterExamType;
    const matchesFeatured = !onlyFeatured || cert.is_featured;
    return matchesSearch && matchesExam && matchesFeatured;
  });

  const examTypes = Array.from(new Set(certifications.map(c => c.exam_type).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#121212] to-red-950/20">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Certifications</h1>
            <p className="text-gray-400">Manage professional certification tracks</p>
          </div>
          <button
            onClick={() => navigate('/admin/certifications/create')}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Certification
          </button>
        </div>

        {/* Filters */}
        <Card className="p-6 bg-[#121212]/80 border-slate-800/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search certifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
              />
            </div>
            <select
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              className="px-4 py-2 bg-[#121212]/60 border border-slate-700/50 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500/20 md:w-56"
            >
              <option value="all">All Exam Types</option>
              {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(e) => setOnlyFeatured(e.target.checked)}
                className="accent-red-600"
              />
              Featured Only
            </label>
          </div>
        </Card>

        {/* Certifications List */}
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
            filtered.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <Card className="p-6 bg-[#121212]/60 border-slate-800/50 hover:border-red-500/50 backdrop-blur-sm transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center overflow-hidden">
                        {cert.icon_url ? (
                          <img src={cert.icon_url} alt={cert.title} className="w-full h-full object-cover" />
                        ) : (
                          <Award className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white line-clamp-1 flex items-center gap-2">
                          {cert.title}
                          {cert.is_featured && <Star className="h-4 w-4 text-yellow-400" />}
                        </h3>
                        <CertificatePricing certId={cert.id} />
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {cert.code && <span className="px-2 py-0.5 rounded bg-slate-700/50 text-xs text-gray-300 font-mono">{cert.code}</span>}
                          <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                            cert.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                            cert.difficulty === 'intermediate' ? 'bg-blue-500/20 text-blue-400' :
                            cert.difficulty === 'advanced' ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'
                          }`}>{cert.difficulty}</span>
                          {cert.exam_type && <span className="px-2 py-0.5 rounded text-xs bg-fuchsia-500/20 text-fuchsia-300">{cert.exam_type}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {cert.short_description || cert.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {cert.estimated_duration}h
                    </div>
                    <div className="flex items-center">
                      <Trophy className="h-3 w-3 mr-1" />
                      {cert.total_points}pts
                    </div>
                    <div className="flex items-center">
                      <Target className="h-3 w-3 mr-1" />
                      {(cert.path_items?.length) || 0} items
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {cert.enrolled_count || 0}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/skill-paths/${cert.id}`)}
                      className="flex-1 bg-[#121212]/80 hover:bg-slate-700/50 text-gray-300 py-2 px-3 rounded-lg transition-colors flex items-center justify-center text-sm border border-slate-700/30"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/certifications/edit/${cert.id}`)}
                      className="flex-1 bg-blue-600/80 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center text-sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
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

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Layers className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No certifications found</h3>
            <p className="text-gray-400">Create your first certification to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificationsManagement;

// Inline component for price & purchase (admin view demonstration)
const CertificatePricing: React.FC<{ certId: string }> = ({ certId }) => {
  const purchase = useCertificatePurchase(certId);
  if (purchase.loading) return <div className="text-[10px] text-gray-500 mt-1">Checking access…</div>;
  if (purchase.unlocked) return <div className="text-[10px] text-green-400 mt-1">Unlocked</div>;
  if (!purchase.price && !purchase.plan) return <div className="text-[10px] text-gray-400 mt-1">Free</div>;
  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {purchase.plan && <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">In {purchase.plan} plan</span>}
      {purchase.price && (
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">₹{purchase.price}</span>
      )}
      {purchase.price && !purchase.unlocked && (
        <button
          onClick={() => purchase.buy()}
          disabled={purchase.purchasing}
          className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/70 hover:bg-emerald-600 text-white disabled:opacity-50"
        >
          {purchase.purchasing ? 'Processing…' : 'Buy'}
        </button>
      )}
      {purchase.error && <span className="text-[10px] text-red-400">{purchase.error}</span>}
    </div>
  );
};
