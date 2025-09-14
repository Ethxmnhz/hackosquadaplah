import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const RedVsBlueSessionsAdminPage = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all sessions and requests, subscribe to changes
  useEffect(() => {
    let sessionChannel: any = null;
    let requestChannel: any = null;
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: sessionData }, { data: requestData }] = await Promise.all([
        supabase.from('lab_sessions').select('*, lab:New_operation(name)').order('created_at', { ascending: false }),
        supabase.from('match_requests').select('*').order('created_at', { ascending: false })
      ]);
      setSessions(sessionData || []);
      setRequests(requestData || []);
      setLoading(false);
    };
    fetchAll();
    sessionChannel = supabase
      .channel('admin_lab_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_sessions' }, fetchAll)
      .subscribe();
    requestChannel = supabase
      .channel('admin_match_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests' }, fetchAll)
      .subscribe();
    return () => {
      if (sessionChannel) supabase.removeChannel(sessionChannel);
      if (requestChannel) supabase.removeChannel(requestChannel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12">
      <div className="max-w-7xl mx-auto w-full">
        <h1 className="text-4xl font-black mb-8">Red vs Blue Admin Panel</h1>
        {loading && <div className="text-primary mb-4">Loading...</div>}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Active & Recent Sessions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-background-light/80 rounded-xl">
              <thead>
                <tr>
                  <th className="px-4 py-2">Session ID</th>
                  <th className="px-4 py-2">Lab</th>
                  <th className="px-4 py-2">Red User</th>
                  <th className="px-4 py-2">Blue User</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-primary/10">
                    <td className="px-4 py-2 font-mono text-xs">{s.id}</td>
                    <td className="px-4 py-2">{s.lab?.name || s.lab_id}</td>
                    <td className="px-4 py-2">{s.red_user_id}</td>
                    <td className="px-4 py-2">{s.blue_user_id}</td>
                    <td className="px-4 py-2">{s.status}</td>
                    <td className="px-4 py-2">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">All Match Requests</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-background-light/80 rounded-xl">
              <thead>
                <tr>
                  <th className="px-4 py-2">Request ID</th>
                  <th className="px-4 py-2">Lab</th>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Partner</th>
                  <th className="px-4 py-2">Session</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-primary/10">
                    <td className="px-4 py-2 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-2">{r.lab_id}</td>
                    <td className="px-4 py-2">{r.user_id}</td>
                    <td className="px-4 py-2">{r.team}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2">{r.partner_id}</td>
                    <td className="px-4 py-2">{r.session_id}</td>
                    <td className="px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedVsBlueSessionsAdminPage;
