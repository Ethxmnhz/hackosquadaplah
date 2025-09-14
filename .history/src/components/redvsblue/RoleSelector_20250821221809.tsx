import { FC } from 'react';

type RoleSelectorProps = {
  onSelect: (role: 'Red' | 'Blue') => void;
  onBack: () => void;
};

const RoleSelector: FC<RoleSelectorProps> = ({ onSelect, onBack }) => (
  <div className="flex flex-col items-center gap-8 animate-fade-in">
    <h2 className="text-3xl font-bold mb-4">Choose Your Side</h2>
    <div className="flex gap-8">
      <button className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => onSelect('Red')}>
        Red Team
      </button>
      <button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => onSelect('Blue')}>
        Blue Team
      </button>
    </div>
    <button className="mt-8 text-primary underline" onClick={onBack}>Back</button>
  </div>
);

export default RoleSelector;
