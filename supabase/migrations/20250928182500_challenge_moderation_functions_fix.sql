-- Fix moderation RPCs: remove moderation_note usage and ensure update allowed via policy
-- Timestamp: 2025-09-28 18:25:00

drop function if exists public.admin_approve_challenge(uuid,text);
create function public.admin_approve_challenge(p_challenge_id uuid, p_note text default null)
returns table(id uuid, new_status text, approved_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  select auth.uid() into v_actor;
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (
    select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('content_admin','superadmin')
  ) then raise exception 'forbidden'; end if;

  -- Update challenge status; remove moderation_note reference (column may not exist yet)
  update public.challenges
     set status = 'approved',
         approved_at = now()
   where id = p_challenge_id
   returning id, status, approved_at into id, new_status, approved_at;

  if new_status is null then raise exception 'not_found'; end if;
  return next;
end;$$;
comment on function public.admin_approve_challenge(uuid,text) is 'Admin only: approve a challenge (content_admin or superadmin).';

drop function if exists public.admin_reject_challenge(uuid,text);
create function public.admin_reject_challenge(p_challenge_id uuid, p_feedback text)
returns table(id uuid, new_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  if p_feedback is null or length(trim(p_feedback)) = 0 then
    raise exception 'feedback_required';
  end if;
  select auth.uid() into v_actor;
  if v_actor is null then raise exception 'not_authenticated'; end if;
  if not exists (
    select 1 from public.admin_roles ar where ar.user_id = v_actor and ar.role in ('content_admin','superadmin')
  ) then raise exception 'forbidden'; end if;

  update public.challenges
     set status = 'rejected',
         feedback = p_feedback
   where id = p_challenge_id
   returning id, status into id, new_status;

  if new_status is null then raise exception 'not_found'; end if;
  return next;
end;$$;
comment on function public.admin_reject_challenge(uuid,text) is 'Admin only: reject a challenge with feedback (content_admin or superadmin).';

-- Minimal UPDATE policy (only if no policy yet) enabling admins to update status columns directly if SECURITY DEFINER not desired in future
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname='public'
       and tablename='challenges'
       and policyname='admin_update_challenges'
  ) then
    -- Use dynamic SQL with single quotes to avoid nested $$ delimiter confusion
    execute 'create policy admin_update_challenges on public.challenges
      for update using (
        exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid() and ar.role in (''content_admin'',''superadmin''))
      ) with check (
        exists (select 1 from public.admin_roles ar where ar.user_id = auth.uid() and ar.role in (''content_admin'',''superadmin''))
      )';
  end if;
end
$$;

-- End moderation RPC fix
