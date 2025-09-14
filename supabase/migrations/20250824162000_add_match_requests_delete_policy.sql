-- Migration: Allow authenticated users to delete match_requests (for admin panel)
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete match requests" ON match_requests
  FOR DELETE
  TO authenticated
  USING (true);
