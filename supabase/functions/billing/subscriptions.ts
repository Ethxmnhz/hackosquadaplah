import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Returns the authenticated user's subscriptions (basic fields)
serve(async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const authHeader = req.headers.get('authorization');
    const accessToken = authHeader?.replace(/Bearer\s+/i, '') || '';
    const { data: userData } = await supabase.auth.getUser(accessToken);
    if (!userData?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const userId = userData.user.id;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, product_id, status, current_period_start, current_period_end, cancel_at_period_end, provider, provider_subscription_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return new Response(JSON.stringify({ subscriptions: data || [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
