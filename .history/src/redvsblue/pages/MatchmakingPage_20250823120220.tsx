import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MatchmakingPage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const team = searchParams.get('team');
  const [status, setStatus] = useState<'waiting' | 'matched' | 'error'>('waiting');
  const [partnerUsername, setPartnerUsername] = useState<string | undefined>();
  const [requestId, setRequestId] = useState<string | null>(null);

  // Create or get matchmaking request
  useEffect(() => {
    let interval: any;
    const createOrGetRequest = async () => {
      // Check for existing waiting request for this lab/team
      const { data: existing, error: fetchError } = await supabase
        .from('match_requests')
        .select('id')
        .eq('lab_id', id)
        .eq('team', team)
        .eq('status', 'waiting')
        .eq('user_id', user?.id)
        .limit(1)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        setStatus('error');
        return;
      }
      if (existing && existing.id) {
        setRequestId(existing.id);
      } else {
        // Fetch username from profiles
        let username = user?.email;
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
          if (profile && profile.username) username = profile.username;
        }
        // Create new request
        const { data, error } = await supabase.from('match_requests').insert([
          { lab_id: id, team, user_id: user?.id, username, status: 'waiting' }
        ]).select('id').single();
        if (error) setStatus('error');
        else if (data) setRequestId(data.id);
      }
    };
    if (id && team) createOrGetRequest();
    // Poll for a matching partner
    interval = setInterval(async () => {
      if (requestId) {
        // Look for a waiting request for the same lab, opposite team, not this user
        const { data: partner } = await supabase
          .from('match_requests')
          .select('username, user_id')
          .eq('lab_id', id)
          .eq('status', 'waiting')
          .eq('team', team === 'Red' ? 'Blue' : 'Red')
          .neq('user_id', user?.id)
          .limit(1)
          .single();
        if (partner && partner.username) {
          setPartnerUsername(partner.username);
          setStatus('matched');
          // Optionally update both requests to matched here
          setTimeout(() => {
            navigate(`/red-vs-blue/lab/${id}?team=${team}`);
          }, 2000);
          clearInterval(interval);
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [id, team, requestId, navigate, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Matchmaking</h1>
      {status === 'waiting' && (
        <>
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-6"></div>
          <div className="text-lg text-white/90 mb-2">Waiting for a {team === 'Red' ? 'Blue' : 'Red'} Teamer to join...</div>
        </>
      )}
      {status === 'matched' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-green-400 text-2xl font-bold">Partner found!</div>
          {partnerUsername && <div className="text-white/80">Partner: <span className="font-bold">{partnerUsername}</span></div>}
          <div className="text-white/60 text-sm">Redirecting to lab...</div>
        </div>
      )}
      {status === 'error' && <div className="text-red-400">An error occurred. Please try again.</div>}
    </div>
  );
};

export default MatchmakingPage;
