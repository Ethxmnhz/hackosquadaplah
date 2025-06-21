-- Fix the users table reference in the user_leaderboard view
-- The application uses 'profiles' table, not 'users'

-- Drop the existing view that references non-existent 'users' table
DROP VIEW IF EXISTS user_leaderboard CASCADE;

-- Recreate the view using the correct 'profiles' table
CREATE VIEW user_leaderboard AS
SELECT 
  p.id,
  p.email,
  p.username,
  COALESCE(us.total_points, 0) as total_points,
  COALESCE(us.challenges_completed, 0) as challenges_completed,
  COALESCE(us.badge_count, 0) as badge_count,
  COALESCE(us.updated_at, p.created_at) as updated_at,
  ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC) as rank
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC;

-- Also ensure the user_stats table exists with proper structure
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenges_completed integer DEFAULT 0,
  labs_completed integer DEFAULT 0,
  total_points integer DEFAULT 0,
  badge_count integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  rank_title text DEFAULT 'Novice',
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_stats
DROP POLICY IF EXISTS "Users can view all user stats" ON user_stats;
CREATE POLICY "Users can view all user stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure user_badges table exists
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Enable RLS on user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_badges
DROP POLICY IF EXISTS "Users can view all badges" ON user_badges;
CREATE POLICY "Users can view all badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage own badges" ON user_badges;
CREATE POLICY "Users can manage own badges"
  ON user_badges
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure user_points table exists
CREATE TABLE IF NOT EXISTS user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  source_type text NOT NULL, -- 'challenge', 'lab', 'operation', etc.
  source_id uuid, -- ID of the challenge, lab, etc.
  earned_from text, -- Description of how points were earned
  earned_at timestamptz DEFAULT now()
);

-- Enable RLS on user_points
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_points
DROP POLICY IF EXISTS "Users can view all points" ON user_points;
CREATE POLICY "Users can view all points"
  ON user_points
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage own points" ON user_points;
CREATE POLICY "Users can manage own points"
  ON user_points
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update the challenge completion trigger function to use correct table references
DROP FUNCTION IF EXISTS handle_challenge_completion() CASCADE;

CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
  challenge_points INTEGER;
BEGIN
  -- Get points from the challenge
  SELECT points INTO challenge_points
  FROM challenges
  WHERE id = NEW.challenge_id;
  
  -- Insert points record
  INSERT INTO user_points (user_id, points, source_type, source_id, earned_from, earned_at)
  VALUES (NEW.user_id, COALESCE(challenge_points, 0), 'challenge', NEW.challenge_id, 'challenge_completion', NOW());
  
  -- Update user stats
  INSERT INTO user_stats (user_id, challenges_completed, total_points, badge_count, created_at, updated_at)
  VALUES (
    NEW.user_id, 
    1, 
    COALESCE(challenge_points, 0), 
    0,
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    challenges_completed = user_stats.challenges_completed + 1,
    total_points = user_stats.total_points + COALESCE(challenge_points, 0),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions;
CREATE TRIGGER on_challenge_completion
  AFTER INSERT ON challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();

-- Update the badge awarding function
DROP FUNCTION IF EXISTS award_badge_if_eligible() CASCADE;

CREATE OR REPLACE FUNCTION award_badge_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
  user_challenge_count INTEGER;
  user_total_points INTEGER;
  badge_exists BOOLEAN;
BEGIN
  -- Get user stats
  SELECT 
    us.challenges_completed, 
    us.total_points 
  INTO 
    user_challenge_count, 
    user_total_points
  FROM user_stats us 
  WHERE us.user_id = NEW.user_id;
  
  -- Award first challenge badge
  IF user_challenge_count = 1 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.user_id AND badge_type = 'first_challenge'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'first_challenge', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = user_stats.badge_count + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Award challenge master badge (10 challenges)
  IF user_challenge_count = 10 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.user_id AND badge_type = 'challenge_master'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'challenge_master', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = user_stats.badge_count + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Award high scorer badge (1000+ points)
  IF user_total_points >= 1000 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.user_id AND badge_type = 'high_scorer'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'high_scorer', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = user_stats.badge_count + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for badge awarding
DROP TRIGGER IF EXISTS on_user_stats_update ON user_stats;
CREATE TRIGGER on_user_stats_update
  AFTER UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION award_badge_if_eligible();