import React, { useEffect, useState } from 'react';
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
        <div className="w-full max-w-2xl bg-background-light/80 rounded-xl p-8 shadow-lg">
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
        </div>
      )}
    </div>
  );
};

export default LabInterfacePage;
