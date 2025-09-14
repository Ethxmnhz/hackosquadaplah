import { FC } from 'react';

type ModeSelectorProps = {
  onSelect: (mode: 'AI' | 'Player') => void;
  onBack: () => void;
};

const ModeSelector: FC<ModeSelectorProps> = ({ onSelect, onBack }) => (
  <div className="flex flex-col items-center gap-8 animate-fade-in">
    <h2 className="text-3xl font-bold mb-4">How do you want to play?</h2>
    <div className="flex gap-8">
      <button className="bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => onSelect('AI')}>
        Play vs AI
      </button>
      <button className="bg-gradient-to-r from-green-500 to-lime-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => onSelect('Player')}>
        Play vs Player
      </button>
    </div>
    <button className="mt-8 text-primary underline" onClick={onBack}>Back</button>
  </div>
);

export default ModeSelector;
