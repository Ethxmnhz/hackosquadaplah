-- Migration: Idempotent fix for ambiguous plan column in admin_grant_audit
-- Timestamp: 2025-09-28 16:20:00
-- Safely rename column plan -> granted_plan if it still exists, then recreate functions to reference granted_plan.

do $$
begin
  -- Only rename if old column still present
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_grant_audit' and column_name='plan'
  ) then
    execute 'alter table public.admin_grant_audit rename column plan to granted_plan';
  end if;
end$$;

comment on column public.admin_grant_audit.granted_plan is 'Granted plan (hifi/sify) for GRANT_PLAN actions';

-- Recreate plan grant function to insert into granted_plan
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
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')) then
    raise exception 'forbidden';
  end if;
  select id into v_target from auth.users where lower(email)=lower(p_target_email);
  if v_target is null then raise exception 'user_not_found'; end if;
  if p_plan not in ('hifi','sify') then raise exception 'invalid_plan'; end if;
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

comment on function public.admin_grant_plan(text,text,text) is 'Admin only: sets or upgrades user plan (hifi/sify) and logs audit (granted_plan field).';

-- Recreate certificate grant function (no change except ensure search_path & consistent style)
create or replace function public.admin_grant_certificate(
  p_target_email text,
  p_cert_id uuid,
  p_note text default null
) returns table (
  user_id uuid,
  content_id uuid,
  created_at timestamptz,
  already_had boolean
) language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_target uuid;
  v_exists boolean;
begin
  select auth.uid() into v_actor;
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')) then
    raise exception 'forbidden'; end if;
  select id into v_target from auth.users where lower(email)=lower(p_target_email);
  if v_target is null then raise exception 'user_not_found'; end if;
  select true into v_exists from public.user_content_purchases where user_id = v_target and content_type='cert' and content_id = p_cert_id;
  if not found then v_exists := false; end if;
  if not v_exists then
    insert into public.user_content_purchases(user_id, content_type, content_id, price_paid, currency, payment_ref)
      values (v_target, 'cert', p_cert_id, 0, 'INR', 'ADMIN-GRANT');
  end if;
  insert into public.admin_grant_audit(actor, target_user, action, content_type, content_id, note)
    values (v_actor, v_target, 'GRANT_CERT', 'cert', p_cert_id, p_note);
  return query select v_target, p_cert_id, now(), v_exists;
end;$$;

comment on function public.admin_grant_certificate(text,uuid,text) is 'Admin only: grants certificate by zero-price purchase if absent; logs audit.';
