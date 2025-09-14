import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Session {
  id: string;
  lab_id: string;
  status: string;
  red_user_id: string;
  blue_user_id: string;
  created_at: string;
  lab?: { name: string };
}

const ActiveSessionPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [partnerActive, setPartnerActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let channel: any = null;
    const fetchSession = async () => {
      setLoading(true);
      // Find active session for this user
      const { data } = await supabase
        .from('lab_sessions')
        .select('*, lab:New_operation(name)')
        .or(`red_user_id.eq.${user.id},blue_user_id.eq.${user.id}`)
        .in('status', ['active', 'setup'])
        .maybeSingle();
      if (data) setSession(data);
      else setSession(null);
      setLoading(false);
    };
    fetchSession();
    // Real-time subscription for session changes
    channel = supabase
      .channel('active_session_panel_' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_sessions', filter: `red_user_id=eq.${user.id}` }, fetchSession)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_sessions', filter: `blue_user_id=eq.${user.id}` }, fetchSession)
      .subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!session) return;
    let channel: any = null;
    // Check if partner is active (simple: check if partner's match_request is still matched)
    const partnerId = session.red_user_id === user?.id ? session.blue_user_id : session.red_user_id;
    const checkPartner = async () => {
      const { data } = await supabase
        .from('match_requests')
        .select('status')
        .eq('session_id', session.id)
        .eq('user_id', partnerId)
        .maybeSingle();
      setPartnerActive(data?.status === 'matched');
    };
    checkPartner();
    // Real-time subscription for partner's match_request
    channel = supabase
      .channel('active_session_partner_' + partnerId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests', filter: `user_id=eq.${partnerId},session_id=eq.${session.id}` }, checkPartner)
      .subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session, user]);

  if (loading) return <div className="mb-4">Checking for active session...</div>;
  if (!session) return null;

  const userTeam = session.red_user_id === user?.id ? 'Red' : 'Blue';
  return (
    <div className="mb-8 p-4 bg-background-dark/80 rounded-xl border border-primary/30">
      <div className="font-bold text-lg mb-1">Active Session</div>
      <div className="mb-1">Lab: <span className="font-semibold">{session.lab?.name || session.lab_id}</span></div>
      <div className="mb-1">Team: <span className={userTeam === 'Red' ? 'text-red-400' : 'text-blue-400'}>{userTeam}</span></div>
      <div className="mb-1">Started: {new Date(session.created_at).toLocaleString()}</div>
      <div className="mb-1">Partner: {partnerActive === null ? 'Checking...' : partnerActive ? 'Active' : 'Exited'}</div>
      <button
        className="btn-primary mt-2"
        onClick={() => navigate(`/red-vs-blue/lab/${session.lab_id}?team=${userTeam}&session=${session.id}`)}
      >
        Rejoin Session
      </button>
    </div>
  );
};

export default ActiveSessionPanel;
