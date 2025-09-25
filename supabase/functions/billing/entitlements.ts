import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Returns effective entitlements for authenticated user
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
    // Prefer effective view if exists
    let { data, error } = await supabase
      .from('entitlements_effective')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      const fb = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);
      data = fb.data; error = fb.error;
    }
    if (error) throw error;
    return new Response(JSON.stringify({ entitlements: data || [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
