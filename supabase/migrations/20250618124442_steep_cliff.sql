/*
  # Final fix for ambiguous badge_count column reference

  1. Problem
    - Multiple tables have badge_count columns causing ambiguous references
    - Database functions and triggers are not properly qualifying column names
    - Error occurs when accessing user_points endpoint

  2. Solution
    - Drop and recreate all functions with explicit table qualifications
    - Ensure all column references use proper table aliases
    - Fix any remaining ambiguous references in views and functions

  3. Changes
    - Completely rebuild all trigger functions with proper column qualification
    - Update all views to use explicit table aliases
    - Ensure no ambiguous column references remain
*/

-- First, drop all existing triggers and functions to start clean
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions CASCADE;
DROP TRIGGER IF EXISTS on_user_stats_update ON user_stats CASCADE;
DROP TRIGGER IF EXISTS on_user_badges_change ON user_badges CASCADE;

DROP FUNCTION IF EXISTS handle_challenge_completion() CASCADE;
DROP FUNCTION IF EXISTS award_badge_if_eligible() CASCADE;
DROP FUNCTION IF EXISTS update_user_badge_count() CASCADE;

-- Drop and recreate the user_leaderboard view with explicit aliases
DROP VIEW IF EXISTS user_leaderboard CASCADE;

-- Recreate the challenge completion handler with explicit table qualifications
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
  challenge_points INTEGER := 0;
BEGIN
  -- Get points from the challenge table
  SELECT c.points INTO challenge_points
  FROM challenges c
  WHERE c.id = NEW.challenge_id;
  
  -- Set default if null
  challenge_points := COALESCE(challenge_points, 0);
  
  -- Insert points record into user_points table
  INSERT INTO user_points (user_id, points, source_type, source_id, earned_from, earned_at)
  VALUES (NEW.user_id, challenge_points, 'challenge', NEW.challenge_id, 'challenge_completion', NOW());
  
  -- Update user_stats table with explicit column qualifications
  INSERT INTO user_stats (user_id, challenges_completed, total_points, badge_count, created_at, updated_at)
  VALUES (
    NEW.user_id, 
    1, 
    challenge_points, 
    0,
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    challenges_completed = user_stats.challenges_completed + 1,
    total_points = user_stats.total_points + challenge_points,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the badge awarding function with explicit table qualifications
CREATE OR REPLACE FUNCTION award_badge_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
  user_challenge_count INTEGER := 0;
  user_total_points INTEGER := 0;
  badge_exists BOOLEAN := FALSE;
  current_badge_count INTEGER := 0;
BEGIN
  -- Get user stats from user_stats table with explicit alias
  SELECT 
    stats.challenges_completed, 
    stats.total_points,
    stats.badge_count
  INTO 
    user_challenge_count, 
    user_total_points,
    current_badge_count
  FROM user_stats stats 
  WHERE stats.user_id = NEW.user_id;
  
  -- Set defaults if null
  user_challenge_count := COALESCE(user_challenge_count, 0);
  user_total_points := COALESCE(user_total_points, 0);
  current_badge_count := COALESCE(current_badge_count, 0);
  
  -- Award first challenge badge
  IF user_challenge_count = 1 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges badges
      WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'first_challenge'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'first_challenge', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = current_badge_count + 1,
        updated_at = NOW()
      WHERE user_stats.user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Award challenge master badge (10 challenges)
  IF user_challenge_count = 10 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges badges
      WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'challenge_master'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'challenge_master', NOW());
      
      -- Get updated badge count
      SELECT stats.badge_count INTO current_badge_count
      FROM user_stats stats
      WHERE stats.user_id = NEW.user_id;
      
      UPDATE user_stats 
      SET 
        badge_count = COALESCE(current_badge_count, 0) + 1,
        updated_at = NOW()
      WHERE user_stats.user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Award high scorer badge (1000+ points)
  IF user_total_points >= 1000 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges badges
      WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'high_scorer'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'high_scorer', NOW());
      
      -- Get updated badge count
      SELECT stats.badge_count INTO current_badge_count
      FROM user_stats stats
      WHERE stats.user_id = NEW.user_id;
      
      UPDATE user_stats 
      SET 
        badge_count = COALESCE(current_badge_count, 0) + 1,
        updated_at = NOW()
      WHERE user_stats.user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the badge count update function with explicit table qualifications
CREATE OR REPLACE FUNCTION update_user_badge_count()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  new_badge_count INTEGER := 0;
BEGIN
  -- Determine which user_id to update
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Count badges for this user
  SELECT COUNT(*) INTO new_badge_count
  FROM user_badges badges
  WHERE badges.user_id = target_user_id;
  
  -- Update user_stats with explicit table qualification
  UPDATE user_stats 
  SET 
    badge_count = new_badge_count,
    updated_at = NOW()
  WHERE user_stats.user_id = target_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the user_leaderboard view with explicit table aliases
CREATE VIEW user_leaderboard AS
SELECT 
  profiles.id,
  profiles.email,
  profiles.username,
  COALESCE(stats.total_points, 0) as total_points,
  COALESCE(stats.challenges_completed, 0) as challenges_completed,
  COALESCE(stats.labs_completed, 0) as labs_completed,
  COALESCE(stats.badge_count, 0) as badge_count,
  COALESCE(stats.rank_title, 'Novice') as rank_title,
  COALESCE(stats.updated_at, profiles.created_at) as updated_at,
  ROW_NUMBER() OVER (ORDER BY COALESCE(stats.total_points, 0) DESC, COALESCE(stats.challenges_completed, 0) DESC) as rank_position
FROM profiles
LEFT JOIN user_stats stats ON profiles.id = stats.user_id
ORDER BY COALESCE(stats.total_points, 0) DESC, COALESCE(stats.challenges_completed, 0) DESC;

-- Recreate all triggers
CREATE TRIGGER on_challenge_completion
  AFTER INSERT ON challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();

CREATE TRIGGER on_user_stats_update
  AFTER UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION award_badge_if_eligible();

CREATE TRIGGER on_user_badges_change
  AFTER INSERT OR DELETE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_user_badge_count();

-- Ensure all existing users have proper user_stats records
INSERT INTO user_stats (user_id, challenges_completed, labs_completed, total_points, badge_count, created_at, updated_at)
SELECT 
  profiles.id,
  0,
  0,
  COALESCE((SELECT SUM(points.points) FROM user_points points WHERE points.user_id = profiles.id), 0),
  COALESCE((SELECT COUNT(*) FROM user_badges badges WHERE badges.user_id = profiles.id), 0),
  profiles.created_at,
  NOW()
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats stats WHERE stats.user_id = profiles.id
);

-- Update existing user_stats records to have correct badge counts
UPDATE user_stats 
SET badge_count = (
  SELECT COUNT(*) 
  FROM user_badges badges
  WHERE badges.user_id = user_stats.user_id
),
updated_at = NOW()
WHERE user_stats.badge_count != (
  SELECT COUNT(*) 
  FROM user_badges badges
  WHERE badges.user_id = user_stats.user_id
);