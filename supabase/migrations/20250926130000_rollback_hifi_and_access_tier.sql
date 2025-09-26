-- Rollback migration: remove HiFi plan and structural additions (access_tier, archived, optional admin_users)
DO $$ BEGIN
  -- Delete HiFi plan prices then product
  IF EXISTS (SELECT 1 FROM products WHERE slug='hifi-plan') THEN
    DELETE FROM prices USING products p WHERE p.id = prices.product_id AND p.slug='hifi-plan';
    DELETE FROM products WHERE slug='hifi-plan';
  END IF;

  -- Drop access_tier columns if present
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='access_tier') THEN
    ALTER TABLE challenges DROP COLUMN access_tier;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certifications' AND column_name='access_tier') THEN
    ALTER TABLE certifications DROP COLUMN access_tier;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='operations' AND column_name='access_tier') THEN
    ALTER TABLE operations DROP COLUMN access_tier;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redvsblue_operations' AND column_name='access_tier') THEN
    ALTER TABLE redvsblue_operations DROP COLUMN access_tier;
  END IF;

  -- Drop archived column from products if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='archived') THEN
    ALTER TABLE products DROP COLUMN archived;
  END IF;
END $$;

-- OPTIONAL: Uncomment to drop admin_users table (will remove all admin assignments)
-- DROP TABLE IF EXISTS admin_users CASCADE;
