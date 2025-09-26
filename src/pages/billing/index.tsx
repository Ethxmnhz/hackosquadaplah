import React, { useEffect, useState } from 'react';
import { getUserPlan, payPlan } from '../../lib/api';

// Clean static billing page (legacy dynamic billing removed)
interface Plan { id: string; name: string; priceDisplay: string; priceNote?: string; description: string; features: string[]; highlight?: boolean; badge?: string; cta: string; }

const plans: Plan[] = [
  { id: 'free', name: 'Free', priceDisplay: '₹0', description: 'Get started with core challenges and basic learning content.', features: ['Access to public challenges','Basic labs & practice','Community leaderboard','Limited progress tracking'], cta: 'Current Plan' },
  { id: 'hifi', name: 'HiFi', priceDisplay: '₹1', priceNote: 'intro test price', description: 'Unlock advanced labs and faster progression tools.', features: ['Everything in Free','Advanced & scenario labs','Early access to new content','Priority leaderboard updates','Challenge analytics (beta)'], cta: 'Upgrade to HiFi', highlight: true, badge: 'Popular' },
  { id: 'sify', name: 'Sify', priceDisplay: '₹1', priceNote: 'intro test price', description: 'Full platform power for teams & intense skill growth.', features: ['Everything in HiFi','Exclusive pro operations','Certification fast-track','Extended analytics & insights','Beta & experimental features'], cta: 'Go Sify', badge: 'Advanced' }
];

interface PaymentState { loading?: boolean; error?: string | null; success?: string | null }

declare global { interface Window { Razorpay?: any } }

const BillingPage: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentState>({});

  // Load current plan
  useEffect(() => { (async () => { const res = await getUserPlan(); setCurrentPlan(res.plan); })(); }, []);

  // Load Razorpay script once
  useEffect(() => {
    if (window.Razorpay) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  async function startPayment(planId: string) {
    setPayment({ loading: true });
    setPayingPlan(planId);
    try {
      const order = await payPlan('create', { plan: planId });
      // Auto-verify in mock mode (order.mock or order.mock_mode)
      if (order?.mock || order?.mock_mode) {
        try {
          await payPlan('verify', { plan: planId, order_id: order.order_id || order.id, razorpay_payment_id: 'pay_mock', razorpay_signature: 'sig_mock' });
          setPayment({ success: 'Test upgrade applied (mock).' });
          setCurrentPlan(planId);
        } catch (e:any) {
          setPayment({ error: 'Mock verify failed: ' + e.message });
        } finally {
          setPayingPlan(null);
        }
        return;
      }
      if (!window.Razorpay) throw new Error('Razorpay SDK not loaded');
      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Upgrade Plan',
        description: `Activate ${planId.toUpperCase()}`,
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            await payPlan('verify', { plan: planId, order_id: order.order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature });
            setPayment({ success: 'Payment successful!' });
            setCurrentPlan(planId);
          } catch (e:any) {
            setPayment({ error: e.message });
          } finally {
            setPayingPlan(null);
          }
        },
  // Capture dismissal & failure feedback
  notes: { plan: planId },
  modal: { ondismiss: () => { setPayingPlan(null); setPayment({}); } },
        theme: { color: '#2563eb' }
      });
      rzp.on('payment.failed', (resp: any) => {
        console.error('[Razorpay payment.failed]', resp?.error);
        const reason = resp?.error?.description || resp?.error?.reason || 'Payment failed';
        setPayment({ error: reason });
        setPayingPlan(null);
      });
      rzp.open();
    } catch (e:any) {
      setPayment({ error: e.message });
      setPayingPlan(null);
    }
  }

  return (
  <div className="mx-auto max-w-7xl px-4 py-10">
    <div className="mb-12 text-center">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">Choose Your Plan</h1>
      <p className="mt-3 text-sm md:text-base text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Scale your learning journey. Start free, then unlock deeper labs, analytics, and certification accelerators when ready.</p>
    </div>
    <div className="grid gap-6 md:grid-cols-3 items-stretch">
      {plans.map(plan => {
        const highlightClasses = plan.highlight ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-600/10 relative bg-gradient-to-b from-gray-900/80 to-gray-900 border-blue-500/40' : 'border-gray-200/40 dark:border-gray-700/60 bg-gray-900/40';
        return (
          <div key={plan.id} className={`flex flex-col rounded-xl border backdrop-blur-sm p-6 md:p-7 ${highlightClasses}`}>
            {plan.badge && (
              <span className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${plan.highlight ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-200'}`}>{plan.badge}</span>
            )}
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">{plan.name}</h2>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{plan.priceDisplay}</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">/ month</span>
              </div>
              {plan.priceNote && <p className="text-[11px] mt-1 text-blue-400 uppercase tracking-wide">{plan.priceNote}</p>}
              <p className="text-sm mt-4 text-gray-400 leading-relaxed min-h-[54px]">{plan.description}</p>
            </div>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">✓</span>
                  <span className="text-gray-300">{f}</span>
                </li>
              ))}
            </ul>
            {currentPlan === plan.id ? (
              <button disabled className={`mt-auto w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${plan.highlight ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>Current Plan</button>
            ) : (
              <button
                disabled={plan.id === 'free' || payingPlan === plan.id || payment.loading}
                onClick={() => startPayment(plan.id)}
                className={`mt-auto w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-default ${plan.highlight ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'}`}
              >{payingPlan === plan.id ? 'Processing...' : plan.cta}</button>
            )}
          </div>
        );
      })}
    </div>

    <div className="mt-6 min-h-[24px] text-center text-sm">
      {payment.error && <span className="text-red-400">{payment.error}</span>}
      {payment.success && <span className="text-emerald-400">{payment.success}</span>}
      {payment.loading && <span className="text-gray-400 animate-pulse">Starting payment...</span>}
    </div>
    {(payment.success?.includes('Test upgrade') || payment.success?.includes('mock')) && (
      <div className="mt-2 text-center text-xs text-blue-400">Mock mode active – no real payment processed.</div>
    )}
    <div className="mt-14 grid md:grid-cols-3 gap-8 text-sm">
      <div>
        <h3 className="font-semibold mb-2 text-gray-200">Fair Test Pricing</h3>
        <p className="text-gray-400 leading-relaxed">HiFi and Sify are presently at a symbolic ₹1 to validate upgrade flows and gather early adoption signals. Pricing will adjust post‑beta without auto‑charging existing test users.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-2 text-gray-200">No Risk Exploration</h3>
        <p className="text-gray-400 leading-relaxed">Stay on Free as long as you want. Upgrade only when you feel the need for deeper labs, faster progress tooling, or advanced analytics.</p>
      </div>
      <div>
        <h3 className="font-semibold mb-2 text-gray-200">Future Roadmap</h3>
        <p className="text-gray-400 leading-relaxed">Sify will evolve with team features, certification tracks, and seasonal operation perks. Your feedback now shapes what ships next.</p>
      </div>
    </div>
  </div>
  );
};

export default BillingPage;
