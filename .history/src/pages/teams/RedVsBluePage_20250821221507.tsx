import { useState } from 'react';
import { Flame, Shield, Play, Users, Cpu, Loader2, Plus } from 'lucide-react';



// Dummy data for operations and open requests
type Operation = { id: number; name: string; description: string };
type Request = { id: number; operation: string; team: 'Red' | 'Blue'; waiting: boolean };

const dummyOperations: Operation[] = [
  { id: 1, name: '2018 Cyber Breach', description: 'Simulate the infamous 2018 breach scenario.' },
  { id: 2, name: 'Bank Branch', description: 'Penetrate or defend a modern bank infrastructure.' },
  { id: 3, name: 'Corporate Office', description: 'Corporate espionage and defense simulation.' },
];

const dummyRequests: Request[] = [
  { id: 1, operation: 'Bank Branch', team: 'Red', waiting: true },
  { id: 2, operation: 'Corporate Office', team: 'Blue', waiting: true },
];

const redQuestions: string[] = [
  'Find the initial access vector.',
  'Escalate privileges on the target system.',
  'Exfiltrate sensitive data.',
];
const blueQuestions: string[] = [
  'Detect the intrusion attempt.',
  'Patch the vulnerable service.',
  'Respond to the incident and report.',
];


const RedVsBluePage = () => {
  const [step, setStep] = useState<'list'|'selectRole'|'selectMode'|'waiting'|'lab'>('list');
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Red'|'Blue'|null>(null);
  const [labQuestions, setLabQuestions] = useState<string[]>([]);
  const [openRequests, setOpenRequests] = useState<Request[]>(dummyRequests);
  const [newQuestion, setNewQuestion] = useState('');

  // Handlers
  const handleSelectOperation = (op: Operation) => {
    setSelectedOp(op);
    setStep('selectRole');
  };
  const handleSelectRole = (role: 'Red'|'Blue') => {
    setSelectedRole(role);
    setStep('selectMode');
  };
  const handleSelectMode = (mode: 'AI'|'Player') => {
    if (!selectedOp || !selectedRole) return;
    if (mode === 'AI') {
      setLabQuestions(selectedRole === 'Red' ? redQuestions : blueQuestions);
      setStep('lab');
    } else {
      setOpenRequests([...openRequests, { id: Date.now(), operation: selectedOp.name, team: selectedRole, waiting: true }]);
      setStep('waiting');
      setTimeout(() => {
        setLabQuestions(selectedRole === 'Red' ? redQuestions : blueQuestions);
        setStep('lab');
      }, 3000);
    }
  };
  const handleJoinRequest = (req: Request) => {
    const op = dummyOperations.find(o => o.name === req.operation);
    if (!op) return;
    setSelectedOp(op);
    const joinRole: 'Red'|'Blue' = req.team === 'Red' ? 'Blue' : 'Red';
    setSelectedRole(joinRole);
    setLabQuestions(joinRole === 'Red' ? redQuestions : blueQuestions);
    setStep('lab');
  };
  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setLabQuestions([...labQuestions, newQuestion]);
      setNewQuestion('');
    }
  };
  const handleBack = () => {
    setStep('list');
    setSelectedOp(null);
    setSelectedRole(null);
    setLabQuestions([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-16">
      <div className="max-w-4xl w-full text-center">
        <div className="flex justify-center mb-6">
          <span className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-accent-blue text-white text-xl font-black tracking-widest shadow-lg animate-pulse-slow border border-primary/40 uppercase" style={{letterSpacing:'0.22em'}}>Red vs Blue</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text drop-shadow-[0_2px_24px_rgba(127,90,240,0.25)] animate-fade-in">
          The Ultimate Cyber Arena
        </h1>
        <p className="text-2xl md:text-3xl text-white max-w-2xl mx-auto mb-10 animate-fade-in font-semibold" style={{textShadow:'0 2px 16px #7f5af0cc'}}>
          Red Team vs Blue Team. Relive legendary breaches, defend against real tactics, and experience cyber warfare with friends and rivals.
        </p>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 mb-12 animate-fade-in">
          <div className="bg-background-light/80 rounded-xl p-6 border border-primary/30 shadow-lg flex flex-col items-center">
            <span className="text-3xl font-black text-fuchsia-400 mb-2">1,250</span>
            <span className="text-lg font-semibold text-white/90">Total Points</span>
          </div>
          <div className="bg-background-light/80 rounded-xl p-6 border border-accent-blue/30 shadow-lg flex flex-col items-center">
            <span className="text-3xl font-black text-accent-blue mb-2">Lab: Fortress</span>
            <span className="text-lg font-semibold text-white/90">Last Played Lab</span>
          </div>
          <div className="bg-background-light/80 rounded-xl p-6 border border-green-400/30 shadow-lg flex flex-col items-center">
            <span className="text-3xl font-black text-green-400 mb-2">Aug 20, 2025</span>
            <span className="text-lg font-semibold text-white/90">Last Played</span>
          </div>
        </div>

        {/* Step 1: List of Operations */}
        {step === 'list' && (
          <>
            <h2 className="text-3xl font-bold mb-6">Available Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {dummyOperations.map(op => (
                <div key={op.id} className="bg-background-light/80 rounded-2xl p-6 border border-primary/30 shadow-xl flex flex-col items-center hover:scale-105 transition-transform cursor-pointer" onClick={() => handleSelectOperation(op)}>
                  <Flame className="h-8 w-8 text-fuchsia-400 mb-2" />
                  <h3 className="text-xl font-bold mb-1">{op.name}</h3>
                  <p className="text-white/80 text-sm mb-2">{op.description}</p>
                  <span className="text-xs text-primary/80">Select Operation</span>
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-4">Open Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {openRequests.length === 0 && <div className="text-white/60">No open requests.</div>}
              {openRequests.map(req => (
                <div key={req.id} className="bg-background-light/70 rounded-xl p-4 border border-primary/20 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    {req.team === 'Red' ? <Flame className="h-5 w-5 text-red-400" /> : <Shield className="h-5 w-5 text-blue-400" />}
                    <span className="font-bold text-lg">{req.operation}</span>
                  </div>
                  <span className="text-sm text-white/70 mb-2">Waiting for {req.team === 'Red' ? 'Blue' : 'Red'} Team</span>
                  <button className="btn-primary flex items-center gap-1 px-6 py-2 text-lg font-bold mt-2" onClick={() => handleJoinRequest(req)}>
                    <Users className="h-5 w-5" /> Join as {req.team === 'Red' ? 'Blue' : 'Red'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Select Role */}
        {step === 'selectRole' && selectedOp && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Choose Your Side</h2>
            <div className="flex gap-8">
              <button className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => handleSelectRole('Red')}>
                <Flame className="h-8 w-8 mb-1" /> Red Team
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => handleSelectRole('Blue')}>
                <Shield className="h-8 w-8 mb-1" /> Blue Team
              </button>
            </div>
            <button className="mt-8 text-primary underline" onClick={handleBack}>Back</button>
          </div>
        )}

        {/* Step 3: Select Mode */}
        {step === 'selectMode' && selectedRole && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">How do you want to play?</h2>
            <div className="flex gap-8">
              <button className="bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => handleSelectMode('AI')}>
                <Cpu className="h-8 w-8 mb-1" /> Play vs AI
              </button>
              <button className="bg-gradient-to-r from-green-500 to-lime-500 text-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-xl font-bold hover:scale-105 transition-transform" onClick={() => handleSelectMode('Player')}>
                <Users className="h-8 w-8 mb-1" /> Play vs Player
              </button>
            </div>
            <button className="mt-8 text-primary underline" onClick={handleBack}>Back</button>
          </div>
        )}

        {/* Step 4: Waiting for Partner */}
        {step === 'waiting' && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-2" />
            <h2 className="text-3xl font-bold mb-2">Waiting for your partner...</h2>
            <p className="text-lg text-white/80">Share the link or wait for someone to join as the opposite team.</p>
            <button className="mt-8 text-primary underline" onClick={handleBack}>Cancel</button>
          </div>
        )}

        {/* Step 5: Lab Interface */}
        {step === 'lab' && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            <h2 className="text-3xl font-bold mb-2">{selectedOp?.name} - {selectedRole} Team</h2>
            <div className="w-full max-w-xl bg-background-light/80 rounded-2xl p-8 border border-primary/30 shadow-xl flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4">{selectedRole === 'Red' ? 'Attack Objectives' : 'Defense Objectives'}</h3>
              <ul className="text-left w-full space-y-3 mb-6">
                {labQuestions.map((q, i) => (
                  <li key={i} className="bg-background-dark/60 rounded-lg px-4 py-3 border-l-4 border-primary/60 text-white/90 shadow-sm">{q}</li>
                ))}
              </ul>
              {selectedRole === 'Blue' && (
                <div className="w-full flex flex-col gap-2 mt-4">
                  <input
                    className="px-4 py-2 rounded-lg bg-background-dark/80 border border-primary/30 text-white placeholder:text-white/60"
                    placeholder="Add a new challenge for Red Team..."
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                  />
                  <button className="btn-primary flex items-center gap-1 px-6 py-2 text-lg font-bold mt-1 self-end" onClick={handleAddQuestion}>
                    <Plus className="h-5 w-5" /> Add
                  </button>
                </div>
              )}
            </div>
            <button className="mt-8 text-primary underline" onClick={handleBack}>Back to Operations</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default RedVsBluePage;
