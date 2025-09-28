-- Patch policies to prevent 500 errors on content_entitlements when admin_roles empty or role not authenticated
-- 1. Drop existing policies
DO $$ BEGIN
  IF exists (select 1 from pg_policies where policyname='content_entitlements_select') THEN
    DROP POLICY content_entitlements_select ON public.content_entitlements;
  END IF;
  IF exists (select 1 from pg_policies where policyname='content_entitlements_manage') THEN
    DROP POLICY content_entitlements_manage ON public.content_entitlements;
  END IF;
END $$;

-- 2. Recreate select policy allowing authenticated or service role (for edge functions) and treating missing role() as authenticated fallback
CREATE POLICY content_entitlements_select ON public.content_entitlements
  FOR SELECT USING ( auth.role() in ('authenticated','service_role') OR auth.uid() is not null );

-- 3. Recreate manage policy with EXISTS guard but tolerate empty admin_roles by short-circuiting on a secure header flag (optional future)
CREATE POLICY content_entitlements_manage ON public.content_entitlements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
       WHERE ar.user_id = auth.uid()
         AND ar.role IN ('billing_manager','superadmin','content_admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
       WHERE ar.user_id = auth.uid()
         AND ar.role IN ('billing_manager','superadmin','content_admin')
    )
  );

-- 4. Ensure index on (content_type, content_id)
CREATE INDEX IF NOT EXISTS idx_content_entitlements_lookup ON public.content_entitlements(content_type, content_id);
