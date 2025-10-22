-- Certificate Grant Rate Limiting & Validation (Non-breaking)
-- Timestamp: 2025-09-28 18:10:00
-- Adds rate limiting to admin_grant_certificate similar to admin_grant_plan.
-- Does not introduce new tables or RLS changes.

drop function if exists public.admin_grant_certificate(text,uuid,text);
create function public.admin_grant_certificate(
  p_target_email text,
  p_cert_id uuid,
  p_note text default null
) returns table (
  user_id uuid,
  content_id uuid,
  created_at timestamptz,
  already_had boolean,
  rate_limited boolean
) language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
  v_target uuid;
  v_exists boolean;
  v_recent int;
  v_rate_limited boolean := false;
begin
  select auth.uid() into v_actor;
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (
    select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('billing_manager','superadmin')
  ) then raise exception 'forbidden'; end if;

  select u.id into v_target from auth.users u where lower(u.email)=lower(p_target_email);
  if v_target is null then raise exception 'user_not_found'; end if;

  -- Optional future validation: ensure certificate exists (placeholder if a certificates table is added)
  -- perform validation here when table available

  -- Rate limiting: max 25 certificate grants (distinct attempts) per 15 minutes
  begin
    select count(*) into v_recent from public.admin_grant_audit a
      where a.actor = v_actor and a.created_at > now() - interval '15 minutes' and a.action = 'GRANT_CERT';
  exception when undefined_table then
    v_recent := 0;
  end;
  if v_recent > 25 then
    v_rate_limited := true;
    return query select v_target as user_id, p_cert_id as content_id, now() as created_at, true as already_had, true as rate_limited;
    return;
  end if;

  select true into v_exists from public.user_content_purchases p
    where p.user_id = v_target and p.content_type='cert' and p.content_id = p_cert_id;
  if not found then v_exists := false; end if;

  if not v_exists then
    insert into public.user_content_purchases(user_id, content_type, content_id, price_paid, currency, payment_ref)
      values (v_target, 'cert', p_cert_id, 0, 'INR', 'ADMIN-GRANT');
  end if;

  -- Audit insert guarded for absent table
  begin
    insert into public.admin_grant_audit(actor, target_user, action, content_type, content_id, note)
      values (v_actor, v_target, 'GRANT_CERT', 'cert', p_cert_id, p_note);
  exception when undefined_table then
    perform 1;
  end;

  return query select v_target as user_id, p_cert_id as content_id, now() as created_at, v_exists as already_had, v_rate_limited as rate_limited;
end;$$;

comment on function public.admin_grant_certificate(text,uuid,text) is 'Admin only: grants certificate with rate limiting; returns already_had + rate_limited flags.';

-- End certificate grant rate limiting migration
