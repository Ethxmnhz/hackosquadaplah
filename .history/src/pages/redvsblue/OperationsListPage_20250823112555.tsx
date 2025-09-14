import React, { useEffect, useState } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-12">
      <div className="max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-8">All Operations</h2>
        {loading && <div className="text-primary mb-4">Loading...</div>}
        {error && <div className="text-red-400 mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {labs.map(op => (
            <OperationCard key={op.id} name={op.name} description={op.attack_scenario} onSelect={() => navigate(`/red-vs-blue/operations/${op.id}`)} />
          ))}
        </div>
        {!loading && labs.length === 0 && <div className="text-white/60">No operations found.</div>}
      </div>
    </div>
  );
};

export default OperationsListPage;
