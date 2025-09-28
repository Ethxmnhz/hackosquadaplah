// Centralized payments utility for both plan upgrades and one-off content purchases.
// Strategy: try supabase.functions.invoke first (works locally without Docker by proxying to hosted project)
// Fallback: fetch /functions/v1/... (Netlify/Vercel style local dev) only if invoke fails with recognizable errors.

import { supabase } from './supabase';

export interface OrderCreateResponse {
  order_id: string;
  amount: number; // paise
  currency: string;
  key?: string;
  mock?: boolean;
  mock_mode?: boolean;
  already?: boolean;
  reason?: string;
}

export interface VerifyResponse { success?: boolean; mock?: boolean; plan?: string; }

export interface PurchaseCreatePayload { content_type: string; content_id: string; price_override?: number; }

export type PlanId = 'hifi' | 'sify';

export class PaymentFunctionError extends Error {
  code?: string;
  status?: number;
  functionName: string;
  details?: any;
  constructor(functionName: string, message: string, code?: string, status?: number) {
    super(message);
    this.functionName = functionName;
    this.code = code;
    this.status = status;
  }
}

async function invokeWrapper<T>(name: string, body: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Attempt to parse embedded error JSON if present on error context
    let code: string | undefined = (error as any).code;
    let status: number | undefined = (error as any).status;
    // supabase-js for edge functions often only returns generic message without structured JSON
    const enriched = new PaymentFunctionError(name, error.message || 'Edge Function returned a non-2xx status code', code, status);
    // Attach raw error for debugging
    (enriched as any).details = { original: error };
    throw enriched;
  }
  return data as T;
}

function isNetworkish(err: any) {
  return !!(err && (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')));
}

// Derive remote functions base (works when invoking directly without supabase-js helper)
// Cast import.meta as any to avoid TS complaints in non-Vite type contexts
const _env: any = (import.meta as any).env || {};
const REMOTE_FUNCTIONS_BASE = (_env.VITE_SUPABASE_URL || '')
  .replace(/\/$/, '')
  .replace('.supabase.co', '.functions.supabase.co');

async function directRemoteFunction(name: string, body: any): Promise<{ ok: boolean; status: number; json: any; } | null> {
  if (!REMOTE_FUNCTIONS_BASE) return null;
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${REMOTE_FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': (_env.VITE_SUPABASE_ANON_KEY || ''),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    const json = await safeParseJSON(res);
    return { ok: res.ok, status: res.status, json };
  } catch {
    return null;
  }
}

async function safeParseJSON(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function createPlanOrder(plan: PlanId): Promise<OrderCreateResponse> {
  try {
    return await invokeWrapper<OrderCreateResponse>('pay-plan', { action: 'create', plan });
  } catch (err) {
    if (!isNetworkish(err)) throw err;
    // Fallback fetch
    const res = await fetch('/functions/v1/pay-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', plan }) });
    const json = await safeParseJSON(res);
    if (!res.ok) throw new Error(json?.error || 'PLAN_CREATE_FAILED');
    return json as OrderCreateResponse;
  }
}

export async function verifyPlan(plan: PlanId, order_id: string, razorpay_payment_id: string, razorpay_signature: string): Promise<VerifyResponse> {
  try {
    return await invokeWrapper<VerifyResponse>('pay-plan', { action: 'verify', plan, order_id, razorpay_payment_id, razorpay_signature });
  } catch (err) {
    if (!isNetworkish(err)) throw err;
    const res = await fetch('/functions/v1/pay-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', plan, order_id, razorpay_payment_id, razorpay_signature }) });
    const json = await safeParseJSON(res);
    if (!res.ok) throw new Error(json?.error || 'PLAN_VERIFY_FAILED');
    return json as VerifyResponse;
  }
}

