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
  // Join a match request as the opposite team (robust: create session, update both requests, only redirect joiner)
  const handleJoinRequest = async (req: any) => {
    setJoining(true);
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setJoining(false);
      return;
    }
    // Create lab session
    const sessionRes = await supabase.from('lab_sessions').insert([
      {
        lab_id: id,
        red_user_id: req.team === 'Red' ? req.user_id : user.id,
        blue_user_id: req.team === 'Blue' ? req.user_id : user.id,
        status: 'active'
      }
    ]).select('id').single();
    if (!sessionRes.data || sessionRes.error) {
      setJoining(false);
      return;
    }
    const sessionId = sessionRes.data.id;
    // Update both match_requests with session_id and matched status
    await supabase.from('match_requests').update({
      status: 'matched',
      partner_id: user.id,
      partner_username: user.email,
      session_id: sessionId
    }).eq('id', req.id);
    // Find or create the joiner's own match_request
    let joinerReq = null;
    const { data: existing } = await supabase
      .from('match_requests')
      .select('id')
      .eq('lab_id', id)
      .eq('team', req.team === 'Red' ? 'Blue' : 'Red')
      .eq('user_id', user.id)
      .in('status', ['waiting', 'matched'])
      .limit(1)
      .single();
    if (existing && existing.id) {
      joinerReq = existing.id;
    } else {
      // Create joiner's request
      const { data: newReq } = await supabase.from('match_requests').insert([
        { lab_id: id, team: req.team === 'Red' ? 'Blue' : 'Red', user_id: user.id, username: user.email, status: 'matched', partner_id: req.user_id, partner_username: req.username, session_id: sessionId }
      ]).select('id').single();
      joinerReq = newReq?.id;
    }
    // Update joiner's request with session info
    await supabase.from('match_requests').update({
      status: 'matched',
      partner_id: req.user_id,
      partner_username: req.username,
      session_id: sessionId
    }).eq('id', joinerReq);
    setJoining(false);
    // Redirect joiner only; original user will be redirected by polling
    navigate(`/red-vs-blue/lab/${id}?team=${req.team === 'Red' ? 'Blue' : 'Red'}&session=${sessionId}`);
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
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 py-16 bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024]">
      <div className="max-w-2xl w-full relative z-10">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-fuchsia-500 flex items-center justify-center text-white font-bold">1</span>
            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">2</span>
            <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">3</span>
          </div>
          <div className="text-white/80 text-sm">Step 2: Choose your team and mode</div>
        </div>
        {loading && <div className="text-primary mb-4">Loading...</div>}
        {error && <div className="text-red-400 mb-4">{error}</div>}
        {lab && (
          <div className="w-full bg-background-light/80 rounded-xl p-8 shadow-2xl">
            <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">{lab.name}</h2>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-bold text-lg mb-1 text-fuchsia-400">Attack Scenario</div>
                <div className="text-white/90 mb-2">{lab.attack_scenario}</div>
              </div>
              <div>
                <div className="font-bold text-lg mb-1 text-accent-blue">Defense Scenario</div>
                <div className="text-white/90">{lab.defense_scenario}</div>
              </div>
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
            <div className="flex gap-8 mb-8 justify-center">
              <button
                className={`flex flex-col items-center gap-2 px-8 py-6 rounded-2xl border-4 transition-all duration-200 shadow-lg font-bold text-xl ${team==='Red' ? 'border-red-500 bg-gradient-to-br from-red-600 to-pink-500 text-white scale-105' : 'border-transparent bg-background-dark/80 text-red-200 hover:border-red-500/60 hover:scale-105'}`}
                onClick={()=>setTeam('Red')}
              >
                <span className="text-3xl">🛡️</span>
                Red Team
              </button>
              <button
                className={`flex flex-col items-center gap-2 px-8 py-6 rounded-2xl border-4 transition-all duration-200 shadow-lg font-bold text-xl ${team==='Blue' ? 'border-blue-500 bg-gradient-to-br from-blue-600 to-cyan-500 text-white scale-105' : 'border-transparent bg-background-dark/80 text-blue-200 hover:border-blue-500/60 hover:scale-105'}`}
                onClick={()=>setTeam('Blue')}
              >
                <span className="text-3xl">🔒</span>
                Blue Team
              </button>
            </div>
            {team && (
              <div className="flex gap-8 mb-8 justify-center">
                <button className={`btn-primary px-8 py-4 text-lg font-bold ${mode==='AI'?'bg-fuchsia-500':'bg-background-light/80'}`} onClick={()=>setMode('AI')}>Play vs AI</button>
                <button className={`btn-primary px-8 py-4 text-lg font-bold ${mode==='Player'?'bg-green-500':'bg-background-light/80'}`} onClick={()=>setMode('Player')}>Play vs Player</button>
              </div>
            )}
            <button className="btn-primary px-12 py-4 mt-4 w-full text-xl font-bold shadow-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-cyan-500 hover:to-fuchsia-500 transition-all" disabled={!team||!mode} onClick={handleStart}>Start</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationDetailsPage;
