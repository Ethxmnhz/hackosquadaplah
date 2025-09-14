-- Migration: Add SELECT RLS policy for lab_sessions to fix 406 error
ALTER TABLE lab_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lab sessions"
  ON lab_sessions
  FOR SELECT
  TO authenticated
  USING (true);
