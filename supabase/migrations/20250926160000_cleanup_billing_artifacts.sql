-- Cleanup Migration: Remove legacy / experimental billing & subscription artifacts
-- Date: 2025-09-26
-- Purpose: Safely drop all tables, views, functions, policies, and columns introduced by
--          the (now removed) billing / subscription / entitlements implementations.
-- NOTE: This is idempotent (uses IF EXISTS and defensive dynamic drops) so it can be re-run.

-- =============================
-- 1. Views
-- =============================
DROP VIEW IF EXISTS pro_status CASCADE;                -- minimal free/pro view
DROP VIEW IF EXISTS entitlements_effective CASCADE;    -- original entitlement effective view

-- =============================
-- 2. Dynamic drop of functions by name (any signature)
-- =============================
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT p.oid::regprocedure AS proc_reg
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'activate_pro_one_day',
        'cancel_pro_now',
        'grant_entitlement',
        'grant_product_entitlements',
        'grant_purchase_entitlements',
        'grant_subscription_entitlements',
        'revoke_purchase_entitlements',
        'revoke_subscription_entitlements'
      )
  ) LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.proc_reg);
  END LOOP;
END $$;

-- =============================
-- 3. Tables (drop dependents first)
-- Order chosen to satisfy foreign key dependencies where they may exist.
-- =============================
DROP TABLE IF EXISTS pro_subscriptions CASCADE;          -- minimal model
DROP TABLE IF EXISTS pro_content_requirements CASCADE;   -- minimal model

-- Legacy billing schema tables
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS provider_events CASCADE;

-- Ancillary admin table
DROP TABLE IF EXISTS admin_users CASCADE;

-- =============================
-- 4. Remove added columns (access tiers etc.) if they were introduced and still remain.
-- (Ignore errors if columns never existed.)
-- =============================
DO $$
BEGIN
  -- Helper: safely drop a column if present
  PERFORM 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='challenges' AND column_name='access_tier';
  IF FOUND THEN
    ALTER TABLE public.challenges DROP COLUMN IF EXISTS access_tier;
  END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='labs' AND column_name='access_tier';
  IF FOUND THEN
    ALTER TABLE public.labs DROP COLUMN IF EXISTS access_tier;
  END IF;

  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='skill_paths' AND column_name='access_tier';
  IF FOUND THEN
    ALTER TABLE public.skill_paths DROP COLUMN IF EXISTS access_tier;
  END IF;

  -- Add additional tables here if other content types received access_tier columns earlier.
END $$;

-- =============================
-- 5. Policy cleanup (defensive) for tables that might still exist if prior drops skipped
--    These EXECUTEs only run if the table is present.
-- =============================
DO $$
DECLARE rec RECORD;
BEGIN
  -- Minimal model tables
  IF to_regclass('public.pro_subscriptions') IS NOT NULL THEN
    FOR rec IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pro_subscriptions' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pro_subscriptions', rec.policyname);
    END LOOP;
  END IF;

  IF to_regclass('public.pro_content_requirements') IS NOT NULL THEN
    FOR rec IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pro_content_requirements' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pro_content_requirements', rec.policyname);
    END LOOP;
  END IF;

  -- Legacy billing tables (single pass)
  FOR rec IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('entitlements','vouchers','purchases','subscriptions','prices','products','provider_events')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

-- =============================
-- 6. Extension / sequence housekeeping (nothing specific here; sequences removed via CASCADE).
-- =============================

-- =============================
-- 7. Verification comments (no runtime effect)
-- =============================
-- After applying this migration, verify:
--   SELECT * FROM pg_tables WHERE tablename IN ('products','prices','subscriptions','purchases','entitlements','vouchers','provider_events','pro_subscriptions','pro_content_requirements','admin_users');
--   SELECT * FROM pg_proc WHERE proname IN ('activate_pro_one_day','cancel_pro_now');
-- All should return zero rows.

-- Completed cleanup.