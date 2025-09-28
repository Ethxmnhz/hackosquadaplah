-- Simplify policies to avoid 500 errors from subqueries when admin_roles empty or RLS recursion issues
-- Helper: is_billing_admin() returns true if user has any privileged role; tolerates missing table.

CREATE OR REPLACE FUNCTION public.is_billing_admin(p_user uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE ok boolean;
BEGIN
  -- quick exit if no user
  IF p_user IS NULL THEN RETURN FALSE; END IF;
  -- verify table exists
  PERFORM 1 FROM pg_class WHERE relname = 'admin_roles' AND relnamespace = 'public'::regnamespace;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  SELECT true INTO ok FROM public.admin_roles ar
   WHERE ar.user_id = p_user AND ar.role IN ('billing_manager','superadmin','content_admin') LIMIT 1;
  RETURN coalesce(ok,false);
END;$$;

-- Drop existing policies to recreate
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname='content_entitlements_select') THEN
    DROP POLICY content_entitlements_select ON public.content_entitlements;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname='content_entitlements_manage') THEN
    DROP POLICY content_entitlements_manage ON public.content_entitlements;
  END IF;
END $$;

-- Open read to any authenticated or service role (avoid surprises) -- tighten later if needed
CREATE POLICY content_entitlements_select ON public.content_entitlements
  FOR SELECT USING ( auth.role() IN ('authenticated','service_role') OR auth.uid() IS NOT NULL );

-- Manage policy delegates to helper function
CREATE POLICY content_entitlements_manage ON public.content_entitlements
  FOR ALL USING ( public.is_billing_admin(auth.uid()) )
  WITH CHECK ( public.is_billing_admin(auth.uid()) );

COMMENT ON FUNCTION public.is_billing_admin(uuid) IS 'Returns true when user has a privileged billing/admin role; safe if admin_roles missing.';
