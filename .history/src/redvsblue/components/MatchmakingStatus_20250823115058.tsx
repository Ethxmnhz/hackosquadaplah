import React from 'react';

interface MatchmakingStatusProps {
  status: 'waiting' | 'matched' | 'error';
  partnerUsername?: string;
  team: 'Red' | 'Blue';
}

export const MatchmakingStatus: React.FC<MatchmakingStatusProps> = ({ status, partnerUsername, team }) => {
  if (status === 'waiting') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        <div className="text-lg text-white/90">Waiting for a {team === 'Red' ? 'Blue' : 'Red'} Teamer to join...</div>
      </div>
    );
  }
  if (status === 'matched') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-green-400 text-2xl font-bold">Partner found!</div>
        {partnerUsername && <div className="text-white/80">Partner: <span className="font-bold">{partnerUsername}</span></div>}
      </div>
    );
  }
  return <div className="text-red-400">An error occurred. Please try again.</div>;
};
