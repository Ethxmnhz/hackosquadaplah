-- Billing core schema (provider-agnostic)
-- Created: 2025-09-25

-- 1. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('plan','voucher','addon')),
  name text NOT NULL,
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. PRICES
CREATE TABLE IF NOT EXISTS public.prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('one_time','monthly','yearly')),
  currency text NOT NULL CHECK (char_length(currency)=3),
  unit_amount integer NOT NULL CHECK (unit_amount >= 0),
  region text NOT NULL DEFAULT '*',
  provider text NOT NULL DEFAULT 'mock',
  provider_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prices_product_region_idx ON public.prices(product_id, region) WHERE is_active;
CREATE INDEX IF NOT EXISTS prices_provider_idx ON public.prices(provider);

-- 3. PURCHASES (one-time)
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  price_id uuid REFERENCES public.prices(id),
  provider text NOT NULL,
  provider_checkout_id text,
  provider_payment_intent_id text,
  status text NOT NULL CHECK (status IN ('created','paid','refunded','failed','canceled')),
  amount_total integer NOT NULL,
  currency text NOT NULL CHECK (char_length(currency)=3),
  paid_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchases_user_status_idx ON public.purchases(user_id, status);

-- 4. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  provider text NOT NULL,
  provider_subscription_id text,
  status text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON public.subscriptions(user_id, status);

-- 5. ENTITLEMENTS
CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('subscription','voucher','grant')),
  product_id uuid REFERENCES public.products(id),
  scope text NOT NULL,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  -- NOTE: Cannot use a generated column with now(); keep as a plain column for now.
  -- Option A later: remove this column and create a VIEW computing active dynamically.
  -- Option B: background job / trigger to refresh for future-dated or expiring entitlements.
  active boolean DEFAULT true
);
CREATE INDEX IF NOT EXISTS entitlements_user_scope_idx ON public.entitlements(user_id, scope);

-- 6. VOUCHERS
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','redeemed','void')),
  redeemed_by uuid REFERENCES auth.users(id),
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vouchers_status_idx ON public.vouchers(status);

-- 7. PROVIDER EVENTS (webhook logs)
CREATE TABLE IF NOT EXISTS public.provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  signature_valid boolean,
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  result text CHECK (result IN ('success','error')),
  error_message text
);
CREATE INDEX IF NOT EXISTS provider_events_provider_received_idx ON public.provider_events(provider, received_at DESC);

-- 8. RLS policies (simplified for now)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Basic owner policies (adjust for security later)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='purchases' AND policyname='purchases_owner_select'
  ) THEN
    CREATE POLICY purchases_owner_select ON public.purchases FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_owner_select'
  ) THEN
    CREATE POLICY subscriptions_owner_select ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entitlements' AND policyname='entitlements_owner_select'
  ) THEN
    CREATE POLICY entitlements_owner_select ON public.entitlements FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vouchers' AND policyname='vouchers_redeem_select'
  ) THEN
    CREATE POLICY vouchers_redeem_select ON public.vouchers FOR SELECT USING (status='available' OR redeemed_by = auth.uid());
  END IF;
END $$;

-- Admin role placeholder (assumes a role 'service_role' or custom claim); refine later
-- Example: create policy for service role bypass (Supabase service key) not needed because service key bypasses RLS.

-- 9. Helper function: grant_entitlement
CREATE OR REPLACE FUNCTION public.grant_entitlement(p_user uuid, p_product uuid, p_scope text, p_duration_days int DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid; BEGIN
  INSERT INTO public.entitlements(user_id, product_id, scope, starts_at, ends_at)
  VALUES (p_user, p_product, p_scope, now(), CASE WHEN p_duration_days IS NULL THEN NULL ELSE now() + (p_duration_days || ' days')::interval END)
  RETURNING id INTO v_id; RETURN v_id; END; $$;

-- 10. Mock seed data (optional, safe to rerun with ON CONFLICT DO NOTHING)
INSERT INTO public.products(id, slug, type, name, description)
VALUES
  (gen_random_uuid(),'basic-plan','plan','Basic Plan','Access to core content'),
  (gen_random_uuid(),'pro-plan','plan','Pro Plan','Access to premium + all challenges'),
  (gen_random_uuid(),'elite-plan','plan','Elite Plan','All access including Red vs Blue operations'),
  (gen_random_uuid(),'cert-net-101','voucher','NET-101 Certification','Single certification access'),
  (gen_random_uuid(),'op-alpha','voucher','Operation Alpha','Single Red vs Blue operation')
ON CONFLICT DO NOTHING;

-- NOTE: Add region-specific prices later; keep provider='mock' for now.
