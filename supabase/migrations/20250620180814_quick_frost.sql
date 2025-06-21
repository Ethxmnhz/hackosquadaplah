/*
  # Fix Leaderboard RLS and Badge Count Ambiguity

  1. Changes
    - Add proper RLS policies for leaderboard_entries table
    - Fix any remaining badge_count ambiguity issues
    - Ensure all users can read leaderboard entries
    - Allow authenticated users to update their own leaderboard entries

  2. Security
    - Enable RLS on leaderboard_entries table
    - Add policies for reading and updating leaderboard entries
*/

-- First, ensure the leaderboard_entries table exists
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  total_points integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  rank_title text DEFAULT 'Novice',
  challenges_completed integer DEFAULT 0,
  labs_completed integer DEFAULT 0,
  badge_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on leaderboard_entries
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all leaderboard entries" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can update their own leaderboard entries" ON leaderboard_entries;
DROP POLICY IF EXISTS "Admins can manage all leaderboard entries" ON leaderboard_entries;

-- Create RLS policies for leaderboard_entries
CREATE POLICY "Users can read all leaderboard entries"
  ON leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own leaderboard entries"
  ON leaderboard_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leaderboard entries"
  ON leaderboard_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all leaderboard entries"
  ON leaderboard_entries
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

-- Create a function to update leaderboard entries that avoids the badge_count ambiguity
CREATE OR REPLACE FUNCTION update_leaderboard_entry()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_total_points integer := 0;
  user_challenges_count integer := 0;
  user_labs_count integer := 0;
  user_badges_count integer := 0;
  user_rank_title text := 'Novice';
  user_rank_position integer := 0;
BEGIN
  -- Get username from profiles
  SELECT username INTO user_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get total points
  SELECT COALESCE(SUM(points), 0) INTO user_total_points
  FROM user_points
  WHERE user_id = NEW.user_id;
  
  -- Get challenges completed
  SELECT COUNT(*) INTO user_challenges_count
  FROM challenge_completions
  WHERE user_id = NEW.user_id;
  
  -- Get labs completed
  SELECT COUNT(*) INTO user_labs_count
  FROM lab_completions
  WHERE user_id = NEW.user_id;
  
  -- Get badges count
  SELECT COUNT(*) INTO user_badges_count
  FROM user_badges
  WHERE user_id = NEW.user_id;
  
  -- Determine rank title based on points
  IF user_total_points >= 2500 THEN
    user_rank_title := 'Legendary';
  ELSIF user_total_points >= 1500 THEN
    user_rank_title := 'Elite';
  ELSIF user_total_points >= 1000 THEN
    user_rank_title := 'Expert';
  ELSIF user_total_points >= 500 THEN
    user_rank_title := 'Advanced';
  ELSIF user_total_points >= 250 THEN
    user_rank_title := 'Intermediate';
  ELSIF user_total_points >= 100 THEN
    user_rank_title := 'Beginner';
  ELSE
    user_rank_title := 'Novice';
  END IF;
  
  -- Update leaderboard entry
  INSERT INTO leaderboard_entries (
    user_id,
    username,
    total_points,
    rank_title,
    challenges_completed,
    labs_completed,
    badge_count,
    last_updated
  ) VALUES (
    NEW.user_id,
    user_name,
    user_total_points,
    user_rank_title,
    user_challenges_count,
    user_labs_count,
    user_badges_count,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    username = user_name,
    total_points = user_total_points,
    rank_title = user_rank_title,
    challenges_completed = user_challenges_count,
    labs_completed = user_labs_count,
    badge_count = user_badges_count,
    last_updated = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_leaderboard_entry: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update leaderboard entries when user_stats are updated
DROP TRIGGER IF EXISTS on_user_stats_update_leaderboard ON user_stats;
CREATE TRIGGER on_user_stats_update_leaderboard
  AFTER INSERT OR UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_entry();

-- Create trigger to update leaderboard entries when user_points are added
DROP TRIGGER IF EXISTS on_user_points_update_leaderboard ON user_points;
CREATE TRIGGER on_user_points_update_leaderboard
  AFTER INSERT ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_entry();

-- Create operation_chat table if it doesn't exist
CREATE TABLE IF NOT EXISTS operation_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES active_operations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  team_type text NOT NULL CHECK (team_type IN ('red', 'blue', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on operation_chat
ALTER TABLE operation_chat ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for operation_chat
CREATE POLICY "Users can view chat messages for their operations"
  ON operation_chat
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_operations 
      WHERE active_operations.id = operation_chat.operation_id
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

CREATE POLICY "Users can send chat messages for their operations"
  ON operation_chat
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM active_operations 
      WHERE active_operations.id = operation_chat.operation_id
      AND (
        (active_operations.red_team_user = auth.uid() AND operation_chat.team_type = 'red') OR 
        (active_operations.blue_team_user = auth.uid() AND operation_chat.team_type = 'blue') OR
        EXISTS (
          SELECT 1 FROM admin_users 
          WHERE admin_users.id = auth.uid()
        )
      )
    )
  );

-- Create operation_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES active_operations(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
  message text NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on operation_logs
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for operation_logs
CREATE POLICY "Users can view logs for their operations"
  ON operation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_operations 
      WHERE active_operations.id = operation_logs.operation_id
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

CREATE POLICY "Users can create logs for their operations"
  ON operation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM active_operations 
      WHERE active_operations.id = operation_logs.operation_id
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