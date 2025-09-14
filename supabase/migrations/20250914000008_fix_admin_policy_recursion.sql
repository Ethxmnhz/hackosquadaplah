-- Migration: Fix admin policy recursion error
-- Description: Fixes the infinite recursion detected in policy for relation "admin_users"

-- The issue is in the policies where the policy itself is referring to the admin_users table
-- causing an infinite loop when checking permissions

-- First, drop the existing recursive policies
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage other admins" ON admin_users;

-- Create a new "Bootstrap Admin" role that can be assigned to the first/initial admin
-- This avoids circular dependencies in policies
CREATE TABLE IF NOT EXISTS bootstrap_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the initial admin (same email as in the previous migration)
INSERT INTO bootstrap_admins (id)
SELECT profiles.id FROM profiles 
WHERE profiles.email IN (
  'shaikhminhaz1975@gmnail.com'
)
ON CONFLICT (id) DO NOTHING;

-- Create non-recursive policies for admin_users
-- Anyone in bootstrap_admins can view admin_users
CREATE POLICY "Bootstrap admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bootstrap_admins ba 
      WHERE ba.id = auth.uid()
    )
  );

-- Only bootstrap_admins can modify admin_users
CREATE POLICY "Bootstrap admins can manage other admins"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bootstrap_admins ba 
      WHERE ba.id = auth.uid()
    )
  );

-- Make sure the initial admin is in admin_users
INSERT INTO admin_users (id)
SELECT id FROM bootstrap_admins
ON CONFLICT (id) DO NOTHING;

-- This creates a one-way relationship: bootstrap_admins control admin_users
-- without causing a circular dependency in the policies
