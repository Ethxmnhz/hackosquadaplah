/*
  # Fix Operations RLS Policies

  1. New Tables
    - Fix RLS policies for operation_labs table
    - Add proper admin permissions for operations management
    - Ensure users can view and interact with operations appropriately

  2. Security
    - Enable RLS on all operations tables
    - Add policies for admins to manage operation labs
    - Add policies for users to view and participate in operations
    - Add policies for operation requests and active operations

  3. Changes
    - Create admin_users table if not exists
    - Fix operation_labs RLS policies
    - Add comprehensive RLS policies for all operations tables
*/

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can read their own admin status
CREATE POLICY "Admin users can read own status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create operation_labs table if it doesn't exist
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

-- Create operation_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS operation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  red_team_user uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blue_team_user uuid REFERENCES profiles(id) ON DELETE SET NULL,
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  operation_mode text DEFAULT 'live' CHECK (operation_mode IN ('live', 'ai')),
  estimated_duration integer DEFAULT 60,
  max_score integer DEFAULT 1000,
  expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on operation_requests
ALTER TABLE operation_requests ENABLE ROW LEVEL SECURITY;

-- Create active_operations table if it doesn't exist
CREATE TABLE IF NOT EXISTS active_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES operation_requests(id) ON DELETE CASCADE,
  red_team_user uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blue_team_user uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  status text DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'paused', 'completed', 'terminated')),
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  time_remaining integer DEFAULT 3600,
  red_team_score integer DEFAULT 0,
  blue_team_score integer DEFAULT 0,
  flags_captured integer DEFAULT 0,
  attacks_blocked integer DEFAULT 0,
  total_events integer DEFAULT 0,
  vpn_config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on active_operations
ALTER TABLE active_operations ENABLE ROW LEVEL SECURITY;

-- Create operation_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS operation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES active_operations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  team_type text NOT NULL CHECK (team_type IN ('red', 'blue', 'system')),
  points_awarded integer DEFAULT 0,
  description text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS on operation_events
ALTER TABLE operation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operation_labs

-- Admins can do everything with operation_labs
CREATE POLICY "Admins can manage operation labs"
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

-- Users can view active operation labs
CREATE POLICY "Users can view active operation labs"
  ON operation_labs
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for operation_requests

-- Users can view all operation requests
CREATE POLICY "Users can view operation requests"
  ON operation_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can create operation requests as red team
CREATE POLICY "Users can create operation requests"
  ON operation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = red_team_user);

-- Users can update requests they're involved in
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

-- RLS Policies for active_operations

-- Users can view operations they're involved in
CREATE POLICY "Users can view their operations"
  ON active_operations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = red_team_user OR 
    auth.uid() = blue_team_user OR
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- System can create operations (for accepting requests)
CREATE POLICY "System can create operations"
  ON active_operations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users and admins can update operations
CREATE POLICY "Users can update their operations"
  ON active_operations
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

-- RLS Policies for operation_events

-- Users can view events for operations they're involved in
CREATE POLICY "Users can view operation events"
  ON operation_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_operations 
      WHERE active_operations.id = operation_events.operation_id
      AND (
        active_operations.red_team_user = auth.uid() OR 
        active_operations.blue_team_user = auth.uid() OR
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE admin_users.id = auth.uid()
        )
      )
    )
  );

-- Users can create events for operations they're involved in
CREATE POLICY "Users can create operation events"
  ON operation_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM active_operations 
      WHERE active_operations.id = operation_events.operation_id
      AND (
        active_operations.red_team_user = auth.uid() OR 
        active_operations.blue_team_user = auth.uid() OR
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE admin_users.id = auth.uid()
        )
      )
    )
  );

-- Insert current user as admin if they don't exist
DO $$
BEGIN
  -- Get the current user ID from auth.users and insert into admin_users if not exists
  INSERT INTO admin_users (id)
  SELECT auth.uid()
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if the user doesn't exist or other issues
    NULL;
END $$;