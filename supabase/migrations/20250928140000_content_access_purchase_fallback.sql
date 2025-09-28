-- Migration: can_access_content purchase fallback even if entitlement row missing
-- If an entitlement row is deleted after a user purchased, still grant access based on purchase record.
-- Logic precedence:
-- 1. If entitlement row exists and inactive -> deny (INACTIVE)
-- 2. If entitlement row exists and plan matches -> allow PLAN_OK
-- 3. If entitlement row exists and purchase exists -> allow PURCHASE_OK
-- 4. If no entitlement row: if purchase exists -> allow PURCHASE_OK_NO_ENT (reason variant), else deny NO_ENTITLEMENT
create or replace function public.can_access_content(
  p_user uuid,
  p_content_type text,
  p_content_id uuid
) returns table (
  allow boolean,
  reason text,
  required_plan text,
  individual_price integer
) language plpgsql stable as $$
DECLARE
  v_plan text;
  v_required text;
  v_price int;
  v_active boolean;
  v_has_purchase boolean;
BEGIN
  select plan into v_plan from public.user_plans where user_id = p_user;
  if v_plan is null then v_plan := 'free'; end if;

  select required_plan, individual_price, active into v_required, v_price, v_active
  from public.content_entitlements
  where content_type = p_content_type and content_id = p_content_id;

  select true into v_has_purchase from public.user_content_purchases
    where user_id = p_user and content_type = p_content_type and content_id = p_content_id;
  if not found then v_has_purchase := false; end if;

  if v_required is null and v_price is null then
    if v_has_purchase then
      return query select true, 'PURCHASE_OK_NO_ENT', null::text, null::int; return;
    else
      return query select false, 'NO_ENTITLEMENT', null::text, null::int; return;
    end if;
  end if;

  if v_active is false then
    return query select false, 'INACTIVE', v_required, v_price; return;
  end if;

  if v_required is not null then
    if (v_required = 'hifi' and v_plan in ('hifi','sify')) or (v_required='sify' and v_plan='sify') then
      return query select true, 'PLAN_OK', v_required, v_price; return;
    end if;
  end if;

  if v_price is not null and v_has_purchase then
    return query select true, 'PURCHASE_OK', v_required, v_price; return;
  end if;

  return query select false, 'UPGRADE_OR_BUY', v_required, v_price; return;
END;$$;

comment on function public.can_access_content(uuid,text,uuid) is 'Access evaluation with fallback: purchase grants access even if entitlement row later removed.';
