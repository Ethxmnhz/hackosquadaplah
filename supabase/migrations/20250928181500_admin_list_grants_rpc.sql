-- RPC: admin_list_grants for controlled grant audit access
-- Timestamp: 2025-09-28 18:15:00
-- Returns recent grant audit rows (plan + certificate) with actor/target emails resolved.
-- Prepares for future RLS deny-all on admin_grant_audit.

drop function if exists public.admin_list_grants(int,int);
create function public.admin_list_grants(p_limit int default 50, p_offset int default 0)
returns table (
  id uuid,
  created_at timestamptz,
  action text,
  granted_plan text,
  content_type text,
  content_id uuid,
  note text,
  actor uuid,
  actor_email text,
  target_user uuid,
  target_email text
) language sql security definer set search_path = public as $$
  with authz as (
    select exists(
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('billing_manager','superadmin','viewer')
    ) as allowed
  )
  select a.id,
         a.created_at,
         a.action,
         a.granted_plan,
         a.content_type,
         a.content_id,
         a.note,
         a.actor,
         au.email as actor_email,
         a.target_user,
         tu.email as target_email
  from authz cross join public.admin_grant_audit a
  left join auth.users au on au.id = a.actor
  left join auth.users tu on tu.id = a.target_user
  where (select allowed from authz)
  order by a.created_at desc
  limit greatest(p_limit,0) offset greatest(p_offset,0);
$$;
comment on function public.admin_list_grants(int,int) is 'Admin only: paginated recent grant audit entries (pre-RLS hardening).';

-- End admin_list_grants rpc migration
