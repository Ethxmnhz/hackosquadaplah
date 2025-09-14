
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const CreateOperationLabPage = () => {
  const [name, setName] = useState('');
  const [attackScenario, setAttackScenario] = useState('');
  const [defenseScenario, setDefenseScenario] = useState('');
  const [redQuestions, setRedQuestions] = useState<string[]>([]);
  const [blueQuestions, setBlueQuestions] = useState<string[]>([]);
  const [redQ, setRedQ] = useState('');
  const [blueQ, setBlueQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addRedQ = () => {
    if (redQ.trim()) {
      setRedQuestions([...redQuestions, redQ]);
      setRedQ('');
    }
  };
  const addBlueQ = () => {
    if (blueQ.trim()) {
      setBlueQuestions([...blueQuestions, blueQ]);
      setBlueQ('');
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!name || !attackScenario || !defenseScenario) return;
    setLoading(true);
  const { error: supaError } = await supabase.from('New_operation').insert([
      {
        name,
        attack_scenario: attackScenario,
        defense_scenario: defenseScenario,
        red_questions: redQuestions,
        blue_questions: blueQuestions,
      },
    ]);
    setLoading(false);
    if (supaError) {
      setError(supaError.message);
    } else {
      setSuccess(true);
      setName(''); setAttackScenario(''); setDefenseScenario(''); setRedQuestions([]); setBlueQuestions([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-background-light/80 p-8 rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4">Create Operation Lab</h2>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      {success && <div className="text-green-400 mb-2">Operation Lab created successfully!</div>}
      <input className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Lab Name" value={name} onChange={e => setName(e.target.value)} />
      <textarea className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Attack Scenario" value={attackScenario} onChange={e => setAttackScenario(e.target.value)} />
      <textarea className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Defense Scenario" value={defenseScenario} onChange={e => setDefenseScenario(e.target.value)} />
      <div className="mb-3">
        <label className="font-bold">Red Teamer Questions</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Add question" value={redQ} onChange={e => setRedQ(e.target.value)} />
          <button type="button" className="btn-primary px-4" onClick={addRedQ}>Add</button>
        </div>
        <ul className="list-disc ml-6 text-sm text-white/80">
          {redQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      </div>
      <div className="mb-3">
        <label className="font-bold">Blue Teamer Questions</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Add question" value={blueQ} onChange={e => setBlueQ(e.target.value)} />
          <button type="button" className="btn-primary px-4" onClick={addBlueQ}>Add</button>
        </div>
        <ul className="list-disc ml-6 text-sm text-white/80">
          {blueQuestions.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      </div>
      <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>{loading ? 'Creating...' : 'Create Operation Lab'}</button>
    </form>
  );
};

export default CreateOperationLabPage;
