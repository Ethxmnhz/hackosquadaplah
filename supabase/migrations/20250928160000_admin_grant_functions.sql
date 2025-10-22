-- Migration: Admin grant functions for plans and certificates
-- Timestamp: 2025-09-28 16:00:00
-- Provides helper RPC functions so billing admins can directly grant a plan (upgrade or set) or grant a certificate purchase
-- without payment processing. These actions are audited in a new table admin_grant_audit.

-- 1. Audit table
create table if not exists public.admin_grant_audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references auth.users(id) on delete cascade,
  target_user uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('GRANT_PLAN','GRANT_CERT')),
  plan text check (plan in ('hifi','sify')),
  content_type text check (content_type in ('cert')),
  content_id uuid,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admin_grant_audit enable row level security;

-- Allow select for admins only; insert done via functions (security definer)
create policy admin_grant_audit_select on public.admin_grant_audit
  for select using (
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid() and ar.role in ('billing_manager','superadmin')
    )
  );

-- No direct modification
create policy admin_grant_audit_block_mods on public.admin_grant_audit
  for all using (false) with check (false);

comment on table public.admin_grant_audit is 'Audit log of manual admin grants (plans or certificate access).';

-- 2. Function: admin_grant_plan(target_email, plan, note)
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
  -- Ensure caller is billing_manager or superadmin
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

  -- Find target user
  select id into v_target from auth.users where lower(email) = lower(p_target_email);
  if v_target is null then
    raise exception 'user_not_found';
  end if;

  if p_plan not in ('hifi','sify') then
    raise exception 'invalid_plan';
  end if;

  select plan into v_existing from public.user_plans where user_id = v_target;
  if v_existing is null then
    insert into public.user_plans(user_id, plan)
      values (v_target, p_plan);
  else
    update public.user_plans set plan = p_plan, updated_at = now() where user_id = v_target;
  end if;

  insert into public.admin_grant_audit(actor, target_user, action, plan, note)
    values (v_actor, v_target, 'GRANT_PLAN', p_plan, p_note);

  return query select v_target, p_plan, now();
end;$$;

comment on function public.admin_grant_plan(text,text,text) is 'Admin only: directly sets or upgrades user plan (hifi/sify) and logs audit.';

-- 3. Function: admin_grant_certificate(target_email, cert_id, note)
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

  -- Check if purchase already exists
  select true into v_exists from public.user_content_purchases
    where user_id = v_target and content_type = 'cert' and content_id = p_cert_id;
  if not found then v_exists := false; end if;

  if not v_exists then
    -- Create zero-price purchase record to mark ownership (price units consistent with existing schema - assume integer units/paise)
    insert into public.user_content_purchases(user_id, content_type, content_id, price_paid, currency, payment_ref)
      values (v_target, 'cert', p_cert_id, 0, 'INR', 'ADMIN-GRANT');
  end if;

  insert into public.admin_grant_audit(actor, target_user, action, content_type, content_id, note)
    values (v_actor, v_target, 'GRANT_CERT', 'cert', p_cert_id, p_note);

  return query select v_target, p_cert_id, now(), v_exists;
end;$$;

comment on function public.admin_grant_certificate(text,uuid,text) is 'Admin only: grants certificate access by inserting zero-price purchase if absent and logs audit.';

-- 4. Security notes:
-- Functions are SECURITY DEFINER; ensure owner is postgres and search_path restricted to public.
-- They perform explicit role checks through admin_roles.
