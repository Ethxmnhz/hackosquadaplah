-- Rollback: Remove post-minimal security hardening RPCs and revert cert grant function
-- Timestamp: 2025-09-28 19:00:00
-- Scope:
--   * Drop: admin_list_grants, admin_approve_challenge, admin_reject_challenge
--   * Drop policy: admin_update_challenges (if exists)
--   * Revert admin_grant_certificate to authoritative (pre-rate-limit) version from 17:30 migration
--   * KEEP minimal critical security changes (is_admin(), rate-limited admin_grant_plan) INTACT
-- Safety: Idempotent guards via IF EXISTS where possible

-- 1. Drop later-added RPCs (safe if absent)
DROP FUNCTION IF EXISTS public.admin_list_grants(int,int);
DROP FUNCTION IF EXISTS public.admin_approve_challenge(uuid,text);
DROP FUNCTION IF EXISTS public.admin_reject_challenge(uuid,text);

-- 2. Drop optional policy introduced for future non-SECURITY DEFINER moderation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public'
       AND tablename='challenges'
       AND policyname='admin_update_challenges'
  ) THEN
    EXECUTE 'DROP POLICY admin_update_challenges ON public.challenges';
  END IF;
END
$$;

-- 3. Revert admin_grant_certificate to pre-rate-limit version
DROP FUNCTION IF EXISTS public.admin_grant_certificate(text,uuid,text);
CREATE FUNCTION public.admin_grant_certificate(
  p_target_email text,
  p_cert_id uuid,
  p_note text DEFAULT NULL
) RETURNS TABLE (
  user_id uuid,
  content_id uuid,
  created_at timestamptz,
  already_had boolean
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid;
  v_target uuid;
  v_exists boolean;
BEGIN
  SELECT auth.uid() INTO v_actor;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = v_actor AND ar.role IN ('billing_manager','superadmin')
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT u.id INTO v_target FROM auth.users u WHERE lower(u.email) = lower(p_target_email);
  IF v_target IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;

  SELECT true INTO v_exists FROM public.user_content_purchases p
    WHERE p.user_id = v_target AND p.content_type='cert' AND p.content_id = p_cert_id;
  IF NOT FOUND THEN v_exists := false; END IF;

  IF NOT v_exists THEN
    INSERT INTO public.user_content_purchases(user_id, content_type, content_id, price_paid, currency, payment_ref)
      VALUES (v_target, 'cert', p_cert_id, 0, 'INR', 'ADMIN-GRANT');
  END IF;

  -- Audit insert best-effort (ignore if table not present)
  BEGIN
    INSERT INTO public.admin_grant_audit(actor, target_user, action, content_type, content_id, note)
      VALUES (v_actor, v_target, 'GRANT_CERT', 'cert', p_cert_id, p_note);
  EXCEPTION WHEN undefined_table THEN
    PERFORM 1;
  END;

  RETURN QUERY SELECT v_target AS user_id, p_cert_id AS content_id, now() AS created_at, v_exists AS already_had;
END;$$;
COMMENT ON FUNCTION public.admin_grant_certificate(text,uuid,text) IS 'Admin only: grants certificate by zero-price purchase if absent; logs audit.';

-- End rollback migration
