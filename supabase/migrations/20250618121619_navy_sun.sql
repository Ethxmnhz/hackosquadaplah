/*
  # Fix Ambiguous Badge Count Column Reference

  1. Problem
    - Database triggers are causing "column reference badge_count is ambiguous" errors
    - This happens when multiple tables in a query have the same column name
    - Need to properly qualify all column references in triggers and functions

  2. Solution
    - Update all trigger functions to use fully qualified column names
    - Fix any views or functions that might have ambiguous references
    - Ensure proper table aliases are used throughout
*/

-- Drop and recreate the challenge completion trigger function with proper column qualification
DROP FUNCTION IF EXISTS handle_challenge_completion() CASCADE;

CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
  challenge_points INTEGER;
BEGIN
  -- Get points from the challenge
  SELECT c.points INTO challenge_points
  FROM challenges c
  WHERE c.id = NEW.challenge_id;
  
  -- Insert points record
  INSERT INTO user_points (user_id, points, source_type, source_id, earned_from, earned_at)
  VALUES (NEW.user_id, COALESCE(challenge_points, 0), 'challenge', NEW.challenge_id, 'challenge_completion', NOW());
  
  -- Update user stats with fully qualified column names
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

-- Drop and recreate the badge awarding function with proper column qualification
DROP FUNCTION IF EXISTS award_badge_if_eligible() CASCADE;

CREATE OR REPLACE FUNCTION award_badge_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
  user_challenge_count INTEGER;
  user_total_points INTEGER;
  badge_exists BOOLEAN;
BEGIN
  -- Get user stats with fully qualified column names
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
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = NEW.user_id AND ub.badge_type = 'first_challenge'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'first_challenge', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = user_stats.badge_count + 1,
        updated_at = NOW()
      WHERE user_stats.user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Award challenge master badge (10 challenges)
  IF user_challenge_count = 10 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = NEW.user_id AND ub.badge_type = 'challenge_master'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'challenge_master', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = user_stats.badge_count + 1,
        updated_at = NOW()
      WHERE user_stats.user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- Award high scorer badge (1000+ points)
  IF user_total_points >= 1000 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = NEW.user_id AND ub.badge_type = 'high_scorer'
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES (NEW.user_id, 'high_scorer', NOW());
      
      UPDATE user_stats 
      SET 
        badge_count = user_stats.badge_count + 1,
        updated_at = NOW()
      WHERE user_stats.user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the badge count update function with proper column qualification
DROP FUNCTION IF EXISTS update_user_badge_count() CASCADE;

CREATE OR REPLACE FUNCTION update_user_badge_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update badge count in user_stats when badges are added/removed
  UPDATE user_stats 
  SET 
    badge_count = (
      SELECT COUNT(*) 
      FROM user_badges ub
      WHERE ub.user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    updated_at = NOW()
  WHERE user_stats.user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate all triggers
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions;
CREATE TRIGGER on_challenge_completion
  AFTER INSERT ON challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion();

DROP TRIGGER IF EXISTS on_user_stats_update ON user_stats;
CREATE TRIGGER on_user_stats_update
  AFTER UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION award_badge_if_eligible();

DROP TRIGGER IF EXISTS on_user_badges_change ON user_badges;
CREATE TRIGGER on_user_badges_change
  AFTER INSERT OR DELETE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_user_badge_count();

-- Update the user_leaderboard view to ensure no ambiguous references
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
  ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC) as rank_position
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC;

-- Check for any other functions that might have ambiguous references
-- and fix them by ensuring all column references are properly qualified

-- If there are any other triggers or functions causing issues, they would be fixed here
-- by ensuring all table references use proper aliases and column qualifications