-- Migration: Fix match_requests to lab_sessions relationship
-- This migration adds a function to safely create lab sessions by first validating the lab_id

CREATE OR REPLACE FUNCTION create_lab_session_safe(
  red_id uuid,
  blue_id uuid,
  lab_id uuid,
  request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id uuid;
  lab_exists boolean := false;
BEGIN
  -- First validate the lab_id exists in either labs or New_operation table
  SELECT EXISTS (
    SELECT 1 FROM public.labs WHERE id = lab_id
    UNION
    SELECT 1 FROM public.New_operation WHERE id = lab_id
  ) INTO lab_exists;
  
  -- If lab doesn't exist, throw an error
  IF NOT lab_exists THEN
    RAISE EXCEPTION 'Invalid lab_id: %. Lab does not exist in either labs or New_operation table.', lab_id;
  END IF;
  
  -- Create the lab session
  INSERT INTO public.lab_sessions (
    red_user_id,
    blue_user_id,
    lab_id,
    status,
    time_remaining,
    ends_at,
    request_id
  ) VALUES (
    red_id,
    blue_id,
    lab_id,
    'active',
    3600,
    now() + interval '1 hour',
    request_id
  )
  RETURNING id INTO session_id;
  
  -- If there was a request_id, update the match request
  IF request_id IS NOT NULL THEN
    UPDATE public.match_requests
    SET status = 'matched', session_id = session_id
    WHERE id = request_id;
  END IF;
  
  RETURN session_id;
END;
$$;
