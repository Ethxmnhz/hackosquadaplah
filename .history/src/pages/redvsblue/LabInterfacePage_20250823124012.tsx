import React, { useEffect, useState, useRef } from 'react';
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
        import React, { useEffect, useState, useRef } from 'react';
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
                setChatMessages(prev => [...prev, payload.new]);
              })
              .subscribe();
            return () => {
              if (subscription) supabase.removeChannel(subscription);
            };
          }, [sessionId]);

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
                const [{ data: labData, error: labError }, { data: sessionData, error: sessionError }] = await Promise.all([
                  supabase.from('New_operation').select('*').eq('id', id).single(),
                  sessionId ? supabase.from('lab_sessions').select('*').eq('id', sessionId).single() : Promise.resolve({ data: null, error: null })
                ]);
                if (labError) setError(labError.message);
                else setLab(labData);
                if (sessionError) setError(sessionError.message);
                else setSession(sessionData);
              } catch (e: any) {
                setError('Failed to load lab or session');
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
          let team = teamParam;
          if (session && user) {
            if (session.red_user_id === user.id) team = 'Red';
            else if (session.blue_user_id === user.id) team = 'Blue';
          }

          return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 py-16">
              {loading && <div className="text-primary mb-4">Loading...</div>}
              {error && <div className="text-red-400 mb-4">{error}</div>}
              {partnerLeft && (
                <div className="text-red-400 text-xl font-bold mb-4">Your partner has left the session. Returning to operations...</div>
              )}
              {lab && team && (
                <div className="w-full max-w-4xl bg-background-light/80 rounded-xl p-8 shadow-lg flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">{lab.name} - {team} Team</h2>
                    <div className="mb-4">
                      <div className="font-bold text-lg mb-1 text-fuchsia-400">Attack Scenario</div>
                      <div className="text-white/90 mb-2">{lab.attack_scenario}</div>
                      <div className="font-bold text-lg mb-1 text-accent-blue">Defense Scenario</div>
                      <div className="text-white/90 mb-2">{lab.defense_scenario}</div>
                      {ai && <div className="mb-4 text-fuchsia-400">(AI Opponent)</div>}
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-lg mb-2">Your Questions</div>
                      <ul className="list-disc ml-6 text-white/80">
                        {(team === 'Red' ? lab.red_questions : lab.blue_questions).map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                    {/* TODO: Show VM details, allow blue team to add questions, etc. */}
                    <div className="mb-4">
                      <div className="font-bold text-lg mb-2">Session Timer</div>
                      <div className="text-2xl font-mono">{timeLeft !== null ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}</div>
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-lg mb-2">Live Event Feed</div>
                      <ul className="list-disc ml-6 text-white/80">
                        {eventFeed.length === 0 && <li>No events yet.</li>}
                        {eventFeed.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  </div>
                  {/* Chat Panel */}
                  <div className="w-full md:w-96 flex flex-col bg-background-dark/80 rounded-xl p-4 shadow-md">
                    <div className="font-bold text-lg mb-2 text-cyan-400">Session Chat</div>
                    <div className="flex-1 overflow-y-auto mb-2 max-h-64 border border-background-light rounded-lg p-2 bg-black/30">
                      {chatMessages.length === 0 && <div className="text-white/50">No messages yet.</div>}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="mb-1"><span className="font-bold text-fuchsia-300">{msg.username}:</span> {msg.message}</div>
                      ))}
                    </div>
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg px-2 py-1 text-black"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        maxLength={300}
                      />
                      <button type="submit" className="btn-primary px-4 py-1">Send</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        };

        export default LabInterfacePage;
        const [{ data: labData, error: labError }, { data: sessionData, error: sessionError }] = await Promise.all([
          supabase.from('New_operation').select('*').eq('id', id).single(),
          sessionId ? supabase.from('lab_sessions').select('*').eq('id', sessionId).single() : Promise.resolve({ data: null, error: null })
        ]);
        if (labError) setError(labError.message);
        else setLab(labData);
        if (sessionError) setError(sessionError.message);
        else setSession(sessionData);
      } catch (e: any) {
        setError('Failed to load lab or session');
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
  let team = teamParam;
  if (session && user) {
    if (session.red_user_id === user.id) team = 'Red';
    else if (session.blue_user_id === user.id) team = 'Blue';
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 py-16">
      {loading && <div className="text-primary mb-4">Loading...</div>}
      {error && <div className="text-red-400 mb-4">{error}</div>}
      {partnerLeft && (
        <div className="text-red-400 text-xl font-bold mb-4">Your partner has left the session. Returning to operations...</div>
      )}
      {lab && team && (
        <div className="w-full max-w-4xl bg-background-light/80 rounded-xl p-8 shadow-lg flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{lab.name} - {team} Team</h2>
            <div className="mb-4">
              <div className="font-bold text-lg mb-1 text-fuchsia-400">Attack Scenario</div>
              <div className="text-white/90 mb-2">{lab.attack_scenario}</div>
              <div className="font-bold text-lg mb-1 text-accent-blue">Defense Scenario</div>
              <div className="text-white/90 mb-2">{lab.defense_scenario}</div>
              {ai && <div className="mb-4 text-fuchsia-400">(AI Opponent)</div>}
            </div>
            <div className="mb-4">
              <div className="font-bold text-lg mb-2">Your Questions</div>
              <ul className="list-disc ml-6 text-white/80">
                {(team === 'Red' ? lab.red_questions : lab.blue_questions).map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
            {/* TODO: Show VM details, allow blue team to add questions, etc. */}
            <div className="mb-4">
              <div className="font-bold text-lg mb-2">Session Timer</div>
              <div className="text-2xl font-mono">{timeLeft !== null ? `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : '--:--'}</div>
            </div>
            <div className="mb-4">
              <div className="font-bold text-lg mb-2">Live Event Feed</div>
              <ul className="list-disc ml-6 text-white/80">
                {eventFeed.length === 0 && <li>No events yet.</li>}
                {eventFeed.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
          {/* Chat Panel */}
          <div className="w-full md:w-96 flex flex-col bg-background-dark/80 rounded-xl p-4 shadow-md">
            <div className="font-bold text-lg mb-2 text-cyan-400">Session Chat</div>
            <div className="flex-1 overflow-y-auto mb-2 max-h-64 border border-background-light rounded-lg p-2 bg-black/30">
              {chatMessages.length === 0 && <div className="text-white/50">No messages yet.</div>}
              {chatMessages.map((msg, i) => (
                <div key={i} className="mb-1"><span className="font-bold text-fuchsia-300">{msg.username}:</span> {msg.message}</div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                className="flex-1 rounded-lg px-2 py-1 text-black"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                maxLength={300}
              />
              <button type="submit" className="btn-primary px-4 py-1">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabInterfacePage;
