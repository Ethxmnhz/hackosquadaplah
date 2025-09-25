import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RedeemRequest { code: string }

// Expect headers: Authorization: Bearer <access_token>
serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const auth = req.headers.get('authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'missing auth header' }), { status: 401 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // needed for RLS bypass in secure function
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const body = await req.json() as RedeemRequest;
    if (!body.code) return new Response(JSON.stringify({ error: 'code required' }), { status: 400 });

    // Get user from access token
    const token = auth.replace(/Bearer\s+/i, '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: 'invalid user token' }), { status: 401 });
    const userId = userData.user.id;

    // Start redemption: fetch voucher + lock using RPC/serializable retry approach (simplified here)
    const { data: voucherRows, error: voucherErr } = await supabase
      .from('vouchers')
      .select('id, product_id, status, code, expires_at, redeemed_by')
      .eq('code', body.code)
      .limit(1);
    if (voucherErr) throw voucherErr;
    const voucher = voucherRows?.[0];
    if (!voucher) return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 404 });
    if (voucher.status !== 'available') return new Response(JSON.stringify({ error: 'already_redeemed' }), { status: 409 });
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) return new Response(JSON.stringify({ error: 'expired' }), { status: 410 });

    // Update voucher to redeemed (optimistic). In real race conditions, we would use a Postgres function with SELECT ... FOR UPDATE.
    const { error: redeemErr } = await supabase
      .from('vouchers')
      .update({ status: 'redeemed', redeemed_by: userId, redeemed_at: new Date().toISOString() })
      .eq('id', voucher.id)
      .eq('status', 'available');
    if (redeemErr) throw redeemErr;

    // Fetch product scopes
    const { data: productRow, error: productErr } = await supabase
      .from('products')
      .select('id, entitlement_scopes')
      .eq('id', voucher.product_id)
      .single();
    if (productErr) throw productErr;
    const scopes: string[] = productRow.entitlement_scopes || [];

    const granted: string[] = [];
    for (const scope of scopes) {
      const { error: grantErr } = await supabase.rpc('grant_entitlement', { p_user: userId, p_product: productRow.id, p_scope: scope, p_duration_days: null });
      if (!grantErr) granted.push(scope);
    }

    return new Response(JSON.stringify({ success: true, granted }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), { status: 500 });
  }
});
