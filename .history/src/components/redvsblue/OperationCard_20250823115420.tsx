import { FC } from 'react';

type OperationCardProps = {
  name: string;
  description: string;
  difficulty?: string;
  redQuestions?: number;
  blueQuestions?: number;
  onSelect: () => void;
};

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500/80 text-white',
  medium: 'bg-yellow-500/80 text-white',
  hard: 'bg-red-500/80 text-white',
  expert: 'bg-fuchsia-600/80 text-white',
};

const OperationCard: FC<OperationCardProps> = ({ name, description, difficulty, redQuestions, blueQuestions, onSelect }) => (
  <div
    className="relative bg-gradient-to-br from-[#1a0a2e] via-background-dark to-[#181024] rounded-2xl p-6 border border-fuchsia-500/30 shadow-2xl flex flex-col items-start hover:scale-105 hover:shadow-fuchsia-500/20 transition-transform cursor-pointer group overflow-hidden"
    onClick={onSelect}
  >
    <div className="absolute -top-4 -right-4 opacity-30 group-hover:opacity-60 transition-all">
      <svg width="80" height="80"><circle cx="40" cy="40" r="36" fill="url(#grad)" /></svg>
    </div>
    <h3 className="text-2xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">{name}</h3>
    <p className="text-white/80 text-sm mb-4">{description}</p>
    <div className="flex gap-3 mb-2">
      {difficulty && (
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${difficultyColors[difficulty] || 'bg-gray-700/80 text-white'}`}>{difficulty}</span>
      )}
      {typeof redQuestions === 'number' && (
        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300">Red Q: {redQuestions}</span>
      )}
      {typeof blueQuestions === 'number' && (
        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">Blue Q: {blueQuestions}</span>
      )}
    </div>
    <span className="mt-auto text-xs text-fuchsia-400 font-bold tracking-wide">Select Operation</span>
  </div>
);

export default OperationCard;
