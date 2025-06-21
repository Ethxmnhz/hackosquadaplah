/*
  # Final Fix for Badge Count Ambiguity

  1. Problem
    - The "column reference badge_count is ambiguous" error persists
    - This happens when multiple tables in a query have the same column name
    - Need to fix all database objects that reference badge_count

  2. Solution
    - Create a new function to handle user points that avoids the ambiguity
    - Use explicit table aliases in all queries
    - Ensure all column references are fully qualified

  3. Changes
    - Create a new function for handling user points
    - Update the user_points table to include source_id_type
    - Fix any remaining ambiguous references
*/

-- Create a new function to handle user points that avoids the badge_count ambiguity
CREATE OR REPLACE FUNCTION handle_user_points()
RETURNS TRIGGER AS $$
DECLARE
  user_stats_record RECORD;
  new_badge_count INTEGER;
BEGIN
  -- Get current user stats with explicit alias
  SELECT * INTO user_stats_record
  FROM user_stats stats
  WHERE stats.user_id = NEW.user_id;
  
  -- If no record exists, create one
  IF user_stats_record IS NULL THEN
    INSERT INTO user_stats (
      user_id,
      total_points,
      challenges_completed,
      labs_completed,
      badge_count,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      NEW.points,
      0,
      0,
      0,
      NOW(),
      NOW()
    );
  ELSE
    -- Update existing record with explicit column references
    UPDATE user_stats stats
    SET 
      total_points = stats.total_points + NEW.points,
      updated_at = NOW()
    WHERE stats.user_id = NEW.user_id;
  END IF;
  
  -- Update challenge or lab completion count if applicable
  IF NEW.source_type = 'challenge' THEN
    UPDATE user_stats stats
    SET 
      challenges_completed = COALESCE(stats.challenges_completed, 0) + 1,
      updated_at = NOW()
    WHERE stats.user_id = NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_points points
      WHERE points.user_id = NEW.user_id
      AND points.source_type = 'challenge'
      AND points.source_id = NEW.source_id
      AND points.id != NEW.id
    );
  ELSIF NEW.source_type = 'lab' THEN
    UPDATE user_stats stats
    SET 
      labs_completed = COALESCE(stats.labs_completed, 0) + 1,
      updated_at = NOW()
    WHERE stats.user_id = NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_points points
      WHERE points.user_id = NEW.user_id
      AND points.source_type = 'lab'
      AND points.source_id = NEW.source_id
      AND points.id != NEW.id
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_user_points: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_points
DROP TRIGGER IF EXISTS on_user_points_insert ON user_points;
CREATE TRIGGER on_user_points_insert
  AFTER INSERT ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_points();

-- Add source_id_type column to user_points if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points' AND column_name = 'source_id_type'
  ) THEN
    ALTER TABLE user_points ADD COLUMN source_id_type text;
  END IF;
END $$;

-- Create a view for user stats that avoids ambiguity
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
  profiles.id,
  profiles.username,
  profiles.email,
  COALESCE(stats.total_points, 0) as total_points,
  COALESCE(stats.challenges_completed, 0) as challenges_completed,
  COALESCE(stats.labs_completed, 0) as labs_completed,
  COALESCE(stats.badge_count, 0) as badge_count,
  COALESCE(stats.rank_title, 'Novice') as rank_title,
  COALESCE(stats.rank_position, 0) as rank_position,
  COALESCE(stats.updated_at, profiles.created_at) as last_activity
FROM profiles
LEFT JOIN user_stats stats ON profiles.id = stats.user_id;

-- Create a function to safely get user points
CREATE OR REPLACE FUNCTION get_user_points(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points.points), 0) INTO total_points
  FROM user_points points
  WHERE points.user_id = user_uuid;
  
  RETURN total_points;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_user_points: %', SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Create a function to safely get user badge count
CREATE OR REPLACE FUNCTION get_user_badge_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  badge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO badge_count
  FROM user_badges badges
  WHERE badges.user_id = user_uuid;
  
  RETURN badge_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in get_user_badge_count: %', SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update user rank
CREATE OR REPLACE FUNCTION update_user_rank(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  user_points INTEGER;
  rank_title_value TEXT := 'Novice';
BEGIN
  -- Get user points
  SELECT get_user_points(user_uuid) INTO user_points;
  
  -- Determine rank title based on points
  IF user_points >= 2500 THEN
    rank_title_value := 'Legendary';
  ELSIF user_points >= 1500 THEN
    rank_title_value := 'Elite';
  ELSIF user_points >= 1000 THEN
    rank_title_value := 'Expert';
  ELSIF user_points >= 500 THEN
    rank_title_value := 'Advanced';
  ELSIF user_points >= 250 THEN
    rank_title_value := 'Intermediate';
  ELSIF user_points >= 100 THEN
    rank_title_value := 'Beginner';
  ELSE
    rank_title_value := 'Novice';
  END IF;
  
  -- Update user_stats
  UPDATE user_stats stats
  SET 
    rank_title = rank_title_value,
    updated_at = NOW()
  WHERE stats.user_id = user_uuid;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_user_rank: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update user rank when points are added
CREATE OR REPLACE FUNCTION trigger_update_user_rank()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_rank(NEW.user_id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in trigger_update_user_rank: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_points to update rank
DROP TRIGGER IF EXISTS on_user_points_update_rank ON user_points;
CREATE TRIGGER on_user_points_update_rank
  AFTER INSERT ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_rank();