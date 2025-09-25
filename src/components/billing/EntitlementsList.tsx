import React, { useEffect, useState } from 'react';
import { getEntitlements } from '../../lib/api';

interface Entitlement { id: string; scope: string; active: boolean; ends_at?: string | null }

export const EntitlementsList: React.FC = () => {
  const [items, setItems] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ents = await getEntitlements();
        setItems(ents as any);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading entitlements...</div>;
  if (!items.length) return <div className="text-sm text-gray-500">No entitlements yet.</div>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map(e => (
        <li key={e.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 rounded px-2 py-1">
          <span>{e.scope}</span>
          <span className={`text-xs ${e.active ? 'text-green-600' : 'text-gray-400'}`}>{e.active ? 'active' : 'inactive'}</span>
        </li>
      ))}
    </ul>
  );
};

export default EntitlementsList;
