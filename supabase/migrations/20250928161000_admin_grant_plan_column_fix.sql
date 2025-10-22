-- Migration: Disambiguate plan column in admin_grant_audit by renaming to granted_plan
-- Timestamp: 2025-09-28 16:10:00

alter table public.admin_grant_audit rename column plan to granted_plan;

-- Update comment if exists
comment on column public.admin_grant_audit.granted_plan is 'Granted plan (hifi/sify) for GRANT_PLAN actions';

-- Replace admin_grant_plan function referencing new column name
create or replace function public.admin_grant_plan(
  p_target_email text,
  p_plan text,
  p_note text default null
) returns table (
  user_id uuid,
  plan text,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_target uuid;
  v_existing text;
begin
  select auth.uid() into v_actor;
  if v_actor is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.admin_roles ar
    where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')
  ) then
    raise exception 'forbidden';
  end if;

  select id into v_target from auth.users where lower(email) = lower(p_target_email);
  if v_target is null then
    raise exception 'user_not_found';
  end if;

  if p_plan not in ('hifi','sify') then
    raise exception 'invalid_plan';
  end if;

  select plan into v_existing from public.user_plans where user_id = v_target;
  if v_existing is null then
    insert into public.user_plans(user_id, plan) values (v_target, p_plan);
  else
    update public.user_plans set plan = p_plan, updated_at = now() where user_id = v_target;
  end if;

  insert into public.admin_grant_audit(actor, target_user, action, granted_plan, note)
    values (v_actor, v_target, 'GRANT_PLAN', p_plan, p_note);

  return query select v_target, p_plan, now();
end;$$;

comment on function public.admin_grant_plan(text,text,text) is 'Admin only: directly sets or upgrades user plan (hifi/sify) and logs audit (granted_plan field).';
