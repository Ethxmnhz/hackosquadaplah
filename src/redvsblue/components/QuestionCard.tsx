import React, { useState } from 'react';

interface QuestionCardProps {
  qa: { question: string; answer: string };
  team: 'Red' | 'Blue';
  qIndex: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ qa, team, qIndex }) => {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [points, setPoints] = useState(0);
  // For demo, each question is 10 points
  const questionPoints = 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (answer.trim().toLowerCase() === qa.answer.trim().toLowerCase()) {
      setFeedback('Correct!');
      setPoints(questionPoints);
    } else {
      setFeedback('Incorrect. Try again!');
      setPoints(0);
    }
  };

  return (
    <div className={`rounded-xl p-4 shadow-md border-2 flex flex-col gap-2 ${team === 'Red' ? 'border-red-400 bg-[#2a0a1f]/60' : 'border-blue-400 bg-[#0a1a2e]/60'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-bold ${team === 'Red' ? 'text-red-300' : 'text-blue-300'}`}>Q{qIndex + 1}:</span>
        <span className="text-white/90 font-medium">{qa.question}</span>
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-bold ${team === 'Red' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>{questionPoints} pts</span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          className="flex-1 rounded-lg px-2 py-1 text-black"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Your answer..."
          disabled={submitted && feedback === 'Correct!'}
        />
        <button type="submit" className={`btn-primary px-4 py-1 ${team === 'Red' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`} disabled={submitted && feedback === 'Correct!'}>
          {feedback === 'Correct!' ? '✓' : 'Check'}
        </button>
      </form>
      {feedback && (
        <div className={`mt-1 text-sm font-bold ${feedback === 'Correct!' ? 'text-green-400' : 'text-red-400'}`}>{feedback}</div>
      )}
    </div>
  );
};

export default QuestionCard;
