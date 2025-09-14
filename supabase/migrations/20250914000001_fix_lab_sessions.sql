-- Migration: Fix lab_sessions schema issues
-- This migration ensures that the lab_sessions table has all the necessary columns

-- Add missing columns if they don't exist
ALTER TABLE IF EXISTS public.lab_sessions
ADD COLUMN IF NOT EXISTS time_remaining integer DEFAULT 3600,
ADD COLUMN IF NOT EXISTS ends_at timestamptz DEFAULT (now() + interval '1 hour'),
ADD COLUMN IF NOT EXISTS request_id uuid,
ADD COLUMN IF NOT EXISTS session_id text; -- Add a session_id for external reference

-- Add policy to allow authenticated users to view their own lab sessions
CREATE POLICY IF NOT EXISTS "Users can view their own lab sessions"
  ON public.lab_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = red_user_id OR 
    auth.uid() = blue_user_id
  );

-- Add policy to allow authenticated users to create lab sessions
CREATE POLICY IF NOT EXISTS "Users can create lab sessions"
  ON public.lab_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = red_user_id OR 
    auth.uid() = blue_user_id
  );

-- Grant permissions on the table
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.lab_sessions TO authenticated;
