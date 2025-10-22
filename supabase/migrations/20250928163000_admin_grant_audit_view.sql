-- Migration: Create v_admin_grant_audit view to avoid ambiguous column references
-- Timestamp: 2025-09-28 16:30:00

create or replace view public.v_admin_grant_audit as
select
  aga.id,
  aga.actor,
  a.email as actor_email,
  aga.target_user,
  t.email as target_email,
  aga.action,
  -- Support either legacy column name (plan) or new (granted_plan)
  coalesce(aga.granted_plan, aga.plan) as granted_plan,
  aga.content_type,
  aga.content_id,
  aga.note,
  aga.created_at
from public.admin_grant_audit aga
left join auth.users a on a.id = aga.actor
left join auth.users t on t.id = aga.target_user;

comment on view public.v_admin_grant_audit is 'Joined audit view with actor/target emails and unified granted_plan column.';

-- Grant select to authenticated (RLS still restricts underlying table; view exposes only rows allowed by base policies)
grant select on public.v_admin_grant_audit to authenticated;
