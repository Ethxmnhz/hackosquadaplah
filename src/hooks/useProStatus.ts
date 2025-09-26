import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/api';

interface ProStatusState {
  loading: boolean;
  isPro: boolean;
  expiresAt: string | null;
  refreshing: boolean;
  error?: string;
}

export function useProStatus() {
  const [state, setState] = useState<ProStatusState>({ loading: true, isPro: false, expiresAt: null, refreshing: false });

  const load = useCallback(async () => {
    setState(s => ({ ...s, refreshing: true }));
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        setState({ loading: false, isPro: false, expiresAt: null, refreshing: false });
        return;
      }
      // Get pro status view
      const { data: statusRow } = await supabase.from('pro_status').select('*').eq('user_id', user.id).maybeSingle();
      let isPro = statusRow?.is_pro || false;
      let expiresAt: string | null = null;
      if (isPro) {
        const { data: sub } = await supabase
          .from('pro_subscriptions')
          .select('ends_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('ends_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        expiresAt = sub?.ends_at || null;
      }
      setState({ loading: false, isPro, expiresAt, refreshing: false });
    } catch (e:any) {
      setState({ loading: false, isPro: false, expiresAt: null, refreshing: false, error: e.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activateTestPro = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.rpc('activate_pro_one_day', { p_user: user.id });
      if (error) throw error;
      await load();
      return { success: true };
    } catch (e:any) {
      return { success: false, error: e.message };
    }
  }, [load]);

  const cancelProNow = useCallback( async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.rpc('cancel_pro_now', { p_user: user.id });
      if (error) throw error;
      await load();
      return { success: true };
    } catch (e:any) {
      return { success: false, error: e.message };
    }
  }, [load]);

  return { ...state, refresh: load, activateTestPro, cancelProNow };
}
