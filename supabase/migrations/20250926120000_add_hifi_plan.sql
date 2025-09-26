-- Adds a dedicated 'hifi' plan product and a monthly INR test price (adjust currency/amount as needed)
DO $$ BEGIN
  -- Upsert product
  INSERT INTO products (slug, type, name, description, entitlement_scopes)
  VALUES ('hifi-plan', 'plan', 'HiFi Plan', 'HiFi subscription unlocks all premium content and operations.', ARRAY['hifi','app'])
  ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, entitlement_scopes=EXCLUDED.entitlement_scopes;

  -- Ensure a monthly active price exists (INR 100 = 1.00 for example; adjust)
  IF NOT EXISTS (
    SELECT 1 FROM prices p JOIN products pr ON pr.id = p.product_id
    WHERE pr.slug='hifi-plan' AND p.billing_cycle='monthly' AND p.currency='inr' AND p.is_active
  ) THEN
    INSERT INTO prices (product_id, billing_cycle, currency, unit_amount, region, provider, is_active)
    SELECT id, 'monthly', 'inr', 100, '*', 'razorpay', true FROM products WHERE slug='hifi-plan';
  END IF;
END $$;
