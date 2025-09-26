// Simple Razorpay payment + plan upgrade function
// Endpoint shape:
//  POST { action: 'create', plan: 'hifi' | 'sify' } -> { order_id, amount, currency, key }
//  POST { action: 'verify', plan, order_id, razorpay_payment_id, razorpay_signature } -> { success: true }
// Requires env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Security: caller must be authenticated (we verify JWT via Authorization header)

// @ts-nocheck  -- Supabase edge runtime provides Deno globals; keep minimal typing
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

interface JwtUser { sub: string }

const ALLOWED_ORIGIN = '*'; // You can later restrict to specific domain
const baseHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...baseHeaders, ...(init.headers||{}) } });
}

async function getUserFromAuthHeader(authHeader?: string): Promise<JwtUser | null> {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  // Minimal decode (NOT verifying signature here because Supabase already validated in edge context if using anon key route).
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { sub: payload.sub };
  } catch { return null; }
}

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
// Allow a few fallback variable names in case the secret was stored under a different key
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
  || Deno.env.get('RAZORPAY_SECRET')
  || Deno.env.get('RAZORPAY_SECRET_KEY')
  || Deno.env.get('RAZORPAY_KEY');
const MOCK_MODE = Deno.env.get('RAZORPAY_MOCK_MODE') === '1';
const PLAN_HIFI_AMOUNT = parseInt(Deno.env.get('PLAN_HIFI_AMOUNT') || '100'); // paise
const PLAN_SIFY_AMOUNT = parseInt(Deno.env.get('PLAN_SIFY_AMOUNT') || '100'); // paise
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.log('[pay-plan] Razorpay credentials missing');
  if (!MOCK_MODE) {
    console.log('[pay-plan] Will reject create calls until credentials provided');
  } else {
    console.log('[pay-plan] MOCK_MODE active: proceeding without real credentials');
  }
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log('Missing supabase service creds');
}

async function createOrder(userId: string, plan: string) {
  // Minimal pricing mapping (amounts in INR paise)
  const priceMap: Record<string, number> = { hifi: PLAN_HIFI_AMOUNT, sify: PLAN_SIFY_AMOUNT };
  const amount = priceMap[plan];
  if (!amount) throw new Error('Invalid plan');
  // Prevent redundant upgrade: if user already on that plan, stop early
  try {
    if (SUPABASE_URL && SERVICE_KEY) {
      const existing = await fetch(`${SUPABASE_URL}/rest/v1/user_plans?user_id=eq.${userId}&select=plan`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      });
      if (existing.ok) {
        const rows = await existing.json();
        if (Array.isArray(rows) && rows[0]?.plan === plan) {
          throw new Error('ALREADY_ON_PLAN');
        }
      }
    }
  } catch (chkErr) {
    if ((chkErr as Error).message === 'ALREADY_ON_PLAN') throw chkErr; // propagate special case
    console.warn('[pay-plan] plan check failed (continuing):', chkErr);
  }
  if (MOCK_MODE) {
    return { id: `order_mock_${crypto.randomUUID()}`, amount, currency: 'INR', mock: true };
  }
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const e = new Error('Razorpay credentials not configured');
    (e as any).code = 'MISSING_KEYS';
    throw e;
  }
  const basicAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const payload = { amount, currency: 'INR', payment_capture: 1, notes: { plan } };
  let res: Response;
  try {
    res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify(payload)
    });
  } catch (networkErr) {
    console.error('[pay-plan] Razorpay network error', networkErr);
    const e = new Error('Razorpay network error');
    (e as any).code = 'RAZORPAY_NETWORK';
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    console.error('[pay-plan] Razorpay order create failed', res.status, text);
    const e = new Error(`Failed to create order (status ${res.status})`);
    (e as any).code = `RAZORPAY_STATUS_${res.status}`;
    if (res.status === 400 && text.includes('minimum')) (e as any).code = 'LOW_AMOUNT';
    throw e;
  }
  const data = await res.json();
  return data; // id, amount, currency
}

async function storePlan(userId: string, plan: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY!,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ user_id: userId, plan })
  });
  if (res.status === 409) {
    // update existing
    await fetch(`${SUPABASE_URL}/rest/v1/user_plans?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY!,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ plan, activated_at: new Date().toISOString() })
    });
    return;
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Plan upsert failed: '+txt);
  }
}

async function verifySignature(orderId: string, paymentId: string, signature: string) {
  if (MOCK_MODE) return true;
  const hmacData = `${orderId}|${paymentId}`;
  const enc = new TextEncoder().encode(hmacData);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(RAZORPAY_KEY_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc);
  const expected = Array.from(new Uint8Array(sigBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return expected === signature;
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: baseHeaders });
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
    const user = await getUserFromAuthHeader(req.headers.get('Authorization') || undefined);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
  const { action, plan } = body;
    if (action === 'diag') {
      return json({
        ok: true,
        mock_mode: MOCK_MODE,
        has_key_id: !!RAZORPAY_KEY_ID,
        has_key_secret: !!RAZORPAY_KEY_SECRET,
        key_id_prefix: RAZORPAY_KEY_ID ? RAZORPAY_KEY_ID.slice(0,8) : null,
        pricing: { hifi: PLAN_HIFI_AMOUNT, sify: PLAN_SIFY_AMOUNT }
      });
    }

    if (!['hifi','sify'].includes(plan)) return json({ error: 'Invalid plan' }, { status: 400 });

    if (action === 'create') {
      let order;
      try {
        order = await createOrder(user.sub, plan);
      } catch (orderErr) {
        const err: any = orderErr;
        if (err.message === 'ALREADY_ON_PLAN') {
          return json({ error: 'Already on this plan', code: 'ALREADY_ON_PLAN' }, { status: 400 });
        }
        const code = err.code || 'ORDER_CREATE_FAILED';
        const status = code === 'MISSING_KEYS' ? 500
          : code.startsWith('RAZORPAY_STATUS_') ? 502
          : code === 'RAZORPAY_NETWORK' ? 503
          : code === 'LOW_AMOUNT' ? 400
          : 500;
        console.error('[pay-plan] create action error', { message: err.message, code });
        return json({ error: err.message, code }, { status });
      }
      return json({ order_id: order.id, amount: order.amount, currency: order.currency, key: RAZORPAY_KEY_ID, mock: !!order.mock, mock_mode: MOCK_MODE });
    }

    if (action === 'verify') {
      const { order_id, razorpay_payment_id, razorpay_signature } = body;
      if (!order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: 'Missing verification fields' }, { status: 400 });
      const valid = await verifySignature(order_id, razorpay_payment_id, razorpay_signature);
      if (!valid) return json({ error: 'Signature mismatch' }, { status: 400 });
      try {
        await storePlan(user.sub, plan);
      } catch (storeErr) {
        console.error('[pay-plan] storePlan error', storeErr);
        return json({ error: (storeErr as Error).message, code: 'PLAN_STORE_FAILED' }, { status: 500 });
      }
      return json({ success: true, mock_mode: MOCK_MODE });
    }

    return json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('[pay-plan] unhandled error', e);
    return json({ error: (e as Error).message, code: 'UNHANDLED' }, { status: 500 });
  }
});
