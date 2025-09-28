-- Helper function required by some triggers (e.g., content_entitlements)
-- Creates a generic updated_at setter if not present.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at' AND pg_function_is_visible(oid)
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;$$;
  END IF;
END $$;
