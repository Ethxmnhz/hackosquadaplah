import React, { ReactNode, useState } from 'react';
import { useContentAccess } from '../../hooks/useContentAccess';
import { supabase } from '../../lib/supabase';

interface GateProps {
  content_type: string;
  content_id: string;
  children: ReactNode;
  className?: string;
}

export const Gate: React.FC<GateProps> = ({ content_type, content_id, children, className }) => {
  const access = useContentAccess(content_type, content_id);
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (access.loading) return <div className={className}>Loading access...</div>;
  if (access.allow) return <>{children}</>;

  const onUpgrade = (plan: string) => {
    // simple redirect to existing upgrade flow (assumes a page exists)
    window.location.href = `/upgrade?plan=${plan}`;
  };

  const createPurchase = async () => {
    setError(null); setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/functions/v1/purchase-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'create', content_type, content_id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'CREATE_FAILED');
      setOrder(json);
    } catch (e: any) {
      setError(e.message);
    } finally { setCreating(false); }
  };

  return (
    <div className={className}>
      <div className="border rounded p-4 space-y-3 bg-gray-50">
        <div className="font-semibold text-gray-800">Access Required</div>
        {access.required_plan && (
          <div className="text-sm text-gray-600">
            Requires plan: <span className="font-medium">{access.required_plan}</span>
          </div>
        )}
        {access.individual_price && (
          <div className="text-sm text-gray-600">
            Or purchase individually: <span className="font-medium">₹{access.individual_price}</span>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {access.required_plan && (
            <button onClick={() => onUpgrade(access.required_plan!)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500">
              Upgrade to {access.required_plan}
            </button>
          )}
          {access.individual_price && (
            <button disabled={creating} onClick={createPurchase} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-500 disabled:opacity-50">
              {creating ? 'Creating...' : 'Buy Access'}
            </button>
          )}
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        {order && (
          <div className="text-xs text-gray-700 space-y-1">
            <div>Order Created</div>
            <pre className="bg-white border rounded p-2 overflow-auto max-h-40 text-[10px]">{JSON.stringify(order, null, 2)}</pre>
            <div className="text-[10px] text-gray-500">Integrate Razorpay checkout here (client JS) then call verify.</div>
          </div>
        )}
      </div>
    </div>
  );
};
