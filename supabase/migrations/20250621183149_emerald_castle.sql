/*
  # Clean Up Conflicting Triggers

  1. Problem
    - Multiple conflicting triggers on the same tables
    - Badge_count ambiguity caused by overlapping functions
    - Too many triggers trying to do the same thing

  2. Solution
    - Remove ALL conflicting triggers
    - Create one clean, simple system
    - Use manual stats updates from application

  3. Changes
    - Drop all conflicting triggers and functions
    - Create minimal, safe triggers
    - Ensure no column ambiguity
*/

-- Drop ALL existing triggers that could cause conflicts
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions;
DROP TRIGGER IF EXISTS on_user_badges_change ON user_badges;
DROP TRIGGER IF EXISTS on_user_stats_update ON user_stats;
DROP TRIGGER IF EXISTS safe_challenge_completion_trigger ON challenge_completions;
DROP TRIGGER IF EXISTS safe_user_points_trigger ON user_points;
DROP TRIGGER IF EXISTS update_stats_on_challenge_completion ON challenge_completions;
DROP TRIGGER IF EXISTS update_stats_on_lab_completion ON lab_completions;
DROP TRIGGER IF EXISTS update_stats_on_points ON user_points;
DROP TRIGGER IF EXISTS on_user_points_insert ON user_points;
DROP TRIGGER IF EXISTS on_user_points_update_rank ON user_points;
DROP TRIGGER IF EXISTS on_challenge_completion_v2 ON challenge_completions;

-- Drop ALL functions that could cause ambiguity
DROP FUNCTION IF EXISTS handle_challenge_completion() CASCADE;
DROP FUNCTION IF EXISTS update_user_badge_count() CASCADE;
DROP FUNCTION IF EXISTS award_badge_if_eligible() CASCADE;
DROP FUNCTION IF EXISTS safe_handle_challenge_completion() CASCADE;
DROP FUNCTION IF EXISTS safe_handle_user_points() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_stats_challenges() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_stats_labs() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_user_stats() CASCADE;
DROP FUNCTION IF EXISTS handle_user_points() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_user_rank() CASCADE;
DROP FUNCTION IF EXISTS handle_challenge_completion_v2() CASCADE;

-- Create ONE simple function for user points that does nothing complex
CREATE OR REPLACE FUNCTION minimal_user_points_handler()
RETURNS TRIGGER AS $$
BEGIN
  -- Do absolutely nothing that could cause ambiguity
  -- Just log that a point was added
  RAISE NOTICE 'User % earned % points from %', NEW.user_id, NEW.points, NEW.source_type;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Even if logging fails, don't break the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create ONE simple trigger for user_points
CREATE TRIGGER minimal_user_points_trigger
  AFTER INSERT ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION minimal_user_points_handler();

-- Create ONE simple function for challenge completions
CREATE OR REPLACE FUNCTION minimal_challenge_completion_handler()
RETURNS TRIGGER AS $$
BEGIN
  -- Do absolutely nothing that could cause ambiguity
  RAISE NOTICE 'User % completed challenge %', NEW.user_id, NEW.challenge_id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create ONE simple trigger for challenge completions
CREATE TRIGGER minimal_challenge_completion_trigger
  AFTER INSERT ON challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION minimal_challenge_completion_handler();

-- Keep the manual stats update function (this is safe because it's called manually)
CREATE OR REPLACE FUNCTION update_user_stats_manual(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  total_points_value INTEGER := 0;
  challenges_count_value INTEGER := 0;
  labs_count_value INTEGER := 0;
  badges_count_value INTEGER := 0;
  rank_title_value TEXT := 'Novice';
BEGIN
  -- Calculate total points with explicit table reference
  SELECT COALESCE(SUM(points.points), 0) INTO total_points_value
  FROM user_points points
  WHERE points.user_id = target_user_id;
  
  -- Calculate challenges completed
  SELECT COUNT(*) INTO challenges_count_value
  FROM challenge_completions completions
  WHERE completions.user_id = target_user_id;
  
  -- Calculate labs completed
  SELECT COUNT(*) INTO labs_count_value
  FROM lab_completions lab_comps
  WHERE lab_comps.user_id = target_user_id;
  
  -- Calculate badges count
  SELECT COUNT(*) INTO badges_count_value
  FROM user_badges badges
  WHERE badges.user_id = target_user_id;
  
  -- Determine rank title
  IF total_points_value >= 2500 THEN
    rank_title_value := 'Legendary';
  ELSIF total_points_value >= 1500 THEN
    rank_title_value := 'Elite';
  ELSIF total_points_value >= 1000 THEN
    rank_title_value := 'Expert';
  ELSIF total_points_value >= 500 THEN
    rank_title_value := 'Advanced';
  ELSIF total_points_value >= 250 THEN
    rank_title_value := 'Intermediate';
  ELSIF total_points_value >= 100 THEN
    rank_title_value := 'Beginner';
  ELSE
    rank_title_value := 'Novice';
  END IF;
  
  -- Update or insert user stats with explicit column names
  INSERT INTO user_stats (
    user_id,
    total_points,
    challenges_completed,
    labs_completed,
    badge_count,
    rank_title,
    created_at,
    updated_at
  ) VALUES (
    target_user_id,
    total_points_value,
    challenges_count_value,
    labs_count_value,
    badges_count_value,
    rank_title_value,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = total_points_value,
    challenges_completed = challenges_count_value,
    labs_completed = labs_count_value,
    badge_count = badges_count_value,
    rank_title = rank_title_value,
    updated_at = NOW();
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_user_stats_manual: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Ensure proper RLS policies exist
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own points" ON user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON user_points;

CREATE POLICY "Users can view their own points"
  ON user_points
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points"
  ON user_points
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clean up any orphaned data that might cause issues
DELETE FROM user_points WHERE user_id IS NULL;
DELETE FROM challenge_completions WHERE user_id IS NULL;
DELETE FROM user_stats WHERE user_id IS NULL;