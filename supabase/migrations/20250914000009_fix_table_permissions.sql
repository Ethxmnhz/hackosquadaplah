-- Migration: Apply necessary permissions to all tables
-- Description: Ensures all tables have appropriate permissions to prevent further issues

-- This migration grants permissions for authenticated users to view specific tables
-- without requiring admin access checks to prevent recursive policy issues

-- 1. Update permissions for challenges table
ALTER TABLE IF EXISTS challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view approved challenges" ON challenges;
CREATE POLICY "Everyone can view approved challenges" 
  ON challenges
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- 2. Update permissions for labs table
ALTER TABLE IF EXISTS labs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view published labs" ON labs;
CREATE POLICY "Everyone can view published labs" 
  ON labs
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 3. Update permissions for leaderboard_entries
ALTER TABLE IF EXISTS leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view leaderboard" ON leaderboard_entries;
CREATE POLICY "Everyone can view leaderboard" 
  ON leaderboard_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Ensure bootstrap_admins permissions are set correctly
ALTER TABLE IF EXISTS bootstrap_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bootstrap admins can see themselves" ON bootstrap_admins;
CREATE POLICY "Bootstrap admins can see themselves" 
  ON bootstrap_admins
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- This policy only allows bootstrap_admins to see all other bootstrap_admins
DROP POLICY IF EXISTS "Bootstrap admins can see all bootstrap admins" ON bootstrap_admins;
CREATE POLICY "Bootstrap admins can see all bootstrap admins" 
  ON bootstrap_admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bootstrap_admins ba 
      WHERE ba.id = auth.uid()
    )
  );

-- 5. Create policies for other common tables that might be causing issues
-- Add more tables here as needed based on the error messages
