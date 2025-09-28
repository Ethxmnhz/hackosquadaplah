-- View: v_user_purchases
-- Provides enriched purchase data for admin billing panel.
create or replace view public.v_user_purchases as
select
  ucp.id,
  ucp.user_id,
  au.email,
  ucp.content_type,
  ucp.content_id,
  ucp.price_paid,
  ucp.currency,
  ucp.payment_ref,
  ucp.created_at,
  ce.required_plan,
  ce.individual_price,
  ce.active
from public.user_content_purchases ucp
left join auth.users au on au.id = ucp.user_id
left join public.content_entitlements ce on ce.content_type = ucp.content_type and ce.content_id = ucp.content_id;

comment on view public.v_user_purchases is 'Admin view of user content purchases with user email and entitlement context.';

-- RLS: expose only to admins via a security definer function or rely on policy if needed.
-- Simpler approach: create a function that selects from view guarded by admin_roles check (future enhancement).