export async function createContentPurchase(payload: PurchaseCreatePayload): Promise<OrderCreateResponse> {
  try {
    return await invokeWrapper<OrderCreateResponse>('purchase-content', { action: 'create', ...payload });
  } catch (err: any) {
    const originalMsg = err?.message;
    if (err instanceof PaymentFunctionError) {
      console.debug('[purchase-content:create] invoke error', { status: err.status, code: err.code, message: err.message, details: (err as any).details });
    }
    // If it's a structured function error (4xx/5xx) rethrow after trying to enrich via direct remote fetch (not local relative)
    if (err instanceof PaymentFunctionError && err.status && err.status >= 400) {
      const remote = await directRemoteFunction('purchase-content', { action: 'create', ...payload });
      if (remote && !remote.ok) {
        console.debug('[purchase-content:create] remote error', { status: remote.status, body: remote.json });
        throw new PaymentFunctionError('purchase-content', remote.json?.error || originalMsg || 'PURCHASE_CREATE_FAILED', remote.json?.error, remote.status);
      }
      if (remote && remote.ok) {
        return remote.json as OrderCreateResponse; // unlikely but handle
      }
      throw err; // keep original
    }
    try {
      // Network-like or unknown error: attempt remote direct or local relative
      const remote = await directRemoteFunction('purchase-content', { action: 'create', ...payload });
      if (remote) {
        if (!remote.ok) throw new PaymentFunctionError('purchase-content', remote.json?.error || originalMsg || 'PURCHASE_CREATE_FAILED', remote.json?.error, remote.status);
        return remote.json as OrderCreateResponse;
      }
      const localRes = await fetch('/functions/v1/purchase-content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', ...payload }) });
      const localJson = await safeParseJSON(localRes);
      if (!localRes.ok) throw new PaymentFunctionError('purchase-content', localJson?.error || originalMsg || 'PURCHASE_CREATE_FAILED', localJson?.error, localRes.status);
      return localJson as OrderCreateResponse;
    } catch (fallbackErr) {
      console.debug('[purchase-content:create] fallback error', fallbackErr);
      // If fallback also fails and original was a PaymentFunctionError, rethrow original with context
      if (err instanceof PaymentFunctionError) throw err;
      throw new PaymentFunctionError('purchase-content', originalMsg || 'PURCHASE_CREATE_FAILED');
    }
  }
}

export async function verifyContentPurchase(order_id: string, razorpay_payment_id: string, razorpay_signature: string, content_type?: string, content_id?: string): Promise<VerifyResponse> {
  try {
    return await invokeWrapper<VerifyResponse>('purchase-content', { action: 'verify', order_id, razorpay_payment_id, razorpay_signature, ...(content_type && content_id ? { content_type, content_id } : {}) });
  } catch (err: any) {
    const originalMsg = err?.message;
    if (err instanceof PaymentFunctionError && err.status && err.status >= 400) {
      const remote = await directRemoteFunction('purchase-content', { action: 'verify', order_id, razorpay_payment_id, razorpay_signature, ...(content_type && content_id ? { content_type, content_id } : {}) });
      if (remote && !remote.ok) throw new PaymentFunctionError('purchase-content', remote.json?.error || originalMsg || 'PURCHASE_VERIFY_FAILED', remote.json?.error, remote.status);
      if (remote && remote.ok) return remote.json as VerifyResponse;
      throw err;
    }
    try {
      const remote = await directRemoteFunction('purchase-content', { action: 'verify', order_id, razorpay_payment_id, razorpay_signature, ...(content_type && content_id ? { content_type, content_id } : {}) });
      if (remote) {
        if (!remote.ok) throw new PaymentFunctionError('purchase-content', remote.json?.error || originalMsg || 'PURCHASE_VERIFY_FAILED', remote.json?.error, remote.status);
        return remote.json as VerifyResponse;
      }
      const localRes = await fetch('/functions/v1/purchase-content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', order_id, razorpay_payment_id, razorpay_signature, ...(content_type && content_id ? { content_type, content_id } : {}) }) });
      const localJson = await safeParseJSON(localRes);
      if (!localRes.ok) throw new PaymentFunctionError('purchase-content', localJson?.error || originalMsg || 'PURCHASE_VERIFY_FAILED', localJson?.error, localRes.status);
      return localJson as VerifyResponse;
    } catch (fallbackErr) {
      if (err instanceof PaymentFunctionError) throw err;
      throw new PaymentFunctionError('purchase-content', originalMsg || 'PURCHASE_VERIFY_FAILED');
    }
  }
}

export async function diagPurchase() {
  try { return await invokeWrapper<any>('purchase-content', { action: 'diag' }); }
  catch (err) { if (!isNetworkish(err)) throw err; const res = await fetch('/functions/v1/purchase-content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'diag' }) }); return safeParseJSON(res); }
}

export async function diagPurchaseAccess(content_type: string, content_id: string) {
  try { return await invokeWrapper<any>('purchase-content', { action: 'diag', content_type, content_id }); }
  catch (err) { if (!isNetworkish(err)) throw err; const res = await fetch('/functions/v1/purchase-content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'diag', content_type, content_id }) }); return safeParseJSON(res); }
}

export async function diagPlan() {
  try { return await invokeWrapper<any>('pay-plan', { action: 'diag' }); }
  catch (err) { if (!isNetworkish(err)) throw err; const res = await fetch('/functions/v1/pay-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'diag' }) }); return safeParseJSON(res); }
}
