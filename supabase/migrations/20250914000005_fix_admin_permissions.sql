-- Migration: Fix admin permissions
-- Description: Clears admin_users table and adds only specific users as admins

-- SAFETY CHECK: Only proceed if admin_users table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_users'
  ) THEN
    -- Step 1: Clear admin_users table ONLY (no other tables should be affected)
    DELETE FROM admin_users;
    
    -- Step 2: Add specific users as admins by email
    -- Replace these emails with your actual admin emails
    INSERT INTO admin_users (id)
    SELECT profiles.id FROM profiles 
    WHERE profiles.email IN (
      'shaikhminhaz1975@gmnail.com'
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'admin_users table does not exist. Migration aborted for safety.';
  END IF;
END $$;

-- Step 3: Update policies to be more restrictive
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid()
    )
  );

-- Only admins can add other admins
DROP POLICY IF EXISTS "Admins can manage other admins" ON admin_users;
CREATE POLICY "Admins can manage other admins"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid()
    )
  );

-- Update the hook that automatically adds admins to do nothing
CREATE OR REPLACE FUNCTION public.auto_add_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is intentionally empty to prevent auto-adding admins
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS add_first_admin_trigger ON profiles;

-- Create a new empty trigger
CREATE TRIGGER add_first_admin_trigger
  AFTER INSERT ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_add_first_admin();
