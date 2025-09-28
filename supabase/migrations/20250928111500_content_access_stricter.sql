-- Migration: tighten can_access_content logic (no free pass without entitlement)
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
DECLARE v_plan text; v_required text; v_price int; v_active boolean; v_has_purchase boolean; BEGIN
  select plan into v_plan from public.user_plans where user_id = p_user;
  if v_plan is null then v_plan := 'free'; end if;

  select required_plan, individual_price, active into v_required, v_price, v_active
  from public.content_entitlements
  where content_type = p_content_type and content_id = p_content_id;

  if v_required is null and v_price is null then
    return query select false, 'NO_ENTITLEMENT', null::text, null::int; return; end if;
  if v_active is false then
    return query select false, 'INACTIVE', v_required, v_price; return; end if;

  if v_required is not null then
    if (v_required = 'hifi' and v_plan in ('hifi','sify')) or (v_required='sify' and v_plan='sify') then
      return query select true, 'PLAN_OK', v_required, v_price; return; end if;
  end if;

  if v_price is not null then
    select true into v_has_purchase from public.user_content_purchases
      where user_id = p_user and content_type = p_content_type and content_id = p_content_id;
    if v_has_purchase then
      return query select true, 'PURCHASE_OK', v_required, v_price; return; end if;
  end if;

  return query select false, 'UPGRADE_OR_BUY', v_required, v_price; return;
END;$$;

comment on function public.can_access_content(uuid,text,uuid) is 'Evaluates access for content item with plan + purchase precedence (stricter: no entitlement => deny).';
