-- Function to cancel (expire) active pro subscription immediately
BEGIN;
CREATE OR REPLACE FUNCTION public.cancel_pro_now(p_user uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.pro_subscriptions
  SET ends_at = now(), status = 'expired'
  WHERE user_id = p_user AND status='active' AND ends_at > now();
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_pro_now(uuid) TO authenticated;
COMMIT;
