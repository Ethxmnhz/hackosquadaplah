import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/api';
import type { Entitlement } from '../lib/billing';
import { hasEntitlement as hasEntInternal } from '../lib/billing';

interface State {
  entitlements: Entitlement[];
  loading: boolean;
  error?: string;
}

export function useEntitlements() {
  const [state, setState] = useState<State>({ entitlements: [], loading: true });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: undefined }));
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setState({ entitlements: [], loading: false });
      return;
    }
    // Prefer dynamic view if present
    let { data, error } = await supabase
      .from('entitlements_effective')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      // Fallback to base table (older migration set)
      const fb = await supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', user.id);
      data = fb.data; error = fb.error;
    }
    if (error) {
      setState({ entitlements: [], loading: false, error: error.message });
    } else {
      setState({ entitlements: (data as Entitlement[]) || [], loading: false });
    }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { sub.subscription.unsubscribe(); };
  }, [load]);

  const hasEntitlement = useCallback((scope: string) => {
    return hasEntInternal(scope, state.entitlements);
  }, [state.entitlements]);

  return { ...state, refresh: load, hasEntitlement };
}
