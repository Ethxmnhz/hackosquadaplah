-- Full rollback of billing system introduced after logic_plan.md baseline
-- This migration attempts to remove all billing-related objects (tables, functions, policies, views)
-- Added with defensive IF EXISTS so it can be re-run safely in non-production clones.
-- NOTE: This is destructive. Data will be lost. Ensure you have backups before applying.

begin;

-- 1. Drop dependent views if any
DROP VIEW IF EXISTS public.entitlements_effective;

-- 2. Drop functions (dependency order independent with IF EXISTS)
DROP FUNCTION IF EXISTS public.grant_entitlement(uuid, uuid, text, integer);
DROP FUNCTION IF EXISTS public.grant_product_entitlements(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.grant_purchase_entitlements(uuid, integer);
DROP FUNCTION IF EXISTS public.grant_subscription_entitlements(uuid, integer);
DROP FUNCTION IF EXISTS public.revoke_purchase_entitlements(uuid);
DROP FUNCTION IF EXISTS public.revoke_subscription_entitlements(uuid);

-- 3. Drop policies (explicit for clarity though tables will be dropped)
DO $$
DECLARE r record; BEGIN
  FOR r IN SELECT policyname, tablename
           FROM pg_policies
           WHERE schemaname='public'
             AND tablename IN ('products','prices','purchases','subscriptions','entitlements','vouchers','provider_events','admin_users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 4. Drop tables (order reverses FK dependencies)
DROP TABLE IF EXISTS public.provider_events CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.entitlements CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.prices CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
-- Optional: admin_users if it was ONLY for billing admin. Comment out if shared elsewhere.
DROP TABLE IF EXISTS public.admin_users CASCADE;

-- 5. Clean up any leftover sequences (Postgres normally handles via CASCADE when owned)
-- No explicit sequence drops required if OWNED BY was set.

commit;
