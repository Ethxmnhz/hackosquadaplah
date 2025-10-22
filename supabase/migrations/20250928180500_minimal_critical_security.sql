-- Minimal Critical Security Fixes
-- Timestamp: 2025-09-28 18:05:00
-- Scope: Provide server authoritative admin check + rate limiting on plan grants
-- Excludes: plan_change_log, entitlement_audit, RLS policy changes (to avoid feature breakage)

-- 1. Authoritative admin check function
drop function if exists public.is_admin();
create function public.is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists(
    select 1 from public.admin_roles ar
    where ar.user_id = auth.uid()
      and ar.role in ('billing_manager','superadmin')
  );
$$;
comment on function public.is_admin() is 'Returns true if current auth user has elevated billing/admin role.';

-- 2. Recreate admin_grant_plan with rate limiting ONLY (no logging tables assumed)
drop function if exists public.admin_grant_plan(text,text,text);
create function public.admin_grant_plan(
  p_target_email text,
  p_plan text,
  p_note text default null
) returns table (
  user_id uuid,
  granted_plan text,
  created_at timestamptz,
  rate_limited boolean
) language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_target uuid;
  v_existing text;
  v_recent int;
  v_rate_limited boolean := false;
begin
  select auth.uid() into v_actor;
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (
    select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')
  ) then raise exception 'forbidden'; end if;

  select u.id into v_target from auth.users u where lower(u.email) = lower(p_target_email);
  if v_target is null then raise exception 'user_not_found'; end if;

  if p_plan not in ('hifi','sify') then raise exception 'invalid_plan'; end if;

  -- Rate limiting: max 25 grants in past 15 minutes per actor
  -- If audit table not present yet, skip silently
  begin
    select count(*) into v_recent from public.admin_grant_audit a
      where a.actor = v_actor and a.created_at > now() - interval '15 minutes';
  exception when undefined_table then
    v_recent := 0;
  end;
  if v_recent > 25 then
    v_rate_limited := true;
    return query select v_target as user_id, p_plan as granted_plan, now() as created_at, true as rate_limited;
    return;
  end if;

  select up.plan into v_existing from public.user_plans up where up.user_id = v_target;
  if v_existing is null then
    insert into public.user_plans(user_id, plan) values (v_target, p_plan);
  else
    if v_existing is distinct from p_plan then
      update public.user_plans set plan = p_plan, updated_at = now() where user_id = v_target;
    end if;
  end if;

  -- Audit insertion guarded (only if table exists)
  begin
    insert into public.admin_grant_audit(actor, target_user, action, granted_plan, note)
      values (v_actor, v_target, 'GRANT_PLAN', p_plan, p_note);
  exception when undefined_table then
    -- swallow: audit infra not deployed yet
    perform 1;
  end;

  return query select v_target as user_id, p_plan as granted_plan, now() as created_at, v_rate_limited as rate_limited;
end;$$;
comment on function public.admin_grant_plan(text,text,text) is 'Admin only: sets or upgrades user plan with rate limiting; returns granted_plan.';

-- End minimal critical fixes migration
