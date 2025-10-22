-- Restore admin update policy for challenges after rollback removed moderation RPCs
-- Timestamp: 2025-09-28 19:05:00
-- Grants UPDATE on challenges to users with roles content_admin or superadmin via admin_roles table.
-- Idempotent: drops existing policy of same name first.

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_update_challenges ON public.challenges;
CREATE POLICY admin_update_challenges ON public.challenges
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role IN ('content_admin','superadmin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid() AND ar.role IN ('content_admin','superadmin'))
  );

-- Note: If earlier broad admin policies exist (e.g., Admins can manage all challenges using admin_users table), they may overlap.
-- This policy specifically ties to admin_roles, aligning with billing/admin model.

-- End restore policy migration
