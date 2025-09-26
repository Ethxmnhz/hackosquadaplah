-- Adds access_tier column to content tables (if they exist) defaulting to 'free'
DO $$ BEGIN
  -- Challenges
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenges' AND column_name='access_tier') THEN
      ALTER TABLE challenges ADD COLUMN access_tier text NOT NULL DEFAULT 'free';
    END IF;
  END IF;
  -- Certifications
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certifications' AND column_name='id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certifications' AND column_name='access_tier') THEN
      ALTER TABLE certifications ADD COLUMN access_tier text NOT NULL DEFAULT 'free';
    END IF;
  END IF;
  -- Operations (assuming operations table name 'operations' or 'redvsblue_operations')
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='operations' AND column_name='id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='operations' AND column_name='access_tier') THEN
      ALTER TABLE operations ADD COLUMN access_tier text NOT NULL DEFAULT 'free';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redvsblue_operations' AND column_name='id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redvsblue_operations' AND column_name='access_tier') THEN
      ALTER TABLE redvsblue_operations ADD COLUMN access_tier text NOT NULL DEFAULT 'free';
    END IF;
  END IF;
END $$;
