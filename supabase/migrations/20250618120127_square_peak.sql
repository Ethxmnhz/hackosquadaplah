/*
  # Fix ambiguous badge_count column reference

  1. Problem
    - Database error occurs when submitting challenges due to ambiguous "badge_count" column reference
    - This happens in triggers or functions that reference badge_count without proper table qualification

  2. Solution
    - Update all database functions and triggers to properly qualify the badge_count column with table aliases
    - Ensure all references to badge_count specify which table they belong to

  3. Changes
    - Fix trigger functions that handle challenge completions and user points
    - Add proper table aliases to eliminate ambiguity
*/

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS handle_challenge_completion() CASCADE;

-- Recreate the trigger function with proper column qualification
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user points when a challenge is completed
  INSERT INTO user_points (user_id, points, earned_from, earned_at)
  VALUES (NEW.user_id, NEW.points_earned, 'challenge_completion', NOW());
  
  -- Update user stats with proper table qualification
  INSERT INTO user_stats (user_id, challenges_completed, total_points, badge_count, created_at, updated_at)
  VALUES (
    NEW.user_id, 
    1, 
    NEW.points_earned, 
    0,  -- Initialize badge_count to 0 for new records
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    challenges_completed = user_stats.challenges_completed + 1,
    total_points = user_stats.total_points + NEW.points_earned,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions;

-- Recreate the trigger
CREATE TRIGGER on_challenge_completion
  AFTER INSERT ON challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();

-- Also fix any other functions that might have ambiguous references
-- Update the badge awarding function if it exists
DROP FUNCTION IF EXISTS award_badge_if_eligible() CASCADE;

CREATE OR REPLACE FUNCTION award_badge_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
  user_challenge_count INTEGER;
  user_total_points INTEGER;
BEGIN
  -- Get user stats with proper table qualification
  SELECT 
    us.challenges_completed, 
    us.total_points 
  INTO 
    user_challenge_count, 
    user_total_points
  FROM user_stats us 
  WHERE us.user_id = NEW.user_id;
  
  -- Award badges based on achievements
  -- First challenge badge
  IF user_challenge_count = 1 THEN
    INSERT INTO user_badges (user_id, badge_type, earned_at)
    VALUES (NEW.user_id, 'first_challenge', NOW())
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    
    -- Update badge count in user_stats
    UPDATE user_stats 
    SET 
      badge_count = user_stats.badge_count + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- 10 challenges badge
  IF user_challenge_count = 10 THEN
    INSERT INTO user_badges (user_id, badge_type, earned_at)
    VALUES (NEW.user_id, 'challenge_master', NOW())
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    
    -- Update badge count in user_stats
    UPDATE user_stats 
    SET 
      badge_count = user_stats.badge_count + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- High scorer badge (1000+ points)
  IF user_total_points >= 1000 THEN
    INSERT INTO user_badges (user_id, badge_type, earned_at)
    VALUES (NEW.user_id, 'high_scorer', NOW())
    ON CONFLICT (user_id, badge_type) DO NOTHING;
    
    -- Update badge count in user_stats
    UPDATE user_stats 
    SET 
      badge_count = user_stats.badge_count + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
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

-- Ensure all existing views also have proper column qualification
-- Drop and recreate any views that might have ambiguous references
DROP VIEW IF EXISTS user_leaderboard CASCADE;

CREATE VIEW user_leaderboard AS
SELECT 
  u.id,
  u.email,
  u.username,
  us.total_points,
  us.challenges_completed,
  us.badge_count,
  us.updated_at,
  ROW_NUMBER() OVER (ORDER BY us.total_points DESC, us.challenges_completed DESC) as rank
FROM users u
JOIN user_stats us ON u.id = us.user_id
ORDER BY us.total_points DESC, us.challenges_completed DESC;