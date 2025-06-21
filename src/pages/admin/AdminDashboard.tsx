import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, MessageSquare, FlaskRound as Flask, Flag, Monitor, Server } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Challenge } from '../../lib/types';
import Card from '../../components/ui/Card';

const AdminDashboard = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

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

  const handleApprove = async (challenge: Challenge) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', challenge.id);

      if (error) throw error;
      await loadChallenges();
    } catch (error) {
      console.error('Error approving challenge:', error);
    }
  };

  const handleReject = async (challenge: Challenge) => {
    if (!feedback.trim()) return;

    try {
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
      await loadChallenges();
    } catch (error) {
      console.error('Error rejecting challenge:', error);
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
        <div className="flex items-center gap-4">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <p className="text-gray-400 mt-2">Manage challenges, labs, and platform content</p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <Card
          hover
          className="p-6"
          onClick={() => window.location.href = '/admin/labs'}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-accent-blue/10 text-accent-blue">
              <Flask className="h-6 w-6" />
            </div>
            <h3 className="ml-3 text-lg font-bold text-white">Manage Labs</h3>
          </div>
          <p className="text-gray-400">Create and manage hands-on cybersecurity labs</p>
        </Card>

        <Card
          hover
          className="p-6"
          onClick={() => window.location.href = '/admin/challenges'}
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
          className="p-6"
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

      {/* Pending Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Pending Challenges</h2>
        <div className="space-y-6">
          {loading ? (
            <Card className="p-6">
              <div className="animate-pulse text-primary">Loading challenges...</div>
            </Card>
          ) : challenges.length === 0 ? (
            <Card className="p-6">
              <p className="text-gray-400">No challenges to review</p>
            </Card>
          ) : (
            challenges.map((challenge) => (
              <Card key={challenge.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{challenge.title}</h3>
                    <p className="text-gray-400 mb-4">{challenge.description}</p>
                    
                    <div className="flex gap-4 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                        {challenge.challenge_type}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-blue/20 text-accent-blue">
                        {challenge.difficulty}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-success-dark/20 text-success-light">
                        {challenge.points} points
                      </span>
                    </div>

                    <div className="text-sm text-gray-400">
                      Submitted: {new Date(challenge.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {challenge.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(challenge)}
                        className="btn-primary flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => setSelectedChallenge(challenge)}
                        className="btn-outline flex items-center text-error-light border-error-light/30 hover:bg-error-light/10"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {selectedChallenge?.id === challenge.id && (
                  <div className="mt-4">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback for rejection..."
                      className="w-full h-32 bg-background-light border border-background-default rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setSelectedChallenge(null);
                          setFeedback('');
                        }}
                        className="btn-outline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(challenge)}
                        className="btn-primary bg-error-light hover:bg-error-light/90"
                        disabled={!feedback.trim()}
                      >
                        Send Feedback & Reject
                      </button>
                    </div>
                  </div>
                )}

                {challenge.status !== 'pending' && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    challenge.status === 'approved' 
                      ? 'bg-success-dark/20 border border-success-light/30' 
                      : 'bg-error-dark/20 border border-error-light/30'
                  }`}>
                    <div className="flex items-center">
                      {challenge.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-success-light mr-2" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-error-light mr-2" />
                      )}
                      <span className={`font-medium ${
                        challenge.status === 'approved' 
                          ? 'text-success-light' 
                          : 'text-error-light'
                      }`}>
                        {challenge.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    {challenge.feedback && (
                      <p className="mt-2 text-gray-400">{challenge.feedback}</p>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;