import React, { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import { List } from 'react-window';
import OperationRequestCard from './OperationRequestCard';

interface OperationRequestListProps {
  requests: any[];
  labs: any[];
  onJoin: (req: any) => void;
  onInvite: (req: any, username: string) => void;
  inviting: boolean;
}

const OperationRequestList: React.FC<OperationRequestListProps> = ({ requests, labs, onJoin, onInvite, inviting }) => {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [labFilter, setLabFilter] = useState('all');

  const filtered = useMemo(() => {
    return requests.filter(req => {
      const lab = labs.find(l => l.id === req.lab_id);
      const matchesSearch =
        req.username?.toLowerCase().includes(search.toLowerCase()) ||
        lab?.name?.toLowerCase().includes(search.toLowerCase()) ||
        req.team?.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter === 'all' || req.team === teamFilter;
      const matchesLab = labFilter === 'all' || req.lab_id === labFilter;
      return matchesSearch && matchesTeam && matchesLab;
    });
  }, [requests, labs, search, teamFilter, labFilter]);

  // Use closure to access filtered, labs, onJoin, onInvite, inviting
  const { user } = useAuth();
  const { approveJoinRequest, rejectJoinRequest } = useOperations();
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const req = filtered[index];
    const lab = labs.find((l: any) => l.id === req.lab_id);
    const isCreator = user && (user.id === req.red_team_user);
    const awaitingApproval = req.status === 'awaiting_approval';
    return (
      <div style={{...style, paddingRight: 8, paddingLeft: 8}}>
        <div className={
          `transition group bg-background-light/80 border border-primary/10 rounded-xl px-5 py-4 mb-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 shadow-sm hover:shadow-lg hover:border-primary/40 hover:bg-background-light/90`}
        >
          <span className={`font-bold text-base md:text-lg ${req.team==='Red'?'text-red-400':'text-blue-400'}`}>{req.team} Team</span>
          <span className="text-white/80 text-base md:text-lg">Lab: {lab?.name || req.lab_id}</span>
          <span className="text-white/60 text-xs md:text-sm">By: {req.username || req.user_id}</span>
          <span className="text-white/40 text-xs md:text-sm">{new Date(req.created_at).toLocaleString()}</span>
          <div className="flex gap-2 items-center ml-auto mt-2 md:mt-0">
            <button className="btn-primary px-4 py-1.5 text-xs md:text-sm rounded-lg font-semibold shadow hover:scale-105 transition" onClick={()=>onJoin(req)}>Join</button>
            <input type="text" className="input input-xs w-32 md:w-40 bg-background-dark/60 border border-primary/20 text-white rounded-md px-2 py-1 focus:border-primary/60 transition" placeholder="Invite username" />
            <button className="btn-outline px-3 py-1.5 text-xs md:text-sm rounded-lg font-semibold border border-primary/40 text-primary hover:bg-primary/10 transition" disabled={inviting} onClick={()=>onInvite(req, '')}>
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
            {/* Approve/Reject UI for creator */}
            {isCreator && awaitingApproval && (
              <>
                <button
                  className="btn-primary bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-semibold transition"
                  disabled={approving === req.id}
                  onClick={async () => {
                    setApproving(req.id);
                    await approveJoinRequest(req.id);
                    setApproving(null);
                  }}
                >
                  {approving === req.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  className="btn-outline bg-red-600/10 border border-red-600 text-red-400 px-3 py-1.5 rounded-lg font-semibold transition"
                  disabled={rejecting === req.id}
                  onClick={async () => {
                    setRejecting(req.id);
                    await rejectJoinRequest(req.id);
                    setRejecting(null);
                  }}
                >
                  {rejecting === req.id ? 'Rejecting...' : 'Reject'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8 p-0 bg-background-dark/90 rounded-2xl border border-primary/30 shadow-xl overflow-hidden">
      {/* Sticky search/filter bar */}
      <div className="sticky top-0 z-10 bg-background-dark/95 px-6 pt-6 pb-4 border-b border-primary/10 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 backdrop-blur">
        <input
          className="input input-md w-full md:w-72 bg-background-light/80 border border-primary/20 focus:border-primary/60 text-white placeholder:text-white/40 rounded-lg shadow-sm transition"
          placeholder="🔍 Search by user, lab, or team..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input input-md bg-background-light/80 border border-primary/20 text-white rounded-lg shadow-sm transition" value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}>
          <option value="all">All Teams</option>
          <option value="Red">Red Team</option>
          <option value="Blue">Blue Team</option>
        </select>
        <select className="input input-md bg-background-light/80 border border-primary/20 text-white rounded-lg shadow-sm transition" value={labFilter} onChange={e=>setLabFilter(e.target.value)}>
          <option value="all">All Labs</option>
          {labs.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
        </select>
      </div>
      <div style={{height: 400}}>
        <List
          height={400}
          rowCount={filtered.length}
          rowHeight={80}
          width={"100%"}
          rowComponent={Row}
          rowProps={{}}
        />
      </div>
      {filtered.length === 0 && <div className="text-white/60 mt-4">No requests found.</div>}
    </div>
  );
};

export default OperationRequestList;
