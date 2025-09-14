
import { useState } from 'react';

type QA = { question: string; answer: string };
type OperationLab = {
  name: string;
  attackScenario: string;
  defenseScenario: string;
  redInstructions: string;
  blueInstructions: string;
  redQuestions: QA[];
  blueQuestions: QA[];
  setupType: 'Cloud' | 'Agent';
  setupDetails?: string;
  iconUrl?: string;
};

interface CreateOperationLabPageProps {
  onSubmit: (lab: OperationLab) => void;
}
import { supabase } from '../../lib/supabase';

const CreateOperationLabPage = ({ onSubmit }: CreateOperationLabPageProps) => {
  const [name, setName] = useState('');
  const [attackScenario, setAttackScenario] = useState('');
  const [defenseScenario, setDefenseScenario] = useState('');
  const [redQuestions, setRedQuestions] = useState<QA[]>([]);
  const [blueQuestions, setBlueQuestions] = useState<QA[]>([]);
  const [redQ, setRedQ] = useState('');
  const [redA, setRedA] = useState('');
  const [blueQ, setBlueQ] = useState('');
  const [blueA, setBlueA] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconUrl, setIconUrl] = useState('');

  // Test data loader
  const loadTestData = () => {
    setName('Test Red vs Blue Lab');
    setAttackScenario('Red team must gain access to the internal network and exfiltrate the secret file.');
    setDefenseScenario('Blue team must detect, block, and respond to the red team attack.');
    setRedInstructions('Your goal is to breach the perimeter and capture the flag. Use any tools at your disposal.');
    setBlueInstructions('Monitor logs, set up alerts, and stop the red team from succeeding.');
    setRedQuestions([
      { question: 'What is the IP address of the target machine?', answer: '10.10.10.10' },
      { question: 'Which port is open for SSH?', answer: '22' },
      { question: 'What is the name of the secret file?', answer: 'flag.txt' }
    ]);
    setBlueQuestions([
      { question: 'Which alert was triggered first?', answer: 'IDS Alert 1' },
      { question: 'What was the source IP of the attack?', answer: '192.168.1.100' },
      { question: 'Which user account was compromised?', answer: 'admin' }
    ]);
    setSetupType('Cloud');
    setSetupDetails('This is a test lab setup for demonstration.');
    setIconFile(null);
    setIconUrl('https://www.hackthebox.com/images/landingv3/og/og-b2c-hacking-labs.jpg');
  };
  const [redInstructions, setRedInstructions] = useState('');
  const [blueInstructions, setBlueInstructions] = useState('');
  const [setupType, setSetupType] = useState<'Cloud' | 'Agent'>('Cloud');
  const [setupDetails, setSetupDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addRedQ = () => {
    if (redQ.trim() && redA.trim()) {
      setRedQuestions([...redQuestions, { question: redQ, answer: redA }]);
      setRedQ('');
      setRedA('');
    }
  };
  const addBlueQ = () => {
    if (blueQ.trim() && blueA.trim()) {
      setBlueQuestions([...blueQuestions, { question: blueQ, answer: blueA }]);
      setBlueQ('');
      setBlueA('');
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!name || !attackScenario || !defenseScenario || !redInstructions || !blueInstructions) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    let uploadedIconUrl = iconUrl;
    if (iconFile) {
      const fileExt = iconFile.name.split('.').pop();
      const fileName = `operation-icons/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('public').upload(fileName, iconFile, { upsert: true, contentType: iconFile.type });
      if (uploadError) {
        setError('Icon upload failed: ' + uploadError.message);
        setLoading(false);
        return;
      }
      uploadedIconUrl = supabase.storage.from('public').getPublicUrl(fileName).data.publicUrl;
      setIconUrl(uploadedIconUrl);
    }
    const { error: supaError } = await supabase.from('New_operation').insert([
      {
        name,
        attack_scenario: attackScenario,
        defense_scenario: defenseScenario,
        red_instructions: redInstructions,
        blue_instructions: blueInstructions,
        red_questions: redQuestions,
        blue_questions: blueQuestions,
        setup_type: setupType,
        setup_details: setupDetails,
        icon_url: uploadedIconUrl,
      },
    ]);
    setLoading(false);
    if (supaError) {
      setError(supaError.message);
    } else {
      setSuccess(true);
      if (onSubmit) {
        onSubmit({
          name,
          attackScenario,
          defenseScenario,
          redInstructions,
          blueInstructions,
          redQuestions,
          blueQuestions,
          setupType,
          setupDetails,
          iconUrl: uploadedIconUrl,
        });
      }
      setName(''); setAttackScenario(''); setDefenseScenario(''); setRedInstructions(''); setBlueInstructions(''); setRedQuestions([]); setBlueQuestions([]); setSetupType('Cloud'); setSetupDetails(''); setIconFile(null); setIconUrl('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-background-light/80 p-8 rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold mb-4">Create Operation Lab</h2>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      {success && <div className="text-green-400 mb-2">Operation Lab created successfully!</div>}
  <input className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Lab Name (required)" value={name} onChange={e => setName(e.target.value)} />
  <textarea className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Attack Scenario (Red Team) (required)" value={attackScenario} onChange={e => setAttackScenario(e.target.value)} />
  <textarea className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Defense Scenario (Blue Team) (required)" value={defenseScenario} onChange={e => setDefenseScenario(e.target.value)} />
  <textarea className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Instructions for Red Teamer (required, markdown supported)" value={redInstructions} onChange={e => setRedInstructions(e.target.value)} />
  <textarea className="w-full mb-3 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Instructions for Blue Teamer (required, markdown supported)" value={blueInstructions} onChange={e => setBlueInstructions(e.target.value)} />
      <div className="mb-3">
        <label className="font-bold">Red Teamer Questions & Answers</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Add question for Red Teamer" value={redQ} onChange={e => setRedQ(e.target.value)} />
          <input className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Answer" value={redA} onChange={e => setRedA(e.target.value)} />
          <button type="button" className="btn-primary px-4" onClick={addRedQ}>Add</button>
        </div>
        <ul className="list-disc ml-6 text-sm text-white/80">
          {redQuestions.map((qa, i) => <li key={i}><b>Q:</b> {qa.question} <b>A:</b> {qa.answer}</li>)}
        </ul>
      </div>
      <div className="mb-3">
        <label className="font-bold">Blue Teamer Questions & Answers</label>
        <div className="flex gap-2 mb-2">
          <input className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Add question for Blue Teamer" value={blueQ} onChange={e => setBlueQ(e.target.value)} />
          <input className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Answer" value={blueA} onChange={e => setBlueA(e.target.value)} />
          <button type="button" className="btn-primary px-4" onClick={addBlueQ}>Add</button>
        </div>
        <ul className="list-disc ml-6 text-sm text-white/80">
          {blueQuestions.map((qa, i) => <li key={i}><b>Q:</b> {qa.question} <b>A:</b> {qa.answer}</li>)}
        </ul>
      </div>
      <div className="mb-3">
        <label className="font-bold">Operation Icon</label>
        <input type="file" accept="image/png" onChange={e => setIconFile(e.target.files?.[0] || null)} />
        <div className="flex gap-2 mt-2">
          <input
            type="url"
            className="flex-1 p-2 rounded bg-background-dark/80 border border-primary/30"
            placeholder="Or paste image URL (PNG/JPG)"
            value={iconUrl}
            onChange={e => setIconUrl(e.target.value)}
          />
          <button type="button" className="btn-outline px-3" onClick={loadTestData}>Load Test Data</button>
        </div>
        {iconUrl && <img src={iconUrl} alt="Operation Icon" className="w-16 h-16 mt-2 rounded-full border-2 border-fuchsia-400" />}
      </div>
      <div className="mb-3">
        <label className="font-bold">Lab Setup Type</label>
        <select className="w-full p-2 rounded bg-background-dark/80 border border-primary/30" value={setupType} onChange={e => setSetupType(e.target.value as 'Cloud' | 'Agent')}>
          <option value="Cloud">Cloud</option>
          <option value="Agent">Agent</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="font-bold">Lab Setup Details (optional)</label>
        <textarea className="w-full p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Describe setup details, VM info, etc (optional)" value={setupDetails} onChange={e => setSetupDetails(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>{loading ? 'Creating...' : 'Create Operation Lab'}</button>
    </form>
  );
};

export default CreateOperationLabPage;
