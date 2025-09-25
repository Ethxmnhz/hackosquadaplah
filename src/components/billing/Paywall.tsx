import React, { useState } from 'react';
import { useEntitlements } from '../../hooks/useEntitlements';
import { bestMatchingEntitlement } from '../../lib/billing';
import { redeemVoucher } from '../../lib/api';
import { useBilling } from '../../contexts/BillingContext';

interface PaywallProps {
  required: string; // entitlement scope required to show children
  children: React.ReactNode;
  fallback?: React.ReactNode; // optional custom fallback UI
}

// Basic placeholder component. Later enhance with pricing catalog & actions.
export const Paywall: React.FC<PaywallProps> = ({ required, children, fallback }) => {
  const { entitlements, loading, hasEntitlement, refresh } = useEntitlements();
  const [redeemMode, setRedeemMode] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const billing = useBilling();

  if (loading) return <div className="text-sm text-gray-500">Checking access...</div>;

  const allowed = hasEntitlement(required);
  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const matched = bestMatchingEntitlement(required, entitlements);

  async function submitVoucher(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true); setError(null); setMessage(null);
    try {
      const res = await redeemVoucher(code.trim());
      if (res.success) {
        setMessage('Voucher redeemed successfully');
        setCode('');
        await refresh();
      } else {
        setError(res.error || 'Redeem failed');
      }
    } catch (e:any) {
      setError(e.message || 'Redeem failed');
    } finally { setRedeeming(false); }
  }

  return (
    <div className="border rounded p-4 bg-gray-50 dark:bg-gray-900/40">
      <p className="font-semibold mb-2">Locked Content</p>
      <p className="text-sm mb-3">You need entitlement <code>{required}</code> to access this.
        {matched && <span className="block mt-1">You currently have: <code>{matched.scope}</code></span>}
      </p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => billing.showUpgrade(required)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Upgrade Plan</button>
        <button onClick={() => billing.showPurchase(required)} className="px-3 py-1 text-sm bg-emerald-600 text-white rounded">Buy One-Time</button>
        <button onClick={() => setRedeemMode(m => !m)} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded">Redeem Voucher</button>
      </div>
      {redeemMode && (
        <form onSubmit={submitVoucher} className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Voucher code" className="flex-1 rounded border px-2 py-1 text-sm bg-white dark:bg-gray-800" />
            <button disabled={redeeming || !code} className="px-3 py-1 text-sm bg-emerald-600 text-white rounded disabled:opacity-50">{redeeming ? 'Redeeming...' : 'Apply'}</button>
          </div>
          {message && <p className="text-xs text-green-600">{message}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}
      <p className="text-xs text-gray-500 mt-3">Use a plan, one-time purchase, or voucher to unlock.</p>
    </div>
  );
};
