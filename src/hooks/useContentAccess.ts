import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ContentAccessResult {
  allow: boolean;
  reason: string | null;
  required_plan: string | null;
  individual_price: number | null;
  loading: boolean;
  /**
   * Refresh access state. Pass force=true to bypass the in-memory cache and re-query Supabase.
   * Without force, a cached result (if present) is reused for speed.
   */
  refresh: (force?: boolean) => Promise<void>;
}

interface CacheKey { content_type: string; content_id: string; }

interface AccessRow { allow: boolean; reason: string | null; required_plan: string | null; individual_price: number | null; }

const memCache = new Map<string, AccessRow>();
function key(k: CacheKey) { return `${k.content_type}:${k.content_id}`; }

async function fetchAccess(userId: string | undefined, content_type: string, content_id: string): Promise<AccessRow> {
  if (!userId) return { allow: false, reason: 'NO_AUTH', required_plan: null, individual_price: null };
  const { data, error } = await supabase.rpc('can_access_content', { p_user: userId, p_content_type: content_type, p_content_id: content_id });
  if (error) {
    console.warn('can_access_content error', error);
    // Manual fallback reconstruction similar to edge function logic
    try {
      const planRes = await supabase.from('user_plans').select('plan').eq('user_id', userId).maybeSingle();
      let plan = planRes.data?.plan || 'free';
      const entRes = await supabase.from('content_entitlements').select('required_plan,individual_price,active').eq('content_type', content_type).eq('content_id', content_id).maybeSingle();
      if (!entRes.data) {
        // No entitlement row: free-by-default for challenges
        const pRes = await supabase.from('user_content_purchases').select('id').eq('user_id', userId).eq('content_type', content_type).eq('content_id', content_id).limit(1);
        if (pRes.data && pRes.data.length) return { allow: true, reason: 'PURCHASE_OK_NO_ENT', required_plan: null, individual_price: null };
        if (content_type === 'challenge') return { allow: true, reason: 'FREE_CHALLENGE', required_plan: null, individual_price: null };
        return { allow: false, reason: 'NO_ENTITLEMENT', required_plan: null, individual_price: null };
      }
      const ent = entRes.data;
      if (ent.active === false) return { allow: false, reason: 'INACTIVE', required_plan: ent.required_plan || null, individual_price: ent.individual_price ?? null };
      // Plan check
      if (ent.required_plan) {
        if ((ent.required_plan === 'hifi' && (plan === 'hifi' || plan === 'sify')) || (ent.required_plan === 'sify' && plan === 'sify')) {
          return { allow: true, reason: 'PLAN_OK', required_plan: ent.required_plan, individual_price: ent.individual_price ?? null };
        }
      }
      // Purchase check
      if (ent.individual_price !== null && ent.individual_price !== undefined) {
        const pRes = await supabase.from('user_content_purchases').select('id').eq('user_id', userId).eq('content_type', content_type).eq('content_id', content_id).limit(1);
        if (pRes.data && pRes.data.length) {
          return { allow: true, reason: 'PURCHASE_OK', required_plan: ent.required_plan || null, individual_price: ent.individual_price ?? null };
        }
        return { allow: false, reason: 'UPGRADE_OR_BUY', required_plan: ent.required_plan || null, individual_price: ent.individual_price ?? null };
      }
      return { allow: false, reason: 'UPGRADE_OR_BUY', required_plan: ent.required_plan || null, individual_price: ent.individual_price ?? null };
    } catch (fallbackErr) {
      console.warn('access fallback failed', fallbackErr);
      return { allow: false, reason: 'ERR_FALLBACK', required_plan: null, individual_price: null };
    }
  }
  if (!data || !data[0]) return { allow: false, reason: 'NO_DATA', required_plan: null, individual_price: null };
  const row = data[0];
  return { allow: row.allow, reason: row.reason, required_plan: row.required_plan, individual_price: row.individual_price };
}

export function useContentAccess(content_type: string, content_id: string): ContentAccessResult {
  const [state, setState] = useState<AccessRow & { loading: boolean }>({ allow: false, reason: null, required_plan: null, individual_price: null, loading: true });
  const current = useRef({ content_type, content_id });

  useEffect(() => { current.current = { content_type, content_id }; }, [content_type, content_id]);

  const load = useCallback(async (force?: boolean) => {
    const user = (await supabase.auth.getUser()).data.user;
    const k = key({ content_type, content_id });
    if (!force && memCache.has(k)) {
      setState({ ...memCache.get(k)!, loading: false });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    const res = await fetchAccess(user?.id, content_type, content_id);
    memCache.set(k, res);
    if (current.current.content_id === content_id && current.current.content_type === content_type) {
      setState({ ...res, loading: false });
    }
  }, [content_type, content_id]);

  useEffect(() => { load(); }, [load]);

  return { ...state, refresh: (force?: boolean) => load(force) };
}
