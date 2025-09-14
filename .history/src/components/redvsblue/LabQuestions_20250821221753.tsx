import { FC } from 'react';

type LabQuestionsProps = {
  questions: string[];
  role: 'Red' | 'Blue';
  onAddQuestion?: (q: string) => void;
};

const LabQuestions: FC<LabQuestionsProps> = ({ questions, role, onAddQuestion }) => {
  const [newQ, setNewQ] = React.useState('');
  return (
    <div className="w-full max-w-xl bg-background-light/80 rounded-2xl p-8 border border-primary/30 shadow-xl flex flex-col items-center">
      <h3 className="text-xl font-bold mb-4">{role === 'Red' ? 'Attack Objectives' : 'Defense Objectives'}</h3>
      <ul className="text-left w-full space-y-3 mb-6">
        {questions.map((q, i) => (
          <li key={i} className="bg-background-dark/60 rounded-lg px-4 py-3 border-l-4 border-primary/60 text-white/90 shadow-sm">{q}</li>
        ))}
      </ul>
      {role === 'Blue' && onAddQuestion && (
        <div className="w-full flex flex-col gap-2 mt-4">
          <input
            className="px-4 py-2 rounded-lg bg-background-dark/80 border border-primary/30 text-white placeholder:text-white/60"
            placeholder="Add a new challenge for Red Team..."
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
          />
          <button className="btn-primary flex items-center gap-1 px-6 py-2 text-lg font-bold mt-1 self-end" onClick={() => { if(newQ.trim()){ onAddQuestion(newQ); setNewQ(''); } }}>
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default LabQuestions;
