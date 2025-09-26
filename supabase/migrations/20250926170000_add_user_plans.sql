-- Create user_plans table for simple plan management (free / hifi / sify)
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','hifi','sify')),
  activated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to keep updated_at fresh
create or replace function public.user_plans_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_user_plans_updated_at on public.user_plans;
create trigger trg_user_plans_updated_at before update on public.user_plans
for each row execute function public.user_plans_set_updated_at();

-- Enable RLS
alter table public.user_plans enable row level security;

-- (Postgres versions prior to support for CREATE POLICY IF NOT EXISTS will fail)
-- So we explicitly drop then create to be compatible.
drop policy if exists "user_plans_select_own" on public.user_plans;
create policy "user_plans_select_own" on public.user_plans
  for select using ( auth.uid() = user_id );

drop policy if exists "user_plans_insert_own" on public.user_plans;
create policy "user_plans_insert_own" on public.user_plans
  for insert with check ( auth.uid() = user_id );

drop policy if exists "user_plans_update_own" on public.user_plans;
create policy "user_plans_update_own" on public.user_plans
  for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Helper view for convenience (optional)
create or replace view public.current_user_plan as
  select user_id, plan, activated_at, updated_at from public.user_plans where user_id = auth.uid();

-- Grant minimal access
grant select, insert, update on public.user_plans to authenticated;

-- Index for plan distribution queries
create index if not exists idx_user_plans_plan on public.user_plans(plan);
