-- Migration: Fix infinite recursion in admin_roles policies
-- Replace self-referential subselect with helper function.

CREATE OR REPLACE FUNCTION public.is_superadmin(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles r WHERE r.user_id = p_user AND r.role = 'superadmin'
  );
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname='admin_roles_select_self_or_admin') THEN
    DROP POLICY admin_roles_select_self_or_admin ON public.admin_roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname='admin_roles_manage_superadmin') THEN
    DROP POLICY admin_roles_manage_superadmin ON public.admin_roles;
  END IF;
END $$;

-- New read policy: user sees own rows; superadmin sees all
CREATE POLICY admin_roles_select ON public.admin_roles
  FOR SELECT USING ( auth.uid() = user_id OR public.is_superadmin(auth.uid()) );

-- Manage policy: only superadmin can insert/update/delete
CREATE POLICY admin_roles_manage ON public.admin_roles
  FOR ALL USING ( public.is_superadmin(auth.uid()) )
  WITH CHECK ( public.is_superadmin(auth.uid()) );

COMMENT ON FUNCTION public.is_superadmin(uuid) IS 'True if user has superadmin role; used to avoid recursive RLS subselect patterns.';
