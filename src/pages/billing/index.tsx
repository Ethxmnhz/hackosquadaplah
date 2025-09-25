import React, { useEffect, useState } from 'react';
import RazorpayButton from '../../components/billing/RazorpayButton';
import { billingCheckout, getCatalog, getEntitlements, getSubscriptions, getPurchases, createSubscription, cancelSubscription } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useEntitlements } from '../../hooks/useEntitlements';
import { useSubscriptionActivationPoller } from '../../hooks/useSubscriptionActivationPoller';

interface CatalogPrice { id: string; currency: string; unit_amount: number; provider: string; product_id: string; billing_cycle?: string }
interface CatalogProduct { id: string; name: string; description?: string | null; entitlement_scopes?: string[]; prices: CatalogPrice[] }

// Error boundary to isolate billing UI failures
class BillingErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) { console.error('Billing error boundary', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 space-y-4">
          <div className="border border-red-500/40 bg-red-500/10 text-red-300 rounded p-4 text-sm">
            <p className="font-semibold mb-1">Billing Component Error</p>
            <p className="text-xs mb-3">{this.state.error.message}</p>
            <button onClick={() => this.setState({ error: null })} className="px-3 py-1 rounded bg-red-600 text-white text-xs">Retry</button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="text-[10px] whitespace-pre-wrap opacity-70">{this.state.error.stack}</pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const BillingPageInner: React.FC = () => {
  const { session } = useAuth();
  const { refresh: refreshEntitlements } = useEntitlements();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [rzpState, setRzpState] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshAll = async () => {
    const [entsRes, subsRes, purchRes] = await Promise.all([
      getEntitlements(),
      getSubscriptions(),
      getPurchases()
    ]);
    // Each helper presumed to return shape { entitlements: [] } etc; fall back if direct array
    const ents = (entsRes as any).entitlements ?? entsRes;
    const subs = (subsRes as any).subscriptions ?? subsRes;
    const purs = (purchRes as any).purchases ?? purchRes;
    setEntitlements(Array.isArray(ents) ? ents : []);
    setSubscriptions(Array.isArray(subs) ? subs : []);
    setPurchases(Array.isArray(purs) ? purs : []);
  };

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [catalogRes, entsRes, subsRes, pursRes] = await Promise.all([
          getCatalog(), getEntitlements(), getSubscriptions(), getPurchases()
        ]);
        if (!mounted) return;
        const catalogData = (catalogRes as any).catalog || catalogRes || [];
        // Diagnostics
        if ((catalogData as any[]).length === 0) {
          // eslint-disable-next-line no-console
          console.warn('[billing] Empty catalog received. Check edge function deployment or fallback query.');
        }
        setProducts(catalogData);
        const ents = (entsRes as any).entitlements ?? entsRes;
        const subs = (subsRes as any).subscriptions ?? subsRes;
        const purs = (pursRes as any).purchases ?? pursRes;
        setEntitlements(Array.isArray(ents) ? ents : []);
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setPurchases(Array.isArray(purs) ? purs : []);
      } catch (e: any) {
        setError(e.message || 'Failed to load billing data');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // Poller hook
  const poller = useSubscriptionActivationPoller({
    fetchSubscriptions: async () => {
      const subsRes = await getSubscriptions();
      const subs = (subsRes as any).subscriptions ?? subsRes;
      setSubscriptions(Array.isArray(subs) ? subs : []);
      return Array.isArray(subs) ? subs : [];
    },
    onActivated: async () => {
      await refreshEntitlements();
      await refreshAll();
      setSuccessMessage('Subscription activated! Your access has been upgraded.');
      setTimeout(() => setSuccessMessage(null), 6000);
    },
    isActive: (s: any) => s.status === 'active'
  }, { intervalMs: 3000, maxDurationMs: 120000 });

  // Auto-start polling if we see an incomplete subscription after load
  useEffect(() => {
    if (subscriptions.some(s => s.status === 'incomplete') && !poller.polling && !poller.activationJustHappened) {
      poller.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions]);

  async function startCheckout(price: CatalogPrice) {
    if (!session) { setError('You must be signed in'); return; }
    setCreating(price.id);
    try {
      const res: any = await billingCheckout(price.id);
      if (res.provider === 'razorpay') {
        // Store ephemeral order data in state to show Razorpay button
        setRzpState({ orderId: res.order_id, amount: res.amount, currency: res.currency, key: res.key });
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (e:any) {
      setError(e.message || 'Checkout failed');
    } finally { setCreating(null); }
  }

  if (loading) return <div className="p-6">Loading products...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  async function startSubscription(price: CatalogPrice) {
    if (!session) { setError('You must be signed in'); return; }
    setCreating(price.id);
    try {
      const res: any = await createSubscription(price.id);
      if (res.short_url) {
        window.open(res.short_url, '_blank');
        poller.start();
      }
    } catch (e:any) {
      setError(e.message || 'Subscription creation failed');
    } finally { setCreating(null); }
  }
  async function doCancelSubscription(id: string) {
    try {
      const res = await cancelSubscription(id);
      console.log('cancel result', res);
      // refresh subs list
      await refreshAll();
    } catch (e:any) {
      setError(e.message || 'Cancel failed');
    }
  }

  return (
    <div className="p-6 space-y-8">
  <h1 className="text-2xl font-semibold">Billing</h1>
  {poller.polling && (
    <div className="text-xs px-3 py-2 rounded bg-blue-500/10 border border-blue-400/30 text-blue-300 inline-block">Waiting for subscription activation...</div>
  )}
  {successMessage && (
    <div className="mt-2 text-xs px-3 py-2 rounded bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 inline-flex items-center gap-2">
      <span>{successMessage}</span>
      <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
    </div>
  )}
  {poller.timedOut && !successMessage && (
    <div className="mt-2 text-xs px-3 py-2 rounded bg-yellow-500/10 border border-yellow-400/30 text-yellow-300 inline-flex items-center gap-2">
      <span>Still waiting for activation. If payment succeeded it should arrive soon.</span>
      <button onClick={() => poller.start()} className="text-yellow-400 hover:text-yellow-200">Retry</button>
    </div>
  )}
      {rzpState && (
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-medium mb-2">Complete Payment</h3>
          <RazorpayButton orderId={rzpState.orderId} amount={rzpState.amount} currency={rzpState.currency} publicKey={rzpState.key}
            onSuccess={async (pid) => { console.log('Payment success', pid); setRzpState(null); setTimeout(() => refreshEntitlements(), 1500); }}
            onClose={() => setRzpState(null)} />
        </div>
      )}
      {products.length === 0 && (
        <div className="p-4 border rounded bg-yellow-500/10 border-yellow-500/30 text-yellow-300 text-sm">
          <p className="font-medium mb-1">No subscription products available</p>
          <p className="text-xs opacity-80 mb-2">Add products and prices or ensure the catalog edge function is deployed. Falling back to direct DB read returned no rows.</p>
          <button onClick={() => window.location.reload()} className="px-3 py-1 rounded bg-yellow-600 text-white text-xs">Reload</button>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map(p => (
          <div key={p.id} className="border rounded p-4 flex flex-col">
            <h2 className="font-medium text-lg mb-1">{p.name}</h2>
            {p.description && <p className="text-sm text-gray-500 mb-2">{p.description}</p>}
            {p.entitlement_scopes?.length ? (
              <ul className="text-xs text-gray-600 mb-3 list-disc list-inside">
                {p.entitlement_scopes.map(s => <li key={s}>{s}</li>)}
              </ul>
            ) : null}
            <div className="space-y-2 mt-auto">
              {p.prices.map(price => (
                <div key={price.id} className="flex gap-2">
                  <button onClick={() => startCheckout(price)} disabled={creating === price.id}
                    className="flex-1 inline-flex items-center justify-center rounded bg-blue-600 text-white py-2 text-xs disabled:opacity-50">
                    {creating === price.id ? 'Starting...' : `Buy ${(price.unit_amount/100).toFixed(2)} ${price.currency.toUpperCase()}`}
                  </button>
                  {price.provider === 'razorpay' && price.id && (
                    <button onClick={() => startSubscription(price)} disabled={creating === price.id || price.billing_cycle === 'one_time'}
                      className="flex-1 inline-flex items-center justify-center rounded bg-emerald-600 text-white py-2 text-xs disabled:opacity-50">
                      Sub {(price.unit_amount/100).toFixed(2)} {price.currency.toUpperCase()}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2 text-sm tracking-wide">Entitlements</h3>
          <ul className="text-xs space-y-1 max-h-56 overflow-auto">
            {entitlements.map(e => <li key={e.id}>{e.scope}{e.ends_at ? <span className="text-gray-500"> (until {new Date(e.ends_at).toLocaleDateString()})</span> : ''}</li>)}
            {!entitlements.length && <li className="text-gray-500">None</li>}
          </ul>
        </div>
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2 text-sm tracking-wide">Subscriptions</h3>
          <ul className="text-xs space-y-2">
            {subscriptions.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium text-[11px]">{s.product_id}</div>
                  <div className="text-[10px] text-gray-500">{s.status}{s.cancel_at_period_end ? ' (cancels at end)' : ''}</div>
                </div>
                {s.status === 'active' && !s.cancel_at_period_end && (
                  <button onClick={() => doCancelSubscription(s.id)} className="text-[10px] bg-red-600 text-white rounded px-2 py-1">Cancel</button>
                )}
              </li>
            ))}
            {!subscriptions.length && <li className="text-gray-500">None</li>}
          </ul>
        </div>
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2 text-sm tracking-wide">Recent Purchases</h3>
          <ul className="text-xs space-y-1 max-h-56 overflow-auto">
            {purchases.map(p => (
              <li key={p.id}>{p.product_id} • {p.status} {p.amount_total ? `• ${(p.amount_total/100).toFixed(2)} ${p.currency}` : ''}</li>
            ))}
            {!purchases.length && <li className="text-gray-500">None</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

const BillingPage: React.FC = () => (
  <BillingErrorBoundary>
    <BillingPageInner />
  </BillingErrorBoundary>
);

export default BillingPage;
