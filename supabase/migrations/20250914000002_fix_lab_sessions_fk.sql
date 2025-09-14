-- Migration: Fix lab sessions foreign key constraint with labs table
-- This migration adds a proper foreign key constraint to the lab_sessions table for lab_id

-- First, ensure we have a labs table reference
DO $$
BEGIN
  -- Check if a labs table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'labs') THEN
    -- Add a foreign key constraint to labs table
    BEGIN
      ALTER TABLE public.lab_sessions
        ADD CONSTRAINT lab_sessions_lab_id_fkey 
        FOREIGN KEY (lab_id) 
        REFERENCES public.labs(id) 
        ON DELETE CASCADE;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add foreign key to labs table: %', SQLERRM;
    END;
  END IF;

  -- Check if New_operation table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'New_operation') THEN
    -- If labs FK didn't work, try adding a FK to New_operation table
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'lab_sessions_lab_id_fkey'
      AND constraint_type = 'FOREIGN KEY'
    ) THEN
      BEGIN
        ALTER TABLE public.lab_sessions
          ADD CONSTRAINT lab_sessions_lab_id_fkey 
          FOREIGN KEY (lab_id) 
          REFERENCES public.New_operation(id) 
          ON DELETE CASCADE;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add foreign key to New_operation table: %', SQLERRM;
      END;
    END IF;
  END IF;

  -- If neither FK worked, create a trigger to validate lab_id manually
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'lab_sessions_lab_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Create function to validate lab_id
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

    -- Create trigger
    DROP TRIGGER IF EXISTS validate_lab_id_trigger ON public.lab_sessions;
    CREATE TRIGGER validate_lab_id_trigger
      BEFORE INSERT OR UPDATE ON public.lab_sessions
      FOR EACH ROW
      EXECUTE FUNCTION validate_lab_id();
  END IF;
END $$;
