-- Migration: Restore all users as admins
-- Description: Reverts changes to make all authenticated users admins again

-- First, drop the policies we created in the fix
DROP POLICY IF EXISTS "Bootstrap admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Bootstrap admins can manage other admins" ON admin_users;

-- Drop the bootstrap_admins table since we don't need it anymore
DROP TABLE IF EXISTS bootstrap_admins;

-- Create simple policies that allow all authenticated users to access admin_users
CREATE POLICY "All authenticated users can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (true);

-- Recreate the function that automatically adds all users as admins
CREATE OR REPLACE FUNCTION public.auto_add_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Add all new users as admins
  INSERT INTO admin_users (id)
  SELECT NEW.id
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to add all users as admins
DROP TRIGGER IF EXISTS add_first_admin_trigger ON profiles;

CREATE TRIGGER add_first_admin_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_first_admin();

-- Add all existing users as admins
INSERT INTO admin_users (id)
SELECT id FROM profiles
ON CONFLICT (id) DO NOTHING;
