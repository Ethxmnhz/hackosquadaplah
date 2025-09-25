-- Add provider_plan_id to prices for plan caching (Razorpay, Stripe, etc.)
ALTER TABLE prices ADD COLUMN IF NOT EXISTS provider_plan_id text;
CREATE INDEX IF NOT EXISTS prices_provider_plan_idx ON prices(provider, provider_plan_id) WHERE provider_plan_id IS NOT NULL;
