import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, MessageSquare, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Challenge } from '../../lib/types';
import Card from '../../components/ui/Card';

const ManageChallengesPage = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;

    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadChallenges();
    } catch (error) {
      console.error('Error deleting challenge:', error);
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || challenge.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-dark/20 text-success-light';
      case 'rejected':
        return 'bg-error-dark/20 text-error-light';
      default:
        return 'bg-warning-dark/20 text-warning-light';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Manage Challenges</h1>
            <p className="text-gray-400">View and manage your submitted challenges</p>
          </div>
          <button
            onClick={() => navigate('/creator/create')}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Challenge
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background-light border border-background-default rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input md:w-48"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-6"
      >
        {loading ? (
          <Card className="p-6">
            <div className="animate-pulse text-primary">Loading challenges...</div>
          </Card>
        ) : filteredChallenges.length === 0 ? (
          <Card className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No challenges found</p>
            <button
              onClick={() => navigate('/creator/create')}
              className="btn-primary mt-4"
            >
              Create Your First Challenge
            </button>
          </Card>
        ) : (
          filteredChallenges.map((challenge) => (
            <Card key={challenge.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold text-white mb-2">{challenge.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(challenge.status)}`}>
                      {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 mb-4">{challenge.description}</p>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      {challenge.challenge_type}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-blue/20 text-accent-blue">
                      {challenge.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-success-dark/20 text-success-light">
                      {challenge.points} points
                    </span>
                    {challenge.tasks && challenge.tasks.length > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning-dark/20 text-warning-light">
                        {challenge.tasks.length} task{challenge.tasks.length !== 1 ? 's' : ''} • {challenge.tasks.reduce((sum, task) => sum + (task.questions?.length || 0), 0)} question{challenge.tasks.reduce((sum, task) => sum + (task.questions?.length || 0), 0) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-400">
                    Created: {new Date(challenge.created_at).toLocaleDateString()}
                  </div>

                  {challenge.feedback && (
                    <div className="mt-4 p-4 bg-background-light rounded-lg border border-background-default">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">Admin Feedback</span>
                      </div>
                      <p className="text-gray-300">{challenge.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={() => navigate(`/creator/edit/${challenge.id}`)}
                    disabled={challenge.status === 'approved'}
                    className={`btn-outline flex items-center ${
                      challenge.status === 'approved' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(challenge.id)}
                    disabled={challenge.status === 'approved'}
                    className={`btn-outline flex items-center text-error-light border-error-light/30 hover:bg-error-light/10 ${
                      challenge.status === 'approved' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default ManageChallengesPage;