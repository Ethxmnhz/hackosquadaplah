import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-16">
      <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 drop-shadow-lg">Red vs Blue</h1>
      <div className="text-white/90 text-xl max-w-2xl text-center mb-8">
        Welcome to the ultimate cyber operations arena!<br />
        Compete as Red or Blue, solve real-world scenarios, and climb the leaderboard. <br />
        <span className="text-fuchsia-400 font-bold">Step 1:</span> Browse and select an Operation Lab to begin.
      </div>
      <button
        className="btn-primary px-12 py-4 text-2xl font-bold shadow-lg bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-cyan-500 hover:to-fuchsia-500 transition-all rounded-xl"
        onClick={() => navigate('/red-vs-blue/operations')}
      >
        Browse Operation Labs
      </button>
    </div>
  );
};

export default LobbyPage;
