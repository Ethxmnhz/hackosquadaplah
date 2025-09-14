
import { useState, useEffect, useCallback } from 'react';
import CreateOperationLabPage from './CreateOperationLabPage';
import { supabase } from '../../lib/supabase';

// Import the QA type to match CreateOperationLabPage
type QA = { question: string; answer: string };

// Update the interface to match the one in CreateOperationLabPage
interface OperationLab {
  name: string;
  attackScenario: string;
  defenseScenario: string;
  redInstructions: string;
  blueInstructions: string;
  redQuestions: QA[];
  blueQuestions: QA[];
  setupType: 'Cloud' | 'Agent';
  setupDetails?: string;
  iconUrl?: string;
}

interface LabSession {
  id: string;
  lab_id: string;
  red_user_id: string;
  blue_user_id: string;
  status: string;
  created_at: string;
  red_username?: string;
  blue_username?: string;
}

const OperationsManagementPage = () => {
  const [labs, setLabs] = useState<OperationLab[]>([]);
  const [waitingRequests, setWaitingRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [liveSessions, setLiveSessions] = useState<LabSession[]>([]);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddLab = (lab: OperationLab) => {
    setLabs([lab, ...labs]);
  };

  // Fetch all waiting match requests and live sessions
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    setError(null);
    
    try {
      // Step 1: Fetch all match requests without the join
      const { data: requestsData, error: requestsError } = await supabase
        .from('match_requests')
        .select('*')
        .order('created_at', { ascending: false });  // Show most recent first
      
      if (requestsError) {
        setError('Error fetching match requests: ' + requestsError.message);
        setWaitingRequests([]);
        setLoadingRequests(false);
        return;
      }
      
      // Step 2: Fetch all labs to have their names available
      const { data: labsData, error: labsError } = await supabase
        .from('labs')
        .select('id, name');
      
      if (labsError) {
        console.error('Error fetching labs:', labsError);
        // Continue with just the requests
        setWaitingRequests(requestsData || []);
        setLoadingRequests(false);
        return;
      }
      
      // Step 3: Map lab names to requests
      const requestsWithLabNames = requestsData?.map(request => {
        const matchingLab = labsData?.find(lab => lab.id === request.lab_id);
        return {
          ...request,
          lab: matchingLab ? { name: matchingLab.name } : { name: 'Unknown Lab' }
        };
      });
      
      setWaitingRequests(requestsWithLabNames || []);
    } catch (err) {
      console.error('Unexpected error in fetchRequests:', err);
      setError('Unexpected error fetching data');
      setWaitingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const fetchLiveSessions = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from('lab_sessions')
        .select(`*,
            red_profile:profiles!lab_sessions_red_user_id_fkey(username),
            blue_profile:profiles!lab_sessions_blue_user_id_fkey(username)
          `)
        .in('status', ['active', 'setup'])
        .order('created_at', { ascending: false });
      if (error) {
        setError('Error fetching live sessions: ' + error.message);
        setLiveSessions([]);
      } else if (data) {
        setLiveSessions(
          data.map((s: any) => ({
            ...s,
            red_username: s.red_profile?.username || s.red_user_id,
            blue_username: s.blue_profile?.username || s.blue_user_id,
          }))
        );
      }
    } catch (e) {
      setError('Unexpected error fetching live sessions');
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchLiveSessions();
    // Real-time updates for lab_sessions
    const labSessionsChannel = supabase
      .channel('lab_sessions_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_sessions' }, () => {
        fetchLiveSessions();
      })
      .subscribe();
    // Real-time updates for match_requests
    const matchRequestsChannel = supabase
      .channel('match_requests_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, () => {
        fetchRequests();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(labSessionsChannel);
      supabase.removeChannel(matchRequestsChannel);
    };
  }, [fetchRequests, fetchLiveSessions]);
  
  // Delete a live session
  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this live session? This will disconnect all users.')) return;
    setDeletingSession(sessionId);
    try {
      // Delete related chat messages first (if any)
      await supabase.from('lab_session_chat').delete().eq('session_id', sessionId);
      // Delete the session itself
      const { error } = await supabase.from('lab_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      setLiveSessions(liveSessions.filter(s => s.id !== sessionId));
    } catch (error) {
      alert('Failed to delete session');
    } finally {
      setDeletingSession(null);
    }
  };

  // Delete a single request
  const handleDeleteRequest = async (id: string) => {
    setDeleteLoading(true);
    try {
      await supabase.from('match_requests').delete().eq('id', id);
      setWaitingRequests(waitingRequests.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting request:', error);
      setError('Failed to delete request');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Flush all waiting requests or all requests
  const handleFlushAll = async (deleteAll = false) => {
    if (deleteAll && !window.confirm('Are you sure you want to delete ALL match requests? This action cannot be undone.')) {
      return;
    }
    
    setDeleteLoading(true);
    try {
      if (deleteAll) {
        // Delete all requests regardless of status
        await supabase.from('match_requests').delete();
        setWaitingRequests([]);
      } else {
        // Only delete waiting requests
        await supabase.from('match_requests').delete().eq('status', 'waiting');
        setWaitingRequests(waitingRequests.filter(r => r.status !== 'waiting'));
      }
    } catch (error) {
      console.error('Error flushing requests:', error);
      setError('Failed to flush requests');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Operations Management</h1>
        <CreateOperationLabPage onSubmit={handleAddLab} />
        
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Operation Labs</h2>
          {labs.length === 0 && <div className="text-white/60">No labs created yet.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {labs.map((lab, i) => (
              <div key={i} className="bg-background-light/80 rounded-xl p-4 border border-primary/20">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-lg">{lab.name}</div>
                  <button 
                    className="text-red-400 hover:text-red-300 text-sm"
                    onClick={() => {
                      if (window.confirm(`Delete lab "${lab.name}"?`)) {
                        setLabs(labs.filter((_, index) => index !== i));
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
                <div className="text-sm text-white/80 mb-1">Attack: {lab.attackScenario}</div>
                <div className="text-sm text-white/80 mb-1">Defense: {lab.defenseScenario}</div>
                <div className="text-sm text-white/80 mb-1">Red Instructions: {lab.redInstructions ? 'Yes' : 'No'}</div>
                <div className="text-sm text-white/80 mb-1">Blue Instructions: {lab.blueInstructions ? 'Yes' : 'No'}</div>
                <div className="flex justify-between text-sm mt-2">
                  <div className="text-red-400">Red Questions: {lab.redQuestions.length}</div>
                  <div className="text-blue-400">Blue Questions: {lab.blueQuestions.length}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Lab Sessions Section */}
        <div className="mt-12">
          <div className="flex items-center mb-2 gap-2">
            <h2 className="text-2xl font-bold">Live Lab Sessions</h2>
            <button
              className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={fetchLiveSessions}
              disabled={loadingRequests}
            >
              Refresh
            </button>
          </div>
          {error && (
            <div className="mb-2 text-red-400">{error}</div>
          )}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {liveSessions.length === 0 ? (
              <div className="p-6 text-center bg-background-light/80 rounded-xl">
                <span className="block text-gray-400">No live sessions found</span>
              </div>
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
                      <td className="px-4 py-2">{session.red_username}</td>
                      <td className="px-4 py-2">{session.blue_username}</td>
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
                            <span className="font-bold">Delete</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Matchmaking Requests Panel */}
        <div className="mt-12">
          <div className="flex items-center mb-2 gap-2">
            <h2 className="text-2xl font-bold">All Matchmaking Requests</h2>
            <button
              className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={fetchRequests}
              disabled={loadingRequests}
            >
              Refresh
            </button>
          </div>
          <div className="flex gap-4 mb-4">
            <button className="btn-primary" onClick={() => handleFlushAll(false)} disabled={deleteLoading || waitingRequests.filter(r => r.status === 'waiting').length === 0}>
              {deleteLoading ? 'Flushing...' : 'Flush All Waiting Requests'}
            </button>
            <button className="btn-error" onClick={() => handleFlushAll(true)} disabled={deleteLoading || waitingRequests.length === 0}>
              {deleteLoading ? 'Deleting...' : 'Delete All Requests'}
            </button>
          </div>
          {error && (
            <div className="mb-2 text-red-400">{error}</div>
          )}
          {loadingRequests ? (
            <div className="text-primary">Loading requests...</div>
          ) : waitingRequests.length === 0 ? (
            <div className="text-white/60">No match requests found.</div>
          ) : (
            <div className="bg-background-light/20 rounded-xl overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-background-dark/60">
                  <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Lab</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingRequests.map(req => (
                    <tr key={req.id} className="border-b border-white/10 hover:bg-background-light/10">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${req.status === 'waiting' ? 'bg-yellow-400/20 text-yellow-400' : 
                          req.status === 'invited' ? 'bg-blue-400/20 text-blue-400' :
                          req.status === 'matched' ? 'bg-green-400/20 text-green-400' :
                          'bg-red-400/20 text-red-400'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${req.team === 'Red' ? 'text-red-400' : 'text-blue-400'}`}>
                        {req.team} Team
                      </td>
                      <td className="px-4 py-3">
                        {req.lab?.name || req.lab_id}
                      </td>
                      <td className="px-4 py-3">
                        {req.username || req.user_id}
                      </td>
                      <td className="px-4 py-3">
                        {req.partner_username || req.partner_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          className="btn-error-sm px-3 py-1 text-sm"
                          disabled={deleteLoading}
                          onClick={() => handleDeleteRequest(req.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Make sure we have a clear default export
const ExportedOperationsManagementPage = OperationsManagementPage;
export { ExportedOperationsManagementPage as default };