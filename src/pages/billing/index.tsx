import React, { useEffect, useState } from 'react';
import { getUserPlan, payPlan } from '../../lib/api';
import { CheckCircle2, Sparkles, Shield, Trophy, Layers, Rocket, Clock, Lock } from 'lucide-react';

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#090B17] via-[#0F1324] to-[#161B2F]">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,0,92,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_70%,rgba(120,0,255,0.25),transparent_65%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.01)_40%,rgba(255,255,255,0.06)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pt-14 pb-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-[11px] uppercase tracking-wide text-red-300 mb-5">
            <Sparkles className="h-3.5 w-3.5" /> Flexible tiers · Scale as you grow
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-red-100 to-fuchsia-200 bg-clip-text text-transparent">
            Power Your Offensive<br className="hidden sm:block" /> & Defensive Skill Growth
          </h1>
          <p className="mt-5 text-sm md:text-base text-gray-400 leading-relaxed">
            Start free. Upgrade only when you need multi‑stage adversary simulations, deeper analytics, priority lab capacity, and accelerated certification alignment.
          </p>
        </div>

        {/* Current plan indicator */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5 text-red-400" /> Current Plan: <span className="text-white font-medium uppercase">{currentPlan}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 px-3 py-1.5 rounded-full">
            <Lock className="h-3.5 w-3.5 text-fuchsia-400" /> Cancel anytime
          </div>
          <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5 text-amber-400" /> Instant upgrade activation
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-7 md:grid-cols-3 items-stretch">
          {plans.map(plan => {
            const active = currentPlan === plan.id;
            const highlight = plan.highlight;
            return (
              <div
                key={plan.id}
                className={`group relative flex flex-col rounded-2xl border backdrop-blur-sm p-7 overflow-hidden transition-all duration-300
                  ${highlight ? 'border-red-500/40 bg-gradient-to-b from-red-900/40 via-slate-900/60 to-slate-900/40 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] ring-1 ring-red-400/40' : 'border-white/10 bg-slate-900/40'}
                  ${active ? 'outline outline-2 outline-red-500/50' : 'hover:border-red-400/40'}
                `}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide
                    ${highlight ? 'bg-red-600 text-white shadow shadow-red-900/40' : 'bg-slate-700 text-slate-200'}`}>{plan.badge}</span>
                )}
                <div className="mb-5">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2 tracking-wide text-white">{plan.name}</h2>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-extrabold text-white">{plan.priceDisplay}</span>
                    <span className="text-[11px] uppercase tracking-wide text-gray-400 pb-1">/ month</span>
                  </div>
                  {plan.priceNote && <p className="text-[11px] mt-1 text-red-300 uppercase tracking-wide">{plan.priceNote}</p>}
                  <p className="text-[13px] mt-4 text-gray-400 leading-relaxed min-h-[54px]">{plan.description}</p>
                </div>
                <ul className="space-y-2 text-[13px] mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-red-400 mt-0.5" />
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
                {active ? (
                  <button disabled className="mt-auto w-full rounded-md px-4 py-2.5 text-sm font-medium bg-slate-700 text-gray-200 disabled:opacity-70">
                    Current Plan
                  </button>
                ) : (
                  <button
                    disabled={plan.id === 'free' || payingPlan === plan.id || payment.loading}
                    onClick={() => startPayment(plan.id)}
                    className={`mt-auto w-full rounded-md px-4 py-2.5 text-sm font-semibold tracking-wide transition-all
                      ${highlight ? 'bg-gradient-to-r from-red-600 via-rose-600 to-fuchsia-600 hover:brightness-110 text-white shadow shadow-red-800/40' : 'bg-slate-700 hover:bg-slate-600 text-gray-100'}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >{payingPlan === plan.id ? 'Processing…' : plan.cta}</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment status */}
        <div className="mt-8 min-h-[24px] text-center text-sm">
          {payment.error && <span className="text-red-400">{payment.error}</span>}
          {payment.success && <span className="text-emerald-400">{payment.success}</span>}
          {payment.loading && <span className="text-gray-400 animate-pulse">Starting payment…</span>}
        </div>
        {(payment.success?.includes('Test upgrade') || payment.success?.includes('mock')) && (
          <div className="mt-2 text-center text-xs text-red-300">Mock mode active – no real payment processed.</div>
        )}

        {/* Comparison & narrative section */}
        <div className="mt-24 grid lg:grid-cols-3 gap-10 text-[13px]">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur">
            <h3 className="font-semibold mb-3 text-white flex items-center gap-2"><Trophy className="h-4 w-4 text-red-400" /> Fair Test Pricing</h3>
            <p className="text-gray-400 leading-relaxed">HiFi and Sify are set to symbolic pricing (₹1) while upgrade mechanics, entitlement flows and analytics mature. Early adopters keep grandfathered benefits when pricing normalizes.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur">
            <h3 className="font-semibold mb-3 text-white flex items-center gap-2"><Layers className="h-4 w-4 text-red-400" /> No Risk Exploration</h3>
            <p className="text-gray-400 leading-relaxed">Stay on Free indefinitely. Move up only when you’re ready for chained attack paths, richer telemetry, or extended lab runtime capacity.</p>
          </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur">
            <h3 className="font-semibold mb-3 text-white flex items-center gap-2"><Rocket className="h-4 w-4 text-red-400" /> Future Roadmap</h3>
            <p className="text-gray-400 leading-relaxed">Sify evolves into team operations, certification acceleration, seasonal exercises and adaptive red/blue fusion labs. Your upgrade signals help decide sequencing.</p>
          </div>
        </div>

        {/* FAQ / Info */}
        <div className="mt-24 grid md:grid-cols-2 gap-12">
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-red-300 uppercase mb-4">What happens after upgrading?</h4>
            <p className="text-gray-400 leading-relaxed text-sm">Access instantly expands. Refresh locked challenge pages and previously gated scenarios unlock. Labs respecting higher runtime or priority capacity adopt new limits within 1–2 minutes.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-red-300 uppercase mb-4">Will pricing change later?</h4>
            <p className="text-gray-400 leading-relaxed text-sm">Yes. Current amounts are validation placeholders. Core promise: we won’t retro‑charge existing test accounts; you keep equivalent or better value tiers.</p>
          </div>
        </div>

        {/* Sticky bottom CTA (mobile emphasis) */}
        <div className="fixed inset-x-0 bottom-0 md:hidden backdrop-blur-lg bg-slate-900/80 border-t border-white/10 p-4 flex items-center justify-between">
          <div className="text-xs text-gray-300">
            Ready to accelerate? <span className="text-white font-medium">Upgrade now</span>
          </div>
          {currentPlan === 'free' && (
            <button
              onClick={() => startPayment('hifi')}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-red-600 via-rose-600 to-fuchsia-600 text-white text-xs font-semibold shadow shadow-red-800/40"
            >Go HiFi</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
