-- Billing Processing Helpers (Razorpay) 2025-09-25

-- 1. Function: upsert_purchase_from_payment
CREATE OR REPLACE FUNCTION public.upsert_purchase_from_payment(p_user uuid, p_product uuid, p_price uuid, p_provider text, p_payment_id text, p_amount int, p_currency text, p_status text, p_paid_at timestamptz, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid; BEGIN
  -- Try find existing purchase
  SELECT id INTO v_id FROM public.purchases WHERE provider_payment_intent_id = p_payment_id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.purchases(user_id, product_id, price_id, provider, provider_payment_intent_id, status, amount_total, currency, paid_at, metadata)
    VALUES (p_user, p_product, p_price, p_provider, p_payment_id, p_status, p_amount, p_currency, p_paid_at, p_metadata)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.purchases SET status = p_status, amount_total = p_amount, currency = p_currency, paid_at = p_paid_at, metadata = coalesce(metadata,'{}'::jsonb) || p_metadata
    WHERE id = v_id;
  END IF;
  RETURN v_id; END; $$;

-- 2. Function: upsert_subscription_from_event (placeholder for future sub logic)
CREATE OR REPLACE FUNCTION public.upsert_subscription_from_event(p_user uuid, p_product uuid, p_provider text, p_provider_sub_id text, p_status text, p_current_end timestamptz)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM public.subscriptions WHERE provider_subscription_id = p_provider_sub_id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.subscriptions(user_id, product_id, provider, provider_subscription_id, status, current_period_end)
    VALUES (p_user, p_product, p_provider, p_provider_sub_id, p_status, p_current_end)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.subscriptions SET status = p_status, current_period_end = p_current_end WHERE id = v_id;
  END IF;
  RETURN v_id; END; $$;

-- 3. Index suggestions if not existing
CREATE INDEX IF NOT EXISTS purchases_payment_intent_idx ON public.purchases(provider_payment_intent_id);
CREATE INDEX IF NOT EXISTS subscriptions_provider_sub_id_idx ON public.subscriptions(provider_subscription_id);
