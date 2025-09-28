// purchase-content edge function
// Follows style of pay-plan (simple, minimal errors, mock mode support)
// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...baseHeaders, ...(init.headers||{}) } });
}

function req(q: any, name: string) { if (q === undefined || q === null || q === '') throw new Error(`MISSING_${name.toUpperCase()}`); return q; }

async function getUser(authHeader?: string) {
  if (!authHeader) throw new Error('NO_AUTH_HEADER');
  const token = authHeader.replace('Bearer ','').trim();
  try { return JSON.parse(atob(token.split('.')[1])); } catch { throw new Error('BAD_JWT'); }
}

async function access(userId: string, content_type: string, content_id: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !service) throw new Error('MISSING_SERVICE_CREDS');
  const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/can_access_content`, {
    method: 'POST',
    headers: { 'apikey': service, 'Authorization': `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user: userId, p_content_type: content_type, p_content_id: content_id })
  });
  if (!rpc.ok) {
    if (Deno.env.get('DEBUG_PURCHASE') === '1') {
      const txt = await rpc.text();
      console.log('ACCESS_RPC_FAILED status', rpc.status, 'body', txt);
    }
    // Fallback: reproduce logic inline (simplified) using direct table queries
    const headers = { 'apikey': service, 'Authorization': `Bearer ${service}` };
    // user plan
    let plan = 'free';
    const pRes = await fetch(`${supabaseUrl}/rest/v1/user_plans?user_id=eq.${userId}&select=plan`, { headers });
    if (pRes.ok) {
      const pj = await pRes.json();
      if (Array.isArray(pj) && pj[0]?.plan) plan = pj[0].plan;
    }
    // entitlement
    let required_plan: string | null = null; let individual_price: number | null = null; let active = true;
    const eRes = await fetch(`${supabaseUrl}/rest/v1/content_entitlements?content_type=eq.${content_type}&content_id=eq.${content_id}&select=required_plan,individual_price,active`, { headers });
    if (eRes.ok) {
      const ej = await eRes.json();
      if (Array.isArray(ej) && ej[0]) {
        required_plan = ej[0].required_plan || null;
        individual_price = ej[0].individual_price ?? null;
        active = ej[0].active !== false;
      } else {
        return { allow: false, reason: 'NO_ENTITLEMENT', individual_price: null, required_plan: null };
      }
    } else {
      return { allow: false, reason: 'ENTITLEMENT_FETCH_ERR', required_plan: null, individual_price: null };
    }
    if (!active) return { allow: false, reason: 'INACTIVE', required_plan, individual_price };
    // plan allow
    if (required_plan) {
      if ((required_plan === 'hifi' && (plan === 'hifi' || plan === 'sify')) || (required_plan === 'sify' && plan === 'sify')) {
        return { allow: true, reason: 'PLAN_OK', required_plan, individual_price };
      }
    }
    // purchase check
    if (individual_price !== null) {
      const uRes = await fetch(`${supabaseUrl}/rest/v1/user_content_purchases?user_id=eq.${userId}&content_type=eq.${content_type}&content_id=eq.${content_id}&select=id&limit=1`, { headers });
      if (uRes.ok) {
        const uj = await uRes.json();
        if (Array.isArray(uj) && uj[0]) return { allow: true, reason: 'PURCHASE_OK', required_plan, individual_price };
      }
    }
    return { allow: false, reason: 'UPGRADE_OR_BUY', required_plan, individual_price };
  }
  const data = await rpc.json();
  return data[0];
}

async function insertPurchase(userId: string, content_type: string, content_id: string, order_id: string, payment_id: string, price_paid_units: number, currency: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${supabaseUrl}/rest/v1/user_content_purchases`, {
    method: 'POST',
    headers: { 'apikey': service, 'Authorization': `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, content_type, content_id, price_paid: price_paid_units, currency, payment_ref: payment_id })
  });
  if (!res.ok) throw new Error('INSERT_PURCHASE_FAILED');
}

const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || Deno.env.get('RAZORPAY_SECRET') || Deno.env.get('RAZORPAY_KEY');
const MOCK = Deno.env.get('RAZORPAY_MOCK_MODE') === '1';

