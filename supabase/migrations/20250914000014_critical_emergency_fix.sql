-- Migration: Critical emergency fix for admin_users recursion
-- Description: Disables row-level security to immediately fix the infinite recursion error

-- STEP 1: Disable row-level security on admin_users table
-- This immediately stops the recursion by removing all policies
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Update admin_users to only include the specified admin
TRUNCATE admin_users;

-- Add only the specified admin
INSERT INTO admin_users (id)
SELECT profiles.id FROM profiles 
WHERE profiles.email = 'shaikhminhaz1975@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- STEP 3: For other critical tables that might be having issues, 
-- ensure they have basic row level security that doesn't depend on admin_users

-- Challenges table
ALTER TABLE IF EXISTS challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for challenges" ON challenges;
CREATE POLICY "Public read access for challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (true);

-- Labs table
ALTER TABLE IF EXISTS labs DISABLE ROW LEVEL SECURITY;
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for labs" ON labs;
CREATE POLICY "Public read access for labs"
  ON labs
  FOR SELECT
  TO authenticated
  USING (true);

-- Leaderboard table
ALTER TABLE IF EXISTS leaderboard_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for leaderboard" ON leaderboard_entries;
CREATE POLICY "Public read access for leaderboard"
  ON leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (true);
