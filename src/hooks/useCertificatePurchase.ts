import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { openRazorpay } from '../lib/razorpay';
import { createContentPurchase, verifyContentPurchase } from '../lib/payments';
import { useContentAccess } from './useContentAccess';

interface BuyState {
  purchasing: boolean;
  error: string | null;
  success: boolean;
}

const ERROR_MAP: Record<string, string> = {
  NO_PRICE: 'Price not available yet for this certification.',
  NO_INDIVIDUAL_PRICE: 'Not yet priced. An admin must set an Individual Price in billing-admin > Entitlements for this cert.',
  NOT_AUTH: 'Please sign in to purchase.',
  NO_KEY: 'Payment processor key missing. Try again later.',
  ORDER_FAILED: 'Could not create order. Please retry.',
  VERIFY_FAILED: 'Verification failed. Contact support if charged.',
  PURCHASE_ERR: 'Unexpected purchase error. Retry shortly.'
};

export function useCertificatePurchase(certId: string) {
  const access = useContentAccess('cert', certId);
  const [fallbackPrice, setFallbackPrice] = useState<number | null>(null);
  const [buyState, setBuyState] = useState<BuyState>({ purchasing: false, error: null, success: false });
  const [optimisticUnlocked, setOptimisticUnlocked] = useState(false);

  const buy = useCallback(async () => {
    if (access.loading) return;
    if (access.allow) return; // already unlocked
    const priceToUse = access.individual_price ?? fallbackPrice;
    if (!priceToUse) {
      setBuyState(s => ({ ...s, error: 'NO_PRICE' }));
      return;
    }
    setBuyState({ purchasing: true, error: null, success: false });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('NOT_AUTH');
      // create order (invoke-first -> fallback) via payments util
      const createPayload = await createContentPurchase({ content_type: 'cert', content_id: certId });
      if (createPayload.already) {
        // Optimistic unlock then force refresh
        setOptimisticUnlocked(true);
        await access.refresh(true);
        setBuyState({ purchasing: false, error: null, success: true });
        // Poll once more after short delay in case replication lag
        setTimeout(() => access.refresh(true), 500);
        return;
      }
      if (!createPayload.order_id) throw new Error('NO_ORDER_ID');
      // Mock mode shortcut
      if (createPayload.mock) {
        const verifyPayload = await verifyContentPurchase(
          createPayload.order_id,
          'pay_mock_'+crypto.randomUUID(),
          'sig_mock',
          'cert',
          certId
        );
        if (!verifyPayload || verifyPayload.success === false) throw new Error('VERIFY_FAILED');
        setOptimisticUnlocked(true);
        await access.refresh(true);
        setBuyState({ purchasing: false, error: null, success: true });
        setTimeout(() => access.refresh(true), 500);
        return;
      }
      // Real Razorpay flow
      if (!createPayload.key) throw new Error('NO_KEY');
      await openRazorpay({
        key: createPayload.key || '',
        amount: createPayload.amount,
        currency: createPayload.currency || 'INR',
        order_id: createPayload.order_id,
        name: 'Certification Purchase',
        description: 'Unlock certification',
        handler: async (rzpRes) => {
          try {
            const verifyPayload = await verifyContentPurchase(
              rzpRes.razorpay_order_id,
              rzpRes.razorpay_payment_id,
              rzpRes.razorpay_signature,
              'cert',
              certId
            );
            if (!verifyPayload || verifyPayload.success === false) throw new Error('VERIFY_FAILED');
            setOptimisticUnlocked(true);
            await access.refresh(true);
            setBuyState({ purchasing: false, error: null, success: true });
            setTimeout(() => access.refresh(true), 500);
          } catch (e:any) {
            setBuyState({ purchasing: false, error: e.message || 'VERIFY_ERR', success: false });
          }
        }
      });
      // UI remains in purchasing state until handler resolves
    } catch (e:any) {
      const raw = e?.message || 'PURCHASE_ERR';
      const friendly = ERROR_MAP[raw as keyof typeof ERROR_MAP] || raw;
      const meta = (e && typeof e === 'object') ? (e.status || e.code ? ` [s:${e.status||'-'} c:${e.code||'-'}]` : '') : '';
      setBuyState({ purchasing: false, error: friendly + (friendly !== raw ? ` (${raw})` : '') + meta, success: false });
    }
  }, [access, certId, fallbackPrice]);

  // Fallback price fetch logic: if not unlocked and no price from access (maybe unauthenticated) fetch entitlement price directly
  useEffect(() => {
    const needsPrice = !access.loading && !access.individual_price && !fallbackPrice;
    if (!needsPrice) return;
    let cancelled = false;
    (async () => {
      try {
        // Attempt to read entitlement row anonymously (ensure RLS allows anon read of price fields)
        const { data, error } = await supabase
          .from('content_entitlements')
          .select('individual_price')
          .eq('content_type', 'cert')
          .eq('content_id', certId)
          .maybeSingle();
        if (!cancelled && !error && data && data.individual_price) {
          setFallbackPrice(data.individual_price);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [access.loading, access.individual_price, certId, fallbackPrice]);

  useEffect(() => {
    if (access.allow && buyState.purchasing) {
      setBuyState(s => ({ ...s, purchasing: false }));
    }
  }, [access.allow, buyState.purchasing]);

  return {
    loading: access.loading,
  unlocked: access.allow || optimisticUnlocked,
  price: access.individual_price ?? fallbackPrice,
    plan: access.required_plan,
    reason: access.reason,
    buy,
    purchasing: buyState.purchasing,
    error: buyState.error,
    success: buyState.success,
    refresh: (force?: boolean) => access.refresh(force)
  };
}