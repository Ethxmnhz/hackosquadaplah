-- Migration: Secure admin access (only for authorized users)
-- Description: Restricts admin access to only specified users

-- First, drop the previous policies that allowed all users to be admins
DROP POLICY IF EXISTS "All authenticated users can view admin users" ON admin_users;
DROP POLICY IF EXISTS "All authenticated users can manage admin users" ON admin_users;

-- Drop the trigger that automatically adds all users as admins
DROP TRIGGER IF EXISTS add_first_admin_trigger ON profiles;
DROP FUNCTION IF EXISTS public.auto_add_first_admin();

-- Clear the admin_users table to start fresh
TRUNCATE admin_users;

-- Create a function to add only specific admins
CREATE OR REPLACE FUNCTION public.add_specific_admins()
RETURNS void AS $$
BEGIN
  -- Add only the specified email as admin
  INSERT INTO admin_users (id)
  SELECT profiles.id FROM profiles 
  WHERE profiles.email = 'shaikhminhaz1975@gmail.com'
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to add the specific admin
SELECT public.add_specific_admins();

-- Drop the function after use
DROP FUNCTION IF EXISTS public.add_specific_admins();

-- Create secure policies for admin_users
CREATE POLICY "Only admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = auth.uid()
    )
  );

-- Create better permissions for public tables to avoid recursive issues
-- These policies ensure regular users can view content without admin checks
ALTER TABLE IF EXISTS challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view approved challenges" ON challenges;
CREATE POLICY "Everyone can view approved challenges" 
  ON challenges
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

ALTER TABLE IF EXISTS labs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view published labs" ON labs;
CREATE POLICY "Everyone can view published labs" 
  ON labs
  FOR SELECT
  TO authenticated
  USING (status = 'published');

ALTER TABLE IF EXISTS leaderboard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view leaderboard" ON leaderboard_entries;
CREATE POLICY "Everyone can view leaderboard" 
  ON leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (true);
