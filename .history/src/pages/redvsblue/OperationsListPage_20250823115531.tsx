import { useEffect, useState } from 'react';
import OperationCard from '../../components/redvsblue/OperationCard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface OperationLab {
  id: string;
  name: string;
  attack_scenario: string;
  defense_scenario: string;
  red_questions: string[];
  blue_questions: string[];
  difficulty?: string;
}

const OperationsListPage = () => {
  const navigate = useNavigate();
  const [labs, setLabs] = useState<OperationLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLabs = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('New_operation').select('*').order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setLabs(data || []);
      setLoading(false);
    };
    fetchLabs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12 relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg width="100%" height="100%">
          <defs>
            <radialGradient id="oplab-bg" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0A030F" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#oplab-bg)" />
        </svg>
      </div>
      <div className="max-w-6xl mx-auto w-full relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
          <div>
            <h2 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">Select an Operation Lab</h2>
            <div className="text-white/80 text-lg">Step 1: Choose a lab to begin your Red vs Blue match.</div>
          </div>
        </div>
        {loading && <div className="text-primary mb-4">Loading...</div>}
        {error && <div className="text-red-400 mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {labs.map(op => (
            <OperationCard
              key={op.id}
              name={op.name}
              description={op.attack_scenario}
              difficulty={op.difficulty}
              redQuestions={op.red_questions?.length}
              blueQuestions={op.blue_questions?.length}
              onSelect={() => navigate(`/red-vs-blue/operations/${op.id}`)}
            />
          ))}
        </div>
        {!loading && labs.length === 0 && <div className="text-white/60">No operations found.</div>}
      </div>
    </div>
  );
};

export default OperationsListPage;
