/*
  # Fix missing badge_count column in user_stats table

  1. Changes
    - Add badge_count column to user_stats table if it doesn't exist
    - Update existing records to have correct badge_count based on user_badges table
    - Fix any remaining column reference issues

  2. Security
    - Maintain existing RLS policies
*/

-- Add badge_count column to user_stats if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'badge_count'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN badge_count integer DEFAULT 0;
  END IF;
END $$;

-- Update existing user_stats records to have correct badge_count
UPDATE user_stats 
SET badge_count = (
  SELECT COUNT(*) 
  FROM user_badges 
  WHERE user_badges.user_id = user_stats.user_id
)
WHERE badge_count IS NULL OR badge_count = 0;

-- Ensure the user_stats table has all required columns
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'labs_completed'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN labs_completed integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'rank_position'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN rank_position integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'rank_title'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN rank_title text DEFAULT 'Novice';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE user_stats ADD COLUMN last_activity timestamptz DEFAULT now();
  END IF;
END $$;

-- Update the user_leaderboard view to ensure it works correctly
DROP VIEW IF EXISTS user_leaderboard CASCADE;

CREATE VIEW user_leaderboard AS
SELECT 
  p.id,
  p.email,
  p.username,
  COALESCE(us.total_points, 0) as total_points,
  COALESCE(us.challenges_completed, 0) as challenges_completed,
  COALESCE(us.labs_completed, 0) as labs_completed,
  COALESCE(us.badge_count, 0) as badge_count,
  COALESCE(us.rank_title, 'Novice') as rank_title,
  COALESCE(us.updated_at, p.created_at) as updated_at,
  ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC) as rank
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC;

-- Update any functions that might be causing issues
DROP FUNCTION IF EXISTS update_user_badge_count() CASCADE;

CREATE OR REPLACE FUNCTION update_user_badge_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update badge count in user_stats when badges are added/removed
  UPDATE user_stats 
  SET 
    badge_count = (
      SELECT COUNT(*) 
      FROM user_badges 
      WHERE user_badges.user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    updated_at = NOW()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update badge count
DROP TRIGGER IF EXISTS on_user_badges_change ON user_badges;
CREATE TRIGGER on_user_badges_change
  AFTER INSERT OR DELETE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_user_badge_count();

-- Ensure all existing users have a user_stats record
INSERT INTO user_stats (user_id, challenges_completed, labs_completed, total_points, badge_count, created_at, updated_at)
SELECT 
  p.id,
  0,
  0,
  COALESCE((SELECT SUM(points) FROM user_points WHERE user_id = p.id), 0),
  COALESCE((SELECT COUNT(*) FROM user_badges WHERE user_id = p.id), 0),
  p.created_at,
  NOW()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats WHERE user_id = p.id
);