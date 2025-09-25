-- Billing enhancements: dynamic entitlements view, product scopes, hardened policies
-- Created: 2025-09-25

-- 1. Add entitlement_scopes to products (array of text scopes this product grants)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS entitlement_scopes text[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS products_type_idx ON public.products(type);

-- 2. View computing active entitlements dynamically (time-based)
DROP VIEW IF EXISTS public.entitlements_effective;
CREATE VIEW public.entitlements_effective AS
SELECT 
  e.id,
  e.user_id,
  e.source,
  e.product_id,
  e.scope,
  e.starts_at,
  e.ends_at,
  -- original table has a boolean active column default true; we recompute for accuracy as active_effective
  (e.starts_at <= now()) AND (e.ends_at IS NULL OR e.ends_at > now()) AS active,
  e.active AS active_original
FROM public.entitlements e;

-- 3. Harden RLS: ensure only service key can write (Supabase service bypasses RLS). For client roles, keep read-only (already have select policies). Optionally add explicit deny rules by omitting write policies.
-- (If later you need user-initiated actions, expose through edge functions running with service role.)
-- Add explicit insert/update/delete policies for clarity (currently restrict to auth.role() = 'service_role' placeholder; adjust to your JWT claim model).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='purchases_service_write') THEN
    CREATE POLICY purchases_service_write ON public.purchases FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_service_write') THEN
    CREATE POLICY subscriptions_service_write ON public.subscriptions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='entitlements_service_write') THEN
    CREATE POLICY entitlements_service_write ON public.entitlements FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='vouchers_service_write') THEN
    CREATE POLICY vouchers_service_write ON public.vouchers FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 4. Helper function: grant all scopes from a product (plan or voucher)
CREATE OR REPLACE FUNCTION public.grant_product_entitlements(p_user uuid, p_product uuid, p_duration_days int DEFAULT NULL)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_scopes text[]; v_count int := 0; v_scope text; BEGIN
  SELECT entitlement_scopes INTO v_scopes FROM public.products WHERE id = p_product;
  IF v_scopes IS NULL OR array_length(v_scopes,1) IS NULL THEN
    RETURN 0; -- nothing to grant
  END IF;
  FOREACH v_scope IN ARRAY v_scopes LOOP
    PERFORM public.grant_entitlement(p_user, p_product, v_scope, p_duration_days);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- 5. Unique index to guard duplicate voucher redemption race
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_code_unique ON public.vouchers(code);

-- 6. Comment describing usage
COMMENT ON VIEW public.entitlements_effective IS 'Entitlements with computed active flag; use this for UI queries instead of base table.';
