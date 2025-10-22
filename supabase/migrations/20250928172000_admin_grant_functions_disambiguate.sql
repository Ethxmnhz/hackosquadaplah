-- Migration: Disambiguate variable vs column references inside admin grant functions
-- Timestamp: 2025-09-28 17:20:00

-- Drop existing functions to ensure clean recreation
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_grant_plan' and pg_get_function_identity_arguments(p.oid)='text, text, text') then
    execute 'drop function public.admin_grant_plan(text,text,text)';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_grant_certificate' and pg_get_function_identity_arguments(p.oid)='text, uuid, text') then
    execute 'drop function public.admin_grant_certificate(text,uuid,text)';
  end if;
end $$;

create function public.admin_grant_plan(
  p_target_email text,
  p_plan text,
  p_note text default null
) returns table (
  user_id uuid,
  granted_plan text,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_target uuid;
  v_existing text;
begin
  select auth.uid() into v_actor;
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (
    select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')
  ) then raise exception 'forbidden'; end if;

  select u.id into v_target from auth.users u where lower(u.email) = lower(p_target_email);
  if v_target is null then raise exception 'user_not_found'; end if;

  if p_plan not in ('hifi','sify') then raise exception 'invalid_plan'; end if;

  select up.plan into v_existing from public.user_plans up where up.user_id = v_target;
  if v_existing is null then
    insert into public.user_plans(user_id, plan) values (v_target, p_plan);
  else
    update public.user_plans set plan = p_plan, updated_at = now() where user_id = v_target;
  end if;

  insert into public.admin_grant_audit(actor, target_user, action, granted_plan, note)
    values (v_actor, v_target, 'GRANT_PLAN', p_plan, p_note);

  return query select v_target as user_id, p_plan as granted_plan, now() as created_at;
end;$$;

comment on function public.admin_grant_plan(text,text,text) is 'Admin only: sets or upgrades user plan (hifi/sify); returns granted_plan and logs audit.';

create function public.admin_grant_certificate(
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
  if not exists (
    select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')
  ) then raise exception 'forbidden'; end if;

  select u.id into v_target from auth.users u where lower(u.email) = lower(p_target_email);
  if v_target is null then raise exception 'user_not_found'; end if;

  select true into v_exists from public.user_content_purchases p
    where p.user_id = v_target and p.content_type = 'cert' and p.content_id = p_cert_id;
  if not found then v_exists := false; end if;

  if not v_exists then
    insert into public.user_content_purchases(user_id, content_type, content_id, price_paid, currency, payment_ref)
      values (v_target, 'cert', p_cert_id, 0, 'INR', 'ADMIN-GRANT');
  end if;

  insert into public.admin_grant_audit(actor, target_user, action, content_type, content_id, note)
    values (v_actor, v_target, 'GRANT_CERT', 'cert', p_cert_id, p_note);

  return query select v_target as user_id, p_cert_id as content_id, now() as created_at, v_exists as already_had;
end;$$;

comment on function public.admin_grant_certificate(text,uuid,text) is 'Admin only: grants certificate by zero-price purchase if absent; logs audit.';
