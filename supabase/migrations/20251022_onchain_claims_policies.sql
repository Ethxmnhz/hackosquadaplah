-- Open read/write policies for onchain_claims so the client (anon or authenticated) can persist and fetch claims
-- NOTE: This is permissive for demo purposes. For production, tighten to authenticated-only and per-user ownership.

-- Ensure RLS is enabled and then add permissive policies
alter table public.onchain_claims enable row level security;

create policy onchain_claims_select_all
on public.onchain_claims
for select
to anon, authenticated
using (true);

create policy onchain_claims_insert_all
on public.onchain_claims
for insert
to anon, authenticated
with check (true);

-- Needed for UPSERT (conflict -> update)
create policy onchain_claims_update_all
on public.onchain_claims
for update
to anon, authenticated
using (true)
with check (true);
