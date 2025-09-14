-- Migration: Add analytics columns to lab_sessions for session management
ALTER TABLE lab_sessions
  ADD COLUMN ended_at timestamptz NULL,
  ADD COLUMN total_duration integer NULL, -- in seconds
  ADD COLUMN red_answers jsonb,
  ADD COLUMN blue_answers jsonb;
