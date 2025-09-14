-- Migration: Fix lab sessions foreign key constraint with labs table
-- This migration adds a proper foreign key constraint to the lab_sessions table for lab_id

-- Drop existing constraint if it exists
ALTER TABLE IF EXISTS public.lab_sessions 
DROP CONSTRAINT IF EXISTS lab_sessions_lab_id_fkey;

-- Create validate_lab_id function outside the DO block
CREATE OR REPLACE FUNCTION validate_lab_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if lab_id exists in either labs or New_operation
  IF EXISTS (
    SELECT 1 FROM public.labs WHERE id = NEW.lab_id
  ) OR EXISTS (
    SELECT 1 FROM public.New_operation WHERE id = NEW.lab_id
  ) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid lab_id: %. Lab does not exist in either labs or New_operation table.', NEW.lab_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Check for tables and add constraint logic
DO $$
BEGIN
  -- Check if a labs table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'labs') THEN
    -- Try to add foreign key to labs table
    BEGIN
      ALTER TABLE public.lab_sessions
        ADD CONSTRAINT lab_sessions_lab_id_fkey 
        FOREIGN KEY (lab_id) 
        REFERENCES public.labs(id) 
        ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint to labs table';
      -- Exit early if successful
      RETURN;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add foreign key to labs table: %', SQLERRM;
    END;
  END IF;

  -- If we get here, labs FK failed or table doesn't exist
  -- Check if New_operation table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'New_operation') THEN
    BEGIN
      ALTER TABLE public.lab_sessions
        ADD CONSTRAINT lab_sessions_lab_id_fkey 
        FOREIGN KEY (lab_id) 
        REFERENCES public.New_operation(id) 
        ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint to New_operation table';
      -- Exit early if successful
      RETURN;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add foreign key to New_operation table: %', SQLERRM;
    END;
  END IF;
END $$;

-- If neither FK worked, create a trigger to validate lab_id manually
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'lab_sessions_lab_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Create trigger
    DROP TRIGGER IF EXISTS validate_lab_id_trigger ON public.lab_sessions;
    CREATE TRIGGER validate_lab_id_trigger
      BEFORE INSERT OR UPDATE ON public.lab_sessions
      FOR EACH ROW
      EXECUTE FUNCTION validate_lab_id();
    RAISE NOTICE 'Created trigger-based validation for lab_id instead of foreign key';
  END IF;
END $$;
