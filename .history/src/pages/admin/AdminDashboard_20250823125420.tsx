// Minimal type for lab sessions
interface LabSession {
  id: string;
  lab_id: string;
  red_user_id: string;
  blue_user_id: string;
  status: string;
  created_at: string;
}
  const [liveSessions, setLiveSessions] = useState<LabSession[]>([]);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  // ...existing code...

  // Load live sessions
  const loadLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_sessions')
        .select('*')
        .in('status', ['active', 'setup'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLiveSessions(data || []);
    } catch (error) {
      console.error('Error loading live sessions:', error);
      setError('Failed to load live sessions');
    }
  };
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, CheckCircle, XCircle, MessageSquare, FlaskRound as Flask, 
  Flag, Monitor, Server, Users, Activity, BarChart3, Settings,
  Edit2, Trash2, Plus, Search, Filter, RefreshCw, Eye,
  AlertTriangle, Calendar, Clock, Trophy, Target, BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Challenge, Lab } from '../../lib/types';
import Card from '../../components/ui/Card';

interface AdminStats {
  total_challenges: number;
  pending_challenges: number;
  approved_challenges: number;
  rejected_challenges: number;
  total_labs: number;
  published_labs: number;
  draft_labs: number;
  total_users: number;
  active_operations: number;
}

