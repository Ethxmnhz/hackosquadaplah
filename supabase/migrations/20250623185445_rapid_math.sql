/*
  # Fix Delete Operations in Admin Dashboard

  1. Purpose
    - Fix delete operations in the admin dashboard
    - Ensure proper cascading deletes for related data
    - Add admin permissions for delete operations
    - Preserve all existing data

  2. Changes
    - Add proper CASCADE constraints to foreign keys
    - Create admin policies for delete operations
    - Add helper functions for safe deletion
    - Ensure all tables have proper RLS policies
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
CREATE POLICY IF NOT EXISTS "Admins can view admin users"
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

-- Create RPC functions for easier calling from the client
CREATE OR REPLACE FUNCTION rpc_delete_challenge(challenge_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN safe_delete_challenge(challenge_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_delete_lab(lab_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN safe_delete_lab(lab_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the RPC functions
GRANT EXECUTE ON FUNCTION rpc_delete_challenge(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_delete_lab(UUID) TO authenticated;

-- Ensure all tables have proper RLS policies for reading
CREATE POLICY IF NOT EXISTS "Anyone can read challenges"
  ON challenges
  FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can read challenge questions"
  ON challenge_questions
  FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can read labs"
  ON labs
  FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can read lab questions"
  ON lab_questions
  FOR SELECT
  USING (true);

-- Ensure all tables have proper RLS policies for admins
CREATE POLICY IF NOT EXISTS "Admins can manage all challenges"
  ON challenges
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can manage all labs"
  ON labs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create skill_paths table
CREATE TABLE IF NOT EXISTS skill_paths (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    estimated_duration INTEGER NOT NULL DEFAULT 1, -- in hours
    total_points INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    prerequisites TEXT[] DEFAULT '{}',
    learning_objectives TEXT[] NOT NULL DEFAULT '{}',
    cover_image TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create skill_path_items table
CREATE TABLE IF NOT EXISTS skill_path_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_path_id UUID NOT NULL REFERENCES skill_paths(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('challenge', 'lab')),
    item_id UUID NOT NULL,
    order_index INTEGER NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    unlock_after TEXT[] DEFAULT '{}', -- IDs of items that must be completed first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skill_path_id, order_index)
);

-- Create skill_path_progress table
CREATE TABLE IF NOT EXISTS skill_path_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_path_id UUID NOT NULL REFERENCES skill_paths(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    current_item_id UUID,
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'paused')),
    completed_items TEXT[] DEFAULT '{}',
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    UNIQUE(user_id, skill_path_id)
);

-- Create skill_path_item_progress table
CREATE TABLE IF NOT EXISTS skill_path_item_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_path_id UUID NOT NULL REFERENCES skill_paths(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('challenge', 'lab')),
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, skill_path_id, item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_paths_published ON skill_paths(is_published);
CREATE INDEX IF NOT EXISTS idx_skill_paths_category ON skill_paths(category);
CREATE INDEX IF NOT EXISTS idx_skill_paths_difficulty ON skill_paths(difficulty);
CREATE INDEX IF NOT EXISTS idx_skill_paths_created_at ON skill_paths(created_at);

CREATE INDEX IF NOT EXISTS idx_skill_path_items_path_id ON skill_path_items(skill_path_id);
CREATE INDEX IF NOT EXISTS idx_skill_path_items_order ON skill_path_items(skill_path_id, order_index);

CREATE INDEX IF NOT EXISTS idx_skill_path_progress_user ON skill_path_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_path_progress_path ON skill_path_progress(skill_path_id);
CREATE INDEX IF NOT EXISTS idx_skill_path_progress_status ON skill_path_progress(status);

CREATE INDEX IF NOT EXISTS idx_skill_path_item_progress_user ON skill_path_item_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_path_item_progress_path ON skill_path_item_progress(skill_path_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for skill_paths updated_at
CREATE TRIGGER update_skill_paths_updated_at 
    BEFORE UPDATE ON skill_paths 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE skill_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_path_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_path_item_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_paths
CREATE POLICY "Skill paths are viewable by everyone" ON skill_paths
    FOR SELECT USING (is_published = true OR auth.uid() = created_by);

CREATE POLICY "Users can create skill paths" ON skill_paths
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own skill paths" ON skill_paths
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own skill paths" ON skill_paths
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for skill_path_items
CREATE POLICY "Skill path items are viewable by everyone" ON skill_path_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM skill_paths 
            WHERE skill_paths.id = skill_path_items.skill_path_id 
            AND (skill_paths.is_published = true OR skill_paths.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can manage items of their skill paths" ON skill_path_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM skill_paths 
            WHERE skill_paths.id = skill_path_items.skill_path_id 
            AND skill_paths.created_by = auth.uid()
        )
    );

-- RLS Policies for skill_path_progress
CREATE POLICY "Users can view their own progress" ON skill_path_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON skill_path_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON skill_path_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for skill_path_item_progress
CREATE POLICY "Users can view their own item progress" ON skill_path_item_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own item progress" ON skill_path_item_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own item progress" ON skill_path_item_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON skill_paths TO authenticated;
GRANT ALL ON skill_path_items TO authenticated;
GRANT ALL ON skill_path_progress TO authenticated;
GRANT ALL ON skill_path_item_progress TO authenticated;

GRANT SELECT ON skill_paths TO anon;
GRANT SELECT ON skill_path_items TO anon;