-- Challenge moderation SECURITY DEFINER RPCs
-- Timestamp: 2025-09-28 18:20:00
-- Purpose: Provide stable approve/reject endpoints that respect role checks and avoid client-side direct table updates failing under RLS.

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

  update public.challenges
     set status = 'approved',
         approved_at = now(),
         moderation_note = coalesce(p_note, moderation_note)
   where id = p_challenge_id
   returning id, status, approved_at into id, new_status, approved_at;

  if new_status is null then
    raise exception 'not_found';
  end if;
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

  if new_status is null then
    raise exception 'not_found';
  end if;
  return next;
end;$$;
comment on function public.admin_reject_challenge(uuid,text) is 'Admin only: reject a challenge with feedback (content_admin or superadmin).';

-- End challenge moderation RPCs
