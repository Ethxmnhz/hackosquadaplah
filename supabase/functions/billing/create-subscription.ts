import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/*
  Creates a Razorpay subscription for a recurring price (monthly/yearly) and inserts a row in subscriptions as 'incomplete'.
  Expects env:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    RAZORPAY_KEY_ID
    RAZORPAY_KEY_SECRET
*/

interface CreateSubscriptionRequest { price_id: string }

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return new Response(JSON.stringify({ error: 'razorpay_not_configured' }), { status: 500 });
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const body = await req.json() as CreateSubscriptionRequest;
    if (!body.price_id) return new Response(JSON.stringify({ error: 'price_id required' }), { status: 400 });

    // Auth user
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.replace(/Bearer\s+/i, '') || '';
    const { data: userData } = await supabase.auth.getUser(accessToken);
    if (!userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const userId = userData.user.id;

    // Load price & product
    const { data: price, error: priceErr } = await supabase
      .from('prices')
      .select('id, provider, product_id, currency, unit_amount, billing_cycle, provider_plan_id')
      .eq('id', body.price_id)
      .single();
    if (priceErr || !price) return new Response(JSON.stringify({ error: 'price_not_found' }), { status: 404 });
    if (price.provider !== 'razorpay') return new Response(JSON.stringify({ error: 'unsupported_provider' }), { status: 400 });
    if (price.billing_cycle === 'one_time') return new Response(JSON.stringify({ error: 'not_recurring_price' }), { status: 400 });

    // Map billing_cycle -> Razorpay period
    const period = price.billing_cycle === 'monthly' ? 'monthly' : price.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

    const authHeaderRzp = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    let planId = price.provider_plan_id;
    if (!planId) {
      const planResp = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeaderRzp },
        body: JSON.stringify({
          period,
          interval: 1,
          item: { name: `Plan_${price.product_id}_${period}_${price.unit_amount}`, amount: price.unit_amount, currency: price.currency },
          notes: { product_id: price.product_id, price_id: price.id }
        })
      });
      if (!planResp.ok) {
        const errTxt = await planResp.text();
        return new Response(JSON.stringify({ error: 'plan_creation_failed', details: errTxt }), { status: 502 });
      }
      const plan = await planResp.json();
      planId = plan.id;
      // Persist plan id for reuse
      await supabase.from('prices').update({ provider_plan_id: planId }).eq('id', price.id);
    }

    // Create subscription
    const subResp = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeaderRzp },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 0, // infinite until canceled
        notes: { product_id: price.product_id, price_id: price.id, user_id: userId },
        customer_notify: 1
      })
    });
    if (!subResp.ok) {
      const errTxt = await subResp.text();
      return new Response(JSON.stringify({ error: 'subscription_creation_failed', details: errTxt }), { status: 502 });
    }
    const sub = await subResp.json();

    // Insert subscription row status=incomplete (will activate on webhook events)
    await supabase.from('subscriptions').insert({
      user_id: userId,
      product_id: price.product_id,
      provider: 'razorpay',
      provider_subscription_id: sub.id,
      status: 'incomplete'
    });

    return new Response(JSON.stringify({ provider: 'razorpay', subscription_id: sub.id, short_url: sub.short_url, status: 'pending_activation' }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
