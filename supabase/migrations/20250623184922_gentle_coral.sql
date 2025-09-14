/*
  # Fix Delete Constraints and Permissions

  1. Problem
    - Delete operations are failing due to foreign key constraints
    - Need proper cascading deletes for related data
    - Missing admin permissions for delete operations

  2. Solution
    - Add proper CASCADE constraints to foreign keys
    - Create admin policies for delete operations
    - Ensure all related tables can be cleaned up properly

  3. Changes
    - Update foreign key constraints to CASCADE on delete
    - Add admin delete policies for all tables
    - Create helper functions for safe deletion
*/

-- First, ensure admin_users table exists and has proper structure
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create admin policies
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

-- Add current user as admin if no admins exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
    INSERT INTO admin_users (id)
    SELECT id FROM profiles LIMIT 1
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create admin delete policies for challenges
DROP POLICY IF EXISTS "Admins can delete challenges" ON challenges;
CREATE POLICY "Admins can delete challenges"
  ON challenges
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create admin delete policies for challenge_questions
ALTER TABLE challenge_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete challenge questions" ON challenge_questions;
CREATE POLICY "Admins can delete challenge questions"
  ON challenge_questions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create admin delete policies for labs
DROP POLICY IF EXISTS "Admins can delete labs" ON labs;
CREATE POLICY "Admins can delete labs"
  ON labs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create admin delete policies for lab_questions
ALTER TABLE lab_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete lab questions" ON lab_questions;
CREATE POLICY "Admins can delete lab questions"
  ON lab_questions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create admin delete policies for user_points
DROP POLICY IF EXISTS "Admins can delete user points" ON user_points;
CREATE POLICY "Admins can delete user points"
  ON user_points
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create admin delete policies for challenge_completions
DROP POLICY IF EXISTS "Admins can delete challenge completions" ON challenge_completions;
CREATE POLICY "Admins can delete challenge completions"
  ON challenge_completions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create admin delete policies for lab_completions
ALTER TABLE lab_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete lab completions" ON lab_completions;
CREATE POLICY "Admins can delete lab completions"
  ON lab_completions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create tables that might be missing
CREATE TABLE IF NOT EXISTS lab_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  time_remaining integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lab_id, user_id)
);

ALTER TABLE lab_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete lab participants"
  ON lab_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS lab_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lab_id, tag_id)
);

ALTER TABLE lab_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete lab tags"
  ON lab_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create operation tables if they don't exist
CREATE TABLE IF NOT EXISTS operation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  red_team_user uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blue_team_user uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  operation_mode text DEFAULT 'live' CHECK (operation_mode IN ('live', 'ai')),
  estimated_duration integer DEFAULT 60,
  max_score integer DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes')
);

ALTER TABLE operation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete operation requests"
  ON operation_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS active_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES operation_requests(id) ON DELETE CASCADE,
  red_team_user uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blue_team_user uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  status text DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'paused', 'completed', 'terminated')),
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  time_remaining integer DEFAULT 0,
  red_team_score integer DEFAULT 0,
  blue_team_score integer DEFAULT 0,
  flags_captured integer DEFAULT 0,
  attacks_blocked integer DEFAULT 0,
  total_events integer DEFAULT 0,
  vpn_config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE active_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can delete active operations"
  ON active_operations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create a safe delete function for challenges
CREATE OR REPLACE FUNCTION safe_delete_challenge(challenge_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid()
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Delete in correct order to avoid constraint violations
  
  -- Delete user points related to challenge questions
  DELETE FROM user_points 
  WHERE source_type = 'challenge' 
  AND source_id IN (
    SELECT id FROM challenge_questions 
    WHERE challenge_id = challenge_uuid
  );
  
  -- Delete challenge completions
  DELETE FROM challenge_completions 
  WHERE challenge_id = challenge_uuid;
  
  -- Delete challenge questions
  DELETE FROM challenge_questions 
  WHERE challenge_id = challenge_uuid;
  
  -- Finally delete the challenge
  DELETE FROM challenges 
  WHERE id = challenge_uuid;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in safe_delete_challenge: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a safe delete function for labs
CREATE OR REPLACE FUNCTION safe_delete_lab(lab_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid()
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Delete in correct order to avoid constraint violations
  
  -- Delete active operations for this lab
  DELETE FROM active_operations 
  WHERE lab_id = lab_uuid;
  
  -- Delete operation requests for this lab
  DELETE FROM operation_requests 
  WHERE lab_id = lab_uuid;
  
  -- Delete user points related to this lab
  DELETE FROM user_points 
  WHERE source_type = 'lab' 
  AND source_id = lab_uuid;
  
  -- Delete lab participants
  DELETE FROM lab_participants 
  WHERE lab_id = lab_uuid;
  
  -- Delete lab completions
  DELETE FROM lab_completions 
  WHERE lab_id = lab_uuid;
  
  -- Delete lab tags
  DELETE FROM lab_tags 
  WHERE lab_id = lab_uuid;
  
  -- Delete lab questions
  DELETE FROM lab_questions 
  WHERE lab_id = lab_uuid;
  
  -- Finally delete the lab
  DELETE FROM labs 
  WHERE id = lab_uuid;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in safe_delete_lab: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION safe_delete_challenge(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_delete_lab(UUID) TO authenticated;