-- Migration: add missing entitlement for certificate 794b3648-f419-4704-a9b5-fe55a85d694f
-- Ensures individual purchase price is available so purchase-content edge function can create orders.
-- Safe to run multiple times (idempotent via ON CONFLICT DO NOTHING on unique(content_type, content_id)).

insert into public.content_entitlements (content_type, content_id, individual_price, currency, active)
select 'cert', '794b3648-f419-4704-a9b5-fe55a85d694f', 50, 'INR', true
where not exists (
  select 1 from public.content_entitlements
  where content_type = 'cert' and content_id = '794b3648-f419-4704-a9b5-fe55a85d694f'
);

-- Verify (will show exactly one row after migration):
-- select * from public.content_entitlements where content_type='cert' and content_id='794b3648-f419-4704-a9b5-fe55a85d694f';
