-- Link entitlements to originating purchase/subscription for precise revocation
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS origin_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL;
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS origin_subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS entitlements_origin_purchase_idx ON public.entitlements(origin_purchase_id);
CREATE INDEX IF NOT EXISTS entitlements_origin_subscription_idx ON public.entitlements(origin_subscription_id);

-- Grant entitlements for a purchase referencing origin_purchase_id
CREATE OR REPLACE FUNCTION public.grant_purchase_entitlements(p_purchase uuid, p_duration_days int DEFAULT NULL)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_purchase RECORD; v_count int := 0; v_scope text; v_scopes text[]; BEGIN
  SELECT user_id, product_id INTO v_purchase FROM public.purchases WHERE id = p_purchase;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT entitlement_scopes INTO v_scopes FROM public.products WHERE id = v_purchase.product_id;
  IF v_scopes IS NULL THEN RETURN 0; END IF;
  FOREACH v_scope IN ARRAY v_scopes LOOP
    INSERT INTO public.entitlements(user_id, product_id, scope, starts_at, ends_at, origin_purchase_id)
    VALUES (v_purchase.user_id, v_purchase.product_id, v_scope, now(), CASE WHEN p_duration_days IS NULL THEN NULL ELSE now() + (p_duration_days || ' days')::interval END, p_purchase);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- Grant entitlements for a subscription referencing origin_subscription_id
CREATE OR REPLACE FUNCTION public.grant_subscription_entitlements(p_subscription uuid, p_duration_days int DEFAULT NULL)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_sub RECORD; v_count int := 0; v_scope text; v_scopes text[]; BEGIN
  SELECT user_id, product_id INTO v_sub FROM public.subscriptions WHERE id = p_subscription;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT entitlement_scopes INTO v_scopes FROM public.products WHERE id = v_sub.product_id;
  IF v_scopes IS NULL THEN RETURN 0; END IF;
  FOREACH v_scope IN ARRAY v_scopes LOOP
    INSERT INTO public.entitlements(user_id, product_id, scope, starts_at, ends_at, origin_subscription_id)
    VALUES (v_sub.user_id, v_sub.product_id, v_scope, now(), CASE WHEN p_duration_days IS NULL THEN NULL ELSE now() + (p_duration_days || ' days')::interval END, p_subscription);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- Revoke entitlements from a purchase (soft revoke: set active=false & ends_at=now())
CREATE OR REPLACE FUNCTION public.revoke_purchase_entitlements(p_purchase uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_count int; BEGIN
  UPDATE public.entitlements SET active=false, ends_at=now() WHERE origin_purchase_id = p_purchase AND active=true;
  GET DIAGNOSTICS v_count = ROW_COUNT; RETURN v_count; END; $$;

-- Revoke entitlements from a subscription (soft revoke)
CREATE OR REPLACE FUNCTION public.revoke_subscription_entitlements(p_subscription uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_count int; BEGIN
  UPDATE public.entitlements SET active=false, ends_at=now() WHERE origin_subscription_id = p_subscription AND active=true;
  GET DIAGNOSTICS v_count = ROW_COUNT; RETURN v_count; END; $$;
