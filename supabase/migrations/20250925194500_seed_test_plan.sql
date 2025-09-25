-- Seed a test subscription product with a ₹1 INR monthly price
-- NOTE: unit_amount is stored in the smallest currency unit (paise). ₹1.00 = 100 paise.
-- Running this multiple times is safe (idempotent via slug + price existence checks).

BEGIN;

-- 1. Upsert product (slug unique)
WITH upsert_prod AS (
  INSERT INTO public.products (id, slug, type, name, description, entitlement_scopes)
  VALUES (gen_random_uuid(), 'test-plan-1r', 'plan', 'Test Plan ₹1', 'Temporary test plan at ₹1 for integration testing', '{"test_scope"}')
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    entitlement_scopes = EXCLUDED.entitlement_scopes
  RETURNING id
)
-- 2. Insert price if none exists for this product at monthly INR 100 paise
INSERT INTO public.prices (product_id, billing_cycle, currency, unit_amount, region, provider, provider_price_id, is_active)
SELECT id, 'monthly', 'inr', 100, '*', 'razorpay', NULL, true
FROM upsert_prod
WHERE NOT EXISTS (
  SELECT 1 FROM public.prices p
  WHERE p.product_id = upsert_prod.id AND p.billing_cycle = 'monthly' AND p.currency = 'inr'
);

COMMIT;

-- Verification suggestion (run separately):
-- select p.slug, pr.unit_amount, pr.currency, pr.billing_cycle from public.products p join public.prices pr on pr.product_id = p.id where p.slug='test-plan-1r';