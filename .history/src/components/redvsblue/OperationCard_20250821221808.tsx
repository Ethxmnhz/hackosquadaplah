import { FC } from 'react';

type OperationCardProps = {
  name: string;
  description: string;
  onSelect: () => void;
};

const OperationCard: FC<OperationCardProps> = ({ name, description, onSelect }) => (
  <div className="bg-background-light/80 rounded-2xl p-6 border border-primary/30 shadow-xl flex flex-col items-center hover:scale-105 transition-transform cursor-pointer" onClick={onSelect}>
    <h3 className="text-xl font-bold mb-1">{name}</h3>
    <p className="text-white/80 text-sm mb-2">{description}</p>
    <span className="text-xs text-primary/80">Select Operation</span>
  </div>
);

export default OperationCard;
