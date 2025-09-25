import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/*
  Cancels a Razorpay subscription given a local subscription id (or provider_subscription_id).
  Marks subscription row cancel_at_period_end or canceled depending on provider response.
*/

interface CancelSubscriptionRequest { subscription_id: string }

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return new Response(JSON.stringify({ error: 'razorpay_not_configured' }), { status: 500 });
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const body = await req.json() as CancelSubscriptionRequest;
    if (!body.subscription_id) return new Response(JSON.stringify({ error: 'subscription_id required' }), { status: 400 });

    // Auth user
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.replace(/Bearer\s+/i, '') || '';
    const { data: userData } = await supabase.auth.getUser(accessToken);
    if (!userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const userId = userData.user.id;

    // Load subscription row (owner check)
    const { data: subRow, error: subErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', body.subscription_id)
      .eq('user_id', userId)
      .single();
    if (subErr || !subRow) return new Response(JSON.stringify({ error: 'subscription_not_found' }), { status: 404 });
    if (subRow.provider !== 'razorpay') return new Response(JSON.stringify({ error: 'unsupported_provider' }), { status: 400 });

    const authHeaderRzp = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    const cancelResp = await fetch(`https://api.razorpay.com/v1/subscriptions/${subRow.provider_subscription_id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeaderRzp },
      body: JSON.stringify({ cancel_at_cycle_end: 1 })
    });
    if (!cancelResp.ok) {
      const errTxt = await cancelResp.text();
      return new Response(JSON.stringify({ error: 'cancel_failed', details: errTxt }), { status: 502 });
    }
    const cancelJson = await cancelResp.json();

    // Update local subscription (mark cancel_at_period_end or canceled if already ended)
    const localUpdate: any = {};
    if (cancelJson.status === 'cancelled') {
      localUpdate.status = 'canceled';
    } else {
      localUpdate.cancel_at_period_end = true;
    }
    await supabase.from('subscriptions').update(localUpdate).eq('id', subRow.id);

    return new Response(JSON.stringify({ success: true, status: localUpdate.status || subRow.status, cancel_at_period_end: !!localUpdate.cancel_at_period_end }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
