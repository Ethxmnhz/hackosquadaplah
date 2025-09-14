import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const OperationDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<'Red' | 'Blue' | null>(null);
  const [mode, setMode] = useState<'AI' | 'Player' | null>(null);

  useEffect(() => {
    const fetchLab = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('New_operation').select('*').eq('id', id).single();
      if (error) setError(error.message);
      else setLab(data);
      setLoading(false);
    };
    if (id) fetchLab();
  }, [id]);

  const handleStart = () => {
    if (team && mode) {
      if (mode === 'AI') {
        navigate(`/red-vs-blue/lab/${id}?team=${team}&ai=1`);
      } else {
        navigate(`/red-vs-blue/matchmaking/${id}?team=${team}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 py-16">
      {loading && <div className="text-primary mb-4">Loading...</div>}
      {error && <div className="text-red-400 mb-4">{error}</div>}
      {lab && (
        <div className="w-full max-w-2xl bg-background-light/80 rounded-xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold mb-2">{lab.name}</h2>
          <div className="mb-4">
            <div className="font-bold text-lg mb-1 text-fuchsia-400">Attack Scenario</div>
            <div className="text-white/90 mb-2">{lab.attack_scenario}</div>
            <div className="font-bold text-lg mb-1 text-accent-blue">Defense Scenario</div>
            <div className="text-white/90">{lab.defense_scenario}</div>
          </div>
          <div className="flex gap-8 mb-8">
            <button className={`btn-primary px-8 py-4 ${team==='Red'?'bg-red-500':'bg-background-light/80'}`} onClick={()=>setTeam('Red')}>Play as Red Teamer</button>
            <button className={`btn-primary px-8 py-4 ${team==='Blue'?'bg-blue-500':'bg-background-light/80'}`} onClick={()=>setTeam('Blue')}>Play as Blue Teamer</button>
          </div>
          {team && (
            <div className="flex gap-8 mb-8">
              <button className={`btn-primary px-8 py-4 ${mode==='AI'?'bg-fuchsia-500':'bg-background-light/80'}`} onClick={()=>setMode('AI')}>Play vs AI</button>
              <button className={`btn-primary px-8 py-4 ${mode==='Player'?'bg-green-500':'bg-background-light/80'}`} onClick={()=>setMode('Player')}>Play vs Player</button>
            </div>
          )}
          <button className="btn-primary px-12 py-4 mt-4" disabled={!team||!mode} onClick={handleStart}>Start</button>
        </div>
      )}
    </div>
  );
};

export default OperationDetailsPage;
