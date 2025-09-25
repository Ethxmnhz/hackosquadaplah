// Mock checkout Supabase Edge Function
// Later: replace mock logic with provider adapter invocation (stripe/razorpay/paypal)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: Real Razorpay integration requires using fetch with Basic auth (key_id:key_secret Base64) to create an order.
// We avoid embedding secrets in response; only order details + public key sent to client.

interface CheckoutRequest { price_id: string; success_url?: string; cancel_url?: string }

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let supabase; try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  } catch (_) {
    return new Response(JSON.stringify({ error: 'server_not_configured' }), { status: 500 });
  }
  try {
  const body = await req.json() as CheckoutRequest;
    if (!body.price_id) return new Response(JSON.stringify({ error: 'price_id required' }), { status: 400 });

  // Auth user (Bearer token) for associating purchase
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace(/Bearer\s+/i, '') || '';
  const { data: userData } = await supabase.auth.getUser(accessToken);
  if (!userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const userId = userData.user.id;

    const { data: price, error: priceErr } = await supabase
      .from('prices')
      .select('id, provider, product_id, currency, unit_amount')
      .eq('id', body.price_id)
      .single();
    if (priceErr || !price) return new Response(JSON.stringify({ error: 'price_not_found' }), { status: 404 });

    switch (price.provider) {
      case 'razorpay': {
        const keyId = Deno.env.get('RAZORPAY_KEY_ID');
        const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
        if (!keyId || !keySecret) {
          return new Response(JSON.stringify({ error: 'razorpay_not_configured' }), { status: 500 });
        }
        // Amount in smallest currency unit (assume unit_amount already in smallest unit)
        const orderPayload = {
          amount: price.unit_amount,
          currency: price.currency,
          receipt: `rcpt_${price.id}_${Date.now()}`,
          notes: { product_id: price.product_id, price_id: price.id, user_id: userId }
        };
        const authHeaderRzp = 'Basic ' + btoa(`${keyId}:${keySecret}`);
        const rzpResp = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeaderRzp },
          body: JSON.stringify(orderPayload)
        });
        if (!rzpResp.ok) {
          const errTxt = await rzpResp.text();
          return new Response(JSON.stringify({ error: 'razorpay_order_failed', details: errTxt }), { status: 502 });
        }
        const rzpOrder = await rzpResp.json();
        const orderId = rzpOrder.id;
        // Insert a draft purchase row (status=created)
        await supabase.from('purchases').insert({
          user_id: userId,
          product_id: price.product_id,
          price_id: price.id,
          provider: 'razorpay',
          provider_checkout_id: orderId,
          status: 'created',
          amount_total: price.unit_amount,
          currency: price.currency
        });
        return new Response(JSON.stringify({ provider: 'razorpay', order_id: orderId, amount: price.unit_amount, currency: price.currency, key: keyId }), { headers: { 'Content-Type': 'application/json' } });
      }
      case 'stripe':
        // Placeholder: in full implementation create Stripe Checkout Session here.
        return new Response(JSON.stringify({ url: '/stripe/checkout/placeholder', provider_checkout_id: 'stripe_pending_'+price.id }), { headers: { 'Content-Type': 'application/json' } });
      default:
        // Mock provider path
        return new Response(JSON.stringify({ url: `/mock/checkout/${price.id}`, provider_checkout_id: 'mock_'+price.id }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