async function createOrder(amountPaise: number, notes: Record<string,string>) {
  if (MOCK) return { id: 'order_mock_'+crypto.randomUUID(), amount: amountPaise, currency: 'INR', mock: true, notes };
  if (!KEY_ID || !KEY_SECRET) throw new Error('MISSING_KEYS');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic '+btoa(`${KEY_ID}:${KEY_SECRET}`) },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', notes })
  });
  if (!res.ok) throw new Error('ORDER_CREATE_FAILED');
  return await res.json();
}

async function verify(order_id: string, payment_id: string, signature: string) {
  if (MOCK) return true;
  const data = `${order_id}|${payment_id}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(KEY_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return expected === signature;
}

serve(async (request: Request) => {
  try {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: baseHeaders });
    if (request.method !== 'POST') return json({ error: 'METHOD' }, { status: 405 });
    const auth = request.headers.get('Authorization') || undefined;
    const user = await getUser(auth);
    const body = await request.json();
    const { action } = body;
    if (action === 'diag') {
      const { content_type, content_id } = body;
      let accessSnapshot: any = null;
      if (content_type && content_id) {
        try { accessSnapshot = await access(user.sub, content_type, content_id); } catch { /* ignore */ }
      }
      return json({ ok: true, mock: MOCK, has_key: !!KEY_ID, access: accessSnapshot });
    }
    if (action === 'create') {
      const { content_type, content_id, price_override } = body;
      req(content_type,'content_type'); req(content_id,'content_id');
      let acc: any;
      try {
        acc = await access(user.sub, content_type, content_id);
      } catch (ae) {
        const dbg = Deno.env.get('DEBUG_PURCHASE') === '1' ? { access_error: (ae as Error).message } : {};
        return json({ error: 'ACCESS_ERROR', ...dbg }, { status: 400 });
      }
      if (acc?.allow) return json({ already: true, reason: acc.reason });
      if (acc?.individual_price === 0) {
        return json({ already: true, reason: 'FREE' });
      }
      if (!acc?.individual_price) {
        const dbg = Deno.env.get('DEBUG_PURCHASE') === '1' ? { debug_access: acc } : {};
        return json({ error: 'NO_INDIVIDUAL_PRICE', ...dbg }, { status: 400 });
      }
      const amountUnits = (price_override && price_override>0 ? price_override : acc.individual_price);
      const order = await createOrder(amountUnits * 100, { content_type, content_id, user_id: user.sub, amount_units: String(amountUnits) });
      return json({ order_id: order.id, amount: order.amount, currency: order.currency, key: KEY_ID, mock: !!order.mock, amount_units: amountUnits });
    }
    if (action === 'verify') {
      const { order_id, razorpay_payment_id, razorpay_signature, content_type: v_content_type, content_id: v_content_id } = body;
      if (!order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: 'MISSING_FIELDS' }, { status: 400 });
      const ok = await verify(order_id, razorpay_payment_id, razorpay_signature);
      if (!ok) return json({ error: 'SIG_MISMATCH' }, { status: 400 });
      // fetch order to recover notes (skip in mock)
      let notes: any = { content_type: v_content_type || 'mock', content_id: v_content_id || 'mock', user_id: user.sub, amount_units: '0' };
      if (!MOCK) {
        const res = await fetch(`https://api.razorpay.com/v1/orders/${order_id}`, { headers: { Authorization: 'Basic '+btoa(`${KEY_ID}:${KEY_SECRET}`) } });
        if (!res.ok) return json({ error: 'FETCH_ORDER_FAILED' }, { status: 502 });
        const orderPayload = await res.json();
        notes = orderPayload.notes || notes;
      }
      if (notes.user_id !== user.sub) return json({ error: 'USER_MISMATCH' }, { status: 403 });
      const amountUnits = parseInt(notes.amount_units || '0', 10);
      if (!amountUnits || amountUnits < 0) return json({ error: 'MISSING_AMOUNT_UNITS' }, { status: 400 });
      await insertPurchase(user.sub, notes.content_type, notes.content_id, order_id, razorpay_payment_id, amountUnits, 'INR');
      return json({ success: true, mock: MOCK, price_paid: amountUnits });
    }
    return json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
  } catch (e) {
    return json({ error: (e as Error).message || 'UNHANDLED' }, { status: 400 });
  }
});
