import { useCallback, useEffect, useRef, useState } from 'react';

export interface SubscriptionActivationPollerOptions {
  intervalMs?: number;
  maxDurationMs?: number; // stop after this long (optional)
}

interface PollerDeps<TSub> {
  fetchSubscriptions: () => Promise<TSub[]>; // must return plain array
  onActivated: (subs: TSub[]) => Promise<void> | void; // called when activation first detected
  isActive: (sub: TSub) => boolean; // predicate for active
}

export function useSubscriptionActivationPoller<TSub = any>(
  deps: PollerDeps<TSub>,
  opts: SubscriptionActivationPollerOptions = {}
) {
  const { fetchSubscriptions, onActivated, isActive } = deps;
  const { intervalMs = 3000, maxDurationMs } = opts;

  const [polling, setPolling] = useState(false);
  const [activationJustHappened, setActivationJustHappened] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hasActivatedRef = useRef(false);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const tick = useCallback(async () => {
    try {
      const subs = await fetchSubscriptions();
      const nowActive = subs.some(isActive);
      if (nowActive && !hasActivatedRef.current) {
        hasActivatedRef.current = true;
        setActivationJustHappened(true);
        try { await onActivated(subs); } catch (e) { /* swallow */ }
        stop();
        return;
      }
      if (maxDurationMs && startedAtRef.current && Date.now() - startedAtRef.current > maxDurationMs) {
        setTimedOut(true);
        stop();
      }
    } catch (e) {
      // network error: keep polling; optionally could backoff
    }
  }, [fetchSubscriptions, isActive, maxDurationMs, onActivated, stop]);

  const start = useCallback(() => {
    if (polling) return;
    setTimedOut(false);
    setActivationJustHappened(false);
    startedAtRef.current = Date.now();
    setPolling(true);
    tick(); // immediate
    intervalRef.current = window.setInterval(tick, intervalMs);
  }, [intervalMs, polling, tick]);

  useEffect(() => () => stop(), [stop]);

  const resetActivation = () => setActivationJustHappened(false);

  return { polling, start, stop, activationJustHappened, resetActivation, timedOut };
}
