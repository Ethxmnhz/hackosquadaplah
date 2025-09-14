import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const LabInterfacePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const team = searchParams.get('team');
  const ai = searchParams.get('ai');
  const [lab, setLab] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLab = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('New_operation').select('*').eq('id', id).single();
      if (error) setError(error.message);
      else setLab(data);
      setLoading(false);
    };
    if (id) fetchLab();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white px-4 py-16">
      {loading && <div className="text-primary mb-4">Loading...</div>}
      {error && <div className="text-red-400 mb-4">{error}</div>}
      {lab && (
        <div className="w-full max-w-2xl bg-background-light/80 rounded-xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold mb-2">{lab.name} - {team} Team</h2>
          <div className="mb-4">
            <div className="font-bold text-lg mb-1 text-fuchsia-400">Attack Scenario</div>
            <div className="text-white/90 mb-2">{lab.attack_scenario}</div>
            <div className="font-bold text-lg mb-1 text-accent-blue">Defense Scenario</div>
            <div className="text-white/90 mb-2">{lab.defense_scenario}</div>
            {ai && <div className="mb-4 text-fuchsia-400">(AI Opponent)</div>}
          </div>
          <div className="mb-4">
            <div className="font-bold text-lg mb-2">Your Questions</div>
            <ul className="list-disc ml-6 text-white/80">
              {(team === 'Red' ? lab.red_questions : lab.blue_questions).map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
          {/* TODO: Show VM details, allow blue team to add questions, etc. */}
        </div>
      )}
    </div>
  );
};

export default LabInterfacePage;
