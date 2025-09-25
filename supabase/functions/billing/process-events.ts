import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/*
  Background reprocessor: scans provider_events stuck without result and replays processing logic by re-posting payload to the corresponding webhook internally.
  Simplified: only handles razorpay events for now.
*/

serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: events } = await supabase
    .from('provider_events')
    .select('id, provider, payload')
    .is('processed_at', null)
    .eq('provider', 'razorpay')
    .limit(25);

  let processed = 0;
  if (events) {
    for (const ev of events) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/billing/webhook-razorpay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ev.payload)
        });
        processed++;
      } catch (_) {}
    }
  }

  return new Response(JSON.stringify({ retried: processed }), { headers: { 'Content-Type': 'application/json' } });
});
