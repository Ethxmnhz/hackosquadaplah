-- Migration: Create lab_session_chat for real-time chat in lab sessions
CREATE TABLE IF NOT EXISTS lab_session_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES lab_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
