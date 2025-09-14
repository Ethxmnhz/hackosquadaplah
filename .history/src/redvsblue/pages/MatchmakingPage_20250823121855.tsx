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
  const [status, setStatus] = useState<'waiting' | 'matched' | 'error' | 'abandoned'>('waiting');
  const [partnerUsername, setPartnerUsername] = useState<string | undefined>();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Robust matchmaking: create/get request, poll for match, update both requests, ensure both users are redirected
  useEffect(() => {
    let interval: any;
    const createOrGetRequest = async () => {
      // Only allow one waiting request per user/lab/team
      const { data: existing, error: fetchError } = await supabase
        .from('match_requests')
        .select('id, status, partner_id, partner_username, session_id')
        .eq('lab_id', id)
        .eq('team', team)
        .eq('user_id', user?.id)
        .in('status', ['waiting', 'matched'])
        .limit(1)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        setStatus('error');
        return;
      }
      if (existing && existing.id) {
        setRequestId(existing.id);
        if (existing.session_id) {
          setSessionId(existing.session_id);
          setStatus('matched');
        }
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
    if (id && team && user?.id) createOrGetRequest();

    // Poll for matchmaking status
    interval = setInterval(async () => {
      if (!requestId) return;
      // 1. Check if this request is already matched and has a session
      const { data: myReq, error: myReqErr } = await supabase
        .from('match_requests')
        .select('status, partner_username, session_id')
        .eq('id', requestId)
        .single();
      if (myReqErr) return;
      if (myReq && myReq.status === 'matched' && myReq.session_id) {
        setStatus('matched');
        setPartnerUsername(myReq.partner_username);
        setSessionId(myReq.session_id);
        setTimeout(() => {
          navigate(`/red-vs-blue/lab/${id}?team=${team}&session=${myReq.session_id}`);
        }, 2000);
        clearInterval(interval);
        return;
      }
      // 2. If not matched, look for a waiting partner (opposite team, not self)
      const { data: partner } = await supabase
        .from('match_requests')
        .select('id, user_id, username')
        .eq('lab_id', id)
        .eq('status', 'waiting')
        .eq('team', team === 'Red' ? 'Blue' : 'Red')
        .neq('user_id', user?.id)
        .limit(1)
        .single();
      if (partner && partner.id) {
        // Create a lab session
        const sessionRes = await supabase.from('lab_sessions').insert([
          {
            lab_id: id,
            red_user_id: team === 'Red' ? user?.id : partner.user_id,
            blue_user_id: team === 'Blue' ? user?.id : partner.user_id,
            status: 'active'
          }
        ]).select('id').single();
        if (!sessionRes.data || sessionRes.error) {
          setStatus('error');
          return;
        }
        const newSessionId = sessionRes.data.id;
        // Update both requests to matched, store partner info and session_id
        let myUsername = user?.email;
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
          if (profile && profile.username) myUsername = profile.username;
        }
        await supabase.from('match_requests').update({
          status: 'matched',
          partner_id: partner.user_id,
          partner_username: partner.username,
          session_id: newSessionId
        }).eq('id', requestId);
        await supabase.from('match_requests').update({
          status: 'matched',
          partner_id: user?.id,
          partner_username: myUsername,
          session_id: newSessionId
        }).eq('id', partner.id);
        setStatus('matched');
        setPartnerUsername(partner.username);
        setSessionId(newSessionId);
        setTimeout(() => {
          navigate(`/red-vs-blue/lab/${id}?team=${team}&session=${newSessionId}`);
        }, 2000);
        clearInterval(interval);
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
          <div className="text-white/60 text-sm">Redirecting to lab session...</div>
        </div>
      )}
      {status === 'abandoned' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-red-400 text-2xl font-bold">Partner left the session.</div>
          <div className="text-white/60 text-sm">You will be returned to the operation list.</div>
        </div>
      )}
      {status === 'error' && <div className="text-red-400">An error occurred. Please try again.</div>}
    </div>
  );
};

export default MatchmakingPage;
