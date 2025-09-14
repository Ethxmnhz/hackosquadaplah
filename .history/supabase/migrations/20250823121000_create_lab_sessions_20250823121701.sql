-- Migration: Create lab_sessions table for robust matchmaking sessions
CREATE TABLE IF NOT EXISTS lab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  red_user_id uuid NOT NULL,
  blue_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  vm_details jsonb,
  red_questions jsonb,
  blue_questions jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
