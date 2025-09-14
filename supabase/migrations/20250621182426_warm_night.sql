/*
  # Drop Redundant Trigger to Fix Badge Count Ambiguity

  1. Problem
    - The "on_user_points_update_leaderboard" trigger is redundant
    - It conflicts with the newer trigger chain introduced in square_jungle.sql
    - This causes "column reference badge_count is ambiguous" error

  2. Solution
    - Drop the redundant trigger
    - Keep the newer, more robust trigger chain:
      - handle_user_points updates user_stats
      - on_user_stats_update_leaderboard updates leaderboard_entries

  3. Changes
    - Remove on_user_points_update_leaderboard trigger
    - Remove update_leaderboard_entry function (no longer needed)
*/

-- Drop the redundant trigger that's causing the ambiguity
DROP TRIGGER IF EXISTS on_user_points_update_leaderboard ON user_points;

-- Drop the associated function that's no longer needed
DROP FUNCTION IF EXISTS update_leaderboard_entry();