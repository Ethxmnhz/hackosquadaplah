-- Migration: Allow authenticated users to delete lab_sessions (for admin panel)
ALTER TABLE lab_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete lab sessions" ON lab_sessions
  FOR DELETE
  TO authenticated
  USING (true);
