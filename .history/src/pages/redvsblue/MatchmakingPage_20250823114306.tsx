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
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [requestId, setRequestId] = useState<string|null>(null);

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
        setError(fetchError.message);
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
        if (error) setError(error.message);
        else if (data) setRequestId(data.id);
      }
    };
    if (id && team) createOrGetRequest();
    // Poll for match (simulate for now)
    interval = setInterval(async () => {
      if (requestId) {
        setTimeout(() => {
          setWaiting(false);
          navigate(`/red-vs-blue/lab/${id}?team=${team}`);
        }, 5000);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [id, team, requestId, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 py-16">
      <h2 className="text-3xl font-bold mb-6">Waiting for Partner...</h2>
      <div className="text-lg mb-4">You are waiting for a {team === 'Red' ? 'Blue' : 'Red'} Teamer to join this operation.</div>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      {waiting && <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>}
      {!waiting && <div className="text-green-400">Partner found! Redirecting...</div>}
    </div>
  );
};

export default MatchmakingPage;
