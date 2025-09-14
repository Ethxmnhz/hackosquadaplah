import { useEffect, useState } from 'react';
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
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);
  // Fetch open match requests for this lab
  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from('match_requests')
        .select('*')
        .eq('lab_id', id)
        .eq('status', 'waiting');
      if (!error) setOpenRequests(data || []);
    };
    if (id) fetchRequests();
  }, [id]);
  // Join a match request as the opposite team
  const handleJoinRequest = async (req: any) => {
    setJoining(true);
    // Update the request to matched, and create a session (simulate for now)
    await supabase.from('match_requests').update({ status: 'matched' }).eq('id', req.id);
    // In real app, create a lab_session and redirect both users
    setJoining(false);
    navigate(`/red-vs-blue/lab/${id}?team=${req.team === 'Red' ? 'Blue' : 'Red'}`);
  };

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
          {/* Open Match Requests */}
          {openRequests.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-2">Waiting for Partner</h3>
              <ul className="space-y-2">
                {openRequests.map(req => (
                  <li key={req.id} className="flex items-center gap-4 bg-background-dark/70 rounded-lg px-4 py-3">
                    <span className={`font-bold ${req.team==='Red'?'text-red-400':'text-blue-400'}`}>{req.team} Team</span>
                    <span className="text-white/80">by {req.username || req.user_id}</span>
                    <button className="btn-primary px-4 py-2" disabled={joining} onClick={()=>handleJoinRequest(req)}>
                      {joining ? 'Joining...' : `Join as ${req.team==='Red'?'Blue':'Red'} Team`}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