const AdminDashboard = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAdminData();
    loadLiveSessions();
  }, []);
  // Delete a live session
  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this live session? This will disconnect all users.')) return;
    setDeletingSession(sessionId);
    setError('');
    try {
      // Delete related chat messages first (if any)
      await supabase.from('lab_session_chat').delete().eq('session_id', sessionId);
      // Delete the session itself
      const { error } = await supabase.from('lab_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      setSuccess('Session deleted successfully!');
      await loadLiveSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session');
    } finally {
      setDeletingSession(null);
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadChallenges(),
        loadLabs(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

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
      setError('Failed to load challenges');
    }
  };

  const loadLabs = async () => {
    try {
      const { data, error } = await supabase
        .from('labs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLabs(data || []);
    } catch (error) {
      console.error('Error loading labs:', error);
      setError('Failed to load labs');
    }
  };

  const loadStats = async () => {
    try {
      // Get challenge stats
      const { data: challengeStats } = await supabase
        .from('challenges')
        .select('status');

      const { data: labStats } = await supabase
        .from('labs')
        .select('status');

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: operationsCount } = await supabase
        .from('active_operations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['setup', 'active', 'paused']);

      const challengeCounts = challengeStats?.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const labCounts = labStats?.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setStats({
        total_challenges: challengeStats?.length || 0,
        pending_challenges: challengeCounts.pending || 0,
        approved_challenges: challengeCounts.approved || 0,
        rejected_challenges: challengeCounts.rejected || 0,
        total_labs: labStats?.length || 0,
        published_labs: labCounts.published || 0,
        draft_labs: labCounts.draft || 0,
        total_users: userCount || 0,
        active_operations: operationsCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load statistics');
    }
  };

  const handleApprove = async (challenge: Challenge) => {
    try {
      setError('');
      const { error } = await supabase
        .from('challenges')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', challenge.id);

      if (error) throw error;
      
      setSuccess('Challenge approved successfully!');
      await loadAdminData();
    } catch (error) {
      console.error('Error approving challenge:', error);
      setError('Failed to approve challenge');
    }
  };

  const handleReject = async (challenge: Challenge) => {
    if (!feedback.trim()) {
      setError('Please provide feedback for rejection');
      return;
    }

    try {
      setError('');
      const { error } = await supabase
        .from('challenges')
        .update({
          status: 'rejected',
          feedback
        })
        .eq('id', challenge.id);

      if (error) throw error;
      
      setFeedback('');
      setSelectedChallenge(null);
      setSuccess('Challenge rejected with feedback');
      await loadAdminData();
    } catch (error) {
      console.error('Error rejecting challenge:', error);
      setError('Failed to reject challenge');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!window.confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      return;
    }

    setDeleting(challengeId);
    setError('');

    try {
      // First, delete related data to avoid foreign key constraints
      
      // Delete challenge questions
      const { error: questionsError } = await supabase
        .from('challenge_questions')
        .delete()
        .eq('challenge_id', challengeId);

      if (questionsError) {
        console.error('Error deleting challenge questions:', questionsError);
        // Continue anyway, as questions might not exist
      }

      // Delete challenge completions
      const { error: completionsError } = await supabase
        .from('challenge_completions')
        .delete()
        .eq('challenge_id', challengeId);

      if (completionsError) {
        console.error('Error deleting challenge completions:', completionsError);
        // Continue anyway
      }

      // Delete user points related to this challenge
      const { error: pointsError } = await supabase
        .from('user_points')
        .delete()
        .eq('source_type', 'challenge')
        .eq('source_id', challengeId);

      if (pointsError) {
        console.error('Error deleting user points:', pointsError);
        // Continue anyway
      }

      // Finally, delete the challenge itself
      const { error: challengeError } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);

      if (challengeError) throw challengeError;

      setSuccess('Challenge deleted successfully!');
      await loadAdminData();
    } catch (error) {
      console.error('Error deleting challenge:', error);
      setError(`Failed to delete challenge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteLab = async (labId: string) => {
    if (!window.confirm('Are you sure you want to delete this lab? This action cannot be undone.')) {
      return;
    }

    setDeleting(labId);
    setError('');

    try {
      // First, delete related data to avoid foreign key constraints
      
      // Delete lab questions
      const { error: questionsError } = await supabase
        .from('lab_questions')
        .delete()
        .eq('lab_id', labId);

      if (questionsError) {
        console.error('Error deleting lab questions:', questionsError);
        // Continue anyway
      }

      // Delete lab completions
      const { error: completionsError } = await supabase
        .from('lab_completions')
        .delete()
        .eq('lab_id', labId);

      if (completionsError) {
        console.error('Error deleting lab completions:', completionsError);
        // Continue anyway
      }

      // Delete lab participants
      const { error: participantsError } = await supabase
        .from('lab_participants')
        .delete()
        .eq('lab_id', labId);

      if (participantsError) {
        console.error('Error deleting lab participants:', participantsError);
        // Continue anyway
      }

      // Delete lab tags
      const { error: tagsError } = await supabase
        .from('lab_tags')
        .delete()
        .eq('lab_id', labId);

      if (tagsError) {
        console.error('Error deleting lab tags:', tagsError);
        // Continue anyway
      }

      // Delete user points related to this lab
      const { error: pointsError } = await supabase
        .from('user_points')
        .delete()
        .eq('source_type', 'lab')
        .eq('source_id', labId);

      if (pointsError) {
        console.error('Error deleting user points:', pointsError);
        // Continue anyway
      }

      // Delete operation requests for this lab
      const { error: requestsError } = await supabase
        .from('operation_requests')
        .delete()
        .eq('lab_id', labId);

      if (requestsError) {
        console.error('Error deleting operation requests:', requestsError);
        // Continue anyway
      }

      // Delete active operations for this lab
      const { error: operationsError } = await supabase
        .from('active_operations')
        .delete()
        .eq('lab_id', labId);

      if (operationsError) {
        console.error('Error deleting active operations:', operationsError);
        // Continue anyway
      }

      // Finally, delete the lab itself
      const { error: labError } = await supabase
        .from('labs')
        .delete()
        .eq('id', labId);

      if (labError) throw labError;

      setSuccess('Lab deleted successfully!');
      await loadAdminData();
    } catch (error) {
      console.error('Error deleting lab:', error);
      setError(`Failed to delete lab: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || challenge.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-dark/20 text-success-light border-success-light/30';
      case 'rejected':
        return 'bg-error-dark/20 text-error-light border-error-light/30';
      case 'pending':
        return 'bg-warning-dark/20 text-warning-light border-warning-light/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 mt-2">Manage challenges, labs, and platform content</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-primary flex items-center"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </motion.div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 p-4 bg-error-dark/20 border border-error-light/30 rounded-lg text-error-light">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
            <button onClick={() => setError('')} className="ml-auto">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 p-4 bg-success-dark/20 border border-success-light/30 rounded-lg text-success-light">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="p-6 border border-primary/30 bg-primary/5">
            <div className="flex items-center">
              <Flag className="h-8 w-8 text-primary mr-4" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.total_challenges}</div>
                <div className="text-sm text-gray-400">Total Challenges</div>
                <div className="text-xs text-primary mt-1">{stats.pending_challenges} pending</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-accent-blue/30 bg-accent-blue/5">
            <div className="flex items-center">
              <Flask className="h-8 w-8 text-accent-blue mr-4" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.total_labs}</div>
                <div className="text-sm text-gray-400">Total Labs</div>
                <div className="text-xs text-accent-blue mt-1">{stats.published_labs} published</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-accent-green/30 bg-accent-green/5">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-accent-green mr-4" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.total_users}</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-warning-light/30 bg-warning-dark/5">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-warning-light mr-4" />
              <div>
                <div className="text-2xl font-bold text-white">{stats.active_operations}</div>
                <div className="text-sm text-gray-400">Active Operations</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <Card
          hover
          className="p-6 cursor-pointer border border-accent-blue/30 hover:border-accent-blue/50"
          onClick={() => window.location.href = '/admin/labs'}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-accent-blue/10 text-accent-blue">
              <Flask className="h-6 w-6" />
            </div>
            <h3 className="ml-3 text-lg font-bold text-white">Manage Labs</h3>
          </div>
          <p className="text-gray-400">Create, edit, and manage hands-on cybersecurity labs</p>
        </Card>

        <Card
          hover
          className="p-6 cursor-pointer border border-primary/30 hover:border-primary/50"
          onClick={() => window.location.href = '/creator/manage'}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Flag className="h-6 w-6" />
            </div>
            <h3 className="ml-3 text-lg font-bold text-white">Review Challenges</h3>
          </div>
          <p className="text-gray-400">Review and approve user-submitted challenges</p>
        </Card>

        <Card
          hover
          className="p-6 cursor-pointer border border-yellow-500/30 hover:border-yellow-500/50"
          onClick={() => window.location.href = '/admin/skill-paths'}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="ml-3 text-lg font-bold text-white">Skill Paths</h3>
          </div>
          <p className="text-gray-400">Create and manage structured learning paths</p>
        </Card>

        <Card
          hover
          className="p-6 cursor-pointer border border-success-light/30 hover:border-success-light/50"
          onClick={() => window.location.href = '/admin/operations'}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-success-dark/10 text-success-light">
              <Monitor className="h-6 w-6" />
            </div>
            <h3 className="ml-3 text-lg font-bold text-white">Operations Control</h3>
          </div>
          <p className="text-gray-400">Manage and monitor live red team vs blue team operations</p>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search challenges and labs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background-light border border-background-default rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input md:w-48"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </motion.div>

  {/* Content Sections */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Challenges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Flag className="h-6 w-6 mr-2 text-primary" />
              Challenges
            </h2>
            <button
              onClick={() => window.location.href = '/creator/create'}
              className="btn-primary flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <Card className="p-6">
                <div className="animate-pulse text-primary">Loading challenges...</div>
              </Card>
            ) : filteredChallenges.length === 0 ? (
              <Card className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No challenges found</p>
              </Card>
            ) : (
              filteredChallenges.slice(0, 10).map((challenge) => (
                <Card key={challenge.id} className="p-4">
                  <div className="flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-white truncate">{challenge.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(challenge.status)}`}>
                            {challenge.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{challenge.description}</p>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center whitespace-nowrap">
                            <Trophy className="h-3 w-3 mr-1" />
                            {challenge.points} pts
                          </span>
                          <span className="flex items-center whitespace-nowrap">
                            <Target className="h-3 w-3 mr-1" />
                            {challenge.difficulty}
                          </span>
                          <span className="flex items-center whitespace-nowrap">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(challenge.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 pt-2 border-t border-background-light">
                      {challenge.status === 'pending' && (
                        <div className="flex gap-2 mr-auto">
                          <button
                            onClick={() => handleApprove(challenge)}
                            className="px-3 py-1.5 text-xs bg-success-dark/20 text-success-light border border-success-light/30 rounded-lg hover:bg-success-dark/30 transition-colors flex items-center"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => setSelectedChallenge(challenge)}
                            className="px-3 py-1.5 text-xs bg-error-dark/20 text-error-light border border-error-light/30 rounded-lg hover:bg-error-dark/30 transition-colors flex items-center"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </button>
                        </div>
                      )}
                      
                      <div className="flex gap-1 ml-auto">
                        <button
                          onClick={() => window.location.href = `/challenges/${challenge.id}`}
                          className="p-2 text-accent-blue hover:bg-accent-blue/20 rounded-lg transition-colors"
                          title="Preview Challenge"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.location.href = `/admin/challenges/edit/${challenge.id}`}
                          className="p-2 text-warning-light hover:bg-warning-dark/20 rounded-lg transition-colors"
                          title="Edit Challenge"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChallenge(challenge.id)}
                          disabled={deleting === challenge.id}
                          className="p-2 text-error-light hover:bg-error-dark/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Challenge"
                        >
                          {deleting === challenge.id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-error-light border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Feedback Section */}
                    {selectedChallenge?.id === challenge.id && (
                      <div className="pt-4 border-t border-background-light">
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Rejection Feedback
                          </label>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Provide detailed feedback explaining why this challenge is being rejected..."
                            className="w-full h-24 bg-background-light border border-background-default rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setSelectedChallenge(null);
                              setFeedback('');
                            }}
                            className="px-4 py-2 text-sm bg-background-light border border-background-default rounded-lg text-gray-300 hover:bg-background-default transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReject(challenge)}
                            className="px-4 py-2 text-sm bg-error-dark/20 border border-error-light/30 text-error-light rounded-lg hover:bg-error-dark/30 transition-colors disabled:opacity-50"
                            disabled={!feedback.trim()}
                          >
                            Send Feedback & Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </motion.div>

        {/* Labs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Flask className="h-6 w-6 mr-2 text-accent-blue" />
              Labs
            </h2>
            <button
              onClick={() => window.location.href = '/admin/labs/create'}
              className="btn-primary bg-accent-blue hover:bg-accent-blue/90 flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Lab
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <Card className="p-6">
                <div className="animate-pulse text-accent-blue">Loading labs...</div>
              </Card>
            ) : labs.length === 0 ? (
              <Card className="p-6 text-center">
                <Flask className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No labs found</p>
              </Card>
            ) : (
              labs.slice(0, 10).map((lab) => (
                <Card key={lab.id} className="p-4">
                  <div className="flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-white truncate">{lab.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            lab.status === 'published' ? 'bg-success-dark/20 text-success-light' :
                            lab.status === 'draft' ? 'bg-warning-dark/20 text-warning-light' :
                            'bg-error-dark/20 text-error-light'
                          }`}>
                            {lab.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{lab.description}</p>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center whitespace-nowrap">
                            <Trophy className="h-3 w-3 mr-1" />
                            {lab.points} pts
                          </span>
                          <span className="flex items-center whitespace-nowrap">
                            <Clock className="h-3 w-3 mr-1" />
                            {lab.estimated_time} min
                          </span>
                          <span className="flex items-center whitespace-nowrap">
                            <Target className="h-3 w-3 mr-1" />
                            {lab.difficulty}
                          </span>
                          <span className="flex items-center whitespace-nowrap">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(lab.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-1 pt-2 border-t border-background-light">
                      <button
                        onClick={() => window.location.href = `/labs/${lab.id}`}
                        className="p-2 text-accent-blue hover:bg-accent-blue/20 rounded-lg transition-colors"
                        title="Preview Lab"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.location.href = `/admin/labs/edit/${lab.id}`}
                        className="p-2 text-warning-light hover:bg-warning-dark/20 rounded-lg transition-colors"
                        title="Edit Lab"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.location.href = `/admin/operations?lab=${lab.id}`}
                        className="p-2 text-accent-green hover:bg-accent-green/20 rounded-lg transition-colors"
                        title="Operations"
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLab(lab.id)}
                        disabled={deleting === lab.id}
                        className="p-2 text-error-light hover:bg-error-dark/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Lab"
                      >
                        {deleting === lab.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-error-light border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Live Lab Sessions Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12"
      >
        <h2 className="text-2xl font-bold text-white flex items-center mb-6">
          <Monitor className="h-6 w-6 mr-2 text-success-light" />
          Live Lab Sessions
        </h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {liveSessions.length === 0 ? (
            <Card className="p-6 text-center">
              <Monitor className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No live sessions found</p>
            </Card>
          ) : (
            <table className="min-w-full bg-background-light/80 rounded-xl overflow-hidden">
              <thead>
                <tr className="text-left text-gray-400 text-sm">
                  <th className="px-4 py-2">Session ID</th>
                  <th className="px-4 py-2">Lab ID</th>
                  <th className="px-4 py-2">Red User</th>
                  <th className="px-4 py-2">Blue User</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map((session) => (
                  <tr key={session.id} className="border-b border-background-default hover:bg-background-dark/40 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs">{session.id}</td>
                    <td className="px-4 py-2">{session.lab_id}</td>
                    <td className="px-4 py-2">{session.red_user_id}</td>
                    <td className="px-4 py-2">{session.blue_user_id}</td>
                    <td className="px-4 py-2 capitalize">{session.status}</td>
                    <td className="px-4 py-2">{new Date(session.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={deletingSession === session.id}
                        className="p-2 text-error-light hover:bg-error-dark/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Session"
                      >
                        {deletingSession === session.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-error-light border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;