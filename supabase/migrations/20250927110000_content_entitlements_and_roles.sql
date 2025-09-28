-- Migration: content entitlements, user content purchases, admin roles
-- Timestamp: 2025-09-27 11:00:00

-- 1. admin_roles table
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','content_admin','billing_manager','superadmin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.admin_roles enable row level security;

create policy admin_roles_select_self_or_admin on public.admin_roles
  for select using (
    auth.uid() = user_id OR
    exists (
      select 1 from public.admin_roles ar2
      where ar2.user_id = auth.uid() and ar2.role = 'superadmin'
    )
  );

create policy admin_roles_manage_superadmin on public.admin_roles
  for all using (
    exists (
      select 1 from public.admin_roles ar2
      where ar2.user_id = auth.uid() and ar2.role = 'superadmin'
    )
  ) with check (
    exists (
      select 1 from public.admin_roles ar2
      where ar2.user_id = auth.uid() and ar2.role = 'superadmin'
    )
  );

-- 2. content_entitlements table
create table if not exists public.content_entitlements (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('challenge','lab','cert','operation')),
  content_id uuid not null,
  required_plan text check (required_plan in ('hifi','sify')),
  individual_price integer check (individual_price >= 0), -- paise
  currency text not null default 'INR',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);

create index if not exists idx_content_entitlements_plan on public.content_entitlements (required_plan) where required_plan is not null;
create index if not exists idx_content_entitlements_price on public.content_entitlements (individual_price) where individual_price is not null;

-- updated_at trigger (assumes existing function public.handle_updated_at)
create trigger set_content_entitlements_updated
  before update on public.content_entitlements
  for each row execute procedure public.handle_updated_at();

alter table public.content_entitlements enable row level security;

-- Read for all authenticated users (to know gating)
create policy content_entitlements_select on public.content_entitlements
  for select using ( auth.role() = 'authenticated' );

-- Manage restricted to billing_manager or superadmin
create policy content_entitlements_manage on public.content_entitlements
  for all using (
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('billing_manager','superadmin','content_admin')
    )
  ) with check (
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role in ('billing_manager','superadmin','content_admin')
    )
  );

-- 3. user_content_purchases table
create table if not exists public.user_content_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('challenge','lab','cert','operation')),
  content_id uuid not null,
  price_paid integer not null check (price_paid >= 0),
  currency text not null default 'INR',
  payment_ref text,
  created_at timestamptz not null default now(),
  unique (user_id, content_type, content_id)
);

alter table public.user_content_purchases enable row level security;

create policy user_content_purchases_select_own on public.user_content_purchases
  for select using ( auth.uid() = user_id OR
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid() and ar.role in ('billing_manager','superadmin')
    )
  );

create policy user_content_purchases_insert_own on public.user_content_purchases
  for insert with check ( auth.uid() = user_id );

-- Admins can manage for support cases
create policy user_content_purchases_admin_manage on public.user_content_purchases
  for all using (
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid() and ar.role in ('billing_manager','superadmin')
    )
  );

-- 4. Helper view for metrics (optional quick view)
create or replace view public.plan_user_counts as
select plan, count(*)::int as user_count
from public.user_plans
group by plan;

-- 5. Comment annotations
comment on table public.content_entitlements is 'Defines gating (required plan) and optional individual price for specific content items.';
comment on table public.user_content_purchases is 'Stores one-off content purchases unlocking content without full plan upgrade.';
comment on table public.admin_roles is 'Additional role tiers for billing/admin UI enforcement.';

-- Done
