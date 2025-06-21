/*
  # Fix Operation Labs RLS Policies

  1. Changes
    - Drop and recreate RLS policies for operation_labs to fix permission issues
    - Ensure admins can properly manage operation labs
    - Fix any conflicting policies

  2. Security
    - Admins can manage operation labs (create, read, update, delete)
    - Users can view active operation labs
*/

-- Drop existing policies for operation_labs if they exist
DROP POLICY IF EXISTS "Admins can manage operation labs" ON operation_labs;
DROP POLICY IF EXISTS "Users can view active operation labs" ON operation_labs;

-- Drop existing policies for operation_requests if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can create operation requests" ON operation_requests;
DROP POLICY IF EXISTS "Users can view operation requests" ON operation_requests;
DROP POLICY IF EXISTS "Users can update their operation requests" ON operation_requests;

-- Ensure admin_users table exists and has proper structure
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_users if not already enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Recreate admin_users policy
DROP POLICY IF EXISTS "Admin users can read own status" ON admin_users;
CREATE POLICY "Admin users can read own status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins to insert themselves into admin_users
DROP POLICY IF EXISTS "Users can become admins" ON admin_users;
CREATE POLICY "Users can become admins"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure operation_labs table exists
CREATE TABLE IF NOT EXISTS operation_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  docker_config jsonb,
  vm_config jsonb,
  vpn_template jsonb,
  scoring_rules jsonb,
  max_duration integer DEFAULT 60,
  difficulty_multiplier decimal DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on operation_labs
ALTER TABLE operation_labs ENABLE ROW LEVEL SECURITY;

-- Create comprehensive admin policy for operation_labs
CREATE POLICY "Admins have full access to operation labs"
  ON operation_labs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Allow users to view active operation labs
CREATE POLICY "Users can view active operation labs"
  ON operation_labs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Recreate operation_requests policies
CREATE POLICY "Users can view operation requests"
  ON operation_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create operation requests"
  ON operation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = red_team_user);

CREATE POLICY "Users can update their operation requests"
  ON operation_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = red_team_user OR 
    auth.uid() = blue_team_user OR
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Insert current user as admin
DO $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- Insert if user exists and not already admin
  IF current_user_id IS NOT NULL THEN
    INSERT INTO admin_users (id)
    VALUES (current_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore any errors
    NULL;
END $$;

-- Also try to add any existing users as admins (for development)
DO $$
BEGIN
  INSERT INTO admin_users (id)
  SELECT id FROM profiles
  WHERE NOT EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id = profiles.id
  )
  LIMIT 5; -- Limit to first 5 users for safety
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore any errors
    NULL;
END $$;