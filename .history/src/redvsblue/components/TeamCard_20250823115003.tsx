import React from 'react';

interface TeamCardProps {
  team: 'Red' | 'Blue';
  selected?: boolean;
  onClick?: () => void;
  username?: string;
  avatarUrl?: string;
}

const teamColors = {
  Red: 'from-red-600 to-pink-500',
  Blue: 'from-blue-600 to-cyan-500',
};

export const TeamCard: React.FC<TeamCardProps> = ({ team, selected, onClick, username, avatarUrl }) => (
  <div
    className={`cursor-pointer rounded-xl p-6 shadow-lg bg-gradient-to-br ${teamColors[team]} border-4 transition-all duration-200 ${selected ? 'border-yellow-400 scale-105' : 'border-transparent'}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <img src={avatarUrl} alt={username} className="w-12 h-12 rounded-full border-2 border-white" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white border-2 border-white">
          {username ? username[0].toUpperCase() : team[0]}
        </div>
      )}
      <div>
        <div className={`font-bold text-2xl ${team === 'Red' ? 'text-red-200' : 'text-blue-200'}`}>{team} Team</div>
        {username && <div className="text-white/80 text-sm">{username}</div>}
      </div>
    </div>
  </div>
);
