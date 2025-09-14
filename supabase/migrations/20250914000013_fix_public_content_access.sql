-- Migration: Fix public table permissions independently
-- Description: Makes sure public content is accessible regardless of admin status

-- Update permissions for public content tables to ensure they're accessible
-- regardless of admin_users table status

-- 1. Challenges table
ALTER TABLE IF EXISTS challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved challenges" ON challenges;
CREATE POLICY "Public can view approved challenges" 
  ON challenges
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- 2. Labs table
ALTER TABLE IF EXISTS labs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published labs" ON labs;
CREATE POLICY "Public can view published labs" 
  ON labs
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 3. Leaderboard entries
ALTER TABLE IF EXISTS leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view leaderboard" ON leaderboard_entries;
CREATE POLICY "Public can view leaderboard" 
  ON leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Other content tables that should be publicly accessible
-- Add more as needed based on error messages
