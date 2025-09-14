/*
  # Fix Badge Count Ambiguity - Proper Cascade Drop

  1. Problem
    - Cannot drop function update_leaderboard_entry() because trigger depends on it
    - Need to drop dependent objects first

  2. Solution
    - Drop all dependent triggers first
    - Then drop the function
    - This will resolve the badge_count ambiguity error

  3. Changes
    - Drop triggers that depend on update_leaderboard_entry()
    - Drop the function itself
    - Keep only the newer, more robust trigger system
*/

-- Drop all triggers that depend on update_leaderboard_entry function
DROP TRIGGER IF EXISTS on_user_stats_update_leaderboard ON user_stats;
DROP TRIGGER IF EXISTS on_user_points_update_leaderboard ON user_points;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS update_leaderboard_entry();

-- Ensure we keep the newer, working triggers
-- The handle_user_points() function and its trigger should remain active
-- The trigger_update_user_rank() function and its trigger should remain active

-- Verify that the newer system is in place
DO $$
BEGIN
  -- Check if handle_user_points function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_user_points'
  ) THEN
    RAISE NOTICE 'Warning: handle_user_points function not found. The newer trigger system may not be active.';
  END IF;
  
  -- Check if trigger_update_user_rank function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'trigger_update_user_rank'
  ) THEN
    RAISE NOTICE 'Warning: trigger_update_user_rank function not found. The newer trigger system may not be active.';
  END IF;
END $$;