import React, { useEffect, useState, useRef } from 'react';
import QuestionCard from '../../redvsblue/components/QuestionCard';

import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const LabInterfacePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const teamParam = searchParams.get('team');
  const ai = searchParams.get('ai');
  const sessionId = searchParams.get('session');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lab, setLab] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerLeft, setPartnerLeft] = useState(false);
  // Chat and event feed
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [eventFeed, setEventFeed] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat messages (real-time)
  useEffect(() => {
    if (!sessionId) return;
    let subscription: any = null;
    const fetchChat = async () => {
      const { data, error } = await supabase
        .from('lab_session_chat')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (!error) setChatMessages(data || []);
    };
    fetchChat();
    // Subscribe to new chat messages
    subscription = supabase
      .channel('lab_session_chat:' + sessionId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lab_session_chat', filter: `session_id=eq.${sessionId}` }, payload => {
        setChatMessages(prev => {
          // Play sound if not from self
          if (user && payload.new.user_id !== user.id && notificationAudioRef.current) {
            notificationAudioRef.current.currentTime = 0;
            notificationAudioRef.current.play();
          }
          return [...prev, payload.new];
        });
      })
      .subscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [sessionId, user]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send chat message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !sessionId) return;
    await supabase.from('lab_session_chat').insert({
      session_id: sessionId,
      user_id: user.id,
      username: user.email,
      message: newMessage.trim()
    });
    setNewMessage('');
  };

  // Event feed: Example events (expand as needed)
  useEffect(() => {
    if (!session) return;
    const events: string[] = [];
    if (session.status === 'abandoned') events.push('Partner left the session.');
    // Add more events as needed (e.g., question answered, session ended)
    setEventFeed(events);
  }, [session]);

  // Session timer
  useEffect(() => {
    if (!session) return;
    // Example: 30 min session (or use session.created_at + duration)
    const duration = 30 * 60; // 30 minutes in seconds
    const start = new Date(session.created_at).getTime();
    const end = start + duration * 1000;
    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(left);
      if (left <= 0 && timerRef.current) clearInterval(timerRef.current);
    };
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session]);

  // Fetch lab and session info
  useEffect(() => {
    const fetchLabAndSession = async () => {
      setLoading(true);
      setError(null);
      try {
        // First try to get the lab data from New_operation table
        let labData = null;
        let labError = null;
        
        try {
          const { data, error } = await supabase
            .from('New_operation')
            .select('*')
            .eq('id', id)
            .single();
            
          if (!error) {
            labData = data;
          } else {
            labError = error;
            console.log('Error fetching from New_operation, will try labs table:', error);
          }
        } catch (e) {
          console.error('Exception fetching from New_operation:', e);
        }
        
        // If New_operation didn't work, try the labs table
        if (!labData) {
          try {
            const { data, error } = await supabase
              .from('labs')
              .select('*')
              .eq('id', id)
              .single();
              
            if (!error) {
              labData = data;
              console.log('Successfully loaded lab from labs table:', data);
            } else {
              labError = error;
              console.error('Error fetching from labs table:', error);
            }
          } catch (e) {
            console.error('Exception fetching from labs table:', e);
          }
        }
        
        // Fetch session data if we have a session ID
        let sessionData = null;
        let sessionError = null;
        
        if (sessionId) {
          const sessionResult = await supabase
            .from('lab_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
            
          sessionData = sessionResult.data;
          sessionError = sessionResult.error;
        }

        // Handle lab data results
        if (!labData) {
          setError(labError ? labError.message : 'Lab not found in any table');
        } else {
          setLab(labData);
        }
        
        // Handle session data results
        if (sessionId && sessionError) {
          setError(sessionError.message);
        } else if (sessionData) {
          setSession(sessionData);
        }
      } catch (e: any) {
        setError('Failed to load lab or session: ' + (e.message || 'Unknown error'));
        console.error('Exception in fetchLabAndSession:', e);
      }
      
      setLoading(false);
    };
    
    if (id) fetchLabAndSession();
  }, [id, sessionId]);

  // Poll for session status (partner disconnect)
  useEffect(() => {
    if (!sessionId) return;
    let interval: any = null;
    interval = setInterval(async () => {
      const { data: sessionData } = await supabase.from('lab_sessions').select('status').eq('id', sessionId).single();
      if (sessionData && sessionData.status === 'abandoned') {
        setPartnerLeft(true);
        clearInterval(interval);
        setTimeout(() => {
          navigate('/red-vs-blue/operations');
        }, 3000);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId, navigate]);

  // Determine team from session if present
  let team = teamParam?.toLowerCase() === 'red' ? 'Red' : teamParam?.toLowerCase() === 'blue' ? 'Blue' : null;
  
  if (!team && session && user) {
    if (session.red_user_id === user.id) team = 'Red';
    else if (session.blue_user_id === user.id) team = 'Blue';
  }
  
  console.log('Current team determination:', { 
    teamParam, 
    team,
    session: session ? { 
      id: session.id,
      red_user_id: session.red_user_id,
      blue_user_id: session.blue_user_id
    } : null,
    userId: user?.id
  });

  // Quit session handler
  const handleQuitSession = async () => {
    if (!sessionId) return;
    await supabase.from('lab_sessions').update({ status: 'abandoned' }).eq('id', sessionId);
    navigate('/red-vs-blue/operations');
  };

  return (
  <div className="min-h-screen w-full flex flex-col items-center px-0 py-0 md:px-0 md:py-0" style={{background:'#0A030F'}}>
      {loading && (
        <div className="flex items-center justify-center min-h-screen text-primary">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white">Loading Lab Environment...</h2>
            <p className="text-white/60">Please wait while we set up your operation.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md p-8 bg-background-light rounded-xl shadow-lg border border-red-500/30 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Lab</h2>
            <p className="text-white/80 mb-6">{error}</p>
            <button
              onClick={() => navigate('/operations/arena')}
              className="btn-primary px-4 py-2 rounded-lg w-full"
            >
              Return to Arena
            </button>
          </div>
        </div>
      )}
      {partnerLeft && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md p-8 bg-background-light rounded-xl shadow-lg border border-red-500/30 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Partner Left Session</h2>
            <p className="text-white/80 mb-6">Your partner has left the session. Returning to operations...</p>
          </div>
        </div>
      )}
      {lab && team ? (
  <div className="w-full max-w-7xl flex flex-col gap-12 mx-auto">
          {/* HERO BANNER FULL WIDTH, FLUSH TO TOP, NO SCROLL */}
          <div className="relative w-full flex flex-col items-center justify-center text-center mb-0 overflow-hidden p-0 m-0" style={{height:'440px', top:0}}>
            {lab.icon_url && (
              <img src={lab.icon_url} alt="Lab Icon BG" className="absolute inset-0 w-full h-full object-cover object-center" style={{zIndex:1, minHeight:'440px', width:'100vw', left:0}} />
            )}
            {/* 20-30% overlay with dark red/blue tint */}
            <div 
              className="absolute inset-0"
              style={{
                zIndex:2,
                width: '100vw',
                left: 0,
                background: team === 'Red'
                  ? 'linear-gradient(0deg,rgba(160,0,40,0.28),rgba(10,3,15,0.85))'
                  : 'linear-gradient(0deg,rgba(0,40,160,0.28),rgba(10,3,15,0.85))'
              }}
            />
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-4">
              <div className="flex flex-col items-center justify-center h-full w-full">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">{lab.name}</h1>
                  <span className={`px-4 py-1 rounded-full text-lg font-bold uppercase tracking-wider shadow-md ${team === 'Red' ? 'bg-red-600/90 text-white border-2 border-red-400' : 'bg-blue-600/90 text-white border-2 border-blue-400'}`}>{team} Team</span>
                </div>
                <div className="text-lg md:text-xl text-white/80 font-medium max-w-2xl mx-auto mb-2">
                  {team === 'Red' 
                    ? (lab.attack_scenario || lab.description || 'Attack the target system and complete your objectives')
                    : (lab.defense_scenario || lab.description || 'Defend your system against the attacker')}
                </div>
                {ai && <div className="mb-2 text-fuchsia-400 font-bold">(AI Opponent)</div>}
              </div>
            </div>
          </div>

          {/* Divider/fade between hero and main content */}
          <div className="w-full h-8 bg-gradient-to-b from-transparent to-[#0A030F] -mt-8 mb-2" />
          {/* TIMER & POINTS ROW (only once, below hero) */}
          <div className="w-full flex flex-col md:flex-row gap-6 mb-6 justify-center items-stretch">
            <div className="flex-1 rounded-xl bg-black/40 border border-white/10 shadow-xl p-6 flex flex-col items-center min-w-[180px] max-w-[320px] mx-auto">
              <div className="font-bold text-lg mb-1 text-cyan-300">Session Timer</div>
              <div className={`text-3xl font-mono ${team === 'Red' ? 'text-red-400' : 'text-blue-400'} drop-shadow-[0_0_8px_rgba(255,0,80,0.3)]`}>{timeLeft !== null ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}</div>
            </div>
            <div className="flex-1 rounded-xl bg-black/40 border border-white/10 shadow-xl p-6 flex flex-col items-center min-w-[180px] max-w-[320px] mx-auto">
              <div className="font-bold text-lg mb-1 text-cyan-300">Your Points</div>
              <div className={`text-3xl font-mono ${team === 'Red' ? 'text-red-400' : 'text-blue-400'} drop-shadow-[0_0_8px_rgba(0,120,255,0.3)]`}>{/* TODO: Show points */}0</div>
            </div>
          </div>
            <div className="w-full flex flex-col md:flex-row gap-10 items-start">
            {/* MAIN CONTENT */}
              <div className="flex-1 flex flex-col gap-10 min-w-0">
              {/* INSTRUCTIONS CARD */}
              <div className="rounded-2xl bg-gradient-to-br from-black/70 to-black/40 border border-white/10 shadow-2xl p-8 mb-2">
                <div className="font-bold text-xl mb-2 text-white/90">Instructions</div>
                <div className="text-white/80 whitespace-pre-line text-base">{team === 'Red' ? lab.red_instructions : lab.blue_instructions}</div>
              </div>
              {/* QUESTIONS */}
              <div>
                <div className="font-bold text-xl mb-4 text-white/90">Questions</div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[520px] overflow-y-auto pr-2">
                  {Array.isArray(team === 'Red' ? lab.red_questions : lab.blue_questions) ? 
                    ((team === 'Red' ? lab.red_questions : lab.blue_questions) as any[]).map((qa: any, i: number) => {
                      const teamStrict: 'Red' | 'Blue' = team === 'Red' ? 'Red' : team === 'Blue' ? 'Blue' : 'Red';
                      return (
                        <li key={i}>
                          <QuestionCard qa={qa} team={teamStrict} qIndex={i} />
                        </li>
                      );
                    }) : 
                    <li className="col-span-2 text-white/80">
                      <div className="rounded-xl bg-black/40 border border-white/10 shadow-xl p-6">
                        <p className="text-lg font-medium mb-2">No questions available for {team} team.</p>
                        <p>This lab might not have specific questions for your team yet. You can still use the chat to communicate with your partner.</p>
                      </div>
                    </li>
                  }
                </ul>
              </div>
              {/* TIMER & POINTS */}
              <div className="flex flex-col md:flex-row gap-8 mt-4">
                <div className="flex-1 rounded-xl bg-black/40 border border-white/10 shadow-xl p-8 flex flex-col items-center">
                  <div className="font-bold text-lg mb-1 text-cyan-300">Session Timer</div>
                  <div className={`text-4xl font-mono ${team === 'Red' ? 'text-red-400' : 'text-blue-400'} drop-shadow-[0_0_8px_rgba(255,0,80,0.3)]`}>{timeLeft !== null ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}</div>
                </div>
                <div className="flex-1 rounded-xl bg-black/40 border border-white/10 shadow-xl p-8 flex flex-col items-center">
                  <div className="font-bold text-lg mb-1 text-cyan-300">Your Points</div>
                  <div className={`text-4xl font-mono ${team === 'Red' ? 'text-red-400' : 'text-blue-400'} drop-shadow-[0_0_8px_rgba(0,120,255,0.3)]`}>{/* TODO: Show points */}0</div>
                </div>
              </div>
              {/* EVENT FEED */}
              <div className="rounded-2xl bg-black/60 border border-white/10 shadow-2xl p-8 mt-4">
                <div className="font-bold text-lg mb-2 text-cyan-300">Live Event Feed</div>
                <ul className="list-disc ml-6 text-white/80">
                  {eventFeed.length === 0 && <li>No events yet.</li>}
                  {eventFeed.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
              <button onClick={handleQuitSession} className={`btn-outline px-6 py-3 mt-8 w-full md:w-auto text-lg font-bold rounded-xl ${team === 'Red' ? 'text-red-400 border-red-400 hover:bg-red-500/10' : 'text-blue-400 border-blue-400 hover:bg-blue-500/10'} hover:text-white transition-all`}>Quit Session</button>
            </div>
            {/* SIDEBAR: ENVIRONMENT & CHAT */}
              <div className="w-full md:w-[340px] flex flex-col gap-8 md:sticky md:top-10 h-fit">
              {/* ENVIRONMENT CARD */}
              <div className="rounded-2xl bg-gradient-to-br from-black/80 to-black/40 border border-cyan-400/20 shadow-2xl p-8">
                <div className="font-bold text-lg mb-2 text-cyan-300">Lab Environment</div>
                <div className="text-white/80 text-sm">
                  <span className="font-bold">Type:</span> {lab.setup_type || 'N/A'}<br/>
                  <span className="font-bold">Details:</span> {lab.setup_details || 'No details provided.'}
                  {/* Future: VPN/Cloud/VM connection info here */}
                </div>
              </div>
              {/* CHAT CARD */}
              <div className="rounded-2xl bg-gradient-to-br from-black/80 to-black/40 border border-fuchsia-400/20 shadow-2xl p-8 flex flex-col h-96">
                <div className="font-bold text-lg mb-2 text-fuchsia-300">Session Chat</div>
                <div className="flex-1 overflow-y-auto mb-2 max-h-48 border border-background-light rounded-lg p-2 bg-black/30">
                  {chatMessages.length === 0 && <div className="text-white/50">No messages yet.</div>}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="mb-1"><span className="font-bold text-fuchsia-300">{msg.username}:</span> {msg.message}</div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <audio ref={notificationAudioRef} src="https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae1b6.mp3" preload="auto" />
                <form onSubmit={sendMessage} className="flex gap-2 mt-2">
                  <input
                    className="flex-1 rounded-lg px-2 py-1 text-black"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={300}
                  />
                  <button type="submit" className={`btn-primary px-4 py-1 ${team === 'Red' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (!loading && !error && !partnerLeft) && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md p-8 bg-background-light rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Lab Setup Issue</h2>
            <p className="text-white/80 mb-6">
              {!lab ? "Unable to load lab information." : !team ? "Team assignment is missing." : "Unknown issue loading lab interface."}
            </p>
            <div className="text-left mb-4 p-4 bg-black/30 rounded-lg text-xs text-white/60 font-mono">
              <p>Debug info:</p>
              <p>Lab loaded: {lab ? "Yes" : "No"}</p>
              <p>Team assigned: {team || "None"}</p>
              <p>Lab ID: {id || "None"}</p>
              <p>Session ID: {sessionId || "None"}</p>
              <p>URL team param: {teamParam || "None"}</p>
            </div>
            <button
              onClick={() => navigate('/operations/arena')}
              className="btn-primary px-4 py-2 rounded-lg w-full"
            >
              Return to Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabInterfacePage;
