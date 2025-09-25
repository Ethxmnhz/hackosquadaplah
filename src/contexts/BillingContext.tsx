import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface BillingModalState {
  open: boolean;
  requiredScope?: string;
  mode: 'upgrade' | 'purchase';
}

interface BillingContextValue {
  showUpgrade: (requiredScope?: string) => void;
  showPurchase: (requiredScope?: string) => void;
  hide: () => void;
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

export const useBilling = () => {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    // Graceful fallback: return no-op handlers so UI doesn't explode if provider not mounted yet.
    return {
      showUpgrade: () => console.warn('BillingProvider missing: showUpgrade ignored'),
      showPurchase: () => console.warn('BillingProvider missing: showPurchase ignored'),
      hide: () => {}
    } as BillingContextValue;
  }
  return ctx;
};

export const BillingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BillingModalState>({ open: false, mode: 'upgrade' });

  const showUpgrade = useCallback((requiredScope?: string) => setState({ open: true, requiredScope, mode: 'upgrade' }), []);
  const showPurchase = useCallback((requiredScope?: string) => setState({ open: true, requiredScope, mode: 'purchase' }), []);
  const hide = useCallback(() => setState(s => ({ ...s, open: false })), []);

  return (
    <BillingContext.Provider value={{ showUpgrade, showPurchase, hide }}>
      {children}
      <BillingModal state={state} onClose={hide} />
    </BillingContext.Provider>
  );
};

// Lightweight inline modal (portal-less for simplicity)
const BillingModal: React.FC<{ state: BillingModalState; onClose: () => void }> = ({ state, onClose }) => {
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">{state.mode === 'upgrade' ? 'Upgrade Plan' : 'Purchase Access'}</h2>
        {state.requiredScope && <p className="text-sm text-gray-600">Needed: <code>{state.requiredScope}</code></p>}
        <p className="text-sm text-gray-500">Select a product below to continue.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border rounded p-3 text-sm">
            <h3 className="font-medium mb-1">Starter Plan</h3>
            <p className="text-xs text-gray-500 mb-2">Basic access</p>
            <button className="w-full py-1 text-xs rounded bg-blue-600 text-white">Choose</button>
          </div>
          <div className="border rounded p-3 text-sm">
            <h3 className="font-medium mb-1">Pro Plan</h3>
            <p className="text-xs text-gray-500 mb-2">All premium content</p>
            <button className="w-full py-1 text-xs rounded bg-blue-600 text-white">Choose</button>
          </div>
          <div className="border rounded p-3 text-sm">
            <h3 className="font-medium mb-1">One-Time Unlock</h3>
            <p className="text-xs text-gray-500 mb-2">Single content access</p>
            <button className="w-full py-1 text-xs rounded bg-emerald-600 text-white">Buy</button>
          </div>
          <div className="border rounded p-3 text-sm">
            <h3 className="font-medium mb-1">Redeem Voucher</h3>
            <p className="text-xs text-gray-500 mb-2">Have a code?</p>
            <button className="w-full py-1 text-xs rounded bg-gray-700 text-white">Redeem</button>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="text-xs px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
};
