import React from 'react';
import { useNavigate } from 'react-router-dom';

import RequestList from '../../components/redvsblue/RequestList';
import OperationCard from '../../components/redvsblue/OperationCard';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const RedVsBlueHomePage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);

  // Fetch open match requests (waiting)
  useEffect(() => {
    let channel: any = null;
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('match_requests')
        .select('id, lab_id, team, status, username, user_id')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
      setRequests(data || []);
    };
    fetchRequests();
    // Real-time subscription
    channel = supabase
      .channel('match_requests_home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, fetchRequests)
      .subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Fetch recent operations
  useEffect(() => {
    const fetchOps = async () => {
      const { data } = await supabase
        .from('New_operation')
        .select('id, name, attack_scenario')
        .order('created_at', { ascending: false })
        .limit(6);
      setOperations(data || []);
    };
    fetchOps();
  }, []);

  // Join handler (redirect to operation details page for now)
  const handleJoin = (req: any) => {
    navigate(`/red-vs-blue/operations/${req.lab_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12">
      <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Red vs Blue Dashboard</h1>
        <p className="text-lg md:text-xl text-white/80 mb-8">Your hub for cyber operations, stats, and matchmaking.</p>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-background-light/80 rounded-xl p-6 border border-primary/30 shadow-lg flex flex-col items-center">
            <span className="text-3xl font-black text-fuchsia-400 mb-2">1,250</span>
            <span className="text-lg font-semibold text-white/90">Total Points</span>
          </div>
          <div className="bg-background-light/80 rounded-xl p-6 border border-accent-blue/30 shadow-lg flex flex-col items-center">
            <span className="text-3xl font-black text-accent-blue mb-2">12h 45m</span>
            <span className="text-lg font-semibold text-white/90">Total Playtime</span>
          </div>
          <div className="bg-background-light/80 rounded-xl p-6 border border-green-400/30 shadow-lg flex flex-col items-center">
            <span className="text-3xl font-black text-green-400 mb-2">Lab: Fortress</span>
            <span className="text-lg font-semibold text-white/90">Last Played Lab</span>
          </div>
        </div>

        {/* Recent Requests */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Recent Matchmaking Requests</h2>
          <RequestList requests={requests.map(r => ({
            id: r.id,
            operation: operations.find((op: any) => op.id === r.lab_id)?.name || r.lab_id,
            team: r.team,
            waiting: true
          }))} onJoin={handleJoin} />
        </div>

        {/* Recent Operations */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Recently Added Operations</h2>
            <button className="btn-primary px-6 py-2 text-lg font-bold" onClick={() => navigate('/red-vs-blue/operations')}>View All Operations</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {operations.map(op => (
              <OperationCard key={op.id} name={op.name} description={op.attack_scenario} onSelect={() => navigate(`/red-vs-blue/operations/${op.id}`)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedVsBlueHomePage;
