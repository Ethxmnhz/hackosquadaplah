-- Migration: Add SELECT RLS policies for match_requests to fix matchmaking 406 error
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own match requests
CREATE POLICY "Users can view their own match requests"
  ON match_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to view waiting match requests for matchmaking (opposite team, not their own)
CREATE POLICY "Users can view waiting match requests for matchmaking"
  ON match_requests
  FOR SELECT
  TO authenticated
  USING (
    status = 'waiting'
    AND user_id != auth.uid()
  );
