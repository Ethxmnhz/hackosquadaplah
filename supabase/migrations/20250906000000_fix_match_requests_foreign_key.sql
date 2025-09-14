-- Migration: Fix match_requests foreign key constraint to work with both labs and New_operation tables

-- First, drop the existing foreign key constraint
ALTER TABLE match_requests DROP CONSTRAINT IF EXISTS match_requests_lab_id_fkey;

-- Now, create a trigger function that validates the lab_id exists in at least one of the tables
CREATE OR REPLACE FUNCTION check_lab_id_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if lab_id exists in either labs or New_operation table
  IF EXISTS (SELECT 1 FROM labs WHERE id = NEW.lab_id) OR 
     EXISTS (SELECT 1 FROM "New_operation" WHERE id = NEW.lab_id) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'lab_id % does not exist in either labs or New_operation table', NEW.lab_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the match_requests table
DROP TRIGGER IF EXISTS check_lab_id_trigger ON match_requests;
CREATE TRIGGER check_lab_id_trigger
BEFORE INSERT OR UPDATE ON match_requests
FOR EACH ROW
EXECUTE FUNCTION check_lab_id_exists();
