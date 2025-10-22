-- Allow multiple claims per (address, path_id) to keep history
-- Drop the previous unique index and use tx_hash as a natural unique key
drop index if exists onchain_claims_unique_addr_path;
create unique index if not exists onchain_claims_unique_tx on public.onchain_claims (tx_hash);
create index if not exists onchain_claims_addr_created_idx on public.onchain_claims (address, created_at desc);
