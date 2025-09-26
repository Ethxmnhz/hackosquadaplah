-- Minimal Two-Plan Billing (Free / Pro) - 1 day test period, ₹1 price
-- This replaces the complex multi-product system with a lightweight approach.
-- Apply AFTER running full rollback migration if the legacy billing schema exists.

BEGIN;

-- 1. Core table: pro_subscriptions
CREATE TABLE IF NOT EXISTS public.pro_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'expired'
  provider text DEFAULT 'razorpay',
  provider_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cannot use now() in a partial index predicate (needs IMMUTABLE). Use status only; time condition can be applied in queries.
CREATE INDEX IF NOT EXISTS pro_subscriptions_user_active_idx
  ON public.pro_subscriptions (user_id, ends_at) WHERE status='active';

-- 2. Mapping of content that requires Pro (anything not listed is implicitly Free)
CREATE TABLE IF NOT EXISTS public.pro_content_requirements (
  content_type text NOT NULL, -- challenge | certification | lab | operation
  content_id uuid NOT NULL,
  added_by uuid REFERENCES auth.users (id),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_type, content_id)
);

-- 3. View: current pro status per user
CREATE OR REPLACE VIEW public.pro_status AS
SELECT u.id AS user_id,
       EXISTS (
         SELECT 1 FROM pro_subscriptions ps
         WHERE ps.user_id = u.id AND ps.status='active' AND ps.ends_at > now()
       ) AS is_pro
FROM auth.users u;

-- 4. Simple function to activate Pro for 1 day (test) - could be called after payment success
CREATE OR REPLACE FUNCTION public.activate_pro_one_day(p_user uuid, p_provider_order_id text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO pro_subscriptions (user_id, starts_at, ends_at, provider_order_id)
  VALUES (p_user, now(), now() + interval '1 day', p_provider_order_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS: enable and add basic policies
ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_content_requirements ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions; admins TBD (for now allow service_role or user match)
DROP POLICY IF EXISTS "pro_subs_select_own" ON public.pro_subscriptions;
CREATE POLICY "pro_subs_select_own" ON public.pro_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "pro_subs_insert_self" ON public.pro_subscriptions;
CREATE POLICY "pro_subs_insert_self" ON public.pro_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pro_content_requirements_read" ON public.pro_content_requirements;
CREATE POLICY "pro_content_requirements_read" ON public.pro_content_requirements
  FOR SELECT USING (true);

-- 6. Grant minimal privileges (adjust as needed)
GRANT SELECT ON public.pro_status TO authenticated;
GRANT SELECT, INSERT ON public.pro_subscriptions TO authenticated;
GRANT SELECT ON public.pro_content_requirements TO authenticated;

COMMIT;
