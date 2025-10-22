-- Migration: Conditional recreation of v_admin_grant_audit without referencing missing legacy column
-- Timestamp: 2025-09-28 16:40:00

drop view if exists public.v_admin_grant_audit;

do $$
declare
  has_granted boolean;
  has_legacy boolean;
  sql text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_grant_audit' and column_name='granted_plan'
  ) into has_granted;
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='admin_grant_audit' and column_name='plan'
  ) into has_legacy;

  if has_granted then
    sql := $$create view public.v_admin_grant_audit as
      select aga.id, aga.actor, a.email as actor_email, aga.target_user, t.email as target_email,
             aga.action, aga.granted_plan as granted_plan, aga.content_type, aga.content_id, aga.note, aga.created_at
        from public.admin_grant_audit aga
        left join auth.users a on a.id = aga.actor
        left join auth.users t on t.id = aga.target_user$$;
  elsif has_legacy then
    sql := $$create view public.v_admin_grant_audit as
      select aga.id, aga.actor, a.email as actor_email, aga.target_user, t.email as target_email,
             aga.action, aga.plan as granted_plan, aga.content_type, aga.content_id, aga.note, aga.created_at
        from public.admin_grant_audit aga
        left join auth.users a on a.id = aga.actor
        left join auth.users t on t.id = aga.target_user$$;
  else
    raise exception 'admin_grant_audit table missing expected plan/granted_plan columns';
  end if;

  execute sql;
end$$;

comment on view public.v_admin_grant_audit is 'Audit grants with actor/target emails and unified granted_plan column.';
grant select on public.v_admin_grant_audit to authenticated;
