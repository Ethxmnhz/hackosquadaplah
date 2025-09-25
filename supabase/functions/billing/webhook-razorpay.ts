import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

// Razorpay webhook receiver
// Env vars required:
//  RAZORPAY_WEBHOOK_SECRET
//  SUPABASE_URL
//  SUPABASE_SERVICE_ROLE_KEY

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const digest = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2,'0')).join('');
  return digest === signature;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const sig = req.headers.get('x-razorpay-signature') || '';
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
  const raw = await req.text();

  let signatureValid = false;
  try { signatureValid = await verifySignature(raw, sig, secret); } catch (_) {}

  let json: any = {};
  try { json = JSON.parse(raw); } catch (_) {}

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const externalId = json?.payload?.payment?.entity?.id || json?.payload?.subscription?.entity?.id || json?.id;
  const eventType = json?.event || 'unknown';

  // Store raw event (idempotent insert based on provider + external_event_id unique index)
  let storedId: string | null = null;
  let duplicate = false;
  try {
    const { data, error } = await supabase
      .from('provider_events')
      .insert({ provider: 'razorpay', event_type: eventType, payload: json, signature_valid: signatureValid, external_event_id: externalId })
      .select('id')
      .single();
    if (!error) storedId = data.id;
  } catch (e) {
    duplicate = true; // Unique violation indicates we processed/stored earlier
  }

  // If duplicate, fetch existing row to know prior result
  let alreadyProcessed = false;
  if (duplicate && externalId) {
    const { data: existing } = await supabase
      .from('provider_events')
      .select('id,result')
      .eq('provider', 'razorpay')
      .eq('external_event_id', externalId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing) {
      storedId = existing.id;
      alreadyProcessed = existing.result === 'success';
    }
  }

  // Event processing (idempotent):
  try {
    if (signatureValid && !alreadyProcessed) {
      if (eventType === 'payment.captured') {
        const payment = json?.payload?.payment?.entity;
        const orderId = payment?.order_id; // we stored order_id in provider_checkout_id for draft purchase
        const paymentId = payment?.id;
        const amount = payment?.amount; // in smallest currency unit
        const currency = payment?.currency;
        if (orderId && paymentId) {
          // Find draft purchase
          const { data: purchaseRow } = await supabase
            .from('purchases')
            .select('id, user_id, product_id, price_id, status, amount_total, currency')
            .eq('provider', 'razorpay')
            .eq('provider_checkout_id', orderId)
            .limit(1)
            .maybeSingle();
          if (purchaseRow && purchaseRow.status === 'created') {
            // Verify expected amount/currency
            if ((purchaseRow.amount_total && purchaseRow.amount_total !== amount) || (purchaseRow.currency && purchaseRow.currency !== currency)) {
              throw new Error('amount_mismatch');
            }
            // Update purchase to paid
            await supabase
              .from('purchases')
              .update({ status: 'paid', provider_payment_intent_id: paymentId, paid_at: new Date().toISOString(), amount_total: amount, currency })
              .eq('id', purchaseRow.id);
            // Grant entitlements via linkage function (tracks origin_purchase_id)
            await supabase.rpc('grant_purchase_entitlements', { p_purchase: purchaseRow.id, p_duration_days: null });
          }
        }
      } else if (eventType === 'payment.refunded') {
        const payment = json?.payload?.payment?.entity;
        const paymentId = payment?.id;
        if (paymentId) {
          const { data: purchaseRow } = await supabase
            .from('purchases')
            .select('id, status')
            .eq('provider', 'razorpay')
            .eq('provider_payment_intent_id', paymentId)
            .limit(1)
            .maybeSingle();
          if (purchaseRow && purchaseRow.status === 'paid') {
            await supabase.from('purchases').update({ status: 'refunded' }).eq('id', purchaseRow.id);
            // Revoke entitlements immediately (could be adapted for grace periods)
            await supabase.rpc('revoke_purchase_entitlements', { p_purchase: purchaseRow.id });
          }
        }
      } else if (eventType.startsWith('subscription.')) {
        const subEntity = json?.payload?.subscription?.entity;
        const providerSubId = subEntity?.id;
        if (providerSubId) {
          // Load local subscription row
          const { data: subRow } = await supabase
            .from('subscriptions')
            .select('id, user_id, product_id, status, current_period_end, current_period_start')
            .eq('provider', 'razorpay')
            .eq('provider_subscription_id', providerSubId)
            .limit(1)
            .maybeSingle();
          // Map Razorpay subscription status → local status
          const rzpStatus = subEntity?.status; // created, authenticated, active, paused, completed, cancelled, halted
          let mappedStatus: string | null = null;
            switch (rzpStatus) {
              case 'created':
              case 'authenticated':
                mappedStatus = 'incomplete'; break;
              case 'active':
                mappedStatus = 'active'; break;
              case 'paused':
                mappedStatus = 'past_due'; break; // treat paused like past_due (restricted)
              case 'completed':
                mappedStatus = 'canceled'; break; // finished naturally
              case 'cancelled':
                mappedStatus = 'canceled'; break;
              case 'halted':
                mappedStatus = 'past_due'; break;
              default:
                mappedStatus = null;
            }
          // Derive period start/end if available
          const currentStart = subEntity?.current_start ? new Date(subEntity.current_start * 1000).toISOString() : null;
          const currentEnd = subEntity?.current_end ? new Date(subEntity.current_end * 1000).toISOString() : null;

          if (subRow) {
            await supabase.from('subscriptions').update({
              status: mappedStatus || subRow.status,
              current_period_start: currentStart || subRow.current_period_start,
              current_period_end: currentEnd || subRow.current_period_end
            }).eq('id', subRow.id);
            // Grant/extend entitlements when becoming active
            if (mappedStatus === 'active') {
              // Provide duration until current_period_end if present
              let durationDays: number | null = null;
              if (currentEnd && currentStart) {
                const ms = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
                durationDays = Math.max(1, Math.round(ms / 86400000));
              }
              await supabase.rpc('grant_subscription_entitlements', { p_subscription: subRow.id, p_duration_days: durationDays });
            }
            // Revoke entitlements if subscription transitions to canceled
            if (mappedStatus === 'canceled') {
              await supabase.rpc('revoke_subscription_entitlements', { p_subscription: subRow.id });
            }
          } else {
            // Subscription row not found yet (race) - attempt upsert create minimal row
            if (subEntity?.notes?.product_id) {
              await supabase.from('subscriptions').insert({
                user_id: subEntity?.notes?.user_id || null,
                product_id: subEntity?.notes?.product_id,
                provider: 'razorpay',
                provider_subscription_id: providerSubId,
                status: mappedStatus || 'incomplete',
                current_period_start: currentStart,
                current_period_end: currentEnd
              });
            }
          }
        }
      }
    }
  } catch (processingErr) {
    // Best-effort; store error back into provider_events for audit
    if (storedId) {
      await supabase
        .from('provider_events')
        .update({ result: 'error', error_message: String(processingErr) })
        .eq('id', storedId);
    }
    return new Response(JSON.stringify({ received: true, event: eventType, stored_id: storedId, signature_valid: signatureValid, processed: false }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (storedId && !alreadyProcessed) {
    await supabase
      .from('provider_events')
      .update({ result: 'success', processed_at: new Date().toISOString() })
      .eq('id', storedId);
  }

  return new Response(JSON.stringify({ received: true, event: eventType, stored_id: storedId, signature_valid: signatureValid, duplicate, alreadyProcessed }), { headers: { 'Content-Type': 'application/json' } });
});
