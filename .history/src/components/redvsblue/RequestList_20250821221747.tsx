import { FC } from 'react';

type Request = { id: number; operation: string; team: 'Red' | 'Blue'; waiting: boolean };

type RequestListProps = {
  requests: Request[];
  onJoin: (req: Request) => void;
};

const RequestList: FC<RequestListProps> = ({ requests, onJoin }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    {requests.length === 0 && <div className="text-white/60">No open requests.</div>}
    {requests.map(req => (
      <div key={req.id} className="bg-background-light/70 rounded-xl p-4 border border-primary/20 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <span className={`font-bold text-lg ${req.team === 'Red' ? 'text-red-400' : 'text-blue-400'}`}>{req.operation}</span>
        </div>
        <span className="text-sm text-white/70 mb-2">Waiting for {req.team === 'Red' ? 'Blue' : 'Red'} Team</span>
        <button className="btn-primary flex items-center gap-1 px-6 py-2 text-lg font-bold mt-2" onClick={() => onJoin(req)}>
          Join as {req.team === 'Red' ? 'Blue' : 'Red'}
        </button>
      </div>
    ))}
  </div>
);

export default RequestList;
