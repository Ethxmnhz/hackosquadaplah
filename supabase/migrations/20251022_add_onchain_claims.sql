-- Ensure UUID generation available
create extension if not exists pgcrypto;

-- Create onchain_claims table to persist NFT certificate mints
create table if not exists public.onchain_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  address text not null,
  path_id text null,
  token_id numeric not null,
  tx_hash text not null,
  token_uri text null,
  metadata_name text null,
  metadata_image text null,
  chain_id integer not null default 84532,
  contract_address text null,
  created_at timestamptz not null default now()
);

-- Ensure one claim per (address, path_id). Note: multiple NULL path_id are allowed by Postgres unique semantics
create unique index if not exists onchain_claims_unique_addr_path on public.onchain_claims (address, path_id);

-- Helpful index for wallet lookup
create index if not exists onchain_claims_address_idx on public.onchain_claims (address);
