import React from 'react';
import { TeamCard } from '../components/TeamCard';

export const LobbyPage: React.FC = () => {
  // Placeholder for user/team selection
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-16">
      <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">Red vs Blue Lobby</h1>
      <div className="flex gap-12 mb-12">
        <TeamCard team="Red" />
        <TeamCard team="Blue" />
      </div>
      <div className="text-white/80 text-lg max-w-xl text-center mb-8">
        Select your team and get ready to join a real-time cyber operation! Compete, collaborate, and climb the leaderboard.
      </div>
      <button className="btn-primary px-12 py-4 text-xl font-bold shadow-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-cyan-500 hover:to-fuchsia-500 transition-all">Start Matchmaking</button>
    </div>
  );
};

export default LobbyPage;
