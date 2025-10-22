-- Phase 1 Security Hardening Migration
-- Timestamp: 2025-09-28 18:00:00
-- Contents:
-- 1. plan_change_log table
-- 2. entitlement_audit table + trigger
-- 3. is_admin() SECURITY DEFINER rpc
-- 4. RLS hardening (deny-all) for sensitive tables (plan_change_log, entitlement_audit, admin_grant_audit)
-- 5. Updated admin_grant_plan to add rate limiting + plan change logging (drops & recreates function)

-- 1. plan_change_log -------------------------------------------------------
create table if not exists public.plan_change_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_plan text,
  new_plan text not null,
  change_source text not null check (change_source in ('SYSTEM','PAYMENT','ADMIN_GRANT','ADMIN_REVOKE','MIGRATION')),
  actor uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists plan_change_log_user_created_idx on public.plan_change_log(user_id, created_at desc);

comment on table public.plan_change_log is 'Historical record of user plan transitions.';

-- 2. entitlement_audit -----------------------------------------------------
create table if not exists public.entitlement_audit (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid,
  action text not null check (action in ('CREATE','UPDATE','DELETE')),
  before jsonb,
  after jsonb,
  actor uuid,
  created_at timestamptz default now()
);
comment on table public.entitlement_audit is 'Audit trail for content_entitlements modifications.';

create or replace function public.log_entitlement_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.entitlement_audit(entitlement_id, action, before, after, actor)
      values (old.id, 'DELETE', to_jsonb(old), null, auth.uid());
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into public.entitlement_audit(entitlement_id, action, before, after, actor)
      values (new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  else
    insert into public.entitlement_audit(entitlement_id, action, before, after, actor)
      values (new.id, 'CREATE', null, to_jsonb(new), auth.uid());
    return new;
  end if;
end;$$;
comment on function public.log_entitlement_change() is 'Trigger function auditing insert/update/delete on content_entitlements.';

drop trigger if exists trg_entitlement_audit on public.content_entitlements;
create trigger trg_entitlement_audit
  after insert or update or delete on public.content_entitlements
  for each row execute procedure public.log_entitlement_change();

-- 3. is_admin() rpc --------------------------------------------------------
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

-- 4. RLS Hardening ---------------------------------------------------------
alter table public.plan_change_log enable row level security;
alter table public.entitlement_audit enable row level security;
-- Ensure admin_grant_audit exists before policies (if earlier migration created it)
-- (If table missing, these will error; adjust manually if not present.)
alter table public.admin_grant_audit enable row level security;

-- Deny-all baseline policies (explicit allow via future SECURITY DEFINER views/functions)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plan_change_log' and policyname='deny_all_plan_change_log') then
    execute 'create policy deny_all_plan_change_log on public.plan_change_log for all using (false) with check (false)';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='entitlement_audit' and policyname='deny_all_entitlement_audit') then
    execute 'create policy deny_all_entitlement_audit on public.entitlement_audit for all using (false) with check (false)';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='admin_grant_audit' and policyname='deny_all_admin_grant_audit') then
    execute 'create policy deny_all_admin_grant_audit on public.admin_grant_audit for all using (false) with check (false)';
  end if;
end $$;

-- 5. Updated admin_grant_plan (rate limit + logging) -----------------------
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
  select count(*) into v_recent from public.admin_grant_audit a
    where a.actor = v_actor and a.created_at > now() - interval '15 minutes';
  if v_recent > 25 then
    v_rate_limited := true;
    return query select v_target as user_id, p_plan as granted_plan, now() as created_at, true as rate_limited;
    return; -- early exit; do not mutate state
  end if;

  select up.plan into v_existing from public.user_plans up where up.user_id = v_target;
  if v_existing is null then
    insert into public.user_plans(user_id, plan) values (v_target, p_plan);
  else
    if v_existing is distinct from p_plan then
      update public.user_plans set plan = p_plan, updated_at = now() where user_id = v_target;
    end if;
  end if;

  -- Log plan change if changed
  if v_existing is distinct from p_plan then
    insert into public.plan_change_log(user_id, previous_plan, new_plan, change_source, actor, note)
      values (v_target, v_existing, p_plan, 'ADMIN_GRANT', v_actor, p_note);
  end if;

  insert into public.admin_grant_audit(actor, target_user, action, granted_plan, note)
    values (v_actor, v_target, 'GRANT_PLAN', p_plan, p_note);

  return query select v_target as user_id, p_plan as granted_plan, now() as created_at, v_rate_limited as rate_limited;
end;$$;
comment on function public.admin_grant_plan(text,text,text) is 'Admin only: sets or upgrades user plan with rate limiting + change logging; returns granted_plan.';

-- End Phase 1 Hardening Migration
