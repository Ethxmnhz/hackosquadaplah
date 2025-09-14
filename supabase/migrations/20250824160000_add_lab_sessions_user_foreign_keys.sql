-- Migration: Add foreign keys from lab_sessions.red_user_id and blue_user_id to profiles(id)
ALTER TABLE lab_sessions
  ADD CONSTRAINT lab_sessions_red_user_id_fkey FOREIGN KEY (red_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT lab_sessions_blue_user_id_fkey FOREIGN KEY (blue_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
