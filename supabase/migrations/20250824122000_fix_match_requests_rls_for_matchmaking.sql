-- Migration: Fix RLS for match_requests to allow matchmaking to work
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own match requests
DROP POLICY IF EXISTS "Users can view their own match requests" ON match_requests;
CREATE POLICY "Users can view their own match requests"
  ON match_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to view all waiting or matched requests (for matchmaking)
DROP POLICY IF EXISTS "Users can view waiting match requests for matchmaking" ON match_requests;
CREATE POLICY "Users can view waiting or matched match requests for matchmaking"
  ON match_requests
  FOR SELECT
  TO authenticated
  USING (
    status IN ('waiting', 'matched')
  );

-- Allow users to insert their own match requests
DROP POLICY IF EXISTS "Users can insert their own match requests" ON match_requests;
CREATE POLICY "Users can insert their own match requests"
  ON match_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
