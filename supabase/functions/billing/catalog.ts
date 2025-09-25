import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const region = new URL(req.url).searchParams.get('region') || '*';

  const { data: products, error: productsErr } = await supabase
    .from('products')
    .select('*');
  if (productsErr) return new Response(JSON.stringify({ error: productsErr.message }), { status: 500 });

  const { data: prices, error: pricesErr } = await supabase
    .from('prices')
    .select('*')
    .in('region', [region, '*'])
    .eq('is_active', true);
  if (pricesErr) return new Response(JSON.stringify({ error: pricesErr.message }), { status: 500 });

  // Group prices by product
  const byProduct: Record<string, any[]> = {};
  for (const p of prices) {
    if (!byProduct[p.product_id]) byProduct[p.product_id] = [];
    byProduct[p.product_id].push(p);
  }

  const catalog = products.map(p => ({ ...p, prices: byProduct[p.id] || [] }));
  return new Response(JSON.stringify({ region, catalog }), { headers: { 'Content-Type': 'application/json' } });
});
