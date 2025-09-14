import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MatchmakingPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const team = searchParams.get('team');
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [requestId, setRequestId] = useState<string|null>(null);

  useEffect(() => {
    let interval: any;
    const createRequest = async () => {
      // Create match_request in Supabase
      const { data, error } = await supabase.from('match_requests').insert([
        { lab_id: id, team, user_id: null, status: 'waiting' }
      ]).select('id').single();
      if (error) setError(error.message);
      else if (data) setRequestId(data.id);
    };
    if (id && team) createRequest();
    // Poll for match (simulate for now)
    interval = setInterval(async () => {
      // In real app, check if a session exists for this request
      // For now, simulate match after 5s
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
