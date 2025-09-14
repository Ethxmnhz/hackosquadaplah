import React, { useState } from 'react';
import { MatchmakingStatus } from '../components/MatchmakingStatus';

export const MatchmakingPage: React.FC = () => {
  // Simulate matchmaking state
  const [status, setStatus] = useState<'waiting' | 'matched' | 'error'>('waiting');
  const [partnerUsername, setPartnerUsername] = useState<string | undefined>();
  const team: 'Red' | 'Blue' = 'Red'; // Replace with actual team selection

  // Simulate finding a partner after 3 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('matched');
      setPartnerUsername('CyberNinja');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Matchmaking</h1>
      <MatchmakingStatus status={status} partnerUsername={partnerUsername} team={team} />
      {status === 'matched' && (
        <button className="btn-primary mt-8 px-8 py-3 text-lg font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500">Enter Lab</button>
      )}
    </div>
  );
};

export default MatchmakingPage;
