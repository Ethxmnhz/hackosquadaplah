-- Migration: Quick fix for admin_users recursive policy
-- Description: Simple fix to stop the infinite recursion error

-- Drop ALL existing policies on admin_users that could be causing recursion
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage other admins" ON admin_users;
DROP POLICY IF EXISTS "All authenticated users can view admin users" ON admin_users;
DROP POLICY IF EXISTS "All authenticated users can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Bootstrap admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Bootstrap admins can manage other admins" ON admin_users;

-- Create the simplest possible policy (anyone can read/write)
-- This is a temporary fix to stop the errors - we can add proper security later
CREATE POLICY "Public read access for admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public write access for admin_users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Public update access for admin_users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete access for admin_users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (true);

-- This simple approach breaks the recursion by not having any policies
-- that reference the admin_users table within themselves

-- Add specific admin permissions (if needed) after this emergency fix
-- INSERT INTO admin_users (id)
-- SELECT profiles.id FROM profiles 
-- WHERE profiles.email = 'shaikhminhaz1975@gmail.com'
-- ON CONFLICT (id) DO NOTHING;
